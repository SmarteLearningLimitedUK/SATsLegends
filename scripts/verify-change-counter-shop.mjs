import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditQuestionAlignment} from './qa/question-alignment-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/change-counter-shop',games=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8')).filter(g=>g.key==='change_counter');
const profiles=[{name:'desktop',width:1920,height:1080},{name:'review',width:1187,height:884},{name:'laptop',width:1366,height:768},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}],results=[];
for(const engine of ['chromium','webkit']){
 const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch();
 try{for(const profile of profiles.filter(p=>(!process.env.SHOP_QA_PROFILES||process.env.SHOP_QA_PROFILES.split(',').includes(p.name))&&(engine==='chromium'||p.height<400))){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 for(const game of games.filter(g=>engine==='chromium'||g.tier===5)){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:3018/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
 await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);
 await page.locator('[data-market-game]').waitFor();
 for(let n=0;n<6;n++){await page.waitForTimeout(180);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const node=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
 assert.equal(await page.locator('[data-shop-clerk] .vision-character').count(),1);assert.equal(await page.locator('[data-vision-companion="change_counter"]').count(),0);
 assert((await page.evaluate(auditQuestionAlignment)).cards.every(c=>Math.abs(c.offset)<1));
 const clipped=await page.locator('[data-market-till]').evaluate(panel=>{const r=panel.getBoundingClientRect(),hud=document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect();return [...panel.querySelectorAll('button')].filter(n=>n.checkVisibility()).filter(n=>{const b=n.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1||b.bottom>hud.top+1;}).map(n=>n.getAttribute('aria-label')||n.textContent);});assert.deepEqual(clipped,[]);
 const obscured=await page.locator('[data-market-coin]').evaluateAll(nodes=>nodes.filter(n=>{const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return !hit||!(hit===n||n.contains(hit));}).map(n=>n.dataset.marketCoin));assert.deepEqual(obscured,[]);
 await page.locator('[data-market-coin="100"]').click();await page.locator('[data-market-undo]').click();assert.equal(await page.locator('[data-market-till-total]').innerText(),'0p');
 await page.locator('[data-market-coin="200"]').click();await page.locator('[data-market-clear]').click();assert.equal(await page.locator('[data-market-till-total]').innerText(),'0p');
 await page.locator('[data-market-coin="50"]').click();await page.locator('[data-market-selected-coin="50"]').click();assert.equal(await page.locator('[data-market-till-total]').innerText(),'0p');
 const expected=await page.evaluate(()=>{const pence=s=>Math.round(Number(s.replace(/[^0-9.]/g,''))*(s.includes('\u00a3')?100:1));return pence(document.querySelector('[data-market-paid]').textContent)-pence(document.querySelector('[data-market-cost]').textContent);});
 assert(expected>0&&Number.isInteger(expected),`Invalid expected change: ${expected}`);let left=expected;for(const coin of [200,100,50,20,10,5,2,1])while(left>=coin){await page.locator(`[data-market-coin="${coin}"]`).click();left-=coin;}
 await page.locator('[data-market-submit]').click();await page.waitForFunction(()=>Number(document.querySelector('[data-market-game]')?.getAttribute('data-market-correct'))===1);
 if(game.tier===5){await page.waitForFunction(()=>[...document.images].every(n=>n.complete));await page.screenshot({path:`${out}/${engine}-${profile.name}-correct.png`});}
 assert.deepEqual(errors,[]);results.push({engine,profile:profile.name,route:game.route,passed:true,controlsContained:true,coinsUnobscured:true,undoClearRemovalAndCorrectSubmission:true});console.log('PASS',engine,profile.name,game.route);
 await page.evaluate(()=>{history.pushState({},'','/map');dispatchEvent(new PopStateEvent('popstate'));});await page.locator('[data-qa-screen="world_map"]').waitFor();assert.equal(await page.locator('[data-shop-checkout-world]').count(),0);
 }catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}finally{await page.close();}
 }await context.close();}
 }finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length>0&&results.every(r=>r.passed),results},null,2));}
}
