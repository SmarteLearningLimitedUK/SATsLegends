// Read-only metadata discovery. The protected CI job keeps the existing Apple
// private key in memory and emits only this app's product/capability metadata.
import { mkdirSync, writeFileSync } from 'node:fs';
import { signingConfiguration, connectToken, IOS_APP_ID, IOS_BUNDLE_ID } from './ios-testflight-config.mjs';
const config = signingConfiguration(process.env);
const out = 'qa-artifacts/ios-matharia/app-services';
mkdirSync(out, { recursive: true });
const report = { appId: IOS_APP_ID, bundleId: IOS_BUNDLE_ID, readOnly: true, createdAt: new Date().toISOString(), ciRun: process.env.GITHUB_RUN_ID, errors: [] };
async function get(path) {
  const url = new URL(path, 'https://api.appstoreconnect.apple.com');
  if (url.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected API origin.');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${connectToken(config)}` }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  const body = await response.json();
  if (!response.ok) throw Error(`Apple ${url.pathname}: HTTP ${response.status} ${body.errors?.[0]?.code ?? ''}`);
  return body;
}
async function all(path) {
  const rows = [];
  for (let pages = 0; path && pages < 25; pages++) { const result = await get(path); rows.push(...result.data); path = result.links?.next; }
  if (path) throw Error('Unexpected metadata pagination.');
  return rows;
}
try {
  const app = (await get(`/v1/apps/${IOS_APP_ID}`)).data;
  if (app.attributes.bundleId !== IOS_BUNDLE_ID) throw Error('Wrong existing Apple app.');
  const groups = await all(`/v1/apps/${IOS_APP_ID}/subscriptionGroups?limit=200`);
  report.subscriptions = [];
  for (const group of groups) {
    const subscriptions = await all(`/v1/subscriptionGroups/${group.id}/subscriptions?limit=200`);
    report.subscriptions.push(...subscriptions.map(row => ({ groupId: group.id, id: row.id, productId: row.attributes.productId, name: row.attributes.name, state: row.attributes.state, period: row.attributes.subscriptionPeriod })));
  }
  try {
    const bundles = await all(`/v1/bundleIds?filter[identifier]=${encodeURIComponent(IOS_BUNDLE_ID)}&limit=200`);
    if (bundles.length !== 1 || bundles[0].attributes.identifier !== IOS_BUNDLE_ID) throw Error('Existing bundle record could not be identified uniquely.');
    const capabilities = await all(`/v1/bundleIds/${bundles[0].id}/bundleIdCapabilities?limit=200`);
    report.appleSignInEnabled = capabilities.some(row => row.attributes.capabilityType === 'SIGN_IN_WITH_APPLE');
    report.bundleRecordId = bundles[0].id;
  } catch (error) { report.errors.push(error.message); }
  try {
    const infos = await all(`/v1/apps/${IOS_APP_ID}/appInfos?limit=200`);
    report.privacyPolicyUrls = [];
    for (const info of infos) {
      const localizations = await all(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=200`);
      report.privacyPolicyUrls.push(...localizations.map(row => ({ locale: row.attributes.locale, url: row.attributes.privacyPolicyUrl })).filter(row => row.url));
    }
  } catch (error) { report.errors.push(error.message); }
  report.success = true;
  console.log(JSON.stringify({ appId: report.appId, subscriptions: report.subscriptions.length, appleSignInEnabled: report.appleSignInEnabled, metadataReadOnly: true }));
} catch (error) { report.success = false; report.errors.push(error.message); process.exitCode = 1; }
finally { writeFileSync(`${out}/result.json`, JSON.stringify(report, null, 2) + '\n'); }
