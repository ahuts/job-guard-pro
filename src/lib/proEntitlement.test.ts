// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifiedPro } from '../server/proEntitlement';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('paid investigation entitlement', () => {
  it('uses the signed-in account profile and treats gifted Pro like paid Pro', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://db.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'publishable');
    const fetcher = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(_url.searchParams.get('id')).toBe('eq.account-1');
      expect(init.headers).toMatchObject({ Authorization: 'Bearer session', apikey: 'publishable' });
      return new Response(JSON.stringify([{ subscription_tier: 'pro' }]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await verifiedPro('account-1', 'Bearer session')).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fails closed on free tiers, missing sessions, ambiguous rows and database failures', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://db.example');
    vi.stubEnv('SUPABASE_ANON_KEY', 'publishable');
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ subscription_tier: 'free' }]), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await verifiedPro('account-1', 'Bearer session')).toBe(false);
    expect(await verifiedPro('account-1')).toBe(false);
    expect(await verifiedPro(null, 'Bearer session')).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify([{ subscription_tier: 'pro' }, { subscription_tier: 'pro' }]), { status: 200 }));
    expect(await verifiedPro('account-1', 'Bearer session')).toBe(false);
    fetcher.mockResolvedValueOnce(new Response('', { status: 503 }));
    expect(await verifiedPro('account-1', 'Bearer session')).toBe(false);
  });
});
