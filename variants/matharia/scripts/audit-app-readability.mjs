import {inspectText} from './readability-metrics.mjs';
import {webkit} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3120';
const out=process.env.READABILITY_OUT||'qa-artifacts/app-readability';
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
const rows=[];

try{
 const catalog=JSON.parse(await readFile('qa-artifacts/current-game-screenshots/catalog.json','utf8'));
 const selected=(process.env.READABILITY_KEYS||'').split(',').filter(Boolean),profiles=(process.env.READABILITY_PROFILES||'compact,tablet').split(',');
 for(const profile of profiles){
  const context=await browser.newContext({viewport:profile==='compact'?{width:667,height:375}:{width:1024,height:768},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await installNativeAccessFixture(context);
  const page=await context.newPage();page.setDefaultTimeout(12000);
  for(const game of catalog.filter(g=>!process.env.READABILITY_MENUS_ONLY&&(!selected.length||selected.includes(g.key)))){
   const row={key:game.key,route:game.route,profile};
   try{
    await page.setViewportSize(profile==='compact'?{width:667,height:375}:{width:1024,height:768});
    await page.goto(base+game.route);
    await page.locator('[data-game-set]').waitFor();
    if(await page.locator('[data-gameplay-orientation-gate]').count())await page.setViewportSize(profile==='compact'?{width:375,height:667}:{width:768,height:1024});
    for(let i=0;i<6;i++){await page.waitForTimeout(70);const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap()}
    await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);
    Object.assign(row,await page.evaluate(inspectText));
    row.viewport=page.viewportSize();
    await page.screenshot({path:out+'/'+profile+'-'+game.key+'.png'});
    console.log(profile,game.key,row.issues.length+' issues',row.small.length+' small');
   }catch(e){row.error=e.message;console.log('ERROR',profile,game.key,e.message.slice(0,120))}
   rows.push(row);await writeFile(out+'/report.json',JSON.stringify(rows,null,2));
  }
  if(!selected.length)for(const route of ['/','/map',...Array.from({length:8},(_,i)=>'/island/'+(i+1)),'/profile','/settings','/avatar','/shop','/quests']){
   await page.setViewportSize(profile==='compact'?{width:375,height:667}:{width:768,height:1024});
   const row={key:route,profile};try{await page.goto(base+route);await page.waitForTimeout(700);await page.evaluate(()=>document.fonts.ready);Object.assign(row,await page.evaluate(inspectText));await page.screenshot({path:out+'/'+profile+'-menu-'+route.replaceAll('/','_')+'.png'});console.log(profile,route,row.issues.length+' issues')}catch(e){row.error=e.message}rows.push(row);await writeFile(out+'/report.json',JSON.stringify(rows,null,2));
  }
  await context.close();
 }
}finally{await browser.close()}
if(rows.some(row=>row.error||row.overflow||row.issues?.length))process.exitCode=1;
