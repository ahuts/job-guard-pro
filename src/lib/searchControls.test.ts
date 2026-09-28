// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { storageRpc } from '../server/searchStore';
import { reserveInvestigation, investigationKeys, monthlyBudgetMicroUsd } from '../server/investigationBudget';
import { scanV3, verifiedUser } from '../server/scanV3';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('paid discovery controls', () => {
  it('does not start a network request without shared-store credentials', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(storageRpc('ghostjob_cache_get', { p_key: 'key' })).rejects.toThrow('storage unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses one atomic reservation for budget, rate limit and retry identity', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://db.example'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
    const fetch = vi.fn(async (_url: unknown, _init: RequestInit) => ({ ok: true, json: async () => 1 })); vi.stubGlobal('fetch', fetch);
    expect((await reserveInvestigation('user-a', 'fingerprint')).status).toBe(1);
    const command = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(String(fetch.mock.calls[0][0])).toBe('https://db.example/rest/v1/rpc/ghostjob_ai_reserve');
    expect(command.p_reserved_micro_usd).toBe(1_000_000);
    expect(command.p_attempt_key).not.toContain('user-a');
    expect(command.p_account_key).not.toContain('user-a');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('caps the budget at the approved ceiling and binds retries to account and content', () => {
    vi.stubEnv('GHOSTJOB_AI_MONTHLY_BUDGET_USD', '26'); expect(monthlyBudgetMicroUsd()).toBe(0);
    vi.stubEnv('GHOSTJOB_AI_MONTHLY_BUDGET_USD', '25'); expect(monthlyBudgetMicroUsd()).toBe(25_000_000);
    expect(investigationKeys('u', 'f').attemptKey).not.toBe(investigationKeys('u', 'corrected').attemptKey);
    expect(investigationKeys('u', 'f').attemptKey).not.toBe(investigationKeys('other', 'f').attemptKey);
    expect(investigationKeys('u', 'f', new Date('2026-09-30T23:59:59Z')).monthKey).not.toBe(investigationKeys('u', 'f', new Date('2026-10-01T00:00:00Z')).monthKey);
  });
  it('fails closed if Supabase rejects the budget command', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://db.example'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    await expect(reserveInvestigation('u', 'f')).rejects.toThrow('storage unavailable');
  });
  it('never trusts a client-provided identity when no bearer is present', async () => {
    expect(await verifiedUser()).toBeNull();
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true'); vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'pilot'); vi.stubEnv('GHOSTJOB_V3_PILOT_USERS', 'pretend');
    await expect(scanV3({ title: 'Engineer', company: 'Acme', userId: 'pretend', scoringVersion: 3 })).rejects.toMatchObject({ status: 503 });
  });
  it('requires server-verified sign-in for deep checks even on public rollout', async () => {
    vi.stubEnv('GHOSTJOB_V3_ENABLED', 'true'); vi.stubEnv('GHOSTJOB_V3_SCHEMA_READY', 'true'); vi.stubEnv('GHOSTJOB_V3_ROLLOUT', 'public');
    await expect(scanV3({ title: 'Engineer', company: 'Acme', scoringVersion: 3, scanMode: 'deep', scanAttemptId: 'attempt-123' })).rejects.toMatchObject({ status: 401 });
  });
  it('reuses a completed signed-in deep check without another paid query', async () => {
    for (const [key, value] of Object.entries({ GHOSTJOB_V3_ENABLED: 'true', GHOSTJOB_V3_SCHEMA_READY: 'true', GHOSTJOB_V3_ROLLOUT: 'public', GHOSTJOB_OPENAI_INVESTIGATION_ENABLED: 'true', GHOSTJOB_INVESTIGATION_SCHEMA_READY: 'true', GHOSTJOB_V3_PILOT_USERS: 'account-one', OPENAI_API_KEY: 'test', SUPABASE_SERVICE_ROLE_KEY: 'test', SUPABASE_URL: 'https://auth.example', SUPABASE_ANON_KEY: 'test' })) vi.stubEnv(key, value);
    const stored = new Map<string, unknown>(); let paidQueries = 0, reservations = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'account-one', is_anonymous: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (target.includes('/rest/v1/rpc/')) {
        const command = JSON.parse(init?.body as string);
        let result: unknown = null;
        if (target.endsWith('ghostjob_cache_get')) result = stored.get(command.p_key) ?? null;
        if (target.endsWith('ghostjob_cache_put')) { stored.set(command.p_key, command.p_value); result = true; }
        if (target.endsWith('ghostjob_ai_reserve')) { reservations++; result = 1; }
        if (target.endsWith('ghostjob_ai_settle')) result = 1;
        return new Response(JSON.stringify(result), { status: 200 });
      }
      if (target.includes('api.openai.com')) {
        paidQueries++;
        const request = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ model: 'gpt-5.4-mini-2026-03-17', status: 'completed', usage: { input_tokens: 100, output_tokens: 100 }, output: [
          ...(request.tools ? [{ type: 'web_search_call', action: { type: 'search', sources: [] } }] : []),
          { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(request.tools ? { urls: [] } : { selectedCandidateId: null, finding: 'insufficient_evidence', dimensions: [], cautionFlags: [] }) }] }
        ] }), { status: 200 });
      }
      throw new Error('Unexpected network request');
    }));
    const request = { title: 'Engineer', company: 'Acme', scoringVersion: 3, scanMode: 'deep', scanAttemptId: 'attempt-123' };
    const first = await scanV3(request, 'Bearer signed-in-test-token');
    const second = await scanV3(request, 'Bearer signed-in-test-token');
    expect(second.investigation).toEqual(first.investigation); expect(second.trustScore).toEqual(first.trustScore); expect(paidQueries).toBe(2); expect(reservations).toBe(1);
  });
});
