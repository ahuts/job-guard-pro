

# Stripe Upgrade Button in Settings

## Overview
Add an "Upgrade to Pro" button in the Settings Account section that creates a Stripe Checkout session and redirects the user to pay. After successful payment, a webhook updates their `subscription_tier` in the database.

## What You'll Need
- Your **Stripe Secret Key** (starts with `sk_test_` or `sk_live_`) — stored securely as an Edge Function secret
- A **Stripe Price ID** for the Pro plan — you'll create this in your Stripe Dashboard (Products → Add Product → copy the Price ID like `price_xxx`)

## Architecture

```text
Settings Page → Edge Function (create-checkout) → Stripe Checkout → Stripe Webhook → Edge Function (stripe-webhook) → Update profiles table
```

## Steps

### 1. Store your Stripe Secret Key
Use the `add_secret` tool to securely store `STRIPE_SECRET_KEY` as a backend secret.

### 2. Create `create-checkout` Edge Function
- Accepts the user's auth token and desired plan
- Creates a Stripe Checkout Session with the correct Price ID
- Returns the Checkout URL for redirect
- Validates JWT and uses the user's profile email as the Stripe customer email

### 3. Create `stripe-webhook` Edge Function
- Receives `checkout.session.completed` events from Stripe
- Updates `profiles.subscription_tier` to `"pro"` and stores `stripe_customer_id`
- Verifies the webhook signature using `STRIPE_WEBHOOK_SECRET`

### 4. Update Settings UI
- In the Account card, add an "Upgrade to Pro" button (shown only when tier is `free`)
- Clicking it calls the `create-checkout` function and redirects to Stripe
- Show a "Manage Subscription" state when already on Pro

### 5. Store Webhook Secret
After deploying, you'll copy the Edge Function URL into Stripe's webhook settings. Stripe gives you a webhook signing secret (`whsec_xxx`) which we'll store as `STRIPE_WEBHOOK_SECRET`.

## Post-Build Setup (on your end)
1. Create a Pro product + price in Stripe Dashboard
2. Share the Price ID so it can be configured
3. Add the webhook endpoint URL in Stripe Dashboard → Webhooks
4. Copy the webhook signing secret back into Lovable

