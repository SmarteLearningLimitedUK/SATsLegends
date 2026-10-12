import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const profiles = [
  { name: 'desktop', engine: chromium, viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
  { name: 'small phone', engine: webkit, viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
];
const toValue = label => label.endsWith('%') ? Number.parseFloat(label) / 100
  : label.includes('/') ? Number(label.split('/')[0]) / Number(label.split('/')[1]) : Number(label);
const hasMatch = values => {
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const i = row * 6 + col;
      if (col <= 3 && values[i] === values[i + 1] && values[i] === values[i + 2]) return true;
      if (row <= 2 && values[i] === values[i + 6] && values[i] === values[i + 12]) return true;
    }
  }
  return false;
};
const legalSwaps = values => {
  const swaps = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const first = row * 6 + col;
      for (const second of [col < 5 ? first + 1 : -1, row < 4 ? first + 6 : -1]) {
        if (second < 0 || values[first] === values[second]) continue;
        const next = [...values];
        [next[first], next[second]] = [next[second], next[first]];
        if (hasMatch(next)) swaps.push([first, second]);
      }
    }
  }
  return swaps;
};

for (const profile of profiles) {
  const browser = await profile.engine.launch();
  const context = await browser.newContext({ viewport: profile.viewport, hasTouch: profile.hasTouch, isMobile: profile.isMobile, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/map');
    const route = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const island = ISLANDS.find(item => item.levels.some(level => level.blueprintKey === 'match3_equivalence' && level.miniGameLevel === 5));
      const level = island?.levels.find(item => item.blueprintKey === 'match3_equivalence' && item.miniGameLevel === 5);
      if (!island || !level) throw Error('Match Mastery level 5 route is absent');
      return `/game/${island.id}/${level.id}`;
    });
    await page.goto(base + route);
    await page.locator('[data-match-tier="5"] button').first().waitFor();
    await page.waitForTimeout(300);
    const intro = page.locator('[role="dialog"] [data-dialog-primary]:visible').first();
    if (await intro.count()) await intro.evaluate(node => node.click());
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const tiles = page.locator('[data-match-tier="5"] button');
    assert.equal(await tiles.count(), 30, 'level 5 board should have 30 tiles');
    const layout = await page.evaluate(() => {
      const question = document.querySelector('[data-game-question]')?.getBoundingClientRect();
      const dock = document.querySelector('[data-testid="shared-bottom-hud"]')?.getBoundingClientRect();
      const board = document.querySelector('[data-match-tier="5"]')?.getBoundingClientRect();
      const tiles = [...document.querySelectorAll('[data-match-tier="5"] button')].map(node => {
        const rect = node.getBoundingClientRect();
        const label = node.querySelector('span');
        const labelStyle = label && getComputedStyle(label);
        const physicalFont = label && labelStyle ? Number.parseFloat(labelStyle.fontSize) * (rect.height / node.offsetHeight) : 0;
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom, physicalFont, hittable: hit === node || node.contains(hit) };
      });
      return { question: question?.toJSON(), board: board?.toJSON(), dock: dock?.toJSON(), tiles };
    });
    assert.ok(layout.question && layout.board && layout.dock, 'question, board or dock is absent');
    assert.ok(layout.question.bottom + 4 <= layout.board.top, 'question overlaps board');
    assert.ok(layout.board.bottom + 4 <= layout.dock.top, 'board overlaps bottom dock');
    assert.ok(layout.tiles.every(tile => tile.hittable), 'a tile is covered by another element');
    if (profile.name === 'small phone') {
      assert.ok(layout.tiles.every(tile => tile.width >= 44 && tile.height >= 44), `small-phone tap target below 44px: ${JSON.stringify(layout.tiles[0])}`);
      assert.ok(layout.tiles.every(tile => tile.physicalFont >= 14), `small-phone value font below 14px: ${JSON.stringify(layout.tiles[0])}`);
    }
    const values = (await tiles.allTextContents()).map(text => toValue(text.trim()));
    assert.ok(values.every(Number.isFinite), `unreadable tile values: ${values}`);
    const swaps = legalSwaps(values);
    assert.ok(swaps.length >= 5, `fewer than five possible equivalence swaps: ${swaps.length}`);
    const legal = new Set(swaps.map(([first, second]) => `${first}:${second}`));
    let invalid = null;
    for (let row = 0; row < 5 && !invalid; row += 1) {
      for (let col = 0; col < 6 && !invalid; col += 1) {
        const first = row * 6 + col;
        for (const second of [col < 5 ? first + 1 : -1, row < 4 ? first + 6 : -1]) {
          if (second >= 0 && values[first] !== values[second] && !legal.has(`${first}:${second}`)) {
            invalid = [first, second];
            break;
          }
        }
      }
    }
    assert.ok(invalid, 'no invalid adjacent pair available to test wrong-answer feedback');
    if (profile.hasTouch) {
      await tiles.nth(invalid[0]).tap();
      await page.waitForTimeout(180);
      await tiles.nth(invalid[1]).tap();
    } else {
      await tiles.nth(invalid[0]).click();
      await page.waitForTimeout(180);
      await tiles.nth(invalid[1]).click();
    }
    await page.locator('[data-game-question] [role="status"]').getByText('No match', { exact: false }).waitFor({ timeout: 5000 });
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
      return saved.telemetry?.incorrectAnswers === 1;
    });
    const [first, second] = swaps[0];
    if (profile.hasTouch) {
      await tiles.nth(first).tap();
      await page.waitForTimeout(180);
      await tiles.nth(second).tap();
    } else {
      await tiles.nth(first).click();
      await page.waitForTimeout(180);
      await tiles.nth(second).click();
    }
    await page.waitForFunction(() => document.querySelector('[data-game-question]')?.textContent?.includes('1/5 matches'), null, { timeout: 5000 });
    await page.waitForFunction(() => {
      const saved = JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}');
      return saved.telemetry?.correctAnswers === 1;
    });
    assert.deepEqual(errors, [], `${profile.name} browser errors`);
    console.log(`PASS ${profile.name}: 30 readable, hittable gems; ${swaps.length} legal swaps; wrong and right feedback/telemetry each recorded once`);
  } catch (error) {
    console.error(`FAIL ${profile.name}: ${error.message}`);
    console.error(await page.evaluate(() => ({ question: document.querySelector('[data-game-question]')?.textContent, xp: document.querySelector('[data-match-status]')?.textContent, telemetry: JSON.parse(localStorage.getItem('maths_quest_player_v2') || '{}').telemetry })));
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
