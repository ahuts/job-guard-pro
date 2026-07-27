/**
 * Lightweight analytics facade.
 *
 * No analytics vendor is installed in this project yet. Every call below is a
 * no-op in production and a console debug line in development.
 *
 * TO INTEGRATE A VENDOR: replace the body of `sink()` with a single call
 * (e.g. `posthog.capture(event, props)` / `gtag("event", event, props)`).
 * Nothing else in the app needs to change.
 *
 * PRIVACY: never pass job URLs, email addresses, or user IDs into `props`.
 */

export type AnalyticsEvent =
  // wired in the web app
  | "organic_landing_view"
  | "cta_click"
  | "scan_started"
  | "scan_completed"
  | "result_viewed"
  | "signup_modal_opened"
  | "signup_completed"
  | "extension_store_clicked"
  | "free_scan_limit_reached"
  | "checkout_started"
  // emitted outside the web app (Chrome extension / Stripe webhook)
  | "extension_installed"
  | "first_extension_scan"
  | "checkout_completed"
  | "subscription_activated";

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

function sink(event: AnalyticsEvent, props: AnalyticsProps) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props);
  }
  // No vendor configured — intentionally a no-op in production.
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}) {
  try {
    sink(event, {
      ...props,
      device:
        typeof window !== "undefined" && window.innerWidth < 640 ? "mobile" : "desktop",
    });
  } catch {
    // analytics must never break the app
  }
}

/** Score band helper so we never log raw scores tied to a specific listing. */
export function scoreBand(score: number): "low" | "medium" | "high" | "critical" {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}
