import {chromium} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
const out='qa-artifacts/ios-aaa-audit/interfaces';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try {for(const viewport of [{width:390,height:844},{width:768,height:1024}]) {
 const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100,playerName:'QA'},revision:1},requests:{}})));
 const page=await context.newPage();
 for(const route of ['/play','/avatar','/map','/island/1','/shop','/achievements','/profile','/settings','/wellbeing','/parent']){
  await page.goto('http://127.0.0.1:3024'+route);await page.waitForTimeout(900);
  const name=route.slice(1).replaceAll('/','-'),path=`${out}/${viewport.width}-${name}.png`;await page.screenshot({path});
  const audit=await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,verticalScroll:document.documentElement.scrollHeight>innerHeight+1,title:document.querySelector('h1,h2')?.textContent,screen:document.querySelector('[data-qa-screen]')?.getAttribute('data-qa-screen')}));results.push({route,viewport,path,audit});
 }
 for(const title of ['Breath Bloom','Peaceful Pond','Lantern Camp','Star Path','Leaf Drift','Thought Release']) {
  await page.goto('http://127.0.0.1:3024/wellbeing');await page.waitForTimeout(300);
  try{await page.getByRole('button').filter({hasText:title}).first().click({timeout:4000});await page.waitForTimeout(700);const path=`${out}/${viewport.width}-${title.toLowerCase().replaceAll(' ','-')}.png`;await page.screenshot({path});results.push({title,viewport,path,rendered:true});}catch(error){results.push({title,viewport,error:error.message});}
 }
 await context.close();
}}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify(results,null,2));}
