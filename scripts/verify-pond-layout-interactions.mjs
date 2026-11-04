import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const profiles=[['small-portrait',320,568],['portrait',390,844],['small-landscape',568,320],['wide-landscape',844,390],['desktop',1440,900]];
const rows=[];process.env.LEGEND_QA_FETCH_FIXTURE='1';
const browser=await chromium.launch();
try{for(const [profile,width,height] of profiles){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 const page=await context.newPage();await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
 await page.evaluate(()=>{history.pushState({},'','/wellbeing');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-wellbeing-select="peaceful_pond"]').click();
 for(let pad=1;pad<=10;pad++){
  await page.getByRole('button',{name:'I noticed something',exact:true}).click();
  const control=page.locator(`[data-pond-pad="${pad}"]`);await control.press('Enter');
  await page.waitForFunction(p=>document.querySelector(`[data-pond-pad="${p}"]`)?.getAttribute('aria-pressed')==='true',pad);
  const audit=await page.evaluate(auditLayout,{rootSelector:'.app-viewport',includeLinks:true});
  rows.push({profile,pad,passed:!audit.overflow&&audit.issues.length===0,audit});
 }
 await page.locator('[data-wellbeing-complete]').waitFor();await context.close();console.log('PASS '+profile+' all ten pads and completion');
}}finally{await browser.close();await writeFile('qa-artifacts/all-layout-qa/pond-interactions.json',JSON.stringify(rows,null,2));}
if(rows.length!==50||rows.some(r=>!r.passed))throw Error('Pond interaction layout failed');
