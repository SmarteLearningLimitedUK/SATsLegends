import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const phase=process.env.QA_PHASE||'before',base=process.env.QA_BASE||'http://127.0.0.1:3025';
const out=`qa-artifacts/production-rebuild/${phase}`;await mkdir(out,{recursive:true});
const {games:catalog}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const profiles={compact:[320,568,667,375],standard:[390,844,844,390],large:[430,932,932,430],tablet:[768,1024,1024,768]};
const selected=(process.env.QA_PROFILES||(phase==='before'?'standard':'compact,standard,large,tablet')).split(',');
const keys=new Set((process.env.QA_KEYS||'').split(',').filter(Boolean));
const jobs=selected.flatMap(profile=>catalog.filter(game=>!keys.size||keys.has(game.key)).map(game=>{
 const [pw,ph,lw,lh]=profiles[profile];return {...game,profile,width:game.orientation==='portrait'?pw:lw,height:game.orientation==='portrait'?ph:lh};
}));
const browser=await chromium.launch(),results=[];
if(keys.size){try{const old=JSON.parse(await readFile(out+'/report.json'));results.push(...old.filter(row=>!keys.has(row.key)));}catch{}}
async function worker(){while(jobs.length){
 const job=jobs.shift(),context=await browser.newContext({viewport:{width:job.width,height:job.height},hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{
  let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const row={...job,phase,passed:false};
 try{
  await page.goto(base+job.route,{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'Start',exact:true}).click({timeout:30000});
  await page.locator('[data-game-set]').waitFor({timeout:30000});
  for(let i=0;i<5;i++){
   const intro=page.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;
   try{await intro.click({timeout:2000});}catch(error){if(await intro.count())throw error;}
   await page.waitForTimeout(250);
  }
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>{const n=document.querySelector('.app-screen-content');return n&&Number(getComputedStyle(n).opacity)>=.999;},{},{timeout:30000});
  await page.waitForTimeout(job.key==='ratio_fractions'?3300:500);
  row.geometry=await page.evaluate(auditLayout);
  row.presentation=await page.evaluate(()=>{
   const visible=n=>n.checkVisibility({checkVisibilityCSS:true,opacityProperty:true})&&n.getBoundingClientRect().width>0;
   const rect=n=>n.getBoundingClientRect().toJSON();
   return {scroll:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
    questions:[...document.querySelectorAll('[data-game-question]')].filter(visible).map(n=>({text:n.innerText,rect:rect(n),clipped:n.scrollHeight>n.clientHeight+3})),
    controls:[...document.querySelectorAll('[data-game-set] button,.legend-dock-button')].filter(n=>visible(n)&&!n.disabled).map(n=>({name:n.getAttribute('aria-label')||n.textContent.trim().slice(0,70),rect:rect(n),font:parseFloat(getComputedStyle(n).fontSize)})),
    fonts:[...document.querySelectorAll('.game-question-copy,.question-subtitle,.legend-hud-title')].filter(visible).map(n=>({text:n.textContent,size:parseFloat(getComputedStyle(n).fontSize)}))};
  });
  row.file=`${job.profile}-${job.key}.png`;await page.screenshot({path:out+'/'+row.file});
  row.errors=errors;row.passed=errors.length===0&&!row.presentation.scroll;
  console.log(row.passed?'CAPTURED':'REVIEW',job.profile,job.key);
 }catch(error){row.error=error.message;row.errors=errors;await page.screenshot({path:out+`/${job.profile}-${job.key}-failure.png`});console.log('FAILED',job.profile,job.key,error.message.split('\n')[0]);}
 results.push(row);await writeFile(out+'/report.json',JSON.stringify(results,null,2));await context.close();
}}
await Promise.all(Array.from({length:Number(process.env.QA_WORKERS||2)},()=>worker()));await browser.close();
console.log(JSON.stringify({phase,cases:results.length,captured:results.filter(r=>r.file).length,failed:results.filter(r=>!r.passed).length}));
if(results.some(r=>!r.passed))process.exitCode=1;
