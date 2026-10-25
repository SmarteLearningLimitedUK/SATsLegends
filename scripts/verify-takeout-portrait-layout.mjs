import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.QA_BASE||'http://127.0.0.1:3026',out='qa-artifacts/takeout-portrait';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
for(const tier of [1,5])for(const [width,height] of [[720,1280],[390,844],[375,667],[320,568],[1280,720]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100,unlockedIslands:[1,2,3,4,5,6,7,8]},revision:1},requests:{}}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`${base}/game/2/${tier===1?6:10}`);await page.getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-takeout-game]').waitFor();await page.waitForTimeout(500);
  const intro=page.locator('[data-dialog-primary]:visible');if(await intro.count())await intro.first().click();await page.waitForTimeout(1000);
  const audit=await page.evaluate(()=>{
   const rect=n=>n?.getBoundingClientRect().toJSON(),dock=document.querySelector('[data-testid="shared-bottom-hud"]'),r=dock.getBoundingClientRect(),question=document.querySelector('[data-game-question]'),copy=question.querySelector('.game-question-card-inner');
   return {reference:document.querySelector('[data-reference-screen]')?.dataset.referenceScreen,background:getComputedStyle(document.querySelector('.app-viewport')).backgroundImage,chefLoaded:document.querySelector('.rush-portrait-chef').complete,scroll:document.documentElement.scrollHeight>innerHeight,
    geometry:{question:rect(question),copy:rect(copy),header:rect(document.querySelector('[data-testid="shared-top-hud"]')),dock:rect(dock),tray:rect(document.querySelector('.rush-responses')),feedback:rect(document.querySelector('.rush-feedback'))},
    buttons:[...document.querySelectorAll('[data-game-set] button,.legend-dock-button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>{const b=n.getBoundingClientRect();return {label:n.getAttribute('aria-label')||n.textContent,disabled:n.disabled,rect:b.toJSON(),blocked:!!n.closest('[data-game-set]')&&b.left<r.right&&b.right>r.left&&b.top<r.bottom&&b.bottom>r.top};})};
  });
  expect(errors).toEqual([]);expect(audit.reference).toBe('take_out_rush');expect(audit.scroll).toBe(false);expect(audit.chefLoaded).toBe(true);
  expect(audit.buttons.filter(n=>!n.disabled&&(n.rect.width<43.8||n.rect.height<43.8||n.rect.left<-.5||n.rect.right>width+.5||n.rect.top<-.5||n.rect.bottom>height+.5||n.blocked))).toEqual([]);
  const {question,copy,header,tray,feedback,dock}=audit.geometry;
  expect(copy.top).toBeGreaterThanOrEqual(question.top-2);expect(copy.bottom).toBeLessThanOrEqual(question.bottom+2);
  expect(question.top).toBeGreaterThanOrEqual(header.bottom-1);expect(feedback.top).toBeGreaterThanOrEqual(tray.bottom+3);
  if(height>width){expect(audit.background).toContain('kitchen');expect(feedback.bottom).toBeLessThan(dock.top);}
  const file=`takeout-${width}-tier-${tier}.png`;await page.screenshot({path:`${out}/${file}`});results.push({width,height,tier,passed:true,file,errors,...audit});console.log('PASS',width,height,tier);
 }catch(error){results.push({width,height,tier,passed:false,error:error.message,errors});console.log('FAIL',width,height,tier,error.message);await page.screenshot({path:`${out}/layout-failed-${width}-tier-${tier}.png`});}
 await writeFile(`${out}/layout-results.json`,JSON.stringify(results,null,2));await context.close();
}
await browser.close();if(results.some(r=>!r.passed))process.exitCode=1;
