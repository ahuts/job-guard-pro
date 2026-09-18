import { createHash } from 'node:crypto';

export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const storeConfigured = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
export async function redis<T = unknown>(command: Array<string | number>): Promise<T> {
  if (!storeConfigured()) throw new Error('Search storage unavailable');
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) throw new Error('Search storage unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Search storage unavailable');
  return data.result as T;
}
export async function cacheGet<T>(key: string): Promise<T | null> {
  try { const data = await redis<string | null>(['GET', key]); return data ? JSON.parse(data) : null; } catch { return null; }
}
export async function cachePut(key: string, value: unknown, seconds: number) {
  if (!storeConfigured()) return;
  await redis(['SET', key, JSON.stringify(value), 'EX', seconds]);
}
// An attempt is bound to the account and complete input fingerprint. Reservation,
// monthly budget, and per-account minute limit are one atomic operation.
export const RESERVE_SEARCH = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if tonumber(redis.call('GET', KEYS[2]) or '0') + 2 > tonumber(ARGV[1]) then return -1 end
if tonumber(redis.call('GET', KEYS[3]) or '0') >= 5 then return -2 end
redis.call('SET', KEYS[1], 'reserved', 'EX', 86400)
redis.call('INCRBY', KEYS[2], 2)
redis.call('EXPIRE', KEYS[2], 2764800)
redis.call('INCR', KEYS[3])
redis.call('EXPIRE', KEYS[3], 120)
return 1`;
export async function reserveSearch(userId: string, attemptId: string, fingerprint: string): Promise<number> {
  const now = new Date();
  const limit = Number(process.env.GHOSTJOB_MONTHLY_SEARCH_LIMIT ?? 1000);
  if (!Number.isSafeInteger(limit) || limit < 2) return -1;
  return redis<number>(['EVAL', RESERVE_SEARCH, 3,
    `gj:attempt:${hash([userId, attemptId, fingerprint])}`,
    `gj:search-month:${now.toISOString().slice(0, 7)}`,
    `gj:search-minute:${hash(userId)}:${Math.floor(now.getTime() / 60000)}`, limit]);
}
