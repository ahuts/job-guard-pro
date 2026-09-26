import { createHash } from 'node:crypto';

export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const storeConfigured = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
export async function redis<T = unknown>(command: Array<string | number>, deadline?: number): Promise<T> {
  if (!storeConfigured()) throw new Error('Search storage unavailable');
  if (deadline !== undefined && Date.now() >= deadline) throw new Error('Storage deadline reached');
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command), signal: AbortSignal.timeout(deadline === undefined ? 1500 : Math.max(1, Math.min(1500, deadline - Date.now()))),
  });
  if (!response.ok) throw new Error('Search storage unavailable');
  const data = await response.json();
  if (data.error) throw new Error('Search storage unavailable');
  return data.result as T;
}
export async function cacheGet<T>(key: string, deadline?: number): Promise<T | null> {
  try { const data = await redis<string | null>(['GET', key], deadline); return data ? JSON.parse(data) : null; } catch { return null; }
}
export async function cachePut(key: string, value: unknown, seconds: number, deadline?: number) {
  if (!storeConfigured()) return;
  await redis(['SET', key, JSON.stringify(value), 'EX', seconds], deadline);
}
