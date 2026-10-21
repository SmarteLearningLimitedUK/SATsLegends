import { chromium } from '@playwright/test';
import { loadEnv } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { installReleaseAccountFixture } from './qa/release-account-fixture.mjs';

process.env.VITE_SUPABASE_URL = loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE = '1';
const base=process.env.LEGEND_DOCK_QA_URL||'http://127.0.0.1:3024';
const out=process.env.LEGEND_DOCK_QA_OUTPUT||'qa-artifacts/game-dock-clearance';
await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
const keys=new Set((process.env.LEGEND_DOCK_QA_KEYS||'').split(',').filter(Boolean));
const profiles=[{name:'phone',width:844,height:390,inset:21},{name:'small-phone',width:667,height:375,inset:21},{name:'desktop',width:1440,height:900,inset:0}].filter(p=>!process.env.LEGEND_DOCK_QA_PROFILE||p.name===process.env.LEGEND_DOCK_QA_PROFILE);
async function contextFor(profile){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.inset>0,reducedMotion:'reduce'});
 await installReleaseAccountFixture(context);
 await context.addInitScript(()=>localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}})));
 return context;
}
try{
 let catalog;
 try {catalog=JSON.parse(await readFile(out+'/catalog.json','utf8'));}
 catch {
  const context=await contextFor(profiles[0]),page=await context.newPage();
  await page.goto((process.env.LEGEND_DOCK_SOURCE_URL||'http://127.0.0.1:3023')+'/parent',{waitUntil:'domcontentloaded'});
  catalog=await page.evaluate(async()=>{
   const {ISLANDS}=await import('/src/constants.ts'),byKey=new Map();
   for(const island of ISLANDS)for(const level of island.levels){
    const key=level.blueprintKey;if(!key)continue;
    const item={key,route:`/game/${island.id}/${level.id}`,tier:level.miniGameLevel||0,isPractice:level.isPractice};
    const old=byKey.get(key);if(!old||(!item.isPractice&&item.tier>=old.tier))byKey.set(key,item);
   }return [...byKey.values()];
  });
  await writeFile(out+'/catalog.json',JSON.stringify(catalog,null,2));await context.close();
 }
 for(const profile of profiles)for(const game of catalog.filter(g=>!keys.size||keys.has(g.key))){
  const context=await contextFor(profile),page=await context.newPage();const row={...game,profile:profile.name,simulatedBottomInset:profile.inset};
  try{
   await page.goto(base+game.route,{waitUntil:'domcontentloaded'});
   await page.locator('[data-game-set]').first().waitFor({timeout:30000});
   for(let i=0;i<5;i++){
    const action=page.locator('[data-dialog-primary]:visible').first();if(!await action.count())break;
    try {await action.click({timeout:5000});}
    catch(error){if(await action.count())throw error;}
    await page.waitForTimeout(250);
   }
   await page.locator('[data-testid="shared-bottom-hud"]').evaluate((node,inset)=>node.style.paddingBottom=inset+'px',profile.inset);
   await page.waitForTimeout(650);
   row.audit=await page.evaluate(()=>{
    const dock=document.querySelector('[data-testid="shared-bottom-hud"]'),content=document.querySelector('.app-screen-content'),nav=dock.querySelector('nav'),bounds=nav.getBoundingClientRect(),area=content.getBoundingClientRect();
    const overlaps=[],clipped=[];
    for(const button of document.querySelectorAll('[data-game-set] button')){
     if(!button.checkVisibility({checkVisibilityCSS:true,opacityProperty:true})||button.closest('[aria-hidden="true"]'))continue;
     const rect=button.getBoundingClientRect();if(rect.width<2||rect.height<2)continue;
     if(rect.bottom>area.bottom+1)clipped.push({label:button.getAttribute('aria-label')||button.textContent.trim().slice(0,70),bottom:rect.bottom});
     if(rect.left<bounds.right-1&&rect.right>bounds.left+1&&rect.top<bounds.bottom-1&&rect.bottom>bounds.top+1)overlaps.push({label:button.getAttribute('aria-label')||button.textContent.trim().slice(0,70),top:rect.top,bottom:rect.bottom});
    }
    const source=document.querySelector('.legend-pvp-sources')?.getBoundingClientRect(),target=document.querySelector('.legend-pvp-targets')?.getBoundingClientRect();
    return {dockTop:dock.getBoundingClientRect().top,contentBottom:area.bottom,dockOverlaps:overlaps,clippedBottomControls:clipped,sourceTop:source?.top,sourceBottom:source?.bottom,targetBottom:target?.bottom};
   });
   row.passed=row.audit.contentBottom<=row.audit.dockTop+1&&row.audit.dockOverlaps.length===0&&row.audit.clippedBottomControls.length===0;
   await page.screenshot({path:out+'/'+profile.name+'-'+game.key+'.png'});
  }catch(error){row.passed=false;row.error=error.message;await page.screenshot({path:out+'/'+profile.name+'-'+game.key+'-failure.png'}).catch(()=>{});}
  rows.push(row);console.log(row.passed?'PASS':'FAIL',profile.name,game.key,JSON.stringify(row.audit||row.error));
  await writeFile(out+'/results'+(keys.size?'-focused':'')+(process.env.LEGEND_DOCK_QA_PROFILE?'-'+process.env.LEGEND_DOCK_QA_PROFILE:'')+'.json',JSON.stringify(rows,null,2));await context.close();
 }
}finally{await browser.close();}
if(process.env.LEGEND_DOCK_ASSERT==='1'&&rows.some(row=>!row.passed))process.exitCode=1;
