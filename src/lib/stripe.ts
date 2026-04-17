import { supabase } from "@/integrations/supabase/client";

/**
 * Redirects the user to a Stripe Checkout Session created by the
 * `create-checkout` edge function. This guarantees the session has
 * `metadata.supabase_user_id` set so the webhook can match the upgrade
 * back to the right user.
 */
export async function redirectToCheckout(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("You must be signed in to upgrade.");
  }

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("No checkout URL returned.");

  window.location.href = data.url;
}
