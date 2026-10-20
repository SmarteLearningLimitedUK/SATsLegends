// Production-artifact checks. Billing responses are fixtures; no accounts or charges.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.WEBSITE_RELEASE_URL || 'http://127.0.0.1:4181';
const out = 'qa-artifacts/website-release';
const routes = ['/', '/for-parents', '/english', '/revision', '/videos', '/subscriptions', '/signup', '/login', '/forgot-password'];
const sizes = [[320, 568], [390, 844], [412, 915], [568, 320], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080]];
const results = [];
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width <= 1024 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://*.supabase.co/functions/v1/billing', route => route.fulfill({
      headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': '*' },
      contentType: 'application/json', body: JSON.stringify({ plans: [], paymentMethods: ['card'] }),
    }));
    for (const route of routes) {
      try {
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200, `Direct route returned ${response.status()}`);
        await page.locator('main h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          let node = document.querySelector('main h1');
          while (node) {
            if (Number(getComputedStyle(node).opacity) < 0.99) return false;
            node = node.parentElement;
          }
          return true;
        });
        const geometry = await page.evaluate(() => {
          const box = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
          const character = document.querySelector('.website-account-character');
          const copy = document.querySelector('.website-account-world > p:not(.website-eyebrow)');
          return {
            viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            heading: box(document.querySelector('main h1')),
            character: character && getComputedStyle(character).display !== 'none' ? box(character) : null,
            copy: copy ? box(copy) : null,
            fields: [...document.querySelectorAll('main input:not([type=checkbox])')].map(node => parseFloat(getComputedStyle(node).fontSize)),
          };
        });
        assert(geometry.scrollWidth <= geometry.viewport + 1, `Horizontal overflow: ${JSON.stringify(geometry)}`);
        assert(geometry.heading.left >= -1 && geometry.heading.right <= width + 1, 'Heading outside viewport');
        if (width <= 580) assert(geometry.fields.every(size => size >= 16), 'Small input text triggers iPhone zoom');
        if (geometry.character) assert(geometry.character.top >= geometry.copy.bottom + 16, 'Account character covers introductory text');
        if (route === '/') {
          const before = await page.evaluate(() => scrollY);
          await page.mouse.move(Math.min(width - 20, 200), Math.min(height - 20, 250));
          await page.mouse.wheel(0, 650);
          await page.waitForFunction(y => scrollY > y, before);
          await page.evaluate(() => scrollTo(0, 0));
        }
        if (route === '/for-parents') assert.match(await page.locator('main h1').innerText(), /Your window into progress/i);
        if (route === '/english') await page.getByRole('link', { name: 'Log in to play Lexcoria' }).waitFor();
        if (route === '/login' && width <= 768) {
          const recovery = await page.getByRole('link', { name: 'Forgot password?' }).boundingBox();
          const submit = await page.getByRole('button', { name: 'Log in', exact: true }).boundingBox();
          assert(recovery.height >= 44 && recovery.y >= submit.y + submit.height + 11, 'Password recovery needs a separate touch target');
          await page.getByRole('button', { name: 'Open navigation' }).click();
          const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
          await nav.getByRole('link', { name: 'Lexcoria', exact: true }).waitFor();
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Open navigation overflows');
          await page.keyboard.press('Escape');
          await expect(nav).toHaveCount(0);
          await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
          await page.getByRole('button', { name: 'Open navigation' }).click();
          await nav.getByRole('link', { name: 'Lexcoria', exact: true }).click();
          assert.equal(new URL(page.url()).pathname, '/english');
          await expect(nav).toHaveCount(0);
          await page.goto(base + route);
        }
        if ([390, 768, 1440].includes(width) && ['/', '/for-parents', '/login', '/english'].includes(route)) {
          await page.screenshot({ path: `${out}/${width}-${route.slice(1) || 'home'}.png` });
        }
        assert.deepEqual(errors, []);
        results.push({ width, height, route, passed: true });
      } catch (error) {
        results.push({ width, height, route, passed: false, error: error.message });
        console.error('FAIL', width, height, route, error.message);
        await page.screenshot({ path: `${out}/${width}-${route.slice(1) || 'home'}-error.png` }).catch(() => {});
      }
    }
    await page.goto(base + '/play');
    await page.waitForURL(/\/login\?/);
    await page.goto(base + '/english/play/');
    await page.getByRole('heading', { name: 'Parent login needed' }).waitFor();
    results.push({ width, height, route: 'both game authentication gates', passed: true });
    await context.close();
    console.log(`Checked ${width} × ${height}`);
  }
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
}
assert(results.every(row => row.passed), `${results.filter(row => !row.passed).length} website checks failed; see ${out}/results.json`);
console.log(`PASS ${results.length} production-artifact website checks (Chromium; not real-device certification).`);
