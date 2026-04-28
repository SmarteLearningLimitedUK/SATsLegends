import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(repoRoot, 'visual-review', 'screenshots');
const baseUrl = process.env.SATS_BASE_URL || 'http://localhost:4173';
const visualQuery = 'visualTest=1&seed=1';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withQuery = (urlOrPath, query) => {
  const url = urlOrPath.startsWith('http') ? new URL(urlOrPath) : new URL(urlOrPath, baseUrl);
  const extra = new URLSearchParams(query);
  extra.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
};

const waitForServer = async (url, timeoutMs = 60_000) => {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for server at ${url}`);
    await sleep(500);
  }
};

const tryStartDevServer = async () => {
  try {
    const res = await fetch(baseUrl, { method: 'GET' });
    if (res.ok) return null;
  } catch {
    // ignore
  }

  const viteBin = path.resolve(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  const node = process.execPath;
  const child = spawn(node, [viteBin, '--port', '4173', '--host', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: 'pipe',
    env: { ...process.env, BROWSER: 'none' },
  });
  await waitForServer(baseUrl);
  return child;
};

const main = async () => {
  await fs.mkdir(outDir, { recursive: true });
  const devServer = await tryStartDevServer();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto(withQuery('/map', visualQuery));
  await page.waitForFunction(() => Boolean(window.__SAT_VISUAL__?.getLevelRoutes));
  const routes = await page.evaluate(() => window.__SAT_VISUAL__.getLevelRoutes());

  // We want a practice level, so grab a route-number-1 lane (first occurrence of a blueprint).
  // Potion Panic has multiple levels; route number 1 reliably triggers the practice briefing.
  const route =
    routes.find((r) => /potion-panic/i.test(String(r.path ?? '')) && /\/1$/.test(String(r.path ?? '')))
    ?? routes.find((r) => /potion/i.test(String(r.label ?? '')) && /\/1$/.test(String(r.path ?? '')))
    ?? routes.find((r) => /\/1$/.test(String(r.path ?? '')) && !r.isBoss);

  if (!route) throw new Error('Could not find a practice-level route.');

  await page.goto(withQuery(route.path, visualQuery));
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);

  const outPath = path.join(outDir, 'iphone-practice-briefing.png');
  await page.screenshot({ path: outPath, type: 'png', fullPage: false });

  await browser.close();
  if (devServer) devServer.kill('SIGTERM');
  // eslint-disable-next-line no-console
  console.log(outPath);
};

await main();

