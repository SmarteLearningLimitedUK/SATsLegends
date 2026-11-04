import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL??'http://127.0.0.1:3014';
const out=process.env.MATHARIA_MAP_QA_OUT??'qa-artifacts/map-return-2026-11-03',results=[];
await mkdir(out,{recursive:true});

// Inspect the island actually occupying the scroll viewport, not just DOM presence.
async function visibleIsland(page){
  return page.locator('.screen-world-map[data-frame-present="true"] .matharia-island-scroll').evaluate(container=>{
    if(Number(getComputedStyle(container.closest('[data-presentation-screen-frame]')).opacity)<.99)return [];
    const view=container.getBoundingClientRect();
    return [...container.children].map(element=>{
      const r=element.getBoundingClientRect();
      return {id:Number(element.dataset.mapIslandPosition),visible:Math.max(0,Math.min(view.bottom,r.bottom)-Math.max(view.top,r.top))/view.height};
    }).filter(island=>island.visible>.95).map(island=>island.id);
  });
}
async function expectIsland(page,id){await expect.poll(()=>visibleIsland(page)).toEqual([id]);}

for(const engine of (process.env.MATHARIA_ENGINES??'chromium,webkit').split(',')){
  const browser=await (engine==='webkit'?webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):chromium.launch());
  try{
    for(const [profile,width,height] of [['compact-iphone',375,667],['iphone-15',393,852],['ipad',768,1024]].filter(([name])=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(name))){
      const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:profile==='iphone-15'?'no-preference':'reduce'});
      await installNativeAccessFixture(context);
      const page=await context.newPage(),errors=[],row={engine,profile,width,height,checks:[],passed:false};
      page.on('pageerror',error=>errors.push(error.message));
      try{
        await page.goto(base+'/map',{waitUntil:'domcontentloaded',timeout:60000});
        await page.locator('[data-matharia-map]').waitFor();
        await page.evaluate(()=>document.fonts.ready);
        await expectIsland(page,1);
        row.checks.push('Fresh map starts at island 1');
        const ids=await page.locator('[data-map-island-position]').evaluateAll(elements=>elements.map(element=>Number(element.dataset.mapIslandPosition)));
        expect(ids).toEqual([1,2,3,4,5,6,7,8]);
        await expect(page.locator('[data-map-island-position="7"] h1')).toHaveText('Ratio Rapids');
        await expect(page.locator('[data-map-island-position="8"] h1')).toHaveText('Core of Calculation');
        await expect(page.locator('[data-map-island-position="8"] .matharia-island-heading span')).toHaveText('Island 8 of 8');
        await page.locator('.matharia-island-scroll').evaluate(container=>{container.scrollTop=container.querySelector('[data-map-island-position="7"]').offsetTop;});
        await expectIsland(page,7);
        await page.locator('[data-map-island-position="7"]').getByRole('button',{name:'Scroll to Core of Calculation',exact:true}).tap();
        await expectIsland(page,8);
        await page.locator('[data-map-island-position="8"]').getByRole('button',{name:'Scroll to Ratio Rapids',exact:true}).tap();
        await expectIsland(page,7);
        row.checks.push('Numbered map order and final island scroll cues');
        for(const id of ids){
          await page.locator('.matharia-island-scroll').evaluate((container,id)=>{
            container.scrollTop=container.querySelector(`[data-map-island-position="${id}"]`).offsetTop;
          },id);
          await expectIsland(page,id);
          await page.locator(`[data-map-explore-island="${id}"]`).tap();
          await expect(page).toHaveURL(base+`/island/${id}`);
          await page.locator('[data-adventure-board]').waitFor();
          const backLabel=id%2===0?'Back':'Back to islands';
          await page.getByRole('button',{name:backLabel,exact:true}).tap();
          await expect(page).toHaveURL(base+'/map');
          await expectIsland(page,id);
          row.checks.push(`Island ${id}: Explore → Back restores the same island`);
        }
        // Use a middle island so clamping to the end cannot hide an incorrect restore.
        await page.locator('.matharia-island-scroll').evaluate(container=>{
          container.scrollTop=container.querySelector('[data-map-island-position="4"]').offsetTop;
        });
        await expectIsland(page,4);
        await page.locator('[data-map-explore-island="4"]').tap();
        await expect(page).toHaveURL(base+'/island/4');
        await page.setViewportSize({width:height,height:width});
        await page.getByRole('button',{name:'Back to islands',exact:true}).tap();
        await expectIsland(page,4);
        await page.setViewportSize({width,height});
        await expectIsland(page,4);
        row.checks.push('Orientation change while away and while viewing the map retains island 4');
        // Manual map browsing survives another hub, without having to enter an island.
        await page.locator('.matharia-island-scroll').evaluate(container=>{
          container.scrollTop=container.querySelector('[data-map-island-position="4"]').offsetTop;
        });
        await expectIsland(page,4);
        await page.getByRole('button',{name:'Open player profile',exact:true}).tap();
        await expect(page).toHaveURL(base+'/profile');
        await page.getByRole('button',{name:'Back',exact:true}).tap();
        await expectIsland(page,4);
        row.checks.push('Manual map scroll → Profile → Back retains island 4');
        expect(errors).toEqual([]);
        row.passed=true;
        await page.screenshot({path:`${out}/${engine}-${profile}-returned-island-4.png`});
      }catch(error){
        row.error=error.stack;
        row.diagnostic=await page.evaluate(()=>({url:location.href,frames:[...document.querySelectorAll('[data-presentation-screen-frame]')].map(e=>({className:e.className,present:e.dataset.framePresent})),board:document.querySelector('[data-adventure-board]')?.getAttribute('data-adventure-board'),maps:[...document.querySelectorAll('.matharia-island-scroll')].map(e=>({top:e.scrollTop,height:e.clientHeight}))})).catch(()=>null);
        await page.screenshot({path:`${out}/${engine}-${profile}-failure.png`}).catch(()=>{});
      }finally{
        row.runtimeErrors=errors;results.push(row);
        await writeFile(`${out}/checks.json`,JSON.stringify(results,null,2)+'\n');
        console.log(row.passed?'PASS':'FAIL',engine,profile,row.error??`${row.checks.length} navigation checks`);
        await context.close();
      }
    }
  }finally{await browser.close();}
}
if(results.some(result=>!result.passed))process.exitCode=1;
