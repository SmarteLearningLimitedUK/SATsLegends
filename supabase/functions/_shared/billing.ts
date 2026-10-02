import Stripe from 'npm:stripe@22.6.2';
import { secret, HttpError } from './platform.ts';
// The pinned SDK supplies its matching API version instead of the account default.
export const stripeClient = () => new Stripe(secret('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient(), timeout: 10000, maxNetworkRetries: 1 });
export { Stripe };
// Enable only after PayPal and recurring payments are active in Stripe.
export function checkoutPaymentMethods(paypalEnabled: string | undefined): ('card' | 'paypal')[] {
  return paypalEnabled === 'true' ? ['card', 'paypal'] : ['card'];
}
export const productCodes = ['matharia', 'english', 'bundle'] as const;
export type ProductCode = typeof productCodes[number];
export const purchasableProductCodes = (englishReleased: string | undefined): readonly ProductCode[] =>
  englishReleased === 'true' ? productCodes : ['matharia'];
export function requireCheckoutAccountActive(suspended: boolean): void {
  if (suspended) throw new HttpError(403, 'This account is suspended. Please contact support before starting a subscription.');
}
export const expectedAmounts: Record<ProductCode, { month: number; year: number }> = {
  matharia: { month: 499, year: 4999 },
  english: { month: 499, year: 4999 },
  bundle: { month: 849, year: 10999 },
};
export function validatePrice(price: Stripe.Price, product: ProductCode, interval: 'month' | 'year') {
  const expected = expectedAmounts[product][interval];
  if (!price.active || price.type !== 'recurring' || price.recurring?.interval !== interval
    || price.recurring.interval_count !== 1 || price.currency !== 'gbp' || price.unit_amount !== expected
    || price.billing_scheme !== 'per_unit') throw new HttpError(503, 'This subscription option is not available yet.');
}
export function subscriptionRecord(subscription: Stripe.Subscription, parentId: string, eventCreated: number,
  prices: Array<{ price_id: string; product_code: ProductCode; interval: 'month' | 'year' }>,
  existing?: { parent_id: string; product_code: ProductCode } | null) {
  if (subscription.items.data.length !== 1) return null;
  const item = subscription.items.data[0];
  const interval = item.price.recurring?.interval;
  if (interval !== 'month' && interval !== 'year') return null;
  const match = prices.find(candidate => candidate.price_id === item.price.id);
  if (match && match.interval !== interval) return null;
  // Existing subscriptions can predate the catalog migration. Their trusted
  // mirror record keeps later cancellation and renewal events processable.
  const productCode = match?.product_code ?? (existing?.parent_id === parentId
    && productCodes.includes(existing.product_code) ? existing.product_code : null);
  if (!productCode) return null;
  return {
    id: subscription.id, parent_id: parentId, product_code: productCode,
    status: subscription.pause_collection ? 'paused' : subscription.status,
    interval,
    current_period_end: new Date(item.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end, last_event_created: eventCreated,
  };
}
