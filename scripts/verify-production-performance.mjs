import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const {games}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const out='qa-artifacts/production-rebuild/performance',base=process.env.QA_BASE||'http://127.0.0.1:3025';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),rows=[];
const keys=new Set((process.env.QA_PERF_KEYS||'').split(',').filter(Boolean));
if(keys.size){try{rows.push(...JSON.parse(await readFile(out+'/report.json')).rows.filter(row=>!keys.has(row.key)));}catch{}}
try{for(const key of ['welcome','prime_pop','maths_vs_zombies','ratio_fractions'].filter(key=>!keys.size||keys.has(key)))for(const motion of ['no-preference','reduce']){
 const game=games.find(g=>g.key===key),portrait=!game||game.orientation==='portrait',context=await browser.newContext({viewport:portrait?{width:390,height:844}:{width:844,height:390},hasTouch:true,reducedMotion:motion});
 await installReleaseAccountFixture(context);await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 const page=await context.newPage(),row={key,motion,errors:[],passed:false};page.on('pageerror',e=>row.errors.push(e.message));
 try{
  await page.goto(base+(game?game.route:'/play'),{waitUntil:'domcontentloaded'});
  if(game){await page.getByRole('button',{name:'Start',exact:true}).click({timeout:30000});await page.locator('[data-game-set]').waitFor();for(let i=0;i<5;i++){const b=page.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click().catch(async e=>{if(await b.count())throw e;});await page.waitForTimeout(160);}}
  else await page.locator('.production-welcome').waitFor();
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1200);await page.bringToFront();
  row.rendering=await page.evaluate(async()=>{
   const times=[];let previous=performance.now();
   for(let n=0;n<120;n++)await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now-previous);previous=now;resolve();}));
   const sorted=times.slice(1).sort((a,b)=>a-b);
   return {frameSamples:sorted.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],framesOver50ms:sorted.filter(n=>n>50).length,
    domElements:document.querySelectorAll('*').length,brokenImages:[...document.images].filter(n=>n.complete&&n.naturalWidth===0).map(n=>n.currentSrc),
    resourceBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+(r.encodedBodySize||0),0),
    runningAnimations:document.getAnimations().filter(a=>a.playState==='running').length};
  });
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  row.chromiumMetrics=(await cdp.send('Performance.getMetrics')).metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents'].includes(m.name));
  expect(row.rendering.brokenImages).toEqual([]);expect(row.errors).toEqual([]);
  if(key==='welcome'&&motion==='reduce')expect(await page.locator('.production-welcome-mote').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
  row.passed=true;
 }catch(error){row.error=error.message;}
 rows.push(row);await context.close();await writeFile(out+'/report.json',JSON.stringify({scope:'Desktop Chromium sampling, not an iOS frame-rate or GPU/texture-memory certification.',rows},null,2));console.log(row.passed?'PASS':'FAIL','rendering sample',key,motion,row.error||'');
}}finally{await browser.close();}
if(rows.some(r=>!r.passed))process.exitCode=1;
