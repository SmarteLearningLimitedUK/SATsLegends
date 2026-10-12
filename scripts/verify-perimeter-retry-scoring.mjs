import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3004';
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  await page.goto(base);
  const route = await page.evaluate(async () => {
    const { ISLANDS } = await import('/src/constants.ts');
    for (const island of ISLANDS) {
      const level = island.levels.find(item => item.blueprintKey === 'perimeter_path' && item.difficultyTier === 1 && !item.isPractice);
      if (level) return `/game/${island.id}/${level.id}`;
    }
    throw new Error('Perimeter Path level one is missing');
  });
  await page.goto(base + route);
  const intro = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await intro.count()) await intro.first().click();
  const board = page.locator('[data-perimeter-game]');
  await board.waitFor();

  async function answer(correct, final = false) {
    const question = await board.getAttribute('data-perimeter-question');
    const options = await page.locator('.perimeter-responses button').allTextContents();
    const unit = options[0].match(/(cm|m)\s*$/)?.[1];
    assert.ok(unit, 'Perimeter options must show a unit');
    const labels = await page.locator('[data-perimeter-edge]').evaluateAll(nodes => nodes.map(node => node.dataset.edgeValue));
    const target = labels.reduce((sum, original, index) => {
      const label = original === '?' ? labels[(index + 2) % 4] : original;
      const match = label.match(/^([\d.]+) (m|cm)$/);
      assert.ok(match, `Unreadable edge: ${label}`);
      return sum + Number(match[1]) * (unit === 'cm' && match[2] === 'm' ? 100 : 1);
    }, 0);
    const index = options.findIndex(text => {
      const number = Number(text.match(/[\d.,]+/)?.[0].replaceAll(',', ''));
      return correct ? Math.abs(number - target) < 0.001 : Math.abs(number - target) > 0.001;
    });
    assert.ok(index >= 0, `No ${correct ? 'correct' : 'incorrect'} option for ${target} ${unit}`);
    await page.locator('.perimeter-responses button').nth(index).click();
    if (final) await page.getByText('Stars', { exact: true }).waitFor({ timeout: 10000 });
    else if (question) await expect(board).not.toHaveAttribute('data-perimeter-question', question);
  }

  await answer(false);
  await answer(false);
  for (let round = 0; round < 12; round += 1) await answer(true, round === 11);
  await page.getByText('Stars', { exact: true }).waitFor({ timeout: 10000 });
  assert.equal(await page.getByText('2/3', { exact: true }).count(), 1, 'Two wrong answers must cap the clear at two stars');
  assert.equal(await page.getByText('86%', { exact: true }).count(), 1, 'Twelve correct and two wrong answers must show 86% accuracy');
  console.log(`PASS ${route}: twelve correct, two wrong, two stars and 86% accuracy`);
} finally {
  await browser.close();
}
