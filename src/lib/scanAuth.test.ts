// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifiedUser } from '../server/scanV3';
beforeEach(() => { vi.stubEnv('SUPABASE_URL', 'https://db.example'); vi.stubEnv('SUPABASE_ANON_KEY', 'public-key'); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('server account verification', () => {
  it('recognizes invalid API configuration without exposing the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'Invalid API key' }, { status: 401 })));
    const failure = vi.fn();
    expect(await verifiedUser('Bearer session', failure)).toBeNull();
    expect(failure).toHaveBeenCalledWith('configuration_invalid');
  });
  it('keeps expired sessions distinct from configuration failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'JWT expired', code: 'bad_jwt' }, { status: 401 })));
    const failure = vi.fn();
    expect(await verifiedUser('Bearer session', failure)).toBeNull(); expect(failure).toHaveBeenCalledWith('session_invalid');
  });
  it('verifies signed-in accounts and excludes anonymous users', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 'pilot', is_anonymous: false })));
    expect(await verifiedUser('Bearer session')).toBe('pilot');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ id: 'anonymous', is_anonymous: true })));
    expect(await verifiedUser('Bearer session')).toBeNull();
  });
  it('never attempts authentication without server configuration or a bearer', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await verifiedUser()).toBeNull();
    vi.stubEnv('SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_URL', '');
    const failure = vi.fn(); expect(await verifiedUser('Bearer session', failure)).toBeNull();
    expect(failure).toHaveBeenCalledWith('not_configured'); expect(fetcher).not.toHaveBeenCalled();
  });
});
