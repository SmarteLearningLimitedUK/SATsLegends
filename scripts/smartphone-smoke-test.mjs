import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const baseUrl = process.env.SMARTPHONE_TEST_URL || 'http://127.0.0.1:4173';
const headed = process.argv.includes('--headed') || process.env.PHONE_HEADLESS === '0';
const quick = process.argv.includes('--quick');
const device = devices['iPhone 13'] || devices['iPhone 12'] || {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
};

const routes = [
  ['/game/1/1', 'place-value-panic'],
  ['/game/1/2', 'number-line-ninja'],
  ['/game/1/3', 'prime-pop'],
  ['/game/1/4', 'rounding-rocket'],
  ['/game/1/41', 'maths-vs-zombies'],
  ['/game/2/1', 'take-out-rush'],
  ['/game/2/2', 'fraction-forge'],
  ['/game/2/3', 'match-mastery'],
  ['/game/2/4', 'percent-power'],
  ['/game/2/5', 'simplify-sprint'],
  ['/game/3/1', 'angle-arena'],
  ['/game/3/2', 'polygon-palace'],
  ['/game/3/3', 'area-architect'],
  ['/game/3/4', 'rotation-station'],
  ['/game/3/5', 'coordinates-quest'],
  ['/game/3/6', 'conversion-canyon'],
  ['/game/3/7', 'perimeter-path'],
  ['/game/4/1', 'mean-machine'],
  ['/game/4/11', 'graph-grabber'],
  ['/game/4/12', 'line-graph-lab'],
  ['/game/4/13', 'data-detective'],
  ['/game/5/1', 'factor-frenzy'],
  ['/game/5/11', 'multiplication-mine'],
  ['/game/5/12', 'order-ops-arena'],
  ['/game/5/13', 'formula-forge'],
  ['/game/5/14', 'remainder-run'],
  ['/game/6/1', 'chrono-dash-time-trial'],
  ['/game/6/2', 'problem-pyramid'],
  ['/game/6/3', 'lava-path'],
  ['/game/6/4', 'change-counter'],
  ['/game/7/1', 'potion-panic'],
  ['/game/7/3', 'share-splitter'],
  ['/game/7/4', 'ratio-racer'],
  ['/game/7/5', 'scale-builder'],
  ['/game/8/1', 'sats-paper-1'],
  ['/game/8/2', 'sats-paper-2'],
  ['/game/8/3', 'sats-paper-3'],
];

const quickRoutes = [
  ['/game/1/41', 'maths-vs-zombies'],
  ['/game/2/3', 'match-mastery'],
  ['/game/2/4', 'percent-power'],
  ['/game/5/14', 'remainder-run'],
  ['/game/7/3', 'share-splitter'],
  ['/game/7/5', 'scale-builder'],
  ['/game/8/1', 'sats-paper-1'],
];

const selectedRoutes = quick ? quickRoutes : routes;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve('playtest', `smartphone-smoke-${timestamp}`);

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

