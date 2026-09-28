// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const folder = process.cwd() + '/ghostjob-extension-v4/production-extension/';
const script = readFileSync(folder + 'background.js', 'utf8');
const token = 'x.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') + '.x';

function worker(fetcher: typeof fetch) {
  const data = { gj_auth_token: token, gj_refresh_token: 'refresh' };
  let listener: (request: unknown, sender: unknown, respond: (response: unknown) => void) => void = () => {};
  const chrome = { storage: { local: {
    get: async (keys: string[]) => Object.fromEntries(keys.map(key => [key, data[key as keyof typeof data]])),
    set: async () => {}, remove: async () => {},
  } }, runtime: { onMessage: { addListener: (fn: typeof listener) => { listener = fn; } } } };
  runInNewContext(script, { chrome, fetch: fetcher, AbortSignal, atob, Date, JSON, Error, URL });
  return () => new Promise<any>(resolve => listener({ action: 'scanJob', jobData: { scoringVersion: 3, title: 'Engineer', company: 'Acme' } }, {}, resolve));
}

describe('production extension scan negotiation', () => {
  for (const version of [2, 3]) it(`uses server-advertised v${version} for an account`, async () => {
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => options.method === 'GET'
      ? new Response(JSON.stringify({ scoringVersion: version, investigationEnabled: version === 3 }), { status: 200 })
      : new Response(JSON.stringify({ scoringVersion: version, trustScore: 55 }), { status: 200 }));
    expect((await worker(fetcher as typeof fetch)()).success).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0][0])).toBe('https://www.jobghost.io/api/scan');
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string).scoringVersion).toBe(version);
  });

  it('does not count a scan when the production backend lacks capability negotiation', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 405 }));
    expect((await worker(fetcher as typeof fetch)()).error).toContain('not ready');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
