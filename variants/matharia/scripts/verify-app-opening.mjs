import { chromium, webkit, expect } from '@playwright/test';
import { loadEnv } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// All account and StoreKit responses below are isolated fixtures. These checks
// exercise the real release bundle; they do not authenticate or charge a user.
const engine = process.env.MATHARIA_ENGINE ?? 'chromium';
const base = process.env.MATHARIA_URL ?? 'http://127.0.0.1:3050';
const out = process.env.QA_OUTPUT ?? `qa-artifacts/app-store-readiness-2026-11-03/opening-${engine}`;
const env = loadEnv('production', process.cwd(), 'VITE_');
const host = new URL(env.VITE_SUPABASE_URL).hostname;
const parent = '10000000-0000-4000-8000-000000000001';
const child = '20000000-0000-4000-8000-000000000001';
const user = { id: parent, email: 'opening-qa@example.invalid', aud: 'authenticated', role: 'authenticated', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'apple', providers: ['apple'] }, user_metadata: {} };
const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = part({ alg: 'HS256', typ: 'JWT' }) + '.' + part({ sub: parent, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 }) + '.fixture';
const auth = { user, access_token: token, refresh_token: 'isolated_fixture', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer' };
const profiles = [['compact',320,568],['iphone',402,874],['large-iphone',430,932],['iphone-landscape',874,402],['ipad',768,1024],['large-ipad',1032,1376],['ipad-landscape',1376,1032]].filter(r=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(r[0]));
const rows = [];
let completed = false;
await mkdir(out, { recursive: true });
const browser = await (engine === 'webkit' ? webkit.launch({ executablePath: 'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe' }) : chromium.launch());
const record = async row => { rows.push(row); await writeFile(`${out}/checks.json`, JSON.stringify(rows,null,2)); console.log(JSON.stringify(row)); };
async function context(width, height, options = {}) {
  const c = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await c.addInitScript(({host,parent,child,auth,user,options}) => {
    window.__openingFixture = { nativeCalls: [], requests: [], active: Boolean(options.active), outcome: options.outcome ?? 'purchased', restored: Boolean(options.restored), paid: Boolean(options.paid), listeners: {} };
    const fixture = window.__openingFixture;
    if (!sessionStorage.getItem('__native_fixture_seeded')) {
      if (options.password) {auth.user.app_metadata={provider:'email',providers:['email']};auth.user.identities=[{provider:'email'}];}
      if (options.website) localStorage.setItem('sb-'+host.split('.')[0]+'-auth-token', JSON.stringify(auth));
      if (options.signedIn) localStorage.setItem('matharia-ios-auth-v1',JSON.stringify(auth));
      localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Device Explorer',level:2,xp:77,unlockedIslands:[1,2,3,4,5,6,7,8]}));
      sessionStorage.setItem('__native_fixture_seeded','1');
    }
    fixture.requests=JSON.parse(sessionStorage.getItem('__native_fixture_requests')||'[]');
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input,init) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, location.href);
      if (url.hostname !== host) {
        if (url.origin !== location.origin) throw new Error('Unexpected external request: '+url.origin);
        return originalFetch(input,init);
      }
      const method=init?.method ?? (input instanceof Request?input.method:'GET');
      const raw=init?.body ?? (input instanceof Request?await input.clone().text():'');
      const body=raw?JSON.parse(String(raw)):null;
      fixture.requests.push({path:url.pathname,query:url.search,method,body});sessionStorage.setItem('__native_fixture_requests',JSON.stringify(fixture.requests));
      const reply=data=>Promise.resolve(new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}}));
      if(method==='OPTIONS')return reply({});
      if(url.pathname.endsWith('/token')) {
        if(options.wrongPassword&&body?.password)return new Response(JSON.stringify({error:'invalid_grant',error_description:'Invalid login credentials'}),{status:400,headers:{'content-type':'application/json'}});
        return reply(auth);
      }
      if(url.pathname.endsWith('/user'))return reply(auth.user);
      if(url.pathname.endsWith('/logout'))return reply({});
      if(url.pathname.endsWith('/native-account-delete'))return new Response(JSON.stringify(options.deleteFailure?{error:'Deletion fixture unavailable.'}:{deleted:true}),{status:options.deleteFailure?503:200,headers:{'content-type':'application/json'}});
      throw new Error('Unexpected account request '+url.pathname);
    };
    if (!options.native) return;
    window.CapacitorCustomPlatform = { name:'ios' };
    const methods = ['status','purchase','restore','signInWithApple','manageSubscriptions','removeListener'];
    const status=()=>({active:fixture.active,expiresAt:fixture.active?Date.now()+3600000:null,configured:true});
    window.Capacitor = {
      PluginHeaders:[{name:'MathariaServices',methods:[...methods.map(name=>({name,rtype:'promise'})),{name:'addListener',rtype:'callback'}]}, {name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'}]}],
      nativeCallback(plugin,method,input,callback){fixture.listeners[`${plugin}:${input.eventName}`]=callback;return 'fixture-listener';},
      async nativePromise(plugin,method,input){
        fixture.nativeCalls.push({plugin,method,input});
        if(plugin==='App')return {isActive:true};
        if(method==='status')return {...status(),plans:options.noPlans?[]:[{id:'com.smartelearning.satslegends.matharia.monthly',name:'Matharia Monthly',price:'£4.99',period:'month',periodCount:1},{id:'com.smartelearning.satslegends.matharia.yearly',name:'Matharia Yearly',price:'£49.99',period:'year',periodCount:1}]};
        if(method==='signInWithApple')return {identityToken:'isolated-apple-token',nonce:'isolated-apple-nonce',authorizationCode:'isolated-apple-code'};
        if(method==='purchase'){
          if(fixture.outcome==='error')throw new Error('Store fixture connection failed.');
          await new Promise(resolve=>setTimeout(resolve,300));
          if(fixture.outcome==='purchased')fixture.active=true;
          fixture.listeners['MathariaServices:entitlementsChanged']?.(status());
          return {...status(),outcome:fixture.outcome};
        }
        if(method==='restore'){fixture.active=fixture.restored;return status();}
        return {};
      }
    };
  }, {host,parent,child,auth,user,options});
  return c;
}
async function ready(p) {
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].filter(image => {const r=image.getBoundingClientRect();return r.width && r.height && r.top<innerHeight && r.bottom>0;}).every(image => image.complete && image.naturalWidth));
}
async function screenshot(p,name){await ready(p);await p.screenshot({path:`${out}/${name}.png`});}
async function fit(p, selector) {
  const geometry = await p.locator(selector).evaluate(root => {
    const r=root.getBoundingClientRect();
    const visible=(element)=>{if(element.closest("details:not([open])")&&!element.closest("summary"))return false;let b=element.getBoundingClientRect();if(!b.width||!b.height||b.left<0||b.right>innerWidth||b.top<0||b.bottom>innerHeight)return false;for(let n=element.parentElement;n&&n!==document.body;n=n.parentElement){const a=n.getBoundingClientRect();if(/auto|scroll|hidden/.test(getComputedStyle(n).overflowY)&&(b.top<a.top||b.bottom>a.bottom))return false;if(/auto|scroll|hidden/.test(getComputedStyle(n).overflowX)&&(b.left<a.left||b.right>a.right))return false;}return true;};
    return {bounds:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},documentOverflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,
      controls:[...root.querySelectorAll('button')].filter(visible).map(button=>{const b=button.getBoundingClientRect();return{label:button.getAttribute('aria-label')||button.textContent.trim(),w:b.width,h:b.height,interceptor:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.outerHTML?.slice(0,220),hit:button.disabled||document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===button};})};
  });
  expect(geometry.documentOverflow).toBe(false);
  const v=p.viewportSize();expect(geometry.bounds.x).toBeGreaterThanOrEqual(-1);expect(geometry.bounds.y).toBeGreaterThanOrEqual(-1);expect(geometry.bounds.right).toBeLessThanOrEqual(v.width+1);expect(geometry.bounds.bottom).toBeLessThanOrEqual(v.height+1);
  for(const control of geometry.controls){if(control.w<43.5||control.h<43.5)console.log('UNDERSIZED',JSON.stringify(control));expect(control.w,control.label).toBeGreaterThanOrEqual(43.5);expect(control.h,control.label).toBeGreaterThanOrEqual(43.5);if(!control.hit)throw Error('Control centre intercepted: '+JSON.stringify(control));}
  return geometry;
}
async function passParentGate(p) {
  const gate=p.locator('[data-native-dialog="parent-gate"]');await gate.waitFor();
  const match=(await gate.locator('label').innerText()).match(/([1-9]) \+ ([1-9])\?/);
  if(!match)throw Error('Missing parent challenge');
  await gate.locator('input').fill(String(Number(match[1])+Number(match[2])));
  await gate.getByRole('button',{name:'Continue',exact:true}).click();
}
async function dismissBriefings(p) { for(let i=0;i<6;i++){const button=p.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;await button.click();await p.waitForTimeout(100);} }
try {
  for (const [name,width,height] of profiles) {
    const c=await context(width,height),p=await c.newPage(),errors=[];p.on('pageerror',error=>errors.push(error.message));
    await p.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await p.locator('[data-native-splash]').waitFor();await screenshot(p,`${name}-splash`);await fit(p,'[data-native-splash]');
    expect(await p.locator('.website-header,.website-footer,.website-account-main').count()).toBe(0);
    await p.getByRole('button',{name:'Start adventure',exact:true}).click();await p.locator('[data-adventure-board]').waitFor();await ready(p);
    for(const id of [1,2,3]){await p.locator(`[data-game-select="${["place_value_panic","number_line_ninja","prime_pop"][id-1]}"]`).click();await expect(p.locator(`[data-free-practice="${id}"]`)).toHaveCount(1);expect(await p.locator('[data-level-route][data-locked="false"]').count()).toBe(0);}
    await screenshot(p,`${name}-levels`);await fit(p,'[data-adventure-board]');
    await p.locator('.mission-step[data-locked="true"]').first().click();await passParentGate(p);await p.locator('dialog[open]').waitFor();await screenshot(p,`${name}-upgrade-unavailable`);await fit(p,'dialog');
    await p.getByRole('button',{name:'Continue with Apple or sign in',exact:true}).click();await passParentGate(p);await p.locator('[data-native-dialog="account"]').waitFor();await screenshot(p,`${name}-account`);await fit(p,'dialog');
    await p.keyboard.press('Escape');await expect(p.locator('dialog')).toHaveCount(0);await expect(p.locator('.mission-step[data-locked="true"]').first()).toBeVisible();
    assert.deepEqual(errors,[]);await record({test:'guest-layout',profile:name,passed:true,freePracticeGames:3,noWebsiteChrome:true});await c.close();
  }
  {
    const c=await context(402,874),p=await c.newPage();
    for(const id of [1,2,3]){
      await p.setViewportSize(id===2?{width:874,height:402}:{width:402,height:874});
      await p.goto(`${base}/game/1/${id}`);await p.locator('[data-game-set]').waitFor();await dismissBriefings(p);await expect(p.locator('[data-native-route-locked]')).toHaveCount(0);await screenshot(p,`free-game-${id}`);
    }
    for(const route of ['/game/1/4','/game/2/1','/game/1/6']){
      await p.goto(base+route);await passParentGate(p);await p.locator('[data-native-dialog="upgrade"]').waitFor();expect(await p.locator('[data-game-set]').count()).toBe(0);await p.getByRole('button',{name:'Keep practising free',exact:true}).click();await p.getByRole('button',{name:'Back to levels',exact:true}).click();await p.locator('[data-adventure-board]').waitFor();
    }
    await record({test:'free-games-and-direct-route-guard',passed:true,freeRoutes:['/game/1/1','/game/1/2','/game/1/3'],lockedRoutes:3});await c.close();
  }
  {
    const c=await context(402,874,{native:true}),p=await c.newPage();
    await p.goto(base+'/island/1');await p.locator('[data-free-practice]').first().waitFor();
    await p.getByRole('button',{name:'Parent account',exact:true}).click();await passParentGate(p);await p.getByLabel('I’m the parent or guardian creating or accessing this account.',{exact:true}).check();
    await screenshot(p,'native-apple-sign-in');await p.getByRole('button',{name:'Continue with Apple',exact:true}).click();await p.getByText('Three free practice games',{exact:true}).waitFor();
    const apple=await p.evaluate(()=>window.__openingFixture.requests.find(r=>r.path.endsWith('/token')));
    expect(apple.body.provider).toBe('apple');expect(apple.body.id_token).toBe('isolated-apple-token');expect(apple.body.nonce).toBe('isolated-apple-nonce');
    expect(await p.locator('[data-free-practice]').count()).toBe(1);
    await p.getByRole('button',{name:'Close',exact:true}).click();await p.locator('.mission-step[data-locked="true"]').first().click();await passParentGate(p);await p.getByRole('button',{name:'Matharia Yearly £49.99 / year',exact:true}).click();await screenshot(p,'native-upgrade-plans');
    await p.getByRole('button',{name:'Upgrade · £49.99',exact:true}).dblclick();await expect(p.locator('dialog')).toHaveCount(0);
    expect(await p.evaluate(()=>window.__openingFixture.nativeCalls.filter(r=>r.method==='purchase').length)).toBe(1);
    expect(await p.getByText('Full access',{exact:true}).count()).toBeGreaterThan(0);
    await record({test:'native-bridge-contract',passed:true,appleTokenExchanged:true,signInAloneKeepsLocks:true,purchaseUsesSelectedProduct:true,doublePurchasePrevented:true,browserFixtureOnly:true});await c.close();
  }
  for(const outcome of ['cancelled','pending','error']){
    const c=await context(402,874,{native:true,outcome}),p=await c.newPage();await p.goto(base+'/island/1');await p.locator('.mission-step[data-locked="true"]').first().click();await passParentGate(p);await p.getByRole('button',{name:'Upgrade · £4.99',exact:true}).click();await p.getByText(outcome==='cancelled'?'Purchase cancelled. You can keep playing the free practice games.':outcome==='pending'?'Your purchase is waiting for approval. Access will unlock when Apple confirms it.':'Store fixture connection failed.',{exact:true}).waitFor();expect(await p.locator('[data-free-practice]').count()).toBe(1);await record({test:`purchase-${outcome}`,passed:true,accessRemainsLocked:true,browserFixtureOnly:true});await c.close();
  }
  for(const restored of [false,true]){
    const c=await context(402,874,{native:true,restored}),p=await c.newPage();await p.goto(base+'/island/1');await p.locator('.mission-step[data-locked="true"]').first().click();await passParentGate(p);await p.getByRole('button',{name:'Restore purchases',exact:true}).click();
    if(restored)await expect(p.locator('dialog')).toHaveCount(0);else await p.getByText('No active App Store purchase was found for this Apple Account. Your free practice is still available.',{exact:true}).waitFor();
    expect(await p.locator('[data-free-practice]').count()).toBe(1);await record({test:'restore',active:restored,passed:true,browserFixtureOnly:true});await c.close();
  }
  // Website credentials/saves remain separate in a browser preview.
  {
    const c=await context(402,874,{website:true}),p=await c.newPage();await p.goto(base+'/island/1');await p.locator('[data-adventure-board]').waitFor();await p.locator('.mission-step[data-locked="true"]').first().click();await passParentGate(p);await p.locator('[data-native-dialog="upgrade"]').waitFor();
    await p.getByRole('button',{name:'Continue with Apple or sign in',exact:true}).click();await passParentGate(p);await p.getByRole('button',{name:'Already have an email account?',exact:true}).waitFor();
    expect(await p.evaluate(()=>window.__openingFixture.requests.filter(r=>r.path.startsWith('/rest/')).length)).toBe(0);
    expect(await p.evaluate(host=>Boolean(localStorage.getItem('sb-'+host.split('.')[0]+'-auth-token')),host)).toBe(true);expect(await p.evaluate(()=>localStorage.getItem('matharia-ios-auth-v1'))).toBeNull();
    await record({test:'website-session-and-billing-do-not-unlock-app',passed:true,noWebsiteDataRequests:true});await c.close();
  }
  {
    const c=await context(402,874,{native:true,signedIn:true,active:true}),p=await c.newPage();await p.goto(base+'/island/1');await p.getByText('Full access',{exact:true}).waitFor();
    await p.getByRole('button',{name:'Parent account',exact:true}).click();await passParentGate(p);await p.getByRole('button',{name:'Sign out',exact:true}).click();await p.getByRole('button',{name:'Continue with Apple',exact:true}).waitFor();
    await p.getByRole('button',{name:'Close',exact:true}).click();await p.getByText('Full access',{exact:true}).waitFor();
    expect(await p.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-player-v1')).xp)).toBe(77);
    expect(await p.evaluate(()=>window.__openingFixture.requests.find(r=>r.path.endsWith('/logout')).query)).toContain('scope=local');
    expect(await p.evaluate(()=>window.__openingFixture.requests.filter(r=>r.path.startsWith('/rest/')).length)).toBe(0);
    await record({test:'native-purchase-and-device-save-survive-sign-out',passed:true,websiteSessionsNotRevoked:true});await c.close();
  }
  for(const [name,width,height] of profiles){
    const c=await context(width,height,{native:true,signedIn:true,password:true}),p=await c.newPage();await p.goto(base);await p.getByRole('button',{name:'Parent account',exact:true}).click();await passParentGate(p);await p.getByRole('button',{name:'Delete account',exact:true}).click();
    await p.getByRole('heading',{name:'Delete your account.',exact:true}).waitFor();await screenshot(p,name+'-delete-account');await fit(p,'dialog');
    const submit=p.getByRole('button',{name:'Permanently delete account',exact:true});await expect(submit).toBeDisabled();
    await p.getByRole('button',{name:'Keep my account',exact:true}).click();await p.getByRole('button',{name:'Delete account',exact:true}).waitFor();
    expect(await p.evaluate(()=>window.__openingFixture.requests.some(r=>r.path.endsWith('/native-account-delete')))).toBe(false);
    await record({test:'deletion-layout-and-cancel',profile:name,passed:true});await c.close();
  }
  for(const scenario of ['password-failure','server-failure','apple-success','password-success']) {
    const apple=scenario==='apple-success',success=scenario.endsWith('success');
    const c=await context(402,874,{native:true,signedIn:true,password:!apple,wrongPassword:scenario==='password-failure',deleteFailure:scenario==='server-failure'}),p=await c.newPage();
    await p.goto(base);await p.getByRole('button',{name:'Parent account',exact:true}).click();await passParentGate(p);await p.getByRole('button',{name:'Delete account',exact:true}).click();
    await p.getByLabel('I understand this deletes the shared account for both products.',{exact:true}).check();
    if(!apple)await p.getByLabel('Confirm your password',{exact:true}).fill('fixture-password');
    await p.getByLabel('Type DELETE to confirm',{exact:true}).fill('DELETE');
    const reload=success?p.waitForEvent('load'):null;
    await p.getByRole('button',{name:'Permanently delete account',exact:true}).click();
    if(success){await reload;await p.locator('[data-native-splash]').waitFor();expect(await p.evaluate(()=>localStorage.getItem('matharia-ios-player-v1'))).toBeNull();expect(await p.evaluate(()=>localStorage.getItem('matharia-ios-auth-v1'))).toBeNull();}
    else {await p.getByRole('alert').waitFor();expect(await p.evaluate(()=>JSON.parse(localStorage.getItem('matharia-ios-player-v1')).xp)).toBe(77);}
    const deletion=await p.evaluate(()=>JSON.parse(sessionStorage.getItem('__native_fixture_requests')).filter(r=>r.path.endsWith('/native-account-delete')));
    expect(deletion.length).toBe(scenario==='password-failure'?0:1);
    if(apple)expect(deletion[0].body.appleAuthorizationCode).toBe('isolated-apple-code');
    await record({test:'deletion-'+scenario,passed:true,fixtureOnly:true});await c.close();
  }
  completed = true;
} catch (error) {
  await record({test:'verification-failure',passed:false,error:error.message});
  throw error;
} finally {
  await browser.close();
  await writeFile(`${out}/summary.json`,JSON.stringify({engine,passed:completed&&rows.every(row=>row.passed),checks:rows.length,coverage:'Actual release web bundle with isolated service fixtures; not native iOS or real purchases.',rows},null,2));
}
