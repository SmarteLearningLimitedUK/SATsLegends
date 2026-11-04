import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL || 'http://127.0.0.1:3091';
const out='qa-artifacts/prime-round';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
async function verify(name,route){
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try {
  await installNativeAccessFixture(context);
  const page=await context.newPage();
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.locator('[data-prime-pop-stage]').waitFor();
  for(let i=0;i<8;i++){const button=page.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;await button.tap();}
  const clock=page.getByRole('timer',{name:'Time remaining'});
  await expect(clock).toContainText('30s');
  await page.evaluate(()=>{
   const seen=new Set();window.__primeSeen=seen;
   window.__primePlayer=setInterval(()=>{
    document.querySelectorAll('[data-prime-bubble-id]').forEach(button=>{
     seen.add(button.getAttribute('data-prime-bubble-id'));
     const n=Number(button.getAttribute('aria-label')?.replace('Pop number ',''));
     let prime=n>=2;for(let d=2;d*d<=n;d++)if(n%d===0)prime=false;
     if(prime)button.click();
    });
   },120);
  });
  await page.waitForTimeout(23000);
  await expect(page.locator('[data-prime-pop-stage]')).toBeVisible();
  const before=await page.evaluate(()=>window.__primeSeen.size);
  await page.waitForTimeout(4000);
  const after=await page.evaluate(()=>window.__primeSeen.size);
  if(after<=before)throw Error(`${name}: no new bubbles near the end of the round`);
  const remaining=await clock.innerText();
  await page.screenshot({path:`${out}/${name}.png`});
  await expect(page.locator('[data-result-game="prime_pop"]')).toBeVisible({timeout:8000});
  console.log(`PASS ${name}: 30-second round, ${before} to ${after} bubbles by ${remaining.trim()}, finished at time`);
 }finally{await context.close();}
}
async function verifyCompositeCrossing(){
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  await installNativeAccessFixture(context);
  await context.addInitScript(()=>{Math.random=()=>.999});
  const page=await context.newPage();await page.goto(base+'/game/1/39');
  await page.locator('[data-prime-pop-stage]').waitFor();
  for(let i=0;i<8;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await page.evaluate(()=>{
   window.__compositesCrossed=0;const previous=new Map();
   const sample=()=>{
    const rail=document.querySelector('[data-prime-pop-danger]')?.getBoundingClientRect();
    if(rail){const line=(rail.top+rail.bottom)/2,now=new Map();
     document.querySelectorAll('[data-prime-bubble-id]').forEach(b=>{
      const r=b.getBoundingClientRect(),id=b.getAttribute('data-prime-bubble-id');
      now.set(id,(r.top+r.bottom)/2-line);
     });
     previous.forEach((distance,id)=>{if(!now.has(id)&&distance<12)window.__compositesCrossed++});
     previous.clear();now.forEach((distance,id)=>previous.set(id,distance));
    }
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  await page.waitForFunction(()=>window.__compositesCrossed>0,{timeout:26000});
  await expect(page.getByRole('img',{name:'3 of 3 lives remaining'})).toBeVisible();
  console.log('PASS non-prime bubble crosses visible danger line without losing a life');
 }finally{await context.close();}
}
async function verifyPrimeCrossing(){
 const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  await installNativeAccessFixture(context);
  await context.addInitScript(()=>{Math.random=()=>.1});
  const page=await context.newPage();await page.goto(base+'/game/1/39');
  await page.locator('[data-prime-pop-stage]').waitFor();
  for(let i=0;i<8;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await page.evaluate(()=>{
   window.__closestPrime=Infinity;window.__primePenaltyDistance=null;
   const sample=()=>{
    const rail=document.querySelector('[data-prime-pop-danger]')?.getBoundingClientRect();
    const lives=document.querySelector('.legend-hud-lives')?.getAttribute('aria-label');
    if(lives&&lives!=='3 of 3 lives remaining'&&window.__primePenaltyDistance===null)window.__primePenaltyDistance=window.__closestPrime;
    if(rail){const line=(rail.top+rail.bottom)/2;
     document.querySelectorAll('[data-prime-bubble-id]').forEach(b=>{const r=b.getBoundingClientRect();window.__closestPrime=Math.min(window.__closestPrime,(r.top+r.bottom)/2-line)});
    }
    requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  await page.waitForFunction(()=>window.__primePenaltyDistance!==null,{timeout:26000});
  const distance=await page.evaluate(()=>window.__primePenaltyDistance);
  if(distance>12)throw Error(`Prime penalty occurred ${distance}px before the danger line`);
  console.log(`PASS prime crossing costs a life at the visible danger line (within ${distance.toFixed(1)}px)`);
 }finally{await context.close();}
}
try{await Promise.all([verify('practice','/game/1/3'),verify('scored','/game/1/39'),verifyCompositeCrossing(),verifyPrimeCrossing()]);}finally{await browser.close();}
