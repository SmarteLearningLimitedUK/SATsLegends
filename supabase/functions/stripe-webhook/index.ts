import { admin, checked, fail, json, secret } from '../_shared/platform.ts';
import { Stripe, stripeClient, subscriptionRecord } from '../_shared/billing.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const stripe = stripeClient();
    const signature = request.headers.get('stripe-signature');
    if (!signature) return json({ error: 'Missing signature' }, 400);
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(await request.text(), signature,
        secret('STRIPE_WEBHOOK_SECRET'), undefined, Stripe.createSubtleCryptoProvider());
    } catch { return json({ error: 'Invalid signature' }, 400); }
    let subscriptionId: string | null = null;
    if (event.type.startsWith('customer.subscription.')) subscriptionId = (event.data.object as Stripe.Subscription).id;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
    }
    if (!subscriptionId) return json({ received: true });
    // Retrieve current state instead of trusting a delayed event snapshot.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const db = admin();
    const customer = checked(await db.from('stripe_customers').select('parent_id').eq('customer_id', customerId).maybeSingle());
    if (!customer) return json({ received: true });
    const product = checked(await db.from('products').select('monthly_price_id, yearly_price_id').eq('code', 'matharia').single());
    if (!product) throw new Error('Matharia configuration missing');
    const record = subscriptionRecord(subscription, customer.parent_id, event.created, product);
    if (record) checked(await db.rpc('apply_subscription_event', { subscription_data: record }));
    return json({ received: true });
  } catch (error) { return fail(error); }
});
