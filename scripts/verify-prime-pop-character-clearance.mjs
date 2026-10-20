import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/prime-pop-clearance';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/full-screen-qa/catalog.json','utf8')).filter(g=>g.key==='prime_pop');
const filterProfile=process.env.LEGEND_PRIME_PROFILE,filterTier=process.env.LEGEND_PRIME_TIER;
const rows=filterProfile?JSON.parse(await readFile(out+'/checks.json','utf8')).filter(r=>r.profile!==filterProfile||(filterTier!==undefined&&String(r.tier)!==filterTier)):[];
async function popPrime(page){
 for(let attempt=0;attempt<8;attempt++){
  const danger=await page.locator('[data-prime-pop-danger]').boundingBox();
  for(const candidate of await page.locator('[aria-label^="Pop number"]').elementHandles()){
   const value=Number((await candidate.getAttribute('aria-label'))?.split(' ').at(-1));
   if(value<2||!Number.isFinite(value)||Array.from({length:Math.max(0,Math.floor(Math.sqrt(value))-1)},(_,i)=>i+2).some(d=>value%d===0))continue;
   const rect=await candidate.boundingBox();
   if(!rect||rect.top<(danger?.y??0)+35||rect.height<39)continue;
   await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
   try{await page.waitForFunction(n=>!n.isConnected,candidate,{timeout:1500});return true;}catch{}
  }
  await page.waitForTimeout(150);
 }
 return false;
}

const profiles=[{name:'desktop',width:1440,height:900},{name:'compact',width:1280,height:720},{name:'phone',width:667,height:375},{name:'iphone-webkit',width:844,height:390}];
for(const profile of profiles.filter(p=>!filterProfile||p.name===filterProfile)){const b=profile.name==='iphone-webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
try{for(const game of catalog.filter(g=>filterTier===undefined||String(g.tier)===filterTier)){const c=await b.newContext({viewport:profile,hasTouch:profile.width<1000,reducedMotion:profile.name==='iphone-webkit'?'reduce':'no-preference'});await installReleaseAccountFixture(c);const p=await c.newPage();p.setDefaultTimeout(30000);const row={...game,profile:profile.name,passed:false};const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
await p.goto('http://127.0.0.1:3018'+game.route,{waitUntil:'domcontentloaded'});await p.locator('[data-game-set]').waitFor();for(let i=0;i<5;i++){await p.waitForTimeout(120);const d=p.locator('[data-dialog-primary]:visible').first();if(await d.count()){const h=await d.elementHandle();try{await h.click({timeout:3000});}catch(e){if(await h.isVisible().catch(()=>false))throw e;}}}
await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.querySelectorAll('.vision-companion--stage [data-vision-character]')].every(n=>n.dataset.visionReady==='true'));
row.samples=[];for(let i=0;i<16;i++){await p.waitForTimeout(500);const audit=await p.evaluate(auditLayout);expect(audit.issues).toEqual([]);expect(audit.overflow).toBe(false);row.samples.push({controls:audit.controlCount,issues:audit.issues});if([3,7,11].includes(i))row.primePopPlayable=await popPrime(p)||row.primePopPlayable;}
row.file=`${profile.name}-${game.captureId}.png`;await p.screenshot({path:out+'/'+row.file});
// Verify the audit catches a control placed over the character, even when
// all ordinary control/control and question bounds still fit the viewport.
await p.evaluate(()=>{const actor=document.querySelector('.vision-companion--stage .vision-character-breath').getBoundingClientRect();const probe=document.createElement('button');probe.id='qa-actor-overlap-probe';probe.setAttribute('aria-label','Pop number 11');probe.style.cssText=`position:fixed;left:${actor.x+actor.width/2-20}px;top:${actor.y+actor.height/2-20}px;width:40px;height:40px;z-index:10000`;document.querySelector('[data-game-set]').append(probe);});
expect((await p.evaluate(auditLayout)).issues.some(i=>i.kind==='actor-control')).toBe(true);await p.locator('#qa-actor-overlap-probe').evaluate(n=>n.remove());
expect(row.primePopPlayable).toBe(true);expect(errors).toEqual([]);row.passed=true;row.actorProbeDetected=true;row.primePopPlayable=true;
if(profile.name!=='compact')await copyFile(out+'/'+row.file,`qa-artifacts/full-screen-qa/${profile.name}/${game.captureId}.png`);
}catch(e){row.error=e.message;await p.screenshot({path:out+`/${profile.name}-${game.captureId}-failure.png`}).catch(()=>{});}rows.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,game.captureId,row.error||'16 motion samples, actor audit and prime tap');await writeFile(out+'/checks.json',JSON.stringify(rows,null,2));await c.close();}}finally{await b.close();}}
if(rows.some(r=>!r.passed))process.exitCode=1;
