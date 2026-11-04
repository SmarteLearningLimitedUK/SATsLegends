import {webkit,expect} from '@playwright/test';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL||'http://127.0.0.1:3074';
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
function findMove(cells){
 for(let a=0;a<30;a++)for(const b of [a+1,a+6]){
  if(b>=30||(b===a+1&&a%6===5))continue;
  const v=cells.slice();[v[a],v[b]]=[v[b],v[a]];const matches=new Set();
  for(let i=0;i<30;i++){
   if(i%6<4&&v[i]===v[i+1]&&v[i]===v[i+2])for(let n=0;n<3;n++)matches.add(i+n);
   if(i<18&&v[i]===v[i+6]&&v[i]===v[i+12])for(let n=0;n<3;n++)matches.add(i+6*n);
  }
  if(matches.size)return {a,b,count:matches.size};
 }
 throw Error('No valid swap');
}
try{
 for(const [tier,route,points] of [[1,'/game/2/16',10],[5,'/game/2/20',30]]){
  const c=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});await installNativeAccessFixture(c);
  const p=await c.newPage();await p.goto(base+route);await p.locator('[data-match-tier]').waitFor();
  for(let i=0;i<8;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  const board=p.locator('[data-match-tier]');await expect(board).toHaveAttribute('data-match-tier',String(tier));
  const cells=await p.locator('[data-match-cell]').evaluateAll(es=>es.map(e=>e.dataset.matchValue));
  const move=findMove(cells);
  await p.evaluate(()=>{window.__firstMatchScore=null;const board=document.querySelector('[data-match-score]');new MutationObserver(()=>{const score=Number(board.getAttribute('data-match-score'));if(score>0&&window.__firstMatchScore===null)window.__firstMatchScore=score}).observe(board,{attributes:true,attributeFilter:['data-match-score']})});
  await p.locator(`[data-match-cell="${move.a}"] button`).tap();await p.locator(`[data-match-cell="${move.b}"] button`).tap();
  await p.waitForFunction(()=>window.__firstMatchScore!==null);
  const first=await p.evaluate(()=>window.__firstMatchScore);
  if(first!==move.count*points)throw Error(`Tier ${tier}: expected ${move.count*points}, got ${first}`);
  console.log(`PASS Match Mastery tier ${tier}: ${move.count} matched tiles earned ${first} points`);await c.close();
 }
}finally{await browser.close()}
