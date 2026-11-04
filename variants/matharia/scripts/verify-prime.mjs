import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/prime_pop';await mkdir(out,{recursive:true});
const base=process.env.MATHARIA_REVIEW_URL||'http://127.0.0.1:3017',rows=[];
const profiles=[['reference',390,843,853/390],['compact',375,667,1],['phone',390,844,1],['large-phone',430,932,1],['ipad',768,1024,1]];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
const prime=n=>n>=2&&Array.from({length:Math.max(0,Math.floor(Math.sqrt(n))-1)},(_,i)=>i+2).every(d=>n%d);
async function ready(page){
 await page.goto(base+'/game/1/39');await page.locator('[data-game-set]').waitFor();
 for(let n=0;n<6;n++){await page.waitForTimeout(80);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.tap();await page.waitForFunction(n=>!n.isConnected,e);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(n=>n.dataset.visionReady==='true'));
 await page.waitForFunction(()=>{let n=document.querySelector('[data-game-set]');while(n){if(Number(getComputedStyle(n).opacity)<.99)return false;n=n.parentElement}return true});
 await page.waitForTimeout(350);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
}
async function bubbles(page){return page.locator('[aria-label^="Pop number "]').evaluateAll(nodes=>nodes.filter(n=>!n.disabled).map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label'),value:Number(n.textContent),x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===n}}));}
async function pop(page,wantPrime){
 for(let n=0;n<35;n++){
  const b=(await bubbles(page)).find(b=>prime(b.value)===wantPrime&&b.hit);if(b){await page.touchscreen.tap(b.x,b.y);return b;}
  if(!wantPrime)for(const primeBubble of (await bubbles(page)).filter(b=>prime(b.value)&&b.hit))await page.touchscreen.tap(primeBubble.x,primeBubble.y);
  await page.clock.runFor(350);
 }throw Error('No visible representative '+(wantPrime?'prime':'composite'));
}
for(const engine of (process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const [profile,width,height,deviceScaleFactor] of profiles.filter(p=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(p[0]))){
  const row={engine,profile,width,height,deviceScaleFactor,kind:'browser viewport; native iOS unverified',checks:[]};rows.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));let seed=72419;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  try{
   await ready(page);row.geometry=await page.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON(),q=document.querySelector('[data-question-copy]'),p=q.closest('[data-concept-panel]').getBoundingClientRect(),range=document.createRange();range.selectNodeContents(q);const t=range.getBoundingClientRect();
    const field=document.querySelector('[data-prime-pop-field]').getBoundingClientRect(),d=document.querySelector('[data-prime-pop-danger]').getBoundingClientRect();
    return{stage:box('.concept-stage'),question:p.toJSON(),field:field.toJSON(),dangerCentre:d.y+d.height/2,dangerThresholdPercent:(d.y+d.height/2-field.y)/field.height*100,nav:box('[data-testid="shared-bottom-hud"]'),textContained:t.x>=p.x&&t.y>=p.y&&t.right<=p.right&&t.bottom<=p.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,gate:!!document.querySelector('[data-gameplay-orientation-gate]'),iconOffsets:[...document.querySelectorAll('.legend-dock-button')].map(b=>{const r=b.getBoundingClientRect(),i=b.querySelector('img,svg').getBoundingClientRect();return Math.abs((r.left+r.right-i.left-i.right)/2)})};
   });
   assert(row.geometry.textContained,'Question escapes its frame');assert(!row.geometry.overflow&&!row.geometry.gate,'Scroll or orientation failure');assert(Math.abs(row.geometry.dangerThresholdPercent-12)<.1,'Danger rail disagrees with source 12% threshold');assert(row.geometry.iconOffsets.every(n=>n<1),'Off-centre navigation icon');
   const targets=await bubbles(page);assert(targets.length>=4,'Missing live bubbles');assert(targets.every(b=>b.w>=44&&b.h>=44),'Bubble touch target below 44px');assert(targets.every(b=>b.hit),'A decorative layer intercepts a bubble');row.checks.push('live readable bubbles, 44px targets, unobstructed input, 12% danger coordinate, contained question, no scrolling, centred navigation');
   row.screenshot=`${engine}-${profile}.png`;await page.screenshot({path:`${out}/${row.screenshot}`});
   await page.getByRole('button',{name:'Pause game',exact:true}).tap();await page.getByRole('dialog',{name:'Game paused'}).waitFor();const before=await bubbles(page),clock=await page.locator('.legend-hud-streak').innerText();await page.clock.runFor(1500);assert(await page.locator('.legend-hud-streak').innerText()===clock,'Clock moved while paused');assert(JSON.stringify(await bubbles(page))===JSON.stringify(before),'Bubbles moved while paused');await page.screenshot({path:`${out}/${engine}-${profile}-paused.png`});await page.getByRole('button',{name:'Resume',exact:true}).tap();await page.clock.runFor(1200);assert(await page.locator('.legend-hud-streak').innerText()!==clock,'Clock did not resume');row.checks.push('pause freezes countdown and bubble input/movement; resume restores countdown');
   await pop(page,true);await page.waitForFunction(()=>document.querySelector('[data-stage-cue]')?.getAttribute('data-stage-cue')==='reward');assert((await page.locator('.prime-pop-feedback').innerText()).includes('+'),'Correct pop has no score feedback');await page.screenshot({path:`${out}/${engine}-${profile}-correct.png`});row.checks.push('real prime tap produces source score and feedback');
   if(profile==='phone'){
    await pop(page,false);await page.waitForFunction(()=>document.querySelector('.legend-hud-lives')?.getAttribute('aria-label')==='2 of 3 lives remaining');await page.screenshot({path:`${out}/${engine}-incorrect.png`});row.checks.push('composite tap updates real lives and error feedback');
    await page.clock.runFor(400);await pop(page,false);await page.clock.runFor(400);await pop(page,false);await page.clock.runFor(400);await page.locator('[data-result-outcome="gameover"]').waitFor();await page.waitForTimeout(350);await page.screenshot({path:`${out}/${engine}-failure.png`});await page.getByRole('button',{name:'Retry',exact:true}).tap();await page.locator('[data-result-outcome]').waitFor({state:'detached'});await page.locator('[data-prime-pop-field]').waitFor();await page.clock.runFor(400);assert((await bubbles(page)).length>=4,'Retry did not restart bubbles');assert(await page.locator('.legend-hud-lives').getAttribute('aria-label')==='3 of 3 lives remaining','Retry did not reset lives');row.checks.push('failure and Retry return to live game with restored lives');
    let pops=0;
    for(let n=0;n<130&&!await page.locator('[data-result-outcome]').count();n++){
     for(const b of (await bubbles(page)).filter(b=>prime(b.value)&&b.hit)){await page.touchscreen.tap(b.x,b.y);pops++;}
     await page.clock.runFor(500);
    }
    assert(await page.locator('[data-result-outcome]').getAttribute('data-result-outcome')==='victory','Real prime sequence did not reach timed victory');await page.screenshot({path:`${out}/${engine}-victory.png`});row.checks.push(`timed victory and rewards through ${pops} actual prime taps`);
    await page.getByRole('button',{name:'Map',exact:true}).tap();await page.locator('.screen-island-levels').waitFor();row.checks.push('existing Map destination and saved progression remain connected');
   }
   assert(!errors.length,errors.join('\n'));row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/${engine}-${profile}-failure-check.png`}).catch(()=>{});}
  await context.close();await writeFile(`${out}/checks.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',engine,profile,row.error||'');
 }}finally{await browser.close();}
}
console.log(JSON.stringify({passed:rows.filter(r=>r.passed).length,total:rows.length}));if(rows.some(r=>!r.passed))process.exitCode=1;
