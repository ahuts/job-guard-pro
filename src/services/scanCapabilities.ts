import { supabase } from '@/integrations/supabase/client';
import type { FreeUsage } from '@/lib/trustScore';

export interface ScanCapabilities {
  scoringVersion: 2 | 3;
  investigationEnabled: boolean;
  freeUsage?: FreeUsage | null;
}

export async function getScanCapabilities(): Promise<ScanCapabilities> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch('/api/scan', {
    headers: session ? { Authorization: 'Bearer ' + session.access_token } : {},
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Scan availability is temporarily unavailable.');
  return response.json() as Promise<ScanCapabilities>;
}
