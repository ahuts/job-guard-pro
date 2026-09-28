// Read the server-verified account's current Pro tier from Supabase. The
// database must deny client writes to subscription fields before this is used
// to authorize paid investigation.
export async function verifiedPro(userId: string | null, authorization?: string): Promise<boolean> {
  if (!userId || !authorization?.startsWith('Bearer ')) return false;
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return false;
  try {
    const endpoint = new URL('/rest/v1/profiles', base);
    endpoint.searchParams.set('select', 'subscription_tier');
    endpoint.searchParams.set('id', `eq.${userId}`);
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: authorization, Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const rows: unknown = await response.json();
    return Array.isArray(rows) && rows.length === 1 && rows[0]?.subscription_tier === 'pro';
  } catch { return false; }
}
