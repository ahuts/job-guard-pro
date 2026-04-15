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
      // For development/testing without webhook secret
      event = JSON.parse(body);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId = session.customer as string;

      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "pro",
            subscription_status: "active",
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error("Failed to update profile:", error);
          return new Response(JSON.stringify({ error: "Database update failed" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Upgraded user ${userId} to pro`);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        console.log(`Downgraded user ${profile.id} to free`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
