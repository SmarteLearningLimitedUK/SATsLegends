import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {loadEnv} from 'vite';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const phase=process.env.QA_PHASE||'before',out=`${process.env.QA_OUT_ROOT||'qa-artifacts/production-rebuild'}/${phase}/entry`,base=process.env.QA_BASE||'http://127.0.0.1:3025';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),results=[];
const keys=new Set((process.env.QA_ENTRY_KEYS||'').split(',').filter(Boolean));
if(keys.size){try{results.push(...JSON.parse(await readFile(out+'/report.json')).filter(row=>!keys.has(row.key)));}catch{}}
for(const [width,height] of [[320,568],[390,844],[430,932],[1024,768]])for(const [key,route] of [['welcome','/play'],['learners','/parent'],['login','/login'],['settings','/settings'],['results','/results']].filter(([key])=>!keys.size||keys.has(key))){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(key=>{
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',playerName:'Luna',level:100},revision:1},requests:{}}));
  if(key==='login')for(const name of Object.keys(localStorage))if(/^sb-.*-auth-token$/.test(name))localStorage.removeItem(name);
 },key);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
 if(key==='welcome')await page.locator('.production-welcome,.legend-welcome-screen').waitFor();
 else if(key==='learners'||key==='login')await page.locator('.ios-account-content h1').waitFor();
 else await page.locator('.app-viewport').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>[...document.images].every(n=>n.complete));
 await page.waitForFunction(()=>{const n=document.querySelector('.app-screen-content');return !n||Number(getComputedStyle(n).opacity)>=.999;});
 await page.waitForTimeout(150);
 const file=`${width}-${key}.png`;await page.screenshot({path:out+'/'+file});
 const data=await page.evaluate(()=>({text:document.body.innerText.slice(0,1600),scrollX:document.documentElement.scrollWidth>innerWidth+1,scrollY:document.documentElement.scrollHeight>innerHeight+1,
  controls:[...document.querySelectorAll('button,a,input,summary')].filter(n=>n.checkVisibility({checkVisibilityCSS:true,opacityProperty:true})).map(n=>({text:n.getAttribute('aria-label')||n.textContent.trim().slice(0,45),rect:n.getBoundingClientRect().toJSON()}))}));
 results.push({key,width,height,file,errors,...data});console.log('CAPTURED',phase,width,key);await context.close();await writeFile(out+'/report.json',JSON.stringify(results,null,2));
}
await browser.close();
