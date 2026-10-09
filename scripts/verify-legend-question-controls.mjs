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
      const keys = ['take_out_rush', 'fraction_forge', 'simplify_sprint', 'conversion_canyon', 'data_detective', 'remainder_run', 'multiplication_mine', 'time_keeper_cove'];
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
    await expect(page.locator('[data-forge-target]')).toBeVisible();
    const ingredients = page.locator('button[data-forge-ingredient]');
    const slots = page.locator('button[data-forge-slot]');
    const strike = page.locator('button[data-forge-strike]');
    await expect(ingredients).toHaveCount(4);
    await expect(slots).toHaveCount(2);
    const emptySlotText = (await slots.first().innerText()).trim();
    await ingredients.first().click();
    await expect.poll(async () => (await slots.first().innerText()).trim()).not.toBe(emptySlotText);
    await slots.first().click();
    await expect.poll(async () => (await slots.first().innerText()).trim()).toBe(emptySlotText);
    for (let index = 0; index < await slots.count(); index += 1) {
      const before = (await slots.nth(index).innerText()).trim();
      await page.locator('button[data-forge-ingredient]:visible:not([disabled]):not([aria-disabled="true"])').first().click();
      await expect.poll(async () => (await slots.nth(index).innerText()).trim()).not.toBe(before);
    }
    await expect(strike).toBeEnabled();
    await strike.click();
    await expect(page.locator('[data-forge-feedback]')).toHaveAttribute('data-tone', /^(success|error)$/);
    await expect(question).toBeVisible();

    question = await startMission(routes.simplify_sprint);
    const sprint = page.locator('[data-simplify-sprint]');
    const fraction = page.locator('[data-sprint-fraction]');
    const gates = page.locator('button[data-sprint-gate]');
    const sprintProgress = page.locator('[data-sprint-progress]');
    await expect(sprint).toHaveAttribute('data-phase', /^(idle|dash|burst|crash|checkpoint)$/);
    await expect(fraction).toBeVisible();
    await expect(gates).toHaveCount(3);
    await expect(sprintProgress).toBeVisible();
    const sprintLayout = await page.evaluate(() => {
      const box = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const questionBox = box(document.querySelector('[data-game-question]'));
      const sceneBox = box(document.querySelector('[data-sprint-scene]'));
      const fractionBox = box(document.querySelector('[data-sprint-fraction]'));
      const gateBoxes = [...document.querySelectorAll('button[data-sprint-gate]')].map((button) => {
        const rect = box(button);
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { ...rect, reachable: hit === button || button.contains(hit) };
      });
      return {
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
        scrollWidth: document.documentElement.scrollWidth,
        questionBox, sceneBox, fractionBox, gateBoxes,
      };
    });
    expect(sprintLayout.scrollWidth).toBeLessThanOrEqual(sprintLayout.viewportWidth + 1);
    expect(sprintLayout.questionBox.bottom).toBeLessThanOrEqual(sprintLayout.sceneBox.top + 2);
    expect(sprintLayout.fractionBox.top).toBeGreaterThanOrEqual(sprintLayout.sceneBox.top - 2);
    expect(sprintLayout.fractionBox.bottom).toBeLessThanOrEqual(sprintLayout.sceneBox.bottom + 2);
    for (const gate of sprintLayout.gateBoxes) {
      expect(gate.width).toBeGreaterThan(40);
      expect(gate.height).toBeGreaterThan(40);
      expect(gate.left).toBeGreaterThanOrEqual(-1);
      expect(gate.right).toBeLessThanOrEqual(sprintLayout.viewportWidth + 1);
      expect(gate.top).toBeGreaterThan(sprintLayout.questionBox.bottom);
      expect(gate.bottom).toBeLessThanOrEqual(sprintLayout.viewportHeight + 1);
      expect(gate.reachable).toBe(true);
    }
    const initialNumerator = Number(await fraction.getAttribute('data-numerator'));
    const initialDenominator = Number(await fraction.getAttribute('data-denominator'));
    expect(initialNumerator).toBeGreaterThan(0);
    expect(initialDenominator).toBeGreaterThan(0);
    const factors = await gates.evaluateAll((buttons) => buttons.map((button) => Number(button.getAttribute('data-sprint-gate'))));
    expect(new Set(factors).size).toBe(3);
    const wrongGate = factors.findIndex((factor) => initialNumerator % factor !== 0 || initialDenominator % factor !== 0);
    const safeGate = factors.findIndex((factor) => initialNumerator % factor === 0 && initialDenominator % factor === 0);
    expect(wrongGate).toBeGreaterThanOrEqual(0);
    expect(safeGate).toBeGreaterThanOrEqual(0);
    await gates.nth(wrongGate).click();
    await expect(page.locator('[data-sprint-feedback]')).toBeVisible();
    await expect(fraction).toHaveAttribute('data-numerator', String(initialNumerator));
    await expect(fraction).toHaveAttribute('data-denominator', String(initialDenominator));
    const clearedBefore = Number(await sprintProgress.getAttribute('data-cleared'));
    await gates.nth(safeGate).click();
    const reducedBy = factors[safeGate];
    await expect.poll(async () => {
      const top = await fraction.getAttribute('data-numerator');
      const bottom = await fraction.getAttribute('data-denominator');
      return `${top}/${bottom}`;
    }, { timeout: 4000, intervals: [50, 100] }).toBe(`${initialNumerator / reducedBy}/${initialDenominator / reducedBy}`);
    await expect.poll(async () => Number(await sprintProgress.getAttribute('data-cleared'))).toBeGreaterThan(clearedBefore);
    await expect(question).toBeVisible();

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
    reports.push({ profile: profile.name, passed: true, checks: ['mission after input/reset', 'suspect inspection/close', 'fraction ingredient placement/removal and Strike', 'Sprint gate risk/reduction and unobstructed controls', 'visible division expression and correct-answer advance', 'four multiplication choices and four-hit damage progression/results', 'visible clock target and correct-time/reset feedback'] });
    console.log(`${profile.name}: question and input checks passed`);
  } catch (error) {
    reports.push({ profile: profile.name, passed: false, error: error.stack, errors });
    await page.screenshot({ path: path.join(output, `${profile.name}-question-controls-failure.png`) });
    process.exitCode = 1;
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'question-controls.json'), JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
