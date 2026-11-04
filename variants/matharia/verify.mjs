import {chromium,webkit} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {installReleaseAccountFixture} from '../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out=process.env.MATHARIA_QA_OUT||'qa-artifacts/matharia';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
const engine=process.env.MATHARIA_ENGINE||'chromium';
const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
const results=[];
async function context(width,height){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(c);
 await c.addInitScript(()=>{
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Matharia QA'}));
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
 });return c;
}
async function enter(p,route){
 await p.goto('http://127.0.0.1:3015'+route);await p.locator('[data-game-set]').waitFor();
 for(let i=0;i<6;i++){await p.waitForTimeout(100);const start=p.locator('[data-dialog-primary]:visible').last();if(!await start.count())break;const node=await start.elementHandle();await start.click();await p.waitForFunction(n=>!n.isConnected,node);}
 await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('[data-vision-ready]')].every(n=>n.getAttribute('data-vision-ready')==='true'));await p.waitForTimeout(350);
}
try {
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  const c=await context(width,height),p=await c.newPage();
  try {
   await p.goto('http://127.0.0.1:3015/map');await p.locator('[data-matharia-map]').waitFor();
   const scroll=p.locator('.matharia-island-scroll');
   const map=await scroll.evaluate(n=>({height:n.clientHeight,scrollHeight:n.scrollHeight,pages:n.children.length}));
   assert.equal(map.pages,8);assert(Math.abs(map.scrollHeight-map.height*8)<10);
   for(let i=0;i<8;i++){
    await scroll.evaluate((n,i)=>n.scrollTop=n.clientHeight*i,i);await p.waitForTimeout(150);
    const visible=await scroll.evaluate(n=>{const r=n.getBoundingClientRect();return [...n.children].filter(ch=>{const b=ch.getBoundingClientRect();return b.top>=r.top-2&&b.bottom<=r.bottom+2;}).length;});assert.equal(visible,1);
   }
   await scroll.evaluate(n=>n.scrollTop=0);await p.waitForTimeout(150);
   await p.screenshot({path:`${out}/map-${engine}-${width}.png`});
   await p.locator('[data-map-explore-island="1"]').click();await p.waitForURL('**/island/1');
   results.push({key:'map-scroll-and-explore',width,height,passed:true});
  }catch(e){results.push({key:'map-scroll-and-explore',width,height,passed:false,error:e.message});}
  await c.close();
 }
 const profiles=[[844,390],[667,375],[1024,768],[768,1024]];
 await Promise.all(profiles.map(async ([width,height])=>{
  const selected=(process.env.MATHARIA_GAMES||'').split(',').filter(Boolean);
  const games=selected.length?catalog.filter(g=>selected.includes(g.key)):process.env.MATHARIA_QUICK?catalog.filter(g=>['prime_pop','place_value_panic','line_graph_lab','potion_panic','ratio_fractions','crystal_core'].includes(g.key)):catalog;
  for(const game of games){const c=await context(width,height),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const row={key:game.key,width,height,engine};
   try {
    await enter(p,game.route);
    assert.equal(await p.locator('html').getAttribute('data-presentation'),'matharia');
    assert.equal(await p.locator('[data-gameplay-orientation-gate]').count(),0);
    row.geometry=await p.evaluate(()=>{
     const box=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
     const top=document.querySelector('[data-testid="shared-top-hud"]'),bottom=document.querySelector('[data-testid="shared-bottom-hud"]');
     return {overflow:document.documentElement.scrollWidth>innerWidth+1,top:top&&box(top),bottom:bottom&&box(bottom),broken:[...document.images].filter(n=>n.complete&&!n.naturalWidth).map(n=>n.src),icons:[...document.querySelectorAll('.legend-dock-button img')].map(n=>{const i=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return Math.abs((i.left+i.width/2)-(b.left+b.width/2));})};
    });
    assert.equal(row.geometry.overflow,false);assert.equal(row.geometry.broken.length,0);
    assert(row.geometry.top&&row.geometry.bottom);assert(row.geometry.top.y>=-1&&row.geometry.top.y+row.geometry.top.height<=height+1);
    assert(row.geometry.bottom.y>=0&&row.geometry.bottom.y+row.geometry.bottom.height<=height+1);
    assert(row.geometry.icons.every(v=>v<2),'Dock icons must be centred');assert.equal(errors.length,0,errors.join('\n'));
    if(game.key==='line_graph_lab'){
     const chart=p.locator('.line-graph-chart');
     assert((await chart.boundingBox()).height>=80,'The live line chart must retain a readable plotting area');
     assert(await chart.locator('[data-line-point]').count()>=4,'Live graph data points must render');
     const plot=await chart.boundingBox();
     assert(plot.y+plot.height<=row.geometry.bottom.y+1,'The complete live chart must clear the bottom HUD');
    }
    if(game.key==='prime_pop')assert((await p.locator('.vision-companion--stage').boundingBox())?.height>40,'The independent hero must remain visible');
    row.file=`${game.key}-${engine}-${width}.png`;await p.screenshot({path:`${out}/${row.file}`});
    if(game.key==='prime_pop'&&width===844){
     const sound=p.getByRole('button',{name:'Mute audio',exact:true});await sound.click();await p.getByRole('button',{name:'Unmute audio',exact:true}).waitFor();
     await p.getByRole('button',{name:'How to play',exact:true}).click();await p.locator('[data-dialog-primary]:visible').last().click();
     await p.getByRole('button',{name:'Open on-screen working board',exact:true}).click();await p.getByRole('dialog').last().waitFor();
     await p.keyboard.press('Escape');
    }
    row.passed=true;
   }catch(e){row.passed=false;row.error=e.message;await p.screenshot({path:`${out}/${game.key}-${engine}-${width}-error.png`}).catch(()=>{});}
   results.push(row);console.log(row.passed?'PASS':'FAIL',game.key,width,row.error||'');await c.close();await writeFile(`${out}/verification-${engine}.json`,JSON.stringify(results,null,2));
  }
 }));
}finally{await browser.close();await writeFile(`${out}/verification-${engine}.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.filter(r=>r.passed).length,total:results.length,failures:results.filter(r=>!r.passed).map(r=>({key:r.key,width:r.width,error:r.error}))}));
assert(results.every(r=>r.passed));
