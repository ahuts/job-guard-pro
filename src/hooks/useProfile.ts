import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_tier: string;
  subscription_status: string;
  stripe_customer_id: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, subscription_tier, subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: flip UI the moment the webhook updates the profile
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    profile,
    loading,
    subscriptionTier: profile?.subscription_tier ?? "free",
    isPro: profile?.subscription_tier === "pro",
    refetch,
  };
}
