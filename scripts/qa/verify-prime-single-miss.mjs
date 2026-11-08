import {webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../../variants/matharia/scripts/qa-native-access.mjs';
const out='qa-artifacts/release-readiness-2026-11-04/prime-single-miss';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
try{
 await installNativeAccessFixture(c);const p=await c.newPage();await p.goto('http://127.0.0.1:3030/game/1/39');await p.locator('[data-game-question]').waitFor();
 for(let i=0;i<5;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
 await p.evaluate(()=>{
  const prime=n=>n>=2&&!Array.from({length:Math.max(0,Math.floor(Math.sqrt(n))-1)},(_,i)=>i+2).some(d=>n%d===0);
  window.__singleMiss={target:null,seenTarget:false,removed:false,closestDistance:Infinity};
  window.__singleMissPlayer=setInterval(()=>{
   const audit=window.__singleMiss,rail=document.querySelector('[data-prime-pop-danger]')?.getBoundingClientRect();let present=false;
   document.querySelectorAll('[data-prime-bubble-id]').forEach(b=>{
    const n=Number(b.getAttribute('aria-label')?.replace('Pop number ',''));if(!prime(n))return;
    const id=b.dataset.primeBubbleId;if(audit.target===null)audit.target=id;
    if(id!==audit.target){b.click();return;}
    present=true;audit.seenTarget=true;
    if(rail){const r=b.getBoundingClientRect();audit.closestDistance=Math.min(audit.closestDistance,(r.top+r.bottom-rail.top-rail.bottom)/2);}
   });
   if(audit.seenTarget&&!present)audit.removed=true;
  },25);
 });
 const lives=p.locator('.legend-hud-lives');await expect(lives).toHaveAttribute('aria-label','2 of 3 lives remaining',{timeout:27000});
 await p.waitForFunction(()=>window.__singleMiss.removed);await p.waitForTimeout(1800);
 await expect(lives).toHaveAttribute('aria-label','2 of 3 lives remaining');
 const evidence=await p.evaluate(()=>{clearInterval(window.__singleMissPlayer);return window.__singleMiss;});
 expect(evidence.closestDistance).toBeLessThanOrEqual(12);expect(evidence.removed).toBe(true);
 await p.screenshot({path:`${out}/one-missed-prime-one-life.png`});
 await writeFile(`${out}/report.json`,JSON.stringify({passed:true,oneMissOneLife:true,noRepeatedDeductionAfterRemoval:true,renderedDangerLineDistance:evidence.closestDistance,fixtureOnly:true},null,2));
 console.log('PASS: one isolated missed prime crosses the rendered danger line, disappears and costs exactly one life.');
}finally{await browser.close();}
