import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/vision-implementation';
const catalog=JSON.parse(await readFile(output+'/catalog.json','utf8'));
const filter=new Set((process.env.LEGEND_QA_KEYS||'').split(',').filter(Boolean));
const jobs=catalog.filter(g=>(!filter.size||filter.has(g.key))&&(!process.env.LEGEND_QA_TIER||String(g.tier)===process.env.LEGEND_QA_TIER||g.island===8));
const width=Number(process.env.LEGEND_QA_WIDTH||568),height=Number(process.env.LEGEND_QA_HEIGHT||320);
const rows=[];
process.env.LEGEND_QA_FETCH_FIXTURE='1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
async function worker(){while(jobs.length){
 const game=jobs.shift();const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);const page=await context.newPage();page.setDefaultTimeout(30000);
 const row={...game,width,height,passed:false};
 try{
  await page.goto(base+game.route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<4;i++){const intro=(await page.locator('[data-dialog-primary]:visible').elementHandles())[0];if(intro)await intro.click().catch(async error=>{if(await intro.isVisible().catch(()=>false))throw error;});await page.waitForTimeout(160);}
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(game.key==='ratio_fractions'?3200:600);
  await page.screenshot({path:`${output}/controls-${width}-${game.key}-${game.tier}.png`});
  const controls=page.locator('[data-game-set] button:visible:not(:disabled),[data-game-set] input:visible,[data-game-set] summary:visible');
  row.count=await controls.count();row.blocked=[];
  for(let i=0;i<row.count;i++){
   const control=controls.nth(i);
   const measure=()=>control.evaluate(n=>{const r=n.getBoundingClientRect();const dynamic=n.matches('.zombies-target,[aria-label^="Pop number"]');const points=dynamic?[.25,.5,.75]:[.5];const hit=points.some(x=>points.some(y=>n.contains(document.elementFromPoint(r.x+r.width*x,r.y+r.height*y))));return {label:n.getAttribute('aria-label')||n.textContent?.trim().slice(0,60),hit,width:r.width,height:r.height,top:r.top,bottom:r.bottom};});
   let m=await measure();
   if(!m.hit){await control.scrollIntoViewIfNeeded({timeout:1500}).catch(()=>{});m=await measure();}
   if(!m.hit)row.blocked.push(m);
  }
  assert.ok(row.count>0,'At least one gameplay control is available');
  assert.deepEqual(row.blocked,[],'Every displayed gameplay control is reachable');
  row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${output}/controls-${width}-${game.key}-${game.tier}-failure.png`}).catch(()=>{});}
 rows.push(row);console.log(`${row.passed?'PASS':'FAIL'} ${game.key} ${game.tier}${row.blocked?.length?' '+JSON.stringify(row.blocked):''}`);
 await writeFile(output+`/controls-${width}${filter.size?'-focused':''}-report.json`,JSON.stringify(rows,null,2));await context.close();
}}
try{await Promise.all(Array.from({length:Number(process.env.LEGEND_QA_WORKERS||2)},()=>worker()));}finally{await browser.close();}
assert.ok(rows.every(r=>r.passed),`${rows.filter(r=>!r.passed).length} control checks failed`);
