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
const transient = error => /HTTP (429|5\d\d)\b/.test(String(error.message));

export async function verifyLiveSubscriptions(api, catalog) {
  let groups;
  try {
    groups = (await api(`/v1/apps/${IOS_APP_ID}/relationships/subscriptionGroups?limit=200`)).data;
  } catch (error) {
    if (!transient(error)) throw error;
    const response = await api(`/v1/apps/${IOS_APP_ID}?include=subscriptionGroups&fields[subscriptionGroups]=referenceName`);
    groups = response.data.relationships?.subscriptionGroups?.data ?? response.included;
  }
  if (!groups?.some(group => group.type === 'subscriptionGroups' && group.id === catalog.groupId)) {
    throw Error('Subscription group does not belong to this Apple app.');
  }

  const matching = await Promise.all(catalog.products.map(async expected => {
    const params = new URLSearchParams({ include: 'group', 'fields[subscriptions]': 'productId,subscriptionPeriod,state,group' });
    const response = await api(`/v1/subscriptions/${expected.appleId}?${params}`);
    const record = response.data;
    const groupId = record.relationships?.group?.data?.id ?? response.included?.find(group => group.type === 'subscriptionGroups')?.id;
    if (record.id !== expected.appleId || record.type !== 'subscriptions' || groupId !== catalog.groupId ||
        record.attributes.productId !== expected.id || record.attributes.subscriptionPeriod !== expected.period) {
      throw Error(`Apple product identity, group or duration mismatch: ${expected.id}`);
    }
    if (['REMOVED_FROM_SALE','DEVELOPER_REMOVED_FROM_SALE','REJECTED'].includes(record.attributes.state)) {
      throw Error(`Apple subscription is unavailable: ${expected.id}`);
    }
    return { id: expected.id, appleId: expected.appleId, period: expected.period };
  }));
  return matching;
}
