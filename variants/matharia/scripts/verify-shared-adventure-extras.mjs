import {chromium,webkit,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const engine=process.env.MATHARIA_ENGINE||'chromium',out='qa-artifacts/shared-adventure',rows=[],base='http://127.0.0.1:3015';
const routes=JSON.parse(await readFile(`${out}/${engine}-practice-routes.json`,'utf8'));
const browser=await(engine==='webkit'?webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):chromium.launch());
async function row(r){rows.push(r);await writeFile(`${out}/${engine}-extras-checks.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(r))}
async function context(w,h,avatarId='barratt',motion='reduce'){
 const c=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,reducedMotion:motion});await installReleaseAccountFixture(c);
 await c.addInitScript(({avatarId})=>!localStorage.getItem('__release_qa_api_state__')&&localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100,unlockedIslands:[1,2,3,4,5,6,7,8]},revision:1},requests:{}})),{avatarId});return c;
}
async function ready(p){await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('[data-artwork-ready],[data-vision-ready]')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).every(e=>e.dataset.artworkReady==='true'||e.dataset.visionReady==='true'));await p.waitForTimeout(350)}
async function shot(p,name){await ready(p);await p.screenshot({path:`${out}/${engine}/${name}.png`})}
async function dismiss(p){for(let i=0;i<6;i++){const d=p.locator('[data-dialog-primary]:visible').last();if(!await d.count())break;const e=await d.elementHandle();await d.tap();await p.waitForFunction(e=>!e.isConnected,e)}}
async function playable(p,route){await p.goto(base+route);await p.locator('[data-game-set]').waitFor();await ready(p);await dismiss(p)}
async function solve(p){const target=+await p.locator('[data-conversion-target]').getAttribute('data-conversion-target'),tokens=await p.locator('[data-conversion-token]').evaluateAll(es=>es.map(e=>({id:e.dataset.conversionToken,g:+e.dataset.tokenGrams})));let chosen;for(let mask=1;mask<1<<tokens.length;mask++){const ts=tokens.filter((_,i)=>mask&(1<<i));if(ts.reduce((s,t)=>s+t.g,0)===target){chosen=ts;break}}expect(chosen).toBeTruthy();for(const t of chosen)await p.locator(`[data-conversion-token="${t.id}"]`).tap();await p.getByRole('button',{name:'Submit Shipment',exact:true}).tap();await p.waitForTimeout(780)}
async function win(p){for(let n=0;n<10&&!await p.locator('[data-result-outcome]').count();n++)await solve(p);await p.locator('[data-result-outcome="victory"]').waitFor();await p.waitForTimeout(1500);await ready(p);await expect(p.getByRole('button',{name:'Map',exact:true})).toBeInViewport({ratio:1})}
async function safeCSS(p,insets){let css=await readFile('src/platform/native-app.css','utf8')+'\n'+await readFile('variants/matharia/src/shared/shared-adventure.css','utf8');for(const side of['top','right','bottom','left'])css=css.replaceAll(`env(safe-area-inset-${side},0px)`,`${insets[side]||0}px`);await p.addStyleTag({content:css+`\n[data-qa-screen="island_levels"]{padding-bottom:calc(4.35rem + ${insets.bottom||0}px)!important}`})}
async function primaryVisible(p){const b=p.locator('[data-dialog-primary]:visible').last();await expect(b).toBeInViewport({ratio:1});const r=await b.boundingBox();expect(r.height).toBeGreaterThanOrEqual(44);const hit=await b.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===e});expect(hit).toBe(true)}
try{
 // Every canonical avatar has an independent, transparent result sprite.
 for(const avatarId of(engine==='chromium'?['barratt','bran','mochi','vex']:['mochi'])){
  const motion=avatarId==='vex'?'no-preference':'reduce',c=await context(430,932,avatarId,motion),p=await c.newPage();await playable(p,'/game/3/37');await win(p);
  await expect(p.locator('.adventure-result-hero [data-original-hero]')).toHaveAttribute('data-original-hero',avatarId);
  const actor=p.locator('.adventure-result-hero [data-vision-ready]'),before=await actor.getAttribute('data-vision-time');await p.waitForTimeout(220);const after=await actor.getAttribute('data-vision-time');expect(motion==='reduce'?before===after:before!==after).toBe(true);
  await shot(p,`victory-${avatarId}-${motion}`);await row({kind:'hero-victory',avatarId,motion,liveFiveShipmentWin:true,pass:true});
  if(avatarId==='barratt'){
   await p.getByRole('button',{name:'Map',exact:true}).tap();await expect(p.locator('[data-result-outcome]')).toHaveCount(0);await p.goto(base+'/island/3');await p.reload();await p.locator('[data-adventure-board]').waitFor();await ready(p);
   const group=p.locator('[data-game-key="conversion_canyon"]');if(await group.locator('.adventure-game-header').getAttribute('aria-expanded')!=='true')await group.locator('.adventure-game-header').tap();
   const completed=group.locator('[data-level-route="37"]');await expect(completed).toHaveAttribute('data-complete','true');expect(await completed.locator('.adventure-token-slots>.is-earned').count()).toBe(3);if(await completed.getAttribute('data-locked')==='true')await expect(completed.getByRole('button')).toBeDisabled();else await expect(completed.getByRole('button')).toHaveText('Replay');await shot(p,'completed-progress-retained');await row({kind:'progress-retention',game:'conversion_canyon',completed:true,earnedTokens:3,afterReload:true,originalPrerequisiteLocksPreserved:true,pass:true});
  }
  await c.close();
 }
 // Practice still gives the original no-reward result and replays correctly.
 {
  const c=await context(390,844),p=await c.newPage();await playable(p,routes.conversion_canyon);await win(p);await expect(p.locator('[data-result-outcome]')).toContainText('No XP or brainpower awarded');await shot(p,'practice-complete');await p.getByRole('button',{name:'Retry Practice',exact:true}).tap();await expect(p.locator('[data-result-outcome]')).toHaveCount(0);await expect(p.locator('[data-adventure-briefing]')).toBeVisible();await row({kind:'practice-result',noRewards:true,retry:true,pass:true});await c.close();
 }
 // The new help surface must retain the actual revision workshop and pause clocks.
 {
  const c=await context(390,844),p=await c.newPage();await p.clock.install();await playable(p,'/game/3/37');await p.locator('.legend-dock-button').filter({hasText:'Tips'}).tap();await expect(p.locator('[data-adventure-briefing="help"]')).toBeVisible();await p.clock.runFor(200);const before=await p.locator('.legend-hud-streak').innerText();const round=await p.locator('[data-conversion-game]').getAttribute('data-conversion-round');await p.clock.runFor(5000);expect(await p.locator('.legend-hud-streak').innerText()).toBe(before);expect(await p.locator('[data-conversion-game]').getAttribute('data-conversion-round')).toBe(round);
  await p.locator('.adventure-briefing-reading').evaluate(e=>e.scrollTop=e.scrollHeight);await p.clock.resume();await shot(p,'help-revision-workshop');await p.getByRole('button',{name:'Back to mission',exact:true}).tap();await expect(p.locator('[data-adventure-briefing]')).toHaveCount(0);await p.clock.runFor(1200);expect(await p.locator('.legend-hud-streak').innerText()).not.toBe(before);await row({kind:'help-pause-resume',fiveVirtualSecondsPaused:true,pass:true});await c.close();
 }
 // Compact level selection must expose the warm-up action without scrolling.
 {
  const c=await context(320,568),p=await c.newPage();
  for(const island of[1,2,3,4,5,6,7,8]){
   await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();await ready(p);
   const warm=p.locator('[data-level-difficulty="practice"] button').first();if(await warm.count())await expect(warm).toBeInViewport({ratio:1});
   await shot(p,`board-final-compact-${island}`);await row({kind:'compact-board',island,practiceInitiallyAccessible:Boolean(await warm.count()),pass:true});
  }
  await c.close();
 }
 // Keyboard focus remains trapped in the real briefing, and Enter starts it.
 {
  const c=await context(390,844),p=await c.newPage();await p.goto(base+routes.place_value_panic);await p.locator('[data-adventure-briefing]').waitFor();await ready(p);
  const close=p.getByRole('button',{name:'Close practice briefing',exact:true}),start=p.locator('[data-dialog-primary]').last();await close.focus();await p.keyboard.press('Shift+Tab');await expect(start).toBeFocused();await p.keyboard.press('Tab');await expect(close).toBeFocused();await p.keyboard.press('Shift+Tab');await p.keyboard.press('Enter');await expect(p.locator('[data-adventure-briefing]')).toHaveCount(0);await row({kind:'keyboard-focus-start',pass:true});await c.close();
 }
 // Browser text enlargement, both phone orientations and simulated notch/home insets.
 for(const[name,w,h,insets]of[['portrait',390,844,{top:44,bottom:34}],['landscape',568,320,{left:47,right:47,bottom:21}]]){
  const c=await context(w,h),p=await c.newPage();await p.goto(base+(name==='portrait'?routes.place_value_panic:routes.number_line_ninja));await p.locator('[data-adventure-briefing]').waitFor();await ready(p);await safeCSS(p,insets);
  await p.locator('.adventure-briefing-reading').evaluate(root=>{for(const e of root.querySelectorAll('h2,.legend-briefing-copy,.legend-briefing-steps li,.legend-worked-example p'))e.style.fontSize=1.5*parseFloat(getComputedStyle(e).fontSize)+'px'});await primaryVisible(p);await p.locator('.adventure-briefing-reading').evaluate(e=>e.scrollTop=e.scrollHeight);await shot(p,`intro-enlarged-safe-${name}`);await row({kind:'text-insets',orientation:name,textFactor:1.5,simulatedInsets:insets,pass:true});
  await p.goto(`${base}/island/1`);await p.locator('[data-adventure-board]').waitFor();await ready(p);await safeCSS(p,insets);await expect(p.getByRole('button',{name:'Back to islands',exact:true})).toBeInViewport({ratio:1});const back=await p.getByRole('button',{name:'Back to islands',exact:true}).boundingBox();expect(back.x).toBeGreaterThanOrEqual(insets.left||0);expect(back.y).toBeGreaterThanOrEqual(insets.top||0);expect(back.width).toBeGreaterThanOrEqual(44);await shot(p,`board-safe-${name}`);await row({kind:'board-insets',orientation:name,simulatedInsets:insets,pass:true});await c.close();
 }
 await row({kind:'suite',pass:true,completedAt:new Date().toISOString()});
}finally{await browser.close()}
