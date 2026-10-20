import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = process.env.LEGEND_POTION_OUTPUT || 'qa-artifacts/potion-playable';
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3018';
await mkdir(out,{recursive:true});
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'potion_panic');
const profiles = [{ name: 'desktop', width: 1920, height: 1080 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 667, height: 375 }];
const expected = profiles.filter(p=>!process.env.POTION_QA_PROFILE||process.env.POTION_QA_PROFILE===p.name).length * games.filter(g=>!process.env.POTION_DEBUG||g.tier===5).length;
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.POTION_QA_PROFILE && process.env.POTION_QA_PROFILE !== profile.name) continue;
  const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
  await installReleaseAccountFixture(context);
  await context.addInitScript(() => {
   localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Mine QA' }));
   localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  for (const game of games) {
   if(process.env.POTION_DEBUG&&game.tier!==5)continue;
   const page = await context.newPage();
   try {
    await page.goto(base+'/map'); await page.locator('[data-qa-screen="world_map"]').waitFor();
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
    await page.locator('[data-potion-workspace]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    if(process.env.POTION_DEBUG) console.log(await page.evaluate(()=>({html:document.querySelector('.potion-recipe-card').outerHTML,bank:getComputedStyle(document.querySelector('.potion-ingredients')).cssText,card:getComputedStyle(document.querySelector('.potion-recipe-card')).padding,children:[...document.querySelectorAll('.game-question-card-copy>*')].map(n=>({class:n.className,display:getComputedStyle(n).display,font:getComputedStyle(n).fontSize}))})));
    if(profile.name==='small-phone'&&game.tier===5){await page.locator('.potion-brew-button').click();await page.locator('.potion-brew-button:enabled').waitFor();}
    const brews=game.tier===5 ? Number((await page.locator('.potion-recipe-meta').textContent()).match(/of (\d+)/)[1]) : 1;
    for(let round=0;round<brews;round++){
     await page.locator('.potion-brew-button:enabled').waitFor();
     const ratio=(await page.locator('.potion-recipe-meta').textContent()).match(/Ratio ([\d:]+)/i)[1].split(':').map(Number);
     const total=Number((await page.locator('.potion-recipe-copy').textContent()).match(/Brew (\d+) drops/)[1]);
     const unit=total/ratio.reduce((a,b)=>a+b,0);assert.equal(Number.isInteger(unit),true);
     const bottles=page.locator('.potion-ingredient-button');assert.equal(await bottles.count(),ratio.length);
     const layout=await page.evaluate(()=>{
      const rect=n=>n.getBoundingClientRect(),v=rect(document.querySelector('.potion-vessel'));
      const controls=[...document.querySelectorAll('.potion-ingredient-button,.game-screen-bottom button')].filter(n=>n.checkVisibility());
      const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
      const dock=rect(document.querySelector('[data-testid="shared-bottom-hud"]'));
      return {clear:controls.every(n=>!intersects(v,rect(n))),touch:controls.every(n=>rect(n).width>=43&&rect(n).height>=43),fit:controls.every(n=>{const r=rect(n);return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=dock.top+1}),reachable:controls.every(n=>{const r=rect(n);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return n.contains(hit);})};
     });
     if(!layout.fit)console.log(await page.evaluate(()=>({dock:document.querySelector('[data-testid="shared-bottom-hud"]').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.potion-ingredient-button,.game-screen-bottom button')].filter(n=>n.checkVisibility()).map(n=>({text:n.textContent,r:n.getBoundingClientRect().toJSON()}))})));
     assert.deepEqual(layout,{clear:true,touch:true,fit:true,reachable:true},JSON.stringify(layout));
     const centres=await page.evaluate(()=>{
      const centre=n=>{const r=n.getBoundingClientRect();return r.left+r.width/2;};
      const viewport=document.querySelector('.app-viewport'),recipe=document.querySelector('.potion-recipe-card'),actions=document.querySelector('.potion-brew-button').parentElement;
      return {viewport:centre(viewport),question:centre(recipe),actions:centre(actions)};
     });
     assert.ok(Math.abs(centres.question-centres.viewport)<1,'Question must be centred on the full viewport: '+JSON.stringify(centres));
     assert.ok(Math.abs(centres.actions-centres.viewport)<1,'Brew/Reset row must be centred on the full viewport: '+JSON.stringify(centres));
     const audit=await page.evaluate(auditLayout);assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues));assert.equal(audit.overflow,false);
     for(let i=0;i<ratio.length;i++){
      const button=bottles.nth(i);const current=Number(await button.getAttribute('data-potion-current'));const target=unit*ratio[i];
      assert.ok(current<=target);for(let drop=current;drop<target;drop++)await button.click();
      assert.equal(Number(await button.getAttribute('data-potion-current')),target);
     }
     if(game.tier===5&&round===0)await page.screenshot({path:`${out}/${profile.name}.png`});
     await page.locator('.potion-brew-button').click();
     if(game.tier===5&&round===brews-1)await page.locator('[data-result-game="potion_panic"][data-result-outcome="victory"]').waitFor();
     else await page.waitForFunction(n=>Number(document.querySelector('[data-potion-workspace]')?.dataset.potionRound)>n,round);
    }
    results.push({profile:profile.name,route:game.route,questionAndActionCentresWithinOnePixel:true,passed:true}); console.log('PASS',profile.name,game.route);
   } catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length===expected,expected,results},null,2));}
