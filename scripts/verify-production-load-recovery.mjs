import {chromium,expect} from '@playwright/test';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4184';
let browser=await chromium.launch();
try {
 const context=await browser.newContext();await installReleaseAccountFixture(context);
 const page=await context.newPage();let release;const pending=new Promise(r=>release=r);
 await page.route('**/assets/ChronoDashGame-*.js',async route=>{await pending;await route.continue()});
 await page.goto(base+'/game/6/1',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible({timeout:16000});
 release();await page.locator('[data-chrono-game]').waitFor();
 await expect(page.getByRole('button',{name:'Try again',exact:true})).toHaveCount(0);
 await context.close();await browser.close();browser=await chromium.launch();
 const failed=await browser.newContext();await installReleaseAccountFixture(failed);const p=await failed.newPage();
 await p.route('**/assets/App-*.js',route=>route.abort());await p.goto(base+'/game/6/1',{waitUntil:'domcontentloaded'});
 await expect(p.getByRole('button',{name:'Try Again',exact:true})).toBeVisible();
 console.log('PASS slow module offers retry and recovers; failed app module offers retry');
} finally {await browser.close()}

