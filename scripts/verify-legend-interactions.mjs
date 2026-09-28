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
];
const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
const answerFor = async (page) => {
  const prompt = await page.locator('.game-question-copy').innerText();
  const phrase = prompt.match(/Rebuild ([^.]+)\./)?.[1];
  if (!phrase) throw new Error(`Unexpected question: ${prompt}`);
  const value = phrase.split(/[ -]+/).reduce((sum, word) => sum + (tens[word] ?? words.indexOf(word)), 0);
  return String(value).split('');
};
const startMission = async (page, route) => {
  await page.goto(base + route);
  await page.waitForSelector('[data-pvp-location="source"]');
  const intro = page.locator('[role="dialog"] [data-dialog-primary]');
  if (await intro.count()) await intro.click();
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);
};
const fillAnswer = async (page, digits, keyboard = false) => {
  for (const digit of digits) {
    const button = page.getByRole('button', { name: `Digit ${digit}`, exact: true }).first();
    if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); }
    else await button.click();
  }
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
};
const makeMistake = async (page) => {
  const answer = await answerFor(page);
  const available = await page.locator('[data-pvp-location="source"]').allTextContents();
  const wrongFirst = available.map((value) => value.trim()).find((value) => value !== answer[0]);
  const rest = [...available.map((value) => value.trim())];
  rest.splice(rest.indexOf(wrongFirst), 1);
  await fillAnswer(page, [wrongFirst, rest[0]]);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.waitForTimeout(650);
};

const reports = [];
for (const profile of profiles.filter((entry) => !process.env.LEGEND_QA_PROFILE || entry.name === process.env.LEGEND_QA_PROFILE)) {
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
  try {
    await startMission(page, '/game/1/1');
    // Instructions reopen without resetting the puzzle, support Escape, and restore focus.
    const before = await page.locator('[data-pvp-location="source"]').allTextContents();
    await page.getByRole('button', { name: 'How to play' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(page.getByRole('dialog')).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'How to play' })).toBeFocused();
    expect(await page.locator('[data-pvp-location="source"]').allTextContents()).toEqual(before);
    // Sound changes persist and the visible control follows the saved preference.
    await page.getByRole('button', { name: 'Mute audio', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Unmute audio', exact: true })).toBeVisible();
    await page.reload();
    await page.locator('[role="dialog"] [data-dialog-primary]').click();
    await expect(page.getByRole('button', { name: 'Unmute audio', exact: true })).toBeVisible();
    // Practice does not consume shell lives or end after repeated mistakes.
    for (let i = 0; i < 4; i++) await makeMistake(page);
    await expect(page.getByRole('dialog', { name: 'Mission results' })).toHaveCount(0);
    await expect(page.locator('.legend-hud-practice')).toBeVisible();
    // Keyboard can fill and remove a digit; dragging works against the rendered slots.
    let answer = await answerFor(page);
    const first = page.getByRole('button', { name: `Digit ${answer[0]}`, exact: true }).first();
    await first.focus(); await page.keyboard.press('Enter');
    const target = page.locator('[data-pvp-location="target"]').first();
    await expect(target).toContainText(answer[0]);
    await target.focus(); await page.keyboard.press('Enter');
    await expect(target).toHaveAttribute('aria-label', /empty/);
    const source = page.getByRole('button', { name: `Digit ${answer[0]}`, exact: true }).first();
    await expect(source).toHaveCSS('opacity', '1');
    const s = await source.boundingBox();
    const t = await target.boundingBox();
    await page.evaluate(({ s, t }) => {
      window.legendPointerTrace = { s, t, events: [] };
      for (const type of ['pointerdown', 'pointerup', 'pointercancel']) document.addEventListener(type, (event) => {
        window.legendPointerTrace.events.push({ type, x: event.clientX, y: event.clientY, target: event.target.outerHTML.slice(0, 350), button: event.target.closest('button')?.outerHTML.slice(0, 350) });
      });
    }, { s, t });
    await page.mouse.move(s.x + s.width/2, s.y + s.height/2);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.move(t.x + t.width/2, t.y + t.height/2, { steps: 10 });
    await page.waitForTimeout(80);
    await page.mouse.up();
    await expect(target).toContainText(answer[0]);
    await target.focus(); await page.keyboard.press('Enter');
    // Ten correct answers finish the actual practice puzzle; navigation is available immediately.
    for (let i = 0; i < 10; i++) {
      answer = await answerFor(page);
      await fillAnswer(page, answer, i === 0);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      if (i < 9) {
        await expect(page.locator('[data-pvp-location="target"]').first()).toHaveAttribute('aria-label', /empty/);
        if (i === 1) await expect(page.locator('.legend-hud-streak')).toContainText('2 in a row');
      }
    }
    const results = page.getByRole('dialog', { name: 'Mission results' });
    await expect(results).toBeVisible();
    await expect(results.getByRole('button', { name: 'Map', exact: true })).toHaveCount(1);
    await expect(results.getByRole('button', { name: 'Retry Practice' })).toBeVisible();
    await page.screenshot({ path: path.join(output, `${profile.name}-practice-results.png`) });
    // Scored play consumes exactly one life per wrong answer and Retry restores all three.
    const scoredRoute = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const island = ISLANDS.find((entry) => entry.levels.some((level) => level.blueprintKey === 'place_value_panic' && !level.isPractice));
      const level = island.levels.find((entry) => entry.blueprintKey === 'place_value_panic' && !entry.isPractice);
      return `/game/${island.id}/${level.id}`;
    });
    await startMission(page, scoredRoute);
    for (let i = 0; i < 3; i++) {
      await makeMistake(page);
      if (i < 2) await expect(page.getByRole('img', { name: `${2-i} of 3 lives remaining` })).toBeVisible();
    }
    await expect(page.getByRole('dialog', { name: 'Mission results' })).toBeVisible();
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('img', { name: '3 of 3 lives remaining' })).toBeVisible();
    expect(errors).toEqual([]);
    console.log(`${profile.name}: instructions, focus, sound, tap/keyboard/drag, practice, streak, completion, life loss and retry passed`);
    reports.push({ profile: profile.name, passed: true });
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${profile.name}-interaction-failure.png`) });
    console.error(`${profile.name}: ${error.stack}`);
    console.error(await page.evaluate(() => window.legendPointerTrace));
    reports.push({ profile: profile.name, passed: false, error: error.message, pageErrors: errors });
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'interactions.json'), JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
