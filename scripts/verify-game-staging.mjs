import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const registry=await readFile('src/games/miniGameRegistry.tsx','utf8');const ids=Object.fromEntries([...registry.matchAll(/(\w+): asMiniGame\('([^']+)'/g)].map(m=>[m[1],m[2]]));
const stagingSource=await readFile('src/games/gameStaging.ts','utf8');for(const id of Object.values(ids))assert.ok(stagingSource.includes(`${id}:set(`),`No staging for registered game ${id}`);
execFileSync(process.execPath,['scripts/verify-five-tier-difficulty.mjs'],{env:{...process.env,LEGEND_DIFFICULTY_SAMPLES:'20'},stdio:'pipe'});
const coverage=JSON.parse(await readFile('qa-artifacts/five-tier-difficulty/report.json','utf8')).currentRouteCoverage;
const routes=new Map();for(const r of coverage)if(!routes.has(r.registryKey)||r.routeId<routes.get(r.registryKey).routeId)routes.set(r.registryKey,r);
for(const key of [...routes.keys()])if(process.env.GAME_STAGING_KEYS&&!process.env.GAME_STAGING_KEYS.split(',').includes(key))routes.delete(key);
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4180';await mkdir('qa-artifacts/game-staging',{recursive:true});const browser=await chromium.launch();const report=[];
try{for(const [name,width,height] of [['desktop',1440,900],['phone',390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:process.env.GAME_STAGING_REDUCED?'reduce':'no-preference'});let errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [key,r] of routes){errors=[];try{
  await page.goto(`${base}/game/${r.islandId}/${r.routeId}`);await page.locator('[data-game-set]').waitFor({timeout:20000});
  for(let i=0;i<3;i++){const intro=page.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;try{await intro.click({timeout:4000});}catch(e){if(await intro.count())throw e;}await page.waitForTimeout(350);}
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
  await page.locator(`[data-game-set="${ids[key]}"]`).waitFor();
  const checks=await page.evaluate(()=>{
   const host=document.querySelector('[data-game-set]');const fixture=host.querySelector('[data-stage-fixture]'),surface=host.querySelector('[data-stage-surface]');
   const box=fixture?.getBoundingClientRect();const dock=document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
   const questions=[...host.querySelectorAll('[data-game-question]')].filter(n=>n.getBoundingClientRect().height>0);
   const blocked=[...host.querySelectorAll('button:not(:disabled)')].filter(n=>{if(n.closest('[role="dialog"]'))return false;const b=n.getBoundingClientRect();if(b.width<1||b.height<1)return false;const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return !n.contains(hit);}).map(n=>n.getAttribute('aria-label')||n.textContent.trim().slice(0,35));
   return{id:host.dataset.gameSet,name:host.dataset.stageName,native:host.dataset.stageNative==='true',fixture:!!fixture,surface:!!surface,box:box&&{width:box.width,height:box.height},surfaceBox:surface&&{width:surface.getBoundingClientRect().width,height:surface.getBoundingClientRect().height},questions:questions.length,blocked,overflow:document.documentElement.scrollWidth>innerWidth,scenery:[...host.querySelectorAll('[data-game-scene-image]')].every(n=>n.complete&&n.naturalWidth>0)};
  });assert.equal(checks.id,ids[key]);assert.ok(checks.native||checks.fixture,`missing surface ${JSON.stringify(checks)}`);if(checks.fixture){assert.ok(checks.box.width<=checks.surfaceBox.width+30,JSON.stringify(checks));assert.ok(checks.box.height<=checks.surfaceBox.height+35,JSON.stringify(checks));assert.deepEqual(checks.blocked,[],JSON.stringify(checks));}assert.equal(checks.overflow,false,`overflow ${JSON.stringify(checks)}`);assert.equal(checks.scenery,true);assert.deepEqual(errors,[]);
  if(key==='GraphGrabberGame'){
   const running=()=>page.locator('.scene-effects').evaluateAll(nodes=>nodes.flatMap(n=>n.getAnimations({subtree:true})).filter(a=>a.playState==='running').length);
   assert.equal((await running())>0,!process.env.GAME_STAGING_REDUCED,'staging respects reduced motion');
   await page.getByRole('button',{name:'How to play'}).click();await page.waitForTimeout(180);assert.equal(await running(),0,'staging pauses with Help');await page.getByRole('button',{name:'Back to mission'}).click();await page.waitForTimeout(350);
  }
  await page.screenshot({path:`qa-artifacts/game-staging/${name}-${key}.png`});report.push({profile:name,key,route:`/game/${r.islandId}/${r.routeId}`,passed:true,...checks});console.log('PASS',name,key,checks.native?'existing scene':'new '+checks.name,checks.blocked.length?'blocked: '+checks.blocked.join(', '):'');
 }catch(e){await page.screenshot({path:`qa-artifacts/game-staging/${name}-${key}-failure.png`});report.push({profile:name,key,passed:false,error:e.message,errors});console.error('FAIL',name,key,e.message);}
 }await page.close();
}}finally{await browser.close();await writeFile(`qa-artifacts/game-staging/report${process.env.GAME_STAGING_REDUCED?'-reduced':process.env.GAME_STAGING_KEYS?'-focused':''}.json`,JSON.stringify(report,null,2));}
assert.ok(report.every(r=>r.passed),'staging audit failures');
