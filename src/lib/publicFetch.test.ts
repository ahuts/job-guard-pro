// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup }));
vi.mock('node:https', () => ({ request: mocks.request }));
import { publicFetch } from '../server/publicFetch';

beforeEach(() => { mocks.lookup.mockReset(); mocks.request.mockReset(); mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]); });
afterEach(() => vi.useRealTimers());
function response(status: number, body: string, headers = {}) {
  mocks.request.mockImplementationOnce((_url, _options, callback) => {
    const req = new EventEmitter() as any;
    req.destroy = (error: Error) => { req.emit('error', error); req.emit('close'); };
    req.end = () => queueMicrotask(() => {
      const res = new EventEmitter() as any;
      res.statusCode = status; res.headers = headers;
      res.resume = () => { req.emit('close'); };
      res.destroy = (error?: Error) => { if (error) res.emit('error', error); req.emit('close'); };
      callback(res);
      if (status === 200) { res.emit('data', Buffer.from(body)); res.emit('end'); req.emit('close'); }
    });
    return req;
  });
}
describe('public HTTPS transport', () => {
  it('pins the validated DNS address to the connection', async () => {
    response(200, 'ok');
    expect((await publicFetch('https://example.com/jobs')).body).toBe('ok');
    const lookup = mocks.request.mock.calls[0][1].lookup;
    const callback = vi.fn(); lookup('example.com', {}, callback);
    expect(callback).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
  });
  it('rejects mixed public/private DNS answers before any connection', async () => {
    mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]);
    await expect(publicFetch('https://example.com/jobs')).rejects.toThrow('private or reserved');
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('validates redirect destinations before following them', async () => {
    response(302, '', { location: 'https://127.0.0.1/secrets' });
    await expect(publicFetch('https://example.com/jobs')).rejects.toThrow('public HTTPS');
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it('rejects excess streaming bytes without relying on Content-Length', async () => {
    response(200, '123456789');
    await expect(publicFetch('https://example.com/jobs', Date.now() + 4000, 5)).rejects.toThrow('size limit');
  });
  it('does not connect after the overall deadline', async () => {
    await expect(publicFetch('https://example.com/jobs', Date.now() - 1)).rejects.toThrow('timed out');
    expect(mocks.request).not.toHaveBeenCalled();
  });
});
