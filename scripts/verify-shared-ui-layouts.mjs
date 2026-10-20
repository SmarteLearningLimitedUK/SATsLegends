import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
import {auditLayout} from './qa/layout-overlap-audit.mjs';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:3012';
const output='qa-artifacts/all-layout-qa/shared';
const catalog=JSON.parse(await readFile('qa-artifacts/all-layout-qa/catalog.json','utf8'));
const profiles=[{name:'small-portrait',width:320,height:568},{name:'portrait',width:390,height:844},{name:'small-landscape',width:568,height:320},{name:'wide-landscape',width:844,height:390},{name:'desktop',width:1440,height:900}].filter(p=>!process.env.LEGEND_QA_PROFILE||p.name===process.env.LEGEND_QA_PROFILE);
const mode=process.env.LEGEND_QA_MODE||'all';
const reportPath=`${output}/report-${mode}${process.env.LEGEND_QA_PROFILE?'-'+process.env.LEGEND_QA_PROFILE:''}.json`;
const rows=process.env.LEGEND_QA_RESUME==='1'?JSON.parse(await readFile(reportPath,'utf8').catch(()=>'[]')):[];
const done=(profile,id)=>rows.some(r=>r.profile===profile.name&&r.id===id&&r.passed);
const dialogKeys=new Set((process.env.LEGEND_QA_DIALOG_KEYS||'').split(',').filter(Boolean));
process.env.LEGEND_QA_FETCH_FIXTURE='1';await mkdir(output,{recursive:true});
const b=await chromium.launch();
const routes=['/play','/avatar','/map',...Array.from({length:8},(_,i)=>`/island/${i+1}`),'/shop','/achievements','/profile','/settings','/play/parent','/wellbeing','/results'];
const only=new Set((process.env.LEGEND_QA_SCREENS||'').split(',').filter(Boolean));
async function capture(page,profile,id,dialog=false){
 const row={profile:profile.name,id,route:new URL(page.url()).pathname,passed:false,audits:[]};
 try{
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(260);
  const root=dialog?page.locator('[role="dialog"]:visible').last():page.locator('.app-viewport');
  await root.waitFor();await root.evaluate(n=>n.setAttribute('data-layout-audit-root','true'));
  for(const fraction of [0,.5,1]){
   await root.evaluate((n,fraction)=>{for(const el of [n,...n.querySelectorAll('*')]){const s=getComputedStyle(el);if(/auto|scroll/.test(s.overflowY)&&el.scrollHeight>el.clientHeight+3)el.scrollTop=(el.scrollHeight-el.clientHeight)*fraction;}},fraction);
   await page.waitForTimeout(60);
   row.audits.push({fraction,...await page.evaluate(auditLayout,{rootSelector:'[data-layout-audit-root]',includeChrome:!dialog,includeLinks:true})});
  }
  await root.evaluate(n=>{n.scrollTop=0;for(const el of n.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;});
  row.screenshot=`${profile.name}-${id}.png`;
  await page.screenshot({path:`${output}/${row.screenshot}`});
  await root.evaluate(n=>n.removeAttribute('data-layout-audit-root'));
  row.passed=row.audits.every(a=>!a.overflow&&a.issues.length===0);
 }catch(e){row.error=e.message;}
 const prior=rows.findIndex(r=>r.profile===row.profile&&r.id===row.id);if(prior>=0)rows[prior]=row;else rows.push(row);
 console.log(`${row.passed?'PASS':'FAIL'} ${profile.name} ${id} ${row.audits.reduce((n,a)=>n+a.issues.length,0)} ${row.error||''}`);
 await writeFile(reportPath,JSON.stringify(rows,null,2));
}
async function dismiss(page){for(let i=0;i<6;i++){const btn=(await page.locator('[data-dialog-primary]:visible').elementHandles()).at(-1);if(!btn)break;await btn.click().catch(()=>{});await page.waitForTimeout(120);}}
async function closeDialog(page){
 const dialog=page.locator('[role="dialog"]:visible').last();const node=await dialog.elementHandle();
 await dialog.locator('[data-dialog-primary]').click();
 await page.waitForFunction(n=>!n.isConnected,node,{timeout:15000});
}
async function go(page,route){
 const stage=page.locator('[data-game-set]');const previous=await stage.count()?await stage.elementHandle():null;
 const changed=new URL(page.url()).pathname!==route;
 if(page.url().startsWith(base)){await page.evaluate(route=>{history.pushState({},'',route);dispatchEvent(new PopStateEvent('popstate'));},route);if(previous&&changed)await page.waitForFunction(n=>!n.isConnected,previous);await page.waitForTimeout(350);}
 else await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:90000});
}
try{for(const profile of profiles){
 const c=await b.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.width<1000,reducedMotion:'reduce'});await installReleaseAccountFixture(c);const p=await c.newPage();p.setDefaultTimeout(60000);
 await go(p,'/map');await p.locator('[data-qa-screen="world_map"]').waitFor();
 if(mode!=='dialogs')for(const route of routes){const id=route.replaceAll('/','-').slice(1);if((only.size&&!only.has(id))||done(profile,id))continue;await go(p,route);await capture(p,profile,id);}
 if(!only.size){
  if(mode!=='dialogs'){
  if(!done(profile,'daily-quests')){await go(p,'/profile');await p.getByRole('button',{name:/^Daily Quests/}).click();await capture(p,profile,'daily-quests',true);await p.keyboard.press('Escape');}
  await go(p,'/wellbeing');await p.locator('[data-wellbeing-select]').first().waitFor();
  const activities=await p.locator('[data-wellbeing-select]').evaluateAll(ns=>ns.map(n=>n.dataset.wellbeingSelect));
  for(const id of activities){if(done(profile,'wellbeing-'+id))continue;await go(p,'/wellbeing');await p.locator(`[data-wellbeing-select="${id}"]`).click();await capture(p,profile,'wellbeing-'+id);}
  }
  if(mode!=='screens'&&profile.width>profile.height){
   const unique=catalog.filter((g,i)=>catalog.findIndex(x=>x.key===g.key)===i).map(g=>catalog.find(x=>x.key===g.key&&x.practice)||g).filter(g=>!dialogKeys.size||dialogKeys.has(g.key));
   for(const game of unique){
    if(done(profile,'briefing-'+game.key+'-0')&&done(profile,'help-'+game.key))continue;
    await go(p,game.route);await p.locator('[data-game-set]').waitFor();
    await p.locator('[role="dialog"]:visible').last().waitFor();
    await capture(p,profile,'briefing-'+game.key+'-0',true);await closeDialog(p);
    await dismiss(p);
    await p.getByRole('button',{name:'How to play',exact:true}).click();
    await capture(p,profile,'help-'+game.key,true);await closeDialog(p);
   }
   await go(p,'/game/1/2');await p.locator('[data-game-set]').waitFor();await dismiss(p);
   await p.getByRole('button',{name:'Open on-screen working board',exact:true}).click();await capture(p,profile,'working-board',true);
  }
  if(mode!=='dialogs'&&!done(profile,'practice-results')){
  if(profile.width<profile.height)await p.setViewportSize({width:568,height:320});
  const zombie=catalog.find(g=>g.key==='maths_vs_zombies'&&g.practice);
  await go(p,zombie.route);await p.locator('[data-game-set]').waitFor();await dismiss(p);
  for(let i=0;i<4;i++){
    const controls=p.locator('.zombies-answer-options button');await controls.first().waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('.zombies-answer-options button')].every(n=>!n.disabled));
    const text=await p.locator('[data-question-copy="true"]').innerText();const match=text.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);if(!match)throw Error(text);
    const a=Number(match[1]),b=Number(match[3]),answer={'+':a+b,'-':a-b,'×':a*b,'÷':a/b}[match[2]];
    await controls.filter({hasText:new RegExp('^'+answer+'$')}).click();await p.waitForTimeout(900);
  }
  await p.getByRole('dialog',{name:'Mission results',exact:true}).waitFor();
  await p.setViewportSize({width:profile.width,height:profile.height});await capture(p,profile,'practice-results',true);
  }
 }
 await c.close();
}}finally{await b.close();}
console.log(JSON.stringify({total:rows.length,passed:rows.filter(r=>r.passed).length}));if(rows.some(r=>!r.passed))process.exitCode=1;
