import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/navigation',rows=[];
await mkdir(out,{recursive:true});
for(const engine of (process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const[profile,width,height]of[['compact',375,667],['phone',390,844],['landscape',844,390],['ipad',768,1024]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await installReleaseAccountFixture(context);await context.addInitScript(()=>{localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{revision:1,progression:{},player:{avatarId:'barratt',level:100,xp:15000,coins:5000,unlockedIslands:[1,2,3,4,5,6,7,8],levelStars:{'1-1':3}}},requests:{}}))});
  const page=await context.newPage(),errors=[],row={engine,profile,width,height,kind:'Actual navigation and isolated account fixture; browser only'};rows.push(row);page.on('pageerror',e=>errors.push(e.message));
  const map=async()=>{await page.goto('http://127.0.0.1:3015/map');await page.locator('[data-matharia-map]').waitFor();await page.waitForFunction(()=>document.fonts.status==='loaded')};
  try{
   await map();const scroll=page.getByRole('region',{name:'Islands of Matharia'});row.islands=[];
   const ids=await page.locator("[data-map-island-position]").evaluateAll(es=>es.map(e=>+e.dataset.mapIslandPosition));
   for(const [position,i]of ids.entries()){
    await scroll.evaluate((e,n)=>{e.scrollTop=(n-1)*e.clientHeight},position+1);await expect.poll(()=>scroll.evaluate(e=>Math.round(e.scrollTop/e.clientHeight)+1)).toBe(position+1);
    const island=page.locator(`[data-map-island-position="${i}"]`);await expect(island.getByRole('button',{name:'Explore Island',exact:true})).toBeEnabled();
    const bounds=await scroll.evaluate(e=>{const r=e.getBoundingClientRect();return [...e.children].map(c=>{const b=c.getBoundingClientRect();return {id:c.dataset.mapIslandPosition,portion:Math.max(0,Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top))/r.height}}).filter(c=>c.portion>.8)});
    if(bounds.length!==1||+bounds[0].id!==i)throw Error('Map must show one primary island: '+JSON.stringify(bounds));
    row.islands.push({id:i,title:await island.getByRole('heading').innerText(),visible:bounds});
    await island.getByRole('button',{name:'Explore Island',exact:true}).tap();await page.waitForURL(`**/island/${i}`);await page.locator('.screen-island-levels').waitFor();
    await page.getByRole('button',{name:'Back',exact:true}).tap();await page.waitForURL('**/map');await page.locator('[data-matharia-map]').waitFor();
   }
   for(const[label,route,selector]of[['Open player profile','/profile','.player-profile-arcade'],['Open achievements','/achievements',null],['Open Calm Grove','/wellbeing','[data-wellbeing-activity="hub"]']]){
    await page.getByRole('button',{name:label,exact:true}).tap();await page.waitForURL('**'+route);if(selector)await page.locator(selector).waitFor();await page.getByRole('button',{name:'Back',exact:true}).tap();await page.waitForURL('**/map');
   }
   await page.getByRole('button',{name:'Open parent portal',exact:true}).tap();await expect.poll(()=>page.url()).toContain('/parent');
   await page.screenshot({path:`${out}/parent-${engine}-${profile}-flow.png`});await map();
   row.geometry=await page.locator('[data-matharia-map]').evaluate(e=>({rootScroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,view:e.getBoundingClientRect().toJSON()}));
   if(row.geometry.rootScroll)throw Error('Map page scroll escapes its island viewport');if(errors.length)throw Error(errors.join(';'));
   row.passed=true;row.checks=['all8 original island destinations and Back','one visible island at each scroll position','profile, rewards, Calm Grove, parent destinations; no live account writes','no document scrolling outside map viewport'];
  }catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/navigation-${engine}-${profile}-failure.png`}).catch(()=>{})}
  console.log(row.passed?'PASS':'FAIL',engine,profile,row.error||'');await writeFile(out+'/checks.json',JSON.stringify(rows,null,2));await context.close();
 }}finally{await browser.close()}
}
if(rows.some(r=>!r.passed))process.exitCode=1;
