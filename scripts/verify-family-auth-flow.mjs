// Browser integration using an in-memory API fixture. Never creates real accounts or charges cards.
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.env.FAMILY_AUTH_QA_URL || 'http://127.0.0.1:4180';
const parentId = '10000000-0000-4000-8000-000000000001';
const childId = '20000000-0000-4000-8000-000000000001';
const otherChildId = '20000000-0000-4000-8000-000000000002';
const user = { id: parentId, email: 'parent@example.com', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {} };
const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${jwtPart({ alg: 'HS256', typ: 'JWT' })}.${jwtPart({ sub: parentId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
const auth = { user, access_token: token, refresh_token: 'fixture_refresh', expires_in: 3600, token_type: 'bearer' };
let children = [];
let paid = false;
let reportEmails = true;
let failSave = true;
const saves = [];
const checkoutIntervals = [];
let progress = { child_id: childId, product_code: 'matharia', revision: 0, last_request_id: null,
  updated_at: new Date().toISOString(), player: { playerName: 'MathsLegend', avatarId: 'barratt', level: 3, xp: 70,
    telemetry: { sessionsPlayed: 4, correctAnswers: 8, incorrectAnswers: 2, totalPlayTimeSec: 240, topicStats: {}, gameStats: {} } },
  progression: { player: { avatarId: 'barratt', level: 3, currentXp: 70, totalXpEarned: 70 }, levels: {}, totalStars: 0 },
};
await mkdir('qa-artifacts/family', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://family-qa.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    const reply = (data, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
    if (request.method() === 'OPTIONS') return reply({});
    const body = request.postDataJSON();
    if (url.pathname.endsWith('/signup')) return reply({ user, session: null });
    if (url.pathname.endsWith('/token')) return reply(auth);
    if (url.pathname.endsWith('/user')) return reply(user);
    if (url.pathname.endsWith('/logout')) return reply({});
    if (url.pathname.endsWith('/recover')) return reply({});
    if (url.pathname.endsWith('/billing')) {
      if (request.method() === 'GET') return reply({ paymentMethods: ['card', 'paypal'], plans: [{ product: 'matharia', interval: 'month', available: true, amount: 499, currency: 'gbp' }, { product: 'matharia', interval: 'year', available: true, amount: 4999, currency: 'gbp' }] });
      assert.ok(request.headers().authorization.includes(token));
      assert.ok(!body.parent_id && !body.customer_id && !body.price_id);
      if (body.action === 'checkout') { assert.equal(body.product, 'matharia'); checkoutIntervals.push(body.interval); }
      return reply({ url: body.action === 'portal' ? 'https://billing.stripe.com/p/session/fixture' : 'https://checkout.stripe.com/c/pay/fixture' });
    }
    if (url.pathname.endsWith('/rpc/is_staff')) return reply(false);
    if (url.pathname.endsWith('/complimentary_access')) return reply([]);
    if (url.pathname.endsWith('/account_deletion_requests')) return reply(null);
    if (url.pathname.endsWith('/rpc/create_child_profile')) {
      children = [{ id: childId, parent_id: parentId, nickname: body.child_nickname }]; return reply(children[0]);
    }
    if (url.pathname.endsWith('/rpc/save_child_progress')) {
      saves.push(body);
      if (progress.last_request_id !== body.request_id) {
        assert.equal(body.expected_revision, progress.revision);
        progress = { ...progress, player: body.player_data, progression: body.progression_data, revision: progress.revision + 1, last_request_id: body.request_id };
      }
      if (failSave) { failSave = false; return route.abort('failed'); }
      return reply(progress.revision);
    }
    if (url.pathname.endsWith('/child_profiles')) return reply(children);
    if (url.pathname.endsWith('/parent_settings')) {
      if (request.method() === 'PATCH') { reportEmails = body.report_emails; return reply({ parent_id: parentId }); }
      return reply({ report_emails: reportEmails, next_report_at: '2026-09-30T15:00:00Z' });
    }
    if (url.pathname.endsWith('/subscriptions')) return reply(paid ? [{ id: 'sub_fixture', product_code: 'matharia', status: 'active', interval: 'month', current_period_end: new Date(Date.now() + 86400000).toISOString(), cancel_at_period_end: false }] : []);
    if (url.pathname.endsWith('/child_progress')) return reply(url.searchParams.get('child_id') === `eq.${otherChildId}` ? [] : [progress]);
    throw new Error(`Unexpected fixture request ${request.method()} ${url.pathname}`);
  });
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Secure checkout fixture</h1>' }));
  await page.goto(base + '/signup');
  await page.getByLabel('Parent email address').fill(user.email);
  await page.locator('input[name=password]').fill('ParentPassword123');
  await page.getByLabel('I’m the child’s parent or guardian', { exact: false }).check();
  await page.getByRole('button', { name: 'Create parent account' }).click();
  await expect(page.getByRole('status')).toContainText('Check your email');
  assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage))).includes('ParentPassword123'));
  console.log('PASS signup email-confirmation state and password never stored');
  await page.goto(base + '/parent/progress/' + childId + '?game=english');
  await expect(page).toHaveURL(new RegExp('/login\\?next='));
  await page.getByLabel('Parent email address').fill(user.email);
  await page.locator('input[name=password]').fill('ParentPassword123');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(base + '/parent/progress/' + childId + '?game=english');
  await expect(page.getByRole('heading', { name: 'Profile not found.' })).toBeVisible();
  console.log('PASS private Lexcoria report email link resumes after authenticated login');
  await page.goto(base + '/parent');
  await expect(page.getByText('Choose a subscription before creating your child’s profile.')).toBeVisible();
  await page.goto(base + '/play');
  await expect(page).toHaveURL(base + '/subscriptions');
  await expect(page.getByText('Card or PayPal at secure checkout.', { exact: false })).toBeVisible();
  await page.locator('section.family-plan').filter({ has: page.getByRole('heading', { name: 'Matharia monthly' }) }).getByRole('button', { name: 'Choose this plan' }).click();
  await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/fixture');
  await page.goto(base + '/subscriptions');
  await page.locator('section.family-plan').filter({ has: page.getByRole('heading', { name: 'Matharia yearly' }) }).getByRole('button', { name: 'Choose this plan' }).click();
  await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/fixture');
  assert.deepEqual(checkoutIntervals, ['month', 'year']);
  console.log('PASS unpaid child-profile and game gates, monthly/yearly checkout with server-selected prices');
  paid = true;
  await page.goto(base + '/parent');
  await page.getByLabel('Child’s nickname').fill('MathsLegend');
  await page.getByRole('button', { name: 'Create child profile' }).click();
  await expect(page.getByRole('heading', { name: 'MathsLegend' })).toBeVisible();
  console.log('PASS child profile becomes available after confirmed subscription');
  await page.goto(base + '/parent/progress/' + childId);
  await expect(page.getByRole('heading', { name: 'MathsLegend’s progress' })).toBeVisible();
  await expect(page.getByText('80%', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'qa-artifacts/family/parent-progress-phone.png', fullPage: true });
  await page.goto(base + '/parent/progress/' + otherChildId);
  await expect(page.getByRole('heading', { name: 'Profile not found.' })).toBeVisible();
  await page.goto(base + '/parent');
  await page.getByLabel('Send me progress reports', { exact: true }).uncheck();
  await expect(page.getByLabel('Send me progress reports', { exact: true })).not.toBeChecked();
  assert.equal(reportEmails, false);
  console.log('PASS saved parent report, other-child denial and report email opt-out');
  await page.clock.install();
  await page.getByRole('link', { name: 'Play Matharia' }).click();
  await expect(page.locator('.game-save-status')).toBeVisible();
  await page.clock.fastForward(31000);
  await expect.poll(() => saves.length).toBeGreaterThan(0);
  await page.clock.fastForward(31000);
  await expect.poll(() => saves.length).toBeGreaterThan(1);
  assert.equal(saves[0].request_id, saves[1].request_id);
  assert.equal(saves[0].player_data.playerName, 'MathsLegend');
  assert.equal(saves[0].player_data.level, 3);
  assert.deepEqual(saves[0], saves[1]);
  assert.equal(progress.revision, new Set(saves.map(save => save.request_id)).size);
  console.log('PASS selected-child browser game, cloud hydration and uncertain-response retry uses original save ID');
  await page.clock.resume();
  await page.goto(base + '/forgot-password');
  await page.getByLabel('Parent email address').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  await page.goto(`${base}/reset-password#access_token=${token}&refresh_token=fixture_refresh&type=recovery&expires_in=3600&token_type=bearer`);
  await page.locator('input[name=password]').fill('ChangedParentPassword123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page).toHaveURL(base + '/login?reset=success');
  assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage))).includes('ChangedParentPassword123'));
  console.log('PASS password recovery email flow, authenticated reset, logout and no stored password');
  expect(errors).toEqual([]);
  await context.close();
} finally { await browser.close(); }
