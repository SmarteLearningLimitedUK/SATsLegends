import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/zombie-clarity',engine=process.env.ZOMBIE_QA_BROWSER||'chromium';
const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch();
const profiles=[{name:'desktop',width:1920,height:1080},{name:'review',width:1187,height:884},{name:'laptop',width:1366,height:768},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}],results=[];
const route=JSON.parse(await readFile('qa-artifacts/approved-concept-look/catalog.json','utf8')).find(g=>g.key==='maths_vs_zombies').route;
try{for(const profile of profiles.filter(p=>(!process.env.ZOMBIE_QA_PROFILES||process.env.ZOMBIE_QA_PROFILES.split(',').includes(p.name))&&(engine==='chromium'||p.height<400))){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},reducedMotion:'no-preference'});await installReleaseAccountFixture(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto('http://127.0.0.1:3018/map');await page.locator('[data-qa-screen="world_map"]').waitFor();await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);await page.locator('[data-zombies-game]').waitFor();
 for(let n=0;n<6;n++){await page.waitForTimeout(180);const d=page.locator('[role="dialog"]:visible').last();if(!await d.count())break;const node=await d.elementHandle();await d.locator('[data-dialog-primary]').click();await page.waitForFunction(n=>!n.isConnected,node);}
 await page.locator('[data-zombie-id] [data-vision-ready="true"]').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 const geometry=await page.evaluate(()=>{const field=document.querySelector('.zombies-playfield'),s=getComputedStyle(field),r=field.getBoundingClientRect(),hero=document.querySelector('.zombies-player-avatar').getBoundingClientRect(),enemy=document.querySelector('[data-zombie-id]');return {background:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow,fullWidth:r.width>innerWidth*.9,heroSize:hero.height,fieldHeight:r.height,sameSize:Math.abs(hero.height-enemy.getBoundingClientRect().width)<1};});
 assert.equal(geometry.background,'rgba(0, 0, 0, 0)');assert.equal(geometry.image,'none');assert.equal(geometry.shadow,'none');assert(geometry.fullWidth&&geometry.sameSize);assert(geometry.heroSize>=Math.min(geometry.fieldHeight*.68,profile.width*.23));
 const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[]);assert(!audit.overflow);
 await page.screenshot({path:`${out}/${engine}-${profile.name}.png`});
 const movement=await page.evaluate(duration=>new Promise(resolve=>{const start=performance.now(),previous={},issues=new Set();let peak=0;
 const tick=()=>{const field=document.querySelector('.zombies-playfield').getBoundingClientRect(),live=[...document.querySelectorAll('[data-zombie-id]')].filter(n=>n.dataset.zombieState!=='die').sort((a,b)=>Number(a.dataset.zombieX)-Number(b.dataset.zombieX));peak=Math.max(peak,live.length);
 for(const n of live){const b=n.getBoundingClientRect(),id=n.dataset.zombieId,x=Number(n.dataset.zombieX);if(b.top<field.top-1||b.bottom>field.bottom+1||b.left<field.left-1||b.right>field.right+1)issues.add('clipped actor');if(previous[id]){if(x>previous[id].x+.01)issues.add('reverse motion');if(Math.abs(b.top-previous[id].top)>.2)issues.add('vertical drift');}previous[id]={x,top:b.top};}
 for(let i=1;i<live.length;i++)if(live[i].getBoundingClientRect().left-live[i-1].getBoundingClientRect().right<8)issues.add('enemy overlap');
 if(performance.now()-start<duration)requestAnimationFrame(tick);else resolve({peak,issues:[...issues]});};requestAnimationFrame(tick);
 }),profile.height<400?8000:12000);
 assert.deepEqual(movement.issues,[]);assert(movement.peak>=2,'Enlarged enemies still enter in a queue');
 const prompts=[];
 for(let i=0;i<3;i++){
 await page.waitForFunction(()=>[...document.querySelectorAll('.zombies-answer-options button')].every(n=>!n.disabled));
 const equation=await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation'),prompt=await page.locator('[data-question-copy]').innerText();prompts.push(prompt);assert(/[=?]/.test(prompt));
 const m=equation.match(/(-?\d+)\s*([+x÷-])\s*(-?\d+)/);assert(m,equation);const a=Number(m[1]),b=Number(m[3]),answer={'+':a+b,'-':a-b,x:a*b,'÷':a/b}[m[2]];
 const target=page.locator('[data-zombie-id]:not([data-zombie-state="die"])').last(),id=await target.getAttribute('data-zombie-id');await target.press('Enter');await page.locator('.zombies-answer-options button').filter({hasText:new RegExp(`^${answer}$`)}).click();
 await page.waitForFunction(expected=>Number(document.querySelector('[data-zombies-game]').dataset.zombiesScore)===expected,(i+1)*220);
 await page.waitForFunction(id=>document.querySelector('[data-spell-target]')?.getAttribute('data-spell-target')===id,id);
 }
 assert(prompts.some(p=>p.startsWith('What is'))&&prompts.some(p=>/plus|minus|multiplied|divided/.test(p))&&prompts.some(p=>/ = \?$/.test(p)&&!/(plus|minus|multiplied|divided)/.test(p)));
 await page.waitForFunction(()=>[...document.querySelectorAll('.zombies-answer-options button')].every(n=>!n.disabled));
 const equation=await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation'),m=equation.match(/(-?\d+)\s*([+x÷-])\s*(-?\d+)/),a=Number(m[1]),b=Number(m[3]),correct={'+':a+b,'-':a-b,x:a*b,'÷':a/b}[m[2]];
 const buttons=page.locator('.zombies-answer-options button'),texts=await buttons.allTextContents(),wrong=texts.find(t=>Number(t)!==correct);await buttons.filter({hasText:new RegExp(`^${wrong.trim()}$`)}).click();await page.getByText('Close! Try the next one.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);results.push({profile:profile.name,engine,passed:true,geometry,movement,prompts,correctAnswers:3,incorrectFeedback:true,selectedTarget:true});console.log('PASS',engine,profile.name);
 }catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}finally{await context.close();}
}}finally{await browser.close();await writeFile(`${out}/verification-${engine}.json`,JSON.stringify({passed:results.length>0&&results.every(r=>r.passed),results},null,2));}
