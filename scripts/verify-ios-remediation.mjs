import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.LEGEND_QA_OUT||'qa-artifacts/ios-remediation/after';await mkdir(out,{recursive:true});
const keys=(process.env.LEGEND_TIPS_KEYS||'').split(',').filter(Boolean),catalog=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8')).filter(g=>!keys.length||keys.includes(g.key));
const browser=await chromium.launch(),results=[];
try{for(const game of catalog){
 const portrait=['prime_pop','rounding_rocket'].includes(game.key),viewport=process.env.LEGEND_QA_SIZE?{width:Number(process.env.LEGEND_QA_SIZE.split('x')[0]),height:Number(process.env.LEGEND_QA_SIZE.split('x')[1])}:(portrait?{width:390,height:844}:{width:844,height:390});
 if(portrait&&viewport.width>viewport.height&&viewport.width<1100){const width=viewport.width;viewport.width=viewport.height;viewport.height=width;}
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 await context.addInitScript(()=>{let seed=1234567;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 const page=await context.newPage(),errors=[],consoleMessages=[],requestFailures=[],httpErrors=[],pendingRequests=new Map();page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>consoleMessages.push({type:message.type(),text:message.text()}));
 page.on('request',request=>pendingRequests.set(request,{url:request.url(),type:request.resourceType(),started:Date.now()}));
 page.on('requestfinished',request=>pendingRequests.delete(request));
 page.on('requestfailed',request=>{requestFailures.push({...pendingRequests.get(request),error:request.failure()?.errorText});pendingRequests.delete(request);});
 page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});
 try{
  await page.goto((process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3023')+game.route,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-game-set]').waitFor();
  for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(180);}
  await page.waitForTimeout(400);
  if(process.env.LEGEND_QA_INSETS){const [left,top,right,bottom]=process.env.LEGEND_QA_INSETS.split(',').map(Number);await page.locator('[data-game-layout="flow"]').evaluate((n,i)=>{for(const [edge,value]of Object.entries(i))n.style.setProperty('--game-safe-'+edge,value+'px')},{left,top,right,bottom});await page.waitForTimeout(250);}
  const tips=page.locator('[data-game-tips-control]');await expect(tips.locator('svg.lucide-lightbulb')).toHaveCount(1);
  const audit=await page.evaluate(()=>{
   const helpers=[...document.querySelectorAll('.app-viewport [data-game-tip="true"]')];
   const dock=document.querySelector('[data-testid="shared-bottom-hud"] nav').getBoundingClientRect();
   const topHud=document.querySelector('[data-testid="shared-top-hud"]').getBoundingClientRect();
   const buttons=[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>n.getBoundingClientRect());
   const root=document.documentElement;
   const questions=[...document.querySelectorAll('.app-viewport [data-game-question]')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>n.getBoundingClientRect());
   const targets=[...document.querySelectorAll('[data-game-set] button')].filter(n=>n.checkVisibility({opacityProperty:true,checkVisibilityCSS:true})).map(n=>{const r=n.getBoundingClientRect();return {text:(n.textContent||n.getAttribute('aria-label')||'').trim().slice(0,60),width:r.width,height:r.height,x:r.x,y:r.y,fontSize:parseFloat(getComputedStyle(n).fontSize)}});
   return {targets,questionHudOverlaps:questions.filter(r=>r.left<topHud.right&&r.right>topHud.left&&r.top<topHud.bottom&&r.bottom>topHud.top).length,smallTargets:targets.filter(t=>t.width<43.5||t.height<43.5),offscreenTargets:targets.filter(t=>t.x<-.5||t.y<-.5||t.x+t.width>innerWidth+.5||t.y+t.height>innerHeight+.5),horizontalOverflow:root.scrollWidth>innerWidth+1,verticalOverflow:root.scrollHeight>innerHeight+1,helperCount:helpers.length,helperVisible:helpers.some(n=>getComputedStyle(n).display!=='none'),topHudOverlaps:buttons.filter(r=>r.left<topHud.right&&r.right>topHud.left&&r.top<topHud.bottom&&r.bottom>topHud.top).length,dockOverlaps:buttons.filter(r=>r.left<dock.right&&r.right>dock.left&&r.top<dock.bottom&&r.bottom>dock.top).length};
  });
  await writeFile(`${out}/${game.key}-bounds.json`,JSON.stringify(audit,null,2));
  expect(audit.helperVisible,'optional helpers hidden').toBe(false);expect(audit.dockOverlaps,'buttons clear of bottom dock').toBe(0);expect(audit.topHudOverlaps,'buttons clear of top HUD').toBe(0);expect(audit.questionHudOverlaps,'questions clear of top HUD').toBe(0);expect(audit.offscreenTargets,'all buttons within viewport').toEqual([]);expect(audit.horizontalOverflow,'no horizontal document overflow').toBe(false);expect(audit.verticalOverflow,'no document scrolling').toBe(false);
  await page.screenshot({path:`${out}/${game.key}-play.png`});
  await tips.click();const dialog=page.getByRole('dialog',{name:/how to play$/});await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Rules and tips',{exact:true})).toBeVisible();expect(await dialog.locator('.legend-briefing-steps li').count()).toBeGreaterThanOrEqual(3);
  const reading=await dialog.locator('.legend-dialog-scroll').evaluate(n=>({height:n.clientHeight,scrollHeight:n.scrollHeight,firstRuleTop:n.querySelector('.legend-briefing-steps li')?.getBoundingClientRect().top,scrollBottom:n.getBoundingClientRect().bottom}));
  audit.tipsReading=reading;
  if(audit.helperCount)expect(await dialog.locator('.legend-round-tips li').count()).toBeGreaterThan(0);
  const stage=page.locator('[data-game-set]');await expect(stage).toHaveAttribute('data-stage-paused','true');
  const timer=page.getByRole('progressbar',{name:'Time remaining'}),time=await timer.count()?await timer.getAttribute('aria-valuenow'):null;
  if(time !== null && ['scale_builder','prime_pop','maths_vs_zombies'].includes(game.key)){await page.waitForTimeout(1200);expect(await timer.getAttribute('aria-valuenow')).toBe(time);}
  if(['scale_builder','prime_pop','maths_vs_zombies','line_graph_lab','rotation_relay'].includes(game.key))await page.screenshot({path:`${out}/${game.key}-tips.png`});
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(tips).toBeFocused();await expect(stage).toHaveAttribute('data-stage-paused','false');expect(errors).toEqual([]);
  results.push({key:game.key,viewport,audit,rulesPresent:true,paused:true,focusRestored:true,passed:true});console.log('PASS',game.key);
 }catch(error){
  const failure={key:game.key,viewport,passed:false,error:error.message,pageErrors:errors,consoleMessages,requestFailures,httpErrors,pendingRequests:[...pendingRequests.values()]};
  // Save network evidence first, before DOM collection, screenshots or any retry.
  await writeFile(`${out}/${game.key}-failure-diagnostic.json`,JSON.stringify(failure,null,2));
  let diagnosticTimer;
  try{failure.observed=await Promise.race([page.evaluate(()=>({url:location.href,readyState:document.readyState,body:document.body.innerText,questionBounds:[...document.querySelectorAll('[data-game-question]')].map(n=>({text:n.innerText,rect:n.getBoundingClientRect().toJSON()})),stage:document.querySelector('[data-game-set]')?.getBoundingClientRect().toJSON(),links:[...document.querySelectorAll('link')].map(n=>({href:n.href,rel:n.rel,stylesheetLoaded:Boolean(n.sheet)})),resources:performance.getEntriesByType('resource').map(n=>({name:n.name,type:n.initiatorType,duration:n.duration,transferSize:n.transferSize}))})),new Promise((_,reject)=>{diagnosticTimer=setTimeout(()=>reject(new Error('Diagnostic DOM collection did not respond within 5s')),5000);})]);}catch(diagnosticError){failure.observed={error:diagnosticError.message};}finally{clearTimeout(diagnosticTimer);}
  await writeFile(`${out}/${game.key}-failure-diagnostic.json`,JSON.stringify(failure,null,2));
  results.push(failure);await page.screenshot({path:`${out}/${game.key}-failure.png`,timeout:10000}).catch(screenshotError=>console.log('SCREENSHOT FAILED',game.key,screenshotError.message));console.log('FAIL',game.key,error.message);
 }
 await context.close();
}}finally{await browser.close();await writeFile(out+(keys.length?'/results-focused.json':'/results.json'),JSON.stringify(results,null,2));}
if(results.some(row=>!row.passed))process.exitCode=1;
