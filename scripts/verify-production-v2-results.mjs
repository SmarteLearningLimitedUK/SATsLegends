import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const base=process.env.QA_BASE||'http://127.0.0.1:3025',out='qa-artifacts/production-ui-v2/results';
await mkdir(out,{recursive:true});
const {games}=JSON.parse(await readFile('native/production-rebuild/game-inventory.json'));
const browser=await chromium.launch(),rows=[];
const profiles={compact:[320,568,667,375],standard:[390,844,844,390],large:[430,932,932,430],tablet:[768,1024,1024,768]};
const reading=s=>{const t=s.trim();if(/^\d+ \d+\/\d+$/.test(t)){const [whole,fraction]=t.split(' '),[a,b]=fraction.split('/').map(Number);return Number(whole)+a/b;}if(/^\d+\/\d+$/.test(t)){const [a,b]=t.split('/').map(Number);return a/b;}return Number(t.replaceAll(',',''));};
for(const [profile,[pw,ph,lw,lh]] of Object.entries(profiles))for(const outcome of ['victory','gameover']){
 const key=outcome==='victory'?'area_architect':'number_line_ninja',game=games.find(g=>g.key===key),width=outcome==='victory'?pw:lw,height=outcome==='victory'?ph:lh;
 const row={profile,key,outcome,width,height,passed:false};
 const c=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(c);
 await c.addInitScript(()=>{let seed=8431;Math.random=()=>((seed=seed*16807%2147483647)-1)/2147483646;localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(base+game.route,{waitUntil:'domcontentloaded',timeout:60000});
  await p.getByRole('button',{name:'Start',exact:true}).click({timeout:60000});
  await p.locator(`[data-vision-game="${key}"]`).waitFor({timeout:30000});
  for(let i=0;i<5;i++){await p.waitForTimeout(150);const intro=p.locator('[data-dialog-primary]:visible').first();if(!await intro.count())break;await intro.click();}
  if(outcome==='victory'){
   for(let i=0;i<5;i++){
    const area=await p.locator('[data-area-board] svg>rect').count();
    await p.locator(`[data-area-answer="${area}"]`).click();
    await expect(p.locator('.area-room-feedback')).toHaveAttribute('data-tone','success');
    await p.locator('.area-room-next').click();
   }
  }else{
   for(let attempt=0;attempt<4&&!await p.locator('[data-result-outcome="gameover"]').count();attempt++){
    const buttons=p.locator('[data-number-line-answer]');await expect(buttons.first()).toBeEnabled({timeout:10000});
    const labels=await p.locator('[data-line-marker]').allTextContents();
    const index=Number(await p.locator('[data-number-line-missing]').locator('..').locator('..').getAttribute('data-line-marker'));
    const known=labels.map((s,i)=>({i,n:reading(s)})).filter(v=>labels[v.i].trim()!==''&&Number.isFinite(v.n));
    const [a,b]=known,answer=a.n+(index-a.i)*(b.n-a.n)/(b.i-a.i);
    const wrong=(await buttons.allTextContents()).findIndex(text=>Math.abs(reading(text)-answer)>1e-8);
    expect(wrong).toBeGreaterThanOrEqual(0);await buttons.nth(wrong).click();
    await p.waitForTimeout(900);
   }
  }
  const dialog=p.getByRole('dialog',{name:'Mission results'});await expect(dialog).toBeVisible({timeout:10000});
  await p.waitForFunction(()=>['.level-result-overlay','.level-result-card'].every(s=>{const n=document.querySelector(s);return n&&Number(getComputedStyle(n).opacity)>=.999;}));
  await expect(p.locator('[data-result-outcome]')).toHaveAttribute('data-result-outcome',outcome);
  const stats=p.locator('.level-result-stats .legend-result-stat');await expect(stats).toHaveCount(4);
  for(const stat of await stats.all())await expect(stat).toBeInViewport({ratio:1});
  for(const button of await p.locator('.level-result-actions button,.level-result-toolbar button').all()){
   await expect(button).toBeInViewport({ratio:1});expect(await button.evaluate(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44;})).toBe(true);
  }
  row.summary=await stats.allTextContents();
  const detail=p.locator('.level-result-scroll');
  const progression=p.locator('.level-result-progression');await progression.scrollIntoViewIfNeeded();await expect(progression).toBeInViewport();
  const bonuses=p.locator('.level-result-bonuses');if(await bonuses.locator(':scope>div').count()){await bonuses.scrollIntoViewIfNeeded();await expect(bonuses).toBeInViewport();}
  row.detailsReachable=true;await detail.evaluate(n=>n.scrollTop=0);
  await p.screenshot({path:`${out}/${profile}-${outcome}.png`});
  expect(errors).toEqual([]);row.passed=true;
 }catch(error){row.error=error.message;row.errors=errors;await p.screenshot({path:`${out}/${profile}-${outcome}-failure.png`});}
 rows.push(row);await writeFile(out+'/results.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',profile,outcome,row.error||'');await c.close();
}
await browser.close();if(rows.some(r=>!r.passed))process.exitCode=1;
