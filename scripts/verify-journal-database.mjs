import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const staff = '10000000-0000-4000-8000-000000000001';
const parent = '10000000-0000-4000-8000-000000000002';
const draft = { id:'10000000-0000-4000-8000-000000000003',title:'Revision that builds confidence',slug:'revision-confidence',summary:'Practical ideas for parents.',body:'A short revision session can help children revisit what they have learnt at school. Make space to celebrate effort.',category:'Revision tips',artwork:'adventure',captions:{ instagram:'Meet the legends.',facebook:'Revision ideas for your family.' } };
let checks=0;
function pass(message) { checks++; console.log(`PASS ${message}`); }
async function role(name, id='') { await db.exec(`reset role; set role ${name}; select set_config('request.jwt.claim.sub','${id}',false)`); }
async function save(value, revision) { return (await db.query('select to_jsonb(public.journal_save_draft($1::jsonb,$2)) as draft',[JSON.stringify(value),revision])).rows[0].draft; }
async function publish(revision, channels=[]) { return db.query('select public.journal_publish($1,$2,$3::text[])',[draft.id,revision,channels]); }
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;`);
  for (const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  assert.equal((await db.query('select * from public.journal_posts')).rows.length,1);
  assert.equal((await db.query('select * from public.journal_deliveries')).rows.length,0);
  await db.exec('delete from public.journal_drafts');
  await db.exec(`insert into auth.users(id) values('${staff}'),('${parent}'); insert into public.staff_accounts(user_id) values('${staff}')`);
  await role('anon');
  assert.equal((await db.query('select * from public.journal_posts')).rows.length,0);
  await assert.rejects(()=>save(draft,0),/permission denied/);
  await assert.rejects(()=>db.query('select * from public.journal_drafts'),/permission denied/);
  pass('Anonymous visitors cannot read drafts or use publishing functions');
  await role('authenticated',parent);
  await assert.rejects(()=>save(draft,0),/Staff access required/);
  assert.equal((await db.query('select * from public.journal_deliveries')).rows.length,0);
  pass('Ordinary parent accounts cannot publish or see social requests');
  await role('authenticated',staff);
  const first=await save(draft,0); assert.equal(first.revision,1);
  await assert.rejects(()=>save(draft,0),/another session/);
  await assert.rejects(()=>db.query('update public.journal_drafts set revision=99'),/permission denied/);
  await assert.rejects(()=>publish(1,['youtube']),/Invalid social channels/);
  await publish(1,['instagram','facebook']); await publish(1,['instagram','facebook']);
  assert.equal((await db.query('select * from public.journal_deliveries')).rows.length,2);
  assert.ok((await db.query('select * from public.journal_deliveries')).rows.every(r=>r.status==='awaiting_connection'));
  pass('Staff can save and publish; stale edits, direct writes and duplicate social requests are blocked');
  await save({...draft,title:'Private next revision'},1);
  await role('anon');
  const publicStory=(await db.query('select * from public.journal_posts')).rows[0];
  assert.equal(publicStory.title,draft.title); assert.equal(publicStory.captions,undefined); assert.equal(publicStory.updated_by,undefined);
  pass('Editing a draft cannot change the public story or leak social captions and staff identifiers');
  await role('authenticated',staff);
  await publish(2); assert.equal((await db.query('select title from public.journal_posts')).rows[0].title,'Private next revision');
  await db.query('select public.journal_unpublish($1)',[draft.id]);
  await assert.rejects(()=>save({...draft,slug:'new-address'},2),/address cannot be changed/);
  assert.ok((await db.query('select status from public.journal_deliveries')).rows.every(r=>r.status==='cancelled'));
  await role('anon'); assert.equal((await db.query('select * from public.journal_posts')).rows.length,0);
  pass('Unpublishing removes public access, keeps the address reserved and cancels unsent social requests');
  await db.exec(`reset role; insert into public.account_suspensions(parent_id,reason,suspended_by) values('${staff}','Test suspension','${staff}')`);
  await role('authenticated',staff); await assert.rejects(()=>save(draft,2),/Staff access required/);
  pass('Suspending a staff account revokes publishing access immediately');
  console.log(`${checks} Journal database checks passed`);
} finally { await db.close(); }
