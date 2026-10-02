import assert from 'node:assert/strict';
import { checkoutPaymentMethods, purchasableProductCodes, requireCheckoutAccountActive, Stripe, subscriptionRecord, validatePrice } from './billing.ts';
import { billingBody, HttpError } from './platform.ts';
import { reportEmail } from './report-email.ts';

Deno.test('PayPal is offered alongside card only after explicit server activation', () => {
  assert.deepEqual(checkoutPaymentMethods('true'), ['card', 'paypal']);
  for (const value of [undefined, 'false', '', '1']) assert.deepEqual(checkoutPaymentMethods(value), ['card']);
});
Deno.test('English and bundle checkout require an explicit server release', () => {
  assert.deepEqual(purchasableProductCodes(undefined), ['matharia']);
  assert.deepEqual(purchasableProductCodes('false'), ['matharia']);
  assert.deepEqual(purchasableProductCodes('true'), ['matharia', 'english', 'bundle']);
});
Deno.test('Suspended account flag blocks checkout', () => {
  assert.doesNotThrow(() => requireCheckoutAccountActive(false));
  assert.throws(() => requireCheckoutAccountActive(true), error => error instanceof HttpError && error.status === 403);
});
Deno.test('Billing rejects malformed, oversized and client-controlled payment identifiers', async () => {
  const request = (body: string, contentType = 'application/json') => new Request('https://example.com', { method: 'POST', headers: { 'content-type': contentType }, body });
  assert.deepEqual(await billingBody(request('{"action":"checkout","product":"matharia","interval":"year"}')), { action: 'checkout', product: 'matharia', interval: 'year' });
  assert.deepEqual(await billingBody(request('{"action":"portal"}')), { action: 'portal' });
  for (const body of ['null', '[]', '{', '{"action":"checkout","interval":"week"}', '{"action":"checkout","interval":"month","priceId":"cheap"}', '{"action":"portal","parentId":"other"}']) {
    await assert.rejects(() => billingBody(request(body)), error => error instanceof HttpError && error.status === 400);
  }
  await assert.rejects(() => billingBody(request(' '.repeat(2049))), error => error instanceof HttpError && error.status === 413);
  await assert.rejects(() => billingBody(request('{}', 'text/plain')), error => error instanceof HttpError && error.status === 415);
});

Deno.test('Only the exact GBP monthly/yearly prices can be purchased', () => {
  const price = { active: true, type: 'recurring', currency: 'gbp', unit_amount: 499, billing_scheme: 'per_unit', recurring: { interval: 'month', interval_count: 1 } } as Stripe.Price;
  validatePrice(price, 'matharia', 'month');
  for (const bad of [{ ...price, unit_amount: 100 }, { ...price, currency: 'usd' }, { ...price, active: false }, { ...price, recurring: { ...price.recurring, interval_count: 2 } }]) assert.throws(() => validatePrice(bad as Stripe.Price, 'matharia', 'month'));
  validatePrice({ ...price, unit_amount: 4999, recurring: { ...price.recurring, interval: 'year' } } as Stripe.Price, 'matharia', 'year');
});
Deno.test('Subscription mirror uses the trusted parent/customer mapping and item renewal date', () => {
  const subscription = { id: 'sub_test', status: 'active', cancel_at_period_end: true, pause_collection: null,
    metadata: { parent_id: 'untrusted' }, items: { data: [{ price: { id: 'price_month', recurring: { interval: 'month' } }, current_period_end: 1800000000 }] },
  } as unknown as Stripe.Subscription;
  const catalog = [{ price_id: 'price_month', product_code: 'matharia' as const, interval: 'month' as const }];
  const record = subscriptionRecord(subscription, 'trusted', 100, catalog);
  assert.equal(record?.parent_id, 'trusted'); assert.equal(record?.status, 'active');
  assert.equal(record?.current_period_end, new Date(1800000000000).toISOString());
  assert.equal(record?.cancel_at_period_end, true);
  assert.equal(subscriptionRecord({ ...subscription, pause_collection: { behavior: 'void', resumes_at: null } }, 'trusted', 101, catalog)?.status, 'paused');
  assert.equal(subscriptionRecord(subscription, 'trusted', 101, [], { parent_id: 'trusted', product_code: 'matharia' })?.product_code, 'matharia');
  assert.equal(subscriptionRecord(subscription, 'trusted', 101, [], { parent_id: 'other', product_code: 'matharia' }), null);
  assert.equal(subscriptionRecord(subscription, 'trusted', 101, []), null);
  assert.equal(subscriptionRecord(subscription, 'trusted', 101, [{ price_id: 'price_month', product_code: 'english', interval: 'year' }]), null);
});
Deno.test('Forged or tampered Stripe events fail signature verification', async () => {
  const stripe = new Stripe('sk_test_fixture');
  const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated', data: { object: {} } });
  const secret = 'whsec_fixture';
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
  const crypto = Stripe.createSubtleCryptoProvider();
  assert.equal((await stripe.webhooks.constructEventAsync(payload, signature, secret, undefined, crypto)).id, 'evt_test');
  await assert.rejects(() => stripe.webhooks.constructEventAsync(payload.replace('updated', 'deleted'), signature, secret, undefined, crypto));
  await assert.rejects(() => stripe.webhooks.constructEventAsync(payload, signature, 'wrong_secret', undefined, crypto));
});
Deno.test('Report HTML escapes nicknames and provides private report links without login tokens', () => {
  const email = reportEmail('https://satslegends.com', [{ id: 'child_id', nickname: '<img src=x onerror=alert(1)>', progress: [
    { product_code: 'matharia', player: { level: 3, telemetry: { correctAnswers: 8, incorrectAnswers: 2, sessionsPlayed: 4 } }, updated_at: '2026-09-29' },
    { product_code: 'english', player: { level: 2, telemetry: { correctAnswers: 4, incorrectAnswers: 1, sessionsPlayed: 2 } }, updated_at: '2026-09-30' },
  ] }]);
  assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('&lt;img'));
  assert.ok(email.html.includes('80% answer accuracy'));
  assert.ok(email.text.includes('https://satslegends.com/parent/progress/child_id'));
  assert.ok(email.text.includes('https://satslegends.com/parent/progress/child_id?game=english'));
  assert.ok(email.text.includes('Sunday at 3 pm and Wednesday at 4 pm, UK time'));
  assert.ok(!email.text.includes('access_token'));
});
Deno.test('First report before play still links to the private Matharia progress page', () => {
  const email = reportEmail('https://satslegends.com', [{ id: 'new_child', nickname: 'Aster', progress: [] }]);
  assert.ok(email.text.includes('No progress saved yet'));
  assert.ok(email.text.includes('https://satslegends.com/parent/progress/new_child'));
  assert.ok(email.html.includes('View Matharia progress'));
  assert.ok(!email.text.includes('Level 1'));
  assert.ok(!email.text.includes('Lexcoria'));
});
