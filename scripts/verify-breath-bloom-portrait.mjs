import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/breath-bloom-portrait';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const profile of [{width:320,height:568,top:20,bottom:0},{width:375,height:667,top:20,bottom:0},{width:390,height:844,top:44,bottom:21},{width:430,height:932,top:59,bottom:34}]){
 const context=await browser.newContext({viewport:profile,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 const page=await context.newPage();await page.goto('http://127.0.0.1:3024/wellbeing',{waitUntil:'domcontentloaded'});
 await page.locator('[data-wellbeing-select="breathing_bloom"]').click();
 await expect(page.locator('[data-wellbeing-activity="breathing_bloom"]')).toBeVisible();
 await page.waitForTimeout(650);
 await expect(page.locator('[data-testid="shared-top-hud"]')).toHaveCount(0);
 await page.evaluate(({top,bottom})=>{
  const shell=document.querySelector('.wellbeing-shell'),content=document.querySelector('.app-screen-content');
  shell.style.paddingTop=(parseFloat(getComputedStyle(shell).paddingTop)+top)+'px';
  content.style.paddingBottom=(parseFloat(getComputedStyle(content).paddingBottom)+bottom)+'px';
  document.querySelector('[data-testid="shared-bottom-hud"]').style.paddingBottom=bottom+'px';
 },profile);
 const audit=await page.evaluate(()=>{
  const shell=document.querySelector('.wellbeing-shell'),dock=document.querySelector('[data-testid="shared-bottom-hud"] nav').getBoundingClientRect();
  const action=document.querySelector('.wellbeing-breath-actions button').getBoundingClientRect(),footer=document.querySelector('.wellbeing-footer').getBoundingClientRect(),hit=document.elementFromPoint(action.x+action.width/2,action.y+action.height/2);
  return {actionClear:document.querySelector('.wellbeing-breath-actions button').contains(hit),actionBottom:action.bottom,footerTop:footer.top,scroll:document.documentElement.scrollHeight>innerHeight+1||shell.scrollHeight>shell.clientHeight+1,buttons:[...shell.querySelectorAll('button')].filter(n=>n.checkVisibility()).map(n=>({label:n.textContent,rect:n.getBoundingClientRect().toJSON()})),dockTop:dock.top,gardenHeight:document.querySelector('.wellbeing-bloom-garden').getBoundingClientRect().height};
 });
 expect(audit.scroll).toBe(false);expect(audit.gardenHeight).toBeGreaterThanOrEqual(40);
 expect(audit.actionClear).toBe(true);expect(audit.actionBottom).toBeLessThanOrEqual(audit.footerTop);
 for(const {rect} of audit.buttons){expect(rect.bottom).toBeLessThanOrEqual(audit.dockTop+1);expect(rect.left).toBeGreaterThanOrEqual(0);expect(rect.right).toBeLessThanOrEqual(profile.width+1);}
 await page.screenshot({path:`${out}/${profile.width}-ready.png`});
 await page.getByRole('button',{name:'Begin first cycle',exact:true}).click();
 await expect(page.locator('[data-breathing-phase="in"]')).toBeVisible();
 await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 await page.setViewportSize({width:profile.height,height:profile.width});await expect(page.getByRole('heading',{name:'Hold your phone upright'})).toBeVisible();
 await expect(page.locator('.wellbeing-shell')).toHaveAttribute('data-wellbeing-paused','true');
 await page.setViewportSize(profile);await expect(page.locator('[data-gameplay-orientation-gate]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 results.push({profile,audit,portraitAndPausePassed:true});await context.close();console.log('PASS',profile.width,'portrait, no scrolling, controls clear, pause retained');
}
 const context=await browser.newContext({viewport:{width:390,height:844}});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 const page=await context.newPage();
 for(const id of ['breathing_bloom','peaceful_pond','candle_calm','constellation_connect','leaf_drift','thought_sort']){
  await page.goto('http://127.0.0.1:3024/wellbeing');await page.locator(`[data-wellbeing-select="${id}"]`).click();
  await expect(page.locator(`[data-wellbeing-activity="${id}"]`)).toBeVisible();await expect(page.locator('[data-testid="shared-top-hud"]')).toHaveCount(0);
 }
 await context.close();results.push({allSixCalmActivitiesHideTopHud:true});
}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify(results,null,2));
