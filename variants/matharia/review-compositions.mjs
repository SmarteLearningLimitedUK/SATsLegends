import {chromium,webkit} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../scripts/qa/release-account-fixture.mjs';
import {compositionFor} from './src/compositions.ts';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const engine=process.env.MATHARIA_ENGINE||'chromium',profile=process.env.MATHARIA_PROFILE||'phone';
const out=`qa-artifacts/matharia-concepts/${profile}-${engine}`;await mkdir(out,{recursive:true});
const selected=(process.env.MATHARIA_GAMES||'').split(',').filter(Boolean);
const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8')).filter(g=>!selected.length||selected.includes(g.key));
const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
const results=[];
try{for(const game of catalog){
 const spec=compositionFor(game.key),portrait=spec.orientation==='portrait';
 const [width,height]=profile==='tablet'?(portrait?[768,1024]:[1024,768]):profile==='compact'?(portrait?[375,667]:[667,375]):portrait?[390,844]:[844,390];
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const row={key:game.key,title:game.title,route:game.route,reference:spec.reference,orientation:spec.orientation,width,height,engine};
 try{
  await p.goto((process.env.MATHARIA_REVIEW_URL||'http://127.0.0.1:3015')+game.route);await p.locator('[data-game-set]').waitFor();
  for(let i=0;i<6;i++){await p.waitForTimeout(100);const start=p.locator('[data-dialog-primary]:visible').last();if(!await start.count())break;const node=await start.elementHandle();await start.click();await p.waitForFunction(n=>!n.isConnected,node);}
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].every(n=>n.complete));
  await p.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(n=>n.getAttribute('data-vision-ready')==='true'),null,{timeout:10000});await p.waitForTimeout(300);
  row.geometry=await p.evaluate(()=>{
   const box=s=>{const n=document.querySelector(s);return n?n.getBoundingClientRect().toJSON():null};
   return {viewport:[innerWidth,innerHeight],gate:!!document.querySelector('[data-gameplay-orientation-gate]'),overflow:document.documentElement.scrollWidth>innerWidth+1,top:box('[data-testid="shared-top-hud"]'),bottom:box('[data-testid="shared-bottom-hud"]'),question:box('.concept-question-zone'),playfield:box('.concept-playfield'),hero:box('.concept-hero'),board:box('.match-mastery-board'),targets:document.querySelectorAll('[data-prime-bubble]').length,missing:[...document.images].filter(n=>!n.naturalWidth).map(n=>n.src)};
  });
  if(row.geometry.gate)throw Error('Wrong orientation gate');if(errors.length)throw Error(errors.join('\n'));
  row.file=`${game.key}.png`;await p.screenshot({path:`${out}/${row.file}`});row.passed=true;
 }catch(e){row.passed=false;row.error=e.message;await p.screenshot({path:`${out}/${game.key}-error.png`}).catch(()=>{});}
 results.push(row);console.log(row.passed?'CAPTURE':'FAIL',game.key,width,row.error||'');await context.close();await writeFile(`${out}/review.json`,JSON.stringify(results,null,2));
}}finally{await browser.close();}
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length}));
