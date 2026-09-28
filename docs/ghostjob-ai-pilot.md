# OpenAI investigation and Jev evaluation pilot

## Implemented behavior

Selected, server-authenticated pilot users receive automatic investigation with
their standard scan. Native source verification runs first. If the role remains
unresolved, one OpenAI Responses request uses mandatory web search (at most two
built-in tool calls). Up to three postings are fetched through the existing
employer/ATS relationship checks. One structured comparison request then evaluates
responsibilities, required/preferred qualifications, seniority, location, employment
type and requisition ID. Quotes must be found in the supplied evidence. Exact
findings additionally require native verification and compatible location.

Model comparisons and caution flags never change the Trust Score. Public evidence
does not establish private hiring intent or authenticate a recruiter. Jev receives
the original listing and selected employer evidence, independently of OpenAI's
conclusion. Its four typed judgments stay in private Supabase storage for 30 days.

Pinned providers: `gpt-5.4-mini-2026-03-17` and `jev-1.13.0`. OpenAI responses use
`store: false`; provider retention rules still apply. No automatic paid retries.
The overall investigation deadline is 30 seconds; client/API limits are 45 seconds
to allow authentication, budget settlement and cold-start overhead.

## Secure configuration and live prerequisites

1. Verify Vercel's `jobghost` project is linked to `ahuts/job-guard-pro`, branch
   `agent/ghostjob-1-3-employer-verification`. The unpacked extension targets
   `jobghost-git-agent-ghostjob-04b415-hutsellaaron-8599s-projects.vercel.app`.
2. Create a dedicated OpenAI project/key and a TypeSafe key. Enter secrets directly
   into that project's **Preview** environment. Do not put keys in chat, frontend
   variables, the tracked `.env`, Git, screenshots or extension files.
3. Follow `ghostjob-cloud-storage-setup.md`: deploy only the new signed storage
   Edge Function and set the same server-only `GHOSTJOB_STORAGE_BRIDGE_SECRET`
   in Cloud and Vercel Preview. Lovable Cloud does not expose its service-role key;
   the function uses that credential internally. Configure verified account UUIDs
   in `GHOSTJOB_V3_PILOT_USERS`. No Redis service is required.
4. In the **actual** Lovable Cloud project `auevehneizminspolipf`, capture
   `ghostjob-1.3-schema-preflight.sql` output and policy definitions. Review
   `ghostjob-ai-schema-review.sql` against those definitions. Review and apply
   `ghostjob-ai-storage-review.sql` in the same actual database. Verify constraints,
   column, policies, private RPC permissions and retained row counts.
5. Set `GHOSTJOB_V3_ENABLED`, `GHOSTJOB_V3_SCHEMA_READY`,
   `GHOSTJOB_INVESTIGATION_SCHEMA_READY`, `GHOSTJOB_OPENAI_INVESTIGATION_ENABLED`
   to `true` only after the prerequisites above. Keep rollout `pilot`. Set
   `GHOSTJOB_JEV_EVALUATION_ENABLED=true` only with the TypeSafe credential.
6. Redeploy the preview. Test GET `/api/scan` with the pilot bearer: expect
   `{ "scoringVersion": 3, "investigationEnabled": true }`. Anonymous/non-pilot
   requests must not advertise or invoke investigation. Test a real standard scan,
   repeat it, correct its description, save it and reload its tracker details.

The Vercel connector denied access to this project's scope. Authenticated Chrome
previously confirmed the jobghost preview settings and GitHub linkage. A dedicated
OpenAI project, GhostJob Pilot, was created; the user subsequently obtained OpenAI
and TypeSafe keys. Both variable names were confirmed in Preview; OpenAI live
requests subsequently succeeded, while TypeSafe returned HTTP 402. The Supabase
connector still denies access to the configured Lovable database. Schema compatibility
is not inferred from local files. A different Supabase project named GhostJob is not a substitute.

The preview initially redirected direct `/api/scan` requests to Vercel login.
After explicit user confirmation, a protection exception was applied only to the
extension's exact preview domain. Vercel Authentication remains enabled for the
project's other protected deployments. The preview API now returns JSON with
`scoringVersion: 3` and `investigationEnabled: false`. No automation-bypass secret
is distributed inside the extension.

## Dollar budget, cache and failure behavior

