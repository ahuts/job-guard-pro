

## How upgrades are detected today

**Current flow:**
1. User clicks "Upgrade to Pro" → redirected to a hardcoded Stripe Payment Link (`src/lib/stripe.ts`) with `client_reference_id=<userId>`.
2. User pays on Stripe.
3. Stripe is *supposed* to fire `checkout.session.completed` to `supabase/functions/stripe-webhook/index.ts`.
4. The webhook flips `profiles.subscription_tier` from `'free'` to `'pro'`.
5. App reads `profiles.subscription_tier` to gate Pro features.

## The gaps — why upgrades may not actually register

1. **The webhook may not be registered in Stripe.** The function exists at `https://auevehneizminspolipf.supabase.co/functions/v1/stripe-webhook`, but Stripe needs to be told to send events there. If it's not configured in the Stripe Dashboard, no upgrade ever lands in your DB.

2. **The Payment Link sends `client_reference_id`, but the webhook reads `metadata.supabase_user_id`.** Those are populated by the `create-checkout` edge function (which the UI isn't calling). So even if the webhook fires, `userId` is undefined and no profile gets updated.

3. **No frontend confirmation.** After payment, nothing refetches the profile — user has to refresh to see Pro status.

4. **No `subscriptions` table.** All state lives on `profiles` (tier, status, customer_id). Works for MVP but no history of renewals/cancellations.

## Plan to fix

**Step 1 — Use the existing `create-checkout` edge function**
Update `PricingSection.tsx` and `FreePlanBanner.tsx` to call `supabase.functions.invoke('create-checkout')` instead of `getUpgradeUrl()`. Guarantees `metadata.supabase_user_id` is set so the webhook can match the user.

**Step 2 — Harden the webhook** (`supabase/functions/stripe-webhook/index.ts`)
- Read `client_reference_id` as a fallback for any legacy Payment Link traffic.
- Also handle `customer.subscription.updated` (renewals, plan changes).
- Add structured logging so we can verify events arrive.

**Step 3 — Register the webhook in Stripe** (manual one-time setup by you)
- URL: `https://auevehneizminspolipf.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (already exists, may need refresh).

**Step 4 — Frontend "Pro" awareness**
- New `useProfile()` hook → exposes `subscriptionTier` from `profiles`.
- On `/dashboard/settings?upgrade=success` → refetch profile + show toast.
- Subscribe to realtime `postgres_changes` on `profiles` so the UI flips the moment the webhook lands.

**Step 5 (optional) — Dedicated `subscriptions` table**
Keyed by `stripe_subscription_id` with status, current period end, cancel_at_period_end. Useful for renewal history and analytics. Skip if not needed yet.

## Files touched
- `src/lib/stripe.ts` — replace `getUpgradeUrl` with `redirectToCheckout()`
- `src/components/PricingSection.tsx`, `src/components/dashboard/FreePlanBanner.tsx` — use new helper
- `supabase/functions/stripe-webhook/index.ts` — fallback + subscription.updated + logging
- `src/hooks/useProfile.ts` (new)
- `src/pages/Settings.tsx` — success toast + refetch

## Quick decision needed

Pick a scope — tell me which and I'll build it:

- **Full fix (recommended)** — Steps 1-4. End-to-end upgrade detection that actually works.
- **Webhook + frontend only** — Keep the Payment Link, fix the webhook to read `client_reference_id`, add `useProfile` hook. Smallest change.
- **Verify only** — Add logging + give you a Stripe Dashboard checklist. No code restructuring.
- **Full fix + subscriptions table** — Step 5 added on top for renewal history.

