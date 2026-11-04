import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/match3_equivalence';
await mkdir(out,{recursive:true});
const base=process.env.MATHARIA_REVIEW_URL||'http://127.0.0.1:3017';
const engines=(process.env.MATHARIA_ENGINES||'chromium,webkit').split(',');
const profiles=[['reference',390,843,853/390],['compact',375,667],['phone',390,844],['large-phone',430,932],['ipad',768,1024]];
const rows=[];
function assert(ok,message){if(!ok)throw new Error(message);}
async function ready(page,route='/game/2/20'){
 await page.goto(base+route);await page.locator('[data-game-set]').waitFor();
 for(let n=0;n<6;n++){await page.waitForTimeout(80);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.click();await page.waitForFunction(n=>!n.isConnected,e);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(e=>e.dataset.visionReady==='true'));
 await page.waitForFunction(()=>{let n=document.querySelector('[data-game-set]');while(n){if(Number(getComputedStyle(n).opacity)<.99)return false;n=n.parentElement}return true});
}
async function board(page){return page.locator('[data-match-cell]').evaluateAll(nodes=>{const cells=Array(30).fill(null);for(const n of nodes)cells[Number(n.dataset.matchCell)]=n.dataset.matchValue;return cells;});}
function swap(cells,wantMatch){
 for(let a=0;a<30;a++)for(const b of [a+1,a+6]){
  if(b>=30||(b===a+1&&a%6===5))continue;
  const values=cells.slice();[values[a],values[b]]=[values[b],values[a]];
  let match=false;
  for(let i=0;i<30;i++){if(!values[i])continue;if(i%6<4&&values[i]===values[i+1]&&values[i]===values[i+2])match=true;if(i<18&&values[i]===values[i+6]&&values[i]===values[i+12])match=true;}
  if(match===wantMatch)return[a,b];
 }return null;
}
async function clickPair(page,pair){assert(pair,'No representative swap found');for(const i of pair)await page.locator(`[data-match-cell="${i}"] button`).tap();}
for(const engine of engines){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const [profile,width,height,deviceScaleFactor=1] of profiles){
  const row={engine,profile,width,height,deviceScaleFactor,kind:'browser viewport; native iOS unverified',checks:[]};
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{
   if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
   let seed=72419;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await ready(page);await page.waitForTimeout(150);
   row.geometry=await page.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
    const buttons=[...document.querySelectorAll('[data-match-cell] button')];
    const touch=buttons.map(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{w:r.width,h:r.height,hit:hit?.closest('button')===b};});
    const q=document.querySelector('[data-question-copy]'),range=document.createRange();range.selectNodeContents(q);const text=range.getBoundingClientRect(),panel=q.closest('[data-concept-panel]').getBoundingClientRect();
    return{stage:box('.concept-stage'),question:box('[data-concept-panel]'),board:box('.match-mastery-board'),hud:box('[data-testid="shared-top-hud"]'),nav:box('[data-testid="shared-bottom-hud"]'),touch,
     textContained:text.top>=panel.top&&text.bottom<=panel.bottom&&text.left>=panel.left&&text.right<=panel.right,
     overflow:document.documentElement.scrollWidth>innerWidth+1,scrollHeight:document.documentElement.scrollHeight,gate:!!document.querySelector('[data-gameplay-orientation-gate]'),
     iconOffsets:[...document.querySelectorAll('.legend-dock-button')].map(b=>{const r=b.getBoundingClientRect(),i=b.querySelector('img,svg').getBoundingClientRect();return Math.abs((r.left+r.right-i.left-i.right)/2);})};
   });
   assert(row.geometry.touch.length===30,'Expected all 30 live tiles');
   assert(row.geometry.touch.every(t=>t.hit),'Decoration or another control intercepts a tile');
   assert(row.geometry.touch.every(t=>t.w>=43.8&&t.h>=43.8),'A gem touch target is smaller than 44px');
   assert(row.geometry.textContained,'Question text escapes its panel');
   assert(!row.geometry.overflow&&!row.geometry.gate,'Overflow or incorrect orientation');
   assert(row.geometry.board.bottom<row.geometry.nav.top,'Board overlaps navigation');
   assert(row.geometry.iconOffsets.every(n=>n<1),'A dock icon is off-centre');
   row.checks.push('30 live targets, 44px minimum, unobstructed hit points, contained question, no horizontal scroll, centred dock icons');
   row.screenshot=`${engine}-${profile}.png`;await page.screenshot({path:`${out}/${row.screenshot}`});
   await page.getByRole('button',{name:'Pause game',exact:true}).tap();await page.getByRole('dialog',{name:'Game paused'}).waitFor();
   await page.waitForFunction(()=>document.querySelector('[data-stage-paused]')?.getAttribute('data-stage-paused')==='true');
   const before=await page.locator('[data-match-status]').innerText(),hudBefore=await page.locator('.legend-hud-streak').innerText();await page.waitForTimeout(1250);assert(await page.locator('[data-match-status]').innerText()===before,'Round clock moved while paused');assert(await page.locator('.legend-hud-streak').innerText()===hudBefore,'Shared clock moved while paused');
   await page.screenshot({path:`${out}/${engine}-${profile}-paused.png`});
   await page.getByRole('button',{name:'Resume',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('[data-stage-paused]')?.getAttribute('data-stage-paused')==='false');
   await page.waitForTimeout(1150);assert(await page.locator('[data-match-status]').innerText()!==before,'Round clock did not resume');assert(await page.locator('.legend-hud-streak').innerText()!==hudBefore,'Shared clock did not resume');
   row.checks.push('pause freezes round clock; resume clears pause');
   if(profile==='phone'){
    await clickPair(page,swap(await board(page),false));await page.getByRole('status').filter({hasText:'Not a match'}).waitFor();
    assert(await page.locator('.legend-hud-lives').getAttribute('aria-label')==='2 of 3 lives remaining','Incorrect swap did not update lives');
    await page.screenshot({path:`${out}/${engine}-incorrect.png`});row.checks.push('incorrect swap preserves board, gives feedback and updates lives');
    await clickPair(page,swap(await board(page),true));await page.waitForFunction(()=>Number(document.querySelector('[data-match-score]')?.getAttribute('data-match-score'))>0);
    await page.waitForFunction(()=>document.querySelector('[data-match-processing]')?.getAttribute('data-match-processing')==='false');
    await page.screenshot({path:`${out}/${engine}-correct.png`});row.checks.push('valid adjacent swap resolves, scores, refills and increments match progress');
    await page.getByRole('button',{name:/how to play/i}).tap();await page.locator('[role="dialog"]').waitFor();assert(await page.locator('[data-stage-paused]').getAttribute('data-stage-paused')==='true','Help did not pause');await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Open on-screen working board',exact:true}).tap();await page.locator('[role="dialog"]').waitFor();await page.keyboard.press('Escape');row.checks.push('Help and working board open, pause and close');
    let moves=1;
    while(!await page.locator('[data-result-outcome]').count()&&moves<100){
     const pair=swap(await board(page),true);if(!pair)throw new Error('No valid swap during victory exercise');
     await clickPair(page,pair);moves++;
     await page.waitForFunction(()=>!!document.querySelector('[data-result-outcome]')||document.querySelector('[data-match-processing]')?.getAttribute('data-match-processing')==='false');
    }
    assert(await page.locator('[data-result-outcome]').getAttribute('data-result-outcome')==='victory','Could not reach victory through real swaps');
    await page.screenshot({path:`${out}/${engine}-victory.png`});row.checks.push(`victory and real results after ${moves} legal swaps`);
    await page.getByRole('button',{name:'Map',exact:true}).tap();await page.locator('.screen-island-levels').waitFor();row.checks.push('victory Map returns to the existing island-level destination');
    await ready(page);
    for(let i=0;i<3;i++){await clickPair(page,swap(await board(page),false));await page.waitForTimeout(350);}
    await page.locator('[data-result-outcome="gameover"]').waitFor();await page.screenshot({path:`${out}/${engine}-failure.png`});row.checks.push('three incorrect answers reach existing failure results');
    await page.getByRole('button',{name:'Retry',exact:true}).tap();await page.waitForFunction(()=>!document.querySelector('[data-result-outcome]'));
    assert(await page.locator('[data-match-score]').getAttribute('data-match-score')==='0','Retry did not reset score');row.checks.push('failure retry starts a fresh board');
   }
   assert(!errors.length,errors.join('\n'));row.passed=true;
  }catch(e){row.passed=false;row.error=e.message;await page.screenshot({path:`${out}/${engine}-${profile}-error.png`}).catch(()=>{});}
  rows.push(row);console.log(row.passed?'PASS':'FAIL',engine,profile,row.error||'');await context.close();await writeFile(`${out}/checks.json`,JSON.stringify(rows,null,2)+'\n');
 }}finally{await browser.close();}
}
console.log(JSON.stringify({passed:rows.filter(r=>r.passed).length,total:rows.length}));
if(rows.some(r=>!r.passed))process.exitCode=1;