All OpenAI search/token and Jev token work uses one atomic Supabase microdollar ledger.
Default/maximum pilot ceiling: **$25 per UTC calendar month**. Reserve **$1** before
dispatch (conservative against the pinned model's context/tool/token limits), then
settle using reported usage. Unknown costs, uncertain failures and cache failures
retain the reservation. Missing storage disables paid work. Accounting uses standard
USD rates, conservatively ignoring cached-input discounts; taxes, currency conversion
and unrelated use of provider accounts are outside this application ledger.
Existing provider spending safeguards remain separate from this shared application
ceiling. Atomic database RPCs serialize reservation and settlement using one row
lock; server timestamps determine the UTC month and per-account minute bucket.
Budget/cache tables reside in `ghostjob_private` with RLS enabled. Public RPCs
use SECURITY INVOKER and grant execution only to `service_role`. The Cloud storage
function validates timestamped HMAC signatures from Vercel and forwards only four
explicit budget/cache RPCs using Cloud's internal service-role credential. It rejects
unsigned calls, browser origins, stale signatures, modified bodies and other RPCs;
failures return generic errors and never fall back to a privileged connection.
Anonymous and
signed-in frontend clients cannot invoke them or read Jev records. Expired cache
values are ignored on reads and removed on writes. No new hosted service is added.

The same account/content/analysis version deduplicates for 24 hours even if a client
changes its attempt ID or scan mode. There is a five-starts/minute/account ceiling.
Duplicate in-flight requests do not start paid calls. Corrected evidence starts a
new budgeted investigation. Budget is shared across all pilot users and benchmark runs.

Employer discovery caches for 24 hours, public sources 15 minutes, transient HTTP
failures 2 minutes, private investigation retry results 24 hours. LinkedIn descriptions
are not stored in the public cache. Private saved investigations retain only the
user-facing findings/excerpts; Jev raw state is not retained in its evaluation record.
Source and check timestamps remain visible when cached findings are reused.

Provider failures, refusal, incomplete/invalid output, inaccessible sources and
capacity exhaustion return the existing native result with an investigation status.
No semantic negative or unavailable source deducts points. Turning off either new
feature switch disables that provider; turning off v3 restores existing v2 access.

## Evaluation and release status

Use `docs/ai-investigation-benchmark.md` and
`scripts/ai-investigation-benchmark.ts`. Twenty-four independently reviewed, dated listings
are required: 12 rubric cases and 12 untouched holdout cases. Automated tests do not
satisfy this requirement. Aaron reviewed the 24-row intake sheet, but the dated,
balanced input and expected native/OpenAI/Jev labels are not yet frozen.

Pilot acceptance still requires the frozen benchmark with zero false exact-match
findings on the holdout set, live multi-connection budget contention, and a
split-pane LinkedIn scan. Preview credentials, signed storage, save/retry paths,
and a signed-in standalone extension scan have been verified separately.
The initial implementation passed 96 full-suite tests and a subsequent retry
regression. The Supabase replacement additionally executes its SQL in a local
PostgreSQL engine via the pinned development-only PGlite dependency. Its tests
cover budget ceilings, queued requests, duplicate reservations, idempotent
settlement, original-month accounting, rate limits, cache expiry and role access.
PGlite uses one connection; live multi-connection contention and production database
round trips still require actual database access. No test fixture satisfies the
manually reviewed benchmark gate.
After the storage replacement: all 104 tests, app/server type checks, targeted
lint and production build passed. The build retains its existing bundle-size
and Browserslist warnings. On September 26 the user supplied live preflight exports:
both v3 constraints are present, both customer tables have RLS enabled, and their
ownership policies match the existing definitions. They reported a successful run
of `ghostjob-ai-schema-review.sql`; its transaction validates the nullable JSONB
column before committing. The exported final result confirms policy names/roles,
but does not include a separate column result. Private storage SQL and the new
Cloud function were pending live setup at that checkpoint. The user subsequently
reported deploying the exact function source in the confirmed Cloud project.
Independent probes verified unsigned POST 401 and OPTIONS 405, and the Vercel
bridge release deployed successfully. Signed storage verification subsequently passed;
the preview-only `/dashboard/storage-check` provides a provider-free diagnostic
for authenticated allowlisted pilots.
After the Cloud adapter: 111 tests, app/server type checks, targeted lint and
production build passed. Bridge tests cover signature verification, modified
requests, expired timestamps, browser/user denial, RPC restrictions, payload size,
concealed upstream errors and the Vercel-to-Cloud request protocol. These checks
do not claim that the function or signing secret is deployed in Cloud.
The preview storage diagnostic additionally passed seven authorization/failure
tests; the full suite now has 118 passing tests. App/server type checks, targeted
lint and the production build passed. Signed live storage remains a separate gate.
### September 26 live pilot checkpoint

- Signed storage write/read and anonymous/authenticated private RPC denial passed.
- OpenAI investigation and investigation schema readiness were enabled only on
  `agent/ghostjob-1-3-employer-verification`. Provider secrets remain server-only.
- A real OpenAI listing completed discovery and comparison with an insufficient
  evidence result; unavailable official sources remained neutral. A cached deep
  retry preserved its timestamp and produced no new provider investigation log.
- The investigation saved successfully. Duplicate save preserved the existing job.
  Live tracker reopening exposed a missing row-mapping field; release `79c7bd0`
  corrected it, and the saved investigation then displayed after a fresh reload.
- A Ramp listing exposed an ignored search attempt in addition to two completed
  searches. Release `5ab964f` excludes non-completed attempts from evidence and
  the execution limit, while conservatively charging all returned records. Live
  diagnostics confirmed statuses `completed`, `completed`, `searching`. Three
  completed calls still fail validation. Calls are requested sequentially with
  `max_tool_calls: 2`; the provider's ignored attempts are not fetched as evidence.
- Correcting Ramp's location invalidated its cache and completed a new comparison.
  This also confirmed TypeSafe HTTP **402**. Jev was temporarily disabled on the
  pilot branch. Its failure preserved OpenAI findings and retained the conservative
  reservation.
- After the user reported fixing TypeSafe access, Jev was re-enabled only on the pilot
  branch and preview deployment `dpl_DParfj5iPjfJcDdfhxgtQYqYqwMc` reached Ready.
  Supplying `https://openai.com` for the same OpenAI listing invalidated its cache.
  The live evaluation completed with `jev-1.13.0`, 158 ms latency, 2,007 input and
  209 output tokens. Its private storage write completed without error. The public
  finding remained insufficient evidence, with the Trust Score unchanged at 50.
  Total investigation latency was 8,408 ms; reported usage produced an application
  cost estimate of $0.020276 with no uncertain usage. This is not an invoice check
  or a benchmark accuracy result. The void storage return was subsequently corrected
  in logging to report `stored: true` after a successful awaited write.
- The full suite passed 125 tests before the final two regression additions; the
  updated provider and saved-display suites passed 23 tests. Application/server
  type checks, targeted provider lint and the production build passed. Extraction
  logs now contain only fixed status and character counts, without page text.
- These live cases do not replace the independent 24-listing benchmark, held-out
  false-exact-match gate, extension UI check, or live multi-connection stress test.

Jev remains restricted to evaluation mode. Public rollout, publishing the extension and replacing
the main score are outside this release.

### September 28 signed-in extension checkpoint

- Unpacked Preview extension 1.3.9 scanned the selected VA Chief Financial Officer
  listing with the correct Indianapolis location, posting age, salary, description,
  and LinkedIn application-closure note. The Preview build does not save scans.
- The first investigation exposed a 10-second OpenAI discovery timeout. The
  subdeadline was extended within the existing 30-second overall limit. The next
  live scan completed OpenAI search/comparison and stored a Jev evaluation.
- The completed result remained insufficient evidence because no accessible
  employer-related candidate posting was established. It did not claim an exact
  match or reduce the Trust Score. Vercel logs reported 16,835 ms investigation
  latency, 3,055 Jev input tokens, and $0.021166 estimated application cost.
- The pilot branch was merged with current `main`; PR #3 is mergeable and remains
  draft. The full pilot suite passed 132 tests before a further quality-label
  regression was added; its focused tests pass. Production still serves API v1.0.0.
  All new provider keys and feature switches visible in Vercel are Preview scoped.

Sources: [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search),
[model](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
[pricing](https://developers.openai.com/api/docs/pricing),
[Jev models](https://docs.typesafe.ai/models), [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
