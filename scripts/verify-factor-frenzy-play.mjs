import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/factor-frenzy-play';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'factor_frenzy');
const profiles = [{ name: 'laptop', width: 1037, height: 789 }, { name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }, { name: 'reduced', width: 844, height: 390, reducedMotion: 'reduce' }];
const browser = await chromium.launch(), results = [];
const prime = n => n > 1 && !Array.from({ length: Math.max(0, n - 2) }, (_, i) => i + 2).some(i => n % i === 0);
try {
 for (const profile of profiles) {
  if (process.env.FACTOR_QA_PROFILE && process.env.FACTOR_QA_PROFILE !== profile.name) continue;
  const context = await browser.newContext({ viewport: profile, reducedMotion: profile.reducedMotion || 'no-preference' });
  await installReleaseAccountFixture(context);
  await context.addInitScript(() => {
   let seed = 9876; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
   localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Factor QA' }));
   localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
  });
  for (const game of games) {
   if (profile.name === 'reduced' && game.tier !== 5) continue;
   const page = await context.newPage();
   try {
    await page.goto('http://127.0.0.1:3012/map'); await page.locator('[data-qa-screen="world_map"]').waitFor();
    await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
    await page.locator('[data-factor-id]').waitFor(); await page.waitForTimeout(200);
    for (let n = 0; n < 4 && await page.locator('[role="dialog"]:visible').count(); n++) {
     const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node);
    }
    if (game.tier === 5 && profile.name === 'small-phone') {
     await page.getByRole('button', { name: 'How to play', exact: true }).click();
     await page.waitForTimeout(100); const time = await page.locator('.frenzy-clock strong').innerText();
     await page.waitForTimeout(1200); assert.equal(await page.locator('.frenzy-clock strong').innerText(), time, 'Help pauses the timer');
     const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node);
    }
    const count = game.tier === 5 ? 10 : 1;
    let testedWrong = false;
    for (let i = 0; i < count; i++) {
     const root = page.locator('[data-factor-id]');
     await page.locator('[data-factor-status="playing"]').waitFor();
     const id = await root.getAttribute('data-factor-id'), type = await root.getAttribute('data-factor-type'), n = Number(await root.getAttribute('data-factor-number')), m = Number(await root.getAttribute('data-factor-number2'));
     const opts = await page.locator('[data-factor-option]').evaluateAll(ns => ns.map(n => Number(n.dataset.factorOption)));
     let correct;
     if (type === 'missing_factor') { const q = await page.locator('[data-question-copy]').innerText(), factor = Number(q.match(/\d+/)?.[0]); correct = [n / factor]; }
     else correct = opts.filter(v => n % v === 0 && (type !== 'common_factors' || m % v === 0) && (type !== 'prime_factors' || prime(v)));
     if (!testedWrong && game.tier === 5 && profile.name === 'small-phone') {
      testedWrong = true;
      const wrong = opts.find(v => !correct.includes(v));
      await page.locator(`[data-factor-option="${wrong}"]`).click();
      await page.getByRole('button', { name: 'Fire pulse', exact: true }).click();
      await page.locator('[data-factor-status="incorrect"]').waitFor();
      assert.equal(Number(await root.getAttribute('data-factor-health')), 10, 'wrong pulse opens no locks');
      assert.match(await page.locator('.frenzy-loaded').innerText(), /Correct:/);
      const errorLayout = await page.evaluate(auditLayout); assert.deepEqual(errorLayout.issues, [], JSON.stringify(errorLayout.issues));
      await page.waitForFunction(previous => document.querySelector('[data-factor-id]')?.dataset.factorId !== previous, id);
      i--; continue;
     }
     const audit = await page.evaluate(auditLayout); assert.deepEqual(audit.issues, [], JSON.stringify(audit.issues)); assert.equal(audit.overflow, false);
     for (const button of await page.locator('[data-factor-option],.frenzy-fire').all()) {
      const r = await button.boundingBox(); assert.ok(r.width >= 43 && r.height >= 43, 'runes and fire are touch sized');
      assert.ok(await button.evaluate(b => { const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return b === hit || b.contains(hit); }), 'control is visible');
     }
     assert.equal(await page.locator('.frenzy-fire').isDisabled(), true);
     if (game.tier === 5 && i === 0) await page.screenshot({ path: `${out}/${profile.name}.png` });
     for (const value of correct) await page.locator(`[data-factor-option="${value}"]`).click();
     assert.equal(await page.locator('[data-factor-option][aria-pressed=true]').count(), correct.length);
     assert.match(await page.locator('.frenzy-loaded').innerText(), /Loaded/);
     const selected = await page.evaluate(auditLayout); assert.deepEqual(selected.issues, [], JSON.stringify(selected.issues));
     await page.getByRole('button', { name: 'Fire pulse', exact: true }).click();
     if (i === 9) {
      await page.locator('[data-factor-status="complete"]').waitFor();
      await page.getByRole('button', { name: 'Claim Victory', exact: true }).click();
      await page.locator('[data-result-game="factor_frenzy"][data-result-outcome="victory"]').waitFor();
     } else {
      assert.equal(Number(await root.getAttribute('data-factor-health')), 9 - i);
      const hitLayout = await page.evaluate(auditLayout); assert.deepEqual(hitLayout.issues, [], JSON.stringify(hitLayout.issues));
      if (game.tier === 5 && i === 0) {
       if (profile.name !== 'reduced') assert.equal(await page.locator('.frenzy-pulse').count(), 1, 'correct answer fires animated pulse');
       await page.screenshot({ path: `${out}/${profile.name}-hit.png` });
      }
      await page.waitForFunction(previous => document.querySelector('[data-factor-id]')?.dataset.factorId !== previous, id);
     }
    }
    results.push({ profile: profile.name, route: game.route, rounds: count, passed: true }); console.log('PASS', profile.name, game.route, count);
   } catch (e) { await page.screenshot({ path: `${out}/failure.png` }); throw e; }
   finally { await page.close(); }
  }
  await context.close();
 }
} finally {
 await browser.close();
 await writeFile(`${out}/verification${process.env.FACTOR_QA_PROFILE ? '-' + process.env.FACTOR_QA_PROFILE : ''}.json`, JSON.stringify({ passed: results.length === (process.env.FACTOR_QA_PROFILE ? (process.env.FACTOR_QA_PROFILE === 'reduced' ? 1 : 6) : 25), results }, null, 2));
}
