import { chromium, webkit, devices, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGEND_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/legend-reskin');
await mkdir(output, { recursive: true });
const profiles = [
  { name: 'pc', browser: chromium, options: { viewport: { width: 1440, height: 900 } } },
  { name: 'ipad-a2hs', browser: webkit, options: { ...devices['iPad (gen 7)'], viewport: { width: 768, height: 1024 } } },
  { name: 'phone-a2hs', browser: webkit, options: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } },
].filter((profile) => !process.env.LEGEND_QA_PROFILE || process.env.LEGEND_QA_PROFILE === profile.name);
const reports = [];
for (const profile of profiles) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  if (profile.name !== 'pc') await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const nativeMatch = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = nativeMatch(query);
      if (query.includes('display-mode: standalone')) Object.defineProperty(result, 'matches', { value: true });
      return result;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const startMission = async (route) => {
    await page.goto('about:blank');
    await page.goto(base + route);
    await page.locator('[data-game-question="true"]').waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const intro = page.locator('[role="dialog"] [data-dialog-primary]');
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await intro.count()) await intro.first().click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await page.waitForTimeout(300);
      if (!await intro.count()) break;
    }
    const question = page.locator('[data-question-copy="true"]');
    await expect(question).toBeVisible();
    expect((await question.innerText()).trim()).not.toBe('');
    return question;
  };
  try {
    await page.goto(base);
    const routes = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const keys = ['take_out_rush', 'fraction_forge', 'conversion_canyon', 'data_detective', 'remainder_run', 'multiplication_mine', 'time_keeper_cove'];
      return Object.fromEntries(keys.map((key) => {
        for (const island of ISLANDS) {
          const level = island.levels.find((entry) => entry.blueprintKey === key);
          if (level) return [key, `/game/${island.id}/${level.id}`];
        }
        throw new Error(`Missing current game blueprint ${key}`);
      }));
    });

    let question = await startMission(routes.take_out_rush);
    const targetFraction = (await question.innerText()).match(/worth (.+)\./)[1];
    const foods = page.locator('button[data-button-skin="none"]');
    for (let index = 0; index < await foods.count(); index += 1) {
      if ((await foods.nth(index).innerText()).trim() !== targetFraction) {
        await foods.nth(index).click();
        break;
      }
    }
    await page.getByRole('button', { name: 'Reset tray', exact: true }).click();
    await expect(question).toBeVisible();

    question = await startMission(routes.conversion_canyon);
    await page.getByRole('button', { name: 'Submit Shipment' }).click();
    await page.getByRole('status').filter({ hasText: /short\. Add more weight\.|Over by .*Remove excess/ }).waitFor();
    await expect(question).toContainText('Match');
    await page.getByRole('button', { name: 'Reset Weights' }).click();
    await expect(question).toBeVisible();

    question = await startMission(routes.data_detective);
    await page.getByRole('button', { name: /^Inspect / }).first().click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(question).toBeVisible();

    question = await startMission(routes.fraction_forge);
    const source = page.locator('[data-fraction-source="true"]').first();
    const target = page.locator('[data-fraction-target="true"]').first();
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    const originalTile = await source.locator('button').textContent();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    const dragging = page.locator('[data-fraction-drag="true"]');
    await expect(dragging).toBeVisible();
    const centerX = to.x + to.width / 2;
    const centerY = to.y + to.height / 2;
    await expect.poll(async () => {
      const tile = await dragging.boundingBox();
      return Math.hypot(tile.x + tile.width / 2 - centerX, tile.y + tile.height / 2 - centerY);
    }).toBeLessThan(4);
    await page.screenshot({ path: path.join(output, `${profile.name}-fraction-forge-drag.png`) });
    await page.mouse.up();
    const placement = page.locator('[data-fraction-placement="true"]').first().locator('button');
    await expect(placement).toHaveText(originalTile);
    await expect(source.locator('button')).toHaveAttribute('aria-label', /Place selected fraction in source position/);
    await expect(question).toBeVisible();

    const placed = await placement.boundingBox();
    await page.mouse.move(placed.x + placed.width / 2, placed.y + placed.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(source.locator('button')).toHaveText(originalTile);
    await expect(placement).toHaveCount(0);

    question = await startMission(routes.remainder_run);
    const expression = (await question.innerText()).trim().match(/^([\d.]+) ÷ (\d+) = \?$/);
    expect(expression).not.toBeNull();
    const dividend = Number(expression[1]);
    const divisor = Number(expression[2]);
    const expectedAnswer = expression[1].includes('.')
      ? (dividend / divisor).toFixed(2).replace(/\.?0+$/, '')
      : `${Math.floor(dividend / divisor)} r${dividend % divisor}`;
    const division = page.locator('[data-division-problem="true"]');
    await expect(division).toBeVisible();
    const previousProblemId = await division.getAttribute('data-problem-id');
    const answer = page.locator('.answer-choice-surface').getByRole('button', { name: expectedAnswer, exact: true });
    await answer.click();
    await expect(answer).toHaveClass(/ui-button-success/);
    await expect(division).not.toHaveAttribute('data-problem-id', previousProblemId);
    await expect(question).toBeVisible();

    question = await startMission(routes.multiplication_mine);
    const rock = page.locator('[data-mine-rock="true"]');
    await expect(rock).toHaveAttribute('data-rock-health', '4');
    await expect(rock).toHaveAttribute('src', /ore-intact\.webp$/);
    const mineAnswers = page.locator('.answer-choice-surface button');
    for (let remaining = 3; remaining >= 0; remaining -= 1) {
      const multiplication = (await question.innerText()).trim().match(/^(\d+) × (\d+) = \?$/);
      expect(multiplication).not.toBeNull();
      const product = Number(multiplication[1]) * Number(multiplication[2]);
      await expect(mineAnswers).toHaveCount(4);
      const correctProduct = page.locator('.answer-choice-surface').getByRole('button', { name: `Strike with ${product}`, exact: true });
      const previousRockSource = await rock.getAttribute('src');
      await correctProduct.click();
      await expect(correctProduct).toHaveClass(/ui-button-success/);
      await expect(rock).toHaveAttribute('data-rock-health', String(remaining));
      if (remaining > 0) {
        await expect(rock).not.toHaveAttribute('src', previousRockSource);
        await page.waitForTimeout(380);
        await expect(question).toBeVisible();
      }
    }
    await expect(page.getByText('Practice Complete', { exact: true })).toBeVisible();

    question = await startMission(routes.time_keeper_cove);
    const targetTime = (await question.innerText()).trim().match(/^Set the clock to (\d{2}):(\d{2})\.$/);
    expect(targetTime).not.toBeNull();
    await expect(page.locator('[data-clock-playfield="true"]')).toBeVisible();
    for (let hour = 0; hour < Number(targetTime[1]) % 12; hour += 1) await page.getByRole('button', { name: 'Increase hour', exact: true }).click();
    for (let minute = 0; minute < Number(targetTime[2]) / 5; minute += 1) await page.getByRole('button', { name: 'Increase minutes', exact: true }).click();
    await page.getByRole('button', { name: 'RESTORE TIME', exact: true }).click();
    await expect(page.getByText('Time restored!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'RESET TIMEKEEPER', exact: false }).click();
    await expect(question).toHaveText(/^Set the clock to \d{2}:\d{2}\.$/);
    expect(errors).toEqual([]);
    reports.push({ profile: profile.name, passed: true, checks: ['mission after input/reset', 'suspect inspection/close', 'scaled fraction drag follows pointer', 'fraction drop and return', 'visible division expression and correct-answer advance', 'four multiplication choices and four-hit damage progression/results', 'visible clock target and correct-time/reset feedback'] });
    console.log(`${profile.name}: question and input checks passed`);
  } catch (error) {
    reports.push({ profile: profile.name, passed: false, error: error.stack, errors });
    await page.screenshot({ path: path.join(output, `${profile.name}-question-controls-failure.png`) });
    process.exitCode = 1;
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'question-controls.json'), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
