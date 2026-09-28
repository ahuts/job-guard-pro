// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { handleStorageBridge } from '../../supabase/functions/_shared/ghostjobStorageBridge';
import { storageRpc, storeConfigured } from '../server/searchStore';

const secret = 'a'.repeat(64);
const settings = { secret, supabaseUrl: 'https://db.example', serviceKey: 'internal-cloud-key' };
function signed(payload: unknown, time = Date.now(), signedBody?: string) {
  const body = JSON.stringify(payload);
  return new Request('https://db.example/functions/v1/ghostjob-ai-storage', { method: 'POST', body, headers: {
    'x-ghostjob-timestamp': String(time),
    'x-ghostjob-signature': createHmac('sha256', secret).update(`${time}.${signedBody ?? body}`).digest('hex'),
  } });
}
const payload = { name: 'ghostjob_cache_get', args: { p_key: 'gj:example' } };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('private Lovable Cloud storage bridge', () => {
  it('rejects user credentials, unsigned calls and browser requests before database work', async () => {
    const fetcher = vi.fn();
    const user = new Request('https://db.example/functions/v1/ghostjob-ai-storage', { method: 'POST', headers: { Authorization: 'Bearer user-jwt', apikey: 'anon' }, body: JSON.stringify(payload) });
    expect((await handleStorageBridge(user, settings, fetcher)).status).toBe(401);
    const browser = signed(payload); browser.headers.set('origin', 'https://jobghost.io');
    expect((await handleStorageBridge(browser, settings, fetcher)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects stale signatures, body tampering and arbitrary RPCs', async () => {
    const fetcher = vi.fn();
    expect((await handleStorageBridge(signed(payload, Date.now() - 31_000), settings, fetcher)).status).toBe(401);
    expect((await handleStorageBridge(signed(payload, Date.now(), '{}'), settings, fetcher)).status).toBe(401);
    expect((await handleStorageBridge(signed({ name: 'delete_customers', args: {} }), settings, fetcher)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses only the Cloud internal credential and returns scalar RPC responses', async () => {
    const fetcher = vi.fn(async () => Response.json({ finding: 'cached' }));
    const response = await handleStorageBridge(signed(payload), settings, fetcher);
    expect(await response.json()).toEqual({ finding: 'cached' });
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe('https://db.example/rest/v1/rpc/ghostjob_cache_get');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer internal-cloud-key' });
    expect(JSON.parse(init.body as string)).toEqual(payload.args);
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
  });
  it('fails closed without configuration and conceals upstream error details', async () => {
    const fetcher = vi.fn(async () => new Response('internal-cloud-key raw description user-id', { status: 500 }));
    expect((await handleStorageBridge(signed(payload), { ...settings, secret: '' }, fetcher)).status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
    const response = await handleStorageBridge(signed(payload), settings, fetcher);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Storage unavailable' });
  });
  it('rejects oversized payloads without contacting the database', async () => {
    const fetcher = vi.fn();
    const request = signed({ ...payload, extra: 'x'.repeat(1_048_576) });
    expect((await handleStorageBridge(request, settings, fetcher)).status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('connects the preview server to Cloud without an exported service-role key', async () => {
    vi.stubEnv('SUPABASE_URL', settings.supabaseUrl);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('GHOSTJOB_STORAGE_BRIDGE_SECRET', secret);
    const cloudFetch = vi.fn(async () => Response.json(1));
    const previewFetch = vi.fn(async (url: URL | string, init?: RequestInit) => handleStorageBridge(new Request(url, init), settings, cloudFetch));
    vi.stubGlobal('fetch', previewFetch);
    expect(storeConfigured()).toBe(true);
    expect(await storageRpc('ghostjob_ai_reserve', { p_attempt_key: 'gj:ai-attempt:test' })).toBe(1);
    expect(String(previewFetch.mock.calls[0][0])).toBe('https://db.example/functions/v1/ghostjob-ai-storage');
    expect(previewFetch.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
    expect(cloudFetch).toHaveBeenCalledTimes(1);
  });
  it('never falls back to a privileged key if the signed bridge fails', async () => {
    vi.stubEnv('SUPABASE_URL', settings.supabaseUrl);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-server-key');
    vi.stubEnv('GHOSTJOB_STORAGE_BRIDGE_SECRET', secret);
    const fetcher = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(storageRpc('ghostjob_cache_get', payload.args)).rejects.toThrow('storage unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(storageRpc('delete_customers', {})).rejects.toThrow('storage unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
