# GhostJob 1.3.0 release runbook

## Release state

The implementation is prepared for review, not a declaration of production readiness.
Scoring v3 is disabled by default. The existing v2 route remains available to old clients.
The website negotiates its scoring version through authenticated `GET /api/scan`;
non-pilot accounts continue using v2. Extension 1.3.0 requires v3 explicitly and
rejects an older server response rather than counting it as a successful v3 scan.
The unpacked extension is `ghostjob-extension-v4/ghostjob-extension`.

Local verification on 2026-09-15: 71 automated tests passed, including DOM
expansion, exact-role matching, public HTTPS transport, legacy API compatibility,
pilot controls, and authenticated retry deduplication. Both browser and server
TypeScript configurations passed. Public Lever, Ashby and Greenhouse field
projections were captured for parser regression tests. The live 50-case review,
real Redis concurrency test, signed-in Chrome pilot, and Lovable schema query
remain release gates; they are not claimed as completed by those tests.

## Required server configuration

| Variable | Default / purpose |
|---|---|
| `GHOSTJOB_V3_ENABLED` | unset (disabled); `true` enables the gated v3 path |
| `GHOSTJOB_V3_SCHEMA_READY` | unset; set `true` only after live schema verification |
| `GHOSTJOB_V3_ROLLOUT` | pilot; `public` is the later broad release switch |
| `GHOSTJOB_V3_PILOT_USERS` | comma-separated verified Auth user IDs, never emails supplied by the client |
| `SUPABASE_URL` | actual Lovable production URL; `VITE_SUPABASE_URL` fallback supported |
| `SUPABASE_ANON_KEY` | publishable/anon key; `VITE_SUPABASE_PUBLISHABLE_KEY` fallback supported |
| `GHOSTJOB_DEEP_SEARCH_ENABLED` | unset (disabled) |
| `BRAVE_SEARCH_API_KEY` | server-only search credential |
| `UPSTASH_REDIS_REST_URL` | managed Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | server-only Redis credential |
| `GHOSTJOB_MONTHLY_SEARCH_LIMIT` | 1000 reserved queries/month |

No service-role key is needed. Never place Brave/Redis secrets in VITE variables or extension files.
The search ceiling reserves two queries atomically before an attempt starts. Reservations
are conservative: uncertain provider failures do not refund them, preventing duplicate spend.
Retries retrieve the account/input-specific stored result. Corrected input creates a
distinct budgeted check; identical retries cannot reserve additional queries. Redis failure
disables paid search, not standard verification. Public source bodies cache for 15 minutes,
transient HTTP failures for 2 minutes, employer discovery for 24 hours, and private retry
results for 24 hours. No raw LinkedIn description is stored in the public-source cache.

## Database review gate

The checked-in v2 migration limits `scanned_jobs.scoring_version` to 1/2 and
`scan_observations.scoring_version` to 2. The live Lovable project's schema could not
be inspected through the available Supabase connector (permission denied).
Run `ghostjob-1.3-schema-preflight.sql` (read only) in Lovable Cloud.
Review the exact proposed constraint changes before applying them. Do not run them
on `czxrgjmropukzgyvlztg` or `ijvkbopodjzvcpgbppch` as a substitute.
Capture table counts and constraint definitions before/after, and verify an account's
existing saved jobs are intact. No data rewrite or backfill is part of this release.

## Verification and deployment gates

1. Run `npm test`, `npx tsc -p tsconfig.app.json`, `npx tsc -p tsconfig.server.json`, and `npm run build`.
2. Review the benchmark worksheet. Synthetic fixtures are not a substitute for the
   approximately 50 manually reviewed, dated live listings required for the pilot.
3. Resolve the schema gate and configure the actual pilot account ID and server secrets.
4. Deploy the backward-compatible backend and verify a v2 response, a rejected non-pilot
   v3 request, and an authorized v3 request. Verify saved observations and jobs in Lovable.
5. Reload the unpacked 1.3.0 extension, refresh LinkedIn, and test both standalone and
   split-pane jobs. Verify a failed scan/deep retry never increases the scan allowance.
6. Verify the deployed website can edit details and deepen a result without saving stale scores.
7. Review accuracy, description coverage, latency, cost, and limitations before approving
   broader release. Only then set public rollout and publish the extension package.

Rollback: disable `GHOSTJOB_DEEP_SEARCH_ENABLED` for provider issues. Disable
`GHOSTJOB_V3_ENABLED` to stop v3; existing v2 clients continue to use the legacy scorer.
Keep v3 database rows and compatible read paths. Do not reverse constraints after v3 writes.

## Known coverage limits

Identity currently needs structured organization ownership or the employer's matching
LinkedIn company link. Unsupported dynamic careers pages, incomplete provider feeds,
and uncertain location mappings remain neutral. Application availability requires a
recognizable role-specific application form; an HTTP 200 alone never awards those points.
No CAPTCHA bypass, account scraping, applications, background monitoring, or hiring-intent
claims are implemented. Broad release is gated on actual observed accuracy and coverage.
