import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from '../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/prime_pop';await mkdir(out,{recursive:true});const rows=[];
const assert=(ok,message)=>{if(!ok)throw Error(message)};
for(const engine of ['chromium','webkit']){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const motion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:motion});await installReleaseAccountFixture(context);
  const page=await context.newPage(),row={engine,motion,checks:[]};rows.push(row);
  try{
   await page.goto('http://127.0.0.1:3017/game/1/39');await page.locator('[data-game-set]').waitFor();for(let i=0;i<6;i++){await page.waitForTimeout(100);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;const e=await b.elementHandle();await b.tap();await page.waitForFunction(n=>!n.isConnected,e)}
   const hero=page.locator('.prime-caster [data-vision-character]');await page.waitForFunction(()=>document.querySelector('.prime-caster [data-vision-ready]')?.getAttribute('data-vision-ready')==='true');
   const initial=Number(await hero.getAttribute('data-vision-time'));await page.waitForTimeout(600);const after=Number(await hero.getAttribute('data-vision-time'));assert(motion==='reduce'?initial===after:after>initial,'Incorrect character motion');
   const glow=await page.locator('.prime-spell-glint').evaluate(e=>getComputedStyle(e).animationName);assert(motion==='reduce'?glow==='none':glow==='prime-spell-bloom','Incorrect spell motion preference');row.checks.push('character and spell light honour reduced-motion preference');
   await page.getByRole('button',{name:'Pause game',exact:true}).tap();await page.getByRole('dialog',{name:'Game paused'}).waitFor();const paused=await hero.getAttribute('data-vision-time');await page.waitForTimeout(500);assert(await hero.getAttribute('data-vision-time')===paused,'Character moved while paused');assert(await page.locator('[aria-label^="Pop number "]:not(:disabled)').count()===0,'Paused bubbles remain enabled');assert(await page.locator('.prime-spell-glint').evaluate(e=>getComputedStyle(e).animationPlayState)==='paused','Spell light moved while paused');await page.getByRole('button',{name:'Resume',exact:true}).tap();row.checks.push('pause freezes character, spell light and bubble input');
   await page.locator('[data-active-game]').evaluate(e=>{e.style.setProperty('--concept-safe-top','59px');e.style.setProperty('--concept-safe-bottom','34px')});
   await page.waitForTimeout(150);row.insets=await page.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect();return{pause:b('.concept-pause').top,nav:b('[data-testid="shared-bottom-hud"]').bottom,question:b('[data-concept-panel]').toJSON(),field:b('[data-prime-pop-field]').toJSON()}});assert(row.insets.pause>=59&&row.insets.nav<=810,'Essential control enters simulated unsafe area');await page.screenshot({path:`${out}/${engine}-${motion}-safe-area.png`});row.checks.push('browser-simulated 59px top and 34px bottom insets');
   for(const rem of [20,24]){
    await page.addStyleTag({content:`html{font-size:${rem}px}`});
    const bad=await page.locator('.prime-orb>span').evaluateAll(nodes=>nodes.filter(n=>{const r=document.createRange();r.selectNodeContents(n);const t=r.getBoundingClientRect(),b=n.getBoundingClientRect();return t.width>b.width+1||t.height>b.height+1}).length);assert(!bad,`Bubble label clips at ${rem}px rem base`);
   }row.checks.push('browser rem base 20px and 24px retains readable contained bubble values; native Dynamic Type unverified');await page.screenshot({path:`${out}/${engine}-${motion}-text-scale.png`});
   row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/${engine}-${motion}-check-failure.png`}).catch(()=>{})}
  console.log(row.passed?'PASS':'FAIL',engine,motion,row.error||'');await context.close();await writeFile(`${out}/motion-and-safe-areas.json`,JSON.stringify(rows,null,2));
 }}finally{await browser.close()}
}if(rows.some(r=>!r.passed))process.exitCode=1;
