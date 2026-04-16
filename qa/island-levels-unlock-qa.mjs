import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const url = process.env.QA_URL || 'http://127.0.0.1:3000/';
const runId = Date.now();
const outDir = path.resolve('qa-artifacts', `island-levels-unlock-qa-${runId}`);
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
  if (!ok) throw new Error(`Dev server did not become reachable at ${url}. See ${logPath}`);
  return { started: true, proc };
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

const devServer = await startDevServerIfNeeded();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 720 },
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

// Select an island and enter Island Levels.
await page.getByRole('button', { name: /core of calculation/i }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /explore island/i }).click();
await page.waitForTimeout(800);

await page.screenshot({ path: path.join(outDir, '01-island-levels.png'), fullPage: false });

// Expand first group.
const firstGroupButton = page.locator('button[aria-expanded]').first();
await firstGroupButton.click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, '02-group-expanded.png'), fullPage: false });

const summary = await page.evaluate(() => {
  const playButtons = Array.from(document.querySelectorAll('button.ui-button-primary'));
  const locked = playButtons.filter((b) => (b.textContent || '').trim().toLowerCase() === 'locked');
  const disabled = playButtons.filter((b) => (b instanceof HTMLButtonElement) && b.disabled);
  const groupButtons = Array.from(document.querySelectorAll('button[aria-expanded]'));
  const skinnedGroupButtons = groupButtons.filter((b) => !b.hasAttribute('data-button-skin'));
  return {
    playButtons: playButtons.length,
    lockedButtons: locked.length,
    disabledButtons: disabled.length,
    groupButtons: groupButtons.length,
    groupButtonsMissingSkinOptOut: skinnedGroupButtons.length,
  };
});

fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ url, outDir, summary }, null, 2), 'utf8');
await browser.close();

if (devServer.started && devServer.proc?.pid) {
  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(devServer.proc.pid), '/t', '/f'], { shell: true });
    killer.on('close', () => resolve());
    killer.on('error', () => resolve());
  });
}

console.log(outDir);
