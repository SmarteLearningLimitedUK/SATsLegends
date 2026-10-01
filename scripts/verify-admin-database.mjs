import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
const owner = '10000000-0000-4000-8000-000000000001';
const parent = '10000000-0000-4000-8000-000000000002';
async function as(id) { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`); }
async function server() { await db.exec('reset role'); }
async function denied(sql, pattern) { await assert.rejects(() => db.exec(sql), pattern); }

try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;`);
  await db.exec(await readFile('supabase/migrations/202609290001_family_accounts.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202610010001_admin_support.sql', 'utf8'));
  await db.exec(`insert into auth.users(id) values('${owner}'),('${parent}');
    insert into public.staff_accounts(user_id) values('${owner}');`);
  await as(owner);
  assert.equal((await db.query('select public.is_staff() as allowed')).rows[0].allowed, true);
  assert.equal((await db.query("select public.has_game_access('matharia') as allowed")).rows[0].allowed, false);
  await denied(`insert into public.complimentary_access(parent_id,product_code,valid_until,reason) values('${owner}','matharia',now()+interval '1 year','self grant')`, /permission denied/);
  await as(parent);
  assert.equal((await db.query('select public.is_staff() as allowed')).rows[0].allowed, false);
  await denied(`insert into public.staff_accounts(user_id) values('${parent}')`, /permission denied/);
  await denied('select * from public.staff_accounts', /permission denied/);
  console.log('PASS only server-granted staff can use the admin role; browser users cannot self-grant');

  await server();
  await db.exec(`insert into public.complimentary_access(parent_id,product_code,valid_until,reason,granted_by)
    values('${parent}','matharia',now()+interval '1 year','owner test','${owner}')`);
  await as(parent);
  assert.equal((await db.query("select public.has_game_access('matharia') as allowed")).rows[0].allowed, true);
  const child = (await db.query("select * from public.create_child_profile('TestLegend')")).rows[0];
  await db.query("select public.save_child_progress($1,'matharia',0,$2,'{}','{}')", [child.id, '20000000-0000-4000-8000-000000000001']);
  await as(owner);
  assert.equal((await db.query('select * from public.complimentary_access')).rows.length, 0);
  assert.equal((await db.query('select * from public.child_progress')).rows.length, 0);
  console.log('PASS complimentary access permits one child and saves; other accounts cannot read them');

  await server();
  await db.exec(`insert into public.account_suspensions(parent_id,reason,suspended_by)
    values('${parent}','Support test','${owner}')`);
  await as(parent);
  assert.equal((await db.query("select public.has_game_access('matharia') as allowed")).rows[0].allowed, false);
  assert.equal((await db.query('select * from public.child_progress')).rows.length, 0);
  await denied("select public.save_child_progress($1,'matharia',1,$2,'{}','{}')".replace('$1', `'${child.id}'`).replace('$2', "'20000000-0000-4000-8000-000000000002'"), /Active Matharia/);
  console.log('PASS database blocks an already signed-in suspended parent');

  await server();
  await db.exec(`update public.account_suspensions set cleared_at=now() where parent_id='${parent}';
    update public.complimentary_access set revoked_at=now() where parent_id='${parent}'`);
  await as(parent);
  assert.equal((await db.query("select public.has_game_access('matharia') as allowed")).rows[0].allowed, false);
  console.log('PASS revoking complimentary access removes game entitlement');
} finally { await db.close(); }
