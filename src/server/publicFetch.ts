import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request } from 'node:https';

const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3]] as const) blocked.addSubnet(address, prefix, 'ipv4');
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return !blocked.check(address, 'ipv4');
  // Permit global unicast only; exclude transition and documentation ranges.
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^200[12]:|^2001:(?:0:|db8:|10:|20:)/i.test(address);
}
export function publicUrl(raw: string): URL {
  const url = new URL(raw);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.port || (isIP(host) && !isPublicAddress(host))) throw new Error('Source must use public HTTPS');
  url.hash = '';
  return url;
}
export interface PublicPage { url: string; body: string; status: number; checkedAt: string; cached?: boolean }
export async function publicFetch(raw: string, deadline = Date.now() + 4000, maxBytes = 1_000_000): Promise<PublicPage> {
  let url = publicUrl(raw);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const remaining = Math.min(4000, deadline - Date.now());
    if (remaining <= 0) throw new Error('Source check timed out');
    let timer: ReturnType<typeof setTimeout>;
    const addresses = await Promise.race([
      lookup(host, { all: true }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DNS timed out')), remaining); }),
    ]).finally(() => clearTimeout(timer));
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Source resolves to a private or reserved network');
    const pinned = addresses[0];
    const result = await new Promise<{ status: number; location?: string; body: string }>((resolve, reject) => {
      const req = request(url, {
        agent: false,
        // Pin the validated address to the actual socket; do not resolve twice.
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [pinned]);
          else callback(null, pinned.address, pinned.family);
        },
        headers: { 'User-Agent': 'GhostJob/1.3 public-job-verifier', Accept: 'application/json,text/html', 'Accept-Encoding': 'identity' },
      }, res => {
        const status = res.statusCode ?? 0;
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.resume(); resolve({ status, location: res.headers.location, body: '' }); return;
        }
        if (Number(res.headers['content-length'] ?? 0) > maxBytes || (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity')) {
          res.destroy(); reject(new Error('Source response is too large or encoded')); return;
        }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) { res.destroy(new Error('Source response exceeds size limit')); return; }
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8') }));
      });
      const timeout = setTimeout(() => req.destroy(new Error('Source check timed out')), Math.max(1, Math.min(4000, deadline - Date.now())));
      req.on('error', reject);
      req.on('close', () => clearTimeout(timeout));
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      if (!result.location) throw new Error('Redirect missing destination');
      url = publicUrl(new URL(result.location, url).href);
      continue;
    }
    return { url: url.href, status: result.status, body: result.body, checkedAt: new Date().toISOString() };
  }
  throw new Error('Too many redirects');
}
