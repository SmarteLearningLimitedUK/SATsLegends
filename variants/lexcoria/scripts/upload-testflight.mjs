import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { signingConfiguration, connectToken, nextBuild, exportOptions } from '../../matharia/scripts/ios-testflight-config.mjs';

const bundleId = 'com.smartelearning.lexcoria';
const appId = '6835860442';
const version = '1.0';
const internalOnly = process.env.LEXCORIA_INTERNAL_ONLY === 'true';
const project = resolve(process.argv[2], 'variants/lexcoria/native/ios/App/App.xcodeproj');
const signing = signingConfiguration(process.env);
const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) throw result.error ?? Error(command + ' exited with status ' + result.status);
  return result.stdout?.trim();
};
async function readApple(path) {
  const url = new URL(path, 'https://api.appstoreconnect.apple.com');
  if (url.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected Apple API endpoint.');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + connectToken(signing) },
    redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error('App Store Connect returned HTTP ' + response.status);
  return response.json();
}

const { data: app } = await readApple('/v1/apps/' + appId + '?fields[apps]=bundleId,name');
if (app?.id !== appId || app.attributes?.bundleId !== bundleId) {
  throw Error('The Apple app record does not match the Lexcoria upload target.');
}
const builds = [];
let endpoint = '/v1/builds?filter[app]=' + app.id + '&limit=200';
while (endpoint) {
  const page = await readApple(endpoint);
  builds.push(...page.data.map(build => build.attributes.version));
  endpoint = page.links?.next;
}
const build = nextBuild(builds, process.env.GITHUB_RUN_NUMBER, process.env.GITHUB_RUN_ATTEMPT);
const work = mkdtempSync(join(tmpdir(), 'lexcoria-signing-'));
try {
  const key = join(work, 'AuthKey_' + signing.keyId + '.p8');
  const options = join(work, 'ExportOptions.plist');
  const archive = join(work, 'Lexcoria.xcarchive');
  writeFileSync(key, signing.privateKey, { mode: 0o600 });
  writeFileSync(options, exportOptions(signing, { internalOnly }), { mode: 0o600 });
  const auth = ['-allowProvisioningUpdates', '-authenticationKeyPath', key, '-authenticationKeyID', signing.keyId, '-authenticationKeyIssuerID', signing.issuer];
  console.log('Archiving Lexcoria ' + version + ' (' + build + ') for Apple app ' + app.id);
  run('xcodebuild', ['-project', project, '-scheme', 'App', '-configuration', 'Release',
    '-destination', 'generic/platform=iOS', '-archivePath', archive, ...auth,
    'DEVELOPMENT_TEAM=' + signing.teamId, 'CODE_SIGN_STYLE=Automatic', 'CODE_SIGNING_ALLOWED=NO',
    'CURRENT_PROJECT_VERSION=' + build, 'MARKETING_VERSION=' + version, 'archive']);
  const info = join(archive, 'Products/Applications/App.app/Info.plist');
  for (const [name, expected] of [['CFBundleIdentifier', bundleId], ['CFBundleShortVersionString', version], ['CFBundleVersion', build], ['MinimumOSVersion', '15.0']]) {
    if (run('plutil', ['-extract', name, 'raw', '-o', '-', info], true) !== expected) throw Error('Archive ' + name + ' mismatch.');
  }
  const sdk = run('plutil', ['-extract', 'DTSDKName', 'raw', '-o', '-', info], true);
  if (Number(sdk.match(/^iphoneos(\d+)\./)?.[1] ?? 0) < 27) throw Error('Archive requires iOS SDK 27 or newer.');
  console.log('Archive verified with ' + sdk + ' and minimum iOS 15.0.');
  run('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportPath', join(work, 'export'),
    '-exportOptionsPlist', options, ...auth]);
  console.log('Upload accepted for ' + bundleId + ' ' + version + ' (' + build + ').');
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (internalOnly) {
  const filters = new URLSearchParams({ 'filter[app]': appId, 'filter[version]': build });
  let processing = 'PENDING';
  let previousState;
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await wait(15000);
    const { data } = await readApple('/v1/builds?' + filters);
    const [uploaded] = data;
    if (!uploaded) continue;
    const attributes = uploaded.attributes;
    processing = attributes.processingState;
    if (['FAILED', 'INVALID'].includes(processing)) throw Error('Apple processing failed for ' + build + '.');
    if (processing !== 'VALID') continue;
    if (attributes.buildAudienceType !== 'INTERNAL_ONLY') throw Error('Apple reported an unexpected build audience.');
    const detail = await readApple('/v1/builds/' + uploaded.id + '/buildBetaDetail').catch(error => {
      if (error.message.endsWith('HTTP 404')) return null;
      throw error;
    });
    const internalState = detail?.data?.attributes.internalBuildState ?? 'PENDING';
    if (internalState !== previousState) {
      console.log(JSON.stringify({ build, audience: attributes.buildAudienceType, processing, internalState }));
      previousState = internalState;
    }
    if (internalState === 'IN_BETA_TESTING') {
      ready = true;
      break;
    }
  }
  if (!ready) console.log('Apple processing: ' + processing + '. Internal testing availability is pending.');
}
