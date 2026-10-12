import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:3000';

for (const [browserName, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  try {
    for (const [name, route, revealsTargets] of [
      ['practice', '/game/7/1', true],
      ['tier1', '/game/7/2', false],
      ['tier5', '/game/7/9', false],
    ]) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const dismissed = await page.evaluate(() => {
          const button = document.querySelector('[data-dialog-primary]');
          if (!(button instanceof HTMLButtonElement) || !button.getClientRects().length) return false;
          button.click();
          return true;
        });
        if (!dismissed) break;
        await page.waitForTimeout(150);
      }
      await page.locator('.potion-recipe-card').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const view = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
        const copy = document.querySelector('.potion-recipe-copy');
        return {
          ratio: document.querySelector('.potion-recipe-meta')?.textContent ?? '',
          copy: copy?.textContent?.trim() ?? '',
          copyFont: copy ? parseFloat(getComputedStyle(copy).fontSize) * (copy.getBoundingClientRect().height / copy.offsetHeight) : 0,
          buttons: [...document.querySelectorAll('.potion-ingredient-button')].map((button) => ({
            text: button.textContent?.trim().replace(/\s+/g, ' ') ?? '',
            aria: button.getAttribute('aria-label') ?? '',
            disabled: button.disabled,
            box: button.getBoundingClientRect().toJSON(),
            labels: [...button.querySelectorAll('span')].map((span) => ({
              font: parseFloat(getComputedStyle(span).fontSize) * (span.getBoundingClientRect().height / span.offsetHeight),
              box: span.getBoundingClientRect().toJSON(),
            })),
          })),
          recipe: rect('.potion-recipe-card'),
          vessel: rect('.potion-vessel'),
          ingredients: rect('.potion-ingredients'),
          actions: rect('.potion-brew-button'),
          dock: rect('[data-testid="shared-bottom-hud"]'),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      assert.ok(view.buttons.length >= 2, `${browserName} ${name}: ingredient buttons visible`);
      assert.ok(view.buttons.every(({ box, labels }) => box.width >= 44 && box.height >= 43.95
        && labels.every(({ font, box: label }) => font >= 13.95 && label.left >= box.left - 1 && label.right <= box.right + 1)), `${browserName} ${name}: ingredient labels overlap, clip, or fall below 14px: ${JSON.stringify(view.buttons)}`);
      assert.equal(view.overflow, 0, `${browserName} ${name}: horizontal overflow`);
      assert.ok(view.recipe.bottom <= view.ingredients.top + 2, `${browserName} ${name}: recipe overlaps ingredients`);
      assert.ok(view.actions.bottom <= view.dock.top + 2, `${browserName} ${name}: action hidden behind dock`);
      assert.ok(view.copyFont >= 13.95, `${browserName} ${name}: instruction text is too small`);

      if (revealsTargets) {
        assert.ok(view.buttons.every(({ text, aria }) => /\d+\/\d+/.test(text) && aria.includes('target')), `${browserName}: practice targets should teach the recipe`);
      } else {
        assert.ok(view.buttons.every(({ text, aria }) => /\d+ drops/.test(text) && !/\d+\/\d+/.test(text) && !aria.includes('target')), `${browserName}: answer targets leaked on bottles`);
        const ratio = view.ratio.match(/Ratio\s+([\d:]+)/i)?.[1]?.split(':').map(Number);
        const total = Number(view.copy.match(/Brew\s+(\d+)\s+drops/i)?.[1]);
        assert.ok(ratio?.length === view.buttons.length && total > 0 && total % ratio.reduce((sum, value) => sum + value, 0) === 0, `${browserName}: visible ratio and total must give one exact recipe`);
        const visibleVessel = view.vessel.bottom - Math.max(view.vessel.top, view.recipe.bottom);
        assert.ok(visibleVessel >= 85, `${browserName}: cauldron is obscured by the recipe card (${visibleVessel.toFixed(1)}px visible)`);

        const button = page.locator('.potion-ingredient-button:not(:disabled)').first();
        const before = Number((await button.textContent())?.match(/(\d+)\s+drops/)?.[1]);
        await button.click();
        const after = Number((await button.textContent())?.match(/(\d+)\s+drops/)?.[1]);
        assert.equal(after, before + 1, `${browserName}: tapping a bottle must add one visible drop`);
      }
      console.log(JSON.stringify({ browser: browserName, name, recipeHeight: Math.round(view.recipe.height), visibleVessel: Math.round(view.vessel.bottom - Math.max(view.vessel.top, view.recipe.bottom)), copyFont: Number(view.copyFont.toFixed(2)), overflow: view.overflow }));

      if (name === 'tier5' && browserName === 'chromium') {
        const brews = Number((await page.locator('.potion-recipe-meta').textContent())?.match(/Brew\s+\d+\/(\d+)/i)?.[1]);
        assert.ok(brews >= 3 && brews <= 5, 'tier5 must ask for a small, meaningful set of brews');
        let taps = 1;
        for (let round = 1; round <= brews; round += 1) {
          const ratio = (await page.locator('.potion-recipe-meta').textContent())?.match(/Ratio\s+([\d:]+)/i)?.[1]?.split(':').map(Number);
          const total = Number((await page.locator('.potion-recipe-copy').textContent())?.match(/Brew\s+(\d+)\s+drops/i)?.[1]);
          assert.ok(ratio && total > 0 && total <= 20, `tier5 brew ${round}: excessive or missing total ${total}`);
          const unit = total / ratio.reduce((sum, value) => sum + value, 0);
          assert.ok(Number.isInteger(unit), `tier5 brew ${round}: ratio and total must yield whole drops`);
          const buttons = page.locator('.potion-ingredient-button');
          assert.equal(await buttons.count(), ratio.length, `tier5 brew ${round}: one bottle per ratio part`);
          for (let index = 0; index < ratio.length; index += 1) {
            const button = buttons.nth(index);
            const current = Number((await button.textContent())?.match(/(\d+)\s+drops/i)?.[1]);
            const needed = ratio[index] * unit - current;
            assert.ok(needed >= 0, `tier5 brew ${round}: initial bottle exceeds target`);
            for (let drop = 0; drop < needed; drop += 1) {
              await button.click();
              taps += 1;
            }
          }
          await page.getByRole('button', { name: 'Brew Potion' }).click();
          await page.waitForTimeout(900);
          console.log(JSON.stringify({ round, ratio, total, metaAfterBrew: await page.locator('.potion-recipe-meta').textContent(), feedback: await page.locator('.potion-feedback-slot').textContent() }));
          if (round < brews) {
            await page.waitForFunction((nextRound) => document.querySelector('.potion-recipe-meta')?.textContent?.includes(`Brew ${nextRound}/`), round + 1, { timeout: 5000 });
          } else {
            await page.getByRole('dialog', { name: 'Mission results' }).waitFor({ timeout: 5000 });
            assert.match(await page.getByRole('dialog', { name: 'Mission results' }).textContent(), /Level Complete/i);
          }
        }
        assert.ok(taps <= 1 + brews * 20, `tier5 needs too many taps: ${taps}`);
        console.log(JSON.stringify({ browser: browserName, name: 'tier5-full-run', brews, taps, result: 'Level Complete' }));
      }
    }
  } finally {
    await browser.close();
  }
}
