import {chromium,webkit} from 'playwright';
import {resolve} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditQuestionAlignment} from './qa/question-alignment-audit.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {auditPresentation,samplePresentationMotion} from './qa/presentation-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012',out=process.env.LEGEND_CAPTURE_OUTPUT||'qa-artifacts/current-game-screenshots';
await mkdir(out,{recursive:true});
const browser=process.env.LEGEND_CAPTURE_BROWSER==='webkit'
 ? await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')})
 : await chromium.launch(),results=[];
const selectedKeys=new Set((process.env.LEGEND_CAPTURE_KEYS||'').split(',').filter(Boolean));
if(selectedKeys.size){const previous=JSON.parse(await readFile(out+'/manifest.json','utf8'));results.push(...previous.results.filter(row=>!selectedKeys.has(row.key)));}
let profiles=process.env.LEGEND_CAPTURE_EXTENDED==='1'
 ? [{name:'desktop',width:1920,height:1080},{name:'laptop',width:1366,height:768},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}]
 : [{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390}];
if(process.env.LEGEND_CAPTURE_PROFILES)profiles=profiles.filter(p=>process.env.LEGEND_CAPTURE_PROFILES.split(',').includes(p.name));
async function contextFor(profile,avatarId='barratt'){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'no-preference'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(avatarId=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId,level:100,playerName:'Screenshot review'}));
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100},revision:1},requests:{}}));
 },avatarId);return context;
}
let catalog;
try{
 const context=await contextFor(profiles[0]),page=await context.newPage();
 await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
 const all=await page.evaluate(async()=>{
  const {ISLANDS}=await import('/src/constants.ts');
  return ISLANDS.flatMap(island=>island.levels.map(level=>({key:level.blueprintKey,island:island.id,islandName:island.name,levelId:level.id,title:level.displayName,route:`/game/${island.id}/${level.id}`,tier:level.isPractice?'practice':level.miniGameLevel||'paper'})));
 });
 const byKey=new Map();
 for(const game of all){const previous=byKey.get(game.key);if(!previous||Number(game.tier)>Number(previous.tier)||previous.tier==='practice')byKey.set(game.key,game);}
 catalog=[...byKey.values()].sort((a,b)=>a.island-b.island||a.levelId-b.levelId);
 await writeFile(out+'/catalog.json',JSON.stringify(catalog,null,2));await context.close();
 const jobs=profiles.flatMap(profile=>catalog.filter(game=>!selectedKeys.size||selectedKeys.has(game.key)).map(game=>({game,profile})));
 async function worker(){while(jobs.length){
  const {game,profile}=jobs.shift(),avatarId=['barratt','bran','mochi','vex'][(game.island-1)%4],context=await contextFor(profile,avatarId),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const row={...game,avatarId,profile:profile.name,width:profile.width,height:profile.height,file:`${profile.name}/${game.key}.png`,captured:false};
  try{
   await mkdir(out+'/'+profile.name,{recursive:true});
   await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
   await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);
   await page.locator('[data-game-set]').waitFor();
   for(let i=0;i<6;i++){
    await page.waitForTimeout(180);
    const dialog=page.locator('[role="dialog"]:visible').last();if(!await dialog.count())break;
    const button=dialog.locator('[data-dialog-primary]').first();if(!await button.count())break;
    const node=await dialog.elementHandle();await button.click();await page.waitForFunction(n=>!n.isConnected,node);
   }
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>[...document.images].every(n=>n.complete));
   await page.waitForFunction(()=>[...document.querySelectorAll('.vision-character')].filter(n=>n.checkVisibility({checkVisibilityCSS:true})).every(n=>n.dataset.visionReady!=='false'),null,{timeout:12000});
   if(game.key==='ratio_fractions')await page.waitForFunction(()=>document.querySelector('[data-race-scene]')?.dataset.raceState==='showingQuestion');
   // Recharts animates its custom crate bars after the chart has measured.
   if(game.key==='graph_grabber')await page.waitForTimeout(1800);
   await page.waitForTimeout(700);
   await page.locator('[data-game-set]').waitFor();
   row.layout=await page.evaluate(auditLayout);
   if(process.env.LEGEND_CAPTURE_ALIGNMENT==='1')row.questionAlignment=await page.evaluate(auditQuestionAlignment);
   if(process.env.LEGEND_CAPTURE_CONTENT==='1')row.questionText=await page.locator('[data-question-copy]').allInnerTexts();
   if(process.env.LEGEND_CAPTURE_PRESENTATION==='1')row.presentation=await page.evaluate(auditPresentation);
   await page.screenshot({path:out+'/'+row.file});row.captured=true;row.capturedAt=new Date().toISOString();
   if(process.env.LEGEND_CAPTURE_PRESENTATION==='1')row.motion=await samplePresentationMotion(page);
  }catch(error){row.error=error.message;await page.screenshot({path:out+'/'+profile.name+'/'+game.key+'-capture-error.png'}).catch(()=>{});}
  row.runtimeErrors=errors;results.push(row);console.log(row.captured?'CAPTURED':'FAILED',profile.name,game.title,row.error||'');
  await context.close();await writeFile(out+'/manifest.json',JSON.stringify({games:catalog.length,profiles,results},null,2));
 }}
 await Promise.all(Array.from({length:3},worker));
}finally{await browser.close();}
if(results.some(r=>!r.captured))process.exitCode=1;
console.log(JSON.stringify({games:catalog.length,screenshots:results.filter(r=>r.captured).length,errors:results.filter(r=>!r.captured).length}));
