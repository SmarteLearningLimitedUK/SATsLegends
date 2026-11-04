import {chromium,webkit} from '@playwright/test';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const requested=(process.env.MATHARIA_GAMES||'match3_equivalence,prime_pop,fraction_forge').split(',');
const manifest=JSON.parse(await readFile('docs/concept-recreation/approved-screens.json','utf8'));
const referenceStates=JSON.parse(await readFile('variants/matharia/reference/reference-states.json','utf8')).states;
const base=process.env.MATHARIA_REVIEW_URL||'http://127.0.0.1:3017';
async function sourceFiles(dir){const entries=await readdir(dir,{withFileTypes:true}),files=[];for(const e of entries){const p=dir+'/'+e.name;if(e.isDirectory())files.push(...await sourceFiles(p));else if(/\.(tsx?|css)$/.test(e.name))files.push(p)}return files}
const sourceHash=createHash('sha256');for(const p of [...await sourceFiles('variants/matharia/src'),'variants/matharia/presentation-transform.ts','variants/matharia/vite.config.ts',...await sourceFiles('src')].sort()){sourceHash.update(p);sourceHash.update(await readFile(p))}const revision=sourceHash.digest('hex');const buildHash=createHash('sha256');for(const f of (await readdir('dist-matharia/assets')).filter(n=>/\.(js|css)$/.test(n)).sort()){buildHash.update(f);buildHash.update(await readFile('dist-matharia/assets/'+f))}const runningBuildRevision=buildHash.digest('hex');
for(const engine of (process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const game of manifest.screens.filter(s=>requested.includes(s.key))){
  const portrait=game.orientation==='portrait',[rw,rh]=game.dimensions,seed=Number(process.env.MATHARIA_SEED||(referenceStates[game.key]?.seed||72419));
  let refWidth=portrait?390:844,scale=rw/refWidth,refHeight=Math.round(rh/scale);
  for(const delta of [0,1,-1,2,-2,3,-3,4,-4]){const w=(portrait?390:844)+delta,s=rw/w,h=Math.round(rh/s);if(Math.round(h*s)===rh){refWidth=w;scale=s;refHeight=h;break}}
  const profiles=[['reference',refWidth,refHeight,scale],['compact',...(portrait?[375,667]:[667,375]),1],['phone',...(portrait?[390,844]:[844,390]),1],['large-phone',...(portrait?[430,932]:[932,430]),1],['ipad',...(portrait?[768,1024]:[1024,768]),1]];
  const out=`qa-artifacts/concept-recreation/${game.key}`;await mkdir(out,{recursive:true});
  const selectedProfiles=process.env.MATHARIA_PROFILES?.split(','),rows=selectedProfiles?await readFile(`${out}/${engine}-visual-captures.json`,'utf8').then(JSON.parse).then(r=>r.filter(x=>!selectedProfiles.includes(x.profile))).catch(()=>[]):[];
  for(const [profile,width,height,deviceScaleFactor] of profiles.filter(p=>!selectedProfiles||selectedProfiles.includes(p[0]))){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(seed=>{if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}},seed);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});await page.clock.install();
   const row={engine,profile,width,height,deviceScaleFactor,renderedFrom:base,referenceRaster:game.dimensions,sourceRevision:revision,workspaceSourceRevision:revision,runningBuildRevision,capturedAt:new Date().toISOString(),seed:seed};rows.push(row);
   try{
    await page.goto(base+game.route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').waitFor();for(let i=0;i<6;i++){await page.waitForTimeout(80);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const node=await b.elementHandle();await b.tap();await page.waitForFunction(n=>!n.isConnected,node)}
    if(referenceStates[game.key]?.checkpointSeed!==undefined){await page.evaluate(({key,seed,index})=>{const k=Object.keys(sessionStorage).find(k=>k.startsWith(`sats-legends-mock-checkpoint-v4:${key}:`));if(!k)throw Error('Original paper checkpoint missing');const old=JSON.parse(sessionStorage.getItem(k));sessionStorage.setItem(k,JSON.stringify({...old,seed,index:index??0,deadline:Date.now()+(key==='crystal_core'?1800:2400)*1000,answers:{},workpad:{},draft:[],draftWorkpad:''}));},{key:game.key,seed:referenceStates[game.key].checkpointSeed,index:referenceStates[game.key].checkpointIndex});await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-sats-phase="play"]').waitFor();}
    await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.querySelectorAll('[data-artwork-ready]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height}).every(e=>e.dataset.artworkReady==='true'));await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(e=>e.dataset.visionReady==='true'));
    await page.waitForFunction(()=>{let e=document.querySelector('[data-game-set]');while(e){if(Number(getComputedStyle(e).opacity)<.99)return false;e=e.parentElement}return true});await page.waitForTimeout(250);await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
    if(referenceStates[game.key]?.elapsedMs){await page.clock.runFor(referenceStates[game.key].elapsedMs);row.comparisonElapsedMs=referenceStates[game.key].elapsedMs;}
    row.representativeState=await page.evaluate(()=>({question:document.querySelector('[data-question-copy]')?.textContent,choices:[...document.querySelectorAll('[data-mine-answer],[data-ops-choice],[data-formula-choice],[data-lava-answer],[data-race-answer]')].map(e=>e.textContent?.trim())}));
    row.geometry=await page.evaluate(()=>{const e=document.querySelector('.vision-world-backdrop'),r=document.querySelector('[data-game-set]').getBoundingClientRect();return{stage:r.toJSON(),backgroundFit:getComputedStyle(e).objectFit,backgroundPosition:getComputedStyle(e).objectPosition,questionContained:(()=>{const q=document.querySelector('[data-question-copy]');if(!q)return null;const r=document.createRange();r.selectNodeContents(q);const t=r.getBoundingClientRect(),b=q.closest('[data-concept-panel]').getBoundingClientRect();return t.x>=b.x-.6&&t.right<=b.right+.6&&t.y>=b.y-.6&&t.bottom<=b.bottom+.6})(),gate:!!document.querySelector('[data-gameplay-orientation-gate]'),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
    if(row.geometry.gate||row.geometry.overflow||row.geometry.questionContained===false||errors.length)throw Error(errors.join('\n')||'Orientation, overflow or question containment');
    row.screenshot=`visual-${engine}-${profile}.png`;await page.screenshot({path:`${out}/${row.screenshot}`});
    if(profile==='reference'&&game.key==='prime_pop'){await page.clock.runFor(3000);row.comparisonElapsedMs=3000;row.comparisonScreenshot=`visual-${engine}-reference-playing.png`;await page.screenshot({path:`${out}/${row.comparisonScreenshot}`})}
    row.passed=true;
   }catch(e){row.passed=false;row.error=e.stack;row.consoleErrors=errors;await page.screenshot({path:`${out}/${engine}-${profile}-capture-failure.png`}).catch(()=>{})}
   await context.close();console.log(row.passed?'CAPTURE':'FAIL',game.key,engine,profile,row.error||'');
  }await writeFile(`${out}/${engine}-visual-captures.json`,JSON.stringify(rows,null,2));
 }}finally{await browser.close()}
}
