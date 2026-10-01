import { admin, appUrl, billingBody, checked, fail, HttpError, json, parentFor } from '../_shared/platform.ts';
import { checkoutPaymentMethods, stripeClient, validatePrice } from '../_shared/billing.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return json({}, 200, true);
  let locked = false;
  let parentId = '';
  const db = admin();
  try {
    if (request.headers.get('origin') && request.headers.get('origin') !== appUrl()) throw new HttpError(403, 'Origin not allowed');
    const stripe = stripeClient();
    const paymentMethods = checkoutPaymentMethods(Deno.env.get('STRIPE_PAYPAL_ENABLED'));
    const product = checked(await db.from('products').select('*').eq('code', 'matharia').single());
    if (request.method === 'GET') {
      const plans = await Promise.all((['month', 'year'] as const).map(async interval => {
        const id = interval === 'month' ? product.monthly_price_id : product.yearly_price_id;
        if (!id || !product.available) return { interval, available: false };
        const price = await stripe.prices.retrieve(id);
        validatePrice(price, interval);
        return { interval, available: true, amount: price.unit_amount, currency: price.currency };
      }));
      return json({ plans, paymentMethods }, 200, true);
    }
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const parent = await parentFor(request, db);
    parentId = parent.id;
    const body = await billingBody(request);
    const existing = checked(await db.from('stripe_customers').select('customer_id').eq('parent_id', parent.id).maybeSingle());
    let customerId = existing?.customer_id;
    if (!customerId) {
      if (body.action === 'portal') throw new HttpError(400, 'No subscription to manage yet.');
      const customer = await stripe.customers.create({ email: parent.email, metadata: { parent_id: parent.id } }, { idempotencyKey: `parent:${parent.id}` });
      checked(await db.from('stripe_customers').upsert({ parent_id: parent.id, customer_id: customer.id }, { onConflict: 'parent_id', ignoreDuplicates: true }));
      customerId = customer.id;
    }
    if (body.action === 'portal') {
      const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}/parent` });
      return json({ url: portal.url }, 200, true);
    }
    if (body.interval !== 'month' && body.interval !== 'year') throw new HttpError(400, 'Choose monthly or yearly.');
    const priceId = body.interval === 'month' ? product.monthly_price_id : product.yearly_price_id;
    if (!product.available || !priceId) throw new HttpError(503, 'Subscriptions are not available yet.');
    validatePrice(await stripe.prices.retrieve(priceId), body.interval);
    locked = checked(await db.rpc('acquire_checkout_lock', { target_parent: parent.id }));
    if (!locked) throw new HttpError(409, 'Checkout is already opening. Please try again in a moment.');
    // Check Stripe itself as well as our mirror, so webhook delay cannot cause a second subscription.
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    if (subscriptions.data.some(s => !['canceled', 'incomplete_expired'].includes(s.status)
      && s.items.data.some(i => [product.monthly_price_id, product.yearly_price_id].includes(i.price.id)))) {
      throw new HttpError(409, 'You already have a Matharia subscription. Use Manage subscription.');
    }
    const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 100 });
    for (const session of sessions.data.filter(s => s.status === 'open' && s.metadata?.product_code === 'matharia')) {
      if (session.metadata?.interval === body.interval && session.url && paymentMethods.length === session.payment_method_types.length
        && paymentMethods.every(method => session.payment_method_types.includes(method))) return json({ url: session.url }, 200, true);
      await stripe.checkout.sessions.expire(session.id);
    }
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId, mode: 'subscription', client_reference_id: parent.id,
      payment_method_types: paymentMethods,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { parent_id: parent.id, product_code: 'matharia', interval: body.interval },
      subscription_data: { metadata: { parent_id: parent.id, product_code: 'matharia' } },
      success_url: `${appUrl()}/parent?checkout=success`, cancel_url: `${appUrl()}/subscriptions?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1800000) * 1800 + 3600,
    }, { idempotencyKey: `checkout:${parent.id}:${body.interval}:${paymentMethods.join('-')}:${sessions.data[0]?.id ?? 'first'}:${Math.floor(Date.now() / 1800000)}` });
    if (!checkout.url) throw new Error('Missing checkout URL');
    return json({ url: checkout.url }, 200, true);
  } catch (error) { return fail(error, true); }
  finally {
    if (locked) {
      const result = await db.from('stripe_customers').update({ checkout_lock_until: null }).eq('parent_id', parentId);
      if (result.error) console.error('Failed to release checkout lock');
    }
  }
});
