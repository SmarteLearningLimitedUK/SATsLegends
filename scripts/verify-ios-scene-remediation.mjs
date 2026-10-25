import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3023';
const out='qa-artifacts/ios-scene-remediation';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
async function enter(page,route){
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
 await page.getByRole('button',{name:'Start',exact:true}).click();
 await page.locator('[data-game-set]').waitFor();
 for(let i=0;i<5;i++){const b=page.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await page.waitForTimeout(180);}
 await page.waitForTimeout(500);
}
async function controls(page,selector){return page.locator(selector).evaluateAll(nodes=>{
 const d=document.querySelector('[data-testid="shared-bottom-hud"] nav').getBoundingClientRect();
 return nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=43.5&&r.height>=43.5&&r.left>=-.5&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=d.top+.5;});
});}
try{
 for(const game of ['rocket','zombies'])for(const profile of game==='rocket'?[{width:390,height:844},{width:320,height:568},{width:1440,height:900}]:[{width:844,height:390},{width:667,height:375},{width:1440,height:900}])for(const motion of ['reduce','no-preference']){
  if(process.env.LEGEND_SCENE_CASE && !`${game}-${profile.width}-${motion}`.includes(process.env.LEGEND_SCENE_CASE))continue;
  const context=await browser.newContext({viewport:profile,reducedMotion:motion});await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{let seed=4817;Math.random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const label=`${game}-${profile.width}-${motion}`;
  try{
   await enter(page,game==='rocket'?'/game/1/40':'/game/1/46');
   expect(await controls(page,game==='rocket'?'.rr-answer-buttons button':'.zombies-answer-options button')).toBe(true);
   if(game==='rocket'){
    const skeleton=await page.locator('.rr-blueprint').first().evaluate(n=>({opacity:+getComputedStyle(n).opacity,filter:getComputedStyle(n).filter}));expect(skeleton.opacity).toBeGreaterThanOrEqual(.6);await expect(page.locator('.rr-next-part')).toHaveCount(1);
    if(profile.width===390&&motion==='reduce'){
     const baseline=await page.addStyleTag({content:'.rr-rocket > image.rr-blueprint{opacity:.32!important;filter:none!important}.rr-next-part,.rr-rocket > g.rr-blueprint{display:none!important}'});
     await page.screenshot({path:`${out}/rocket-treatment-before.png`});await baseline.evaluate(n=>n.remove());
    }
    await page.screenshot({path:`${out}/${label}-opening.png`});
    const total=Number((await page.locator('.rr-build-status').innerText()).match(/\/(\d+)/)[1]);
    for(let n=1;n<=total;n++){
     await expect(page.locator('.rr-answer-buttons button').first()).toBeEnabled();
     const value=Number((await page.locator('[data-rocket-question-value]').innerText()).replaceAll(',',''));
     const target=Number((await page.locator('.rr-question').innerText()).match(/nearest ([\d,]+)/i)[1].replaceAll(',',''));
     await page.getByRole('button',{name:`Landing pad ${Math.round(value/target)*target}`,exact:true}).click();
     await expect(page.locator('[data-rocket-parts]')).toHaveAttribute('data-rocket-parts',String(n));
     if(n<total){await page.waitForTimeout(950);if(n===Math.floor(total/2))await page.screenshot({path:`${out}/${label}-half-built.png`});}
    }
    await page.locator('[data-rocket-phase="countdown"]').waitFor();await expect(page.locator('.rr-blueprint')).toHaveCount(0);await expect(page.locator('.rr-next-part')).toHaveCount(0);
    await page.locator('[data-rocket-phase="launching"]').waitFor();await page.screenshot({path:`${out}/${label}-launch.png`});
    await page.locator('[data-rocket-phase="orbit"]').waitFor({timeout:15000});await page.screenshot({path:`${out}/${label}-orbit.png`});
    await page.getByRole('dialog',{name:'Mission results'}).waitFor();
    results.push({game,profile,motion,skeleton,assemblyAndLaunchPassed:true,passed:true});
   }else{
    await page.locator('.zombies-player [data-vision-ready="true"]').waitFor();
    await page.locator('.zombies-target [data-vision-ready="true"],.zombies-target [data-monster-ready="true"]').first().waitFor();
    const measure=()=>page.evaluate(()=>{const f=document.querySelector('.zombies-playfield').getBoundingClientRect(),h=document.querySelector('.zombies-player-avatar').getBoundingClientRect(),p=document.querySelector('.zombies-hero-footing').getBoundingClientRect();return {foot:h.top+h.height*.95,expected:f.top+f.height*.9,footing:p.top,backdropFilter:getComputedStyle(document.querySelector('.vision-world-backdrop')).filter,localTreatment:getComputedStyle(document.querySelector('.zombies-playfield'),'::before').backgroundImage};});
    const opening=await measure();expect(opening.backdropFilter).toBe('none');expect(opening.localTreatment).toContain('radial-gradient');expect(Math.abs(opening.foot-opening.expected)).toBeLessThan(1.5);expect(Math.abs(opening.footing-opening.foot)).toBeLessThan(2);
    if(profile.width===844&&motion==='reduce'){
     const baseline=await page.addStyleTag({content:'#root .app-viewport[data-active-game="maths_vs_zombies"] > .vision-world-backdrop{filter:brightness(.7) saturate(.55) blur(1.5px)!important;transform:scale(1.015)!important}.zombies-playfield::before{display:none!important}.maths-vs-zombies .zombies-player-avatar{filter:drop-shadow(0 0 3px #ffe8a8) drop-shadow(0 8px 8px #031022b3)!important}'});
     await page.screenshot({path:`${out}/zombies-treatment-before.png`});await baseline.evaluate(n=>n.remove());
    }
    await page.screenshot({path:`${out}/${label}-opening.png`});
    const eq=(await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation')).replaceAll('(','').replaceAll(')','').match(/(-?\d+)\s*([+\-×x÷])\s*(-?\d+)/);const a=+eq[1],b=+eq[3],answer={'+':a+b,'-':a-b,'×':a*b,x:a*b,'÷':a/b}[eq[2]];
    await page.locator('.zombies-answer-options button').filter({hasText:new RegExp('^'+answer+'$')}).click();await page.waitForTimeout(250);const casting=await measure();expect(Math.abs(casting.foot-opening.foot)).toBeLessThan(1.5);await page.screenshot({path:`${out}/${label}-cast.png`});
    results.push({game,profile,motion,opening,casting,passed:true});
   }
   expect(errors).toEqual([]);console.log('PASS',label);
  }catch(e){results.push({game,profile,motion,passed:false,error:e.message});console.log('FAIL',label,e.message);await page.screenshot({path:`${out}/${label}-failure.png`});}
  await context.close();
 }
}finally{await browser.close();await writeFile(`${out}/results${process.env.LEGEND_SCENE_CASE?'-focused':''}.json`,JSON.stringify(results,null,2));}
if(results.some(r=>!r.passed))process.exitCode=1;
