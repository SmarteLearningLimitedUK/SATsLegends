import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/zombie-hero-grounding';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const profile of [{width:1440,height:900},{width:844,height:390},{width:667,height:375},...['bran','mochi','vex'].map(avatar=>({width:1440,height:900,avatar}))])for(const reducedMotion of profile.avatar?['reduce']:['no-preference','reduce']){
 const context=await browser.newContext({viewport:profile,reducedMotion});await installReleaseAccountFixture(context);
 await context.addInitScript(avatar=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:avatar,level:100},revision:1},requests:{}})),profile.avatar||'barratt');
 const page=await context.newPage();await page.goto('http://127.0.0.1:3024/game/1/46',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-game-set]').waitFor();
 for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(180);}
 await page.locator('.zombies-player [data-vision-ready="true"]').waitFor();await page.waitForTimeout(600);
 async function measure(){return page.evaluate(()=>{
  const field=document.querySelector('.zombies-playfield').getBoundingClientRect(),hero=document.querySelector('.zombies-player-avatar').getBoundingClientRect(),footing=document.querySelector('.zombies-hero-footing').getBoundingClientRect();
  const expected=field.top+field.height*.9,foot=hero.top+hero.height*.95;
  const enemy=document.querySelector('.zombies-target')?.getBoundingClientRect();
  const controls=[...document.querySelectorAll('.zombies-answer-options button')].map(n=>n.getBoundingClientRect());
  return {expected,foot,footingTop:footing.top,heroHeight:hero.height,enemySize:enemy?.width,controlsClear:controls.every(rect=>rect.top>=field.bottom-1),sceneFilter:getComputedStyle(document.querySelector('.vision-world-backdrop')).filter};
 });}
 const before=await measure();expect(Math.abs(before.foot-before.expected)).toBeLessThan(1.5);expect(Math.abs(before.footingTop-before.foot)).toBeLessThan(2);expect(before.controlsClear).toBe(true);if(before.enemySize)expect(before.heroHeight/before.enemySize).toBeGreaterThan(1.15);
 await page.screenshot({path:`${out}/${profile.width}-${reducedMotion}${profile.avatar?'-'+profile.avatar:''}.png`});
 const equation=await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation'),match=equation.replaceAll('(','').replaceAll(')','').match(/(-?\d+)\s*([+\-×x÷])\s*(-?\d+)/);
 const a=Number(match[1]),b=Number(match[3]),answer={'+':a+b,'-':a-b,'×':a*b,x:a*b,'÷':a/b}[match[2]];
 await page.locator('.zombies-answer-options button').filter({hasText:new RegExp('^'+answer+'$')}).click();await page.waitForTimeout(250);
 const casting=await measure();expect(Math.abs(casting.foot-before.foot)).toBeLessThan(1.5);
 results.push({profile,reducedMotion,before,casting,passed:true});await context.close();console.log('PASS',profile.width,reducedMotion,'feet and footing share ground; casting preserves feet');
}}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
