import { chromium, webkit, devices } from 'playwright';
import { expect } from '@playwright/test';
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
const reports = [];
for (const profile of profiles) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  await context.addInitScript(() => {
    Math.random = () => .2;
    const watched = new Set(['pointermove', 'pointerup', 'pointercancel', 'touchcancel', 'blur']);
    const handlers = new Map([...watched].map((type) => [type, new Set()]));
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = (type, listener, options) => {
      if (watched.has(type)) handlers.get(type).add(listener);
      return add(type, listener, options);
    };
    window.removeEventListener = (type, listener, options) => {
      if (watched.has(type)) handlers.get(type).delete(listener);
      return remove(type, listener, options);
    };
    window.__qaShareListeners = () => Object.fromEntries([...handlers].map(([type, list]) => [type, list.size]));
  });
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
    await page.goto(base + '/game/7/3');
    await page.locator('[data-share-stage]').waitFor();
    await page.waitForTimeout(1100);
    const intro = page.locator('[role="dialog"] [data-dialog-primary]');
    if (await intro.count()) await intro.first().click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const source = page.locator('[data-share-source]');
    const plates = page.locator('[data-testid^="share-splitter-plate-"]');
    const tap = async (locator) => profile.name === 'pc' ? locator.click() : locator.tap();
    const checkLayout = async () => {
      const issues = await page.evaluate(() => {
        const rect = (node) => node.getBoundingClientRect();
        const stage = rect(document.querySelector('[data-share-stage]'));
        const question = rect(document.querySelector('.game-question-card'));
        const dock = rect(document.querySelector('[data-testid="shared-bottom-hud"]'));
        const actions = rect(document.querySelector('[data-share-actions]'));
        const source = rect(document.querySelector('[data-share-source]'));
        const backdropNode = document.querySelector('.game-background-layer');
        const backdrop = rect(backdropNode);
        const scale = Math.max(backdrop.width / 2500, backdrop.height / 5000);
        const offsetX = (backdrop.width - 2500 * scale) / 2;
        const percentage = Number.parseFloat(getComputedStyle(backdropNode).backgroundPosition.split(' ')[1]) / 100;
        const offsetY = (backdrop.height - 5000 * scale) * percentage;
        // These painted tabletop bounds come from the visually reviewed 887×1774 image.
        const table = {
          left: backdrop.x + offsetX + 2500 * .08 * scale,
          right: backdrop.x + offsetX + 2500 * .92 * scale,
          top: backdrop.y + offsetY + 5000 * .397 * scale,
          bottom: backdrop.y + offsetY + 5000 * .633 * scale,
        };
        const issues = [];
        for (const plateNode of document.querySelectorAll('[data-testid^="share-splitter-plate-"]')) {
          const plate = rect(plateNode);
          const label = rect(plateNode.querySelector('.share-splitter-plate-ratio'));
          if (plate.left < table.left - 3 || plate.right > table.right + 3 || plate.top < table.top - 3 || plate.bottom > table.bottom + 3) issues.push(`${plateNode.dataset.testid}: off painted tabletop`);
          if (label.top < question.bottom - 1) issues.push(`${plateNode.dataset.testid}: overlaps question`);
        }
        if (source.left < stage.left || source.right > stage.right || source.bottom > actions.top) issues.push('source outside clear playfield');
        const hit = document.elementFromPoint(source.x + source.width / 2, source.y + source.height / 2);
        if (!document.querySelector('[data-share-source]').contains(hit)) issues.push('source cannot receive pointer');
        if (actions.left < stage.left - 1 || actions.right > stage.right + 1 || actions.bottom > dock.top + 1) issues.push('actions outside gameplay');
        return issues;
      });
      expect(issues).toEqual([]);
      await expect(plates).toHaveCount(5);
      expect(await source.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    };
    const dragToPlate = async (index) => {
      const start = await source.boundingBox();
      const target = await plates.nth(index).boundingBox();
      const before = Number(await source.getAttribute('data-remaining-slices'));
      const count = Number(await plates.nth(index).getAttribute('data-slice-count'));
      await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
      await page.mouse.down();
      await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
      await page.mouse.up();
      await expect(source).toHaveAttribute('data-remaining-slices', String(before - 1));
      await expect(plates.nth(index)).toHaveAttribute('data-slice-count', String(count + 1));
    };
    const tapToPlate = async (index) => {
      const before = Number(await source.getAttribute('data-remaining-slices'));
      const count = Number(await plates.nth(index).getAttribute('data-slice-count'));
      await tap(plates.nth(index));
      await expect(source).toHaveAttribute('data-remaining-slices', String(before - 1));
      await expect(plates.nth(index)).toHaveAttribute('data-slice-count', String(count + 1));
    };
    await checkLayout();
    await page.screenshot({ path: path.join(output, `${profile.name}-sharing-ready.png`) });
    const initialTotal = Number(await source.getAttribute('data-remaining-slices'));
    await dragToPlate(0);
    await dragToPlate(1);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal));
    for (const plate of await plates.all()) await expect(plate).toHaveAttribute('data-slice-count', '0');

    // Native touch cancellation must restore the inventory and detach drag listeners.
    const listenerBaseline = await page.evaluate(() => window.__qaShareListeners());
    const start = await source.boundingBox();
    const target = await plates.first().boundingBox();
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
    await expect(page.locator('.share-splitter-drag')).toBeVisible();
    const draggingListeners = await page.evaluate(() => window.__qaShareListeners());
    for (const type of Object.keys(listenerBaseline)) expect(draggingListeners[type]).toBe(listenerBaseline[type] + 1);
    await page.evaluate(() => window.dispatchEvent(new Event('touchcancel')));
    await page.mouse.up();
    await expect(page.locator('.share-splitter-drag')).toHaveCount(0);
    expect(await page.evaluate(() => window.__qaShareListeners())).toEqual(listenerBaseline);
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal));
    await expect(plates.first()).toHaveAttribute('data-slice-count', '0');
    await page.waitForTimeout(180);

    // Source selection and focusable plates provide the same allocation using a keyboard.
    await source.focus();
    await source.press('Enter');
    await expect(source).toHaveAttribute('aria-pressed', 'true');
    await expect(plates.first()).toBeFocused();
    await plates.first().press('Enter');
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal - 1));
    await expect(plates.first()).toHaveAttribute('data-slice-count', '1');
    await plates.nth(1).focus();
    await plates.nth(1).press('Space');
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal - 2));
    await page.getByRole('button', { name: 'Reset', exact: true }).click();

    // A failed Check is emitted once until the allocation changes, and remains retryable.
    await tap(source);
    await tapToPlate(0);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Share every slice');
    await page.getByRole('button', { name: 'Check', exact: true }).evaluate((button) => button.click());
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal - 1));
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(source).toHaveAttribute('data-remaining-slices', String(initialTotal));

    for (let round = 0; round < 5; round++) {
      const total = Number(await source.getAttribute('data-remaining-slices'));
      const ratios = await plates.evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.shareRatio)));
      const parts = ratios.reduce((sum, ratio) => sum + ratio, 0);
      const unit = total / parts;
      expect(Number.isInteger(unit)).toBe(true);
      await checkLayout();
      if (round > 0) await tap(source);
      for (const [index, ratio] of ratios.entries()) {
        for (let slice = 0; slice < ratio * unit; slice++) {
          if (round === 0) await dragToPlate(index);
          else await tapToPlate(index);
        }
      }
      await expect(source).toHaveAttribute('data-remaining-slices', '0');
      if (round === 0) await page.screenshot({ path: path.join(output, `${profile.name}-sharing-allocated.png`) });
      await page.getByRole('button', { name: 'Check', exact: true }).click();
      if (round < 4) {
        await expect.poll(async () => Number(await source.getAttribute('data-remaining-slices'))).toBeGreaterThan(0);
        for (const plate of await plates.all()) await expect(plate).toHaveAttribute('data-slice-count', '0');
        if (round >= 1) await expect(page.locator('.legend-hud-streak')).toContainText(`${round + 1} in a row`);
      } else await expect(page.getByRole('dialog', { name: 'Mission results' })).toBeVisible();
    }
    expect(errors).toEqual([]);
    console.log(`${profile.name}: painted table fit, visible source, drag/drop + cancellation/listener cleanup, keyboard/tap allocation, incorrect retry, reset, exact shared streak, all five sharing rounds and completion passed`);
    reports.push({ profile: profile.name, passed: true });
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${profile.name}-sharing-failure.png`) });
    console.error(`${profile.name}: ${error.stack}`);
    reports.push({ profile: profile.name, passed: false, error: error.message, pageErrors: errors });
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'sharing-interactions.json'), JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
