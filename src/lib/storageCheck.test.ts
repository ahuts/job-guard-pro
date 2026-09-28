// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelResponse } from '../../api/scan';
const mocks = vi.hoisted(() => ({ verifiedUser: vi.fn(), storageRpc: vi.fn() }));
vi.mock('../server/scanV3', () => ({ verifiedUser: mocks.verifiedUser }));
vi.mock('../server/searchStore', () => ({ storageRpc: mocks.storageRpc }));
import handler from '../../api/storage-check';

async function call(method = 'POST') {
  let status = 0;
  let payload: unknown;
  const headers: Record<string, string> = {};
  const res: VercelResponse = {
    setHeader: (name, value) => { headers[name] = value; },
    status: value => { status = value; return res; },
    json: value => { payload = value; return res; },
    end: () => res,
  };
  await handler({ method, body: {}, headers: { authorization: 'Bearer session' } }, res);
  return { status, payload, headers };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('GHOSTJOB_V3_PILOT_USERS', 'pilot');
  vi.stubEnv('GHOSTJOB_STORAGE_BRIDGE_SECRET', 's'.repeat(64));
  vi.stubEnv('SUPABASE_URL', 'https://db.example');
  vi.stubEnv('SUPABASE_ANON_KEY', 'public-key');
  vi.stubEnv('GHOSTJOB_OPENAI_INVESTIGATION_ENABLED', 'false');
  mocks.verifiedUser.mockResolvedValue('pilot');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('preview storage diagnostic', () => {
  it('cannot run in production even for pilots and public rollout', async () => {
    vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'public');
    expect((await call()).status).toBe(404);
    expect(mocks.verifiedUser).not.toHaveBeenCalled(); expect(mocks.storageRpc).not.toHaveBeenCalled();
  });
  it('requires a verified account on the server allowlist before storage work', async () => {
    mocks.verifiedUser.mockResolvedValue(null); expect((await call()).status).toBe(401);
    mocks.verifiedUser.mockResolvedValue('customer'); expect((await call()).status).toBe(403);
    expect(mocks.storageRpc).not.toHaveBeenCalled();
  });
  it('refuses missing bridge configuration without using a service-role fallback', async () => {
    vi.stubEnv('GHOSTJOB_STORAGE_BRIDGE_SECRET', ''); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy');
    expect((await call()).payload).toEqual({ status: 'not_configured' }); expect(mocks.storageRpc).not.toHaveBeenCalled();
  });
  it('identifies invalid authentication configuration before any storage write', async () => {
    mocks.verifiedUser.mockImplementation(async (_authorization: string, failed: (reason: string) => void) => { failed('configuration_invalid'); return null; });
    expect((await call()).payload).toEqual({ status: 'auth_configuration_invalid' });
    expect(mocks.storageRpc).not.toHaveBeenCalled();
    mocks.verifiedUser.mockReset();
  });
  it('verifies a temporary signed round trip and public denial while AI is disabled', async () => {
    let value: unknown;
    mocks.storageRpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'ghostjob_cache_put') { value = args.p_value; expect(args.p_ttl_seconds).toBe(60); return true; }
      return value;
    });
    const fetcher = vi.fn(async (_input: URL | RequestInfo, _init?: RequestInit) => Response.json({ code: '42501' }, { status: 403 })); vi.stubGlobal('fetch', fetcher);
    const result = await call();
    expect(result.status).toBe(200);
    expect(result.payload).toEqual({ status: 'passed', signedWrite: true, signedRead: true, publicRpcDenied: true, authenticatedRpcDenied: true, providerCalls: 0 });
    expect(mocks.storageRpc.mock.calls.map(call => call[0])).toEqual(['ghostjob_cache_put', 'ghostjob_cache_get']);
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0]?.[0])).not.toContain('openai');
  });
  it('does not pass if a read differs or the public RPC is exposed', async () => {
    mocks.storageRpc.mockResolvedValueOnce(true).mockResolvedValueOnce({ nonce: 'wrong' });
    expect((await call()).status).toBe(503);
    let value: unknown;
    mocks.storageRpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'ghostjob_cache_put') { value = args.p_value; return true; }
      return value;
    });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(null)));
    expect((await call()).payload).toEqual({ status: 'storage_check_failed' });
  });
  it('conceals provider errors and never writes a budget reservation', async () => {
    mocks.storageRpc.mockRejectedValue(new Error('secret credential raw user text'));
    expect((await call()).payload).toEqual({ status: 'storage_check_failed' });
    expect(mocks.storageRpc.mock.calls.every(call => call[0] === 'ghostjob_cache_put')).toBe(true);
  });
  it('never mistakes invalid authentication for a successful private permission check', async () => {
    let value: unknown;
    mocks.storageRpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'ghostjob_cache_put') { value = args.p_value; return true; }
      return value;
    });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'PGRST301' }, { status: 401 })));
    expect((await call()).payload).toEqual({ status: 'storage_check_failed' });
  });
  it('requires POST to prevent a page visit from mutating storage', async () => {
    expect((await call('GET')).status).toBe(405); expect(mocks.storageRpc).not.toHaveBeenCalled();
  });
});
