import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {appleProducts,appleServerToken,fetchAppleEntitlements,transactionIdsFrom,type AppleServerConfig} from '../supabase/functions/_shared/appleSubscriptions.ts';

const now=Date.now(),parent='20000000-0000-4000-8000-000000000001';
const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const privateKey=Buffer.from(await crypto.subtle.exportKey('pkcs8',key.privateKey)).toString('base64');
const config:AppleServerConfig={issuer:'test-issuer',keyId:'test-key',privateKey:`-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`,bundleId:'com.smartelearning.satslegends',environment:'Production'};
const token=await appleServerToken(config,now),[header,payload,signature]=token.split('.');
assert.equal(JSON.parse(Buffer.from(payload,'base64url').toString()).aud,'appstoreconnect-v1');
assert.equal(JSON.parse(Buffer.from(payload,'base64url').toString()).exp-Math.floor(now/1000),300);
assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key.publicKey,Buffer.from(signature,'base64url'),new TextEncoder().encode(`${header}.${payload}`)),true);
assert.deepEqual(transactionIdsFrom({transactionIds:['12','12','34']}),['12','34']);
for(const invalid of [{transactionIds:['https://bad.invalid']},{transactionIds:[] ,active:true},{transactionIds:[12]},{transactionIds:Array(26).fill('12')},null])assert.throws(()=>transactionIdsFrom(invalid));
const monthly=Object.keys(appleProducts)[0];
const base={bundleId:config.bundleId,environment:'Production',appAccountToken:parent,productId:monthly,originalTransactionId:'12345',expiresDate:now+3600000};
const jws=(data:unknown)=>`apple-api.${Buffer.from(JSON.stringify(data)).toString('base64url')}.response`;
let calls=0;
function apple(transaction:Record<string,unknown>=base,status=1,renewal?:unknown):typeof fetch {
 return (async (input,init)=>{
  calls++;assert.equal(String(input),'https://api.storekit.itunes.apple.com/inApps/v1/subscriptions/12345');
  assert.equal(init?.redirect,'error');assert.ok(init?.headers?.['Authorization'].startsWith('Bearer '));
  return Response.json({bundleId:config.bundleId,environment:config.environment,data:[{lastTransactions:[{status,signedTransactionInfo:jws(transaction),...(renewal?{signedRenewalInfo:jws(renewal)}:{})}]}]});
 }) as typeof fetch;
}
const rows=await fetchAppleEntitlements(['12345'],parent,config,apple(),now);
assert.equal(rows[0].status,'active');assert.equal(rows[0].id,'apple:Production:12345');assert.equal(rows[0].parent_id,parent);
for(const [transaction,status] of [[{...base,expiresDate:now-1},1],[base,2],[{...base,revocationDate:now-1},1],[base,5]] as const){
 assert.equal((await fetchAppleEntitlements(['12345'],parent,config,apple(transaction,status),now))[0].status,'canceled');
}
for(const bad of [{...base,appAccountToken:'other-parent'},{...base,bundleId:'other-app'},{...base,environment:'Sandbox'},{...base,originalTransactionId:'bad'},{...base,expiresDate:'forever'}])await assert.rejects(()=>fetchAppleEntitlements(['12345'],parent,config,apple(bad as typeof base),now));
const grace=await fetchAppleEntitlements(['12345'],parent,config,apple({...base,expiresDate:now-1},4,{originalTransactionId:'12345',gracePeriodExpiresDate:now+60000}),now);
assert.equal(grace[0].status,'active');
assert.equal((await fetchAppleEntitlements(['12345'],parent,config,apple(base,1,{originalTransactionId:'12345',autoRenewStatus:0}),now))[0].cancel_at_period_end,true);
await assert.rejects(()=>fetchAppleEntitlements(['12345'],parent,config,apple(base,4,{originalTransactionId:'wrong',gracePeriodExpiresDate:now+60000}),now));
await assert.rejects(()=>fetchAppleEntitlements(['12345'],parent,config,(async()=>new Response('',{status:500})) as typeof fetch,now));
assert.equal((await fetchAppleEntitlements(['12345'],parent,config,apple({...base,productId:'unrelated-product'}),now)).length,0);
const swift=readFileSync('native/ios/App/App/LegendsStorePlugin.swift','utf8');
for(const id of Object.keys(appleProducts))assert.ok(swift.includes(id));
assert.ok(swift.includes('case .verified'));assert.ok(swift.includes('Transaction.unfinished'));
const project=readFileSync('native/ios/App/App.xcodeproj/project.pbxproj','utf8');
assert.equal((project.match(/IPHONEOS_DEPLOYMENT_TARGET = 16.0/g)||[]).length,4);
assert.ok(project.includes('LegendsStorePlugin.swift in Sources'));
console.log(`PASS Apple entitlement preparation: signed server JWT; ${calls} Apple API fixtures; account/app/environment binding; input bounds; expiry/refund/grace checks; native SKU and target alignment. Native Swift compilation still requires Xcode.`);
