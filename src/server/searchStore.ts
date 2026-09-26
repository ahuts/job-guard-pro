import { createHash } from 'node:crypto';

export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const storeConfigured = () => Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function storageRpc<T = unknown>(name: string, args: Record<string, unknown>, deadline?: number): Promise<T> {
  if (!storeConfigured()) throw new Error('Search storage unavailable');
  if (deadline !== undefined && Date.now() >= deadline) throw new Error('Storage deadline reached');
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const response = await fetch(new URL(`/rest/v1/rpc/${encodeURIComponent(name)}`, base), {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(deadline === undefined ? 1500 : Math.max(1, Math.min(1500, deadline - Date.now()))),
  });
  if (!response.ok) throw new Error('Search storage unavailable');
  return await response.json() as T;
}
export async function cacheGet<T>(key: string, deadline?: number): Promise<T | null> {
  try { return await storageRpc<T | null>('ghostjob_cache_get', { p_key: key }, deadline); } catch { return null; }
}
export async function cachePut(key: string, value: unknown, seconds: number, deadline?: number) {
  if (!storeConfigured()) return;
  const saved = await storageRpc('ghostjob_cache_put', { p_key: key, p_value: value, p_ttl_seconds: seconds }, deadline);
  if (saved !== true) throw new Error('Search storage unavailable');
}
