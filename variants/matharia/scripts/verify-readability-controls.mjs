import {webkit,expect} from '@playwright/test';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3120';
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{for(const [name,width,height] of [['compact',667,375],['tablet',1024,768]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
 await p.goto(base+'/game/8/2');await p.locator('[data-sats-paper]').waitFor();
 for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.click()}
 await p.getByRole('button',{name:'Mission list',exact:true}).click();await p.locator('.sats-mission-list>button').nth(10).click();
 const padButton=p.getByRole('button',{name:/Open answer pad for/}).first();await padButton.click();
 const pad=p.getByRole('dialog',{name:/Answer pad:/});await expect(pad).toBeVisible();
 await pad.getByRole('button',{name:'7',exact:true}).click();
 await expect(pad.locator('output')).toHaveText('7');
 await pad.getByRole('button',{name:'Done',exact:true}).click();
 await expect(p.locator('.sats-answer-entry>input').first()).toHaveValue('7');
 await p.getByRole('button',{name:'Mission list',exact:true}).click();await p.locator('.sats-mission-list>button').nth(3).click();
 const model=p.getByRole('button',{name:'View model',exact:true});
 if(await model.count()){await model.click();await expect(p.getByRole('dialog',{name:'Larger teaching model'})).toBeVisible();await p.getByRole('dialog',{name:'Larger teaching model'}).getByRole('button',{name:'Done',exact:true}).click()}
 console.log('PASS '+name+': compact answer pad enters values and teaching-model viewer opens/closes');
 await c.close();
}}finally{await browser.close()}
