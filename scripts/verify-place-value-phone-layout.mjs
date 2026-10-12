import { webkit, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await webkit.launch();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ ...devices['iPhone 13'], viewport, reducedMotion });
      const page = await context.newPage();
      try {
        for (const route of ['/game/1/1', '/game/1/37']) {
          await page.goto((process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000') + route);
          await page.locator('[data-pvp-number-stones]').waitFor();
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const primary = page.locator('[role="dialog"] [data-dialog-primary]').first();
            if (!(await primary.count())) break;
            await primary.evaluate((button) => button.click());
            await page.waitForTimeout(150);
          }
          await page.locator('[data-monster-actor="true"][data-monster-ready="true"] img').waitFor({ timeout: 15000 });
          await page.waitForTimeout(800);
          const geometry = await page.locator('[data-monster-actor="true"] img').evaluate((image) => {
            const rect = (selector) => {
              const bounds = document.querySelector(selector).getBoundingClientRect();
              return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
            };
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
            for (let y = 0; y < canvas.height; y += 2) for (let x = 0; x < canvas.width; x += 2) if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
              minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            }
            const bounds = image.getBoundingClientRect();
            const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
            const fittedX = bounds.x + (bounds.width - canvas.width * scale) / 2;
            const fittedY = bounds.y + (bounds.height - canvas.height * scale) / 2;
            const occupied = { x: fittedX + minX * scale, y: fittedY + minY * scale, right: fittedX + (maxX + 2) * scale, bottom: fittedY + (maxY + 2) * scale };
            const stage = rect('.iphone-game-stage'), hud = rect('.legend-hud-bar'), question = rect('[data-game-question]'), target = rect('[data-pvp-number-stones]'), health = rect('[data-pvp-health]'), healthCard = rect('.pvp-enemy-health'), enemy = rect('.legend-pvp-enemy'), sources = rect('.pvp-digit-panel'), submit = rect('.game-submit-dock-fixed button');
            const hitSources = [...document.querySelectorAll('[data-pvp-location="source"]')].every((button) => {
              const area = button.getBoundingClientRect();
              const hit = document.elementFromPoint(area.x + area.width / 2, area.y + area.height / 2);
              return hit === button || button.contains(hit);
            });
            const grid = document.querySelector('.legend-pvp-sources .relative.gap-1');
            return { stage, hud, question, target, health, healthCard, enemy, occupied, sources, submit, enemyToSourceGap: sources.y - occupied.bottom, hudToQuestionGap: question.y - hud.bottom, questionToTargetGap: target.y - question.bottom, targetToHealthGap: health.y - target.bottom, sourceToSubmitGap: submit.y - sources.bottom, hitSources,
              grid: { display: getComputedStyle(grid).display, columns: getComputedStyle(grid).gridTemplateColumns, rows: getComputedStyle(grid).gridTemplateRows, height: grid.getBoundingClientRect().height, children: [...grid.children].map((child) => ({ height: child.getBoundingClientRect().height, minHeight: getComputedStyle(child).minHeight })) } };
          });
          const separate = (a, b) => a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1;
          assert.ok(geometry.questionToTargetGap >= -1, `${route} question touches target: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.hudToQuestionGap >= -1, `${route} HUD touches question: ${JSON.stringify(geometry)}`);
          assert.ok(separate(geometry.target, geometry.sources), `${route} number stones touch digit panel: ${JSON.stringify(geometry)}`);
          assert.ok(separate(geometry.target, geometry.healthCard), `${route} number stones touch enemy health: ${JSON.stringify(geometry)}`);
          assert.ok(separate(geometry.occupied, geometry.sources), `${route} enemy touches digit panel: ${JSON.stringify(geometry)}`);
          assert.ok(separate(geometry.healthCard, geometry.sources), `${route} health touches digit panel: ${JSON.stringify(geometry)}`);
          assert.ok(separate(geometry.occupied, geometry.submit), `${route} enemy touches Submit: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.sourceToSubmitGap >= -1, `${route} digits touch Submit: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.healthCard.right <= Math.min(viewport.width, geometry.stage.right) - (viewport.width <= 340 ? 8 : 0), `${route} health clips stage edge: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.hitSources, `${route} digit controls not reachable: ${JSON.stringify(geometry)}`);
          console.log(`PASS ${viewport.width}×${viewport.height} ${reducedMotion} ${route}: question ${geometry.questionToTargetGap.toFixed(1)}px, sources→Submit ${geometry.sourceToSubmitGap.toFixed(1)}px, digit controls reachable`);
        }
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
