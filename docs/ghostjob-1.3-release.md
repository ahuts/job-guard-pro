# GhostJob 1.3 release runbook

The paid investigation configuration is now maintained in `ghostjob-ai-pilot.md`.
OpenAI and TypeSafe use the existing Supabase database for shared storage.

## Release state

The Preview pilot is functioning, not a declaration of production readiness.
Scoring v3 is disabled by default. The existing v2 route remains available to old clients.
The website negotiates its scoring version through authenticated `GET /api/scan`;
non-pilot accounts continue using v2. The unpacked Preview extension requires v3 explicitly and
rejects an older server response rather than counting it as a successful v3 scan.
The unpacked extension is `ghostjob-extension-v4/ghostjob-extension`.

On 2026-09-28, a signed-in Chrome scan completed OpenAI investigation and private
Jev evaluation through the Preview API. The Trust Score remained neutral for an
unresolved official source. The pilot branch passed 132 automated tests before a
subsequent focused quality-label test was added; type checks and build passed.
The 24-case reviewed benchmark is not yet balanced or frozen, and live database
contention remains untested.

A public-source smoke check on 2026-09-15 found Spreedly's AI Operations Manager
role through its employer website and Lever board, and independently confirmed
the application form in approximately three seconds. The source date did not
earn freshness points. This is one live case, not completion of the benchmark.

## Required server configuration

| Variable | Default / purpose |
|---|---|
| `GHOSTJOB_V3_ENABLED` | unset (disabled); `true` enables the gated v3 path |
| `GHOSTJOB_V3_SCHEMA_READY` | unset; set `true` only after live schema verification |
| `GHOSTJOB_V3_ROLLOUT` | pilot; `public` is the later broad release switch |
| `GHOSTJOB_V3_PILOT_USERS` | comma-separated verified Auth user IDs, never emails supplied by the client |
| `SUPABASE_URL` | actual Lovable production URL; `VITE_SUPABASE_URL` fallback supported |
| `SUPABASE_ANON_KEY` | publishable/anon key; `VITE_SUPABASE_PUBLISHABLE_KEY` fallback supported |
| `GHOSTJOB_STORAGE_BRIDGE_SECRET` | same random server-only secret in Vercel Preview and Lovable Cloud; see `ghostjob-cloud-storage-setup.md` |
| `OPENAI_API_KEY` | server-only investigation credential |
| `TYPESAFE_API_KEY` | server-only Jev evaluation credential |
| `GHOSTJOB_OPENAI_INVESTIGATION_ENABLED` | unset (disabled) |
| `GHOSTJOB_INVESTIGATION_SCHEMA_READY` | set only after reviewing/applying private storage and saved-result support |
| `GHOSTJOB_JEV_EVALUATION_ENABLED` | unset (disabled); private evaluation only |
| `GHOSTJOB_AI_MONTHLY_BUDGET_USD` | $25 shared application ceiling |

Never place provider or service-role secrets in VITE variables or extension files.
The shared budget reserves one dollar atomically before an attempt starts. Reservations
are conservative: uncertain provider failures do not refund them, preventing duplicate spend.
Retries retrieve the account/input-specific stored result. Corrected input creates a
distinct budgeted check; identical retries cannot reserve additional spend. Database failure
disables paid search, not standard verification. Public source bodies cache for 15 minutes,
transient HTTP failures for 2 minutes, employer discovery for 24 hours, and private retry
results for 24 hours. No raw LinkedIn description is stored in the public-source cache.

## Database review gate

Aaron ran the schema review in the confirmed Lovable Cloud project
`auevehneizminspolipf`, and the signed Preview storage bridge, budget ledger,
saved-result path and private Jev write worked live. The Supabase connector still
denies direct schema inspection. Preserve existing saved jobs and ownership policies;
do not reverse v3 constraints after writes. No data rewrite or backfill is planned.

## Verification and deployment gates

1. Freeze 24 dated, balanced, independently labeled listings: 12 rubric and 12
   holdout cases. Replace or recover the missing LinkedIn descriptions in the
   current intake sheet. Run the benchmark and require no false exact matches on
   holdout cases.
2. Verify Production environment settings. The OpenAI, TypeSafe, storage-bridge
   and v3 pilot switches currently shown in Vercel are Preview scoped. Do not
   copy provider secrets into client variables or enable public rollout.
3. Deploy the backward-compatible backend only after a production release
   decision. Verify existing paying accounts still receive v2, pilot accounts
   receive v3 only when explicitly configured, and saved jobs remain intact.
4. Test the production extension package against the actual custom domain and
   both pilot and non-pilot accounts before Chrome Store submission. The unpacked
   Preview extension is not the production package.

Rollback: disable `GHOSTJOB_OPENAI_INVESTIGATION_ENABLED` for provider issues. Disable
`GHOSTJOB_V3_ENABLED` to stop v3; existing v2 clients continue to use the legacy scorer.
Keep v3 database rows and compatible read paths. Do not reverse constraints after v3 writes.

## Known coverage limits

Identity currently needs structured organization ownership or the employer's matching
LinkedIn company link. Unsupported dynamic careers pages, incomplete provider feeds,
and uncertain location mappings remain neutral. Application availability requires a
recognizable role-specific application form; an HTTP 200 alone never awards those points.
No CAPTCHA bypass, account scraping, applications, background monitoring, or hiring-intent
claims are implemented. Broad release is gated on actual observed accuracy and coverage.
