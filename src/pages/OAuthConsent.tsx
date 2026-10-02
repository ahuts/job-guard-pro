import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Ghost } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";

type OAuthResult = { data: any; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const { user, loading } = useAuth();
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorizationId) { setError("This connection link is missing its authorization ID."); return; }
    if (loading || !user) return;
    let active = true;
    (async () => {
      const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError("This connection request is invalid or has expired. Start again from your assistant.");
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId, user, loading]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(approve ? "Could not approve the connection. Please try again." : "Could not cancel the connection. Please try again."); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect was returned. Please try again."); }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An assistant";
  const consentPath = window.location.pathname + window.location.search;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 space-y-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Ghost className="h-6 w-6 text-primary" />
          <span className="font-semibold">GhostJob</span>
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <>
            <h1 className="text-xl font-semibold">Sign in to connect</h1>
            <p className="text-sm text-muted-foreground">Sign in to your existing GhostJob account to continue.</p>
            <AuthDialog open onOpenChange={() => {}} initialView="login" redirectTo={consentPath} />
          </>
        ) : !details ? (
          <p className="text-sm text-muted-foreground">Loading connection request…</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Connect {clientName} to GhostJob</h1>
            <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
            <p className="text-sm">{clientName} will be able to read your saved jobs, notes, and follow-up dates while you are signed in.</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Read-only: it cannot edit, delete, scan, apply, or message anyone.</li>
              <li>Share your basic profile and email address.</li>
              <li>This does not bypass GhostJob's permissions.</li>
            </ul>
            {details.redirect_uri && <p className="text-xs text-muted-foreground break-all">Returns to: {details.redirect_uri}</p>}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
              <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
