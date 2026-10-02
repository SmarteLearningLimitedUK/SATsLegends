import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const parentA = '10000000-0000-4000-8000-000000000001';
const parentB = '10000000-0000-4000-8000-000000000002';
let checks = 0;
function pass(label) { console.log(`PASS ${label}`); checks++; }
async function asParent(id) {
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`);
}
async function asServer() { await db.exec('reset role'); }

try {
  const migrations = (await readdir('supabase/migrations')).filter(name => name.endsWith('.sql')).sort();
  const versions = migrations.map(name => name.match(/^(\d+)_/)?.[1]);
  assert.ok(versions.every(Boolean));
  assert.equal(new Set(versions).size, versions.length, 'Migration versions must be unique');
  pass('Migration versions are unique');

  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated,service_role;`);
  for (const migration of migrations) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
  }
  pass(`Applied all ${migrations.length} migrations in order`);

  const unavailable = await db.query("select code,available from public.products where code in ('english','bundle') order by code");
  assert.deepEqual(unavailable.rows, [{ code: 'bundle', available: false }, { code: 'english', available: false }]);
  pass('Unreleased Lexcoria and bundle products cannot be sold through the catalog');

  await db.exec(`insert into auth.users(id) values ('${parentA}'),('${parentB}')`);
  assert.equal((await db.query('select report_emails from public.parent_settings where parent_id=$1', [parentA])).rows[0].report_emails, false);
  pass('Social signup migration defaults report emails to opt-in');

  await db.exec("update public.products set monthly_price_id='price_original' where code='matharia'");
  await db.exec("update public.products set monthly_price_id='price_replacement' where code='matharia'");
  const prices = await db.query("select price_id,product_code,interval from public.stripe_price_catalog order by price_id");
  assert.deepEqual(prices.rows, [
    { price_id: 'price_original', product_code: 'matharia', interval: 'month' },
    { price_id: 'price_replacement', product_code: 'matharia', interval: 'month' },
  ]);
  await assert.rejects(() => db.exec("update public.products set yearly_price_id='price_original' where code='matharia'"), /already belongs/);
  pass('Stripe price rotation preserves historical mapping and rejects conflicting reuse');

  await asParent(parentA);
  const first = (await db.query('select public.request_account_deletion() as requested')).rows[0].requested;
  const repeated = (await db.query('select public.request_account_deletion() as requested')).rows[0].requested;
  assert.equal(String(first), String(repeated));
  assert.equal((await db.query('select * from public.account_deletion_requests')).rows.length, 1);
  await assert.rejects(() => db.exec('select * from public.report_job_status'), /permission denied/);
  await asParent(parentB);
  assert.equal((await db.query('select * from public.account_deletion_requests')).rows.length, 0);
  pass('Deletion requests are idempotent and private; report operations remain server-only');

  await asServer();
  await db.exec(`insert into public.admin_actions(actor_id,target_id,action,reason,outcome)
    values('${parentB}','${parentA}','reset','Parent support request','succeeded')`);
  await db.exec(`insert into public.stripe_customers(parent_id,customer_id) values('${parentA}','cus_test')`);
  await assert.rejects(() => db.exec(`delete from auth.users where id='${parentA}'`), /Verify and cancel Stripe/);
  assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 2);
  await db.exec(`delete from public.stripe_customers where parent_id='${parentA}'; delete from auth.users where id='${parentA}'`);
  assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 1);
  pass('Auth deletion is blocked while a Stripe customer mapping remains');
  const audit = (await db.query('select actor_id,target_id,action,outcome from public.admin_actions')).rows[0];
  assert.equal(audit.actor_id, parentB);
  assert.equal(audit.target_id, null);
  assert.equal(audit.action, 'reset');
  assert.equal(audit.outcome, 'succeeded');
  pass('Deleting a supported parent preserves the audit row with a cleared target ID');

  console.log(`${checks} production database checks passed`);
} finally {
  await db.close();
}
