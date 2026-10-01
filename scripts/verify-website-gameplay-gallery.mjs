import { chromium, webkit } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.LEGENDS_WEBSITE_QA_URL || 'http://127.0.0.1:3000';
const games = ['Place Value Panic', 'Match Mastery', 'Angle Arena', 'Potion Panic'];
await mkdir('qa-artifacts/website-gameplay', { recursive: true });
for (const profile of [
  { name: 'desktop', engine: chromium, width: 1440, height: 900 },
  { name: 'tablet', engine: chromium, width: 768, height: 1024 },
  { name: 'phone', engine: chromium, width: 390, height: 844 },
  { name: 'small-phone', engine: chromium, width: 320, height: 750 },
  { name: 'webkit-phone', engine: webkit, width: 390, height: 844 },
]) {
  const browser = await profile.engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/for-parents']) {
      await page.goto(base + route);
      const gallery = page.getByRole('region', { name: 'Real challenges. Brilliant little adventures.' });
      await expect(gallery).toBeVisible();
      await expect(gallery.locator('figure')).toHaveCount(4);
      for (const [index, name] of games.entries()) {
        const button = gallery.getByRole('button', { name: `Enlarge ${name} screenshot` });
        await button.scrollIntoViewIfNeeded();
        await expect.poll(() => button.locator('img').evaluate(image => image.naturalWidth)).toBe(780);
        const originalOverflow = await page.evaluate(() => document.body.style.overflow);
        await button.click();
        const viewer = page.getByRole('dialog', { name });
        await expect(viewer).toBeVisible();
        await expect(viewer.getByRole('heading', { name, exact: true })).toBeVisible();
        await expect(viewer.locator('img')).toBeVisible();
        await expect(viewer.getByRole('button', { name: 'Close screenshot' })).toBeFocused();
        const picture = await viewer.locator('img').boundingBox();
        expect(picture.x).toBeGreaterThanOrEqual(0);
        expect(picture.x + picture.width).toBeLessThanOrEqual(profile.width);
        if (route === '/for-parents' && index === 0) await page.screenshot({ path: `qa-artifacts/website-gameplay/${profile.name}-viewer.png` });
        if (index % 2) await viewer.getByRole('button', { name: 'Close screenshot' }).click();
        else await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(button).toBeFocused();
        await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(originalOverflow);
      }
      // Inspect the whole section after returning the strip to its first photo.
      await gallery.locator('ul').evaluate(list => { list.scrollLeft = 0; });
      await gallery.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(profile.width);
      await gallery.screenshot({ path: `qa-artifacts/website-gameplay/${profile.name}-${route === '/' ? 'home' : 'parents'}.png` });
    }
    expect(errors).toEqual([]);
    console.log(`PASS ${profile.name}: four real screenshots on home/parents, full-size viewers, Escape/close, focus and responsive layout`);
  } finally { await browser.close(); }
}
