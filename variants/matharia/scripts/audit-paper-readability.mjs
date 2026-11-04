import {webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
import {inspectText} from './readability-metrics.mjs';
const base=process.env.MATHARIA_URL||'http://127.0.0.1:3120',out='qa-artifacts/readability-paper-questions',rows=[];
await mkdir(out,{recursive:true});
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'});
try{for(const [profile,width,height] of [['compact',667,375],['tablet',1024,768]]){
 const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
 for(const paper of [2,3]){
  await p.goto(base+'/game/8/'+paper);await p.locator('[data-sats-paper]').waitFor();
  for(let i=0;i<6;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap()}
  await p.evaluate(()=>document.fonts.ready);
  await p.getByRole('button',{name:'Mission list',exact:true}).click();const count=await p.locator('.sats-mission-list>button').count();
  for(let i=0;i<count;i++){
   if(i)await p.getByRole('button',{name:'Mission list',exact:true}).click();
   await p.locator('.sats-mission-list>button').nth(i).click();await p.waitForTimeout(120);
   const row={profile,paper,mission:i+1,...await p.evaluate(inspectText)};rows.push(row);
   if(row.issues.length)await p.screenshot({path:out+'/'+profile+'-'+paper+'-'+(i+1)+'.png'});
   await writeFile(out+'/report.json',JSON.stringify(rows,null,2));
  }
  console.log(profile,'paper',paper,count+' questions',rows.filter(r=>r.profile===profile&&r.paper===paper).reduce((s,r)=>s+r.issues.length,0)+' issues');
 }
 await c.close();
}}finally{await browser.close()}
if(rows.some(r=>r.issues.length||r.overflow))process.exitCode=1;
