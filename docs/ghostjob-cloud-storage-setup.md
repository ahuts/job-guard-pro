# Lovable Cloud storage setup for the GhostJob pilot

Target: existing Cloud database `auevehneizminspolipf` and the Vercel **Preview**
environment for `jobghost`, branch `agent/ghostjob-1-3-employer-verification`.
Keep both AI switches off until this setup and signed storage verification succeed.

## Confirmed customer schema

September 26 preflight: scoring constraints already allow v3, both customer tables
have RLS enabled, and ownership policies remain present. Baseline: 78 profiles,
18 saved jobs, 12 observations. The user reported a successful transaction adding
the nullable `scanned_jobs.investigation` JSONB column. No constraint migration is
needed. This storage setup makes no changes to existing customer rows or policies.

## Why this function is needed

Lovable Cloud keeps its service-role credential inside its managed runtime. Vercel
uses a separate random signing secret to call a small Cloud function. The function
uses the built-in credential only to invoke four private budget/cache RPCs. It has
no route to customer tables, billing operations, arbitrary SQL or provider calls.
OpenAI and TypeSafe credentials stay in Vercel Preview. No Redis is introduced.

## Setup order

1. Generate one secret locally with `openssl rand -hex 32`. Enter the same value as
   `GHOSTJOB_STORAGE_BRIDGE_SECRET` in **Lovable Cloud Secrets** and **Vercel Preview
   environment variables**. Do not paste it into chat, a Lovable prompt, source
   files, extension files, frontend variables or screenshots. No service-role key
   needs to be copied out of Cloud. `.env.local` may contain the signing secret for
   local server development; the tracked `.env` must not.
2. Run the reviewed `ghostjob-ai-storage-review.sql` in the confirmed project's SQL
   editor. It creates only private AI storage and four service-role-only RPCs.
3. Open the existing GhostJob project chat in Lovable. Copy the **entire contents**
   of `docs/ghostjob-cloud-deploy-prompt.md` into that chat and send it. The prompt
   includes both source files and the exact function configuration. Lovable deploys
   Edge Functions through its project chat; there is no create button in the Cloud
   function list. This step deploys only `supabase/functions/ghostjob-ai-storage/index.ts` and its helper
   `supabase/functions/_shared/ghostjobStorageBridge.ts` to that Cloud project.
   Set `verify_jwt = false` for **this new function only**, as specified in
   `supabase/config.toml`. The handler authenticates HMAC signatures before any
   database work; anon keys and signed-in user JWTs cannot authorize this function.
   Preserve all existing function configuration. Do not publish the frontend.
4. Deploy this branch to Vercel Preview. The storage URL derives from the existing
   verified Supabase URL; do not point it to another database. Both AI switches
   remain off for the storage smoke test.
5. With server-side configuration in place, verify signed cache write/read and
   private-RPC access denial before enabling the pilot investigation switches.
   Sign in to the pilot preview, then open `/dashboard/storage-check` and click
   **Test storage connection**. This preview-only endpoint verifies the signed-in
   account against the server pilot allowlist, writes/reads one temporary cache
   value (60-second TTL), and checks that anonymous and authenticated clients cannot
   invoke the private cache RPC. It requires an actual PostgreSQL permission-denied
   error; an invalid token/key response alone does not pass. It never calls AI
   providers, changes a scan allowance, writes customer
   records or reserves paid budget. Its response exposes no keys or account data.
   Unavailable functions, bad signatures, missing secrets or failed storage calls
   must prevent paid work. A missing key must never be worked around by granting
   anonymous or authenticated clients access to private RPCs.

Cloud connector access to this project is unavailable from this task, so Cloud
secret entry, SQL execution and function deployment require the project's editor.
On September 26 the user reported deployment of the exact Cloud source. Independent
HTTP probes confirmed unsigned POST 401 and OPTIONS 405. The Vercel bridge release
`111267d` is deployed successfully. The signed round trip passed after the preview
authentication key was corrected and the preview redeployed.

If the diagnostic reports invalid authentication configuration, check Vercel
Preview's `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The public anonymous key must be
valid for the current database; the checked-in `.env` contains the client value
under `VITE_SUPABASE_PUBLISHABLE_KEY`. Copy only the value, without quotes, into
the server setting, then redeploy the preview. A different valid anonymous key can
also work; a fingerprint difference alone does not establish that it is invalid.
The diagnostic distinguishes Supabase's invalid-key response from an expired
session and never displays provider error text or credential values.

Live diagnostic checkpoint, September 26, 2026: the user replaced Preview's public
anonymous key. Deployment `dpl_FEJMwGArVT8PCuW5FuSrqRjM2v9Z` of `434e3de` was
redeployed with the updated settings and reached Ready. The signed-in pilot
diagnostic passed: temporary signed cache write/read succeeded, and direct private
RPC access was denied to both anonymous and signed-in clients. The permission
checks require PostgreSQL permission-denied code 42501, not just an authentication
error. No AI provider calls or scan allowances were used. This verifies the Cloud
storage connection; live AI investigation and benchmark acceptance remain separate
checks. Production was not deployed.

Sources: [Lovable Cloud credential access](https://supabase.com/docs/guides/troubleshooting/identify-lovable-cloud-or-supabase-backend),
[signed function authentication](https://supabase.com/docs/guides/functions/auth),
[built-in function secrets](https://supabase.com/docs/guides/functions/secrets).
[Lovable function deployment](https://docs.lovable.dev/features/edge-functions).
