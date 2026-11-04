import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditQuestionAlignment} from './qa/question-alignment-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018',out='qa-artifacts/question-alignment';
const catalog=JSON.parse(await readFile(out+'/after/catalog.json','utf8'));
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const profile of [{name:'desktop',width:1920,height:1080},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'reduce'});await installReleaseAccountFixture(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  for(const key of ['scale_builder','conversion_canyon','mean_machine','place_value_panic','line_graph_lab','graph_grabber','formula_forge','matrix_match']){
   const route=catalog.find(g=>g.key===key).route;
   await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);
   await page.locator(`[data-game-set][data-vision-game="${key}"]`).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   for(let n=0;n<6;n++){
    await page.waitForTimeout(180);const dialog=page.locator('[role="dialog"]:visible').last();if(!await dialog.count())break;
    const button=dialog.locator('[data-dialog-primary]').first();if(!await button.count())break;
    const node=await dialog.elementHandle();await button.click();await page.waitForFunction(n=>!n.isConnected,node);
   }
   await page.waitForTimeout(200);const alignment=await page.evaluate(auditQuestionAlignment);
   assert.equal(alignment.cards.length,1);assert(Math.abs(alignment.cards[0].offset)<1);
   if(key==='scale_builder'){
    const panel=page.locator('[data-scale-controls]');
    const clipped=await panel.evaluate(panel=>{const r=panel.getBoundingClientRect();return [...panel.querySelectorAll('button,input')].filter(n=>n.checkVisibility()).filter(n=>{const b=n.getBoundingClientRect();return b.top<r.top-1||b.bottom>r.bottom+1;}).map(n=>n.getAttribute('aria-label')||n.textContent);});
    assert.deepEqual(clipped,[],'All number-pad and submit controls fit inside the panel');
    const expected=await page.locator('[data-scale-project]').evaluate(n=>[Number(n.dataset.scaleBaseLength)*Number(n.dataset.scaleFactor),Number(n.dataset.scaleBaseWidth)*Number(n.dataset.scaleFactor)]);
    await page.getByRole('textbox',{name:'New length',exact:true}).fill(String(expected[0]));await page.getByRole('textbox',{name:'New width',exact:true}).fill(String(expected[1]));
    await page.getByRole('button',{name:'Check lengths',exact:true}).click();await page.getByRole('button',{name:'Correct!',exact:true}).waitFor();
   }
   console.log('CHECK',profile.name,key);
   results.push({profile:profile.name,key,centred:true,scaleSubmission:key==='scale_builder'?true:undefined,passed:true});
  }
  // A single mounted game must remain centred when its viewport changes in either direction.
  await page.setViewportSize({width:profile.width===1920?667:1920,height:profile.width===1920?375:1080});await page.waitForTimeout(300);
  assert((await page.evaluate(auditQuestionAlignment)).cards.every(c=>Math.abs(c.offset)<1));
  await page.evaluate(()=>{history.pushState({},'','/map');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-qa-screen="world_map"]').waitFor();
  assert.equal(await page.locator('[data-viewport-question]').count(),0,'Question portal removed when leaving gameplay');assert.deepEqual(errors,[]);
  await context.close();console.log('PASS',profile.name,'8 route transitions, resize, portal cleanup and scale submission');
 }
}finally{await browser.close();await writeFile(out+'/interaction-verification.json',JSON.stringify({passed:results.length===24,results},null,2));}
