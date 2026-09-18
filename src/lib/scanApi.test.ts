// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { type VercelResponse } from '../../api/scan';

async function call(body: unknown, method = 'POST', authorization?: string) {
  let status = 0, payload: any;
  const headers: Record<string, string> = {};
  const res: VercelResponse<any> = {
    setHeader: (key, value) => { headers[key] = value; },
    status: value => { status = value; return res; },
    json: value => { payload = value; return res; },
    end: () => res,
  };
  await handler({ method, body, headers: { authorization } }, res);
  return { status, payload, headers };
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('shared scan API compatibility', () => {
  it('accepts empty optional URLs from old extensions and returns v2 by default', async () => {
    const result = await call({ title: 'Engineer', company: 'Acme', applicationUrl: '', companyLinkedInUrl: '' });
    expect(result.status).toBe(200);
    expect(result.payload.scoringVersion).toBe(2);
    expect(result.payload.trustScore).toBe(50);
  });
  it('returns v3 only when enabled and never silently falls back on a disabled pilot', async () => {
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'false');
    expect((await call({ title: 'Engineer', company: 'Acme', scoringVersion: 3 })).status).toBe(503);
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true'); vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'public');
    const result = await call({ title: 'Engineer', company: 'Acme', scoringVersion: 3, description: '', reposted: true });
    expect(result.status).toBe(200); expect(result.payload.scoringVersion).toBe(3); expect(result.payload.trustScore).toBe(50);
    expect(result.payload.verification.outcome).toBe('identity_unresolved');
  });
  it('validates before source lookups and supports authorization preflight', async () => {
    expect((await call({ title: { injected: true }, company: 'Acme' })).status).toBe(400);
    expect((await call({}, 'PUT')).status).toBe(405);
    const result = await call({}, 'OPTIONS');
    expect(result.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });
  it('advertises v2 to non-pilot website users while v3 is restricted', async () => {
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true'); vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'pilot');
    const result = await call({}, 'GET');
    expect(result.payload).toEqual({ scoringVersion: 2 });
    expect(result.headers['Cache-Control']).toBe('no-store');
  });
});
