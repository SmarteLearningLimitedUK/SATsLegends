import {webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
import {inspectText} from './readability-metrics.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3120',out='qa-artifacts/readability-dialogs',rows=[];
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{for(const [profile,width,height] of [['compact',375,667],['tablet',768,1024]]){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(context);const page=await context.newPage();await page.clock.install();
 const record=async key=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);const row={profile,key,...await page.evaluate(inspectText)};rows.push(row);await page.screenshot({path:out+'/'+profile+'-'+key+'.png'});await writeFile(out+'/report.json',JSON.stringify(rows,null,2));console.log(profile,key,row.issues.length+' issues')};
 await page.goto(base+'/wellbeing');await page.locator('[data-wellbeing-activity="hub"]').waitFor();await record('calm-hub');
 const ids=await page.locator('[data-wellbeing-select]').evaluateAll(es=>es.map(e=>e.dataset.wellbeingSelect));
 for(const id of ids){
  await page.locator('[data-wellbeing-select="'+id+'"]').click();await page.locator('[data-wellbeing-activity="'+id+'"]').waitFor();if(await page.locator('[data-gameplay-orientation-gate]').count())await page.setViewportSize({width:height,height:width});await record(id);
  await page.goto(base+'/wellbeing');await page.setViewportSize({width,height});await page.locator('[data-wellbeing-activity="hub"]').waitFor();
 }
 await page.goto(base+'/game/4/10');await page.locator('[data-mean-game]').waitFor();
 for(let i=0;i<6;i++){const b=page.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.click()}
 await page.getByRole('button',{name:'Scan the power cells'}).click();await page.clock.runFor(1000);
 const values=await page.locator('[data-reel-active="true"]').evaluateAll(es=>es.map(e=>+e.dataset.reelValue)),mean=values.reduce((a,b)=>a+b,0)/values.length;
 const choices=await page.locator('[data-mean-answer]').evaluateAll(es=>es.map(e=>+e.dataset.meanAnswer)),wrong=choices.find(v=>Math.abs(v-mean)>.001);
 for(let i=0;i<3;i++){await page.locator('[data-mean-answer="'+wrong+'"]').click();await page.clock.runFor(1250)}
 await page.locator('[data-result-outcome]').waitFor();await record('results');
 await context.close();
}}finally{await browser.close()}
