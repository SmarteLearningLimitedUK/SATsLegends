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

const safeScreenshot = async (page, filePath) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, type: 'png', fullPage: false });
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

  const wanted = [
    {
      key: 'remainder_run',
      out: 'iphone-remainder-run.png',
      match: (r) => /remainder run/i.test(String(r.label ?? '')) || /remainder-run/i.test(String(r.path ?? '')),
    },
    {
      key: 'graph_grabber',
      out: 'iphone-graph-grabber.png',
      match: (r) => /graph grabber/i.test(String(r.label ?? '')) || /graph-grabber/i.test(String(r.path ?? '')),
    },
    {
      key: 'factor_frenzy',
      out: 'iphone-factor-frenzy.png',
      match: (r) => /factor frenzy/i.test(String(r.label ?? '')) || /factor-frenzy/i.test(String(r.path ?? '')),
    },
  ];

  for (const item of wanted) {
    const route = routes.find((r) => item.match(r));
    if (!route) {
      const available = routes
        .map((r) => `${r.label ?? ''} :: ${r.path ?? ''}`.trim())
        .filter(Boolean)
        .slice(0, 40)
        .join('\n');
      throw new Error(`Could not find route for ${item.key}. Sample routes:\n${available}`);
    }
    await page.goto(withQuery(route.path, visualQuery));
    await safeScreenshot(page, path.join(outDir, item.out));
  }

  await browser.close();
  if (devServer) devServer.kill('SIGTERM');
  // eslint-disable-next-line no-console
  console.log(`Saved 3 screenshots to: ${outDir}`);
};

await main();
