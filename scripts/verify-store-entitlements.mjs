import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const request = '20000000-0000-4000-8000-000000000001';
let checks = 0;
const pass = label => { checks++; console.log(`PASS ${label}`); };
const role = async (name = '') => db.exec(`reset role; ${name ? `set role ${name};` : ''}`);
const parent = async id => { await role('authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
const access = async code => (await db.query('select public.has_game_access($1) as access', [code])).rows[0].access;
const snapshot = (provider, overrides = {}) => ({ provider, environment: 'sandbox', purchase_hash: (provider === 'apple' ? 'a' : 'b').repeat(64), parent_id: a,
  product_code: 'matharia', status: 'active', interval: 'month', current_period_end: new Date(Date.now() + 86400000).toISOString(),
  cancel_at_period_end: false, verified_at: '2026-10-20T12:00:00Z', ...overrides });
async function apply(data) {
  await role('service_role');
  return (await db.query('select public.apply_verified_store_entitlement($1::jsonb) as applied', [JSON.stringify(data)])).rows[0].applied;
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated,service_role;`);
  for (const name of (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
  }
  await db.exec(`insert into auth.users(id) values('${a}'),('${b}')`);
  await apply(snapshot('apple'));
  await parent(a);
  assert.equal(await access('matharia'), false);
  assert.deepEqual((await db.query('select * from public.account_subscriptions()')).rows, []);
  pass('Store billing defaults disabled, including previously recorded states');

  await role();
  await db.exec("update public.store_billing_settings set enabled=true,environment='production' where provider='apple'");
  await parent(a);
  assert.equal(await access('matharia'), false);
  pass('Sandbox receipts cannot unlock a production-configured provider');

  await role();
  await db.exec("update public.store_billing_settings set environment='sandbox' where provider='apple'");
  await parent(a);
  assert.equal(await access('matharia'), true);
  assert.equal(await access('english'), false);
  const summary = (await db.query('select * from public.account_subscriptions()')).rows[0];
  assert.equal(summary.provider, 'apple');
  assert.equal('purchase_hash' in summary, false);
  const child = (await db.query("select * from public.create_child_profile('SharedLegend')")).rows[0];
  await assert.rejects(() => db.query("select public.create_child_profile('Second')"), /one child/);
  assert.equal((await db.query('select public.save_child_progress($1,$2,0,$3,$4::jsonb,$5::jsonb) as revision',
    [child.id, 'matharia', request, '{"level":2}', '{}'])).rows[0].revision, 1);
  pass('Verified Apple access unlocks only the purchased game, one child and cloud saves');

  await parent(b);
  assert.equal(await access('matharia'), false);
  assert.deepEqual((await db.query('select * from public.account_subscriptions()')).rows, []);
  assert.deepEqual((await db.query('select * from public.child_progress')).rows, []);
  await assert.rejects(() => db.query('select public.apply_verified_store_entitlement($1::jsonb)', [JSON.stringify(snapshot('google'))]), /permission denied/);
  await assert.rejects(() => db.exec('select * from public.store_entitlements'), /permission denied/);
  await assert.rejects(() => db.exec('delete from public.store_entitlements'), /permission denied/);
  await assert.rejects(() => db.exec("update public.store_entitlements set status='active'"), /permission denied/);
  await assert.rejects(() => db.exec('insert into public.store_entitlements default values'), /permission denied/);
  await assert.rejects(() => db.exec('update public.store_billing_settings set enabled=true'), /permission denied/);
  await assert.rejects(() => db.exec("select public.store_access_conflicts(null,'bundle')"), /permission denied/);
  pass('Another parent cannot read reports, access purchase data or forge entitlements/configuration');
  await role('anon');
  await assert.rejects(() => db.exec('select * from public.account_subscriptions()'), /permission denied/);
  await assert.rejects(() => db.query('select public.apply_verified_store_entitlement($1::jsonb)', ['{}']), /permission denied/);
  pass('Signed-out clients cannot read account subscriptions or submit grants');

  await assert.rejects(() => apply(snapshot('apple', { parent_id: b })), /another parent/);
  assert.equal(await apply(snapshot('apple')), false);
  assert.equal(await apply(snapshot('apple', { status: 'revoked', verified_at: '2026-10-20T11:00:00Z' })), false);
  pass('Restore cannot transfer purchase ownership; duplicate and stale verification ignored');

  await apply(snapshot('apple', { cancel_at_period_end: true, verified_at: '2026-10-20T13:00:00Z' }));
  await parent(a);
  assert.equal(await access('matharia'), true);
  assert.equal((await db.query('select cancel_at_period_end from public.account_subscriptions()')).rows[0].cancel_at_period_end, true);
  pass('Cancellation preserves access until the verified paid expiry');

  await apply(snapshot('apple', { status: 'revoked', verified_at: '2026-10-20T14:00:00Z' }));
  await parent(a);
  assert.equal(await access('matharia'), false);
  await assert.rejects(() => db.query('select public.save_child_progress($1,$2,1,$3,$4::jsonb,$5::jsonb)',
    [child.id, 'matharia', request, '{}', '{}']), /Active game/);
  assert.equal((await db.query('select revision from public.child_progress where child_id=$1', [child.id])).rows[0].revision, 1);
  pass('Revocation removes playing/saving access while preserving private saved reports');

  await role();
  await db.exec("update public.store_billing_settings set enabled=true where provider='google'");
  await apply(snapshot('google', { product_code: 'bundle', status: 'grace' }));
  await parent(a);
  assert.equal(await access('matharia'), true);
  assert.equal(await access('english'), true);
  assert.equal((await db.query('select id from public.child_profiles')).rows[0].id, child.id);
  assert.equal((await db.query('select revision from public.child_progress')).rows[0].revision, 1);
  await role('service_role');
  for (const code of ['matharia', 'english', 'bundle']) {
    assert.equal((await db.query('select public.store_access_conflicts($1,$2) as blocked', [a, code])).rows[0].blocked, true);
  }
  pass('Google verified grace/bundle uses the same child and reports; overlapping web checkout blocked');

  await role();
  await db.query('insert into public.account_suspensions(parent_id,reason,suspended_by) values($1,$2,$3)', [a, 'Fixture suspension', b]);
  await parent(a);
  assert.equal(await access('matharia'), false);
  assert.deepEqual((await db.query('select * from public.account_subscriptions()')).rows, []);
  await role();
  await db.exec('update public.account_suspensions set cleared_at=now()');
  pass('Suspension overrides store access and hides account subscription summaries');

  for (const [index, status] of ['pending', 'on_hold', 'paused', 'expired', 'revoked'].entries()) {
    await apply(snapshot('google', { product_code: 'bundle', status, verified_at: `2026-10-20T15:0${index}:00Z` }));
    await parent(a);
    assert.equal(await access('matharia'), false);
    assert.equal(await access('english'), false);
  }
  await apply(snapshot('google', { current_period_end: new Date(Date.now() - 1000).toISOString(), verified_at: '2026-10-20T16:00:00Z' }));
  await parent(a);
  assert.equal(await access('matharia'), false);
  pass('Pending, held, paused, expired, revoked and elapsed purchases cannot grant access');

  await role();
  await db.exec(`insert into public.subscriptions(id,parent_id,product_code,status,interval,current_period_end)
    values('sub_web','${a}','matharia','active','year',now()+interval '1 year')`);
  await parent(a);
  assert.equal(await access('matharia'), true);
  assert.equal(await access('english'), false);
  await role();
  await db.exec(`insert into public.complimentary_access(parent_id,product_code,valid_until,granted_by,reason)
    values('${b}','english',now()+interval '1 day','${a}','Fixture access')`);
  await parent(b);
  assert.equal(await access('english'), true);
  pass('Existing Stripe and complimentary access continue independently of store state');
  await role();
  await assert.rejects(() => db.query('delete from auth.users where id=$1', [a]), /foreign key constraint/);
  pass('Account deletion cannot orphan purchase ownership and enable reassignment');
  console.log(`${checks} shared store entitlement checks passed`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await db.close(); }
