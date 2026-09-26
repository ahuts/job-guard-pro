Deploy the existing GhostJob private storage function to the current Lovable Cloud project. The expected database project reference is auevehneizminspolipf. Confirm the connected project matches before deployment; if it differs, stop and report it.

This project has live paying customers. Limit this task to the new ghostjob-ai-storage function and its helper. Copy the supplied source exactly into the stated paths. Preserve existing frontend code, customer data, policies, billing functions, and all other function configuration. Do not publish the frontend, change Git branches, enable AI investigation, migrate the database, or expose private RPCs to anon/authenticated roles.

The GHOSTJOB_STORAGE_BRIDGE_SECRET must come from existing Cloud Secrets. Never request, display, log, or hardcode its value. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built-in runtime variables; keep their values private and inside Cloud.

In supabase/config.toml, merge only this new function block, preserving everything already present:

```toml
[functions.ghostjob-ai-storage]
verify_jwt = false
```

This function validates timestamped HMAC signatures itself before calling the four allowlisted storage RPCs. Disabling the platform JWT check applies only to this new function. Do not disable checks on existing functions.

Create `supabase/functions/ghostjob-ai-storage/index.ts` with exactly this source:

```typescript
import { handleStorageBridge } from '../_shared/ghostjobStorageBridge.ts';

Deno.serve((request: Request) => handleStorageBridge(request, {
  secret: Deno.env.get('GHOSTJOB_STORAGE_BRIDGE_SECRET'),
  supabaseUrl: Deno.env.get('SUPABASE_URL'),
  // Lovable Cloud supplies this internally; it never leaves the function runtime.
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
```

Create `supabase/functions/_shared/ghostjobStorageBridge.ts` with exactly this source:

```typescript
// Only the signed preview server may reach the four private AI storage RPCs.
// Never return upstream errors, descriptions, credentials or account identifiers.
type Settings = { secret?: string; supabaseUrl?: string; serviceKey?: string };
const allowed = new Set(['ghostjob_cache_get', 'ghostjob_cache_put', 'ghostjob_ai_reserve', 'ghostjob_ai_settle']);
const encoder = new TextEncoder();
const maxBytes = 1_048_576;
const error = (status: number) => Response.json({ error: 'Storage unavailable' }, { status });

async function boundedBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get('content-length')) > maxBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export async function handleStorageBridge(request: Request, settings: Settings, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return error(405);
  // Browsers receive no CORS access; a valid user JWT or anon key cannot authorize this endpoint.
  if (request.headers.has('origin')) return error(403);
  if (!settings.secret || settings.secret.length < 32 || !settings.supabaseUrl || !settings.serviceKey) return error(503);
  const timestamp = request.headers.get('x-ghostjob-timestamp') || '';
  const signature = request.headers.get('x-ghostjob-signature') || '';
  if (!/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature) || Math.abs(Date.now() - Number(timestamp)) > 30_000) return error(401);
  try {
    const body = await boundedBody(request);
    if (body === null) return error(413);
    const key = await crypto.subtle.importKey('raw', encoder.encode(settings.secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBytes = new Uint8Array(signature.match(/../g)!.map(value => parseInt(value, 16)));
    if (!await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(`${timestamp}.${body}`))) return error(401);
    const payload: unknown = JSON.parse(body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return error(400);
    const { name, args } = payload as Record<string, unknown>;
    if (typeof name !== 'string' || !allowed.has(name) || !args || typeof args !== 'object' || Array.isArray(args)) return error(400);
    const response = await fetcher(new URL(`/rest/v1/rpc/${name}`, settings.supabaseUrl), {
      method: 'POST', headers: { apikey: settings.serviceKey, Authorization: `Bearer ${settings.serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return error(503);
    return Response.json(await response.json());
  } catch { return error(503); }
}
```

Deploy only ghostjob-ai-storage with its helper. If deployment is unavailable, report the blocker; do not substitute a frontend publish or broader deployment.

After deploying:
- Confirm the function is listed in Cloud > Edge functions.
- Confirm its endpoint is https://auevehneizminspolipf.supabase.co/functions/v1/ghostjob-ai-storage.
- Verify that an unsigned POST with an empty JSON body returns 401 and an OPTIONS request returns 405. These calls must never contact the database or AI providers.
- Confirm existing function configuration was preserved.
- Report deployment status and verification results without secret values or raw customer data. Do not claim signed storage works until the Vercel server has separately tested it.
