import {webkit} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installNativeAccessFixture} from './qa-native-access.mjs';
const base='http://127.0.0.1:3077',out='qa-artifacts/single-timers';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/full-screen-qa/catalog.json','utf8')).filter(x=>!x.practice);
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),results=[];
try{for(const game of catalog){
 const c=await browser.newContext({viewport:{width:852,height:393},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();
 try{
  await p.goto(base+game.route,{waitUntil:'domcontentloaded'});await p.locator('[data-game-set]').first().waitFor({timeout:45000});
  const orientation=await p.locator('[data-concept-orientation]').first().getAttribute('data-concept-orientation');
  if(orientation==='portrait')await p.setViewportSize({width:393,height:852});
  for(let i=0;i<7;i++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await b.tap();}
  await p.waitForTimeout(200);
  const data=await p.evaluate(()=>{const shown=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden="true"]')};return {timers:[...document.querySelectorAll('[role="timer"]')].filter(shown).map(e=>({text:e.innerText,label:e.getAttribute('aria-label')})),seconds:[...document.querySelectorAll('[data-game-set] span,[data-game-set] strong')].filter(e=>e.children.length===0&&!e.closest('[role="timer"]')&&shown(e)&&/\b\d+\s*s\b/i.test(e.innerText)).map(e=>e.innerText.trim())}});
  if(data.timers.length>1)throw Error(`Multiple timers: ${JSON.stringify(data)}`);
  if(['take_out_rush','factor_frenzy','match3_equivalence','simplify_sprint'].includes(game.key)&&data.timers.length!==1)throw Error(`Expected a timer: ${JSON.stringify(data)}`);
  if(game.key==='simplify_sprint'&&data.seconds.length)throw Error(`Sprint has an extra timer: ${JSON.stringify(data.seconds)}`);
  if(game.key==='rotation_relay'&&data.seconds.length)throw Error(`Transformation Station has an extra timer: ${JSON.stringify(data.seconds)}`);
  if(game.key==='take_out_rush'&&data.seconds.some(s=>!s.includes('Next:')))throw Error(`Takeout has an extra timer: ${JSON.stringify(data.seconds)}`);
  if(['take_out_rush','factor_frenzy','simplify_sprint','match3_equivalence'].includes(game.key))await p.screenshot({path:`${out}/${game.key}.png`});
  results.push({key:game.key,orientation,...data,passed:true});console.log('PASS',game.key);
 }catch(e){results.push({key:game.key,passed:false,error:String(e)});console.log('FAIL',game.key,String(e));}
 await c.close();
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(results,null,2));}
if(results.some(x=>!x.passed))process.exitCode=1;
