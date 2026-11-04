import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const engine=process.env.MATHARIA_ENGINE||'chromium',base=process.env.MATHARIA_URL||'http://127.0.0.1:3015';
const section=process.env.MATHARIA_SECTION||'all';
const out='qa-artifacts/shared-adventure',records=[],catalogue={};
const resultsFile=`${out}/${engine}${section==='all'?'':'-'+section}-checks.json`;
const manifest=JSON.parse(await readFile('docs/concept-recreation/approved-screens.json','utf8')).screens;
const profiles=[['phone',390,844],['compact',320,568],['ipad',768,1024]];
const browser=await(engine==='webkit'?webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):chromium.launch());
await mkdir(`${out}/${engine}`,{recursive:true});
async function record(row){records.push(row);await writeFile(resultsFile,JSON.stringify(records,null,2));console.log(JSON.stringify(row))}
async function context(w,h,avatarId='barratt',motion='reduce'){
  const c=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,reducedMotion:motion});
  await installReleaseAccountFixture(c);
  await c.addInitScript(({avatarId})=>{
    if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100,unlockedIslands:[1,2,3,4,5,6,7,8]},revision:1},requests:{}}));
    window.__qaRouteChanges=0;const original=history.pushState.bind(history);history.pushState=(...args)=>{window.__qaRouteChanges++;return original(...args)};
  },{avatarId});
  return c;
}
async function ready(p){
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>[...document.images].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).every(e=>e.complete&&e.naturalWidth));
  await p.waitForFunction(()=>[...document.querySelectorAll('[data-artwork-ready],[data-vision-ready]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).every(e=>e.dataset.artworkReady==='true'||e.dataset.visionReady==='true'));
  await p.waitForTimeout(280);
}
async function capture(p,name){await ready(p);await p.screenshot({path:`${out}/${engine}/${name}.png`})}
async function geometry(p,selector){
  const data=await p.locator(selector).evaluate(root=>{
    const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
    const parentScrollVisible=e=>{for(let n=e.parentElement;n&&n!==root.parentElement;n=n.parentElement){const b=n.getBoundingClientRect(),r=e.getBoundingClientRect();if(['auto','scroll','hidden'].includes(getComputedStyle(n).overflowY)&&(r.top<b.top-.5||r.bottom>b.bottom+.5))return false}return true};
    const rb=root.getBoundingClientRect();return{root:{x:rb.x,y:rb.y,right:rb.right,bottom:rb.bottom},overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,buttons:[...root.querySelectorAll('button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top>=0&&r.bottom<=innerHeight&&parentScrollVisible(e)}).map(e=>{
      const r=box(e),cx=r.x+r.w/2,cy=r.y+r.h/2;return{...r,label:e.getAttribute('aria-label')||e.textContent.trim(),disabled:e.disabled,hit:e.disabled||document.elementFromPoint(cx,cy)?.closest('button')===e};
    })};
  });
  expect(data.overflow,'Document must fit intended viewport').toBe(false);
  const viewport=p.viewportSize();expect(data.root.x).toBeGreaterThanOrEqual(-1);expect(data.root.right).toBeLessThanOrEqual(viewport.width+1);expect(data.root.y).toBeGreaterThanOrEqual(-1);expect(data.root.bottom).toBeLessThanOrEqual(viewport.height+1);
  for(const r of data.buttons)if(r.w<43.5||r.h<43.5||!r.hit)throw Error('Visible control failed: '+JSON.stringify(r));
  return data;
}
async function dismiss(p){for(let i=0;i<6;i++){const d=p.locator('[data-dialog-primary]:visible').last();if(!await d.count())break;const e=await d.elementHandle();await d.tap();await p.waitForFunction(e=>!e.isConnected,e);await p.waitForTimeout(80)}}
async function resultReady(p,outcome){await p.locator(`[data-result-outcome="${outcome}"]`).waitFor();await p.waitForFunction(()=>{const e=[...document.querySelectorAll('[data-result-outcome] button')].find(e=>e.textContent.trim()==='Map');if(!e)return false;for(let n=e;n&&n!==document.body;n=n.parentElement)if(+getComputedStyle(n).opacity<.99)return false;return true});await ready(p)}
async function solveConversion(p){
  const target=+await p.locator('[data-conversion-target]').getAttribute('data-conversion-target'),tokens=await p.locator('[data-conversion-token]').evaluateAll(es=>es.map(e=>({id:e.dataset.conversionToken,g:+e.dataset.tokenGrams})));
  let solution;for(let mask=1;mask<1<<tokens.length;mask++){const chosen=tokens.filter((_,j)=>mask&(1<<j));if(chosen.reduce((sum,t)=>sum+t.g,0)===target){solution=chosen;break}}
  expect(solution,'Exact native weight combination').toBeTruthy();for(const t of solution)await p.locator(`[data-conversion-token="${t.id}"]`).tap();await p.getByRole('button',{name:'Submit Shipment',exact:true}).tap();await p.waitForTimeout(760);
}
try{
  // The existing controller determines availability, order, difficulty and rewards.
  if(section==='all')for(let island=1;island<=8;island++){
    const c=await context(390,844),p=await c.newPage();await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();await ready(p);
    for(const group of await p.locator('[data-game-key]').all()){
      const key=await group.getAttribute('data-game-key'),header=group.locator('.adventure-game-header');if(await header.getAttribute('aria-expanded')!=='true')await header.tap();
      const practice=group.locator('[data-level-difficulty="practice"]').first();if(await practice.count())catalogue[key]=`/game/${island}/${await practice.getAttribute('data-level-route')}`;
    }
    await record({kind:'catalogue',island,groups:await p.locator('[data-game-key]').count(),pass:true});await c.close();
  }
  if(section==='all')await writeFile(`${out}/${engine}-practice-routes.json`,JSON.stringify(catalogue,null,2));else Object.assign(catalogue,JSON.parse(await readFile(`${out}/${engine}-practice-routes.json`,'utf8')));
  for(const[name,w,h]of profiles){
    if(section==='all'||(section==='remaining'&&name==='ipad'))for(const screen of manifest){
      const portrait=screen.orientation==='portrait',vw=portrait?w:h,vh=portrait?h:w,c=await context(vw,vh),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
      try{
        await p.goto(base+(catalogue[screen.key]||screen.route));
        await p.locator('[data-game-set]').waitFor();await ready(p);
        const intro=p.locator('[data-adventure-briefing]');
        if(await intro.count()){
          await expect(intro.locator('h2')).not.toHaveText('');
          const g=await geometry(p,'[data-adventure-briefing]');await capture(p,`${screen.key}-intro-${name}`);
          const reading=p.locator('.adventure-briefing-reading'),length=await reading.evaluate(e=>({scroll:e.scrollHeight,visible:e.clientHeight}));
          await reading.evaluate(e=>e.scrollTop=e.scrollHeight);await expect(p.locator('[data-dialog-primary]').last()).toBeInViewport();
          await record({kind:'intro',game:screen.key,profile:name,viewport:[vw,vh],gameKey:await intro.getAttribute('data-adventure-game'),reading:length,buttons:g.buttons.length,pass:true});
          await dismiss(p);await expect(intro).toHaveCount(0);
          await record({kind:'start',game:screen.key,profile:name,pass:true});
        }else await record({kind:'entry',game:screen.key,profile:name,note:'Existing flow has no shared briefing on this route.',pass:true});
        expect(errors).toEqual([]);
      }catch(e){await p.screenshot({path:`${out}/${engine}/${screen.key}-${name}-error.png`});await record({kind:'intro',game:screen.key,profile:name,pass:false,error:e.message});throw e}finally{await c.close()}
    }
    if(section!=='results'&&(section!=='remaining'||name!=='phone'))for(const island of[1,3,7,8]){
      const bw=name==='ipad'?1024:w,bh=name==='ipad'?768:h,c=await context(bw,bh),p=await c.newPage();await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();await ready(p);await geometry(p,'[data-adventure-board]');
      await capture(p,`island-${island}-${name}`);
      const locked=p.locator('[data-locked="true"] button').first();if(await locked.count())await expect(locked).toBeDisabled();
      const row=p.locator('[data-level-difficulty="practice"]').first();if(await row.count()){const route=await row.getAttribute('data-level-route');await row.getByRole('button').tap();await expect(p).toHaveURL(new RegExp(`/game/${island}/${route}$`));await record({kind:'level-navigation',island,profile:name,route,pass:true})}
      await record({kind:'board',island,profile:name,viewport:[bw,bh],locked:await locked.count(),pass:true});await c.close();
    }
  }
  // Real answers, original completion rules and original failure callbacks.
  for(const[name,w,h]of profiles){
    let c=await context(w,h),p=await c.newPage();await p.goto(`${base}/game/3/37`);await p.locator('[data-conversion-game]').waitFor();await ready(p);await dismiss(p);
    for(let i=0;i<5;i++)await solveConversion(p);
    await resultReady(p,'victory');await geometry(p,'[data-result-outcome]');await capture(p,`victory-${name}`);
    await expect(p.locator('.level-result-stats')).toContainText('100%');await expect(p.locator('.level-result-stats')).toContainText('3/3');await expect(p.locator('.level-result-progression')).toContainText('+105 XP');
    await p.locator('.level-result-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);await expect(p.locator('.level-result-bonuses')).toBeInViewport();await capture(p,`victory-details-${name}`);
    const routeCount=await p.evaluate(()=>window.__qaRouteChanges);await p.getByRole('button',{name:'Next Level',exact:true}).evaluate(e=>{e.click();e.click()});await expect(p).not.toHaveURL(/\/game\/3\/37$/);expect(await p.evaluate(()=>window.__qaRouteChanges)-routeCount).toBe(1);
    await record({kind:'victory',game:'conversion_canyon',profile:name,realShipments:5,accuracy:'100%',xp:105,stars:3,nextSingleActivation:true,pass:true});await c.close();
    c=await context(h,w);p=await c.newPage();await p.goto(`${base}/game/7/24`);await p.locator('[data-scale-scene]').waitFor();await ready(p);await dismiss(p);
    const fields=p.locator('.scale-dimension-fields input');for(const n of[2,3,4]){await fields.nth(0).fill(String(n));await fields.nth(1).fill(String(n));await p.getByRole('button',{name:'Check lengths',exact:true}).tap();await p.waitForTimeout(120)}
    await resultReady(p,'gameover');await geometry(p,'[data-result-outcome]');await capture(p,`retry-${name}`);await expect(p.getByRole('button',{name:'Practise This Skill',exact:true})).toBeVisible();
    await p.getByRole('button',{name:'Retry',exact:true}).tap();await expect(p.locator('[data-result-outcome]')).toHaveCount(0);await expect(p.locator('[data-scale-scene]')).toHaveAttribute('data-scale-mistakes','0');
    await record({kind:'retry',game:'scale_builder',profile:name,realIncorrectChecks:3,resetMistakes:0,pass:true});await c.close();
  }
  await record({kind:'suite',section,pass:true,completedAt:new Date().toISOString()});
}finally{await browser.close()}
