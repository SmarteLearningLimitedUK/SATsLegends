import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/formula-layout';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'formula_forge');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.FORMULA_QA_PROFILE && process.env.FORMULA_QA_PROFILE !== profile.name) continue;
  const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
  await installReleaseAccountFixture(context);
  await context.addInitScript(() => {
   localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Mine QA' }));
   localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  for (const game of games) {
   const page = await context.newPage();
   try {
    await page.goto('http://127.0.0.1:3012/map'); await page.locator('[data-qa-screen="world_map"]').waitFor();
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
    await page.locator('[data-formula-game]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    await page.waitForTimeout(350);
    const audit=await page.evaluate(auditLayout);
    assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues)); assert.equal(audit.overflow,false);
    const geometry=await page.evaluate(()=>{
     const hero=document.querySelector('[data-vision-game="formula_forge"] .vision-companion--stage').getBoundingClientRect();
     const panels=[...document.querySelectorAll('[data-formula-playfield],[data-formula-answers],[data-formula-hint]')].map(n=>n.getBoundingClientRect());
     const overlap=panels.some(r=>Math.min(hero.right,r.right)-Math.max(hero.left,r.left)>2&&Math.min(hero.bottom,r.bottom)-Math.max(hero.top,r.top)>2);
     const layer=document.querySelector('.formula-forge-scene .game-background-layer');
     const buttons=[...document.querySelectorAll('[data-formula-answer]')].map(n=>n.getBoundingClientRect());
     return {overlap,layerHidden:!layer||getComputedStyle(layer).display==='none',touch:buttons.every(r=>r.height>=43&&r.width>=43&&r.bottom<=document.querySelector('[data-formula-game]').getBoundingClientRect().bottom+1)};
    });
    assert.equal(geometry.overlap,false,'hero clear of all panels');assert.equal(geometry.layerHidden,true);assert.equal(geometry.touch,true);
    if(game.tier===5) await page.screenshot({path:`${out}/${profile.name}.png`});
    results.push({profile:profile.name,route:game.route,passed:true}); console.log('PASS',profile.name,game.route);
   } catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length===18,results},null,2));}
