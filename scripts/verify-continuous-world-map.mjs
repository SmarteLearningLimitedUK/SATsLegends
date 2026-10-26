import {chromium, webkit, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';

process.env.LEGEND_QA_FETCH_FIXTURE = '1';
process.env.VITE_SUPABASE_URL = loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const base = process.env.QA_BASE || 'http://127.0.0.1:3025';
const out = 'qa-artifacts/continuous-world-map';
await mkdir(out, {recursive:true});
const results = [];
const islands = [8,6,5,3,2,4,7,1];

for (const [engine, sizes] of [[chromium, [[320,568],[375,667],[390,844],[430,932],[589,1280]]], [webkit, [[390,844]]]]) {
  if (!existsSync(engine.executablePath())) {
    results.push({engine:engine.name(),skipped:true,reason:'Browser executable unavailable; this engine was not verified.'});
    console.log('SKIP',engine.name(),'browser executable unavailable');
    await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
    continue;
  }
  const browser = await engine.launch();
  for (const [width,height] of sizes) {
    const context = await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
    await installReleaseAccountFixture(context);
    await context.addInitScript(() => {
      if (!localStorage.getItem('__release_qa_api_state__')) localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100,unlockedIslands:[1,2,3,4,5,6,7,8]},revision:1},requests:{}}));
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(base+'/map');
      const map = page.locator('[data-reference-world-map]');
      await expect(map).toBeVisible();
      await expect(page.locator('.reference-map-art')).toHaveJSProperty('complete',true);
      await expect(page.locator('[data-map-island-id]')).toHaveCount(8);
      expect(await page.locator('[data-map-extra-islands],.reference-map-extra-water,.reference-map-extra-island').count()).toBe(0);
      expect(await page.locator('[data-reference-map-scene] img').count()).toBe(2); // One scene plus the live current-island pin.
      const initial = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        const img = document.querySelector('.reference-map-art');
        return {art:rect('.reference-map-art'),header:rect('.reference-map-header'),title:rect('.reference-map-current h1'),dock:rect('.legend-map-dock'),current:rect('[data-map-island-id="1"]'),natural:[img.naturalWidth,img.naturalHeight],scroll:document.documentElement.scrollHeight>innerHeight};
      });
      expect(initial.scroll).toBe(false);
      expect(initial.art.height/initial.art.width).toBeCloseTo(3,2);
      expect(initial.current.top).toBeGreaterThan(initial.header.bottom);
      expect(initial.current.bottom).toBeLessThan(initial.dock.top);
      expect(initial.title.right).toBeLessThanOrEqual(initial.header.right);
      expect(initial.title.top).toBeGreaterThanOrEqual(initial.header.top);
      expect(initial.title.bottom).toBeLessThanOrEqual(initial.header.bottom);
      const scroller = page.locator('.reference-map-scroll');
      for (const [position,fraction] of [['top',0],['middle',0.5],['bottom',1]]) {
        await scroller.evaluate((element,f) => {element.scrollTop=(element.scrollHeight-element.clientHeight)*f;},fraction);
        await page.screenshot({path:`${out}/${engine.name()}-${width}-${position}.png`});
      }
      for (const id of islands) {
        const button = page.locator(`[data-map-island-id="${id}"]`);
        const name = await button.getAttribute('aria-label');
        await scroller.evaluate((element, islandId) => {
          const button=element.querySelector(`[data-map-island-id="${islandId}"]`);
          element.scrollTop=button.offsetTop-element.clientHeight*0.5;
        },id);
        const rect = await button.boundingBox();
        expect(rect.height).toBeGreaterThanOrEqual(44);
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x+rect.width).toBeLessThanOrEqual(width);
        await button.tap();
        await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
        await page.getByRole('button',{name:/back/i}).first().tap();
        await expect(map).toBeVisible();
      }
      expect(errors).toEqual([]);
      results.push({engine:engine.name(),width,height,passed:true,islandsOpened:islands.length,...initial});
      console.log('PASS',engine.name(),width,height,'continuous artwork, chrome clearance and all eight island taps');
    } catch (error) {
      results.push({engine:engine.name(),width,height,passed:false,error:error.message,errors});
      await page.screenshot({path:`${out}/${engine.name()}-${width}-failure.png`});
      console.log('FAIL',engine.name(),width,error.message);
    }
    await context.close();
    await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  }
  await browser.close();
}
if(results.some(result=>result.passed===false))process.exitCode=1;
