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
const reports = [];
for (const profile of profiles) {
  const browser = await profile.browser.launch();
  const context = await browser.newContext(profile.options);
  if (profile.name !== 'pc') await context.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForSelector('[data-qa-root]');
    const route = await page.evaluate(async () => {
      const { ISLANDS } = await import('/src/constants.ts');
      const island = ISLANDS.find((entry) => entry.levels.some((level) => level.blueprintKey === 'scale_builder'));
      const level = island.levels.find((entry) => entry.blueprintKey === 'scale_builder');
      return `/game/${island.id}/${level.id}`;
    });
    await page.goto('about:blank');
    await page.goto(base + route);
    await page.locator('[role="dialog"] [data-dialog-primary]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const blueprint = page.locator('[data-scale-blueprint]');
    const click = async (name, times = 1) => {
      for (let i = 0; i < times; i++) await page.getByRole('button', { name, exact: true }).click();
    };
    // Wrong answers are recoverable; every project can then be built through real controls.
    await click('Check Scale');
    await expect(page.getByText('Try again. Multiply both lengths by the scale factor.')).toBeVisible();
    const projects = [
      { base: [56, 36], size: [112, 72], scalar: ['+0.25', 4] },
      { base: [72, 48], size: [36, 24], scalar: ['-0.25', 2] },
      { base: [48, 32], size: [144, 96], scalar: ['+0.25', 8] },
      { base: [72, 54], size: [108, 81], dimensionSteps: 2 },
      { base: [72, 72], size: [90, 90], dimensionSteps: 1 },
    ];
    for (const [index, project] of projects.entries()) {
      await expect(blueprint).toContainText(`L ${project.base[0]}`);
      await expect(blueprint).toContainText(`W ${project.base[1]}`);
      if (project.scalar) await click(project.scalar[0], project.scalar[1]);
      else {
        await click('Length +0.25', project.dimensionSteps);
        await click('Width +0.25', project.dimensionSteps);
      }
      await expect(blueprint).toContainText(`L ${project.size[0]}`);
      await expect(blueprint).toContainText(`W ${project.size[1]}`);
      const bounds = await blueprint.boundingBox();
      const question = await page.locator('.game-question-card').boundingBox();
      const controls = await page.locator('[data-scale-controls]').boundingBox();
      expect(bounds.y).toBeGreaterThanOrEqual(question.y + question.height - 2);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(controls.y + 2);
      if (index === 3) await page.screenshot({ path: path.join(output, `${profile.name}-scale-dimensions.png`) });
      await click('Check Scale');
      await expect(page.getByText(`Blueprint restored! ${project.size[0]} × ${project.size[1]} units.`)).toBeVisible();
      await click('Next project');
    }
    await expect(page.getByRole('heading', { name: 'Island Restored' })).toBeVisible();
    await expect(page.locator('.legend-hud-streak')).toContainText('5 in a row');
    await click('Continue');
    await expect(page.getByRole('dialog', { name: 'Mission results' })).toBeVisible();
    expect(errors).toEqual([]);
    console.log(`${profile.name}: all five blueprints, dimension controls, scale resets, feedback, layout and completion passed`);
    reports.push({ profile: profile.name, passed: true });
  } catch (error) {
    await page.screenshot({ path: path.join(output, `${profile.name}-scale-failure.png`) });
    console.error(`${profile.name}: ${error.stack}`);
    reports.push({ profile: profile.name, passed: false, error: error.message, pageErrors: errors });
  } finally { await context.close(); await browser.close(); }
}
await writeFile(path.join(output, 'scale-interactions.json'), JSON.stringify(reports, null, 2));
if (reports.some((report) => !report.passed)) process.exitCode = 1;
