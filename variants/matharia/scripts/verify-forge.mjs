import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/fraction_forge';await mkdir(out,{recursive:true});const rows=[];
const profiles=[['reference',844,390,1844/844],['compact',667,375,1],['phone',844,390,1],['large-phone',932,430,1],['ipad',1024,768,1]];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
async function ready(page){
 await page.goto('http://127.0.0.1:3017/game/2/15');await page.locator('[data-fraction-forge]').waitFor();
 for(let i=0;i<6;i++){await page.waitForTimeout(80);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.tap();await page.waitForFunction(n=>!n.isConnected,e)}
 await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(e=>e.dataset.visionReady==='true'));
 await page.waitForFunction(()=>{let e=document.querySelector('[data-game-set]');while(e){if(Number(getComputedStyle(e).opacity)<.99)return false;e=e.parentElement}return true});await page.waitForTimeout(250);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
}
async function recipe(page,wantCorrect){
 const cards=await page.locator('[data-forge-ingredient]').evaluateAll(nodes=>nodes.map(n=>{const a=n.getAttribute('aria-label').match(/Add (\d+)(?: over (\d+))?/);return{id:n.dataset.forgeIngredient,n:Number(a[1]),d:Number(a[2]||1)}}));
 const op=(await page.locator('.forge-operator').innerText()).trim(),target=(await page.locator('[data-forge-target]').innerText()).split('/').map(Number),tn=target[0],td=target[1]||1;
 for(const a of cards)for(const b of cards){if(a.id===b.id)continue;if(op==='×'&&(a.n>=a.d||b.n>=b.d))continue;if(op==='÷'&&(a.n>=a.d||b.d!==1))continue;
  const [n,d]=op==='×'?[a.n*b.n,a.d*b.d]:op==='÷'?[a.n*b.d,a.d*b.n]:[a.n*b.d+(op==='-'?-1:1)*b.n*a.d,a.d*b.d];
  if((n*td===tn*d)===wantCorrect)return[a,b];
 }throw Error('No '+(wantCorrect?'correct':'incorrect')+' legal pair');
}
async function place(page,pair){for(const c of pair)await page.locator(`[data-forge-ingredient="${c.id}"]`).tap()}
async function strike(page){await page.getByRole('button',{name:'Strike',exact:true}).tap()}
for(const engine of (process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const [profile,width,height,deviceScaleFactor] of profiles.filter(p=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(p[0]))){
  const row={engine,profile,width,height,deviceScaleFactor,checks:[],kind:'browser viewport; native iOS unverified'};rows.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));let seed=72419;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  try{
   await ready(page);row.geometry=await page.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON(),q=document.querySelector('[data-question-copy]'),r=document.createRange();r.selectNodeContents(q);const t=r.getBoundingClientRect(),p=q.closest('[data-concept-panel]').getBoundingClientRect();
    const cards=[...document.querySelectorAll('[data-forge-ingredient]')].map(e=>{const b=e.getBoundingClientRect();return{w:b.width,h:b.height,hit:document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('button')===e}});
    return{question:p.toJSON(),target:box('.forge-target'),rack:box('.forge-rack'),recipe:box('.forge-recipe'),nav:box('[data-testid="shared-bottom-hud"]'),cards,textContained:t.left>=p.left&&t.right<=p.right&&t.top>=p.top&&t.bottom<=p.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1,gate:!!document.querySelector('[data-gameplay-orientation-gate]')};
   });
   assert(row.geometry.cards.length===7,'Expected source tier-5 bank of seven ingots');assert(row.geometry.cards.every(c=>c.w>=43.8&&c.h>=43.8),'Ingot target below 44px');assert(row.geometry.cards.every(c=>c.hit),'A layer intercepts an ingot');assert(row.geometry.textContained,'Question text escapes its padded panel');assert(!row.geometry.overflow&&!row.geometry.gate,'Scrolling or wrong orientation');
   row.screenshot=`${engine}-${profile}.png`;await page.screenshot({path:`${out}/${row.screenshot}`});row.checks.push('seven live ingots, 44px targets, unobstructed hit points, contained question, landscape without scrolling');
   const pair=await recipe(page,true);await page.locator(`[data-forge-ingredient="${pair[0].id}"]`).tap();assert(await page.getByRole('button',{name:'Strike',exact:true}).isDisabled(),'Strike enabled before both moulds are filled');await page.getByRole('button',{name:'Clear the anvil',exact:true}).tap();assert(await page.locator('[data-forge-slot]:disabled').count()===2,'Clear did not empty both moulds');row.checks.push('selection follows legal ingredient rules; Clear restores empty moulds');
   await place(page,await recipe(page,true));await strike(page);await page.waitForFunction(()=>document.querySelector('[data-fraction-forge]')?.getAttribute('data-strike-state')==='success');await page.screenshot({path:`${out}/${engine}-${profile}-correct.png`});await page.clock.runFor(300);
   await page.clock.runFor(1000);assert(await page.locator('.forge-progress [data-complete="true"]').count()===1,'Strike did not advance to the next commission');row.checks.push('correct recipe scores and advances to the next commission');
   if(profile==='phone'){
    await page.getByRole('button',{name:/how to play/i}).tap();await page.getByRole('dialog').filter({hasText:'For ×, multiply across.'}).waitFor();await page.screenshot({path:`${out}/${engine}-help.png`});await page.getByRole('button',{name:'Close help',exact:true}).tap();row.checks.push('existing Help retains exact source method tip');
    for(let i=0;i<3;i++){await place(page,await recipe(page,false));await strike(page);await page.waitForFunction(()=>document.querySelector('[data-fraction-forge]')?.getAttribute('data-strike-state')==='error');if(i===0)await page.screenshot({path:`${out}/${engine}-incorrect.png`});await page.clock.runFor(1100);if(i<2)await page.getByRole('button',{name:'Clear the anvil',exact:true}).tap()}
    await page.locator('[data-result-outcome="gameover"]').waitFor();await page.waitForTimeout(250);await page.screenshot({path:`${out}/${engine}-failure.png`});await page.getByRole('button',{name:'Retry',exact:true}).tap();await page.locator('[data-result-outcome]').waitFor({state:'detached'});await page.clock.runFor(200);assert(await page.locator('.legend-hud-lives').getAttribute('aria-label')==='3 of 3 lives remaining','Retry did not restore lives');row.checks.push('three wrong recipes consume lives and reach failure; Retry resets live round');
    for(let i=0;i<6;i++){await place(page,await recipe(page,true));await strike(page);await page.clock.runFor(1100)}
    assert(await page.locator('[data-result-outcome]').getAttribute('data-result-outcome')==='victory','Six real commissions did not reach victory');await page.waitForTimeout(250);await page.screenshot({path:`${out}/${engine}-victory.png`});row.checks.push('six solved commissions reach actual victory, stars and rewards');await page.getByRole('button',{name:'Map',exact:true}).tap();await page.locator('.screen-island-levels').waitFor();row.checks.push('existing Map destination remains connected');
   }
   assert(!errors.length,errors.join('\n'));row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/${engine}-${profile}-check-failure.png`}).catch(()=>{})}
  console.log(row.passed?'PASS':'FAIL',engine,profile,row.error||'');await context.close();await writeFile(`${out}/checks.json`,JSON.stringify(rows,null,2));
 }}finally{await browser.close()}
}console.log(JSON.stringify({passed:rows.filter(r=>r.passed).length,total:rows.length}));if(rows.some(r=>!r.passed))process.exitCode=1;
