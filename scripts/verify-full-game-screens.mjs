import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {auditScreenSpace} from './qa/screen-space-audit.mjs';
import {auditSatsModelContainment} from './qa/sats-model-containment.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out='qa-artifacts/full-screen-qa';
const catalog=JSON.parse(await readFile(out+'/catalog.json','utf8'));
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375},{name:'iphone-webkit',width:844,height:390}].filter(p=>!process.env.LEGEND_SCREEN_PROFILE||p.name===process.env.LEGEND_SCREEN_PROFILE);
// Grid ticks sit above transparent point hit areas; retain raw findings for review.
const gridAnnotation=issue=>/^Marker at x=/.test(issue.b||'')&&(issue.kind==='label-control'&&/^(-?\d+|x|y|●|Start \(|,|\))$/.test(issue.a)||issue.kind==='label-outside-owner'&&issue.a==='S');
const selected=new Set((process.env.LEGEND_SCREEN_KEYS||'').split(',').filter(Boolean));
for(const profile of profiles){
 const file=out+'/'+profile.name+'-checks.json';
 const rows=selected.size?JSON.parse(await readFile(file,'utf8').catch(()=>'[]')).filter(r=>!selected.has(r.key)):[];
 const jobs=catalog.filter(g=>!selected.size||selected.has(g.key));await mkdir(out+'/'+profile.name,{recursive:true});
 const browser=profile.name.includes('webkit')?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 async function worker(){let context=await browser.newContext({viewport:profile,hasTouch:profile.width<1000,reducedMotion:profile.name==='desktop'?'no-preference':'reduce'});await installReleaseAccountFixture(context);let page=await context.newPage();page.setDefaultTimeout(30000);let errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(png|webp|jpg|svg|woff2|mp3)(\?|$)/.test(r.url()))assets.push(r.status()+' '+r.url());});
 try{while(jobs.length){const game=jobs.shift(),row={...game,profile:profile.name,passed:false};errors=[];assets=[];
  try{if(profile.name.includes('webkit')){await context.close();context=await browser.newContext({viewport:profile,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(png|webp|jpg|svg|woff2|mp3)(\?|$)/.test(r.url()))assets.push(r.status()+' '+r.url());});}
   await page.goto(base+game.route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').waitFor();
   for(let i=0;i<5;i++){await page.waitForTimeout(120);const dialog=page.locator('[role=dialog]:visible').last(),button=dialog.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;const h=await dialog.elementHandle();try{await button.click({timeout:3000});}catch(e){if(await button.isVisible().catch(()=>false))throw e;}if(h)await page.waitForFunction(n=>!n.isConnected,h).catch(()=>{});}
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-vision-character]')].every(n=>n.dataset.visionReady==='true'));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(game.key==='ratio_fractions'?3300:profile.name.includes('webkit')?1500:500);
   row.layout=await page.evaluate(auditLayout);row.space=await page.evaluate(auditScreenSpace);row.model=await page.evaluate(auditSatsModelContainment);
   row.motionIssues=[];if(profile.name==='desktop'){for(let i=0;i<3;i++){await page.waitForTimeout(160);const a=await page.evaluate(auditLayout);row.motionIssues.push(...a.issues);}}
   row.file=profile.name+'/'+game.captureId+'.png';await page.screenshot({path:out+'/'+row.file});
   row.blocked=row.space.controls.filter(c=>!c.disabled&&(!c.centreHit||c.visibleFraction<.95));
   row.acceptedFindings=game.key==='coordinates_quest'?[...row.layout.issues,...row.motionIssues].filter(gridAnnotation):[];
   const actionable=[...row.layout.issues,...row.motionIssues].filter(issue=>game.key!=='coordinates_quest'||!gridAnnotation(issue));
   row.passed=!row.layout.overflow&&!actionable.length&&!row.model.issues.length&&!errors.length&&!assets.length&&!row.blocked.length;
  }catch(e){row.error=e.message;}
  row.runtimeErrors=[...errors];row.assetFailures=[...assets];rows.push(row);await writeFile(file,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'REVIEW',profile.name,game.captureId,row.error||JSON.stringify({layout:row.layout?.issues.length,model:row.model?.issues.length,motion:row.motionIssues?.length,blocked:row.blocked?.map(b=>b.label),errors}));
 }}finally{await context.close();}}
 try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
 console.log('COMPLETE',profile.name,rows.length,rows.filter(r=>r.passed).length);
}
