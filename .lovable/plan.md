

# Simplify Upgrade to Use Stripe Payment Link

## Overview
Replace the Edge Function checkout flow with a simple redirect to your Stripe Payment Link URL. No backend call needed — just open the link directly.

## Steps

### 1. Update Settings UI
- Remove the `handleUpgrade` function that calls the `create-checkout` edge function
- Replace it with a simple `window.open(paymentLinkUrl)` or `window.location.href = paymentLinkUrl`
- You'll provide the Payment Link URL (e.g. `https://buy.stripe.com/xxx`)

### 2. Optional: Pass user identity via URL params
- Stripe Payment Links support `client_reference_id` and `prefilled_email` query params
- We can append `?client_reference_id={userId}&prefilled_email={email}` so the webhook can still map the payment back to the user

### 3. Keep webhook intact
- The `stripe-webhook` edge function stays — it still processes `checkout.session.completed` to update `subscription_tier`
- The `client_reference_id` from the Payment Link maps to the user

### What I need from you
- Your Stripe Payment Link URL

