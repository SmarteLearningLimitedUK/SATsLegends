import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
await mkdir('qa-artifacts', { recursive: true });
try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 720 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(base + '/game/5/12');
      const choices = page.locator('[data-order-ops-choices] button');
      await choices.first().waitFor({ timeout: 15000 });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const action = page.locator('[data-dialog-primary]:visible').first();
        if (!(await action.count())) break;
        try { await action.click({ timeout: 5000 }); }
        catch (error) { if (await action.count()) throw error; }
        await page.waitForTimeout(150);
      }
      assert.equal(await choices.count(), 4, 'four calculation choices should be visible');
      const expression = (await page.locator('.game-question-card-copy').first().innerText()).trim();
      const numbers = expression.match(/\d+/g)?.map(Number) ?? [];
      assert.equal(numbers.length, 3, `unexpected tier-one expression: ${expression}`);
      const [a, b, c] = numbers;
      const product = b * c;
      await page.screenshot({ path: `qa-artifacts/order-ops-${viewport.width}.png` });
      await page.getByRole('button', { name: `${a} + ${b} = ${a + b}` }).click();
      await page.getByText(/multiply before adding/i).waitFor();
      await page.waitForTimeout(950);
      assert.equal((await page.locator('.game-question-card-copy').first().innerText()).trim(), expression, 'wrong precedence must keep the current expression');
      await page.getByRole('button', { name: `${b} × ${c} = ${product}` }).click();
      await page.waitForFunction((expected) => document.querySelector('.game-question-card-copy')?.textContent?.includes(expected), `${a} + ${product}`);
      await page.getByRole('button', { name: `${a} + ${product} = ${a + product}` }).click();
      await page.waitForFunction(() => document.body.textContent?.includes('1 orders restored'), undefined, { timeout: 5000 });
      const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(width <= 1, `${viewport.width}: horizontal overflow`);
      console.log(`PASS Order Ops ${viewport.width}×${viewport.height}: resolve multiplication, then addition, and hit enemy`);
    } finally { await context.close(); }
  }
  const scoredContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  try {
    const page = await scoredContext.newPage();
    await page.goto(base + '/game/5/24');
    const choices = page.locator('[data-order-ops-choices] button');
    await choices.first().waitFor({ timeout: 15000 });
    const labels = (await choices.allTextContents()).map(label => label.trim());
    const wrongCalculation = labels.find(label => {
      const parts = label.match(/(\d+) ([+×−]) (\d+) = (-?\d+)$/);
      if (!parts) return false;
      const [, left, operator, right, result] = parts;
      const expected = operator === '×' ? Number(left) * Number(right)
        : operator === '+' ? Number(left) + Number(right) : Number(left) - Number(right);
      return expected !== Number(result);
    });
    assert.ok(wrongCalculation, 'scored round should present a calculable wrong choice');
    await page.getByRole('img', { name: '3 of 3 lives remaining' }).waitFor();
    await page.getByRole('button', { name: wrongCalculation, exact: true }).click();
    await page.getByRole('img', { name: '2 of 3 lives remaining' }).waitFor();
    console.log('PASS Order Ops scored tier 5: wrong calculation consumes one shared life');
  } finally { await scoredContext.close(); }
} finally { await browser.close(); }
