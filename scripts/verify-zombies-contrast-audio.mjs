import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/zombies-contrast-audio';await mkdir(out,{recursive:true});
const game=JSON.parse(await readFile('qa-artifacts/game-dock-clearance/catalog.json','utf8')).find(g=>g.key==='maths_vs_zombies');
const browser=await chromium.launch(),results=[];
try{for(const viewport of [{width:844,height:390},{width:1440,height:900}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
 await context.addInitScript(()=>{
  localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
  window.__qaStartupTrace=[];
  const instrument=fn=>async function(input,init){const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href),row={path:url.pathname,start:performance.now()};const watched=url.hostname.endsWith('supabase.co');if(watched)window.__qaStartupTrace.push(row);try{const response=await fn.call(window,input,init);if(watched){row.end=performance.now();row.status=response.status;if(!url.pathname.includes('/auth/'))response.clone().text().then(body=>row.body=body.slice(0,2000));}return response;}catch(e){if(watched){row.end=performance.now();row.error=String(e);}throw e;}};
  let current=instrument(window.fetch.bind(window));Object.defineProperty(window,'fetch',{configurable:true,get:()=>current,set:value=>current=instrument(value)});
  window.__groans=[];
  const create=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(...args){
   const source=create.apply(this,args),start=source.start,stop=source.stop;let row;
   source.start=function(...args){if(Math.abs(source.playbackRate.value-.78)<.001){const samples=source.buffer.getChannelData(0);row={duration:source.buffer.duration,nonSilent:samples.some(n=>Math.abs(n)>.001),stopped:false};window.__groans.push(row);}return start.apply(this,args);};
   source.stop=function(...args){if(row)row.stopped=true;return stop.apply(this,args);};return source;
  };
 });
 const page=await context.newPage(),errors=[],startupConsole=[],requestFailures=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>startupConsole.push({type:m.type(),text:m.text()}));page.on('requestfailed',r=>requestFailures.push({path:new URL(r.url()).pathname,error:r.failure()}));
 try{
  await page.goto('http://127.0.0.1:3024'+game.route,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-game-set]').waitFor();
 }catch(error){
  await writeFile(`${out}/startup-failure-${viewport.width}.json`,JSON.stringify({date:'2026-10-23',viewport,error:error.message,errors,startupConsole,requestFailures,body:(await page.locator('body').innerText()).slice(0,2000),api:await page.evaluate(()=>window.__qaStartupTrace)},null,2));
  await page.screenshot({path:`${out}/startup-failure-${viewport.width}.png`});throw error;
 }
 for(let i=0;i<5;i++){const button=page.locator('[data-dialog-primary]:visible').first();if(!await button.count())break;try{await button.click({timeout:3000});}catch(error){if(await button.count())throw error;}await page.waitForTimeout(200);}
 async function defeat(){
  const options=page.locator('.zombies-answer-options button');await expect(options.first()).toBeEnabled();
  const equation=await page.locator('[data-zombies-game]').getAttribute('data-zombies-equation');
  const match=equation.replaceAll('(','').replaceAll(')','').match(/(-?\d+)\s*([+\-×x÷])\s*(-?\d+)/);
  if(!match)throw Error('Unexpected equation '+equation);
  const a=Number(match[1]),b=Number(match[3]),answer={'+':a+b,'-':a-b,'×':a*b,x:a*b,'÷':a/b}[match[2]];
  await options.filter({hasText:new RegExp('^'+answer+'$')}).click();
  await expect(page.locator('.zombies-feedback')).toHaveText('Zombie down!');
 }
 for(let i=1;i<=3;i++){await defeat();await expect.poll(()=>page.evaluate(()=>window.__groans.length)).toBe(i);await page.waitForTimeout(450);}
 const groans=await page.evaluate(()=>window.__groans);expect(groans.every(row=>row.duration>0&&row.nonSilent&&!row.stopped)).toBe(true);
 await page.screenshot({path:`${out}/${viewport.width}-scene.png`});
 await page.getByRole('button',{name:'Mute audio',exact:true}).click();await defeat();await page.waitForTimeout(400);
 expect(await page.evaluate(()=>window.__groans.length)).toBe(3);
 expect(errors).toEqual([]);results.push({viewport,groans,mutedDefeatSilent:true});await context.close();console.log('PASS',viewport.width,'3 decoded groans, no ambient interruption, mute respected');
}}finally{await browser.close();}
await writeFile(out+'/results.json',JSON.stringify(results,null,2));
