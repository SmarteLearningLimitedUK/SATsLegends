import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { loadEnv } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = loadEnv('ios', process.cwd(), 'VITE_').VITE_SUPABASE_URL;
assert.ok(origin, 'Configure the same public iOS account URL used by the app.');
const host = new URL(origin).hostname, base = process.env.LEGEND_IOS_QA_URL || 'http://127.0.0.1:3023';
const out = 'qa-artifacts/ios-independent-account'; await mkdir(out, { recursive: true });
const browser = await chromium.launch(), results = [];
try {
  for (const viewport of [{width:390,height:844},{width:375,height:667},{width:430,height:932},{width:844,height:390}]) {
    const context = await browser.newContext({viewport, hasTouch:true, reducedMotion:'reduce'});
    const errors = [], requests = [], parent = '10000000-0000-4000-8000-000000000001';
    let saved = null, revision = 0;
    const savedRequests = new Map();
    const user = {id:parent,email:'app-qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
    const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const auth = {user,access_token:part({alg:'HS256'})+'.'+part({sub:parent,exp:Math.floor(Date.now()/1000)+3600})+'.fixture',refresh_token:'fixture',expires_in:3600,token_type:'bearer'};
    await context.addInitScript(() => {
      window.__orientationCalls = [];
      window.CapacitorCustomPlatform = {name:'ios'};
      window.Capacitor = {PluginHeaders:[
        {name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]},
        {name:'ScreenOrientation',methods:[{name:'lock',rtype:'promise'},{name:'unlock',rtype:'promise'}]},
        {name:'LegendsStore',methods:[{name:'entitlements',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]}
      ],nativePromise:async(plugin,method,options)=>{
        if(plugin==='ScreenOrientation') window.__orientationCalls.push(method === 'unlock' ? 'unlock' : options.orientation);
        if(plugin==='App') return {isActive:true};
        if(plugin==='LegendsStore') return {transactionIds:[]};
        return {};
      },nativeCallback:()=> 'fixture-listener'};
    });
    await context.route(url => url.hostname === host, async route => {
      const req = route.request(), url = new URL(req.url());
      const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
      const reply = (body,status=200) => route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
      if(req.method()==='OPTIONS') return reply({});
      requests.push({path:url.pathname,method:req.method()});
      if(url.pathname.endsWith('/token')) {
        const credentials=req.postDataJSON();
        assert.equal(credentials.email,user.email);
        if(credentials.password!=='fixture-valid-password') return reply({msg:'Invalid login credentials'},400);
        return reply(auth);
      }
      if(url.pathname.endsWith('/user')) return reply(user);
      if(url.pathname.endsWith('/child_profiles')) return reply([{id:'child-fixture',parent_id:parent,nickname:'Robin'}]);
      if(url.pathname.endsWith('/subscriptions')) return reply([{id:'fixture',product_code:'matharia',status:'active',interval:'month',current_period_end:new Date(Date.now()+86400000).toISOString()}]);
      if(url.pathname.endsWith('/parent_settings')) return reply({report_emails:false});
      if(url.pathname.endsWith('/complimentary_access')) return reply([]);
      if(url.pathname.endsWith('/rpc/is_staff')) return reply(false);
      if(url.pathname.endsWith('/child_progress')) return reply(saved);
      if(url.pathname.endsWith('/rpc/save_child_progress')) {
        const body = req.postDataJSON();
        if(savedRequests.has(body.request_id)) return reply(savedRequests.get(body.request_id));
        revision++; savedRequests.set(body.request_id,revision);
        saved = {player:body.player_data,progression:body.progression_data,revision,last_request_id:body.request_id};
        return reply(revision);
      }
      if(url.pathname.endsWith('/apple-subscriptions')) return reply({ready:false});
      throw Error('Unexpected account request: '+url.pathname);
    });
    const page = await context.newPage(); page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/');
    await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
    await expect(page.locator('.website-header,.website-footer,.website-account-world')).toHaveCount(0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.appOrientation),'portrait');
    const stem=viewport.width+'x'+viewport.height;
    await page.screenshot({path:out+'/'+stem+'-login.png',fullPage:true});
    await page.getByRole('link',{name:'Create parent account',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
    await page.screenshot({path:out+'/'+stem+'-signup.png',fullPage:true});
    await page.getByRole('link',{name:'Back to sign in'}).click();
    await page.getByRole('link',{name:'Forgot password?'}).click();
    await expect(page.getByRole('heading',{name:'Reset your password'})).toBeVisible();
    await page.getByRole('link',{name:'Back to sign in'}).click();
    await page.getByLabel('Parent email address').fill(user.email);
    await page.getByLabel('Password',{exact:true}).fill('wrong-password');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('Unable to log in');
    await page.getByLabel('Password',{exact:true}).fill('fixture-valid-password');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Who’s playing?'})).toBeVisible();
    await expect(page.getByRole('button',{name:/Robin/})).toBeVisible();
    await page.screenshot({path:out+'/'+stem+'-learners.png',fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.appOrientation),'portrait');
    await page.getByRole('button',{name:/Robin/}).click();
    await expect(page.locator('html')).toHaveAttribute('data-app-orientation','portrait');
    await expect.poll(()=>page.evaluate(()=>window.__orientationCalls.at(-1))).toBe('portrait-primary');
    // Menus stay portrait. Only a minigame permits physical rotation.
    // Match the app's client-side level navigation, preserving the mounted
    // save controller rather than reloading during a pending save.
    await page.evaluate(() => {
      history.pushState(null, '', '/game/1/1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-app-orientation','landscape-required');
    await expect.poll(()=>page.evaluate(()=>window.__orientationCalls.at(-1))).toBe('unlock');
    await page.setViewportSize({width:390,height:844});
    const rotate = page.locator('[data-gameplay-orientation-gate]');
    try { await expect(rotate).toBeVisible({timeout:60000}); }
    catch(error) {
      console.error('Game-screen diagnostic',JSON.stringify({url:page.url(),errors,text:(await page.locator('body').innerText()).slice(0,1200)}));
      await page.screenshot({path:out+'/'+stem+'-rotation-failure.png',fullPage:true});
      throw error;
    }
    await expect(page.locator('.iphone-game-stage')).toHaveAttribute('inert','');
    await expect(rotate.getByText('Your game is paused.')).toBeVisible();
    await page.screenshot({path:out+'/'+stem+'-turn-phone.png',fullPage:true});
    await page.setViewportSize({width:844,height:390});
    await expect(rotate).toHaveCount(0);
    await expect(page.locator('.iphone-game-stage')).not.toHaveAttribute('inert','');
    await page.setViewportSize({width:390,height:844});
    await expect(rotate).toBeVisible();
    await rotate.getByRole('button',{name:'Back to island'}).click();
    await expect(rotate).toHaveCount(0);
    await expect.poll(()=>page.evaluate(()=>window.__orientationCalls.at(-1))).toBe('portrait-primary');
    await page.goto(base+'/parent');
    await expect(page.getByRole('heading',{name:'Who’s playing?'})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.__orientationCalls.at(-1))).toBe('portrait-primary');
    assert.deepEqual(errors,[]);
    assert.ok(requests.some(r=>r.path.endsWith('/token')));
    results.push({viewport,passed:true,scope:'Isolated auth fixture, account navigation, shared credentials request, learner selection and native orientation bridge calls. No real sign-in or device rotation.'});
    console.log('PASS iOS account shell',stem); await context.close();
  }
} finally { await browser.close(); await writeFile(out+'/results.json',JSON.stringify(results,null,2)); }
