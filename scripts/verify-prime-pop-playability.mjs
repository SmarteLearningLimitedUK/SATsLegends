import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='qa-artifacts/prime-pop-playability';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const results=[];
try{
 for(const viewport of [{width:844,height:390},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  await page.route('**/qa-prime-harness',route=>route.fulfill({contentType:'text/html',body:'<html><body style="margin:0"><div id="root" style="height:100vh"></div></body></html>'}));
  await page.goto('http://127.0.0.1:3023/qa-prime-harness');
  await page.evaluate(async()=>{
   const {default:refresh}=await import('/@react-refresh');
   refresh.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
   await import('/src/index.css');
   const React=(await import('/node_modules/.vite/deps/react.js')).default;
   const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
   const {default:Game}=await import('/src/games/PrimePopGame.tsx');
   const root=createRoot(document.getElementById('root'));
   Math.random=()=>.999999;
   window.startPrimeTest=(tier)=>{
    window.primeResult=null;window.primeErrors=[];
    root.render(React.createElement(Game,{key:tier,levelId:tier,avatarId:'barratt',sessionState:{timeLeft:60,totalTime:60,lives:3},sessionEvents:{onIncorrectAnswer:e=>window.primeErrors.push(e)},onVictory:(stars,score)=>window.primeResult={stars,score},onGameOver:()=>window.primeResult={failed:true},onBack:()=>{}}));
   };
  });
  for(let tier=1;tier<=5;tier++){
   await page.evaluate(tier=>window.startPrimeTest(tier),tier);
   await page.locator('[aria-label^="Pop number"]').first().waitFor();
   for(let tries=0;tries<30&&!await page.evaluate(()=>window.primeResult);tries++){
    const bubbles=page.locator('[aria-label^="Pop number"]');
    for(const bubble of await bubbles.all()){
     const n=Number((await bubble.getAttribute('aria-label'))?.split(' ').at(-1));
     if(n>=2&&!Array.from({length:Math.max(0,Math.floor(Math.sqrt(n))-1)},(_,i)=>i+2).some(d=>n%d===0))await bubble.dispatchEvent('click',{detail:0});
    }
    await page.waitForTimeout(150);
   }
   expect(await page.evaluate(()=>window.primeResult?.score)).toBeGreaterThanOrEqual(900);
   expect(await page.evaluate(()=>window.primeErrors)).toEqual([]);
   results.push({viewport,tier,won:true});
  }
  await page.evaluate(()=>window.startPrimeTest(99));
  await page.waitForTimeout(400);
  const line=await page.locator('[data-prime-pop-danger]').boundingBox();
  const label=await page.locator('.prime-pop-ward-label').boundingBox();
  expect(Math.abs(label.y+label.height/2-(line.y+line.height/2))).toBeLessThan(1);
  await page.screenshot({path:`${out}/${viewport.width}-warning-line.png`});
  await page.clock.install();
  await page.clock.runFor(35000);
  const errors=await page.evaluate(()=>window.primeErrors);
  expect(errors.length).toBeGreaterThan(0);
  for(const event of errors){const n=event.metadata.value;expect(n>=2&&!Array.from({length:Math.floor(Math.sqrt(n))-1},(_,i)=>i+2).some(d=>n%d===0)).toBe(true);}
  results.push({viewport,missedPrimes:errors.length,compositePenalties:0,labelCentred:true});
  await page.close();
 }
}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify(results,null,2));
console.log('PASS all five tiers at phone and desktop, prime-only escape penalties and centred warning label');
