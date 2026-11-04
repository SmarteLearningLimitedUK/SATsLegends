import {webkit, expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base = process.env.MATHARIA_URL || 'http://127.0.0.1:3080';
const out = 'qa-artifacts/conversion-layout';
await mkdir(out, {recursive: true});
const browser = await webkit.launch({executablePath: 'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {
  for (const [name, width, height] of [['compact', 375, 667], ['phone', 390, 844], ['large-phone', 430, 932], ['ipad', 768, 1024]]) {
    const context = await browser.newContext({viewport: {width, height}, isMobile: true, hasTouch: true, reducedMotion: 'reduce'});
    await installNativeAccessFixture(context);
    const page = await context.newPage();
    await page.goto(base + '/game/3/37');
    await page.locator('[data-conversion-game]').waitFor();
    for (let i = 0; i < 6; i++) {
      const button = page.locator('[data-dialog-primary]:visible').last();
      if (!await button.count()) break;
      await button.tap();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const geometry = await page.evaluate(() => {
      const rect = selector => document.querySelector(selector).getBoundingClientRect();
      const scale = rect('[data-conversion-scale]'), question = rect('[data-concept-panel]'), bank = rect('.conversion-token-bank');
      const button = rect('.conversion-actions>button:last-child'), label = rect('.conversion-submit-label');
      const controls = [...document.querySelectorAll('[data-conversion-token],.conversion-actions>button')].map(element => {
        const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,hit:element.disabled || hit?.closest('button') === element};
      });
      return {scale:scale.toJSON(),question:question.toJSON(),bank:bank.toJSON(),button:button.toJSON(),label:label.toJSON(),controls,overflow:document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1};
    });
    const {scale, bank, button, label, controls, overflow} = geometry;
    if (overflow || scale.bottom > bank.top + 1 || label.left < button.left + 12 || label.right > button.right - 12 || label.top < button.top + 4 || label.bottom > button.bottom - 4 || controls.some(c => c.width < 44 || c.height < 44 || c.x < 0 || c.y < 0 || c.right > width || c.bottom > height || !c.hit)) throw Error(name + ': ' + JSON.stringify(geometry));
    await page.screenshot({path: out + '/' + name + '.png'});
    const tokens = await page.locator('[data-conversion-token]').evaluateAll(es => es.map(e => ({id:e.dataset.conversionToken, grams:+e.dataset.tokenGrams})));
    const target = +(await page.locator('[data-conversion-target]').getAttribute('data-conversion-target'));
    let solution;
    for (let mask = 1; mask < 1 << tokens.length; mask++) {
      const chosen = tokens.filter((_, i) => mask & 1 << i);
      if (chosen.reduce((sum, item) => sum + item.grams, 0) === target) { solution = chosen; break; }
    }
    if (!solution) throw Error('No solution for ' + target);
    for (const token of solution) await page.locator(`[data-conversion-token="${token.id}"]`).tap();
    await expect(page.locator('[data-conversion-load]')).toHaveAttribute('data-conversion-load', String(target));
    await page.getByRole('button', {name:'Submit Shipment', exact:true}).tap();
    await expect(page.locator('[data-conversion-game]')).toHaveAttribute('data-conversion-success', 'true');
    console.log('PASS ' + name + ': scale, padded controls and correct shipment');
    await context.close();
  }
} finally {
  await browser.close();
}
