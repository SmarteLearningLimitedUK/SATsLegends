import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';
import { auditLayout } from './qa/layout-overlap-audit.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const out = 'qa-artifacts/line-graph-clarity';
const games = JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json', 'utf8')).filter(g => g.key === 'line_graph_lab');
const profiles = [{ name: 'desktop', width: 1187, height: 884 }, { name: 'phone', width: 844, height: 390 }, { name: 'small-phone', width: 568, height: 320 }];
const browser = await chromium.launch(), results = [];
function solve(question, points) {
  const value = time => points.find(p => p.time === Number(time))?.value;
  let m;
  if ((m = question.match(/Plot time (\d+): halfway between ([\d.]+) and ([\d.]+)/))) return String((Number(m[2]) + Number(m[3])) / 2);
  if ((m = question.match(/coordinates of the point at time (\d+)/))) return `(${m[1]}, ${value(m[1])})`;
  if ((m = question.match(/brainpower at time (\d+)/))) return String(value(m[1]));
  if ((m = question.match(/reach ([\d.]+) units/))) return String(points.find(p => p.value === Number(m[1])).time);
  if ((m = question.match(/from time (\d+) to time (\d+)/))) return String(Math.abs(value(m[2]) - value(m[1])));
  if ((m = question.match(/halfway between times (\d+) and (\d+)/))) return String((value(m[1]) + value(m[2])) / 2);
  if (question.includes('increase the most')) {
    let best = 0;
    for (let i = 1; i < points.length - 1; i++) if (points[i + 1].value - points[i].value > points[best + 1].value - points[best].value) best = i;
    return `${points[best].time} to ${points[best + 1].time}`;
  }
  throw new Error(`Unknown question: ${question}`);
}
try {
  for (const profile of profiles) {
    if (process.env.LINE_QA_PROFILE && process.env.LINE_QA_PROFILE !== profile.name) continue;
    const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
    await installReleaseAccountFixture(context);
    await context.addInitScript(() => {
      localStorage.setItem('maths_quest_player_v2', JSON.stringify({ avatarId: 'barratt', level: 100, playerName: 'Line QA' }));
      localStorage.setItem('__release_qa_api_state__', JSON.stringify({ revision: 1, saved: { player: { avatarId: 'barratt', level: 100 }, revision: 1 }, requests: {} }));
    });
    for (const game of games) {
      const page = await context.newPage();
      try {
        await page.goto('http://127.0.0.1:3012/map');
        await page.locator('[data-qa-screen="world_map"]').waitFor();
        await page.evaluate(route => { history.pushState({}, '', route); dispatchEvent(new PopStateEvent('popstate')); }, game.route);
        await page.locator('[data-line-round]').waitFor();
        await page.waitForTimeout(350);
        for (let n = 0; n < 4 && await page.locator('[role="dialog"]:visible').count(); n++) {
          const d = page.locator('[role="dialog"]:visible').last(), node = await d.elementHandle();
          await d.locator('[data-dialog-primary]').click();
          await page.waitForFunction(node => !node.isConnected, node);
        }
        const rounds = game.tier === 5 ? 10 : 1;
        for (let i = 0; i < rounds; i++) {
          await page.locator('[data-line-point]').first().waitFor();
          await page.waitForTimeout(200);
          const question = await page.locator('[data-question-copy]').innerText();
          const points = await page.locator('[data-line-point]').evaluateAll(ns => ns.map(n => ({ time: Number(n.dataset.linePoint), value: Number(n.dataset.lineValue) })).sort((a, b) => a.time - b.time));
          const answer = solve(question, points);
          const plot = await page.locator('.recharts-cartesian-grid').boundingBox();
          assert.ok(plot.width >= 95 && plot.height >= 65, `readable plotting area: ${JSON.stringify(plot)}`);
          const audit = await page.evaluate(auditLayout);
          assert.deepEqual(audit.issues, [], JSON.stringify(audit.issues));
          assert.equal(audit.overflow, false);
          const labels = await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').evaluateAll(ns => ns.map(n => n.getBoundingClientRect().toJSON()));
          for (let j = 1; j < labels.length; j++) assert.ok(labels[j - 1].top >= labels[j].bottom + 1, 'numbered axis labels do not overlap');
          const buttons = page.locator('.answer-choice-surface button');
          assert.equal(await buttons.count(), 4);
          for (const button of await buttons.all()) {
            const r = await button.boundingBox();
            assert.ok(r.height >= 43 && r.width >= 43, 'answer has usable touch target');
            const usable = await button.evaluate(b => { const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return b === hit || b.contains(hit); });
            assert.ok(usable, 'answer is visible and reachable');
          }
          if (game.tier === 5 && i === 0) await page.screenshot({ path: `${out}/${profile.name}.png` });
          const selected = buttons.filter({ has: page.getByText(answer, { exact: true }) });
          assert.equal(await selected.count(), 1, `correct answer selectable: ${answer}`);
          if (game.tier === 5 && i === 0) {
            const wrong = buttons.filter({ hasNot: page.getByText(answer, { exact: true }) }).first();
            await wrong.click();
            await page.waitForTimeout(150);
            await page.getByText('Not quite. Check the graph and try another answer.', { exact: true }).waitFor();
          }
          await selected.click();
          if (await page.locator('[data-line-plot-submit]').count()) {
            await page.screenshot({ path: `${out}/${profile.name}-plot.png` });
            await page.locator('[data-line-plot-submit]').click();
          }
          await page.locator('[data-line-state="success"]').waitFor();
          const success = await page.evaluate(auditLayout);
          assert.deepEqual(success.issues, [], JSON.stringify(success.issues));
          await page.getByRole('button', { name: 'Next Graph', exact: true }).click();
          if (i === 9) await page.locator('[data-result-game="line_graph_lab"][data-result-outcome="victory"]').waitFor();
          else await page.waitForFunction(n => document.querySelector('[data-line-round]')?.dataset.lineRound === String(n), i + 2);
        }
        results.push({ profile: profile.name, route: game.route, rounds, passed: true });
        console.log('PASS', profile.name, game.route, rounds, 'rounds');
      } catch (error) { await page.screenshot({ path: `${out}/failure.png` }); throw error; }
      finally { await page.close(); }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/verification${process.env.LINE_QA_PROFILE ? '-' + process.env.LINE_QA_PROFILE : ''}.json`, JSON.stringify({ passed: results.length === (process.env.LINE_QA_PROFILE ? 6 : 18), results }, null, 2));
}
