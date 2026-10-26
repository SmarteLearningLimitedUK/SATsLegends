import{chromium,expect}from'@playwright/test';
import{readFile,mkdir,writeFile}from'node:fs/promises';
import{createHash}from'node:crypto';
import{loadEnv}from'vite';
import{installReleaseAccountFixture}from'./qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const out='qa-artifacts/graphics-restore/conversion',base=process.env.QA_BASE||'http://127.0.0.1:3025';await mkdir(out,{recursive:true});
const g=JSON.parse(await readFile('native/production-rebuild/game-inventory.json')).games.find(g=>g.key==='conversion_canyon');
const saved=JSON.parse(await readFile('native/production-ui-v2/source-baseline.json')).hashes;
const scaleSourceUnchanged=createHash('sha256').update((await readFile('src/games/MechanicalScale.tsx','utf8')).replaceAll('\r\n','\n')).digest('hex')===saved['src/games/MechanicalScale.tsx'];expect(scaleSourceUnchanged).toBe(true);
const rows=[],b=await chromium.launch();
for(const [profile,width,height]of[['compact',320,568],['standard',390,844],['large',430,932],['tablet',768,1024]])for(const motion of ['reduce','no-preference']){
 const row={profile,width,height,motion,scaleSourceUnchanged,passed:false};const c=await b.newContext({viewport:{width,height},hasTouch:true,reducedMotion:motion});await installReleaseAccountFixture(c);await c.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});const p=await c.newPage();
 try{
  await p.goto(base+g.route,{waitUntil:'domcontentloaded',timeout:60000});await p.getByRole('button',{name:'Start',exact:true}).click({timeout:60000});
  for(let i=0;i<4;i++){await p.waitForTimeout(150);const intro=p.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;await intro.click();}
  await p.waitForFunction(()=>{const n=document.querySelector('.conversion-token-grid button>span');return n&&parseFloat(getComputedStyle(n).fontSize)===24;});await p.waitForTimeout(350);
  row.tiles=await p.locator('.conversion-token-grid button').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),labels=[...n.querySelectorAll('span')].map(s=>({text:s.textContent,rect:s.getBoundingClientRect().toJSON()}));return{rect:r.toJSON(),labels,before:getComputedStyle(n,'::before').display,after:getComputedStyle(n,'::after').display,hit:n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));
  expect(row.tiles).toHaveLength(6);
  for(const t of row.tiles){expect(t.before).toBe('none');expect(t.after).toBe('none');expect(t.hit).toBe(true);expect(t.rect.width).toBeGreaterThanOrEqual(44);expect(t.rect.height).toBeGreaterThanOrEqual(64);const[a,z]=t.labels;expect(a.rect.bottom).toBeLessThanOrEqual(z.rect.top-3);for(const s of t.labels){expect(s.rect.left).toBeGreaterThanOrEqual(t.rect.left);expect(s.rect.right).toBeLessThanOrEqual(t.rect.right);expect(s.rect.top).toBeGreaterThanOrEqual(t.rect.top);expect(s.rect.bottom).toBeLessThanOrEqual(t.rect.bottom);}}
  expect(row.tiles[3].rect.top-row.tiles[0].rect.bottom).toBeGreaterThanOrEqual(8);
  const footer=await p.locator('.conversion-game .game-submit-dock').boundingBox();expect(footer.y-row.tiles[5].rect.bottom).toBeGreaterThanOrEqual(8);expect(footer.y+footer.height).toBeLessThanOrEqual(height);
  await p.locator('[data-conversion-token]').first().click();await expect(p.locator('[data-conversion-token]').first()).toHaveAttribute('aria-pressed','true');await p.getByRole('button',{name:'Reset weights',exact:true}).click();await expect(p.locator('[data-conversion-token]').first()).toHaveAttribute('aria-pressed','false');
  await p.screenshot({path:`${out}/${profile}-${motion}.png`});row.passed=true;
 }catch(e){row.error=e.message;await p.screenshot({path:`${out}/${profile}-${motion}-failure.png`});}
 rows.push(row);console.log(row.passed?'PASS':'FAIL',profile,motion,row.error||'');await writeFile(out+'/results.json',JSON.stringify(rows,null,2));await c.close();
}await b.close();if(rows.some(r=>!r.passed))process.exitCode=1;
