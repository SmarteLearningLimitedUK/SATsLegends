import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const VISUAL_QUERY = 'visualTest=1&seed=1337';

const slugify = (value: string) => (
  (value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
);

const readTextFile = (filePath: string) => (
  fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8')
);

const uniqueGameKeysFromRepo = () => {
  const keys = new Set<string>();

  // From islands/levels (blueprintKey is the most reliable per-game identifier).
  const constants = readTextFile('src/constants.ts');
  const blueprintRe = /blueprintKey:\s*'([^']+)'/g;
  for (;;) {
    const match = blueprintRe.exec(constants);
    if (!match) break;
    keys.add(match[1]);
  }

  // From the registry itself (covers any games not yet wired into ISLANDS).
  const registry = readTextFile('src/games/miniGameRegistry.tsx');
  const registryIdRe = /asMiniGame\(\s*'([^']+)'\s*,/g;
  for (;;) {
    const match = registryIdRe.exec(registry);
    if (!match) break;
    keys.add(match[1]);
  }

  return Array.from(keys).filter(Boolean).sort();
};

const sanitizeForFile = (value: string) => value.replace(/[^a-z0-9._-]+/gi, '_');

test.describe('Screenshot Review Pass (All Games)', () => {
  test.setTimeout(120_000);
  const gameKeys = uniqueGameKeysFromRepo();

  test(`sanity: discovered ${gameKeys.length} game keys`, async () => {
    expect(gameKeys.length).toBeGreaterThan(0);
  });

  for (const gameKey of gameKeys) {
    const routeSlug = slugify(gameKey);
    const route = `/minigame/${routeSlug}?${VISUAL_QUERY}`;

    test(`${gameKey} screenshots`, async ({ page }, testInfo) => {
      const projectName = sanitizeForFile(testInfo.project.name || 'project');
      const outDir = path.resolve(
        process.cwd(),
        'visual-review',
        'screenshots',
        process.env.SAT_SCREENSHOT_DIR || 'review-pass-buttons',
        projectName,
      );
      fs.mkdirSync(outDir, { recursive: true });

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const practiceOverlay = page.locator('[data-testid="practice-intro-overlay"]');
      const practiceVisible = await practiceOverlay.isVisible().catch(() => false);

      if (practiceVisible) {
        await page.screenshot({
          path: path.join(outDir, `${sanitizeForFile(gameKey)}-practice.png`),
          fullPage: true,
        });

        const action = practiceOverlay.getByRole('button').last();
        await action.click({ timeout: 10_000 });
        await expect(practiceOverlay).toBeHidden({ timeout: 10_000 });
        await page.waitForTimeout(350);
      }

      await page.screenshot({
        path: path.join(outDir, `${sanitizeForFile(gameKey)}-gameplay.png`),
        fullPage: true,
      });
    });
  }
});
