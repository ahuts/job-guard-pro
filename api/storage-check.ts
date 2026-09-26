import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from './scan';
import { verifiedUser } from '../src/server/scanV3.js';
import { storageRpc } from '../src/server/searchStore.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  // This diagnostic is unavailable on production, regardless of rollout flags.
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ status: 'unavailable' });
  if (req.method !== 'POST') return res.status(405).json({ status: 'method_not_allowed' });
  const authorization = req.headers?.authorization;
  const user = await verifiedUser(typeof authorization === 'string' ? authorization : undefined);
  if (!user) return res.status(401).json({ status: 'sign_in_required' });
  const pilots = (process.env.GHOSTJOB_V3_PILOT_USERS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!pilots.includes(user)) return res.status(403).json({ status: 'not_eligible' });
  if ((process.env.GHOSTJOB_STORAGE_BRIDGE_SECRET?.length || 0) < 32) return res.status(503).json({ status: 'not_configured' });
  const deadline = Date.now() + 10_000;
  const key = `gj:storage-check:${randomUUID()}`;
  const value = { nonce: randomUUID() };
  try {
    if (await storageRpc('ghostjob_cache_put', { p_key: key, p_value: value, p_ttl_seconds: 60 }, deadline) !== true) throw new Error('Write failed');
    const read = await storageRpc<{ nonce?: unknown } | null>('ghostjob_cache_get', { p_key: key }, deadline);
    if (read?.nonce !== value.nonce) throw new Error('Read failed');
    // Confirm a public client cannot directly execute the same private RPC.
    const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!base || !anonKey) throw new Error('Missing public connection');
    const denied = await fetch(new URL('/rest/v1/rpc/ghostjob_cache_get', base), {
      method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_key: key }), signal: AbortSignal.timeout(Math.max(1, Math.min(1500, deadline - Date.now()))),
    });
    if (![401, 403].includes(denied.status)) throw new Error('Public RPC denial not confirmed');
    return res.status(200).json({ status: 'passed', signedWrite: true, signedRead: true, publicRpcDenied: true, providerCalls: 0 });
  } catch {
    return res.status(503).json({ status: 'storage_check_failed' });
  }
}
