import { chromium, webkit, expect } from '@playwright/test';
import { loadEnv } from 'vite';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

// All account and StoreKit responses below are isolated fixtures. These checks
// exercise the real release bundle; they do not authenticate or charge a user.
const engine = process.env.MATHARIA_ENGINE ?? 'chromium';
const base = process.env.MATHARIA_URL ?? 'http://127.0.0.1:3050';
const out = `qa-artifacts/app-store-readiness-2026-11-03/opening-${engine}`;
const env = {...loadEnv('production', process.cwd(), 'VITE_'), ...loadEnv('ios', process.cwd(), 'VITE_')};
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
  for(const control of geometry.controls){expect(control.w,control.label).toBeGreaterThanOrEqual(43.5);expect(control.h,control.label).toBeGreaterThanOrEqual(43.5);if(!control.hit)throw Error('Control centre intercepted: '+JSON.stringify(control));}
  return geometry;
}
async function dismissBriefings(p) { for(let i=0;i<6;i++){const button=p.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;await button.click();await p.waitForTimeout(100);} }
async function finishParentGate(p) {
 const gate=p.locator('[data-native-dialog="parent-gate"]');
 await gate.waitFor();const match=(await gate.locator('label').innerText()).match(/([1-9]) \+ ([1-9])\?/);
 if(!match)throw Error('Parent-check question missing');
 await gate.locator('input').fill(String(Number(match[1])+Number(match[2])));
 await gate.getByRole('button',{name:'Continue',exact:true}).click();
}
try {
 for(const [name,width,height] of profiles){
  const c=await context(width,height,{native:true,signedIn:true}),p=await c.newPage();
  await p.goto(base+'/island/1',{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Parent account',exact:true}).click();
  await finishParentGate(p);
  const dialog=p.locator('[data-native-dialog="account"]');await dialog.waitFor();
  await expect(dialog.getByText('Your parent account.',{exact:true})).toBeVisible().catch(async error=>{await screenshot(p,`account-fixture-failure-${name}`);throw error});
  const copy=dialog.locator('.native-account-description');const btn=dialog.getByRole('button',{name:'Explore full access'});
  const geometry=await copy.evaluate(el=>{const text=document.createRange();text.selectNodeContents(el);const t=text.getBoundingClientRect(),b=el.nextElementSibling.getBoundingClientRect(),r=el.getBoundingClientRect();return {textBottom:t.bottom,copyBottom:r.bottom,buttonTop:b.top,lineHeight:getComputedStyle(el).lineHeight,fontSize:getComputedStyle(el).fontSize};});
  console.log(name,JSON.stringify(geometry));await screenshot(p,`account-overlap-${name}`);
  expect(geometry.buttonTop-geometry.textBottom, name+' text/button gap').toBeGreaterThanOrEqual(12);
  await btn.scrollIntoViewIfNeeded();await btn.click();await finishParentGate(p);await expect(p.locator('[data-native-dialog="upgrade"]')).toBeVisible();
  await record({test:'signed-in-account-spacing',profile:name,passed:true,...geometry});await c.close();
 }
} finally {await browser.close();}
