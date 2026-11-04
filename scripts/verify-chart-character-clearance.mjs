import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const output='qa-artifacts/chart-character-clearance';
await mkdir(output,{recursive:true});
const games=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8')).filter(g=>['graph_grabber','line_graph_lab'].includes(g.key));
const profiles=[{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320}];
const jobs=profiles.flatMap(profile=>['barratt','bran','mochi','vex'].flatMap(hero=>games.map(game=>({profile,hero,game}))));
const browser=await chromium.launch(),results=[];
async function worker(){while(jobs.length){
 const {profile,hero,game}=jobs.shift(),context=await browser.newContext({viewport:profile});
 await installReleaseAccountFixture(context);
 await context.addInitScript(avatarId=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId,level:100,playerName:'Character clearance QA'}));
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100},revision:1},requests:{}}));
 },hero);
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://127.0.0.1:3012/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);
  await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<4;i++){
   await page.waitForTimeout(150);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;
   const n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);
  }
  await page.locator('.vision-companion--stage [data-vision-ready="true"]').waitFor();
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
  const visibility=await page.evaluate(()=>{
   const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
   const actor=document.querySelector('.vision-companion--stage .original-hero-canvas');
   const a=rect(actor),panels=[...document.querySelectorAll('.graph-grabber-board,.graph-grabber-answers,.line-graph-plot,.line-graph-side,[data-game-question]')];
   const overlaps=panels.filter(n=>{const b=rect(n);return Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;}).map(n=>n.className);
   const clips=[];
   for(let n=actor.parentElement;n;n=n.parentElement){const b=rect(n),s=getComputedStyle(n);if(/hidden|clip|auto|scroll/.test(s.overflowX)&& (a.x<b.x-1||a.right>b.right+1))clips.push(n.className);if(/hidden|clip|auto|scroll/.test(s.overflowY)&&(a.y<b.y-1||a.bottom>b.bottom+1))clips.push(n.className);}
   return {actor:a,overlaps,clips,visible:actor.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}),hero:actor.closest('[data-original-hero]').dataset.originalHero};
  });
  assert.equal(visibility.hero,hero);assert.equal(visibility.visible,true);
  assert.deepEqual(visibility.overlaps,[],'Full animated character canvas is clear of chart/question/answer surfaces');
  assert.deepEqual(visibility.clips,[],'No ancestor clips the character canvas');
  assert.ok(visibility.actor.height>=90&&visibility.actor.width>=90,'Character remains visible at phone size');
  const layout=await page.evaluate(auditLayout);assert.deepEqual(layout.issues,[]);assert.equal(layout.overflow,false);
  assert.deepEqual(errors,[]);
  if(hero==='vex')await page.screenshot({path:`${output}/${profile.name}-${game.key}.png`});
  results.push({game:game.key,hero,profile:profile.name,passed:true,visibility,layout});console.log('PASS',game.key,hero,profile.name);
 }catch(error){await page.screenshot({path:`${output}/failure.png`});throw error;}
 finally{await context.close();}
}}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();await writeFile(`${output}/verification.json`,JSON.stringify({passed:results.length===24,results},null,2));}
