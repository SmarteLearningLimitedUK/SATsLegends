import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {IOS_APP_ID, IOS_BUNDLE_ID} from './ios-testflight-config.mjs';

export function subscriptionConfiguration(root = process.cwd()) {
  const catalog = JSON.parse(readFileSync(resolve(root, 'variants/matharia/release/subscriptions.json'), 'utf8'));
  const plist = readFileSync(resolve(root, 'variants/matharia/native/ios/App/App/Info.plist'), 'utf8');
  const array = plist.match(/<key>MathariaSubscriptionProductIDs<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1];
  const configured = [...(array || '').matchAll(/<string>([^<]+)<\/string>/g)].map(match => match[1]);
  validateSubscriptionConfiguration(catalog, configured);
  return catalog;
}

export function validateSubscriptionConfiguration(catalog, configured) {
  if (catalog.schema !== 1 || catalog.appId !== IOS_APP_ID || catalog.bundleId !== IOS_BUNDLE_ID || !/^\d+$/.test(catalog.groupId)) throw Error('Invalid subscription app identity.');
  const ids = catalog.products?.map(product => product.id) || [];
  if (ids.length !== 2 || new Set(ids).size !== 2 || configured.length !== 2 || new Set(configured).size !== 2 || ids.some(id => !configured.includes(id))) throw Error('Native subscription product IDs must match the two verified products.');
  if (catalog.products.some(product => !/^\d+$/.test(product.appleId) || !['ONE_MONTH','ONE_YEAR'].includes(product.period))) throw Error('Invalid verified subscription metadata.');
}

// Read only: verify ownership and duration before signing/uploading any archive.
export async function verifyLiveSubscriptions(api, catalog) {
  const groups = await api(`/v1/apps/${IOS_APP_ID}/subscriptionGroups?limit=200`);
  if (!groups.data?.some(group => group.id === catalog.groupId)) throw Error('Subscription group does not belong to this Apple app.');
  const rows = await api(`/v1/subscriptionGroups/${catalog.groupId}/subscriptions?limit=200`);
  for (const expected of catalog.products) {
    const actual = rows.data?.find(product => product.id === expected.appleId);
    if (actual?.attributes.productId !== expected.id || actual.attributes.subscriptionPeriod !== expected.period) throw Error(`Apple product identity/duration mismatch: ${expected.id}`);
    if (['REMOVED_FROM_SALE','DEVELOPER_REMOVED_FROM_SALE','REJECTED'].includes(actual.attributes.state)) throw Error(`Apple subscription is unavailable: ${expected.id}`);
  }
  return catalog.products.map(product => ({id:product.id, appleId:product.appleId, period:product.period}));
}
