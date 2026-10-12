import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/profile`);
      await page.getByRole('link', { name: 'Sound & music settings' }).click();
      await page.waitForURL('**/settings');
      const sound = page.getByRole('button', { name: 'Sound effects' });
      const music = page.getByRole('button', { name: 'Background music' });
      assert.equal(await sound.getAttribute('aria-pressed'), 'true');
      assert.equal(await music.getAttribute('aria-pressed'), 'false');
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        toggles: [...document.querySelectorAll('.adventure-settings-option')].map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      }));
      assert.ok(layout.overflow <= 1, `Settings overflows at ${viewport.width}px`);
      assert.equal(layout.toggles.length, 2);
      assert.ok(layout.toggles.every(({ width, height }) => width >= 44 && height >= 44));

      await sound.click();
      assert.equal(await sound.getAttribute('aria-pressed'), 'false');
      assert.equal(await page.evaluate(() => localStorage.getItem('sats_mastery_muted')), 'true');
      await page.getByRole('button', { name: 'Unmute audio' }).waitFor();
      await music.click();
      assert.equal(await music.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.evaluate(() => localStorage.getItem('sats_mastery_music_enabled')), 'true');
      await page.getByRole('button', { name: 'Turn music off' }).waitFor();
      await page.reload();
      assert.equal(await page.getByRole('button', { name: 'Sound effects' }).getAttribute('aria-pressed'), 'false');
      assert.equal(await page.getByRole('button', { name: 'Background music' }).getAttribute('aria-pressed'), 'true');

      await page.goto(`${base}/results`);
      await page.waitForURL('**/profile');
      await page.getByRole('heading', { name: 'Explorer' }).waitFor();
      console.log(`PASS settings/results ${viewport.width}×${viewport.height}: usable, persisted, dock-synced`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
