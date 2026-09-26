import { handleStorageBridge } from '../_shared/ghostjobStorageBridge.ts';

Deno.serve((request: Request) => handleStorageBridge(request, {
  secret: Deno.env.get('GHOSTJOB_STORAGE_BRIDGE_SECRET'),
  supabaseUrl: Deno.env.get('SUPABASE_URL'),
  // Lovable Cloud supplies this internally; it never leaves the function runtime.
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
