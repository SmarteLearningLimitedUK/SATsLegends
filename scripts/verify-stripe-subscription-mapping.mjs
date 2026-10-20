import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the deployed mapper, without loading Deno-only HTTP SDK imports.
const compiled = await build({
  stdin: { contents: "export { subscriptionRecord } from './supabase/functions/_shared/billing.ts';", resolveDir: process.cwd() },
  bundle: true, format: 'esm', write: false, platform: 'neutral',
  plugins: [{ name: 'unused-deno-sdk', setup(builder) {
    builder.onResolve({ filter: /^npm:/ }, args => ({ path: args.path, external: true, sideEffects: false }));
  } }],
});
const { subscriptionRecord } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const periodEnd = 1800000000;
const prices = [{ price_id: 'price_test', product_code: 'matharia', interval: 'month' }];
function mapped(overrides = {}) {
  return subscriptionRecord({
    id: 'sub_test', status: 'active', pause_collection: null,
    cancel_at_period_end: false, cancel_at: null,
    items: { data: [{ current_period_end: periodEnd, price: { id: 'price_test', recurring: { interval: 'month' } } }] },
    ...overrides,
  }, 'parent_test', 100, prices);
}

assert.equal(mapped().cancel_at_period_end, false);
assert.equal(mapped({ cancel_at_period_end: true }).cancel_at_period_end, true);
const flexible = mapped({ cancel_at: periodEnd });
assert.equal(flexible.cancel_at_period_end, true);
assert.equal(flexible.current_period_end, new Date(periodEnd * 1000).toISOString());
const earlier = mapped({ cancel_at: periodEnd - 3600 });
assert.equal(earlier.cancel_at_period_end, true);
assert.equal(earlier.current_period_end, new Date((periodEnd - 3600) * 1000).toISOString());
const later = mapped({ cancel_at: periodEnd + 86400 });
assert.equal(later.cancel_at_period_end, false);
assert.equal(later.current_period_end, new Date(periodEnd * 1000).toISOString());
assert.equal(mapped({ cancel_at: null, canceled_at: periodEnd - 100 }).cancel_at_period_end, false);
assert.equal(mapped({ status: 'canceled', cancel_at: periodEnd }).status, 'canceled');
console.log('PASS renewing, classic cancellation, flexible cancellation, custom dates, resumed and canceled subscription mapping');
