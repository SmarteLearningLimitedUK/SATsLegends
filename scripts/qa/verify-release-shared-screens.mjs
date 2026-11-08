import {webkit,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {installNativeAccessFixture} from '../../variants/matharia/scripts/qa-native-access.mjs';
import {auditLayout} from './layout-overlap-audit.mjs';
const extra=process.env.QA_EXTRA_PAGES==='1';
const base='http://127.0.0.1:3030',out=process.env.QA_SHARED_OUTPUT||'qa-artifacts/release-readiness-2026-11-04/shared';await mkdir(out,{recursive:true});
const {levels}=JSON.parse(await readFile('qa-artifacts/release-readiness-2026-11-04/catalogue.json','utf8'));
const browser=await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}),rows=[];
async function record(row){rows.push(row);await writeFile(`${out}/${extra?'menus-report':'report'}.json`,JSON.stringify(rows,null,2));console.log(row.passed?'PASS':'FAIL',row.name,row.error||'');}
async function inspect(p,selector,name){
 const root=p.locator(selector).last();await expect(root).toBeVisible();await expect.poll(()=>root.evaluate(el=>{for(let n=el;n;n=n.parentElement)if(Number(getComputedStyle(n).opacity)<.99)return false;return true;})).toBe(true);await p.evaluate(()=>document.fonts.ready);
 const result=await root.evaluate(root=>{
  const visible=n=>{const r=n.getBoundingClientRect();if(!r.width||!r.height||r.right<0||r.bottom<0||r.left>innerWidth||r.top>innerHeight||!n.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}))return false;for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),b=a.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(s.overflowY)&&(r.bottom<=b.top||r.top>=b.bottom))return false;}return true;};
  const issues=[];
  for(const button of [...root.querySelectorAll('button,input,select,summary')].filter(visible)){
   const target=button.matches('input[type=checkbox]')?(button.labels?.[0]||button):button;
   for(let a=target.parentElement;a&&a!==root.parentElement;a=a.parentElement){const b=a.getBoundingClientRect(),r=target.getBoundingClientRect(),s=getComputedStyle(a);if(/auto|scroll/.test(s.overflowY)&&(r.top<b.top||r.bottom>b.bottom)){target.scrollIntoView({block:'nearest'});break;}}
   const r=target.getBoundingClientRect(),label=button.getAttribute('aria-label')||button.textContent.trim();
   // Dense mathematical points have separate 44px cursor controls; these
   // shared screens contain ordinary navigation/form controls only.
   if(r.width<43.5||r.height<43.5)issues.push({kind:'touch-target',label,w:r.width,h:r.height});
   const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!button.disabled&&r.top>=0&&r.bottom<=innerHeight&&hit&&!target.contains(hit))issues.push({kind:'intercepted-control',label});
   if(r.left<-.5||r.right>innerWidth+.5)issues.push({kind:'horizontal-control-overflow',label});
  }
  return {issues,documentOverflow:document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1};
 });
 await p.screenshot({path:`${out}/${name}.png`});expect(result.documentOverflow).toBe(false);expect(result.issues).toEqual([]);return result;
}
try{
 for(const [profile,width,height]of [['small',375,667],['iphone12',390,844],['ipad',768,1024]].filter(row=>!process.env.QA_SCREEN_PROFILE||row[0]===process.env.QA_SCREEN_PROFILE)){
  const c=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);if(process.env.QA_SHARED_FONT_SCALE)await c.addInitScript(scale=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=`${16*scale}px`}),Number(process.env.QA_SHARED_FONT_SCALE));await c.route(url=>!['localhost','127.0.0.1'].includes(url.hostname),route=>route.abort());const p=await c.newPage();p.setDefaultTimeout(20000);
  for(const [name,route,selector]of (extra?[['parent-report','/play/parent','.app-viewport'],['shop','/shop','.app-viewport'],['achievements','/achievements','.app-viewport'],['settings','/settings','.app-viewport']]:[['map','/map','[data-matharia-map]'],['profile','/profile','.app-viewport'],['avatar','/avatar','.app-viewport'],['wellbeing-hub','/wellbeing','.app-viewport']])){
   const row={name:profile+'-'+name,passed:false};try{await p.goto(base+route,{waitUntil:'domcontentloaded'});await p.waitForTimeout(400);row.measurement=await inspect(p,selector,row.name);row.passed=true;}catch(e){row.error=e.message;}await record(row);
  }
  if(extra){
   const row={name:profile+'-daily-quests',passed:false};try{
    await p.goto(base+'/profile');const open=p.getByRole('button',{name:/^Daily Quests/});await open.scrollIntoViewIfNeeded();await open.tap();
    await inspect(p,'[role="dialog"][aria-label="Daily Quests"]',row.name);await p.getByRole('dialog',{name:/^Daily Quests/}).getByRole('button',{name:'Close',exact:true}).tap();await expect(p.getByRole('dialog',{name:/^Daily Quests/})).toHaveCount(0);row.passed=true;
   }catch(e){row.error=e.message;}await record(row);
  }
  if(!extra&&profile==='iphone12')for(let island=1;island<=8;island++){
   const row={name:'map-return-island-'+island,passed:false};try{
    await p.goto(base+'/map');const explore=p.locator(`[data-map-explore-island="${island}"]`);await explore.scrollIntoViewIfNeeded();await explore.tap();await expect(p.locator('[data-adventure-board]')).toHaveAttribute('data-adventure-board',String(island));
    await p.getByRole('button',{name:'Back to islands',exact:true}).tap();await expect(p.locator('[data-matharia-map]')).toBeVisible();
    await expect.poll(()=>p.locator('.matharia-island-scroll').evaluate((el,island)=>Math.abs(el.scrollTop-el.querySelector(`[data-map-island-position="${island}"]`).offsetTop),island)).toBeLessThan(2);row.passed=true;
   }catch(e){row.error=e.message;}await record(row);
  }
  await c.close();
 }
 for(const game of levels.filter(g=>!extra).filter(g=>!g.practice&&(g.boss||g.tier===1))){
  const c=await browser.newContext({viewport:game.orientation==='portrait'?{width:390,height:844}:{width:844,height:390},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installNativeAccessFixture(c);const p=await c.newPage();p.setDefaultTimeout(15000);const row={name:game.key+'-help',passed:false};
  try{
   await p.goto(base+game.route,{waitUntil:'domcontentloaded'});await p.locator('[data-game-question]').first().waitFor();
   for(let n=0;n<5;n++){const b=p.locator('[data-dialog-primary]:visible').last();if(!await b.count())break;await inspect(p,'[role="dialog"]',game.key+'-briefing');if(game.boss){const checkbox=p.getByRole('checkbox',{name:'Untimed SATs-style practice'});const before=await checkbox.isChecked();await checkbox.locator('..').tap({position:{x:40,y:22}});expect(await checkbox.isChecked()).toBe(!before);await checkbox.setChecked(before);}await b.tap();}
   await p.getByRole('button',{name:'Tips: how to play',exact:true}).tap();row.measurement=await inspect(p,'[data-adventure-briefing="help"]',row.name);
   row.geometry=await p.evaluate(auditLayout,{rootSelector:'[data-adventure-briefing="help"]',includeChrome:false});expect(row.geometry.issues).toEqual([]);
   await p.locator('[data-adventure-briefing="help"] [data-dialog-primary]').tap();await expect(p.locator('[data-game-set]')).toHaveAttribute('data-stage-paused','false');
   if(game.key==='number_line_ninja'){
    await p.getByRole('button',{name:'Open on-screen working board',exact:true}).tap();await inspect(p,'.global-workpad-dialog','working-board');
    await p.getByRole('button',{name:'Back to game',exact:true}).tap();await expect(p.locator('.global-workpad-dialog')).toHaveCount(0);row.workpad=true;
   }
   if(!game.boss){await p.getByRole('button',{name:'Back',exact:true}).tap();await expect(p.locator('[data-active-mission-group]')).toHaveAttribute('data-active-mission-group',game.key);row.returnFocusPreserved=true;}
   row.passed=true;
  }catch(e){row.error=e.message;await p.screenshot({path:`${out}/${row.name}-failure.png`}).catch(()=>{});}await record(row);await c.close();
 }
}finally{await browser.close();}
if(rows.some(r=>!r.passed))process.exitCode=1;
