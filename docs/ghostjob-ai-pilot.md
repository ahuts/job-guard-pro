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
and TypeSafe keys. Their live configuration has not been reverified. The Supabase
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
`scripts/ai-investigation-benchmark.ts`. Sixty independently reviewed, dated listings
are required: 30 rubric cases and 30 untouched holdout cases. Automated tests do not
satisfy this requirement. No manually reviewed corpus was present in the repository.

Pilot acceptance still requires live credentials, verified database support, real
scan/save/retry checks, and zero false exact-match findings on the holdout set.
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
bridge release deployed successfully. Signed storage verification remains pending;
the preview-only `/dashboard/storage-check` provides a provider-free diagnostic
for authenticated allowlisted pilots. AI remains disabled.
After the Cloud adapter: 111 tests, app/server type checks, targeted lint and
production build passed. Bridge tests cover signature verification, modified
requests, expired timestamps, browser/user denial, RPC restrictions, payload size,
concealed upstream errors and the Vercel-to-Cloud request protocol. These checks
do not claim that the function or signing secret is deployed in Cloud.
The preview storage diagnostic additionally passed seven authorization/failure
tests; the full suite now has 118 passing tests. App/server type checks, targeted
lint and the production build passed. Signed live storage remains a separate gate.
Jev remains in evaluation mode. Public rollout, publishing the extension and replacing
the main score are outside this release.

Sources: [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search),
[model](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
[pricing](https://developers.openai.com/api/docs/pricing),
[Jev models](https://docs.typesafe.ai/models), [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
