// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const script = readFileSync(process.cwd() + '/ghostjob-extension-v4/ghostjob-extension/background.js', 'utf8');
const expired = 'x.' + Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url') + '.x';
const fresh = 'x.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.x';

function worker(fetcher: typeof fetch) {
  const data: Record<string, unknown> = { gj_auth_token: expired, gj_refresh_token: 'old-refresh', gj_user_email: 'pilot@example.com' };
  let listener: (request: unknown, sender: unknown, respond: (response: unknown) => void) => void = () => {};
  const chrome = { storage: { local: {
    get: async (keys: string[]) => Object.fromEntries(keys.map(key => [key, data[key]])),
    set: async (values: Record<string, unknown>) => { Object.assign(data, values); },
    remove: async (keys: string[]) => { keys.forEach(key => delete data[key]); },
  } }, runtime: { onMessage: { addListener: (fn: typeof listener) => { listener = fn; } } } };
  runInNewContext(script, { chrome, fetch: fetcher, AbortSignal, atob, Date, JSON, Error, URL });
  return { data, scan: () => new Promise<any>(resolve => listener({ action: 'scanJob', jobData: { scoringVersion: 3 } }, {}, resolve)) };
}

describe('pilot extension session refresh', () => {
  it('refreshes an expired token before sending the listing to the pilot API', async () => {
    const fetcher = vi.fn(async (url: string, options: RequestInit) => String(url).includes('refresh_token')
      ? new Response(JSON.stringify({ access_token: fresh, refresh_token: 'new-refresh' }), { status: 200 })
      : new Response(JSON.stringify({ scoringVersion: 3, trustScore: 55 }), { status: 200 }));
    const { data, scan } = worker(fetcher as typeof fetch);
    expect((await scan()).success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((fetcher.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe('Bearer ' + fresh);
    expect(data.gj_refresh_token).toBe('new-refresh');
  });
  it('asks for sign-in and does not scan when refresh is rejected', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 401 }));
    const { data, scan } = worker(fetcher as typeof fetch);
    expect((await scan()).error).toContain('Sign in again');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data.gj_auth_token).toBeUndefined();
  });
  it('preserves the session for a temporary refresh outage', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 503 }));
    const { data, scan } = worker(fetcher as typeof fetch);
    expect((await scan()).error).toContain('Please retry');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(data.gj_refresh_token).toBe('old-refresh');
  });
});
