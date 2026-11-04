import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/full-screen-qa',base='http://127.0.0.1:3018';const catalog=JSON.parse(await readFile(out+'/catalog.json','utf8'));const games=[...new Map(catalog.map(g=>[g.key,g])).values()];const islandGames=[...new Map(games.map(g=>[g.island,g])).values()];
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375}];
const jobs=profiles.flatMap(profile=>[...games.map(game=>({kind:'help',game,profile})),...islandGames.flatMap(game=>['victory','gameover'].map(outcome=>({kind:'result',outcome,game,profile})))]);const rows=[];const b=await chromium.launch();
async function dismiss(p){for(let i=0;i<5;i++){await p.waitForTimeout(100);const d=p.locator('[role=dialog]:visible').last(),button=d.locator('[data-dialog-primary]').first();if(!await button.count())break;const h=await d.elementHandle();try{await button.click({timeout:3000});}catch(e){if(await button.isVisible().catch(()=>false))throw e;}if(h)await p.waitForFunction(n=>!n.isConnected,h);}}
async function worker(){while(jobs.length){const job=jobs.shift(),{profile,game}=job,c=await b.newContext({viewport:profile,reducedMotion:'reduce'});await installReleaseAccountFixture(c);const p=await c.newPage();p.setDefaultTimeout(30000);const row={kind:job.kind,outcome:job.outcome,key:game.key,island:game.island,profile:profile.name,passed:false};const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
 if(job.kind==='help'){await p.goto(base+game.route,{waitUntil:'domcontentloaded'});await p.locator('[data-game-set]').waitFor();await dismiss(p);await p.getByRole('button',{name:'How to play',exact:true}).click();}
 else await p.goto(base+`/qa-artifacts/level-result-themes/index.html?game=${game.key}&outcome=${job.outcome}`,{waitUntil:'domcontentloaded'});
 const d=p.locator('[role=dialog]:visible').last();await d.waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
 row.audit=await p.evaluate(auditLayout,{rootSelector:'[role="dialog"]',includeChrome:false});
 row.bounds=await d.boundingBox();row.fits=row.bounds.x>=-1&&row.bounds.y>=-1&&row.bounds.x+row.bounds.width<=profile.width+1&&row.bounds.y+row.bounds.height<=profile.height+1;
 const action=job.kind==='help'?d.getByRole('button',{name:'Back to mission',exact:true}):d.locator('.level-result-actions button').first();await action.scrollIntoViewIfNeeded();row.action=await action.evaluate(n=>{const r=n.getBoundingClientRect();return {label:n.textContent,height:r.height,reachable:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),within:r.top>=0&&r.bottom<=innerHeight};});
 row.file=`overlays/${profile.name}-${job.kind}-${game.key}${job.outcome?'-'+job.outcome:''}.png`;await mkdir(out+'/overlays',{recursive:true});await p.screenshot({path:out+'/'+row.file});
 if(job.kind==='help'){await action.click();await d.waitFor({state:'hidden'});}
 row.passed=row.fits&&row.action.reachable&&row.action.within&&!row.audit.issues.length&&!row.audit.overflow&&!errors.length;
 }catch(e){row.error=e.message;}row.runtimeErrors=errors;rows.push(row);await writeFile(out+'/overlay-checks.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'REVIEW',profile.name,row.kind,row.key,row.outcome||'',row.error||JSON.stringify({issues:row.audit?.issues.length,action:row.action}));await c.close();}}
try{await Promise.all([worker(),worker()]);}finally{await b.close();}
