import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const output='qa-artifacts/latest-visual-audit';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try {
 for(const viewport of [{width:1187,height:884},{width:844,height:390},{width:568,height:320}]) {
  const context=await browser.newContext({viewport});
  await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{
   localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'bran',level:100}));
   localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'bran',level:100},revision:1},requests:{}}));
  });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:3012/map');
  await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(()=>{history.pushState({},'','/game/6/9');dispatchEvent(new PopStateEvent('popstate'));});
  await page.locator('[data-clock-face]').waitFor();
  for(let i=0;i<4;i++) {
   await page.waitForTimeout(180);
   const dialog=page.locator('[role="dialog"]:visible').last();
   if(!await dialog.count())break;
   const node=await dialog.elementHandle();
   await dialog.locator('[data-dialog-primary]').click();
   await page.waitForFunction(n=>!n.isConnected,node);
  }
  await page.getByRole('button',{name:'Increase hour',exact:true}).click();
  await page.getByRole('button',{name:'Increase minutes',exact:true}).click();
  assert.equal(await page.locator('[data-clock-face]').getAttribute('data-clock-current'),'01:01');
  await page.getByRole('button',{name:'Decrease hour',exact:true}).click();
  await page.getByRole('button',{name:'Decrease minutes',exact:true}).click();
  assert.equal(await page.locator('[data-clock-face]').getAttribute('data-clock-current'),'12:00');
  const text=await page.locator('.chrono-layout [data-game-question]').innerText();
  const [,hour,minute]=text.match(/(\d{2}):(\d{2})/);
  for(let i=0;i<Number(hour)%12;i++)await page.getByRole('button',{name:'Increase hour',exact:true}).click();
  for(let i=0;i<Number(minute);i++)await page.getByRole('button',{name:'Increase minutes',exact:true}).click();
  assert.equal(await page.locator('[data-clock-face]').getAttribute('data-clock-current'),`${hour}:${minute}`);
  await page.waitForTimeout(350);
  const layout=await page.evaluate(auditLayout);
  assert.deepEqual(layout.issues,[]);
  assert.equal(layout.overflow,false);
  const artwork=await page.locator('[data-clock-face] image').getAttribute('href');
  assert.ok(await page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();return im.naturalWidth>1000;},artwork));
  await page.screenshot({path:`${output}/clock-${viewport.width}.png`});
  await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
  await page.getByText('Time restored!',{exact:true}).waitFor();
  results.push({viewport,passed:true,liveHands:true,correctAnswerAccepted:true,layout});
  await context.close();
 }
} finally {
 await browser.close();
 await writeFile(`${output}/clock-verification.json`,JSON.stringify({passed:results.length===3,results},null,2));
}
console.log(JSON.stringify({passed:results.length===3,cases:results.length}));
