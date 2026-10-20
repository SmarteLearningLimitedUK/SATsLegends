import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const out='qa-artifacts/forge-containment';
const route=JSON.parse(await readFile('qa-artifacts/approved-concept-look/catalog.json','utf8')).find(g=>g.key==='fraction_forge').route;
const engine=process.env.FORGE_QA_BROWSER||'chromium';
const browser=engine==='webkit'?await webkit.launch({executablePath:resolve('qa-artifacts/browser-runtime/webkit-2272/Playwright.exe')}):await chromium.launch(),results=[];
const fraction=text=>{const parts=text.match(/\d+/g).map(Number);return {n:parts[0],d:parts[1]||1};};
try{
 for(const profile of [{name:'desktop',width:1920,height:1080},{name:'review',width:1187,height:884},{name:'laptop',width:1366,height:768},{name:'phone',width:844,height:390},{name:'small-phone',width:667,height:375}]){
  if(process.env.FORGE_QA_PROFILES&&!process.env.FORGE_QA_PROFILES.split(',').includes(profile.name))continue;
  const c=await browser.newContext({viewport:{width:profile.width,height:profile.height}});await installReleaseAccountFixture(c);
  await c.addInitScript(()=>localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Content QA'})));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/map');await p.locator('[data-qa-screen=world_map]').waitFor();
  await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);
  await p.locator('[data-fraction-forge]').waitFor();
  for(let n=0;n<6;n++){
   const b=p.locator('[data-dialog-primary]:visible').last();if(await b.count())await b.click();else break;await p.waitForTimeout(200);
  }
  const checkGeometry=async()=>{
   const geometry=await p.evaluate(()=>{
    const r=n=>n.getBoundingClientRect(),a=r(document.querySelector('.ff-anvil-art')),recipe=r(document.querySelector('.ff-recipe')),tray=r(document.querySelector('.ff-tray')),bank=document.querySelector('.ff-bank'),b=r(bank);
    const inside=(x,y)=>x.left>=y.left-1&&x.right<=y.right+1&&x.top>=y.top-1&&x.bottom<=y.bottom+1;
    const failures=[...document.querySelectorAll('.ff-ingredient,.ff-controls button')].filter(n=>!inside(r(n),tray)).map(n=>n.getAttribute('aria-label')||n.textContent);
    const glyphs=[...document.querySelectorAll('.ff-ingredient .ff-fraction,.ff-slot .ff-fraction')].filter(n=>!inside(r(n),r(n.closest('button')))).map(n=>n.textContent);
    return {centreError:Math.abs(recipe.left+recipe.width/2-(a.left+a.width*.56)),surfaceError:Math.abs(recipe.bottom-(a.top+a.height*.15)),failures,glyphs,bankScroll:bank.scrollWidth>bank.clientWidth+1||bank.scrollHeight>bank.clientHeight+1,bankInside:inside(b,tray),aspectError:Math.abs(a.width/a.height-1.5)};
   });
   assert(geometry.centreError<2,JSON.stringify(geometry));assert(geometry.surfaceError<5,JSON.stringify(geometry));assert(geometry.aspectError<.01,JSON.stringify(geometry));assert.deepEqual(geometry.failures,[]);assert.deepEqual(geometry.glyphs,[]);assert(geometry.bankInside&&!geometry.bankScroll,JSON.stringify(geometry));
  };const operations=[];
  for(let round=0;round<6;round++){
   await checkGeometry();if(round===0)await p.screenshot({path:`${out}/${engine}-${profile.name}-empty.png`});
   const prompt=await p.locator('.ff-question [data-question-copy]').innerText();
   const op=prompt.includes('Divide')?'÷':prompt.includes('multiply')?'×':prompt.includes('Subtract')?'-':'+';
   operations.push(op);const target=fraction(await p.locator('[data-forge-target]').innerText());
   const cards=await p.locator('[data-forge-ingredient]').evaluateAll(ns=>ns.map(n=>({id:n.dataset.forgeIngredient,label:n.getAttribute('aria-label'),disabled:n.disabled})));
   let pair;
   for(const a of cards)for(const b of cards){if(a.id===b.id)continue;const x=fraction(a.label),y=fraction(b.label);
    if(op==='×'&&(x.n>=x.d||y.n>=y.d))continue;
    if(op==='÷'&&(x.n>=x.d||y.d!==1))continue;
    const num=op==='×'?x.n*y.n:op==='÷'?x.n*y.d:x.n*y.d+(op==='+'?1:-1)*y.n*x.d;
    const den=op==='÷'?x.d*y.n:x.d*y.d;
    if(num*target.d===target.n*den)pair=[a,b];
   }
   assert(pair,'Displayed ingredients must contain a reachable solution');
   if(op==='÷')assert(cards.filter(a=>fraction(a.label).d===1).every(a=>a.disabled),'Whole numbers disabled in first division slot');
   const first=p.locator(`[data-forge-ingredient="${pair[0].id}"]`),second=p.locator(`[data-forge-ingredient="${pair[1].id}"]`);
   await first.click();assert(await second.isEnabled());await second.click();
   // Removing either operand must preserve the correct allowed type in the empty slot.
   await p.locator('[data-forge-slot="1"]').click();assert(await first.isEnabled());await first.click();
   await p.locator('[data-forge-slot="2"]').click();assert(await second.isEnabled());await second.click();
   await checkGeometry();if(round===0)await p.screenshot({path:`${out}/${engine}-${profile.name}-filled.png`});
   await p.locator('[data-forge-strike]').click();
   await p.waitForFunction(()=>document.querySelector('[data-fraction-forge]')?.dataset.strikeState==='success');
   if(round<5)await p.waitForFunction(id=>document.querySelector('[data-forge-ingredient]')?.dataset.forgeIngredient!==id,cards[0].id);
  }
  assert(operations.includes('÷')&&operations.includes('×'),'Six tier-five rounds must include multiplication and division');
  assert.deepEqual(errors,[]);results.push({profile:profile.name,correctRounds:6,operations,removedAndReplacedBothSlots:true,runtimeErrors:errors,passed:true});
  console.log('PASS',profile.name,'six correct rounds, proper operands and slot removal');await c.close();
 }
}finally{await browser.close();await writeFile(out+'/verification-'+engine+'.json',JSON.stringify(results,null,2));}
