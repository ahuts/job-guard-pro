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
conclusion. Its four typed judgments stay private in Redis for 30 days.

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
3. Configure managed Redis credentials and the verified account UUIDs in
   `GHOSTJOB_V3_PILOT_USERS`. `.env.ai.example` lists all switches and names.
4. In the **actual** Lovable Cloud project `auevehneizminspolipf`, capture
   `ghostjob-1.3-schema-preflight.sql` output and policy definitions. Review
   `ghostjob-ai-schema-review.sql` against those definitions, apply only there,
   and verify constraints, column, policies and retained row counts.
5. Set `GHOSTJOB_V3_ENABLED`, `GHOSTJOB_V3_SCHEMA_READY`,
   `GHOSTJOB_INVESTIGATION_SCHEMA_READY`, `GHOSTJOB_OPENAI_INVESTIGATION_ENABLED`
   to `true` only after the prerequisites above. Keep rollout `pilot`. Set
   `GHOSTJOB_JEV_EVALUATION_ENABLED=true` only with the TypeSafe credential.
6. Redeploy the preview. Test GET `/api/scan` with the pilot bearer: expect
   `{ "scoringVersion": 3, "investigationEnabled": true }`. Anonymous/non-pilot
   requests must not advertise or invoke investigation. Test a real standard scan,
   repeat it, correct its description, save it and reload its tracker details.

The Vercel connector denied access to this project's scope. Authenticated Chrome
confirmed the jobghost preview settings contain the existing v3/Auth variables but
no OpenAI, TypeSafe or Redis variables. A dedicated OpenAI project, GhostJob Pilot,
was created; API key creation remains a separate credential step. The Supabase
connector denied access to the configured Lovable database. Schema compatibility
is not inferred from local files. A different Supabase project named GhostJob is not a substitute.

The preview also has Vercel Authentication enabled: a direct `/api/scan` request
redirects to Vercel login. Extension requests cannot consume that login page as
an API response. A protection exception for only the extension's preview domain
is prepared but has not been applied; this access change needs confirmation.
Never distribute an automation-bypass secret inside the extension.

## Dollar budget, cache and failure behavior

All OpenAI search/token and Jev token work uses one atomic microdollar ledger.
Default/maximum pilot ceiling: **$25 per UTC calendar month**. Reserve **$1** before
dispatch (conservative against the pinned model's context/tool/token limits), then
settle using reported usage. Unknown costs, uncertain failures and cache failures
retain the reservation. Missing storage disables paid work. Accounting uses standard
USD rates, conservatively ignoring cached-input discounts; taxes, currency conversion
and unrelated use of provider accounts are outside this application ledger.

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
Local verification passed: 96 full-suite tests, followed by 27 targeted tests
including a new deduplication case; app/server type checks, targeted lint,
extension syntax checks, and production build. The build reports existing large
bundle and outdated Browserslist warnings. Live Redis concurrency and database
round trips remain pending their actual credentials/access.
Jev remains in evaluation mode. Public rollout, publishing the extension and replacing
the main score are outside this release.

Sources: [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search),
[model](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
[pricing](https://developers.openai.com/api/docs/pricing),
[Jev models](https://docs.typesafe.ai/models), [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
