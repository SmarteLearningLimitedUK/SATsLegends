import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditScreenSpace} from './qa/screen-space-audit.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.LEGEND_QA_OUTPUT||'qa-artifacts/comprehensive-qa/screen-space',base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const engine=process.env.LEGEND_QA_ENGINE||'chromium';
const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
const catalog=JSON.parse(await readFile(process.env.LEGEND_QA_CATALOG||'qa-artifacts/comprehensive-qa/chromium/catalog.json','utf8'));
const selected=new Set((process.env.LEGEND_QA_KEYS||'').split(',').filter(Boolean));
const profiles=(engine==='webkit'?[{name:'iphone-landscape',width:844,height:390}]:[{name:'desktop',width:1920,height:1080},{name:'compact-phone',width:667,height:375}]).filter(p=>!process.env.LEGEND_QA_PROFILE||p.name===process.env.LEGEND_QA_PROFILE);
const jobs=profiles.flatMap(profile=>catalog.filter(g=>!selected.size||selected.has(g.key)).map(game=>({game,profile}))),rows=[];await mkdir(out,{recursive:true});
async function worker(){while(jobs.length){const {game,profile}=jobs.shift();const c=await browser.newContext({viewport:profile,hasTouch:profile.width<1000,reducedMotion:'reduce'});await installReleaseAccountFixture(c);await c.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'QA review'}));});const p=await c.newPage();p.setDefaultTimeout(30000);const errors=[];p.on('pageerror',e=>errors.push(e.message));const row={...game,profile:profile.name,engine};try{
 await p.goto(base+'/map',{waitUntil:'domcontentloaded'});await p.locator('[data-qa-screen="world_map"]').waitFor();await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<6;i++){await p.waitForTimeout(180);const d=p.locator('[role="dialog"]:visible').last();if(!await d.count())break;const b=d.locator('[data-dialog-primary]');if(!await b.count())break;const h=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,h);}
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(game.key==='ratio_fractions'?3300:1900);
 row.space=await p.evaluate(auditScreenSpace);row.layout=await p.evaluate(auditLayout);row.file=`${profile.name}-${game.captureId||game.key}.png`;await p.screenshot({path:out+'/'+row.file});
 const board=p.getByRole('button',{name:'Open on-screen working board',exact:true});if(await board.isVisible().catch(()=>false)){await board.click();row.workingDialog={count:await p.locator('[role="dialog"]:visible').count(),controls:await p.locator('[role="dialog"]:visible button').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),rect:n.getBoundingClientRect().toJSON()})))};await p.keyboard.press('Escape');}
 }catch(e){row.error=e.message;}row.runtimeErrors=errors;rows.push(row);console.log(row.error?'ERROR':'AUDITED',profile.name,game.key,row.error||'');await c.close();await writeFile(out+'/report.json',JSON.stringify(rows,null,2));}}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
console.log(JSON.stringify({cases:rows.length,errors:rows.filter(r=>r.error||r.runtimeErrors.length).length}));
