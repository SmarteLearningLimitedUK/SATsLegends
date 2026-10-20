import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL='https://ios-preflight.supabase.co';
process.env.LEGEND_QA_FETCH_FIXTURE='0';
const base=process.env.LEGEND_IOS_STORE_QA_URL||'http://127.0.0.1:3021';
const out='qa-artifacts/ios-store-preparation';await mkdir(out,{recursive:true});
const browser=await chromium.launch(),rows=[];
const product='com.smartelearning.satslegends.matharia.monthly';
try{for(const mode of ['purchased','pending','cancelled','verify-error','restore','not-ready','browser']){
 const context=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce',hasTouch:true});
 await installReleaseAccountFixture(context);
 await context.addInitScript(({mode,product})=>{
  window.__storeEvents=[];
  if(mode==='browser')return;
  window.CapacitorCustomPlatform={name:'ios'};
  const methods=['products','purchase','entitlements','restore','finish','manage'];
  window.Capacitor={PluginHeaders:[{name:'App',methods:[{name:'getState',rtype:'promise'},{name:'addListener'},{name:'removeListener',rtype:'promise'}]},{name:'LegendsStore',methods:methods.map(name=>({name,rtype:'promise'})).concat([{name:'addListener'},{name:'removeListener',rtype:'promise'}])}],nativePromise:async(plugin,method,options)=>{
   if(plugin==='App')return {isActive:true};
   window.__storeEvents.push({method,options});
   if(method==='products')return {products:[{id:product,name:'Matharia monthly',price:'£4.99',description:'Maths adventures',period:'month'},{id:product.replace('monthly','annual'),name:'Matharia annual',price:'£49.99',description:'Maths adventures',period:'year'}]};
   if(method==='entitlements')return {transactionIds:[]};
   if(method==='purchase')return {status:['pending','cancelled'].includes(mode)?mode:'purchased',transactionIds:['pending','cancelled'].includes(mode)?[]:['12345']};
   if(method==='restore')return {transactionIds:['12345']};
   return {};
  },nativeCallback:()=> 'qa-listener'};
 },{mode,product});
 let active=false,confirmed=false;
 const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
 await context.route('**/rest/v1/subscriptions*',route=>route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(active?[{id:'apple:Production:12345',product_code:'matharia',status:'active',interval:'month',current_period_end:new Date(Date.now()+86400000).toISOString(),cancel_at_period_end:false}]:[])}));
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/functions/v1/apple-subscriptions',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(route.request().method()==='POST'){
   const data=route.request().postDataJSON();assert.deepEqual(Object.keys(data),['transactionIds']);
   if(data.transactionIds.length){await page.evaluate(()=>window.__storeEvents.push({method:'server-verification'}));
    if(mode==='verify-error')return route.fulfill({status:503,headers:cors,contentType:'application/json',body:JSON.stringify({error:'Test verification unavailable. Restore purchases to retry.'})});
    active=true;confirmed=true;
   }
  }
  return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify({ready:mode!=='not-ready'})});
 });
 const row={mode,passed:false};
 try{
  await page.goto(base+'/subscriptions');await page.locator('.apple-subscriptions').waitFor();
  if(mode==='browser'){await expect(page.getByText('This browser preview cannot make purchases.',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Restore purchases'})).toBeDisabled();}
  else {
   const buy=page.getByRole('button',{name:'Subscribe with Apple'}).first();await buy.waitFor();
   if(mode==='not-ready')await expect(buy).toBeDisabled();
   else {
    await expect(buy).toBeEnabled();await page.evaluate(()=>window.__storeEvents=[]);
    if(mode==='restore')await page.getByRole('button',{name:'Restore purchases'}).click();else await buy.click();
    if(mode==='verify-error')await expect(page.getByRole('alert')).toContainText('Test verification unavailable');
    else if(mode==='pending')await expect(page.getByRole('status').filter({hasText:'Waiting for Apple approval'})).toBeVisible();
    else if(mode==='cancelled')await expect(page.getByRole('status').filter({hasText:'Purchase cancelled'})).toBeVisible();
    else await expect(page.getByRole('status').filter({hasText:'already has Matharia access'})).toBeVisible();
    const events=await page.evaluate(()=>window.__storeEvents);
    if(['purchased','restore'].includes(mode)){
     assert.ok(confirmed);assert.ok(events.findIndex(e=>e.method==='finish')>events.findIndex(e=>e.method==='server-verification'));
     if(mode==='purchased')assert.equal(events.find(e=>e.method==='purchase').options.appAccountToken,'10000000-0000-4000-8000-000000000001');
    }else{assert.equal(active,false);assert.equal(events.filter(e=>e.method==='finish').length,0);}
    await page.getByRole('button',{name:'Manage Apple subscription'}).click();assert.ok((await page.evaluate(()=>window.__storeEvents)).some(e=>e.method==='manage'));
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);row.file=mode+'.png';await page.screenshot({path:out+'/'+row.file,fullPage:true});row.passed=true;
 }catch(error){row.error=error.message;await page.screenshot({path:out+'/'+mode+'-failure.png',fullPage:true}).catch(()=>{});}
 rows.push(row);console.log(row.passed?'PASS':'FAIL','iOS subscription UI',mode,row.error||'');await writeFile(out+'/browser-checks.json',JSON.stringify(rows,null,2));await context.close();
}}finally{await browser.close();}
if(rows.some(row=>!row.passed))process.exitCode=1;
