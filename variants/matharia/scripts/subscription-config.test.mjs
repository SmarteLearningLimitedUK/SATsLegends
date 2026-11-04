import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionConfiguration,validateSubscriptionConfiguration,verifyLiveSubscriptions} from './subscription-config.mjs';
import {exportOptions,IOS_TEAM_ID} from './ios-testflight-config.mjs';
const catalog = subscriptionConfiguration();
const ids = catalog.products.map(product=>product.id);
test('release export is eligible for App Store review without submitting review',()=>{
  assert.match(exportOptions({teamId:IOS_TEAM_ID}),/<key>testFlightInternalTestingOnly<\/key><false\/>/);
  assert.match(exportOptions({teamId:IOS_TEAM_ID},{internalOnly:true}),/<key>testFlightInternalTestingOnly<\/key><true\/>/);
});
test('empty, duplicate, stale or foreign native IDs fail closed',()=>{
  for(const configured of [[],[ids[0],ids[0]],['other',ids[1]]]) assert.throws(()=>validateSubscriptionConfiguration(catalog,configured));
  assert.throws(()=>validateSubscriptionConfiguration({...catalog,appId:'other'},ids));
});
test('live product check verifies group ownership, product IDs and duration',async()=>{
  const rows = catalog.products.map(product=>({id:product.appleId,attributes:{productId:product.id,subscriptionPeriod:product.period,state:'READY_TO_SUBMIT'}}));
  const api=async path=>({data:path.includes('/apps/')?[{id:catalog.groupId}]:rows});
  assert.equal((await verifyLiveSubscriptions(api,catalog)).length,2);
  rows[1].attributes.subscriptionPeriod='ONE_MONTH';
  await assert.rejects(verifyLiveSubscriptions(api,catalog),/identity\/duration mismatch/);
  await assert.rejects(verifyLiveSubscriptions(async()=>({data:[]}),catalog),/does not belong/);
});
