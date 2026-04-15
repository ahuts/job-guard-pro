const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/9B628t8MU8Z22Pq0h34F207";

export function getUpgradeUrl(userId?: string, email?: string): string {
  const url = new URL(STRIPE_PAYMENT_LINK);
  if (userId) url.searchParams.set("client_reference_id", userId);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}
