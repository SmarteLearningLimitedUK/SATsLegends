import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const out='qa-artifacts/zombies-hero-visibility';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {
 for(const [name,width,height] of [['compact',667,375],['iphone15',852,393],['large-phone',932,430],['ipad',1024,768]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await installNativeAccessFixture(context);
  const page=await context.newPage();await page.clock.install();
  await page.goto('http://127.0.0.1:3073/game/1/46',{waitUntil:'domcontentloaded'});
  await page.locator('[data-zombies-game]').waitFor();
  for(let i=0;i<6;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(e=>e.dataset.visionReady==='true'));
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+500));
  const layout=await page.evaluate(()=>{const box=e=>e.getBoundingClientRect(),hero=box(document.querySelector('.zombies-player')),field=box(document.querySelector('.zombies-playfield')),enemy=box(document.querySelector('.zombies-target')),answers=[...document.querySelectorAll('[data-zombies-answer]')].map(box);return {hero:hero.toJSON(),field:field.toJSON(),oldHeroHeight:Math.min(field.height,enemy.height*1.25),buttons:answers.map(r=>({width:r.width,height:r.height,clear:hero.bottom<=r.top+1})),overflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1}});
  if(layout.hero.height<layout.oldHeroHeight*1.15||layout.buttons.some(b=>b.width<44||b.height<44||!b.clear)||layout.overflow)throw Error(`${name}: ${JSON.stringify(layout)}`);
  await page.screenshot({path:`${out}/${name}.png`});
  const equation=(await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation')).replace(/[()]/g,''),m=equation.match(/^\s*(-?\d+)\s*([+−\-×x÷])\s*(-?\d+)\s*$/);
  if(!m)throw Error(`Unknown equation: ${equation}`);
  const a=Number(m[1]),b=Number(m[3]),v={'+':a+b,'-':a-b,'−':a-b,'×':a*b,'x':a*b,'÷':a/b}[m[2]];
  await page.locator(`[data-zombies-answer="${v}"]`).tap();
  await page.waitForFunction(()=>Number(document.querySelector('[data-zombies-game]')?.getAttribute('data-zombies-score'))>0);
  console.log(`PASS ${name}: hero placement, answer access and correct spell`);
  await context.close();
 }
}finally{await browser.close();}
