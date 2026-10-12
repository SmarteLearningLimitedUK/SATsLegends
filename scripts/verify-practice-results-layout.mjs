import { webkit, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await webkit.launch();
const baseUrl = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    try {
      await page.goto(`${baseUrl}/game/1/42`);
      await page.locator('.zombies-answer-options button').first().waitFor();
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const primary = page.locator('[role="dialog"] [data-dialog-primary]').first();
        if (!(await primary.count())) break;
        await primary.evaluate((button) => button.click());
        await page.waitForTimeout(120);
      }

      for (let index = 0; index < 4; index += 1) {
        const question = (await page.locator('[data-question-copy="true"]').innerText()).trim();
        const match = question.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
        assert.ok(match, `Unexpected Maths vs Zombies question: ${question}`);
        const [left, right] = [Number(match[1]), Number(match[3])];
        const answer = { '+': left + right, '-': left - right, '×': left * right, '÷': left / right }[match[2]];
        await page.locator('.zombies-answer-options button').filter({ hasText: new RegExp(`^${answer}$`) }).click();
        if (index < 3) {
          await page.waitForFunction((score) => document.querySelector('[data-zombies-game]')?.getAttribute('data-zombies-score') === String(score), (index + 1) * 220);
          await page.waitForFunction(() => [...document.querySelectorAll('.zombies-answer-options button')].length === 4 && [...document.querySelectorAll('.zombies-answer-options button')].every((button) => !button.disabled));
        }
      }

      const dialog = page.getByRole('dialog', { name: 'Mission results' });
      await dialog.waitFor({ timeout: 10000 });
      await dialog.getByText('Practice Complete', { exact: true }).waitFor();
      for (const elapsedMs of [0, 3000]) {
        if (elapsedMs) await page.waitForTimeout(elapsedMs);
        const geometry = await page.evaluate(() => {
          const rect = (element) => {
            const box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
          };
          const result = document.querySelector('[role="dialog"][aria-label="Mission results"]');
          const controls = [...result.querySelectorAll('button')].filter((button) => ['Retry Practice', 'Map'].includes(button.textContent.trim()));
          return {
            splashPresent: [...document.querySelectorAll('span')].some((element) => element.textContent?.trim() === 'Practice Complete!'),
            dialog: rect(result),
            controls: controls.map((button) => {
              const box = rect(button);
              const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
              return { name: button.textContent.trim(), ...box, hit: hit === button || button.contains(hit) };
            }),
          };
        });
        assert.equal(geometry.splashPresent, false, `${viewport.width}px practice result has a celebration ribbon at ${elapsedMs}ms`);
        assert.ok(geometry.dialog.x >= -1 && geometry.dialog.right <= viewport.width + 1, `${viewport.width}px result dialog clips horizontally`);
        for (const name of ['Retry Practice', 'Map']) {
          const button = geometry.controls.find((control) => control.name === name);
          assert.ok(button, `${viewport.width}px missing ${name}`);
          assert.ok(button.x >= 0 && button.right <= viewport.width && button.y >= 0 && button.bottom <= viewport.height, `${viewport.width}px ${name} clips`);
          assert.ok(button.hit, `${viewport.width}px ${name} cannot be tapped`);
        }
      }
      console.log(`PASS ${viewport.width}×${viewport.height} Maths vs Zombies practice results: no ribbon, controls visible and tappable`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
