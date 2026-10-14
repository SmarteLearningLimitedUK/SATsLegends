import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4180';
const inventory=JSON.parse(await readFile('qa-artifacts/game-staging/report.json','utf8')).filter(r=>r.profile==='desktop');
const annotated=new Set(['AngleArenaGame','AreaArchitectGame','ChangeCounterGame','ChronoDashGame','ConversionCanyonGame','CoordinatesQuestGame','BossEncounterGame','DataDetectiveGame','FactorFrenzyGame','FormulaForgeGame','FractionForgeGame','GraphGrabberGame','LavaPathGame']);
const jobs=inventory.filter(g=>!process.env.SCENE_KEYS||process.env.SCENE_KEYS.split(',').includes(g.key)).flatMap(g=>[[1304,884],[700,600],...(annotated.has(g.key)?[[320,568]]:[])].map(([width,height])=>({...g,width,height})));
await mkdir('qa-artifacts/scene-production',{recursive:true});
const browser=await chromium.launch();let next=0;const report=[];
async function worker(){while(next<jobs.length){const job=jobs[next++];const page=await browser.newPage({viewport:{width:job.width,height:job.height}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+job.route);await page.locator('[data-game-set]').waitFor({timeout:20000});
 for(let i=0;i<3;i++){const intro=page.getByRole('button',{name:'Start practice',exact:true}).or(page.locator('[data-dialog-primary]:visible')).first();if(!await intro.count())break;try{await intro.click({timeout:3000});}catch(e){if(await intro.count())throw e;}await page.waitForTimeout(400);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);
 const geometry=await page.evaluate(()=>{
  const root=document.querySelector('[data-game-set]');const dock=document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
  const buttons=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>!b.closest('details:not([open])')&&!b.closest('[role="dialog"]')&&b.getBoundingClientRect().width>0&&getComputedStyle(b).visibility!=='hidden');
  const scrollableMock=document.querySelector('.sats-mock-content');
  const scrolls=Boolean(scrollableMock&&getComputedStyle(scrollableMock).overflowY==='auto'&&scrollableMock.scrollHeight>scrollableMock.clientHeight);
  const deferred=buttons.filter(b=>scrolls&&scrollableMock.contains(b)&&b.getBoundingClientRect().bottom>(dock?.top??innerHeight)+2);
  const blocked=buttons.filter(b=>{if(deferred.includes(b))return false;const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !b.contains(hit)||r.bottom>(dock?.top??innerHeight)+2;}).map(b=>b.getAttribute('aria-label')||b.textContent.trim());
  const images=[...root.querySelectorAll('img[data-game-scene-image]')];
  return{blocked,deferred:deferred.length,overflow:document.documentElement.scrollWidth>innerWidth,images:images.map(i=>({src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0})),question:[...root.querySelectorAll('[data-game-question]')].map(q=>{const b=q.getBoundingClientRect();return{left:b.left,right:b.right,top:b.top,bottom:b.bottom};})};
 });
 assert.deepEqual(errors,[]);assert.equal(geometry.overflow,false);assert.ok(geometry.images.every(i=>i.loaded),'unloaded scenery');assert.deepEqual(geometry.blocked,[],JSON.stringify(geometry));
 assert.ok(geometry.question.every(q=>q.left>=-2&&q.right<=job.width+2&&q.top>=-2&&q.bottom<job.height),'clipped question');
 if(geometry.deferred){
   await page.mouse.move(job.width/2,job.height-150);await page.mouse.wheel(0,1000);await page.waitForTimeout(350);
   const reachable=await page.locator('.sats-response-actions button').evaluateAll(nodes=>nodes.every(b=>{const r=b.getBoundingClientRect(),dock=document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();return r.bottom<=dock.top+2&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
   assert.ok(reachable,'Mock response controls must receive input after native scrolling');
 }
 if(job.key==='GraphGrabberGame'&&job.width===1304){const tab=page.locator('.graph-shipment-tabs button').first();await tab.click();assert.equal(await tab.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.recharts-reference-line').count(),1);}
 await page.screenshot({path:`qa-artifacts/scene-production/${job.width}-${job.key}.png`});report.push({key:job.key,width:job.width,height:job.height,passed:true,...geometry});console.log('PASS',job.width,job.key);
}catch(e){await page.screenshot({path:`qa-artifacts/scene-production/${job.width}-${job.key}-failure.png`});report.push({key:job.key,width:job.width,height:job.height,passed:false,error:e.message});console.error('FAIL',job.width,job.key,e.message.slice(0,900));}
await page.close();}}
try{await Promise.all([worker(),worker(),worker()]);}finally{await browser.close();await writeFile(`qa-artifacts/scene-production/report${process.env.SCENE_KEYS?'-focused':''}.json`,JSON.stringify(report,null,2));}
assert.ok(report.every(r=>r.passed),'Scene production verification failures');
