import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const output = 'qa-artifacts/graph-bank-restoration';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'graph_grabber');
const browser = await chromium.launch();
const results = [];
try {
  for (const profile of [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }]) {
    if (process.env.GRAPH_QA_PROFILE && profile.name !== process.env.GRAPH_QA_PROFILE) continue;
    const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
    await installReleaseAccountFixture(context);
    await context.addInitScript(() => {
      localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Graph QA' }));
      localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
    });
    for (const game of games) {
      const page = await context.newPage();
      try {
        await page.goto('http://127.0.0.1:3012/map');
        await page.locator('[data-qa-screen="world_map"]').waitFor();
        const bank = await page.evaluate(async () => {
          const { getSatsInspiredChallengeQuestion } = await import('/src/systems/content/satsInspiredQuestionBanks.ts');
          const questions = {};
          for (let i = 0; i < 18; i++) {
            const q = getSatsInspiredChallengeQuestion('graph_grabber', 5);
            questions[q.prompt.replace('The records show the number of crates carried by each supply caravan. ', '')] = { ...q, answer: q.options[q.answerIndex] };
          }
          return questions;
        });
        assert.equal(Object.keys(bank).length, 6, 'all six original questions are available');
        await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
        await page.locator('[data-graph-round]').waitFor();
        await page.waitForTimeout(350);
        for (let i = 0; i < 4 && await page.locator('[role="dialog"]:visible').count(); i++) {
          const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle();
          await d.locator('[data-dialog-primary]').click();
          await page.waitForFunction(n => !n.isConnected, node);
        }
        const rounds = game.tier === 5 ? 7 : 1;
        const seen = new Set();
        for (let i = 0; i < rounds; i++) {
          const root = page.locator('[data-graph-round]');
          const id = await root.getAttribute('data-graph-round');
          const text = await page.locator('[data-game-question]').innerText();
          const prompt = Object.keys(bank).find(p => text.includes(p));
          assert.ok(prompt, `question is from original bank: ${text}`);
          seen.add(prompt);
          const question = bank[prompt];
          assert.doesNotMatch(await root.innerText(), /sector|360|\d+%|\d+Ã‚Â°/i);
          await page.locator('[data-crate-bar]').first().waitFor();
          const bars = await page.locator('[data-crate-bar]').evaluateAll(ns => ns.map(n => ({ label: n.dataset.crateBar, value: Number(n.dataset.crateValue) })));
          assert.deepEqual(bars, question.visual.bars.map(({ label, value }) => ({ label, value })));
          const options = page.locator('.graph-grabber-answers button');
          assert.deepEqual((await options.allTextContents()).map(s => s.trim()).sort(), [...question.options].sort());
          await page.waitForTimeout(250);
          const plot = await page.locator('.recharts-cartesian-grid').boundingBox();
          assert.ok(plot && plot.height >= 60, 'chart plotting area remains readable');
          const layout = await page.evaluate(auditLayout);
          assert.deepEqual(layout.issues, [], JSON.stringify(layout.issues));
          assert.equal(layout.overflow, false);
          if (game.tier === 5 && i === 0) await page.screenshot({ path: `${output}/${profile.name}.png` });
          if (game.tier === 5 && i === 0) {
            const wrong = (await options.allTextContents()).map(s => s.trim()).find(s => s !== question.answer);
            await options.filter({ hasText: new RegExp(`^${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).click();
            await page.getByText('Not quite', { exact: true }).waitFor();
            await page.waitForTimeout(1150);
            assert.equal(await root.getAttribute('data-graph-round'), id, 'wrong answer keeps the same question');
          }
          await options.getByText(question.answer, { exact: true }).click();
          if (i === 6) {
            await page.locator('[data-result-game="graph_grabber"][data-result-outcome="victory"]').waitFor();
          } else {
            await page.waitForFunction(previous => document.querySelector('[data-graph-round]')?.dataset.graphRound !== previous, id);
          }
        }
        if (game.tier === 5) assert.ok(seen.size >= 4, 'later levels use a varied selection from the original bank');
        results.push({ profile: profile.name, route: game.route, rounds, passed: true });
        console.log('PASS', profile.name, game.route, rounds, 'rounds');
      } catch (error) {
        await page.screenshot({ path: `${output}/failure.png` });
        throw error;
      } finally { await page.close(); }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/verification.json`, JSON.stringify({ passed: results.length === (process.env.GRAPH_QA_PROFILE ? 6 : 18), results }, null, 2));
}
