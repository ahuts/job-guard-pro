// Only the signed GhostJob server may reach private scan and AI storage RPCs.
// Never return upstream errors, descriptions, credentials or account identifiers.
type Settings = { secret?: string; supabaseUrl?: string; serviceKey?: string };
const allowed = new Set(['ghostjob_cache_get', 'ghostjob_cache_put', 'ghostjob_ai_reserve', 'ghostjob_ai_settle', 'ghostjob_free_scan']);
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
