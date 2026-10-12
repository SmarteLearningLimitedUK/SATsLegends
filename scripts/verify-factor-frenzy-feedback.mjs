import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const profiles = [
  { name: 'desktop Chromium', engine: chromium, viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: '320px WebKit', engine: webkit, viewport: { width: 320, height: 568 }, isMobile: true },
];

const telemetry = page => page.evaluate(() => {
  const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
  return { correct: player.telemetry?.correctAnswers ?? 0, incorrect: player.telemetry?.incorrectAnswers ?? 0 };
});

for (const profile of profiles) {
  const browser = await profile.engine.launch();
  try {
    const lookupContext = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.isMobile });
    const lookup = await lookupContext.newPage();
    await lookup.goto(base + '/map');
    const routes = await lookup.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const levels = ISLANDS.flatMap(island => island.levels.map(level => ({
        key: level.blueprintKey, route: `/game/${island.id}/${level.id}`,
        practice: Boolean(level.isPractice), tier: level.miniGameLevel,
      }))).filter(level => level.key === 'factor_frenzy');
      return { practice: levels.find(level => level.practice)?.route, tier5: levels.find(level => level.tier === 5)?.route };
    });
    await lookupContext.close();
    assert(routes.practice && routes.tier5, `${profile.name}: Factor Frenzy practice and tier 5 must be reachable`);

    for (const scenario of ['correct', 'wrong', 'timeout']) {
      const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.isMobile, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + (scenario === 'timeout' ? routes.tier5 : routes.practice));
      await page.locator('.factor-option-grid button').first().waitFor();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const intro = page.locator('[role="dialog"] [data-dialog-primary]:visible').first();
        if (!(await intro.count())) break;
        await intro.evaluate(node => node.click());
      }

      if (scenario === 'timeout') {
        await page.waitForFunction(() => {
          const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
          return player.telemetry?.incorrectAnswers === 1;
        }, null, { timeout: 15000 });
        assert.match(await page.locator('.factor-strike-row [role="status"]').innerText(), /Correct (factor|factors):/);
      } else {
        const prompt = await page.locator('[data-game-question]').innerText();
        const match = prompt.match(/(\d+)\s*×\s*\?\s*=\s*(\d+)/);
        assert(match, `${profile.name}: expected a tier-1 factor question, got ${prompt}`);
        const answer = Number(match[2]) / Number(match[1]);
        const option = page.locator('.factor-option-grid button').filter({ hasText: scenario === 'correct' ? new RegExp(`^${answer}$`) : new RegExp(`^(?!${answer}$)\\d+$`) }).first();
        assert(await option.count(), `${profile.name}: answer tile should be available`);
        await option.click();
        await page.getByRole('button', { name: 'Strike' }).evaluate(node => { node.click(); node.click(); });
        await page.waitForFunction(expected => {
          const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
          return (player.telemetry?.[expected] ?? 0) === 1;
        }, scenario === 'correct' ? 'correctAnswers' : 'incorrectAnswers');
        if (scenario === 'wrong') {
          assert.match(await page.locator('.factor-strike-row [role="status"]').innerText(), new RegExp(`Correct factor: ${answer}`));
          assert(await page.locator('.factor-option-grid button').filter({ hasText: new RegExp(`^${answer}$`) }).evaluate(node => node.classList.contains('ui-button-success')), `${profile.name}: correct factor should be highlighted after a miss`);
        }
      }
      const counts = await telemetry(page);
      assert.deepEqual(counts, scenario === 'correct' ? { correct: 1, incorrect: 0 } : { correct: 0, incorrect: 1 }, `${profile.name}: ${scenario} should emit exactly one answer event`);
      assert.deepEqual(errors, [], `${profile.name}: ${scenario} page errors`);
      await context.close();
      console.log(`PASS ${profile.name}: Factor Frenzy ${scenario} feedback and telemetry`);
    }
  } finally {
    await browser.close();
  }
}

console.log('Factor Frenzy feedback verification passed.');
