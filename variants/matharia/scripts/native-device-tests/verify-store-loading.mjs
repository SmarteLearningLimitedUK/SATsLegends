import {webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../qa-native-access.mjs';
const out='qa-artifacts/native-device-qa/store-regression';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const rows=[];
try {
  for(const statusMode of ['active','inactive','unresponsive']) {
    const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await installNativeAccessFixture(context,{statusMode});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:3030/game/1/6',{waitUntil:'domcontentloaded'});
    if(statusMode==='active') {
      await expect(page.getByRole('button',{name:'Tips: how to play',exact:true})).toBeVisible({timeout:15000});
    } else {
      const gate=page.locator('[data-native-dialog="parent-gate"]');
      await expect(gate).toBeVisible({timeout:15000});
      const match=(await gate.locator('label').innerText()).match(/(\d+)\D+(\d+)/);
      await gate.locator('input').fill(String(Number(match[1])*Number(match[2])));
      await gate.getByRole('button',{name:'Continue',exact:true}).click();
      const upgrade=page.locator('[data-native-dialog="upgrade"]');
      await expect(upgrade).toBeVisible();
      await expect(page.getByText('Opening your adventure…',{exact:true})).toHaveCount(0);
      if(statusMode==='inactive') {
        await page.waitForFunction(()=>window.__nativeQaListeners['MathariaServices:entitlementsChanged']);
        await page.evaluate(()=>window.__nativeQaListeners['MathariaServices:entitlementsChanged']({active:false,expiresAt:null,configured:true,plans:[{id:'local-monthly',name:'Local monthly',price:'£4.99',period:'month',periodCount:1}]}));
        await expect(upgrade.getByRole('button',{name:'Upgrade · £4.99',exact:true})).toBeVisible();
      } else await expect(upgrade.getByText('Unable to check App Store access. Connect to the internet and try again.',{exact:true})).toBeVisible();
    }
    await page.screenshot({path:`${out}/${statusMode}.png`});
    rows.push({statusMode,passed:true,browserBridgeFixture:true});
    await context.close();
  }
} finally {await browser.close();await writeFile(`${out}/report.json`,JSON.stringify(rows,null,2));}
console.log('PASS cached access without a price list, delayed catalogue event, and unresponsive native bridge recovery.');
