import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/stripe";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { User, Settings as SettingsIcon, LogOut, Save, Loader2, CreditCard, Crown, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

const TIME_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscriptionTier, refetch: refetchProfile } = useProfile();

  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  // Preferences (stored in localStorage for MVP)
  const [defaultTimeRange, setDefaultTimeRange] = useState(
    () => localStorage.getItem("ghostjob_default_range") || "30"
  );
  const [ghostThreshold, setGhostThreshold] = useState(
    () => Number(localStorage.getItem("ghostjob_ghost_threshold") || "75")
  );

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [user]);

  // Handle upgrade success/cancel query params
  useEffect(() => {
    const upgrade = searchParams.get("upgrade");
    if (upgrade === "success") {
      toast({ title: "🎉 Welcome to Pro!", description: "Your account has been upgraded." });
      // Refetch profile in case the webhook landed before the redirect
      refetchProfile();
      searchParams.delete("upgrade");
      setSearchParams(searchParams, { replace: true });
    } else if (upgrade === "cancelled") {
      toast({ title: "Upgrade cancelled", description: "No changes were made." });
      searchParams.delete("upgrade");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Profile updated successfully." });
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;
    try {
      setUpgrading(true);
      await redirectToCheckout();
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({
        title: "Could not start checkout",
        description: err.message ?? "Please try again.",
        variant: "destructive",
      });
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setUpgrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast({ title: "Error", description: err.message || "Failed to open billing portal.", variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  const savePreferences = () => {
    localStorage.setItem("ghostjob_default_range", defaultTimeRange);
    localStorage.setItem("ghostjob_ghost_threshold", String(ghostThreshold));
    toast({ title: "Saved", description: "Preferences updated." });
  };

  const tierColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/10 text-primary",
    premium: "bg-amber-500/10 text-amber-600",
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your profile and dashboard preferences.
          </p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Display Name</Label>
              <Input
                id="fullName"
                placeholder="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button onClick={saveProfile} disabled={saving || loading} size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SettingsIcon className="h-5 w-5" />
              Dashboard Preferences
            </CardTitle>
            <CardDescription>Customize how your dashboard behaves.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Analytics Time Range</Label>
              <Select value={defaultTimeRange} onValueChange={setDefaultTimeRange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>High-Risk Ghost Score Threshold: {ghostThreshold}</Label>
              <Slider
                value={[ghostThreshold]}
                onValueChange={([v]) => setGhostThreshold(v)}
                min={50}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Jobs with a ghost score at or above this value will be flagged as high risk.
              </p>
            </div>

            <Button onClick={savePreferences} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Subscription</p>
                <p className="text-xs text-muted-foreground">Your current plan.</p>
              </div>
              <Badge className={tierColors[subscriptionTier] || tierColors.free}>
                {subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)}
              </Badge>
            </div>

            {subscriptionTier === "free" ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <p className="font-medium text-foreground">Upgrade to Pro</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Unlimited job scans
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Priority support
                  </li>
                </ul>
                <Button onClick={handleUpgrade} disabled={upgrading} size="sm" variant="hero">
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {upgrading ? "Redirecting..." : "Upgrade Now"}
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">You're on the Pro plan</p>
                    <p className="text-xs text-muted-foreground">Enjoy unlimited scans and advanced features.</p>
                  </div>
                </div>
                <Button onClick={handleManageSubscription} disabled={upgrading} size="sm" variant="outline">
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {upgrading ? "Redirecting..." : "Manage Subscription"}
                </Button>
              </div>
            )}

            <Separator />
            <Button variant="destructive" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
