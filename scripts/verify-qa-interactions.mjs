import {chromium, expect} from '@playwright/test';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3018';
const out='qa-artifacts/recommended-changes/interactions';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
const catalog=JSON.parse(await readFile('qa-artifacts/recommended-changes/screenshots/catalog.json','utf8'));
const dismiss=async p=>{for(let i=0;i<6;i++){await p.waitForTimeout(150);const d=p.locator('[role=dialog]:visible').last();if(!await d.count())break;const b=d.locator('[data-dialog-primary]');if(!await b.count())break;const h=await d.elementHandle();await b.click();await p.waitForFunction(n=>!n.isConnected,h);}};
for(const name of ['symmetry','shipment-bars','prime-navigation']){
 const c=await browser.newContext({viewport:{width:667,height:375},hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(c);
 await c.addInitScript(()=>{window.__qaTimers=[];const start=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>{const r={delay:ms,stack:new Error().stack,fired:false,cleared:false};const id=start(()=>{r.fired=true;if(typeof fn==='function')fn(...args);},r.stack.includes('PrimePopGame')&&ms===190?3000:ms);r.id=id;window.__qaTimers.push(r);return id;};window.clearTimeout=id=>{const r=window.__qaTimers.find(r=>r.id===id);if(r)r.cleared=true;clear(id);};});
 const p=await c.newPage(),errors=[],row={name,passed:false};p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(60000);
 try{
  if(name==='symmetry'){
   await p.goto(base+'/game/8/2',{waitUntil:'domcontentloaded'});await p.locator('.sats-mock').waitFor();await dismiss(p);
   const q=await p.evaluate(async()=>{const {buildSatsPaper}=await import('/src/systems/content/satsAdventure.ts');for(let seed=0;seed<100;seed++){const paper=buildSatsPaper('mirror_gate',seed),index=paper.missions.findIndex(q=>q.id==='ext-symmetry');if(index<0)continue;const key=Object.keys(sessionStorage).find(k=>k.startsWith('sats-legends-mock-checkpoint-v4:mirror_gate:'));sessionStorage.setItem(key,JSON.stringify({version:1,seed,index,deadline:Date.now()+2400000,answers:{},workpad:{},draft:[],draftWorkpad:''}));return paper.missions[index];}throw Error('No symmetry seed');});
   await p.reload();await p.getByRole('group',{name:'Complete the symmetrical pattern'}).waitFor();await dismiss(p);
   const first=p.getByRole('button',{name:'Column 4, row 1',exact:true});await first.focus();await p.keyboard.press('Space');await expect(first).toHaveAttribute('aria-pressed','true');await p.keyboard.press('Space');await expect(first).toHaveAttribute('aria-pressed','false');
   for(const cell of q.fields[0].answer.split(';')){const [x,y]=cell.split(',').map(Number);await p.getByRole('button',{name:`Column ${x+1}, row ${y+1}`,exact:true}).click();}
   await p.screenshot({path:out+'/symmetry-phone.png'});await p.getByRole('button',{name:'Save & continue',exact:true}).click();await p.getByRole('button',{name:'Finish run',exact:true}).click();await p.getByRole('button',{name:'Finish and review',exact:true}).click();await expect(p.locator('#sats-review-ext-symmetry summary')).toContainText(`${q.marks}/${q.marks}`);
  }else if(name==='shipment-bars'){
   await p.goto(base+catalog.find(g=>g.key==='graph_grabber').route,{waitUntil:'domcontentloaded'});await dismiss(p);await p.waitForTimeout(2200);
   const bars=await p.locator('[data-crate-bar]').evaluateAll(ns=>ns.map(n=>({value:Number(n.dataset.crateValue),crates:[...n.querySelectorAll(':scope > g')].map(g=>g.querySelector('rect')?.getBoundingClientRect().toJSON())})));
   expect(bars.length).toBe(5);for(const b of bars){expect(b.crates.length).toBe(b.value/20);for(const r of b.crates){expect(r.width).toBeGreaterThan(5);expect(r.height).toBeGreaterThan(5);}}
   row.bars=bars.map(b=>({value:b.value,crates:b.crates.length}));await p.screenshot({path:out+'/shipment-phone.png'});
  }else{
   // Warm the destination so the assertion measures component cleanup rather
   // than the time needed to download the map's lazy route module.
   await p.goto(base+'/map',{waitUntil:'domcontentloaded'});await p.locator('[data-qa-screen="world_map"]').waitFor();
   await p.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},catalog.find(g=>g.key==='prime_pop').route);await p.locator('[data-game-set]').waitFor();await dismiss(p);
   await p.waitForFunction(()=>[...document.querySelectorAll('[aria-label^="Pop number "]')].some(n=>{const v=Number(n.getAttribute('aria-label').split(' ').at(-1));return v<2||Array.from({length:Math.max(0,Math.floor(Math.sqrt(v))-1)},(_,i)=>i+2).some(d=>v%d===0);}));
   await p.evaluate(()=>{const n=[...document.querySelectorAll('[aria-label^="Pop number "]')].find(n=>{const v=Number(n.getAttribute('aria-label').split(' ').at(-1));return v<2||Array.from({length:Math.max(0,Math.floor(Math.sqrt(v))-1)},(_,i)=>i+2).some(d=>v%d===0);});n.click();history.pushState({},'','/map');dispatchEvent(new PopStateEvent('popstate'));});
   await p.locator('[data-qa-screen="world_map"]').waitFor();await p.waitForTimeout(1100);
   const timers=await p.evaluate(()=>window.__qaTimers.filter(r=>r.stack.includes('PrimePopGame')&&r.delay===190));row.timers=timers;expect(timers.length).toBeGreaterThan(0);expect(timers.every(r=>r.cleared&&!r.fired)).toBe(true);row.cancelledMistakeTimers=timers.length;row.harness='The pending mistake callback is held for 3s to isolate unmount cancellation from route-loading latency.';await expect(p.locator('[data-game-set]')).toHaveCount(0);
  }
  expect(errors).toEqual([]);row.passed=true;
 }catch(e){row.error=e.message;await p.screenshot({path:out+'/'+name+'-failure.png'}).catch(()=>{});}
 rows.push(row);await c.close();console.log(row.passed?'PASS':'FAIL',name,row.error||'');await writeFile(out+'/report.json',JSON.stringify(rows,null,2));
}
await browser.close();if(rows.some(r=>!r.passed))process.exitCode=1;
