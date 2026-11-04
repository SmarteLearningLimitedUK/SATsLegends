import {chromium,webkit} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.MATHARIA_REVIEW_URL||'http://127.0.0.1:3015',assert=(v,m)=>{if(!v)throw Error(m)};
const profiles=[['reference',845,391,1844/845],['compact',667,375,1],['phone',844,390,1],['large-phone',932,430,1],['ipad',1024,768,1]];
const selected=process.env.MATHARIA_PROFILES?.split(','),games=process.env.MATHARIA_GAMES?.split(',');
async function ready(p,route,selector){
 await p.goto(base+route,{waitUntil:'domcontentloaded'});await p.locator(selector).waitFor();
 for(let i=0;i<6;i++){await p.waitForTimeout(80);const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.tap();await p.waitForFunction(e=>!e.isConnected,e)}
 await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await p.waitForTimeout(300);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+100));
}
async function geometry(p,controls){return p.evaluate(sel=>{
 const fits=(e,b)=>{const r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect(),p=b.getBoundingClientRect();return t.left>=p.left-.6&&t.right<=p.right+.6&&t.top>=p.top-.6&&t.bottom<=p.bottom+.6};
 return{question:fits(document.querySelector('[data-question-copy]'),document.querySelector('[data-concept-panel]')),buttons:[...document.querySelectorAll(sel+',.legend-dock-button,.concept-pause')].filter(e=>e.getBoundingClientRect().width>0).map(b=>{const r=b.getBoundingClientRect();return{label:b.textContent.trim(),w:r.width,h:r.height,x:r.x,right:r.right,y:r.y,bottom:r.bottom,hit:b.disabled||document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b,text:fits(b,b)}}),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
 },controls)}
function checkGeometry(g,w,h){assert(g.question&&!g.overflow&&g.buttons.every(b=>b.w>=43.5&&b.h>=43.5&&b.x>=-.6&&b.y>=-.6&&b.right<=w+.6&&b.bottom<=h+.6&&b.hit&&b.text),'Question, control, text, viewport or hit-test geometry failed: '+JSON.stringify(g))}
async function pause(p,selector,attribute){
 const q=await p.locator(selector).getAttribute(attribute);await p.getByRole('button',{name:'Pause game',exact:true}).tap();const time=await p.locator('.legend-hud-streak').innerText();await p.clock.runFor(1800);assert(await p.locator(selector).getAttribute(attribute)===q&&await p.locator('.legend-hud-streak').innerText()===time,'Paused question or original shared timer moved');await p.getByRole('button',{name:'Resume',exact:true}).tap();
}
async function areaAnswer(p,correct=true){
 const count=await p.locator('[data-area-board] svg rect[width="24"][height="24"]').count();assert(count>0,'No live blue unit squares');const values=await p.locator('[data-area-answer]:enabled').evaluateAll(es=>es.map(e=>+e.dataset.areaAnswer)),value=values.find(v=>(v===count)===correct);assert(value!==undefined,'No independently counted area answer');await p.locator(`[data-area-answer="${value}"]`).tap();return count;
}
const parsePoints=s=>s.trim().split(/\s+/).map(v=>v.split(',').map(Number));
function movement(s){let dx=0,dy=0;for(const m of s.matchAll(/(\d+)\s+squares?\s+(left|right|up|down)/g)){const n=+m[1];if(m[2]==='left')dx-=n;else if(m[2]==='right')dx+=n;else if(m[2]==='up')dy+=n;else dy-=n}return[dx,dy]}
async function transformation(p,correct=true,{drag=false}={}){
 const info=await p.locator('[data-transformation-game]').evaluate(e=>({mode:e.dataset.transformMode,text:document.querySelector('[data-question-copy]').textContent,source:e.querySelector('polygon[fill="#37bfe13b"]').getAttribute('points'),gold:e.querySelector('polygon[fill="#ffc85c40"]')?.getAttribute('points'),mirror:e.querySelector('path[stroke="#ff9eb9"]')?.getAttribute('d'),ticks:[...e.querySelectorAll('.rs-grid>g')].filter(g=>g.querySelector('path')).map(g=>({n:+g.querySelector('text').textContent,d:g.querySelector('path').getAttribute('d')}))}));
 const source=parsePoints(info.source),ns=info.ticks.map(t=>t.n),min=Math.min(...ns),max=Math.max(...ns),step=320/(max-min);let targets;
 if(info.mode==='describe'){
  const gold=parsePoints(info.gold),dx=Math.round((gold[0][0]-source[0][0])/step),dy=Math.round((source[0][1]-gold[0][1])/step),options=await p.locator('.rs-choices>button').evaluateAll(es=>es.map((e,i)=>({i,label:e.textContent})));const option=options.filter(o=>/squares? (left|right|up|down)/.test(o.label)).find(o=>{const v=movement(o.label);return(v[0]===dx&&v[1]===dy)===correct});assert(option,'No independent translation-description option');await p.locator('.rs-choices>button').nth(option.i).tap();return info.mode;
 }
 if(!correct)targets=[[200,200],[200,200],[200,200]];
 else if(info.mode==='reflect'){
  const vertical=info.mirror.match(/^M\s+([\d.-]+)\s+35\s+V/),horizontal=info.mirror.match(/^M\s+35\s+([\d.-]+)\s+H/);assert(vertical||horizontal,'No visible reflection line');targets=source.map(([x,y])=>vertical?[2*+vertical[1]-x,y]:[x,2*+horizontal[1]-y]);
 }else{const[dx,dy]=movement(info.text);assert(dx||dy,'No translation in original instruction');targets=source.map(([x,y])=>[x+dx*step,y-dy*step])}
 for(let i=0;i<targets.length;i++){
  const xy=await p.locator('.rs-grid').evaluate((e,xy)=>{const p=new DOMPoint(...xy).matrixTransform(e.getScreenCTM());return{x:p.x,y:p.y}},targets[i]);
  if(drag&&i===0){const b=await p.locator('.rs-vertices>button').nth(i).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(xy.x,xy.y,{steps:8});await p.mouse.up()}
  else{await p.locator('.rs-vertices>button').nth(i).tap();await p.touchscreen.tap(xy.x,xy.y)}
 }
 assert(await p.getByRole('button',{name:'Check image',exact:true}).isEnabled(),'Three corners did not enable marking');await p.getByRole('button',{name:'Check image',exact:true}).tap();return info.mode;
}

for(const[key,route,selector,controls]of [['area_architect','/game/3/22','[data-area-game]','[data-area-answer],.area-next'],['rotation_relay','/game/3/27','[data-transformation-game]','.rs-vertices>button,.rs-actions>button,.rs-choices>button,.rs-feedback>button,.transformation-cursor-toggle']].filter(g=>!games||games.includes(g[0]))){
 const out=`qa-artifacts/concept-recreation/${key}`;await mkdir(out,{recursive:true});const rows=selected?await readFile(out+'/checks.json','utf8').then(JSON.parse).then(rs=>rs.filter(r=>!selected.includes(r.profile))).catch(()=>[]):[];
 for(const engine of ['chromium','webkit']){const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();try{for(const[profile,width,height,deviceScaleFactor]of profiles.filter(p=>!selected||selected.includes(p[0]))){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);await context.addInitScript(()=>{let s=72419;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}});const p=await context.newPage(),errors=[],row={engine,profile,width,height,checks:[],kind:'browser-only; native iOS unverified'};rows.push(row);p.on('pageerror',e=>errors.push(e.message));await p.clock.install();
  try{
   await ready(p,route,selector);row.geometry=await geometry(p,controls);checkGeometry(row.geometry,width,height);await p.screenshot({path:`${out}/${engine}-${profile}.png`});
   if(key==='area_architect'){
    await areaAnswer(p,false);assert(await p.locator('.area-feedback[data-tone="error"]').count()===1,'Wrong-area explanation missing');assert(await p.locator('[data-area-wrong="true"]:disabled').count()===1,'Wrong choice can be activated again');assert(await p.locator('.legend-hud-lives').getAttribute('aria-label')==='2 of 3 lives remaining','Wrong-area life missing');await p.screenshot({path:`${out}/${engine}-${profile}-incorrect.png`});await areaAnswer(p);assert(await p.locator('[data-area-game]').getAttribute('data-area-solved')==='true','Independent tile count marked incorrect');await pause(p,selector,'data-area-question');await p.screenshot({path:`${out}/${engine}-${profile}-correct.png`});row.checks.push('live SVG unit-square count; wrong answer locks only that option, explanation and life; correct feedback, pause/resume');
    await p.locator('.area-next').evaluate(b=>{b.click();b.click()});assert(await p.locator(selector).getAttribute('data-area-round')==='2','Double activation skipped a room');
    if(profile==='phone'){
     await areaAnswer(p,false);await areaAnswer(p,false);await p.clock.runFor(700);await p.locator('[data-result-outcome="gameover"]').waitFor();await p.getByRole('button',{name:'Retry',exact:true}).tap();await p.clock.runFor(500);await p.locator('[data-result-outcome]').waitFor({state:'detached'});assert(await p.locator(selector).getAttribute('data-area-round')==='1','Retry did not reset area progression');row.checks.push('original three-life failure and Retry resets rooms');
    }
    for(let n=0;n<5&&await p.locator('[data-area-answer]:enabled').count();n++){await areaAnswer(p);await p.locator('.area-next').tap();await p.clock.runFor(40)}await p.locator('[data-result-outcome="victory"]').waitFor();row.checks.push('single next activation; five original rooms; victory and rewards');
   }else{
    if(profile==='phone'){await p.clock.runFor(95000);await p.locator('[data-result-outcome="gameover"]').waitFor();await p.getByRole('button',{name:'Retry',exact:true}).tap();await p.clock.runFor(500);await p.locator('[data-result-outcome]').waitFor({state:'detached'});row.checks.push('no-attempt timed failure and Retry')}
    await p.getByRole('button',{name:'Hint',exact:true}).tap();assert(await p.locator('.transformation-hint').isVisible(),'Original hint missing');await p.getByRole('button',{name:'Close transformation hint',exact:true}).tap();
    await p.getByRole('button',{name:'Cursor',exact:true}).tap();await p.getByRole('button',{name:'Move cursor right',exact:true}).tap();await p.getByRole('button',{name:'Place A′',exact:true}).tap();assert(await p.locator('.rs-vertices>button').first().locator('small').innerText()==='(1, 0)','Cursor placement not connected');await p.getByRole('button',{name:'Close cursor controls',exact:true}).tap();await p.getByRole('button',{name:'Clear',exact:true}).tap();await p.locator('.rs-grid').focus();await p.keyboard.press('ArrowUp');await p.keyboard.press('Enter');assert((await p.locator('.rs-vertices>button').first().innerText()).includes('(1, 1)'),'Keyboard placement not connected');await p.getByRole('button',{name:'Clear',exact:true}).tap();row.checks.push('original hint, clear, selected corners, cursor/D-pad placement and keyboard controls');
    row.modes=[];for(let n=0;n<4;n++){
     const correct=n!==1,mode=await transformation(p,correct,{drag:n===0});if(!row.modes.includes(mode))row.modes.push(mode);assert(await p.locator(selector).getAttribute('data-transform-feedback')===(correct?'correct':'incorrect'),'Independent visible transformation marked incorrectly');await p.screenshot({path:`${out}/${engine}-${profile}-${correct?'correct':'incorrect'}.png`});checkGeometry(await geometry(p,controls),width,height);if(n===0)await pause(p,selector,'data-transform-question');await p.getByRole('button',{name:'Next mission',exact:true}).tap();await p.clock.runFor(200);
    }assert(await p.locator(selector).getAttribute('data-transform-correct')==='3','Actual score/correct state lost');assert(await p.locator('.legend-hud-lives').getAttribute('aria-label')==='2 of 3 lives remaining','Wrong transformation did not consume life');await p.clock.runFor(95000);await p.locator('[data-result-outcome="victory"]').waitFor();row.checks.push('independently solved translation/reflection/description; real vertex dragging and Check; wrong explanation/life; next mission, pause/resume, original timed victory');
   }
   await p.screenshot({path:`${out}/${engine}-${profile}-victory.png`});await p.clock.runFor(500);await p.getByRole('button',{name:'Map',exact:true}).tap();await p.locator('.screen-island-levels').waitFor();assert(!errors.length,errors.join('\n'));row.checks.push('real results and Map destination');row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;await p.screenshot({path:`${out}/${engine}-${profile}-failure.png`}).catch(()=>{})}console.log(row.passed?'PASS':'FAIL',key,engine,profile,row.error||'');await context.close();await writeFile(out+'/checks.json',JSON.stringify(rows,null,2));
 }}finally{await browser.close()}}if(rows.some(r=>!r.passed))process.exitCode=1;
}
