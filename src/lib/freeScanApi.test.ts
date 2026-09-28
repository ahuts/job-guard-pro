// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelResponse } from '../../api/scan';
const mocks = vi.hoisted(() => ({ verifiedUser: vi.fn(), verifiedPro: vi.fn(), storageRpc: vi.fn() }));
vi.mock('../server/scanV3', async importOriginal => ({ ...(await importOriginal<typeof import('../server/scanV3')>()), verifiedUser: mocks.verifiedUser }));
vi.mock('../server/proEntitlement', () => ({ verifiedPro: mocks.verifiedPro }));
vi.mock('../server/searchStore', async importOriginal => ({ ...(await importOriginal<typeof import('../server/searchStore')>()), storageRpc: mocks.storageRpc }));
import handler from '../../api/scan';

async function call(body: unknown, method = 'POST') {
  let status = 0;
  let payload: any;
  const res: VercelResponse = {
    setHeader: () => {},
    status: value => { status = value; return res; },
    json: value => { payload = value; return res; },
    end: () => res,
  };
  await handler({ method, body, headers: { authorization: 'Bearer session' } }, res);
  return { status, payload };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifiedUser.mockResolvedValue('free-user');
  mocks.verifiedPro.mockResolvedValue(false);
  vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true');
  vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true');
  vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'public');
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('shared Free scan API gate', () => {
  it('advertises server usage and counts a completed legacy scan once', async () => {
    mocks.storageRpc.mockImplementation(async (_name: string, args: Record<string, unknown>) => {
      if (args.p_action === 'status') return { status: 'available', monthKey: '2026-09', used: 0, remaining: 3 };
      if (args.p_action === 'reserve') return { status: 'reserved', monthKey: '2026-09', used: 0, leaseKey: args.p_lease_key };
      return { status: 'completed', monthKey: '2026-09', used: 1 };
    });
    const capability = await call({}, 'GET');
    expect(capability.payload).toMatchObject({ scoringVersion: 3, investigationEnabled: false,
      freeUsage: { limit: 3, used: 0, remaining: 3, resetsAt: '2026-10-01T00:00:00.000Z' } });
    const result = await call({ title: 'Engineer', company: 'Acme', scoringVersion: 2 });
    expect(result.status).toBe(200);
    expect(result.payload).toMatchObject({ scoringVersion: 2, freeUsage: { used: 1, remaining: 2 } });
    expect(mocks.storageRpc.mock.calls.map(entry => entry[1].p_action)).toEqual(['status', 'reserve', 'finish']);
  });
  it('blocks fourth-job attempts through both scoring versions and fails closed without storage', async () => {
    mocks.storageRpc.mockResolvedValue({ status: 'limited', monthKey: '2026-09', used: 3 });
    for (const scoringVersion of [2, 3]) {
      const result = await call({ title: 'Designer', company: 'Acme', scoringVersion });
      expect(result.status).toBe(429);
      expect(result.payload.code).toBe('free_scan_limit');
    }
    mocks.storageRpc.mockRejectedValue(new Error('private storage details'));
    const result = await call({ title: 'Designer', company: 'Acme', scoringVersion: 2 });
    expect(result.status).toBe(503);
    expect(JSON.stringify(result.payload)).not.toContain('private storage details');
  });
  it('does not run a second scan under another request\'s pending lease', async () => {
    mocks.storageRpc.mockResolvedValue({ status: 'reserved', monthKey: '2026-09', used: 0, leaseKey: 'another-request-lease' });
    const result = await call({ title: 'Engineer', company: 'Acme', scoringVersion: 2 });
    expect(result.status).toBe(409);
    expect(result.payload.code).toBe('scan_in_progress');
    expect(mocks.storageRpc).toHaveBeenCalledTimes(1);
  });
  it('keeps Pro standard scans available when Free allowance storage fails', async () => {
    mocks.verifiedPro.mockResolvedValue(true);
    mocks.storageRpc.mockRejectedValue(new Error('storage offline'));
    const result = await call({ title: 'Engineer', company: 'Acme', scoringVersion: 2 });
    expect(result.status).toBe(200);
    expect(result.payload.freeUsage).toBeUndefined();
    expect(mocks.storageRpc).not.toHaveBeenCalled();
  });
});
