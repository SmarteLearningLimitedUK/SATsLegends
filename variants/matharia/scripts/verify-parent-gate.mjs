import {webkit,expect} from '@playwright/test';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL??'http://127.0.0.1:3057';const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
async function solve(gate){
 const question=await gate.locator('label').innerText(), numbers=question.match(/^What is ([1-9]) \+ ([1-9])\?$/);
 if(!numbers)throw Error('Expected addition with single-digit numbers: '+question);
 await gate.locator('input').fill(String(Number(numbers[1])+Number(numbers[2])));
 await gate.getByRole('button',{name:'Continue',exact:true}).click();
}
try{for(const [width,height] of [[320,568],[393,852],[852,393],[768,1024]]){
 const portrait={width:Math.min(width,height),height:Math.max(width,height)};
 const c=await browser.newContext({viewport:portrait,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await c.newPage();
 await installNativeAccessFixture(c,{statusMode:'inactive'});
 await c.route(url=>!['127.0.0.1','localhost'].includes(url.hostname),route=>route.abort());
 await p.goto(base+'/island/1');await p.locator('[data-adventure-board]').waitFor();
 await p.getByRole('button',{name:'Parent account',exact:true}).click();let gate=p.locator('[data-native-dialog="parent-gate"]');await expect(gate).toBeVisible();
 await p.setViewportSize({width,height});
 await gate.locator('input').fill('0');await gate.getByRole('button',{name:'Continue',exact:true}).click();await expect(gate.getByRole('alert')).toBeVisible();await expect(p.locator('[data-native-dialog="account"]')).toHaveCount(0);
 await solve(gate);
 let account=p.locator('[data-native-dialog="account"]');await expect(account).toBeVisible();await expect(account.getByRole('link',{name:'Privacy'})).toHaveAttribute('href','https://satslegends.com/privacy');await account.getByRole('button',{name:'Close',exact:true}).click();
 await p.setViewportSize(portrait);
 await p.locator('.mission-step[data-locked="true"]:enabled').first().click();gate=p.locator('[data-native-dialog="parent-gate"]');await expect(gate).toBeVisible();await solve(gate);await expect(p.locator('[data-native-dialog="upgrade"]')).toBeVisible();
 console.log(`PASS parent gate and privacy link ${width}x${height}`);await c.close();
}}finally{await browser.close()}
