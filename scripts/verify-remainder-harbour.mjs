import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/remainder-harbour';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'remainder_run');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.REMAINDER_QA_PROFILE && process.env.REMAINDER_QA_PROFILE !== profile.name) continue;
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
    await page.locator('[data-remainder-game]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    await page.waitForTimeout(350);
    const audit=await page.evaluate(auditLayout);
    assert.deepEqual(audit.issues,[],JSON.stringify(audit.issues)); assert.equal(audit.overflow,false);
    if(await page.locator('[data-cargo-send]').count()){
     const fit=await page.evaluate(()=>{const panel=document.querySelector('.remainder-main').getBoundingClientRect();return [...document.querySelectorAll('[data-cargo-batch],[data-cargo-send]')].every(n=>{const r=n.getBoundingClientRect();return r.height>=43&&r.bottom<=panel.bottom+1&&r.top>=panel.top&&r.right<=innerWidth;});});
     assert.equal(fit,true,'batch controls and send fit above dock');
     if(game.tier===5)await page.screenshot({path:`${out}/${profile.name}-initial.png`});
    }
    const buttons=page.locator('[data-cargo-batch]:enabled');
    if(await page.locator('[data-cargo-send]').count()){
     const deck=page.locator('[data-cargo-deck]');
     const start=Number(await deck.getAttribute('data-cargo-remaining'));
     const capacity=Number((await page.locator('.cargo-capacity').textContent()).match(/\d+/)[0]);
     await page.locator('[data-cargo-batch="1"]').click();
     assert.equal(Number(await deck.getAttribute('data-cargo-remaining')),start-capacity);
     await page.locator('.cargo-reset').click();assert.equal(Number(await deck.getAttribute('data-cargo-loaded')),0);
     while(await page.locator('[data-cargo-send]').isDisabled()){
      const batch=buttons.first();const count=Number(await batch.getAttribute('data-cargo-batch'));
      const before=Number(await deck.getAttribute('data-cargo-remaining'));
      await batch.click();assert.equal(Number(await deck.getAttribute('data-cargo-remaining')),before-count*capacity);
     }
     assert.equal(Number(await deck.getAttribute('data-cargo-loaded')),Math.floor(start/capacity));
     assert.equal(Number(await deck.getAttribute('data-cargo-remaining')),start%capacity);
     await page.screenshot({path:`${out}/${profile.name}-loaded.png`});
     await page.locator('[data-cargo-send]').click();
     await page.waitForFunction(()=>Number(document.querySelector('[data-remainder-game]').dataset.remainderCorrect)===1);
     await page.locator('.cargo-answer-panel button:enabled').first().waitFor();
    }
    const values=await page.locator('.cargo-scoreboard strong').allTextContents();
    const total=parseFloat(values[0]),divisor=parseFloat(values[1]);
    const decimal=values[0].includes('m');
    const expected=decimal ? String(Number((total/divisor).toFixed(2)))+' m each' : `${Math.floor(total/divisor)} boxes · ${total%divisor} left`;
    const answer=page.locator('.cargo-answer-panel button').filter({hasText:expected});
    assert.equal(await answer.count(),1);
    const geometry=await page.evaluate(()=>{
     const hero=document.querySelector('[data-vision-game="remainder_run"] .vision-companion--stage').getBoundingClientRect();
     const panel=document.querySelector('.remainder-main').getBoundingClientRect();
     const controls=[...document.querySelectorAll('.remainder-main button')].filter(n=>n.checkVisibility()).map(n=>n.getBoundingClientRect());
     return {clear:hero.right<=panel.left+2,buttonsFit:controls.every(r=>r.top>=panel.top-1&&r.bottom<=panel.bottom+1&&r.right<=innerWidth+1&&r.left>=0),touch:controls.every(r=>r.height>=43)};
    });
    assert.equal(geometry.clear,true);assert.equal(geometry.buttonsFit,true);assert.equal(geometry.touch,true);
    const finalAudit=await page.evaluate(auditLayout);assert.deepEqual(finalAudit.issues,[],JSON.stringify(finalAudit.issues));assert.equal(finalAudit.overflow,false);
    if(game.tier===5)await page.screenshot({path:`${out}/${profile.name}.png`});
    await answer.click();
    await page.waitForFunction(()=>Number(document.querySelector('[data-remainder-game]').dataset.remainderCorrect)>0);
    results.push({profile:profile.name,route:game.route,passed:true}); console.log('PASS',profile.name,game.route);
   } catch(e){await page.screenshot({path:`${out}/failure.png`});throw e;}
   finally{await page.close();}
  }
  await context.close();
 }
} finally{await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({passed:results.length===18,results},null,2));}
