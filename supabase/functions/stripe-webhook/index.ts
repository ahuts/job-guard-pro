import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      console.warn("[stripe-webhook] No signature/secret — parsing body unverified (dev only).");
      event = JSON.parse(body);
    }

    console.log(`[stripe-webhook] Received event: ${event.type} (id: ${event.id})`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Helper: find userId by stripe_customer_id
    async function findUserByCustomer(customerId: string): Promise<string | null> {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      return data?.id ?? null;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // Prefer metadata, fall back to client_reference_id (Payment Link traffic)
      const userId =
        session.metadata?.supabase_user_id ||
        session.client_reference_id ||
        null;
      const customerId = (session.customer as string) || null;

      console.log(
        `[stripe-webhook] checkout.session.completed userId=${userId} customer=${customerId}`
      );

      if (!userId) {
        console.error("[stripe-webhook] No userId on checkout session — cannot upgrade.");
        return new Response(JSON.stringify({ received: true, warning: "no userId" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: "pro",
          subscription_status: "active",
          ...(customerId ? { stripe_customer_id: customerId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("[stripe-webhook] Failed to update profile:", error);
        return new Response(JSON.stringify({ error: "Database update failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[stripe-webhook] Upgraded user ${userId} to pro`);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = await findUserByCustomer(customerId);

      console.log(
        `[stripe-webhook] subscription.updated userId=${userId} status=${subscription.status}`
      );

      if (userId) {
        // Map Stripe statuses → our two-state tier model
        const isActive =
          subscription.status === "active" || subscription.status === "trialing";
        await supabase
          .from("profiles")
          .update({
            subscription_tier: isActive ? "pro" : "free",
            subscription_status: subscription.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log(
          `[stripe-webhook] Synced user ${userId} → tier=${isActive ? "pro" : "free"}`
        );
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = await findUserByCustomer(customerId);

      console.log(`[stripe-webhook] subscription.deleted userId=${userId}`);

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        console.log(`[stripe-webhook] Downgraded user ${userId} to free`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[stripe-webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
