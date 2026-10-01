import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const a = '10000000-0000-4000-8000-000000000001';
const b = '10000000-0000-4000-8000-000000000002';
const request = '20000000-0000-4000-8000-000000000001';
let checks = 0;
const ok = message => { checks++; console.log(`PASS ${message}`); };
async function rejects(sql, pattern) { await assert.rejects(() => db.exec(sql), pattern); }
async function parent(id) { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`); }
async function server() { await db.exec('reset role;'); }
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;`);
  await db.exec(await readFile('supabase/migrations/202609290001_family_accounts.sql', 'utf8'));
  await db.exec(`insert into auth.users(id) values('${a}'),('${b}');`);
  for (const [input, expected] of [
    ['2026-09-27T13:59:00Z', '2026-09-27T14:00:00Z'],
    ['2026-09-27T14:00:00Z', '2026-09-30T15:00:00Z'],
    ['2026-10-24T12:00:00Z', '2026-10-25T15:00:00Z'],
    ['2027-03-27T12:00:00Z', '2027-03-28T14:00:00Z'],
  ]) {
    const result = await db.query('select public.next_report_time($1::timestamptz) as next', [input]);
    assert.equal(new Date(result.rows[0].next).toISOString(), new Date(expected).toISOString());
  }
  ok('Sunday 3pm / Wednesday 4pm schedule, exact boundaries and both UK daylight-saving changes');
  await parent(a);
  const { rows: [child] } = await db.query("select * from public.create_child_profile('TestLegend')");
  await rejects("select public.create_child_profile('Second')", /one child/);
  ok('One child profile enforced by database');
  await rejects(`insert into public.subscriptions values('forged','${a}','matharia','active','month',now()+interval '1 year',false,0,now())`, /permission denied/);
  await rejects(`update public.child_profiles set parent_id='${b}' where id='${child.id}'`, /permission denied/);
  await rejects("update public.parent_settings set next_report_at=now()", /permission denied/);
  ok('Clients cannot forge subscriptions, transfer ownership or alter scheduling');
  const save = (revision, requestId = request) => `select public.save_child_progress('${child.id}','matharia',${revision},'${requestId}','{"level":2}','{}')`;
  await rejects(save(0), /Active Matharia/);
  await server();
  await db.exec(`insert into public.subscriptions(id,parent_id,product_code,status,interval,current_period_end) values('sub_test','${a}','matharia','active','month',now()+interval '1 month')`);
  await parent(a);
  assert.equal((await db.query(save(0))).rows[0].save_child_progress, 1);
  assert.equal((await db.query(save(0))).rows[0].save_child_progress, 1);
  await rejects(save(0,'20000000-0000-4000-8000-000000000002'), /PROGRESS_CONFLICT/);
  ok('Save retries are idempotent; stale device cannot overwrite newer progress');
  await parent(b);
  assert.equal((await db.query('select * from public.child_progress')).rows.length, 0);
  assert.equal((await db.query('select * from public.child_profiles')).rows.length, 0);
  assert.equal((await db.query('select * from public.subscriptions')).rows.length, 0);
  await rejects(save(1), /Profile not found/);
  await rejects('select * from public.report_deliveries', /permission denied/);
  await rejects("select public.claim_report_deliveries(40)", /permission denied/);
  ok('A different parent cannot read/write child data or invoke email delivery');
  await server();
  await db.exec("update public.subscriptions set status='past_due'");
  await parent(a); await rejects(save(1), /Active Matharia/);
  await server(); await db.exec("update public.subscriptions set status='active',current_period_end=now()-interval '1 minute'");
  await parent(a); await rejects(save(1), /Active Matharia/);
  ok('Failed/expired subscriptions lose server-side save access');
  await server();
  const event = { id: 'sub_test', parent_id: a, product_code: 'matharia', status: 'canceled', interval: 'month', current_period_end: new Date(Date.now() + 86400000).toISOString(), cancel_at_period_end: false, last_event_created: 200 };
  await db.query('select public.apply_subscription_event($1::jsonb)', [JSON.stringify(event)]);
  await db.query('select public.apply_subscription_event($1::jsonb)', [JSON.stringify({ ...event, status: 'active', last_event_created: 199 })]);
  assert.equal((await db.query("select status from public.subscriptions where id='sub_test'")).rows[0].status, 'canceled');
  ok('Older Stripe events cannot restore a canceled subscription');
  await db.exec(`insert into public.stripe_customers(parent_id,customer_id) values('${a}','cus_test')`);
  assert.equal((await db.query('select public.acquire_checkout_lock($1) as acquired', [a])).rows[0].acquired, true);
  assert.equal((await db.query('select public.acquire_checkout_lock($1) as acquired', [a])).rows[0].acquired, false);
  ok('Simultaneous checkout requests are serialized');
  await db.exec(`update public.parent_settings set next_report_at=now()-interval '1 hour';`);
  let deliveries = (await db.query('select * from public.claim_report_deliveries(40)')).rows;
  assert.equal(deliveries.length, 1);
  assert.equal((await db.query('select * from public.claim_report_deliveries(40)')).rows.length, 0);
  await db.exec(`update public.report_deliveries set lease_until=now()-interval '1 minute'`);
  assert.equal((await db.query('select * from public.claim_report_deliveries(40)')).rows[0].id, deliveries[0].id);
  await db.query('select public.finish_report_delivery($1,$2)', [deliveries[0].id, 'email_test']);
  assert.equal((await db.query('select * from public.claim_report_deliveries(40)')).rows.length, 0);
  ok('Email queue leases, retry identity and schedule advancement prevent duplicate work');
  await parent(a);
  await db.exec('update public.parent_settings set report_emails=false');
  await server(); await db.exec("update public.parent_settings set next_report_at=now()-interval '1 hour'");
  assert.equal((await db.query('select * from public.claim_report_deliveries(40)')).rows.length, 0);
  ok('Opted-out parents receive no queued reports');
  console.log(`${checks} database checks passed`);
} finally { await db.close(); }
