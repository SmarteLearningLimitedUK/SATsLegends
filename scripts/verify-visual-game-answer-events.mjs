import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const games = [
  { key: 'area_architect', action: 'check floor' },
  { key: 'problem_pyramid', action: 'pyramid choice' },
  { key: 'polygon_palace', action: 'polygon choice' },
  { key: 'rotation_relay', action: 'submit rotation' },
];
const profiles = [
  { name: 'desktop Chromium', engine: chromium, viewport: { width: 1440, height: 900 }, isMobile: false },
  { name: '320px WebKit', engine: webkit, viewport: { width: 320, height: 568 }, isMobile: true },
];

for (const profile of profiles) {
  const browser = await profile.engine.launch();
  try {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.isMobile, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(base + '/map');
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      return ISLANDS.flatMap(island => island.levels.map(level => ({
        key: level.blueprintKey, route: `/game/${island.id}/${level.id}`, practice: Boolean(level.isPractice),
      }))).filter(level => level.practice);
    });
    await context.close();

    for (const game of games) {
      const route = routes.find(level => level.key === game.key)?.route;
      assert(route, `${profile.name}: ${game.key} practice must be reachable`);
      const gameContext = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.isMobile, reducedMotion: 'reduce' });
      const gamePage = await gameContext.newPage();
      const errors = [];
      gamePage.on('pageerror', error => errors.push(error.message));
      await gamePage.goto(base + route);
      await gamePage.locator('[data-qa-screen="gameplay"]').waitFor();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const intro = gamePage.locator('[role="dialog"] [data-dialog-primary]:visible').first();
        if (!(await intro.count())) break;
        await intro.evaluate(node => node.click());
      }
      let target;
      switch (game.key) {
        case 'area_architect': target = gamePage.locator('[data-area-answer]').first(); break;
        case 'problem_pyramid': target = gamePage.locator('.answer-choice-surface button').first(); break;
        case 'polygon_palace': target = gamePage.locator('main section').last().locator('button').first(); break;
        default:
          await gamePage.locator('.rs-grid').focus();
          for (let corner = 0; corner < 3; corner++) await gamePage.keyboard.press('Enter');
          target = gamePage.getByRole('button', { name: 'Check image', exact: true });
      }
      await target.waitFor();
      assert(await target.isVisible(), `${profile.name}: ${game.action} must be visible`);
      await target.evaluate(node => { node.click(); node.click(); });
      await gamePage.waitForFunction(() => {
        const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
        return (player.telemetry?.correctAnswers ?? 0) + (player.telemetry?.incorrectAnswers ?? 0) >= 1;
      });
      await gamePage.waitForTimeout(100);
      const telemetry = await gamePage.evaluate(() => {
        const player = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
        return { correct: player.telemetry?.correctAnswers ?? 0, incorrect: player.telemetry?.incorrectAnswers ?? 0 };
      });
      assert.equal(telemetry.correct + telemetry.incorrect, 1, `${profile.name}: ${game.key} must emit one event for one attempt`);
      assert.deepEqual(errors, [], `${profile.name}: ${game.key} page errors`);
      await gameContext.close();
      console.log(`PASS ${profile.name}: ${game.key} one answer event`);
    }
  } finally {
    await browser.close();
  }
}

console.log('Visual-game answer event verification passed.');
