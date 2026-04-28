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
  const visualQuery = 'visualTest=1&seed=1&sbStage=3';

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

  const candidates = routes
    .filter((r) => /scale builder/i.test(String(r.label ?? '')) || /scale_safari/i.test(String(r.path ?? '')))
    .sort((a, b) => (a.levelId ?? 0) - (b.levelId ?? 0));
  const route =
    candidates.find((r) => !/practice/i.test(String(r.label ?? '')) && (r.levelId ?? 0) > 1)
    ?? candidates.find((r) => !/practice/i.test(String(r.label ?? '')))
    ?? candidates[0];
  if (!route) throw new Error('Could not find route for Scale Builder.');

  await page.goto(withQuery(route.path, visualQuery));
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);

  // Dismiss the practice/mission overlay if present so we capture live gameplay.
  const overlay = page.locator('[data-testid="practice-intro-overlay"]');
  if (await overlay.isVisible().catch(() => false)) {
    const startBtn = overlay.getByRole('button', { name: /^start$/i });
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click().catch(() => {});
      await page.waitForTimeout(350);
    }
  }

  // Some routes may still land on a secondary briefing screen; try a generic CTA as a fallback.
  const cta = page.getByRole('button', { name: /start|begin|play|continue|enter|forge|go/i }).first();
  if (await cta.isVisible().catch(() => false)) {
    await cta.click().catch(() => {});
    await page.waitForTimeout(350);
  }

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(700);

  const outPath = path.join(outDir, 'iphone-scale-builder.png');
  await page.screenshot({ path: outPath, type: 'png', fullPage: false });

  await browser.close();
  if (devServer) devServer.kill('SIGTERM');
  // eslint-disable-next-line no-console
  console.log(outPath);
};

await main();
