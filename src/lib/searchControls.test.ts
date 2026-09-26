// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { redis } from '../server/searchStore';
import { reserveInvestigation, RESERVE_INVESTIGATION, SETTLE_INVESTIGATION, investigationKeys, monthlyBudgetMicroUsd } from '../server/investigationBudget';
import { scanV3, verifiedUser } from '../server/scanV3';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('paid discovery controls', () => {
  it('does not start a network request without shared-store credentials', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', ''); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(redis(['GET', 'key'])).rejects.toThrow('storage unavailable');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses one atomic reservation for budget, rate limit and retry identity', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    const fetch = vi.fn(async (_url: unknown, _init: { body: string }) => ({ ok: true, json: async () => ({ result: 1 }) })); vi.stubGlobal('fetch', fetch);
    expect((await reserveInvestigation('user-a', 'fingerprint')).status).toBe(1);
    const command = JSON.parse(fetch.mock.calls[0][1].body);
    expect(command.slice(0, 3)).toEqual(['EVAL', RESERVE_INVESTIGATION, 3]);
    expect(command[3]).not.toContain('user-a');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('caps the budget at the approved ceiling and binds retries to account and content', () => {
    vi.stubEnv('GHOSTJOB_AI_MONTHLY_BUDGET_USD', '26'); expect(monthlyBudgetMicroUsd()).toBe(0);
    vi.stubEnv('GHOSTJOB_AI_MONTHLY_BUDGET_USD', '25'); expect(monthlyBudgetMicroUsd()).toBe(25_000_000);
    expect(investigationKeys('u', 'f').attemptKey).not.toBe(investigationKeys('u', 'corrected').attemptKey);
    expect(investigationKeys('u', 'f').attemptKey).not.toBe(investigationKeys('other', 'f').attemptKey);
    expect(investigationKeys('u', 'f', new Date('2026-09-30T23:59:59Z')).monthKey).not.toBe(investigationKeys('u', 'f', new Date('2026-10-01T00:00:00Z')).monthKey);
    expect(SETTLE_INVESTIGATION).toContain("reserved == 'settled'");
  });
  it('fails closed if Redis rejects the budget command', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ error: 'ERR' }) })));
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
    for (const [key, value] of Object.entries({ GHOSTJOB_V3_ENABLED: 'true', GHOSTJOB_V3_SCHEMA_READY: 'true', GHOSTJOB_V3_ROLLOUT: 'public', GHOSTJOB_OPENAI_INVESTIGATION_ENABLED: 'true', GHOSTJOB_INVESTIGATION_SCHEMA_READY: 'true', GHOSTJOB_V3_PILOT_USERS: 'account-one', OPENAI_API_KEY: 'test', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test', SUPABASE_URL: 'https://auth.example', SUPABASE_ANON_KEY: 'test' })) vi.stubEnv(key, value);
    const stored = new Map(); let paidQueries = 0, reservations = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: any, init: any) => {
      const target = String(url);
      if (target.includes('/auth/v1/user')) return new Response(JSON.stringify({ id: 'account-one', is_anonymous: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (target.includes('redis.example')) {
        const command = JSON.parse(init.body);
        let result: any = null;
        if (command[0] === 'GET') result = stored.get(command[1]) ?? null;
        if (command[0] === 'SET') { stored.set(command[1], command[2]); result = 'OK'; }
        if (command[0] === 'EVAL') { if (command[1] === RESERVE_INVESTIGATION) reservations++; result = 1; }
        return new Response(JSON.stringify({ result }), { status: 200 });
      }
      if (target.includes('api.openai.com')) {
        paidQueries++;
        const request = JSON.parse(init.body);
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
