import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';
const testingLink = process.env.LEGEND_ENGLISH_TESTING === 'true';
const fixtureApi = process.env.LEGEND_QA_API_URL || 'https://family-qa.supabase.co';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/english`);
    await page.getByRole('heading', { level: 1, name: /Lexcoria/i }).waitFor();
    assert.match(await page.locator('main').innerText(), testingLink ? /gated playtest/i : /not available to play or purchase yet/i);
    assert.equal(await page.locator('main a[href="/english/play/"]').count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Log in to play Lexcoria' }).count(), testingLink ? 1 : 0);
    if (testingLink) assert.equal(await page.getByRole('link', { name: 'Log in to play Lexcoria' }).getAttribute('href'), '/login?next=/parent');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= width + 1, `Lexcoria overflows the ${width}px viewport by ${scrollWidth - width}px`);

    const gameResponse = await page.goto(`${base}/english/play/`);
    if (testingLink) {
      assert.match(await gameResponse.text(), /\/english\/play\/assets\//);
      await page.getByRole('heading', { level: 1, name: 'Parent login needed' }).waitFor();
    } else {
      await page.waitForURL(`${base}/english`);
      await page.getByRole('heading', { level: 1, name: /Lexcoria/i }).waitFor();
    }

    await page.goto(`${base}/subscriptions?product=english`);
    assert.match(await page.locator('main').innerText(), /English and combined plans are not on sale yet/i);
    assert.equal(await page.getByRole('heading', { name: /Matharia (monthly|yearly)/i }).count(), 2);
    assert.equal(await page.getByRole('heading', { name: /Lexcoria (monthly|yearly)/i }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${width}px: Lexcoria ${testingLink ? 'gated test route' : 'coming-soon route'}, unavailable checkout and no horizontal overflow`);
  }
  if (testingLink) {
    // The combined QA artifact uses this in-memory service; no real accounts are created.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const parentId = '10000000-0000-4000-8000-000000000001';
    const childId = '20000000-0000-4000-8000-000000000001';
    const user = { id: parentId, email: 'parent@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} };
    const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: parentId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
    let entitled = true;
    let verifiedEnglish = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(`${fixtureApi}/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
      const reply = data => route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(data) });
      if (request.method() === 'OPTIONS') return reply({});
      if (url.pathname.endsWith('/token')) return reply({ user, access_token: token, refresh_token: 'fixture_refresh', expires_in: 3600, token_type: 'bearer' });
      if (url.pathname.endsWith('/user')) return reply(user);
      if (url.pathname.endsWith('/child_profiles')) return reply([{ id: childId, parent_id: parentId, nickname: 'EnglishLegend' }]);
      if ((url.pathname.endsWith('/subscriptions') || url.pathname.endsWith('/rpc/account_subscriptions'))) return reply([]);
      if (url.pathname.endsWith('/complimentary_access')) return reply(entitled ? [{ product_code: 'english', valid_until: new Date(Date.now() + 86400000).toISOString(), revoked_at: null }] : []);
      if (url.pathname.endsWith('/parent_settings')) return reply({ report_emails: false, next_report_at: null });
      if (url.pathname.endsWith('/rpc/is_staff')) return reply(false);
      if (url.pathname.endsWith('/rpc/has_game_access')) {
        assert.equal(request.postDataJSON().product, 'english');
        verifiedEnglish++;
        return reply(entitled);
      }
      if (url.pathname.endsWith('/child_progress')) return reply(null);
      if (url.pathname.endsWith('/rpc/save_child_progress')) {
        const save = request.postDataJSON();
        assert.equal(save.game_code, 'english');
        return reply(save.expected_revision + 1);
      }
      if (url.pathname.endsWith('/account_deletion_requests')) return reply(null);
      throw new Error(`Unexpected Lexcoria fixture request: ${url.pathname}`);
    });
    await page.goto(`${base}/english`);
    await page.getByRole('link', { name: 'Log in to play Lexcoria' }).click();
    await page.getByLabel('Parent email address').fill(user.email);
    await page.locator('input[name=password]').fill('FixturePassword123');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await page.getByRole('link', { name: 'Play Lexcoria', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Play Lexcoria', exact: true }).getAttribute('href'), '/english/play/');
    await page.getByRole('link', { name: 'Play Lexcoria', exact: true }).click();
    await page.waitForURL(`${base}/english/play/`, { waitUntil: 'networkidle' });
    await expect.poll(() => verifiedEnglish).toBeGreaterThan(0);
    try { await page.locator('.english-access-gate').waitFor({ state: 'hidden', timeout: 20000 }); } catch (error) { console.error('Lexcoria entry state:', await page.locator('body').innerText(), errors); throw error; }
    assert.ok(verifiedEnglish > 0, 'English game must verify access with the server');
    assert.equal(await page.evaluate(id => sessionStorage.getItem(`legends-child:${id}`), parentId), childId);
    await page.goto(`${base}/english`);
    await page.getByRole('link', { name: 'Play Lexcoria', exact: true }).waitFor();
    entitled = false;
    await page.reload();
    await page.getByRole('link', { name: 'Check Lexcoria access' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Play Lexcoria', exact: true }).count(), 0);
    await page.goto(`${base}/english/play/`);
    await page.getByRole('heading', { name: 'Choose your English adventure' }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS shared parent login, selected-child Lexcoria entry and server denial without English access');
  }
} finally {
  await browser.close();
}
