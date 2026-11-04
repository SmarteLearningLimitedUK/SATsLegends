import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
const output='qa-artifacts/pyramid-tablets';await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{for(const profile of [{name:'desktop',width:1187,height:884},{name:'phone',width:844,height:390},{name:'small-phone',width:568,height:320}]){
 const context=await browser.newContext({viewport:profile,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'bran',level:100}));localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'bran',level:100},revision:1},requests:{}}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:3012/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
  await page.evaluate(()=>{history.pushState({},'','/game/6/14');dispatchEvent(new PopStateEvent('popstate'));});
  await page.locator('[data-pyramid-puzzle]').waitFor();
  for(let i=0;i<4;i++){await page.waitForTimeout(150);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const n=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,n);}
  await page.locator('.vision-companion--stage [data-vision-ready="true"]').waitFor();await page.evaluate(()=>document.fonts.ready);
  const artwork=await page.locator('[data-pyramid-puzzle] image').getAttribute('href');
  assert.ok(await page.evaluate(async url=>{const im=new Image();im.src=url;await im.decode();return im.naturalWidth===1536;},artwork));
  for(let round=0;round<6;round++){
   await page.waitForFunction(i=>document.querySelector('[data-pyramid-round]')?.dataset.pyramidRound===String(i),round);
   const values=await page.locator('[data-pyramid-value="middle"]').allTextContents(),answer=values.map(Number).reduce((a,b)=>a+b,0);
   const alignment=await page.locator('[data-pyramid-value]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBBox(),x=Number(n.getAttribute('x')),y=Number(n.getAttribute('y'));return {text:n.textContent,box:{x:r.x,y:r.y,width:r.width,height:r.height},insideTablet:r.x>=x-150&&r.x+r.width<=x+150&&r.y>=y-74&&r.y+r.height<=y+74};}));
   assert.ok(alignment.every(n=>n.insideTablet),JSON.stringify(alignment));
   const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert.equal(audit.overflow,false);
   const geometry=await page.locator('[data-pyramid-puzzle]').evaluate(svg=>{const a=svg.getBoundingClientRect(),b=document.querySelector('.answer-choice-surface').getBoundingClientRect();return {artBottom:a.bottom,answersTop:b.top,artRight:a.right,screenWidth:innerWidth};});
   assert.ok(geometry.artBottom<=geometry.answersTop+1,'Pyramid stays above answer controls');assert.ok(geometry.artRight<=geometry.screenWidth);
   const buttons=page.locator('.pyramid-composition .answer-choice-surface button');
   if(round===0){
    await page.screenshot({path:`${output}/${profile.name}.png`});
    const wrong=(await buttons.allTextContents()).map(s=>s.trim()).find(s=>Number(s)!==answer);await buttons.getByText(wrong,{exact:true}).click();
    await page.getByText(/The top is .*Add those two middle stones/).waitFor();await page.screenshot({path:`${output}/${profile.name}-feedback.png`});
    assert.deepEqual((await page.evaluate(auditLayout)).issues,[]);await buttons.first().waitFor({state:'visible'});
    await page.waitForFunction(()=>[...document.querySelectorAll('.pyramid-composition .answer-choice-surface button')].every(b=>!b.disabled));
   }
   await buttons.getByText(String(answer),{exact:true}).click();
   await page.waitForFunction(a=>document.querySelector('[data-pyramid-value="top"]')?.textContent===String(a),answer);
   if(round===5)await page.locator('[data-result-game="problem_pyramid"][data-result-outcome="victory"]').waitFor();
  }
  assert.deepEqual(errors,[]);results.push({profile:profile.name,passed:true,rounds:6,alignedTablets:true,incorrectRecovery:true,victory:true});console.log('PASS',profile.name);
 }catch(e){await page.screenshot({path:`${output}/failure.png`});throw e;}finally{await context.close();}
}}finally{await browser.close();await writeFile(`${output}/verification.json`,JSON.stringify({passed:results.length===3,results},null,2));}
