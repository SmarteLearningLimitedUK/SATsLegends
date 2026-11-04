import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditScreenSpace} from './qa/screen-space-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out='qa-artifacts/recommended-changes/potion-heroes';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
for(const width of [667,844])for(const avatarId of ['barratt','bran','mochi','vex']){
 const c=await browser.newContext({viewport:{width,height:390},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(c);
 await c.addInitScript(avatarId=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId,level:100}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId,level:100},revision:1},requests:{}}));},avatarId);
 const p=await c.newPage(),row={width,avatarId,passed:false};p.setDefaultTimeout(60000);
 try{
  await p.goto(base+'/map',{waitUntil:'domcontentloaded'});await p.locator('[data-qa-screen="world_map"]').waitFor();await p.evaluate(()=>{history.pushState({},'','/game/7/9');dispatchEvent(new PopStateEvent('popstate'));});await p.locator('[data-game-set]').waitFor();
  for(let i=0;i<6;i++){await p.waitForTimeout(150);const d=p.locator('[role=dialog]:visible').last();if(!await d.count())break;const b=d.locator('[data-dialog-primary]');if(!await b.count())break;const h=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,h);}
  await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('.vision-character')].every(n=>n.dataset.visionReady!=='false'));
  const audit=await p.evaluate(auditScreenSpace);row.feet=audit.actorFeet;expect(row.feet.length).toBe(1);expect(row.feet[0].controlsAtFeet).toEqual([]);
  row.file=`${width}-${avatarId}.png`;await p.screenshot({path:out+'/'+row.file});row.passed=true;
 }catch(e){row.error=e.message;}
 rows.push(row);await c.close();console.log(row.passed?'PASS':'FAIL',width,avatarId,row.error||'');await writeFile(out+'/report.json',JSON.stringify(rows,null,2));
}
await browser.close();if(rows.some(r=>!r.passed))process.exitCode=1;
