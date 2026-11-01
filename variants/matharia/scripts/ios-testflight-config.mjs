// Identity and automatic-signing method retrieved from this repository's successful
// 98a0bbd6c705647bcc5e228cf94bda4bcb31eaba TestFlight workflow, not another project.
import {createPrivateKey, sign} from 'node:crypto';

export const IOS_BUNDLE_ID = 'com.smartelearning.satslegends';
export const IOS_APP_ID = '6825120444';
export const IOS_TEAM_ID = 'D8L3PZ8Y72';
export const NATIVE_PROJECT = 'variants/matharia/native/ios/App/App.xcodeproj';

export function signingConfiguration(env) {
  if (!/^[A-Z0-9]{10}$/.test(env.ASC_KEY_ID || '')) throw Error('Missing valid ASC_KEY_ID in ios-testflight.');
  if (!/^[a-f0-9-]{36}$/i.test(env.ASC_ISSUER_ID || '')) throw Error('Missing valid ASC_ISSUER_ID in ios-testflight.');
  if (env.APPLE_TEAM_ID !== IOS_TEAM_ID) throw Error('Signing team must match the existing SATs Legends team.');
  let key;
  try {key = createPrivateKey((env.ASC_PRIVATE_KEY_P8 || '').replaceAll('\\n', '\n'));}
  catch {throw Error('Missing valid ASC_PRIVATE_KEY_P8 in ios-testflight.');}
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw Error('Apple key must use P-256.');
  return {keyId:env.ASC_KEY_ID, issuer:env.ASC_ISSUER_ID, teamId:env.APPLE_TEAM_ID,
    privateKey:key.export({type:'pkcs8', format:'pem'})};
}

export function connectToken(config, now=Date.now()) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({alg:'ES256', kid:config.keyId, typ:'JWT'})}.${encode({iss:config.issuer,
    iat:Math.floor(now/1000), exp:Math.floor(now/1000)+300, aud:'appstoreconnect-v1'})}`;
  return `${body}.${sign('sha256', Buffer.from(body), {key:config.privateKey, dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}

export function nextBuild(existing, runNumber, attempt) {
  const run = Number(runNumber), retry = Number(attempt);
  if (!Number.isSafeInteger(run) || run < 1 || !Number.isSafeInteger(retry) || retry < 1 || retry > 99) throw Error('Invalid CI run identity.');
  const proposed = [100+Math.floor((run-1)/99), (run-1)%99+1, retry];
  const compare = (a,b) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
  let highest = [0,0,0];
  for (const value of existing) {
    if (!/^\d+(\.\d+){0,2}$/.test(value)) continue;
    const parts = value.split('.').map(Number); while (parts.length < 3) parts.push(0);
    if (compare(parts,highest)>0) highest = parts;
  }
  if (compare(proposed,highest)>0) highest = proposed;
  else {
    highest[2]++;
    if (highest[2]>99) {highest[2]=0; highest[1]++;}
    if (highest[1]>99) {highest[1]=0; highest[0]++;}
  }
  if (highest[0]>9999 || highest[1]>99 || highest[2]>99) throw Error('Existing Apple build numbering needs review.');
  return highest.join('.');
}

export function exportOptions(config) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>${config.teamId}</string>
<key>manageAppVersionAndBuildNumber</key><false/>
<key>uploadSymbols</key><true/>
<key>testFlightInternalTestingOnly</key><true/>
</dict></plist>\n`;
}
