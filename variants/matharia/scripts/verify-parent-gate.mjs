import {webkit,expect} from '@playwright/test';
const base=process.env.MATHARIA_URL??'http://127.0.0.1:3057';const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{for(const [width,height] of [[320,568],[393,852],[852,393],[768,1024]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();
 await p.goto(base+'/island/1');await p.locator('[data-adventure-board]').waitFor();
 await p.getByRole('button',{name:'Parent account',exact:true}).click();let gate=p.locator('[data-native-dialog="parent-gate"]');await expect(gate).toBeVisible();
 await gate.locator('input').fill('0');await gate.getByRole('button',{name:'Continue',exact:true}).click();await expect(gate.getByRole('alert')).toBeVisible();await expect(p.locator('[data-native-dialog="account"]')).toHaveCount(0);
 let label=await gate.locator('label').innerText(), m=label.match(/(\d+) × (\d+)/);if(!m)throw Error('Missing challenge');await gate.locator('input').fill(String(Number(m[1])*Number(m[2])));await gate.getByRole('button',{name:'Continue',exact:true}).click();
 let account=p.locator('[data-native-dialog="account"]');await expect(account).toBeVisible();await expect(account.getByRole('link',{name:'Privacy'})).toHaveAttribute('href','https://satslegends.com/privacy');await account.getByRole('button',{name:'Close',exact:true}).click();
 await p.locator('.mission-step[data-locked="true"]').first().click();gate=p.locator('[data-native-dialog="parent-gate"]');await expect(gate).toBeVisible();label=await gate.locator('label').innerText();m=label.match(/(\d+) × (\d+)/);await gate.locator('input').fill(String(Number(m[1])*Number(m[2])));await gate.getByRole('button',{name:'Continue',exact:true}).click();await expect(p.locator('[data-native-dialog="upgrade"]')).toBeVisible();
 console.log(`PASS parent gate and privacy link ${width}x${height}`);await c.close();
}}finally{await browser.close()}
