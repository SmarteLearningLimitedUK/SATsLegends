import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.FAMILY_QA_URL || 'http://127.0.0.1:3000';
await mkdir('qa-artifacts/family', { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [1440, 1251, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/for-parents', '/subscriptions', '/signup', '/login', '/forgot-password', '/reset-password', '/parent']) {
      await page.goto(base + route);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (route === '/subscriptions') {
        await expect(page.getByText('£4.99', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('£49.99', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('These subscriptions cover Matharia only.', { exact: false })).toBeVisible();
        await expect(page.getByText('PayPal will be offered when account activation is complete.', { exact: false })).toBeVisible();
      }
      if (route === '/for-parents') {
        await expect(page.getByRole('heading', { name: 'Big adventures. Small steps to SATs.' })).toBeVisible();
        await expect(page.locator('tbody tr')).toHaveCount(6);
        for (const name of ['Peaceful Pond', 'Lantern Camp', 'Star Path', 'Leaf Drift', 'Worry Balloon', 'Bubble Breath']) {
          await page.getByRole('button', { name, exact: true }).click();
          await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
          await expect(page.getByAltText(`${name} artwork from Matharia’s Calm Grove`)).toBeVisible();
          await expect.poll(() => page.getByAltText(`${name} artwork from Matharia’s Calm Grove`).evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
        }
        await expect(page.getByRole('link', { name: 'NHS advice on supporting children through exam stress' })).toHaveAttribute('href', /^https:\/\/www.nhs.uk\//);
        await expect(page.getByText('Sundays at 3 pm', { exact: true })).toBeVisible();
        await expect(page.getByText('Wednesdays at 4 pm', { exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Fractions', exact: false }).click();
        await expect(page.locator('#guide-fractions')).toBeVisible();
        await page.goto(base + route);
        await expect(page.getByRole('heading', { name: 'Big adventures. Small steps to SATs.' })).toBeVisible();
      }
      if (route === '/signup') {
        await expect(page.getByRole('button', { name: 'Create parent account' })).toBeDisabled();
        await expect(page.getByText('Sundays at 3 pm and Wednesdays at 4 pm', { exact: false })).toBeVisible();
      }
      await page.screenshot({ path: `qa-artifacts/family/${width}-${route.slice(1)}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
    console.log(`PASS ${width}px: parent information, six calm activities, revision links, account/subscription routes and layout`);
    await context.close();
  }
} finally { await browser.close(); }
