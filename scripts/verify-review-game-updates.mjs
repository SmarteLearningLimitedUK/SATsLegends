import {webkit,chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../variants/matharia/scripts/qa-native-access.mjs';

const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3031';
const out=process.env.QA_OUTPUT||'qa-artifacts/review-game-updates';await mkdir(out,{recursive:true});
const catalogue=JSON.parse(await readFile('qa-artifacts/release-readiness-2026-11-04/catalogue.json','utf8'));
const wanted=process.env.QA_GAME_KEYS?.split(',');
const games=catalogue.levels.filter(game=>((!game.boss&&game.tier===Number(process.env.QA_TIER||1))||(game.boss&&process.env.QA_INCLUDE_PAPERS))&&!game.practice&&(!wanted||wanted.includes(game.key)));
const phone=process.env.QA_LARGE_PHONE?{portrait:{width:440,height:956},landscape:{width:956,height:440}}:{portrait:{width:390,height:844},landscape:{width:844,height:390}};
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),rows=[];
const audioBrowser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
if(wanted){try{rows.push(...JSON.parse(await readFile(`${out}/report.json`,'utf8')).filter(row=>!wanted.includes(row.game)));}catch{/* First focused check. */}}
async function fixture(avatar='barratt',muted=false,engine=browser){
 const context=await engine.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await installNativeAccessFixture(context);
 await context.addInitScript(({avatar,muted})=>{
  localStorage.setItem('matharia-ios-player-v1',JSON.stringify({playerName:'Review QA',avatarId:avatar,level:100,xp:0,unlockedIslands:[1,2,3,4,5,6,7,8]}));
  localStorage.setItem('matharia-ios-learning-consent-v1','true');
  localStorage.setItem('sats_mastery_muted',String(muted));
  localStorage.setItem('sats_mastery_music_enabled','false');
  window.__countdownLog=[];window.__countdownTicks=0;window.__qaHidden=false;
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__qaHidden});
  const audio=window.AudioContext||window.webkitAudioContext;
  if(audio){const create=audio.prototype.createOscillator;audio.prototype.createOscillator=function(){const oscillator=create.call(this),start=oscillator.start;oscillator.start=function(...args){if(document.querySelector('[data-game-start-countdown]'))window.__countdownTicks++;return start.apply(this,args);};return oscillator;};}
  new MutationObserver(()=>{const node=document.querySelector('[data-game-start-countdown]');if(!node)return;const digit=Number(node.dataset.gameStartCountdown);if(window.__countdownLog.at(-1)?.digit===digit)return;window.__countdownLog.push({digit,at:performance.now(),clock:document.querySelector('.concept-clock-value')?.textContent,lives:document.querySelector('.legend-hud-lives')?.getAttribute('aria-label'),inert:document.querySelector('.iphone-game-stage')?.inert});}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-game-start-countdown']});
 },{avatar,muted});
 await context.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(12000);
 return {context,page,errors};
}
async function load(page,game){
 await page.setViewportSize(phone[game.orientation==='portrait'?'portrait':'landscape']);
 await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
 await page.locator('[data-game-question]').first().waitFor({state:'attached',timeout:25000});
 for(let attempt=0;attempt<6;attempt++){const start=page.locator('[role="dialog"] [data-dialog-primary]:visible');if(await start.count())await start.last().click();else if(await page.locator('[data-game-start-countdown]').count())break;await page.waitForTimeout(200);}
 await expect(page.locator('[data-game-start-countdown="3"]')).toBeVisible();
}
async function finishCountdown(page){
 await expect(page.locator('[data-game-start-countdown="2"]')).toBeVisible();
 await expect(page.locator('[data-game-start-countdown="1"]')).toBeVisible();
 await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0);
 const log=await page.evaluate(()=>window.__countdownLog);
 expect(log.map(row=>row.digit)).toEqual([3,2,1]);
 expect(log.every(row=>row.inert)).toBe(true);
 expect(new Set(log.map(row=>row.clock)).size).toBe(1);
 expect(new Set(log.map(row=>row.lives)).size).toBe(1);
 expect(log[1].at-log[0].at).toBeGreaterThanOrEqual(850);
 expect(log[2].at-log[1].at).toBeGreaterThanOrEqual(850);
 return log;
}
async function fits(page,selector){
 const issues=await page.locator(selector).evaluateAll(nodes=>nodes.flatMap(node=>{const r=node.getBoundingClientRect();return r.width<43||r.height<43||r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1?[{text:node.textContent,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}]:[];}));
 expect(issues).toEqual([]);
}
async function recorded(page,key){
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')||'{"events":[]}').events.some(event=>event.gameKey===key),key)).toBe(true);
 return page.evaluate(key=>JSON.parse(localStorage.getItem('matharia-ios-learning-v1')).events.filter(event=>event.gameKey===key).at(-1),key);
}
try{
 for(const game of games){
  const {context,page,errors}=await fixture(),row={game:game.key,passed:false};
  try{
   await load(page,game);row.countdown=await finishCountdown(page);
   await expect(page.locator('[data-testid="shared-top-hud"] [data-hero-portrait="barratt"]')).toBeVisible();
   if(game.key==='rounding_rocket'){
    const buttons=page.locator('.rocket-answer-row>button');await expect(buttons).toHaveCount(3);await fits(page,'.rocket-answer-row>button');
    const value=Number(await page.locator('[data-rocket-question-value]').innerText()),target=Number(await page.locator('[data-rocket-question-target]').getAttribute('data-rocket-question-target'));
    await page.getByRole('button',{name:`Landing pad ${Math.round(value/target)*target}`,exact:true}).click();
    await expect(page.locator('[data-rocket-installed="1"]')).toBeVisible();expect((await recorded(page,game.key)).responseKind).toBe('recognition');
   }
   if(game.key==='number_line_ninja'){
    await expect(page.locator('.ninja-answer')).toHaveCount(4);await fits(page,'.ninja-answer');
    const answer=await page.locator('.ninja-marks').evaluate(node=>{const marks=[...node.querySelectorAll('[data-line-marker]')],known=marks.map((n,i)=>({i,text:n.querySelector('.ninja-value')?.textContent?.trim()})).filter(v=>v.text),[a,b]=known,focus=marks.findIndex(n=>n.querySelector('[data-number-line-missing]'));return String(Number(a.text)+(Number(b.text)-Number(a.text))/(b.i-a.i)*(focus-a.i));});
    const before=await page.locator('[data-number-line-question]').getAttribute('data-number-line-question');
    await page.locator('.ninja-answer').filter({hasText:new RegExp(`^${answer}$`)}).click();
    await expect(page.locator('[data-number-line-correct="1"]')).toBeVisible();
    await expect(page.locator('[data-number-line-question]')).not.toHaveAttribute('data-number-line-question',before);expect((await recorded(page,game.key)).responseKind).toBe('recognition');
   }
   if(game.key==='maths_vs_zombies'){
    await expect(page.locator('.zombies-answer-options>button')).toHaveCount(4);await fits(page,'.zombies-answer-options>button');
    const equation=await page.locator('[data-zombies-equation]').getAttribute('data-zombies-equation'),m=equation.match(/(-?\d+)\s*([+−×÷-])\s*(-?\d+)/);expect(m).not.toBeNull();
    const a=Number(m[1]),b=Number(m[3]),value=m[2]==='+'?a+b:m[2]==='×'?a*b:m[2]==='÷'?a/b:a-b;
    await page.locator('.zombies-answer-options>button').filter({hasText:new RegExp(`^${value}$`)}).click();expect((await recorded(page,game.key)).correct).toBe(true);
   }
   if(game.key==='angle_arena'){
    await expect(page.locator('.angle-known-diagram')).toHaveCount(0);
    await fits(page,'.angle-number-entry button');
    const misplaced=await page.locator('.angle-number-entry button').evaluateAll(nodes=>nodes.flatMap(node=>{const label=node.querySelector('span:not(.artwork-frame):not(.artwork-surface)');if(!label)return [];const r=node.getBoundingClientRect(),text=label.getBoundingClientRect();return text.top<r.top||text.bottom>r.bottom||text.left<r.left||text.right>r.right?[label.textContent]:[];}));expect(misplaced).toEqual([]);
    await page.getByRole('button',{name:'Show angle hint',exact:true}).click();await expect(page.getByRole('dialog',{name:'Angle hint'})).toBeVisible();await expect(page.locator('.angle-known-diagram')).toBeVisible();
    await page.getByRole('button',{name:'Close angle hint',exact:true}).click();await expect(page.locator('.angle-known-diagram')).toHaveCount(0);
    const field=page.getByRole('textbox',{name:'Missing angle (degrees)'});await expect(field).toHaveAttribute('readonly','');await expect(field).toHaveAttribute('inputmode','none');
    const known=Number((await page.locator('[data-game-question]').innerText()).match(/(\d+)°/)[1]);for(const digit of String(180-known))await page.getByRole('group',{name:'Angle number pad',exact:true}).getByRole('button',{name:digit,exact:true}).click();
    await expect(field).toHaveValue(String(180-known));
   }
   if(game.key==='match3_equivalence'){
    const labels=await page.locator('.match-concept-gem>span').allTextContents();expect(labels.some(value=>value.includes('/'))).toBe(true);expect(labels.some(value=>value.includes('.'))).toBe(true);expect(labels.some(value=>value.includes('%'))).toBe(true);
    expect(labels.every(value=>['1/2','0.5','50%','1/4','0.25','25%','3/4','0.75','75%','1/5','0.2','20%','4/4','1','100%'].includes(value))).toBe(true);
   }
   if(game.key==='rotation_relay'){
    await expect(page.getByRole('button',{name:'Cursor',exact:true})).toHaveCount(0);expect(await page.locator('.transformation-corner-status').innerText()).not.toMatch(/\d.*of.*3/);await fits(page,'.rs-vertices>button,.rs-actions>button');
   }
   if(game.key==='coordinates_quest'){
    const labels=await page.locator('.coordinate-tick').evaluateAll(nodes=>nodes.map(node=>({x:node.style.left,y:node.style.top,axis:node.classList.contains('coordinate-tick-x')?'x':'y'})));
    expect(labels.every(label=>label.axis==='x'?label.y==='88%':label.x==='12%')).toBe(true);await expect(page.locator('.coordinate-origin')).toHaveCount(0);
   }
   if(game.key==='conversion_canyon')expect(await page.locator('.conversion-scale-art text').allTextContents()).toEqual(['0','MASS']);
   if(game.key==='perimeter_path')await expect(page.getByRole('button',{name:'Edges',exact:true})).toHaveCount(0);
   if(game.key==='polygon_palace'||game.key==='data_detective'){
    await expect(page.locator('[data-testid="shared-top-hud"] [role="timer"]')).toHaveCount(0);
    await page.clock.install();await page.clock.fastForward(120000);
    await expect(page.locator('[data-result-outcome]')).toHaveCount(0);
    await expect(page.locator('[data-game-question]').first()).toBeVisible();row.noTimeoutFailure=true;
   }
   if(game.key==='graph_grabber'){
    await expect(page.locator('.shipment-chart button')).toHaveCount(0);await expect(page.getByRole('button',{name:'Trace',exact:true})).toHaveCount(0);
    await expect(page.locator('.graph-answers [data-independent-answer-trigger]')).toHaveCount(1);
   }
   if(game.key==='mean_machine'){
    await page.getByRole('button',{name:'Scan the power cells',exact:true}).click();await expect(page.locator('[data-mean-phase="answering"]')).toBeVisible();
    const clipped=await page.locator('.mean-live-reel[data-reel-active="true"]>span').evaluateAll(nodes=>nodes.flatMap(node=>{const r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();return r.left<p.left+1||r.right>p.right-1||r.top<p.top+1||r.bottom>p.bottom-1?[node.textContent]:[];}));expect(clipped).toEqual([]);
    await fits(page,'.mean-scan,.mean-answers>button');
   }
   if(game.key==='scale_builder'){
    await fits(page,'.scale-number-pad>button,.scale-live-actions>button,.scale-dimension-fields input');
    await expect(page.getByRole('textbox',{name:'New length',exact:true})).toHaveAttribute('readonly','');
   }
   if(game.key==='ratio_fractions'){
    const overflow=await page.locator('.ratio-racer-question,.race-fuel-legend').evaluateAll(nodes=>nodes.flatMap(node=>{const r=node.getBoundingClientRect(),p=node.closest('.race-live-fuel').getBoundingClientRect();return r.left<p.left+8||r.right>p.right-8||r.top<p.top+8||r.bottom>p.bottom-8?[node.textContent]:[];}));expect(overflow).toEqual([]);
    const contacts=await page.locator('.race-live-kart>svg').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),contact=Number(node.dataset.kartGroundFrac),parent=node.parentElement.getBoundingClientRect();return Math.abs((box.top+box.height*contact)-parent.bottom);}));expect(contacts.every(delta=>delta<1)).toBe(true);
   }
   if(game.boss){
    const field=page.locator('.sats-fields input[readonly]').first();
    if(await field.count()){
     await expect(field).toHaveAttribute('inputmode','none');await field.click();
     const pad=page.getByRole('dialog',{name:/^Answer pad:/});await expect(pad).toBeVisible();
     await pad.getByRole('button',{name:'7',exact:true}).click();await expect(field).toHaveValue('7');
     await pad.getByRole('button',{name:'Done',exact:true}).click();row.paperPad=true;
    }
   }
   const input=page.locator('[data-independent-answer-trigger]:enabled').first();
   if(await input.count()){
    await input.click();const dialog=page.getByRole('dialog').last();await expect(dialog.locator('.sats-mini-number-pad')).toBeVisible();await fits(page,'.sats-mini-number-pad button');
    await expect(dialog.getByRole('textbox').first()).toHaveAttribute('readonly','');await expect(dialog.getByRole('textbox').first()).toHaveAttribute('inputmode','none');await page.screenshot({path:`${out}/${game.key}-answer-pad.png`});
    await dialog.locator('.sats-mini-number-pad').getByRole('button',{name:'7',exact:true}).click();await expect(dialog.getByRole('textbox').first()).toHaveValue('7');
    await dialog.getByRole('button',{name:'Return to question',exact:true}).click();row.miniPad=true;
   }
   expect(errors).toEqual([]);row.passed=true;
   await page.screenshot({path:`${out}/${game.key}.png`});
  }catch(error){row.error=error.message;row.errors=errors;await page.screenshot({path:`${out}/${game.key}-failure.png`}).catch(()=>{});}
  finally{rows.push(row);console.log(row.passed?'PASS':'FAIL',game.key,row.error||'');await context.close();await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));}
 }
 if(!wanted||wanted.includes('peaceful_pond')){
  const {context,page,errors}=await fixture(),row={game:'peaceful_pond',passed:false};
  try{await page.setViewportSize({width:844,height:390});await page.goto(base+'/wellbeing',{waitUntil:'domcontentloaded'});await page.locator('[data-wellbeing-select="peaceful_pond"]').tap();await expect(page.locator('[data-wellbeing-activity="peaceful_pond"]')).toBeVisible();await page.screenshot({path:`${out}/peaceful_pond.png`});await fits(page,'.pond-attention,.pond-pad,.matharia-pond-instructions,.wellbeing-footer');for(let pad=1;pad<=5;pad++){await page.locator(`[data-pond-pad="${pad}"]`).press('Enter');await expect(page.locator(`[data-pond-pad="${pad}"]`)).toHaveAttribute('aria-pressed','true');}expect(errors).toEqual([]);row.passed=true;}catch(error){row.error=error.message;await page.screenshot({path:`${out}/peaceful_pond-failure.png`}).catch(()=>{});}finally{rows.push(row);await context.close();console.log(row.passed?'PASS':'FAIL','peaceful_pond',row.error||'');await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));}
 }
 const checks=[];
 if(!process.env.QA_SKIP_LIFECYCLE){
 async function check(name,run){try{await run();checks.push({name,passed:true});console.log('PASS',name);}catch(error){checks.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message);}}
 const ninja=catalogue.levels.find(game=>game.key==='number_line_ninja'&&game.tier===1&&!game.practice);
 await check('background holds countdown and schedules exactly three ticks',async()=>{
  const {context,page}=await fixture('barratt',false,audioBrowser);try{await load(page,ninja);await expect(page.locator('[data-game-start-countdown="2"]')).toBeVisible();await page.evaluate(()=>{window.__qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0);await page.waitForTimeout(1300);expect(await page.evaluate(()=>window.__countdownLog.map(row=>row.digit))).toEqual([3,2]);await page.evaluate(()=>{window.__qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await finishCountdown(page);expect(await page.evaluate(()=>window.__countdownTicks)).toBe(3);}finally{await context.close();}
 });
 await check('rotation holds countdown until landscape returns',async()=>{
  const {context,page}=await fixture();try{await load(page,ninja);await expect(page.locator('[data-game-start-countdown="2"]')).toBeVisible();await page.setViewportSize({width:390,height:844});await expect(page.locator('[data-game-start-countdown]')).toHaveCount(0);await page.waitForTimeout(1300);expect(await page.evaluate(()=>window.__countdownLog.map(row=>row.digit))).toEqual([3,2]);await page.setViewportSize({width:844,height:390});await finishCountdown(page);}finally{await context.close();}
 });
 for(const mode of ['muted','calm'])await check(`${mode} preparation remains visible without tick audio`,async()=>{
  const {context,page}=await fixture('barratt',mode==='muted',audioBrowser);try{if(mode==='calm')await context.addInitScript(()=>localStorage.setItem('matharia-ios-learning-support-v1',JSON.stringify({version:1,enabled:true,selected:{calmAudio:true}})));await load(page,ninja);await finishCountdown(page);expect(await page.evaluate(()=>window.__countdownTicks)).toBe(0);}finally{await context.close();}
 });
 for(const avatar of ['barratt','bran','mochi','vex'])await check(`HUD preserves selected avatar ${avatar}`,async()=>{
  const {context,page}=await fixture(avatar);try{await load(page,ninja);await expect(page.locator(`[data-testid="shared-top-hud"] [data-hero-portrait="${avatar}"]`)).toBeVisible();}finally{await context.close();}
 });
 await writeFile(`${out}/lifecycle-and-avatar-report.json`,JSON.stringify(checks,null,2));if(checks.some(row=>!row.passed))process.exitCode=1;
 }
}finally{await browser.close();await audioBrowser.close();}
if(rows.some(row=>!row.passed))process.exitCode=1;
