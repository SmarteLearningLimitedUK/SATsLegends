import Stripe from 'npm:stripe@22.6.2';
import { secret, HttpError } from './platform.ts';
// The pinned SDK supplies its matching API version instead of the account default.
export const stripeClient = () => new Stripe(secret('STRIPE_SECRET_KEY'), { httpClient: Stripe.createFetchHttpClient(), timeout: 10000, maxNetworkRetries: 1 });
export { Stripe };
// Enable only after PayPal and recurring payments are active in Stripe.
export function checkoutPaymentMethods(paypalEnabled: string | undefined): ('card' | 'paypal')[] {
  return paypalEnabled === 'true' ? ['card', 'paypal'] : ['card'];
}
export function validatePrice(price: Stripe.Price, interval: 'month' | 'year') {
  const expected = interval === 'month' ? 499 : 4999;
  if (!price.active || price.type !== 'recurring' || price.recurring?.interval !== interval
    || price.recurring.interval_count !== 1 || price.currency !== 'gbp' || price.unit_amount !== expected
    || price.billing_scheme !== 'per_unit') throw new HttpError(503, 'This subscription option is not available yet.');
}
export function subscriptionRecord(subscription: Stripe.Subscription, parentId: string, eventCreated: number, prices: { monthly_price_id: string | null; yearly_price_id: string | null }) {
  const item = subscription.items.data.find(i => i.price.id === prices.monthly_price_id || i.price.id === prices.yearly_price_id);
  if (!item) return null;
  return {
    id: subscription.id, parent_id: parentId, product_code: 'matharia',
    status: subscription.pause_collection ? 'paused' : subscription.status,
    interval: item.price.recurring?.interval,
    current_period_end: new Date(item.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end, last_event_created: eventCreated,
  };
}
