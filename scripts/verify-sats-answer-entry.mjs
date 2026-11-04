import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out=process.env.LEGEND_ANSWER_OUTPUT||'qa-artifacts/recommended-changes/answer-entry';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
for(const profile of [{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375}])for(const paper of [1,2,3]){
 const c=await browser.newContext({viewport:profile,hasTouch:profile.name==='phone',reducedMotion:'reduce'});await installReleaseAccountFixture(c);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);const row={profile:profile.name,paper,passed:false};
 try{
  await p.goto(base+`/game/8/${paper}`,{waitUntil:'domcontentloaded'});await p.locator('.sats-mock').waitFor();for(let i=0;i<4;i++){await p.waitForTimeout(150);const dialog=p.locator('[role=dialog]:visible').last();if(!await dialog.count())break;const button=dialog.locator('[data-dialog-primary]');if(!await button.count())break;const node=await dialog.elementHandle();await button.click();await p.waitForFunction(n=>!n.isConnected,node);}
  const missions=await p.evaluate(async paper=>{const key=['crystal_core','mirror_gate','matrix_match'][paper-1],checkpoint=Object.keys(sessionStorage).find(k=>k.startsWith(`sats-legends-mock-checkpoint-v4:${key}:`));const saved=JSON.parse(sessionStorage.getItem(checkpoint));const {buildSatsPaper}=await import('/src/systems/content/satsAdventure.ts');return buildSatsPaper(key,saved.seed).missions;},paper);
  const entered=missions.findIndex(q=>!q.fields[0].options&&!q.marking&&!['draw-angle','draw-rectangle','construct-graph','ext-symmetry','depth-line-build','depth-pie-build','depth-angle-draw','depth-symmetry-axes','depth-rectangle-build'].includes(q.id));
  const navigate=async index=>{await p.getByRole('button',{name:'Mission list',exact:true}).click();await p.getByRole('button',{name:new RegExp(`^Mission ${index+1},`)}).click();await expect(p.getByRole('dialog',{name:'Mission list',exact:true})).toHaveCount(0);};await navigate(entered);
  await p.locator('.sats-answer-entry button').first().click();const pad=p.getByRole('dialog',{name:/Answer pad:/});await expect(pad).toBeVisible();await pad.getByRole('button',{name:'4',exact:true}).click();await pad.getByRole('button',{name:'2',exact:true}).click();await expect(pad.locator('output')).toHaveText('42');
  const bounds=await pad.boundingBox();expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(profile.height+1);await p.screenshot({path:`${out}/${profile.name}-paper-${paper}-pad.png`});await pad.getByRole('button',{name:'Done',exact:true}).click();await expect(p.locator('.sats-answer-entry input').first()).toHaveValue('42');
  await p.getByRole('button',{name:'Save & continue',exact:true}).click();await navigate(entered);await expect(p.locator('.sats-answer-entry input').first()).toHaveValue('42');
  if(paper>1){
   const i=missions.findIndex(q=>q.marks===3),q=missions[i];await navigate(i);await p.screenshot({path:`${out}/${profile.name}-paper-${paper}-reasoning.png`});await p.locator('.sats-answer-entry input').first().fill('999999');await p.locator('.sats-tap-workpad summary').click();await p.getByRole('textbox',{name:'Your on-screen working',exact:true}).fill(q.fields[1].answer);await p.locator('.sats-tap-workpad summary').click();await p.getByRole('button',{name:'Save & continue',exact:true}).click();if(await p.getByRole('dialog',{name:'Mission list',exact:true}).count())await p.getByRole('button',{name:'Back to mission',exact:true}).click();await p.getByRole('button',{name:'Finish run',exact:true}).click();await p.getByRole('button',{name:'Finish and review',exact:true}).click();await expect(p.locator(`#sats-review-${q.id} summary`)).toContainText('2/3');row.partialMethod=true;
  }
  expect(errors).toEqual([]);row.passed=true;
 }catch(e){row.error=e.message;await p.screenshot({path:`${out}/${profile.name}-paper-${paper}-failure.png`}).catch(()=>{});}
 rows.push(row);await c.close();await writeFile(out+'/report.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',profile.name,paper,row.error||'');
}
await browser.close();if(rows.some(r=>!r.passed))process.exitCode=1;
