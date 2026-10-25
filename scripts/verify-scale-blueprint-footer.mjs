import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/scale-blueprint-footer';await mkdir(out,{recursive:true});
const games=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8')).filter(g=>g.key==='scale_builder');
const profiles=[{name:'desktop',width:1920,height:1080},{name:'review',width:1187,height:884},{name:'laptop',width:1366,height:768},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}];
const results=[];
for(const engine of ['chromium','webkit']){
 const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch();
 try{for(const profile of profiles.filter(p=>engine==='chromium'||p.height<400)){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 for(const game of games.filter(g=>engine==='chromium'||g.tier===5)){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:3018/map');await page.locator('[data-qa-screen="world_map"]').waitFor();
 await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},game.route);
 await page.locator('[data-scale-project]').waitFor();
 for(let n=0;n<6;n++){await page.waitForTimeout(180);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const node=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(180);
 const geometry=await page.evaluate(()=>{
 const area=document.querySelector('.scale-numeric-board-area'),button=area.querySelector('.scale-guide-button'),svg=area.querySelector('svg'),footer=area.querySelector('.scale-board-footer'),r=n=>{const b=n.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
 const a=r(area),b=r(button),s=r(svg),f=r(footer),style=getComputedStyle(area),inside=(x,y)=>x.left>=y.left-1&&x.right<=y.right+1&&x.top>=y.top-1&&x.bottom<=y.bottom+1;
 const hud=r(document.querySelector('[data-testid="shared-bottom-hud"]'));
 return {transparent:style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.backgroundImage==='none',buttonVisible:button.checkVisibility(),buttonInside:inside(b,a)&&inside(b,f),svgInside:inside(s,a),separate:s.bottom<=f.top+1,aboveHud:b.bottom<=hud.top+1,touchSize:b.height>=44,area:a,button:b,svg:s};
 });
 for(const key of ['transparent','buttonVisible','buttonInside','svgInside','separate','aboveHud','touchSize'])assert(geometry[key],`${profile.name} ${game.route} ${key}: ${JSON.stringify(geometry)}`);
 await page.getByRole('button',{name:'Hide original',exact:true}).click();assert.equal(await page.locator('[data-scale-original-shape]').count(),0);
 await page.getByRole('button',{name:'Show original',exact:true}).click();assert.equal(await page.locator('[data-scale-original-shape]').count(),1);
 if(game.tier===5){await page.waitForFunction(()=>[...document.images].every(n=>n.complete));await page.screenshot({path:`${out}/${engine}-${profile.name}.png`});}
 const expected=await page.locator('[data-scale-project]').evaluate(n=>[Number(n.dataset.scaleBaseLength)*Number(n.dataset.scaleFactor),Number(n.dataset.scaleBaseWidth)*Number(n.dataset.scaleFactor)]);
 await page.getByRole('textbox',{name:'New length',exact:true}).fill(String(expected[0]));await page.getByRole('textbox',{name:'New width',exact:true}).fill(String(expected[1]));await page.getByRole('button',{name:'Check lengths',exact:true}).click();await page.getByRole('button',{name:'Correct!',exact:true}).waitFor();assert.deepEqual(errors,[]);
 results.push({engine,profile:profile.name,route:game.route,geometry,passed:true});console.log('PASS',engine,profile.name,game.route);
 }catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}finally{await page.close();}
 }await context.close();}
 }finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({results},null,2));}
}
