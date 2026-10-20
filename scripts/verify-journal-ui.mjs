// Fixture-only browser checks: no real accounts, articles or social posts created.
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.JOURNAL_QA_URL || 'http://127.0.0.1:3000';
const env = loadEnv('development', '.', 'VITE_');
const backend = process.env.JOURNAL_QA_BACKEND || env.VITE_SUPABASE_URL;
if (!backend) throw new Error('Configured public Supabase URL required');
const ref = new URL(backend).hostname.split('.')[0];
const user = { id:'10000000-0000-4000-8000-000000000001',email:'journal-staff@example.com',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{} };
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
const session={user,access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer'};
const initial={id:'10000000-0000-4000-8000-000000000003',slug:'revision-confidence',title:'Revision that builds confidence.',summary:'Make room for practice and celebrate every effort.',body:'## Start with one focus\n\nRevision is a companion to classroom learning. Give your child time to practise, reflect and celebrate the effort they put in.',category:'For parents',artwork:'adventure',revision:1,captions:{instagram:'A new chapter. Read the story via the link in our bio.',facebook:'Make room for revision.'},published_at:new Date().toISOString()};
let draft={...initial}, published={...initial}, deliveries=[], staff=true, schemaReady=true;
await mkdir('qa-artifacts/journal',{recursive:true});
const browser=await chromium.launch();
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
  await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${ref}-auth-token`,session});
  await context.route(`${backend}/**`,async route=>{
    const request=route.request(), url=new URL(request.url());
    const reply=(value,status=200)=>route.fulfill({status,headers:{'Access-Control-Allow-Origin':base,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'},contentType:'application/json',body:JSON.stringify(value)});
    if(request.method()==='OPTIONS')return reply({});
    if(url.pathname.endsWith('/user'))return reply(user);
    if(url.pathname.endsWith('/rpc/is_staff'))return reply(staff);
    if(url.pathname.endsWith('/parent_settings'))return reply({report_emails:false,next_report_at:new Date().toISOString()});
    if(/\/journal_(drafts|deliveries)$/.test(url.pathname)&&!schemaReady)return reply({code:'PGRST205',message:'Missing table'},404);
    if(url.pathname.endsWith('/journal_drafts'))return reply([draft]);
    if(url.pathname.endsWith('/journal_deliveries'))return reply(deliveries);
    if(url.pathname.endsWith('/journal_posts'))return reply(url.searchParams.has('slug')?published:published?[published]:[]);
    const body=request.postDataJSON();
    if(url.pathname.endsWith('/rpc/journal_save_draft')){assert.equal(body.expected_revision,draft.revision);draft={...body.payload,revision:draft.revision+1};return reply(draft);}
    if(url.pathname.endsWith('/rpc/journal_publish')){assert.equal(body.expected_revision,draft.revision);published={...draft,published_at:new Date().toISOString()};deliveries=body.selected_channels.map(channel=>({id:channel,post_id:draft.id,revision:draft.revision,channel,status:'awaiting_connection',error:null,remote_url:null}));return reply(null);}
    if(url.pathname.endsWith('/rpc/journal_unpublish')){published=null;deliveries=deliveries.map(row=>({...row,status:'cancelled'}));return reply(null);}
    return reply([]);
  });
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/admin/journal`);
  await page.getByRole('button',{name:initial.title,exact:false}).click();
  await page.getByLabel('Story title',{exact:true}).fill('A clearer way to practise SATs skills.');
  await page.getByRole('button',{name:'Preview story',exact:true}).click();
  await expect(page.getByRole('region',{name:'Story preview'})).toContainText('A clearer way');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  assert.equal(published.title,initial.title);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download social image',exact:false}).click();
  const download=await downloadPromise;await download.saveAs('qa-artifacts/journal/social-fixture.jpg');assert.ok(download.suggestedFilename().endsWith('.jpg'));
  await page.getByRole('checkbox',{name:'Facebook Connection required',exact:true}).check();
  await page.getByRole('button',{name:'Publish to website',exact:false}).click();
  await expect(page.getByRole('status')).toContainText('Your story is live');
  await expect(page.getByText('Revision 2 · awaiting connection')).toBeVisible();
  assert.equal(published.title,draft.title);
  console.log('PASS staff editor saves drafts, previews safely, exports JPEG and records selected social requests');
  for(const width of [320,390,768,1024,1251,1366,1440,1920]){
    await page.setViewportSize({width,height:1000});
    for(const path of ['/journal','/journal/revision-confidence','/admin/journal']){
      console.log(`CHECK ${width}px ${path}`);
      await page.goto(base+path);await expect(page.locator('main h1')).toBeVisible({timeout:15000});await page.evaluate(()=>document.fonts.ready);
      const bad=await page.locator('main, .website-header').evaluateAll(elements=>elements.flatMap(root=>[root,...root.querySelectorAll('h1,h2,p,input,textarea,select,button,a,img')]).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left < -1||r.right>innerWidth+1);}).map(el=>({tag:el.tagName,text:el.textContent?.slice(0,50),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})));
      if(bad.length) { await page.screenshot({path:'qa-artifacts/journal/layout-failure.png'}); console.log(await page.locator('.website-header-inner').evaluate(el=>Array.from(el.querySelectorAll('a,button')).map(a=>({text:a.textContent,display:getComputedStyle(a).display,width:a.getBoundingClientRect().width})))); }
      assert.deepEqual(bad,[],`${width}px ${path}: horizontal clipping`);
      if(width===390||width===1440)await page.screenshot({path:`qa-artifacts/journal/${width}-${path.includes('admin')?'editor':path.includes('confidence')?'story':'journal'}.png`,fullPage:true});
    }
  }
  console.log('PASS Journal, article and staff editor fit eight phone, tablet and desktop viewport widths');
  await page.goto(base+'/admin/journal');staff=false;await page.reload();await expect(page.getByRole('heading',{name:'Staff access required.'})).toBeVisible();
  staff=true;schemaReady=false;await page.reload();await expect(page.getByRole('alert')).toContainText('Journal database needs to be enabled');await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
  assert.deepEqual(errors,[]);console.log('PASS nonstaff guard and unavailable-backend state fail closed without runtime errors');
} finally {await browser.close();}
