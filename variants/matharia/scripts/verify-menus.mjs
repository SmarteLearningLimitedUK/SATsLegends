import {chromium,webkit,expect}from'@playwright/test';
import{mkdir,writeFile}from'node:fs/promises';
import{installReleaseAccountFixture}from'../../../scripts/qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const out='qa-artifacts/concept-recreation/navigation',rows=[];await mkdir(out,{recursive:true});
for(const engine of(process.env.MATHARIA_ENGINES||'chromium,webkit').split(',')){
 const browser=engine==='webkit'?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const[profile,width,height]of[['compact',375,667],['landscape',844,390],['ipad',768,1024]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{revision:1,progression:{},player:{playerName:'Menu QA',avatarId:'barratt',level:100,xp:15000,coins:5000,unlockedIslands:[1,2,3,4,5,6,7,8],levelStars:{'1-1':3}}},requests:{}}))});
  const page=await context.newPage(),errors=[],row={engine,profile,width,height,checks:[],kind:'Browser-only isolated account state; original online event flushes the staggered save queue; no real purchase/account mutations'};rows.push(row);page.on('pageerror',e=>errors.push(e.message));
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('__release_qa_api_state__')).saved.player);const local=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('maths_quest_player_v2:20000000-0000-4000-8000-000000000001')||localStorage.getItem('maths_quest_player_v2')||'{}'));const flush=()=>page.evaluate(()=>window.dispatchEvent(new Event('online')));
  try{
   await page.goto('http://127.0.0.1:3015/profile');await page.getByRole('link',{name:'Sound & music settings',exact:true}).click();await page.waitForURL('**/settings');
   for(const[label,key]of[['Sound effects','sats_mastery_muted'],['Background music','sats_mastery_music_enabled']]){
    const b=page.getByRole('button',{name:label,exact:true}),before=await b.getAttribute('aria-pressed');await b.tap();await expect(b).toHaveAttribute('aria-pressed',before==='true'?'false':'true');const stored=await page.evaluate(k=>localStorage.getItem(k),key);await page.reload();await expect(b).toHaveAttribute('aria-pressed',before==='true'?'false':'true');if(await page.evaluate(k=>localStorage.getItem(k),key)!==stored)throw Error('Setting did not persist: '+label);
   }
   await page.getByRole('button',{name:'Return to map',exact:true}).tap();await page.waitForURL('**/map');row.checks.push('original sound/music event toggles, local persistence after reload and Return to map');
   await page.goto('http://127.0.0.1:3015/shop');const buy=page.getByRole('button',{name:'Buy',exact:true}).first();await buy.waitFor();const text=await buy.locator('xpath=../..').innerText(),itemName=text.trim().split('\n')[0],card=page.locator('.hub-wide-page-grid').locator(':scope > *').filter({has:page.getByText(itemName,{exact:true})}),price=Number(text.match(/(\d+) coins/)[1]),before=(await saved()).coins;
   await buy.tap();await expect(card.getByRole('button',{name:'Equip',exact:true})).toBeVisible();await expect.poll(async()=>(await local()).coins).toBe(before-price);await flush();await expect.poll(async()=>(await saved()).coins).toBe(before-price);
   await card.getByRole('button',{name:'Equip',exact:true}).tap();await expect(card.getByRole('button',{name:'Unequip',exact:true})).toBeVisible();await expect.poll(async()=>Object.values((await local()).shopState?.equippedByCategory??{}).some(Boolean)).toBe(true);await flush();await expect.poll(async()=>Object.values((await saved()).shopState?.equippedByCategory??{}).some(Boolean)).toBe(true);const owned=await saved();if(!owned.shopState?.ownedItemIds?.length)throw Error('Original ownership not saved');
   await page.reload();await page.getByRole('button',{name:'Unequip',exact:true}).first().tap();await expect.poll(async()=>Object.values((await local()).shopState.equippedByCategory).filter(Boolean).length).toBe(0);await flush();await expect.poll(async()=>Object.values((await saved()).shopState.equippedByCategory).filter(Boolean).length).toBe(0);if((await saved()).coins!==before-price)throw Error('Equip/unequip changed currency');row.checks.push('actual coin purchase deducts original price once, ownership/equipment persists, reload and unequip retain currency');
   await page.goto('http://127.0.0.1:3015/avatar');await page.getByRole('button',{name:'Next hero',exact:true}).waitFor();const identities=[];
   for(let i=0;i<4;i++){await expect.poll(()=>page.locator('[data-avatar-id]').count()).toBe(1);identities.push(await page.locator('[data-avatar-id]').getAttribute('data-avatar-id'));await page.getByRole('button',{name:'Next hero',exact:true}).tap();await expect.poll(()=>page.locator('[data-avatar-id]').last().getAttribute('data-avatar-id')).not.toBe(identities.at(-1))}
   if(new Set(identities).size!==4||!['barratt','bran','mochi','vex'].every(id=>identities.includes(id)))throw Error('Original four identities changed: '+identities);
   await page.getByRole('textbox',{name:'Your adventurer name',exact:true}).fill('Matharia Explorer');await page.getByRole('button',{name:'Begin adventure',exact:true}).tap();await page.waitForURL('**/map');await expect.poll(async()=>(await local()).playerName).toBe('Matharia Explorer');await flush();await expect.poll(async()=>(await saved()).playerName).toBe('Matharia Explorer');row.checks.push('all four canonical heroes and original name/Begin adventure save flow');
   if(errors.length)throw Error(errors.join(';'));row.passed=true;
  }catch(e){row.passed=false;row.error=e.stack;await page.screenshot({path:`${out}/menus-${engine}-${profile}-failure.png`}).catch(()=>{})}
  console.log(row.passed?'PASS':'FAIL',engine,profile,row.error||'');await writeFile(out+'/menu-checks.json',JSON.stringify(rows,null,2));await context.close();
 }}finally{await browser.close()}
}if(rows.some(r=>!r.passed))process.exitCode=1;
