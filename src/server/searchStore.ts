import { createHash, createHmac } from 'node:crypto';

export const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rpcNames = new Set(['ghostjob_cache_get', 'ghostjob_cache_put', 'ghostjob_ai_reserve', 'ghostjob_ai_settle']);
export const storeConfigured = () => Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
  ((process.env.GHOSTJOB_STORAGE_BRIDGE_SECRET?.length || 0) >= 32 || process.env.SUPABASE_SERVICE_ROLE_KEY));
export async function storageRpc<T = unknown>(name: string, args: Record<string, unknown>, deadline?: number): Promise<T> {
  if (!storeConfigured() || !rpcNames.has(name)) throw new Error('Search storage unavailable');
  if (deadline !== undefined && Date.now() >= deadline) throw new Error('Storage deadline reached');
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
  const bridgeSecret = process.env.GHOSTJOB_STORAGE_BRIDGE_SECRET;
  const useBridge = Boolean(bridgeSecret && bridgeSecret.length >= 32);
  const body = JSON.stringify(useBridge ? { name, args } : args);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useBridge) {
    const timestamp = String(Date.now());
    headers['x-ghostjob-timestamp'] = timestamp;
    headers['x-ghostjob-signature'] = createHmac('sha256', bridgeSecret!).update(`${timestamp}.${body}`).digest('hex');
  } else {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    headers.apikey = key;
    headers.Authorization = `Bearer ${key}`;
  }
  const response = await fetch(new URL(useBridge ? '/functions/v1/ghostjob-ai-storage' : `/rest/v1/rpc/${encodeURIComponent(name)}`, base), {
    method: 'POST', headers, body,
    signal: AbortSignal.timeout(deadline === undefined ? 3500 : Math.max(1, Math.min(3500, deadline - Date.now()))),
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
