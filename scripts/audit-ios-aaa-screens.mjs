import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.LEGEND_AUDIT_TABLET?'qa-artifacts/ios-aaa-audit/tablet':'qa-artifacts/ios-aaa-audit';await mkdir(out,{recursive:true});
const keys=(process.env.LEGEND_TIPS_KEYS||'').split(',').filter(Boolean),catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8')).filter(g=>!keys.length||keys.includes(g.key));
const browser=await chromium.launch(),results=[];
try{for(const game of catalog){
 const portrait=['prime_pop','rounding_rocket'].includes(game.key),viewport=process.env.LEGEND_AUDIT_TABLET?(portrait?{width:768,height:1024}:{width:1024,height:768}):(portrait?{width:390,height:844}:{width:844,height:390});
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto('http://127.0.0.1:3024'+game.route,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(180);}
  await page.waitForTimeout(400);
  const tips=page.locator('[data-game-tips-control]');await expect(tips.locator('svg.lucide-lightbulb')).toHaveCount(1);
  const audit=await page.evaluate(()=>{
   const helpers=[...document.querySelectorAll('.app-viewport [data-game-tip="true"]')];
   const dock=document.querySelector('[data-testid="shared-bottom-hud"] nav').getBoundingClientRect();
   const buttons=[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>n.getBoundingClientRect());
   const root=document.documentElement;
   const targets=[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>{const r=n.getBoundingClientRect();return {text:(n.textContent||n.getAttribute('aria-label')||'').trim().slice(0,60),width:r.width,height:r.height,x:r.x,y:r.y,fontSize:parseFloat(getComputedStyle(n).fontSize)}});
   return {targets,smallTargets:targets.filter(t=>t.width<43.5||t.height<43.5),offscreenTargets:targets.filter(t=>t.x<-.5||t.y<-.5||t.x+t.width>innerWidth+.5||t.y+t.height>innerHeight+.5),horizontalOverflow:root.scrollWidth>innerWidth+1,verticalOverflow:root.scrollHeight>innerHeight+1,helperCount:helpers.length,helperVisible:helpers.some(n=>getComputedStyle(n).display!=='none'),dockOverlaps:buttons.filter(r=>r.left<dock.right&&r.right>dock.left&&r.top<dock.bottom&&r.bottom>dock.top).length};
  });
  expect(audit.helperVisible).toBe(false);expect(audit.dockOverlaps).toBe(0);
  await page.screenshot({path:`${out}/${game.key}-play.png`});
  await tips.click();const dialog=page.getByRole('dialog',{name:/how to play$/});await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Rules and tips',{exact:true})).toBeVisible();expect(await dialog.locator('.legend-briefing-steps li').count()).toBeGreaterThanOrEqual(3);
  const reading=await dialog.locator('.legend-dialog-scroll').evaluate(n=>({height:n.clientHeight,scrollHeight:n.scrollHeight,firstRuleTop:n.querySelector('.legend-briefing-steps li')?.getBoundingClientRect().top,scrollBottom:n.getBoundingClientRect().bottom}));
  audit.tipsReading=reading;
  if(audit.helperCount)expect(await dialog.locator('.legend-round-tips li').count()).toBeGreaterThan(0);
  const stage=page.locator('[data-game-set]');await expect(stage).toHaveAttribute('data-stage-paused','true');
  const timer=page.getByRole('progressbar',{name:'Time remaining'}),time=await timer.count()?await timer.getAttribute('aria-valuenow'):null;
  if(['scale_builder','prime_pop','maths_vs_zombies'].includes(game.key)){await page.waitForTimeout(1200);expect(await timer.getAttribute('aria-valuenow')).toBe(time);}
  if(['scale_builder','prime_pop','maths_vs_zombies','line_graph_lab','rotation_relay'].includes(game.key))await page.screenshot({path:`${out}/${game.key}-tips.png`});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(tips).toBeFocused();await expect(stage).toHaveAttribute('data-stage-paused','false');expect(errors).toEqual([]);
  results.push({key:game.key,viewport,audit,rulesPresent:true,paused:true,focusRestored:true,passed:true});console.log('PASS',game.key);
 }catch(error){results.push({key:game.key,passed:false,error:error.message});await page.screenshot({path:`${out}/${game.key}-failure.png`});console.log('FAIL',game.key,error.message);}
 await context.close();
}}finally{await browser.close();await writeFile(out+(keys.length?'/results-focused.json':'/results.json'),JSON.stringify(results,null,2));}
if(results.some(row=>!row.passed))process.exitCode=1;