async function waitForServer(url, timeoutMs = 45000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok || response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(750);
  }

  throw new Error(`Preview server did not become ready at ${url}. Last error: ${lastError?.message || 'none'}`);
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function collectLayoutMetrics(page) {
  return page.evaluate(() => {
    const visibleRect = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      if (
        rect.width <= 1
        || rect.height <= 1
        || style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) === 0
      ) {
        return null;
      }

      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };
    };

    const rectsFor = (selector) => Array.from(document.querySelectorAll(selector))
      .map(visibleRect)
      .filter(Boolean);

    const buttons = Array.from(document.querySelectorAll('button'))
      .map((button) => ({
        rect: visibleRect(button),
        text: (button.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        aria: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || '',
      }))
      .filter((entry) => entry.rect);

    const dockButtons = buttons.filter((button) => (
      button.aria === 'Back'
      || button.aria === 'Mute audio'
      || button.aria === 'Unmute audio'
      || button.title === 'Back to map'
      || button.title === 'Sound on'
      || button.title === 'Sound off'
    ));

    const dock = dockButtons.length > 0
      ? {
        top: Math.min(...dockButtons.map((button) => button.rect.top)),
        bottom: Math.max(...dockButtons.map((button) => button.rect.bottom)),
      }
      : null;

    const answerRects = rectsFor('.answer-choice-surface, .game-screen-bottom, .game-shell-zone-actions, .shared-game-actions');
    const questionRects = rectsFor('.game-question-card');
    const questionBottom = questionRects.length > 0 ? Math.max(...questionRects.map((rect) => rect.bottom)) : 0;
    const maxAnswerBottom = answerRects.length > 0 ? Math.max(...answerRects.map((rect) => rect.bottom)) : 0;
    const minAnswerTop = answerRects.length > 0 ? Math.min(...answerRects.map((rect) => rect.top)) : 0;

    const nonDockButtons = buttons.filter((button) => (
      !dockButtons.includes(button)
      && button.aria !== 'Drag a slice from the cake'
      && button.aria !== 'No cake slices left'
    ));

    const badButtons = dock
      ? nonDockButtons.filter((button) => (
        button.rect.bottom > dock.top + 0.5
        && button.rect.top < dock.bottom - 0.5
      ))
      : [];

    return {
      overlayCount: document.querySelectorAll('vite-error-overlay, .vite-error-overlay').length,
      dock,
      answerCount: answerRects.length,
      answerDockOverlap: dock && answerRects.length > 0 ? Math.max(0, maxAnswerBottom - dock.top) : 0,
      buttonDockOverlap: badButtons.length,
      questionOverlap: answerRects.length > 0 && questionBottom ? Math.max(0, questionBottom - minAnswerTop) : 0,
      badButtons: badButtons.map((button) => ({
        text: button.text,
        aria: button.aria,
        title: button.title,
        rect: button.rect,
      })),
    };
  });
}

await mkdir(outputDir, { recursive: true });
await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: !headed });
const context = await browser.newContext({
  ...device,
  viewport: device.viewport,
});
const page = await context.newPage();
const failures = [];
let consoleErrorCount = 0;

page.on('console', (message) => {
  if (message.type() === 'error') {
    consoleErrorCount += 1;
  }
});

for (const [route, name] of selectedRoutes) {
  const url = `${baseUrl}${route}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 }).catch(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  });
  await delay(900);

  const screenshotPath = path.join(outputDir, `${sanitizeFileName(name)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const metrics = await collectLayoutMetrics(page);
  const routeFailures = [];

  if (metrics.overlayCount > 0) routeFailures.push('vite overlay visible');
  if (!metrics.dock) routeFailures.push('bottom HUD not detected');
  if (metrics.answerDockOverlap > 0.75) routeFailures.push(`answers overlap dock by ${metrics.answerDockOverlap.toFixed(1)}px`);
  if (metrics.buttonDockOverlap > 0) routeFailures.push(`${metrics.buttonDockOverlap} non-dock button(s) overlap dock`);
  if (metrics.questionOverlap > 0.75) routeFailures.push(`question overlaps answers by ${metrics.questionOverlap.toFixed(1)}px`);

  if (routeFailures.length > 0) {
    failures.push({
      route,
      name,
      screenshotPath,
      routeFailures,
      badButtons: metrics.badButtons,
    });
  }

  console.log(`[phone] ${name}: ${routeFailures.length ? `FAIL ${routeFailures.join('; ')}` : 'ok'}`);
}

await context.close();
await browser.close();

const summary = {
  device: devices['iPhone 13'] ? 'iPhone 13' : 'smartphone viewport',
  baseUrl,
  screenshots: outputDir,
  checkedRoutes: selectedRoutes.length,
  consoleErrorCount,
  failureCount: failures.length,
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (consoleErrorCount > 0 || failures.length > 0) {
  process.exitCode = 1;
}
