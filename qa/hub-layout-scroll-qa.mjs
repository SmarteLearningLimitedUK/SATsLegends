import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const runId = Date.now();
const outDir = path.resolve('qa-artifacts', `hub-layout-scroll-qa-${runId}`);
fs.mkdirSync(outDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const player = {
  playerName: 'QA Runner',
  avatarId: 'barratt',
  level: 3,
  xp: 0,
  coins: 200,
  gems: 10,
  unlockedIslands: [1, 2, 3, 4, 5, 6, 7, 8],
  completedLevels: {},
  levelStars: {},
  lastLoginDate: today,
  dailyStreak: 1,
  claimedDailyRewardToday: true,
  dailyQuests: [],
  achievements: [],
  calmTokens: 0,
  stats: {
    totalStars: 0,
    totalGamesPlayed: 0,
    totalCoinsEarned: 0,
  },
};

const clickIfVisible = async (locator) => {
  try {
    if (await locator.first().isVisible({ timeout: 1500 })) {
      await locator.first().click();
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const waitForHttp = async (targetUrl, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

const startDevServerIfNeeded = async () => {
  const reachable = await waitForHttp(url, 1500);
  if (reachable) return { started: false, proc: null };

  const logPath = path.join(outDir, 'devserver.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  const proc = spawn('npm.cmd', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (chunk) => logStream.write(chunk));
  proc.stderr.on('data', (chunk) => logStream.write(chunk));

  const ok = await waitForHttp(url, 20000);
  if (!ok) {
    try {
      spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { shell: true });
    } catch {
      // ignore
    }
    throw new Error(`Dev server did not become reachable at ${url}. See ${logPath}`);
  }

  return { started: true, proc };
};

const getDockBounds = async (page) => {
  return await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[data-unified-minigame-hud="true"] .game-dock-button'));
    const rects = buttons
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);
    if (!rects.length) return null;
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    return { left, right, top, bottom, count: rects.length };
  });
};

const getScreenMeta = async (page) => {
  return await page.evaluate(() => {
    const root = document.querySelector('[data-qa-root="screen"]');
    if (!root) return null;
    return {
      screen: root.getAttribute('data-qa-screen'),
      scrollable: root.getAttribute('data-qa-scrollable'),
    };
  });
};

const assertNoDockOverlap = async ({ page, screenName, screenshotName }) => {
  const backButton = page.getByRole('button', { name: /back to map/i });
  await backButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);

  const buttonBox = await backButton.boundingBox();
  const dockBox = await getDockBounds(page);

  await page.screenshot({ path: path.join(outDir, screenshotName), fullPage: false });

  if (!buttonBox) {
    throw new Error(`[${screenName}] Back to map button missing bounding box`);
  }
  if (!dockBox) {
    throw new Error(`[${screenName}] Dock buttons not found (expected unified dock)`);
  }

  const overlapPx = buttonBox.y + buttonBox.height - dockBox.top;
  return {
    screenName,
    overlapPx: Math.round(overlapPx),
    pass: overlapPx <= -6,
    buttonBox,
    dockBox,
  };
};

const assertScrollable = (meta, name) => {
  if (!meta || meta.scrollable !== 'true') {
    throw new Error(`[${name}] Expected data-qa-scrollable="true" but got ${meta?.scrollable ?? 'null'}`);
  }
};

const devServer = await startDevServerIfNeeded();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});

await page.addInitScript((state) => {
  localStorage.setItem('maths_quest_player_v2', JSON.stringify(state));
  localStorage.setItem('maths_quest_player', JSON.stringify(state));
}, player);

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await clickIfVisible(page.getByRole('button', { name: /start/i }));
await page.waitForTimeout(700);

const nameInput = page.locator('input[placeholder="Explorer"]');
if (await nameInput.first().isVisible({ timeout: 1200 }).catch(() => false)) {
  await nameInput.first().fill('QA Runner');
  await clickIfVisible(page.getByRole('button', { name: /choose avatar/i }));
  await page.waitForTimeout(700);
}

await clickIfVisible(page.getByRole('button', { name: /begin adventure/i }));
await page.waitForTimeout(1100);

await clickIfVisible(page.getByRole('button', { name: /close/i }));
await page.waitForTimeout(350);
await clickIfVisible(page.getByRole('button', { name: /claim reward/i }));
await page.waitForTimeout(350);
await clickIfVisible(page.getByRole('button', { name: /continue/i }));
await page.waitForTimeout(700);

const summary = {
  url,
  outDir,
  checks: [],
};

const ensureWorldMap = async () => {
  await page.waitForSelector('[data-qa-root="screen"][data-qa-screen="world_map"]', { timeout: 15000 });
};

await ensureWorldMap();

const checks = [
  {
    name: 'Profile',
    open: async () => {
      await page.getByRole('button', { name: /open player profile/i }).click();
    },
  },
  {
    name: 'Achievements',
    open: async () => {
      await page.getByRole('button', { name: /open achievements/i }).click();
    },
  },
  {
    name: 'Parent Portal',
    open: async () => {
      await page.getByRole('button', { name: /open parent portal/i }).click();
    },
  },
];

for (const check of checks) {
  await ensureWorldMap();
  await check.open();
  await page.waitForTimeout(650);

  const meta = await getScreenMeta(page);
  assertScrollable(meta, check.name);
  const overlap = await assertNoDockOverlap({
    page,
    screenName: check.name,
    screenshotName: `${check.name.toLowerCase().replace(/\s+/g, '-')}.png`,
  });
  if (!overlap.pass) {
    throw new Error(`[${check.name}] Back to map overlaps bottom dock by ${overlap.overlapPx}px`);
  }

  summary.checks.push({
    name: check.name,
    meta,
    overlap,
  });

  // Return via dock back.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForTimeout(700);
}

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
await browser.close();

if (devServer.started && devServer.proc?.pid) {
  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(devServer.proc.pid), '/t', '/f'], { shell: true });
    killer.on('close', () => resolve());
    killer.on('error', () => resolve());
  });
}

console.log(outDir);
