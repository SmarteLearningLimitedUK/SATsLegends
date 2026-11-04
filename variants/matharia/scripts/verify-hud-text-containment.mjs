import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';

const base=process.env.MATHARIA_URL??'http://127.0.0.1:3055';
const out=process.env.MATHARIA_HUD_QA_OUT??'qa-artifacts/hud-text-2026-11-03';
const manifest=JSON.parse(await readFile('docs/concept-recreation/approved-screens.json','utf8')).screens;
const cases=[{key:'pvp-practice',route:'/game/1/1',orientation:'portrait'},...['place_value_panic','time_keeper_cove','multiplication_mine','rotation_relay','fraction_forge'].map(key=>manifest.find(game=>game.key===key))];
if(cases.some(game=>!game))throw Error('Missing HUD verification route.');
const rows=[];
await mkdir(out,{recursive:true});
for(const engine of (process.env.MATHARIA_ENGINES??'chromium,webkit').split(',')){
 const browser=await(engine==='webkit'?webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):chromium.launch());
 try{
  for(const [profile,portrait,landscape] of [['compact',[320,568],[667,320]],['iphone-15',[393,852],[852,393]],['ipad',[768,1024],[1024,768]]].filter(([name])=>!process.env.MATHARIA_PROFILES||process.env.MATHARIA_PROFILES.split(',').includes(name))){
   const context=await browser.newContext({viewport:{width:portrait[0],height:portrait[1]},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
   await installNativeAccessFixture(context);
   const page=await context.newPage();
   try{
    for(const game of cases.filter(game=>!process.env.MATHARIA_HUD_CASES||process.env.MATHARIA_HUD_CASES.split(',').includes(game.key))){
     const size=game.orientation==='portrait'?portrait:landscape,row={engine,profile,game:game.key,viewport:size,passed:false},errors=[];
     const onError=error=>errors.push(error.message);page.on('pageerror',onError);
     try{
      await page.setViewportSize({width:size[0],height:size[1]});
      await page.goto(base+game.route,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('[data-game-set]').waitFor();
      await page.locator('[data-testid="shared-top-hud"]').waitFor();
      for(let i=0;i<6;i++){
       const button=page.locator('[data-dialog-primary]:visible').last();
       if(!await button.count())break;
       await button.tap();await button.waitFor({state:'detached'});
      }
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid="shared-top-hud"] [data-artwork-ready]')].every(frame=>frame.dataset.artworkReady==='true'));
      row.geometry=await page.locator('[data-testid="shared-top-hud"]').evaluate(bar=>{
       const bounds=bar.getBoundingClientRect(),scale=bounds.width/bar.offsetWidth,rightPadding=parseFloat(getComputedStyle(bar).paddingRight)*scale;
       const box=element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
       const title=bar.querySelector('.legend-hud-title'),mission=bar.querySelector('.legend-hud-mission');
       const content=[title,...bar.querySelectorAll('.legend-hud-practice,.legend-hud-lives,.legend-hud-streak')].filter(element=>element.textContent.trim()||element.querySelector('img'));
       return {bar:box(bar),rightPadding,mission:box(mission),content:content.map(element=>{
        const range=document.createRange();range.selectNodeContents(element);const text=range.getBoundingClientRect();
        return {className:element.className,text:element.textContent.trim(),fontSize:parseFloat(getComputedStyle(element).fontSize),bounds:{left:text.left,right:text.right,top:text.top,bottom:text.bottom},rightClearance:bounds.right-text.right};
       }),documentOverflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
      });
      if(!process.env.MATHARIA_HUD_BASELINE){
       const {bar,content,rightPadding,mission}=row.geometry;
       expect(row.geometry.documentOverflow).toBe(false);
       expect(rightPadding).toBeGreaterThanOrEqual(19.5);
       for(const item of content){
        expect(item.bounds.left,item.text).toBeGreaterThanOrEqual(bar.left-1);
        expect(item.bounds.right,item.text).toBeLessThanOrEqual(bar.right-rightPadding+1);
        expect(item.bounds.top,item.text).toBeGreaterThanOrEqual(bar.top+bar.height*.15-1);
        expect(item.bounds.bottom,item.text).toBeLessThanOrEqual(bar.bottom-bar.height*.15+1);
        expect(item.fontSize,item.text).toBeGreaterThanOrEqual(item.className.includes('title')?14:13);
       }
       expect(content[0].bounds.right).toBeLessThanOrEqual(mission.right+1);
       expect(errors).toEqual([]);
      }
      await page.screenshot({path:`${out}/${engine}-${profile}-${game.key}.png`});
      row.passed=true;
     }catch(error){row.error=error.stack;await page.screenshot({path:`${out}/${engine}-${profile}-${game.key}-failure.png`}).catch(()=>{});}
     finally{page.off('pageerror',onError);row.runtimeErrors=errors;rows.push(row);await writeFile(`${out}/checks.json`,JSON.stringify(rows,null,2)+'\n');console.log(row.passed?'PASS':'FAIL',engine,profile,game.key,row.error??'');}
    }
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
if(rows.some(row=>!row.passed))process.exitCode=1;
