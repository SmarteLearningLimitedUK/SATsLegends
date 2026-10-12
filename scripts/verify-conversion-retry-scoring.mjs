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
      const level = island.levels.find(item => item.blueprintKey === 'conversion_canyon' && item.difficultyTier === 1 && !item.isPractice);
      if (level) return `/game/${island.id}/${level.id}`;
    }
    throw new Error('Conversion Canyon level one is missing');
  });
  await page.goto(base + route);
  const intro = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await intro.count()) await intro.first().click();
  await page.locator('[data-conversion-scale]').waitFor();

  const submit = page.getByRole('button', { name: 'Submit Shipment', exact: true });
  await submit.click();
  await submit.click();
  await page.getByRole('status').filter({ hasText: /short\. Add more weight\./ }).waitFor();

  for (let round = 0; round < 5; round += 1) {
    const target = Number(await page.locator('[data-conversion-target]').getAttribute('data-conversion-target'));
    const tokens = await page.locator('[data-conversion-token]').evaluateAll(nodes => nodes.map(node => {
      const label = node.querySelector('span')?.textContent?.trim() ?? '';
      const match = label.match(/^([\d.,]+) (kg|g)$/);
      if (!match) throw new Error(`Unreadable weight: ${label}`);
      return { id: node.dataset.conversionToken, grams: Number(match[1].replaceAll(',', '')) * (match[2] === 'kg' ? 1000 : 1) };
    }));
    let solution;
    for (let bits = 1; bits < 2 ** tokens.length; bits += 1) {
      const weight = tokens.reduce((sum, token, index) => sum + ((bits >> index) & 1 ? token.grams : 0), 0);
      if (Math.abs(weight - target) < 0.001) { solution = tokens.filter((_, index) => (bits >> index) & 1); break; }
    }
    assert.ok(solution, `Round ${round + 1} has no reachable target`);
    for (const token of solution) await page.locator(`[data-conversion-token="${token.id}"]`).click();
    await submit.click();
    if (round < 4) await expect(page.locator('[data-conversion-token]').first()).not.toHaveAttribute('data-conversion-token', tokens[0].id);
  }

  await page.getByText('Stars', { exact: true }).waitFor({ timeout: 10000 });
  assert.equal(await page.getByText('2/3', { exact: true }).count(), 1, 'Two wrong attempts must cap the clear at two stars');
  assert.equal(await page.getByText('71%', { exact: true }).count(), 1, 'Five correct and two wrong submissions must show 71% accuracy');
  console.log(`PASS ${route}: five correct, two wrong, two stars and 71% accuracy`);
} finally {
  await browser.close();
}
