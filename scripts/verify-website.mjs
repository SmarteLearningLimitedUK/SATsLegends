import { chromium, webkit } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.env.LEGENDS_WEBSITE_QA_URL || 'http://localhost:3000';
const output = path.resolve('qa-artifacts/website');
await mkdir(output, { recursive: true });
const report = process.env.LEGENDS_WEBSITE_QA_PROFILE === 'media'
  ? JSON.parse(await readFile(path.join(output, 'report.json'), 'utf8')) : [];
const browser = await chromium.launch({ headless: true });
try {
  for (const profile of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 390, height: 844 },
  ].filter(profile => !process.env.LEGENDS_WEBSITE_QA_PROFILE || profile.name === process.env.LEGENDS_WEBSITE_QA_PROFILE)) {
    const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const results = { profile: profile.name, checks: [] };
    for (const route of ['/', '/revision', '/videos', '/signup', '/login']) {
      await page.goto(base + route);
      await expect(page.locator('main h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.locator('footer')).toBeInViewport();
      await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete));
      await page.evaluate(() => window.scrollTo(0, 0));
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, bodyPosition: getComputedStyle(document.body).position, rootOverflow: getComputedStyle(document.getElementById('root')).overflow }));
      expect(layout.scroll, `${route} horizontal overflow`).toBeLessThanOrEqual(layout.width);
      expect(layout.bodyPosition).toBe('static');
      expect(layout.rootOverflow).toBe('visible');
      await page.screenshot({ path: path.join(output, `${profile.name}-${route === '/' ? 'home' : route.slice(1)}.png`), fullPage: true });
      expect(await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src))).toEqual([]);
      results.checks.push(`${route}: renders, scrolls, images load, no horizontal overflow`);
    }
    await page.goto(base + '/');
    if (profile.width <= 800) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.locator('#website-mobile-nav').getByRole('link', { name: 'Revision guide' }).click();
      await expect(page).toHaveURL(base + '/revision');
      await expect(page.locator('#website-mobile-nav')).toHaveCount(0);
      results.checks.push('Mobile navigation opens and closes after navigation');
    }
    await page.goto(base + '/revision');
    await page.getByRole('button', { name: 'Fractions', exact: true }).click();
    await expect(page.locator('.website-topic')).toHaveCount(1);
    await page.locator('.website-topic-toggle').click();
    await page.getByRole('button', { name: '20%', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Give it another go.');
    await page.getByRole('button', { name: '40%', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('You’ve got it!');
    await page.getByRole('button', { name: 'All topics', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search revision topics' }).fill('no-such-topic');
    await expect(page.getByRole('heading', { name: 'No topics found' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.locator('.website-topic')).toHaveCount(6);
    results.checks.push('Revision filter, search, empty state, incorrect recovery and correct feedback');

    await page.goto(base + '/videos/');
    for (const title of ['Place value, unlocked', 'One fraction. Three ways.', 'Find the missing angle']) {
      await page.getByRole('button', { name: `Watch ${title}`, exact: true }).click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await page.waitForFunction(() => { const video = document.querySelector('video'); return video && video.readyState >= 2 && video.currentTime > 0.1; });
      const media = await page.locator('video').evaluate(video => ({ error: video.error?.message, duration: video.duration, captions: video.textTracks.length, captionState: video.querySelector('track').readyState }));
      expect(media.error).toBeFalsy();
      expect(media.duration).toBeGreaterThan(30);
      expect(media.duration).toBeLessThan(34);
      expect(media.captions).toBe(1);
      expect(media.captionState).toBe(2);
      await page.locator('video').evaluate(video => { video.pause(); video.currentTime = 18; });
      await page.waitForFunction(() => !document.querySelector('video').seeking);
      expect(await page.locator('video').evaluate(video => video.currentTime)).toBeCloseTo(18, 1);
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog')).toHaveCount(0);
    }
    results.checks.push('All three video files play, seek, load captions and close with Escape');
    await page.getByRole('button', { name: 'Fractions', exact: true }).click();
    await expect(page.locator('.website-video-card')).toHaveCount(1);
    await page.getByRole('link', { name: 'Read the guide', exact: true }).click();
    await expect(page.locator('#guide-fractions')).toBeVisible();
    results.checks.push('Video filtering and matching revision guide deep link');

    await page.goto(base + '/signup');
    await expect(page.getByRole('textbox', { name: 'Parent email address' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create parent account' })).toBeDisabled();
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(storage).not.toContain('DemoOnly123');
    expect(storage).not.toContain('demo@example.com');
    await page.goto(base + '/login');
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeDisabled();
    results.checks.push('Parent sign up/log in honestly disabled until configured; password visibility toggle works');

    await page.goto(base + '/');
    await page.getByRole('link', { name: 'Let’s play', exact: true }).click();
    await expect(page).toHaveURL(base + '/play');
    await expect(page.locator('[data-qa-screen="splash"]')).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/legends-website-body/);
    await page.getByRole('link', { name: 'Return to SATs Legends website' }).click();
    await expect(page).toHaveURL(base + '/');
    await expect(page.locator('main h1')).toBeVisible();
    await page.goto(base + '/map');
    await expect(page.locator('[data-qa-screen="world_map"]')).toBeVisible();
    await page.getByRole('link', { name: 'Return to SATs Legends website' }).click();
    results.checks.push('Website → existing game splash/map → website; game viewport restored');
    expect(errors, `${profile.name} runtime errors`).toEqual([]);
    results.checks.push('No browser runtime errors');
    report.push(results);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}

// Test the portable MP4 files in Chromium and WebKit, including seeking and captions.
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const mediaBrowser = await engine.launch();
  try {
    const page = await mediaBrowser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(base + '/videos');
    for (const title of ['Place value, unlocked', 'One fraction. Three ways.', 'Find the missing angle']) {
      await page.getByRole('button', { name: `Watch ${title}`, exact: true }).click();
      await page.waitForFunction(() => { const video = document.querySelector('video'); return video && (video.error || video.readyState >= 2); });
      expect(await page.locator('video').evaluate(video => video.error?.message)).toBeFalsy();
      await page.locator('video').evaluate(video => video.play());
      await page.waitForFunction(() => document.querySelector('video').currentTime > .1);
      expect(await page.locator('video').evaluate(video => video.currentSrc)).toContain('.mp4');
      await page.locator('video').evaluate(video => { video.pause(); video.currentTime = 18; });
      await page.waitForFunction(() => !document.querySelector('video').seeking);
      expect(await page.locator('video').evaluate(video => video.currentTime)).toBeCloseTo(18, 1);
      await page.locator('video').evaluate(video => { video.textTracks[0].mode = 'showing'; });
      await page.waitForFunction(() => document.querySelector('video track').readyState === 2);
      expect(await page.locator('video').evaluate(video => video.querySelector('track').readyState)).toBe(2);
      await page.screenshot({ path: path.join(output, `${name}-${title.toLowerCase().replace(/[^a-z]/g, '-')}.png`) });
      await page.getByRole('button', { name: 'Close video' }).click();
    }
    report.push({ profile: `${name}-phone-media`, checks: ['All three MP4 lessons decode, play, seek, and load English captions'] });
  } finally {
    await mediaBrowser.close();
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
}
console.log(JSON.stringify(report, null, 2));
