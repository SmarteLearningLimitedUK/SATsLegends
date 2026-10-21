import { createPrivateKey, sign } from 'node:crypto';

export const IOS_BUNDLE_ID = 'com.smartelearning.satslegends';
export const IOS_APP_ID = '6825120444';
export const IOS_TEAM_ID = 'D8L3PZ8Y72';

export function signingConfiguration(env) {
  if (!/^[A-Z0-9]{10}$/.test(env.ASC_KEY_ID || '')) throw Error('Set ASC_KEY_ID to the Apple team API key ID.');
  if (!/^[a-f0-9-]{36}$/i.test(env.ASC_ISSUER_ID || '')) throw Error('Set ASC_ISSUER_ID to the Apple issuer UUID.');
  if (env.APPLE_TEAM_ID !== IOS_TEAM_ID) throw Error('APPLE_TEAM_ID must match the registered SATs Legends team.');
  if (!/^\d{1,4}(\.\d{1,4}){0,2}$/.test(env.IOS_BUILD_NUMBER || '')) throw Error('Set IOS_BUILD_NUMBER to a numeric Apple build version.');
  let key;
  try { key = createPrivateKey((env.ASC_PRIVATE_KEY_P8 || '').replaceAll('\\n', '\n')); }
  catch { throw Error('Set ASC_PRIVATE_KEY_P8 to the Apple P8 private key in the protected build environment.'); }
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw Error('Apple API key must use the P-256 curve.');
  return { keyId:env.ASC_KEY_ID, issuer:env.ASC_ISSUER_ID, teamId:env.APPLE_TEAM_ID, build:env.IOS_BUILD_NUMBER,
    privateKey:key.export({type:'pkcs8',format:'pem'}) };
}

export function connectToken(config, now=Date.now()) {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encoded({alg:'ES256',kid:config.keyId,typ:'JWT'})}.${encoded({iss:config.issuer,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+300,aud:'appstoreconnect-v1'})}`;
  return `${body}.${sign('sha256',Buffer.from(body),{key:config.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}

export function exportOptions(config, upload=false) {
  // Internal-only exports cannot be submitted for public App Store release.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>${upload ? 'upload' : 'export'}</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>${config.teamId}</string>
<key>manageAppVersionAndBuildNumber</key><false/>
<key>uploadSymbols</key><true/>
<key>testFlightInternalTestingOnly</key><true/>
</dict></plist>\n`;
}

export function archiveArguments(config, keyPath, archivePath) {
  return ['-project','native/ios/App/App.xcodeproj','-scheme','App','-configuration','Release',
    '-destination','generic/platform=iOS','-archivePath',archivePath,
    '-allowProvisioningUpdates','-authenticationKeyPath',keyPath,'-authenticationKeyID',config.keyId,'-authenticationKeyIssuerID',config.issuer,
    `DEVELOPMENT_TEAM=${config.teamId}`,'CODE_SIGN_STYLE=Automatic',`CURRENT_PROJECT_VERSION=${config.build}`,
    `PRODUCT_BUNDLE_IDENTIFIER=${IOS_BUNDLE_ID}`,'MARKETING_VERSION=1.0','archive'];
}
