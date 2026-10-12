// A production build must stay closed when the old preview flag is set and no
// account service is configured. The local development server is intentionally open.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const buildDir = await mkdtemp(join(tmpdir(), 'sats-paywall-'));
const env = { ...process.env, VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_ALLOW_GAME_PREVIEW: 'true' };
let preview;
let browser;
try {
  const build = spawnSync(process.execPath, ['./node_modules/vite/bin/vite.js', 'build', '--mode', 'paywall-qa', '--outDir', buildDir, '--emptyOutDir'],
    { cwd: process.cwd(), env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (build.error) throw build.error;
  if (build.status !== 0) process.stderr.write(`${build.stdout}\n${build.stderr}`);
  assert.equal(build.status, 0, 'production build must succeed');

  const port = await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const selected = server.address().port;
      server.close(() => resolve(selected));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  preview = spawn(process.execPath, ['./node_modules/vite/bin/vite.js', 'preview', '--mode', 'paywall-qa', '--outDir', buildDir,
    '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: process.cwd(), env, stdio: 'ignore' });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (preview.exitCode !== null) throw new Error(`Preview exited before serving (code ${preview.exitCode}).`);
    try { ready = (await fetch(base)).ok; } catch { /* wait for preview */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, 'production preview must start');

  browser = await chromium.launch();
  const page = await browser.newPage();
  for (const route of ['/play', '/game/1/1', '/map']) {
    await page.goto(base + route);
    await page.getByRole('heading', { name: 'Your adventure is nearly ready.' }).waitFor();
    assert.equal(await page.locator('[data-screen="gameplay"]').count(), 0, `${route} must not mount gameplay`);
  }
  console.log('PASS production game routes stay gated with preview=true and no account service');
} finally {
  await browser?.close();
  preview?.kill();
  const temporaryRoot = await realpath(tmpdir());
  const resolvedBuild = await realpath(buildDir);
  const child = relative(temporaryRoot, resolvedBuild);
  if (!child || child.startsWith('..') || isAbsolute(child) || !basename(resolvedBuild).startsWith('sats-paywall-')) {
    throw new Error(`Refusing to remove unexpected build path: ${resolvedBuild}`);
  }
  await rm(resolvedBuild, { recursive: true, force: true });
}
