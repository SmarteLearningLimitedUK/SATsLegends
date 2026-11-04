import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/mine-curriculum';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'multiplication_mine');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
function answers(a, b, guided) {
 if (!guided) return [a * b];
 const answer = [];
 for (const [row, multiplier] of (b >= 10 ? [b % 10, Math.floor(b / 10)] : [b]).entries()) {
  if (row) answer.push(0);
  if (!multiplier) { answer.push(0); continue; }
  let carry = 0;
  for (const digit of String(a).split('').reverse()) { const result = Number(digit) * multiplier + carry; answer.push(result); carry = Math.floor(result / 10); }
 }
 if (b >= 10) answer.push(a * b);
 return answer;
}
const browser = await chromium.launch(), results = [];
try {
 for (const profile of profiles) {
  if (process.env.MINE_QA_PROFILE && process.env.MINE_QA_PROFILE !== profile.name) continue;
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
    await page.locator('[data-mine-a]').waitFor(); await page.waitForTimeout(250);
    for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) { const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle(); await d.locator('[data-dialog-primary]').click(); await page.waitForFunction(n => !n.isConnected, node); }
    const count = game.tier === 5 ? 4 : 1;
    for (let product = 0; product < count; product++) {
     const root = page.locator('[data-mine-a]'), a = Number(await root.getAttribute('data-mine-a')), b = Number(await root.getAttribute('data-mine-b'));
     const guided = await page.locator('[data-written-columns]').count() > 0;
     if (game.tier === 5) assert.ok(a >= 1000 && a <= 9999 && b >= 10 && b <= 99, 'Year 6 four-digit by two-digit band');
     const sequence = answers(a, b, guided);
     for (let i = 0; i < sequence.length; i++) {
      await page.waitForFunction(() => document.querySelector('[data-mine-game]')?.dataset.mineLocked === 'false');
      const audit = await page.evaluate(auditLayout); assert.deepEqual(audit.issues, [], JSON.stringify(audit.issues)); assert.equal(audit.overflow, false);
      const buttons = page.locator('[data-mine-answer]'); assert.equal(await buttons.count(), 4);
      if (profile.name === 'small-phone' && game.tier === 5 && product === 0 && i === 0) {
       const wrong = (await buttons.evaluateAll(ns => ns.map(n => Number(n.dataset.mineAnswer)))).find(n => n !== sequence[i]);
       await page.locator(`[data-mine-answer="${wrong}"]`).click();
       assert.equal(Number(await root.getAttribute('data-mine-column')), 0, 'wrong column keeps the same working');
       await page.waitForFunction(() => document.querySelector('[data-mine-game]')?.dataset.mineLocked === 'false');
      }
      if (game.tier === 5 && product === 0 && (i === 0 || i === sequence.length - 1)) await page.screenshot({ path: `${out}/${profile.name}${i ? '-sum' : ''}.png` });
      await page.locator(`[data-mine-answer="${sequence[i]}"]`).click();
     }
     if (product === 3) await page.locator('[data-result-game="multiplication_mine"][data-result-outcome="victory"]').waitFor();
     else await page.waitForFunction(n => Number(document.querySelector('[data-mine-game]')?.dataset.mineCorrect) >= n && document.querySelector('[data-mine-game]')?.dataset.mineLocked === 'false', product + 1);
    }
    results.push({ profile: profile.name, route: game.route, products: count, passed: true }); console.log('PASS', profile.name, game.route, count);
   } catch (e) { await page.screenshot({ path: `${out}/failure.png` }); throw e; }
   finally { await page.close(); }
  }
  await context.close();
 }
} finally {
 await browser.close(); await writeFile(`${out}/verification${process.env.MINE_QA_PROFILE ? '-' + process.env.MINE_QA_PROFILE : ''}.json`, JSON.stringify({ passed: results.length === (process.env.MINE_QA_PROFILE ? 6 : 18), results }, null, 2));
}
