import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {auditQuestionAlignment} from './qa/question-alignment-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out='qa-artifacts/hero-activity-staging';
const catalog=JSON.parse(await readFile(out+'/catalog.json','utf8'));
const games={area_architect:'blueprint',rotation_relay:'guide',coordinates_quest:'navigate',conversion_canyon:'carry'};
const profiles=[{name:'desktop',width:1920,height:1080},{name:'phone',width:844,height:390}];
const jobs=profiles.flatMap(profile=>['barratt','bran','mochi','vex'].flatMap(avatar=>Object.entries(games).map(([key,pose])=>({profile,avatar,key,pose}))));
jobs.push({profile:profiles[1],avatar:'bran',key:'area_architect',pose:'blueprint',reduced:true});
jobs.push({profile:profiles[1],avatar:'vex',key:'conversion_canyon',pose:'carry',fallback:true});
const selected=new Set((process.env.HERO_QA_KEYS||'').split(',').filter(Boolean));
if(selected.size)jobs.splice(0,jobs.length,...jobs.filter(j=>selected.has(j.key)));
const expected=jobs.length,reportName=selected.size?'cast-verification-focused.json':'cast-verification.json';
const browser=await chromium.launch(),results=[];
await mkdir(out+'/cast',{recursive:true});
async function worker(){while(jobs.length){
 const job=jobs.shift(),{profile,avatar,key,pose,reduced,fallback}=job;
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:reduced?'reduce':'no-preference'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(({avatar,fallback})=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:avatar,level:100,playerName:'Hero staging QA'}));
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:avatar,level:100},revision:1},requests:{}}));
  if(fallback){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};}
 },{avatar,fallback});
 const page=await context.newPage(),errors=[],row={...job,passed:false};page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},catalog.find(g=>g.key===key).route);
  await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<6;i++){await page.waitForTimeout(160);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);}
  const actor=page.locator('.vision-companion--stage [data-original-hero]');
  await actor.waitFor();await page.waitForFunction(()=>document.querySelector('.vision-companion--stage [data-original-hero]')?.dataset.visionReady==='true');
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  assert.equal(await actor.count(),1,'One helper in the scene');assert.equal(await actor.getAttribute('data-original-hero'),avatar);assert.equal(await actor.getAttribute('data-vision-art-pose'),pose);
  row.layout=await page.evaluate(auditLayout);assert.equal(row.layout.overflow,false);// Coordinate labels deliberately sit beside intersections inside their enlarged invisible hit areas.
  row.unexpectedIssues=row.layout.issues.filter(i=>!(key==='coordinates_quest'&&i.b?.startsWith('Marker at x=')&&['label-control','label-outside-owner'].includes(i.kind)));
  assert.deepEqual(row.unexpectedIssues,[]);
  row.alignment=await page.evaluate(auditQuestionAlignment);assert(row.alignment.cards.every(c=>Math.abs(c.offset)<1));
  const bounds=await actor.boundingBox();assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=profile.width+1&&bounds.y+bounds.height<=profile.height+1,'Helper fits in viewport');
  const blocked=await page.locator('[data-game-set] button:visible:not(:disabled)').evaluateAll(nodes=>nodes.filter(n=>{const b=n.getBoundingClientRect();return !n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}).map(n=>n.textContent));assert.deepEqual(blocked,[],'Helper artwork never blocks gameplay controls');
  if(fallback){assert.equal(await actor.getAttribute('data-vision-playback'),'continuous-fallback');assert.equal(await actor.locator('svg image').count(),1);}
  else {const before=Number(await actor.getAttribute('data-vision-time'));await page.waitForTimeout(250);const after=Number(await actor.getAttribute('data-vision-time'));if(reduced)assert.equal(after,0);else assert(after>before,'Continuous pose animation advances');}
  if(key==='coordinates_quest'&&avatar==='barratt'){
   const prompt=await page.locator('.question-subtitle').innerText(),start=prompt.match(/\((-?\d+),\s*(-?\d+)\)/);let x=Number(start[1]),y=Number(start[2]);
   for(const m of prompt.matchAll(/Move (\d+) (left|right|up|down)/g)){const n=Number(m[1]);if(m[2]==='left')x-=n;if(m[2]==='right')x+=n;if(m[2]==='up')y+=n;if(m[2]==='down')y-=n;}
   await page.locator(`[data-coordinate-x="${x}"][data-coordinate-y="${y}"]`).click();await page.waitForFunction(()=>document.querySelector('[data-coordinate-feedback]')?.dataset.coordinateFeedback==='correct');row.correctCoordinateSelection=true;
  }
  row.file=`cast/${profile.name}-${avatar}-${pose}${reduced?'-reduced':fallback?'-fallback':''}.png`;
  await page.screenshot({path:out+'/'+row.file});
  await page.evaluate(()=>{history.pushState({},'','/map');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-qa-screen="world_map"]').waitFor();assert.equal(await page.locator('.vision-companion--stage').count(),0,'Helper removed on exit');assert.deepEqual(errors,[]);
  row.passed=true;
 }catch(e){row.error=e.message;await page.screenshot({path:`${out}/cast/failure-${profile.name}-${avatar}-${pose}.png`}).catch(()=>{});}
 results.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,avatar,pose,row.error||'');await context.close();
}}
try{await Promise.all(Array.from({length:2},worker));}finally{await browser.close();await writeFile(out+'/'+reportName,JSON.stringify({passed:results.length===expected&&results.every(r=>r.passed),results},null,2));}
assert(results.length===expected&&results.every(r=>r.passed),'All hero staging cases pass');
