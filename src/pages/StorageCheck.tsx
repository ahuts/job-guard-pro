import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const messages: Record<string, string> = {
  passed: 'Passed: signed write and read succeeded, and anonymous and signed-in client access to the private RPC was denied.',
  not_configured: 'The signing secret is missing from this preview deployment. Save it in Vercel Preview, then redeploy.',
  not_eligible: 'This signed-in account is not on the server pilot allowlist.',
  sign_in_required: 'Please sign in again before testing.',
  auth_configuration_invalid: 'The preview server’s Supabase authentication configuration is missing or invalid. Check SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Preview; the anonymous key must match this GhostJob database.',
  storage_check_failed: 'Storage verification failed. Check that both services have the same signing secret, the storage SQL is installed, and the Cloud function is deployed.',
  unavailable: 'This check is available only on the pilot preview.',
};

export default function StorageCheck() {
  const { session } = useAuth();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  async function check() {
    if (!session?.access_token) { setMessage(messages.sign_in_required); return; }
    setRunning(true); setMessage('');
    try {
      const response = await fetch('/api/storage-check', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(20_000) });
      const result = await response.json();
      setMessage(messages[result.status] || 'The connection could not be checked.');
    } catch { setMessage('The connection could not be checked. Please try again.'); }
    finally { setRunning(false); }
  }
  return <DashboardLayout><Card className="max-w-2xl"><CardHeader><CardTitle>Pilot storage connection</CardTitle></CardHeader><CardContent className="space-y-4">
    <p>This checks a temporary cache entry and private access permissions. It makes no OpenAI or TypeSafe calls and does not use a scan allowance.</p>
    <Button onClick={check} disabled={running}>{running ? 'Checking…' : 'Test storage connection'}</Button>
    {message && <p role="status">{message}</p>}
  </CardContent></Card></DashboardLayout>;
}
