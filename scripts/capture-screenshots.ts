import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ViewportPreset = {
  key: string;
  width: number;
  height: number;
};

type LevelRoute = {
  islandId: number;
  levelId: number;
  path: string;
  label: string;
  isBoss?: boolean;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(repoRoot, 'visual-review', 'screenshots');
const indexHtmlPath = path.resolve(repoRoot, 'visual-review', 'index.html');
const zipPath = path.resolve(repoRoot, 'visual-review', 'sats-legends-screenshots.zip');

const baseUrl = process.env.SATS_BASE_URL || 'http://localhost:4173';
const visualQuery = 'visualTest=1&seed=1';

const viewports: ViewportPreset[] = [
  { key: 'iphone-se', width: 375, height: 667 },
  { key: 'iphone', width: 393, height: 852 },
  { key: 'ipad', width: 768, height: 1024 },
];

const viewportFilter = (process.env.SATS_SCREENSHOT_VIEWPORTS || '').trim();
const levelLimitRaw = (process.env.SATS_SCREENSHOT_LEVEL_LIMIT || '').trim();
const minigameLimitRaw = (process.env.SATS_SCREENSHOT_MINIGAME_LIMIT || '').trim();

const parseLimit = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

const levelLimit = parseLimit(levelLimitRaw);
const minigameLimit = parseLimit(minigameLimitRaw);

const sanitize = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

const withQuery = (urlOrPath: string, query: string) => {
  const url = urlOrPath.startsWith('http') ? new URL(urlOrPath) : new URL(urlOrPath, baseUrl);
  const extra = new URLSearchParams(query);
  extra.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
};

const ensureCleanDir = async (dir: string) => {
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await fs.mkdir(dir, { recursive: true });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async (url: string, timeoutMs = 90_000) => {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for dev server at ${url}`);
    }
    await sleep(650);
  }
};

const tryStartDevServer = async (): Promise<ChildProcessWithoutNullStreams | null> => {
  // If a server is already running, reuse it.
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
    env: {
      ...process.env,
      BROWSER: 'none',
    },
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  await waitForServer(baseUrl);
  return child;
};

const safeScreenshot = async (page: Page, filePath: string) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, type: 'png', fullPage: false });
};

const getLevelRoutes = async (page: Page): Promise<LevelRoute[]> => {
  await page.goto(withQuery('/map', visualQuery));
  await page.waitForFunction(() => Boolean((window as any).__SAT_VISUAL__?.getLevelRoutes));
  return page.evaluate(() => (window as any).__SAT_VISUAL__.getLevelRoutes());
};

const getWellbeingActivities = async (page: Page): Promise<string[]> => {
  await page.goto(withQuery('/wellbeing', visualQuery));
  await page.waitForFunction(() => Boolean((window as any).__SAT_VISUAL__?.getWellbeingActivities));
  return page.evaluate(() => (window as any).__SAT_VISUAL__.getWellbeingActivities());
};

const captureStaticScreens = async (page: Page, viewportKey: string) => {
  const screens: Array<{ name: string; path: string }> = [
    { name: 'splash', path: '/' },
    { name: 'character-select', path: '/avatar' },
    { name: 'world-map', path: '/map' },
    { name: 'achievements', path: '/achievements' },
    { name: 'shop', path: '/shop' },
    { name: 'profile', path: '/profile' },
    { name: 'settings', path: '/settings' },
    { name: 'glossary', path: '/glossary' },
    { name: 'parent', path: '/parent' },
    { name: 'calm-grove', path: '/wellbeing' },
  ];

  for (const screen of screens) {
    const out = path.join(outDir, `${viewportKey}-${screen.name}.png`);
    await page.goto(withQuery(screen.path, visualQuery));
    await safeScreenshot(page, out);
  }
};

const captureIslands = async (page: Page, viewportKey: string, routes: LevelRoute[]) => {
  const islandIds = Array.from(new Set(routes.map((r) => r.islandId))).sort((a, b) => a - b);
  for (const islandId of islandIds) {
    const out = path.join(outDir, `${viewportKey}-island-${islandId}.png`);
    await page.goto(withQuery(`/island/${islandId}`, visualQuery));
    await safeScreenshot(page, out);
  }
};

const capturePerLevel = async (page: Page, viewportKey: string, routes: LevelRoute[]) => {
  for (const route of routes) {
    const slug = sanitize(route.path.split('/')[3] || route.label || `level-${route.levelId}`);
    const prefix = `${viewportKey}-i${route.islandId}-${slug}-l${route.levelId}`;
    const startPath = path.join(outDir, `${prefix}-start.png`);
    const activePath = path.join(outDir, `${prefix}-active.png`);

    await page.goto(withQuery(route.path, visualQuery));
    await safeScreenshot(page, startPath);

    // Active state: allow a short moment for initial animations to start.
    await page.waitForTimeout(900);
    await safeScreenshot(page, activePath);
  }
};

const captureSharedStatesPerMinigame = async (page: Page, viewportKey: string, routes: LevelRoute[]) => {
  const seen = new Set<string>();
  let captured = 0;
  for (const route of routes) {
    const slug = sanitize(route.path.split('/')[3] || route.label || `level-${route.levelId}`);
    if (seen.has(slug)) continue;
    seen.add(slug);
    captured += 1;
    if (minigameLimit !== null && captured > minigameLimit) break;

    const prefix = `${viewportKey}-${slug}`;
    await page.goto(withQuery(route.path, visualQuery));
    await page.waitForTimeout(600);

    // Correct feedback (shared toast)
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.showCorrectFeedback?.());
    await page.waitForSelector('[data-testid="feedback-toast"]', { state: 'visible', timeout: 2000 }).catch(() => {});
    await safeScreenshot(page, path.join(outDir, `${prefix}-correct.png`));

    // Wrong feedback (shared toast)
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.showWrongFeedback?.());
    await page.waitForSelector('[data-testid="feedback-toast"]', { state: 'visible', timeout: 2000 }).catch(() => {});
    await safeScreenshot(page, path.join(outDir, `${prefix}-wrong.png`));

    // Pause modal (test-only overlay)
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.openPauseModal?.());
    await page.waitForSelector('[data-testid="pause-modal"]', { state: 'visible', timeout: 2000 }).catch(() => {});
    await safeScreenshot(page, path.join(outDir, `${prefix}-pause.png`));
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.closePauseModal?.());

    // End-level modals (shared)
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.openEndLevel?.('victory'));
    await page.waitForSelector('[data-testid="level-complete-modal"]', { state: 'visible', timeout: 2000 }).catch(() => {});
    await safeScreenshot(page, path.join(outDir, `${prefix}-level-complete.png`));
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.closeEndLevel?.());

    await page.evaluate(() => (window as any).__SAT_VISUAL__?.openEndLevel?.('gameover'));
    await page.waitForSelector('[data-testid="fail-modal"]', { state: 'visible', timeout: 2000 }).catch(() => {});
    await safeScreenshot(page, path.join(outDir, `${prefix}-fail.png`));
    await page.evaluate(() => (window as any).__SAT_VISUAL__?.closeEndLevel?.());
  }
};

const captureCalmActivities = async (page: Page, viewportKey: string, activityIds: string[]) => {
  for (const id of activityIds) {
    const slug = sanitize(id);
    await page.goto(withQuery('/wellbeing', visualQuery));
    await page.evaluate((activityId) => (window as any).__SAT_VISUAL__?.openWellbeingActivity?.(activityId), id);
    await page.waitForTimeout(650);
    await safeScreenshot(page, path.join(outDir, `${viewportKey}-calm-${slug}.png`));
  }

  // Completion modal (shared wellbeing modal)
  await page.goto(withQuery('/wellbeing', visualQuery));
  await page.evaluate(() => (window as any).__SAT_VISUAL__?.openWellbeingComplete?.('Bubble Breath'));
  await page.waitForSelector('[data-testid="wellbeing-complete-modal"]', { state: 'visible', timeout: 2000 }).catch(() => {});
  await safeScreenshot(page, path.join(outDir, `${viewportKey}-calm-complete-modal.png`));
  await page.evaluate(() => (window as any).__SAT_VISUAL__?.closeWellbeingComplete?.());
};

const buildIndexHtml = async () => {
  const files = (await fs.readdir(outDir))
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b));

  const items = files
    .map((file) => {
      const label = file.replace(/\.png$/i, '');
      const src = `screenshots/${file}`;
      return `<figure><img loading="lazy" src="${src}" alt="${label}"/><figcaption>${label}</figcaption></figure>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SATs Legends Visual Review</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: #050914; color: rgba(255,255,255,0.9); }
      h1 { margin: 0 0 12px; font-size: 18px; letter-spacing: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
      figure { margin: 0; border: 1px solid rgba(176,220,255,0.22); border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.03); }
      img { width: 100%; height: auto; display: block; background: #0b1222; }
      figcaption { padding: 10px 10px; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.82); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    </style>
  </head>
  <body>
    <h1>SATs Legends Visual Review</h1>
    <div class="grid">
      ${items}
    </div>
  </body>
</html>`;

  await fs.mkdir(path.dirname(indexHtmlPath), { recursive: true });
  await fs.writeFile(indexHtmlPath, html, 'utf8');
};

const tryZip = async (): Promise<boolean> => {
  try {
    if (process.platform !== 'win32') return false;
    // Use built-in Windows zip tooling.
    const { spawnSync } = await import('node:child_process');
    spawnSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path "${outDir}\\*" -DestinationPath "${zipPath}" -Force`,
    ], { cwd: repoRoot, stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
};

const runForViewport = async (browser: Browser, viewport: ViewportPreset, routes: LevelRoute[], wellbeingIds: string[]) => {
  const context: BrowserContext = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  await captureStaticScreens(page, viewport.key);
  await captureIslands(page, viewport.key, routes);

  // Every level: start + active for level-by-level review.
  await capturePerLevel(page, viewport.key, levelLimit !== null ? routes.slice(0, levelLimit) : routes);

  // Shared states: once per minigame slug.
  await captureSharedStatesPerMinigame(page, viewport.key, routes);

  // Calm activities + completion modal.
  await captureCalmActivities(page, viewport.key, wellbeingIds);

  await context.close();
};

const main = async () => {
  await ensureCleanDir(outDir);
  const server = await tryStartDevServer();

  const browser = await chromium.launch();
  const bootstrapContext = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const bootstrapPage = await bootstrapContext.newPage();

  const routes = await getLevelRoutes(bootstrapPage);
  const wellbeingIds = await getWellbeingActivities(bootstrapPage);
  await bootstrapContext.close();

  const selectedViewports = viewportFilter
    ? viewports.filter((vp) => viewportFilter.split(',').map((s) => s.trim()).includes(vp.key))
    : viewports;

  for (const viewport of selectedViewports) {
    await runForViewport(browser, viewport, routes, wellbeingIds);
  }

  await browser.close();
  await buildIndexHtml();
  const zipped = await tryZip();

  if (server) {
    server.kill();
  }

  // eslint-disable-next-line no-console
  console.log(`Screenshots saved to: ${outDir}`);
  // eslint-disable-next-line no-console
  console.log(`Gallery: ${indexHtmlPath}`);
  // eslint-disable-next-line no-console
  console.log(zipped ? `Zip created: ${zipPath}` : 'Zip not created');
};

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
