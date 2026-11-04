import {webkit} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const out='qa-artifacts/mission-reference';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try {for(const [name,width,height] of [['compact',375,667],['iphone15',393,852],['ipad',768,1024],['landscape',852,393]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
 await p.goto('http://127.0.0.1:3078/island/2',{waitUntil:'domcontentloaded'});await p.locator('[data-adventure-board]').waitFor();
 const tab=p.locator('[data-game-select="simplify_sprint"]');for(let i=0;i<5&&!await tab.count();i++)await p.getByRole('button',{name:'Next game',exact:true}).tap();await tab.tap();
 await p.locator('[data-active-mission-group="simplify_sprint"]').waitFor();
 const steps=p.locator('.mission-step');if(await steps.count()!==5)throw Error(`${name}: missing levels`);
 await steps.nth(1).tap();const route=await steps.nth(1).getAttribute('data-level-route');
 if(await p.locator('[data-selected-level]').getAttribute('data-selected-level')!==route)throw Error(`${name}: wrong selected level`);
 const geometry=await p.evaluate(()=>{const box=e=>e.getBoundingClientRect(),panel=box(document.querySelector('.mission-selection-panel')),button=box(document.querySelector('.mission-play-level')),scroll=box(document.querySelector('.mission-options-scroll')),practice=box(document.querySelector('.mission-practice-button')),selected=box(document.querySelector('.mission-game-tab[aria-selected="true"]')),tabs=box(document.querySelector('.mission-game-tabs'));return {button:button.toJSON(),panel:panel.toJSON(),practice:practice.toJSON(),scroll:scroll.toJSON(),centerOffset:(selected.left+selected.right-tabs.left-tabs.right)/2,overflow:document.documentElement.scrollWidth>innerWidth+1}});
 if(geometry.overflow||geometry.button.width<44||geometry.button.height<44||Math.abs(geometry.centerOffset)>3||(name!=='landscape'&&geometry.practice.bottom>geometry.scroll.bottom+1))throw Error(`${name}: ${JSON.stringify(geometry)}`);
 if(name==='landscape'){await p.locator('.mission-practice-button').scrollIntoViewIfNeeded();if(!await p.locator('.mission-practice-button').isVisible())throw Error('Landscape practice action is inaccessible');}
 await p.screenshot({path:`${out}/${name}.png`});
 if(name==='iphone15'){
  await p.getByRole('button',{name:'Next game',exact:true}).tap();await p.locator('[data-active-mission-group="percent_power"]').waitFor();
  await p.getByRole('button',{name:'Previous game',exact:true}).tap();await p.locator('[data-active-mission-group="simplify_sprint"]').waitFor();
  const calm=p.locator('.mission-calm');await calm.locator('summary').tap();if(!await calm.evaluate(e=>e.open))throw Error('Calm-break details did not open');await calm.locator('summary').tap();
  await p.locator('.mission-step').nth(1).tap();
 }
 await p.locator('.mission-play-level').tap();await p.locator('[data-sprint-scene]').waitFor();
 if(name==='iphone15'){
  await p.goto('http://127.0.0.1:3078/island/2',{waitUntil:'domcontentloaded'});await p.locator('[data-adventure-board]').waitFor();for(let i=0;i<5&&!await p.locator('[data-game-select="simplify_sprint"]').count();i++)await p.getByRole('button',{name:'Next game',exact:true}).tap();await p.locator('[data-game-select="simplify_sprint"]').tap();
  await p.locator('.mission-practice-button').tap();await p.locator('[data-sprint-scene]').waitFor();
 }
 console.log(`PASS ${name}: game selection, level selection and play`);await c.close();
}}finally{await browser.close()}
