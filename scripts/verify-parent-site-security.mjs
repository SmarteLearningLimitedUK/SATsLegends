// Enforce host security-header parity in a browser against the compiled site.
// This checks browser behavior; the live host must separately verify its headers.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
const base = process.env.FAMILY_QA_URL || 'http://127.0.0.1:4173';
const apache = await readFile('public/.htaccess', 'utf8');
const nginx = await readFile('hosting/nginx.conf.example', 'utf8');
const cloudflare = await readFile('public/_headers', 'utf8');
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const headers = Object.fromEntries([...apache.matchAll(/Header always set ([\w-]+) "([^"]+)"/g)].map(match => [match[1].toLowerCase(), match[2]]));
const cloudflareHeaders = Object.fromEntries([...cloudflare.matchAll(/^\s{2}([\w-]+):\s*(.+)$/gm)].map(match => [match[1].toLowerCase(), match[2]]));
const vercelHeaders = Object.fromEntries((vercel.headers?.find(rule => rule.source === '/(.*)')?.headers ?? [])
  .map(header => [header.key.toLowerCase(), header.value]));
for (const [name, value] of Object.entries(headers)) {
  assert.ok(nginx.toLowerCase().includes(`add_header ${name} "${value.toLowerCase()}" always;`), `${name} must match in both host configurations`);
  assert.equal(cloudflareHeaders[name], value, `${name} must match the Cloudflare Pages policy`);
  assert.equal(vercelHeaders[name], value, `${name} must match the Vercel policy`);
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.policyViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.policyViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI }));
  });
  await page.route(base + '/**', async route => {
    if (!route.request().isNavigationRequest()) return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  for (const route of ['/for-parents', '/subscriptions', '/revision?topic=fractions', '/videos', '/play']) {
    await page.goto(base + route);
    await page.waitForTimeout(800);
    assert.deepEqual(await page.evaluate(() => window.policyViolations), [], `CSP must allow ${route}`);
    assert.deepEqual(errors, []);
  }
  await page.goto(base + '/for-parents');
  await expect(page.getByRole('heading', { name: 'Big adventures. Small steps to SATs.' })).toBeVisible();
  await page.evaluate(() => {
    const inline = document.createElement('script');
    inline.textContent = 'window.unwantedInlineScriptRan = true';
    document.body.append(inline);
  });
  await expect.poll(() => page.evaluate(() => window.policyViolations.length)).toBeGreaterThan(0);
  assert.equal(await page.evaluate(() => window.unwantedInlineScriptRan), undefined);
  assert.ok((await page.evaluate(() => window.policyViolations)).some(event => event.blocked === 'inline'));
  console.log('PASS Apache, Nginx, Cloudflare and Vercel policies match; compiled routes load under CSP and injected inline script is blocked');
} finally { await browser.close(); }
