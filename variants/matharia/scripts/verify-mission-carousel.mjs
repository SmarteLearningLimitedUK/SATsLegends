import {webkit,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL||'http://127.0.0.1:3078';
const out='qa-artifacts/mission-carousel';await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{
 for(const [name,width,height] of [['compact',375,667],['iphone',393,852],['ipad',768,1024]]){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await installNativeAccessFixture(c);const p=await c.newPage();
  for(let island=1;island<=8;island++){
   await p.goto(`${base}/island/${island}`);await p.locator('[data-adventure-board]').waitFor();
   const scene=p.locator('.mission-scene-art'),title=p.locator('.mission-island-identity h1');
   const sceneSrc=await scene.getAttribute('src'),islandName=await title.innerText();
   const first=await p.locator('[data-active-mission-group]').getAttribute('data-active-mission-group');
   const seen=new Set();
   for(let i=0;i<10;i++){
    const tabs=p.locator('.mission-game-tab');await expect(tabs).toHaveCount(3);
    const values=await tabs.evaluateAll(es=>es.map(e=>({key:e.dataset.gameSelect,selected:e.getAttribute('aria-selected'),width:e.getBoundingClientRect().width})));
    if(new Set(values.map(x=>x.key)).size!==3||values[1].selected!=='true'||values[1].width<=values[0].width||values[1].width>values[0].width*1.5)throw Error(`${name} island ${island}: ${JSON.stringify(values)}`);
    await expect(scene).toHaveAttribute('src',sceneSrc);await expect(title).toHaveText(islandName);
    const selected=values[1].key;if(i>0&&selected===first)break;seen.add(selected);
    await p.getByRole('button',{name:'Next game',exact:true}).tap();
   }
   if(seen.size<3)throw Error(`${name} island ${island}: carousel did not cycle through its games`);
   await expect(p.locator('[data-active-mission-group]')).toHaveAttribute('data-active-mission-group',first);
   await p.locator('.mission-game-tabs').evaluate(el=>{const send=(name,x)=>{const e=new Event(name,{bubbles:true});Object.defineProperty(e,name==='touchend'?'changedTouches':'touches',{value:[{clientX:x}]});el.dispatchEvent(e)};send('touchstart',250);send('touchend',100)});
   await expect(p.locator('[data-active-mission-group]')).not.toHaveAttribute('data-active-mission-group',first);
   await expect(scene).toHaveAttribute('src',sceneSrc);await expect(title).toHaveText(islandName);
   if(island===2)await p.screenshot({path:`${out}/${name}.png`});
   console.log(`PASS ${name} island ${island}: ${seen.size} games, stable island scene, full carousel and swipe`);
  }
  await c.close();
 }
}finally{await browser.close()}
