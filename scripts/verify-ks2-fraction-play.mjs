import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const out='qa-artifacts/ks2-content-review';
const route=JSON.parse(await readFile(out+'/catalog.json','utf8')).find(g=>g.key==='fraction_forge').route;
const browser=await chromium.launch(),results=[];
const fraction=text=>{const parts=text.match(/\d+/g).map(Number);return {n:parts[0],d:parts[1]||1};};
try{
 for(const profile of [{name:'desktop',width:1920,height:1080},{name:'small-phone',width:667,height:375}]){
  const c=await browser.newContext({viewport:{width:profile.width,height:profile.height}});await installReleaseAccountFixture(c);
  await c.addInitScript(()=>localStorage.setItem('maths_quest_player_v2',JSON.stringify({avatarId:'barratt',level:100,playerName:'Content QA'})));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/map');await p.locator('[data-qa-screen=world_map]').waitFor();
  await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);
  await p.locator('[data-fraction-forge]').waitFor();
  for(let n=0;n<6;n++){
   const b=p.locator('[data-dialog-primary]:visible').last();if(await b.count())await b.click();else break;await p.waitForTimeout(200);
  }
  const operations=[];
  for(let round=0;round<6;round++){
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
   await p.locator('[data-forge-strike]').click();
   await p.waitForFunction(()=>document.querySelector('[data-fraction-forge]')?.dataset.strikeState==='success');
   if(round<5)await p.waitForFunction(id=>document.querySelector('[data-forge-ingredient]')?.dataset.forgeIngredient!==id,cards[0].id);
  }
  assert(operations.includes('÷')&&operations.includes('×'),'Six tier-five rounds must include multiplication and division');
  assert.deepEqual(errors,[]);results.push({profile:profile.name,correctRounds:6,operations,removedAndReplacedBothSlots:true,runtimeErrors:errors,passed:true});
  console.log('PASS',profile.name,'six correct rounds, proper operands and slot removal');await c.close();
 }
}finally{await browser.close();await writeFile(out+'/fraction-interactions.json',JSON.stringify(results,null,2));}
