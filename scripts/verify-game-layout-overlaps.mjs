import {auditLayout} from './qa/layout-overlap-audit.mjs';
import {chromium} from 'playwright';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

// Full bounds matter: a clickable centre does not prove a label is unobscured.
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3012';
const output = process.env.LEGEND_QA_OUTPUT || 'qa-artifacts/layout-overlaps';
const catalog = JSON.parse(await readFile(process.env.LEGEND_QA_CATALOG || 'qa-artifacts/vision-implementation/catalog.json', 'utf8'));
const keys = new Set((process.env.LEGEND_QA_KEYS || '').split(',').filter(Boolean));
const profiles = [{name:'small-phone',width:568,height:320},{name:'phone',width:667,height:375},{name:'wide-phone',width:844,height:390},{name:'desktop',width:1440,height:900}]
  .filter(p => !process.env.LEGEND_QA_PROFILE || p.name === process.env.LEGEND_QA_PROFILE);
const reportPath=`${output}/report${keys.size?'-focused':''}${process.env.LEGEND_QA_PROFILE?'-'+process.env.LEGEND_QA_PROFILE:''}${process.env.LEGEND_QA_MOTION==='no-preference'?'-motion':''}.json`;
const rows = process.env.LEGEND_QA_RESUME==='1' ? JSON.parse(await readFile(reportPath,'utf8').catch(()=>'[]')) : [];
const completed=new Set(rows.filter(r=>r.passed).map(r=>r.name+':'+r.route));
const jobs = profiles.flatMap(profile => catalog.filter(g => (!keys.size || keys.has(g.key))&&!completed.has(profile.name+':'+g.route)).map(game => ({...game,...profile})));
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
await mkdir(output, {recursive:true});
const browser = await chromium.launch();
async function worker() {
  let retainedContext;
  let retainedProfile;
  let retainedPage;
  try {
  while (jobs.length) {
    const game = jobs.shift();
    if(!retainedContext || retainedProfile!==game.name || process.env.LEGEND_QA_REUSE_CONTEXT!=='1'){
      await retainedContext?.close();
      retainedPage=undefined;
      retainedContext=await browser.newContext({viewport:{width:game.width,height:game.height},hasTouch:game.width<1000,reducedMotion:process.env.LEGEND_QA_MOTION||'reduce'});
      await installReleaseAccountFixture(retainedContext);
      retainedProfile=game.name;
    }
    const context=retainedContext;
    const page = retainedPage || await context.newPage();
    if(process.env.LEGEND_QA_SPA==='1')retainedPage=page;
    page.setDefaultTimeout(30000);
    const row = {...game,passed:false};
    try {
      if(process.env.LEGEND_QA_SPA==='1'&&page.url().startsWith(base)){
        const oldStage=await page.locator('[data-game-set]').elementHandle();
        await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);
        if(oldStage)await page.waitForFunction(n=>!n.isConnected,oldStage);
      }else await page.goto(base+game.route, {waitUntil:'domcontentloaded'});
      await page.locator('[data-game-set]').waitFor();
      for (let i=0;i<4;i++) {
        const button = (await page.locator('[data-dialog-primary]:visible').elementHandles())[0];
        if (button) await button.click().catch(async e => {if(await button.isVisible().catch(()=>false)) throw e;});
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(game.key==='ratio_fractions'?3200:400);

      row.audit = await page.evaluate(auditLayout);
      if(process.env.LEGEND_QA_MOTION==='no-preference'){
        row.motionSamples=[];
        for(let sample=0;sample<12;sample++){
          await page.waitForTimeout(150);
          const audit=await page.evaluate(auditLayout);
          row.motionSamples.push({sample,issues:audit.issues});
          row.audit.issues.push(...audit.issues.map(issue=>({...issue,sample})));
        }
      }
      row.screenshot=`${game.name}-${game.captureId || game.key+'-'+game.tier}.png`;
      await page.screenshot({path:`${output}/${row.screenshot}`});
      row.passed = row.audit.issues.length===0&&!row.audit.overflow;
    } catch(e) {row.error=e.message;}
    const prior=rows.findIndex(r=>r.name===row.name&&r.route===row.route);
    if(prior>=0)rows[prior]=row;else rows.push(row);
    console.log(`${row.passed?'PASS':'FAIL'} ${game.name} ${game.key} ${game.tier} ${row.audit?.issues.length??row.error}`);
    if(process.env.LEGEND_QA_SPA!=='1')await page.close();
    await writeFile(reportPath,JSON.stringify(rows,null,2));
  }
  } finally {await retainedContext?.close();}
}
try {await Promise.all(Array.from({length:Number(process.env.LEGEND_QA_WORKERS||3)},()=>worker()));} finally {await browser.close();}
console.log(JSON.stringify({total:rows.length,passed:rows.filter(r=>r.passed).length}));
if(rows.some(r=>!r.passed))process.exitCode=1;
