import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const out='qa-artifacts/rocket-launch-continuity';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {
 for(const [name,width,height] of (process.env.ROCKET_MOTION==='normal'?[['iphone15-motion',393,852]]:[['compact',375,667],['iphone15',393,852],['ipad',768,1024]])) {
  const normalMotion=process.env.ROCKET_MOTION==='normal';
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:normalMotion?'no-preference':'reduce'});
  await installNativeAccessFixture(context);
  const page=await context.newPage();
  await page.clock.install();
  await page.goto('http://127.0.0.1:3072/game/1/40',{waitUntil:'domcontentloaded'});
  await page.locator('.rocket-game-scene').waitFor();
  for(let i=0;i<6;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+500));
  const total=Number(await page.locator('.rocket-game-scene').getAttribute('data-rocket-total'));
  for(let n=0;n<total;n++) {
   const q=page.locator('[data-rocket-question-value]'),value=Number(await q.innerText()),target=Number(await q.getAttribute('data-rocket-question-target'));
   await page.getByRole('button',{name:`Landing pad ${Math.round(value/target)*target}`,exact:true}).tap();
   if(n<total-1)await page.clock.runFor(1000);
  }
  await page.clock.runFor(100);
  await page.locator('.rocket-world[data-rocket-phase="countdown"]').waitFor();
  const check=async phase=>{
   const result=await page.evaluate(()=>{
    const status=document.querySelector('.rocket-flight-status'),r=status.getBoundingClientRect(),dock=document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();
    const text=[...status.querySelectorAll('strong, span:not(.artwork-frame)')].filter(e=>e.textContent.trim()).map(e=>{const range=document.createRange();range.selectNodeContents(e);const b=range.getBoundingClientRect();return b.left>=r.left+r.width*.08&&b.right<=r.right-r.width*.08&&b.top>=r.top+5&&b.bottom<=r.bottom-5});
    return {text,dockClear:r.bottom<=dock.top+1,overlay:!!document.querySelector('.rocket-cinematic-space'),scroll:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
   });
   if(!result.text.every(Boolean)||!result.dockClear||result.overlay||result.scroll)throw new Error(`${name} ${phase}: ${JSON.stringify(result)}`);
   await page.screenshot({path:`${out}/${name}-${phase}.png`});
  };
  await check('countdown');
  await page.clock.runFor(normalMotion?2450:950);
  await page.locator('.rocket-world[data-rocket-phase="launching"]').waitFor();
  await check('launch');
  await page.clock.runFor(normalMotion?8500:3000);
  await page.locator('[data-result-outcome="victory"]').waitFor();
  console.log(`PASS ${name}: countdown, continuous launch, victory`);
  await context.close();
 }
}finally{await browser.close();}
