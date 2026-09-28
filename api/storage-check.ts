import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './scan';
import type { AuthFailure } from '../src/server/scanV3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  // This diagnostic is unavailable on production, regardless of rollout flags.
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ status: 'unavailable' });
  if (req.method !== 'POST') return res.status(405).json({ status: 'method_not_allowed' });
  // Vercel compiles API entries as CommonJS; shared server modules are ESM.
  // Use the same dynamic-loading boundary as the existing scan handler.
  const { verifiedUser } = await import('../src/server/scanV3.js');
  const authorization = req.headers?.authorization;
  const authState: { failure?: AuthFailure } = {};
  const user = await verifiedUser(typeof authorization === 'string' ? authorization : undefined, reason => { authState.failure = reason; });
  if (!user) {
    const configuration = authState.failure === 'configuration_invalid' || authState.failure === 'not_configured';
    return res.status(configuration ? 503 : 401).json({ status: configuration ? 'auth_configuration_invalid' : 'sign_in_required' });
  }
  const pilots = (process.env.GHOSTJOB_V3_PILOT_USERS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!pilots.includes(user)) return res.status(403).json({ status: 'not_eligible' });
  if ((process.env.GHOSTJOB_STORAGE_BRIDGE_SECRET?.length || 0) < 32) return res.status(503).json({ status: 'not_configured' });
  const deadline = Date.now() + 10_000;
  const key = `gj:storage-check:${randomUUID()}`;
  const value = { nonce: randomUUID() };
  try {
    const { storageRpc } = await import('../src/server/searchStore.js');
    if (await storageRpc('ghostjob_cache_put', { p_key: key, p_value: value, p_ttl_seconds: 60 }, deadline) !== true) throw new Error('Write failed');
    const read = await storageRpc<{ nonce?: unknown } | null>('ghostjob_cache_get', { p_key: key }, deadline);
    if (read?.nonce !== value.nonce) throw new Error('Read failed');
    // Confirm a public client cannot directly execute the same private RPC.
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!base || !anonKey) throw new Error('Missing public connection');
    const anonymousHeaders: Record<string, string> = { apikey: anonKey, 'Content-Type': 'application/json' };
    if (anonKey.split('.').length === 3) anonymousHeaders.Authorization = `Bearer ${anonKey}`;
    const denials = await Promise.all([anonymousHeaders, { apikey: anonKey, Authorization: authorization as string, 'Content-Type': 'application/json' }].map(async headers => {
      const response = await fetch(new URL('/rest/v1/rpc/ghostjob_cache_get', base), {
        method: 'POST', headers, body: JSON.stringify({ p_key: key }),
        signal: AbortSignal.timeout(Math.max(1, Math.min(1500, deadline - Date.now()))),
      });
      const body = await response.json();
      // Invalid JWT/API-key errors do not prove that database permissions deny access.
      return [401, 403].includes(response.status) && body?.code === '42501';
    }));
    if (!denials.every(Boolean)) throw new Error('Private RPC denial not confirmed');
    return res.status(200).json({ status: 'passed', signedWrite: true, signedRead: true, publicRpcDenied: true, authenticatedRpcDenied: true, providerCalls: 0 });
  } catch {
    return res.status(503).json({ status: 'storage_check_failed' });
  }
}
