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
const personalGroupName = 'Lexcoria Personal Testing';
const project = resolve(process.argv[2], 'variants/lexcoria/native/ios/App/App.xcodeproj');
const signing = signingConfiguration(process.env);
const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) throw result.error ?? Error(command + ' exited with status ' + result.status);
  return result.stdout?.trim();
};
async function apple(path, data) {
  const url = new URL(path, 'https://api.appstoreconnect.apple.com');
  if (url.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected Apple API endpoint.');
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + connectToken(signing),
        ...(data && { 'Content-Type': 'application/json' }),
      },
      body: data ? JSON.stringify({ data }) : undefined,
      redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (response.ok) return response.status === 204 ? null : response.json();
    if (data || attempt === 3 || (response.status !== 429 && response.status < 500)) {
      throw Error('App Store Connect ' + url.pathname + ' returned HTTP ' + response.status);
    }
    await wait(2000 * 2 ** attempt);
  }
}

async function listApple(path) {
  const records = [];
  for (let page = 0; path; page++) {
    if (page === 25) throw Error('Unexpected App Store Connect pagination.');
    const result = await apple(path);
    if (!Array.isArray(result?.data)) throw Error('Invalid list response from App Store Connect.');
    records.push(...result.data);
    path = result.links?.next;
  }
  return records;
}

async function checkGroups(report = false) {
  const fields = 'name,isInternalGroup,publicLinkEnabled,hasAccessToAllBuilds';
  const groups = await listApple('/v1/apps/' + appId + '/betaGroups?limit=200&fields[betaGroups]=' + fields);
  const internal = groups.filter(group => group.attributes.isInternalGroup === true);
  const matches = internal.filter(group => group.attributes.name === personalGroupName);
  if (matches.length > 1 || matches[0]?.attributes.publicLinkEnabled === true) {
    throw Error('The exact Lexcoria personal testing group is ambiguous or has a public link.');
  }
  const otherGroups = internal.filter(group => group.id !== matches[0]?.id);
  const automatic = otherGroups.filter(group => group.attributes.hasAccessToAllBuilds === true);
  if (report) {
    const manual = otherGroups.filter(group => group.attributes.hasAccessToAllBuilds === false).length;
    console.log(JSON.stringify({ personalGroupFound: matches.length === 1, otherAutomaticGroups: automatic.length,
      otherManualGroups: manual, otherGroupsWithUnreportedSettings: otherGroups.length - automatic.length - manual }));
  }
  if (automatic.length > 0) {
    throw Error('Apple reports automatic distribution for another Lexcoria internal group. Upload restricted to ' + personalGroupName + '.');
  }
  return { personal: matches[0], internal };
}

async function verifyPersonalTesting(buildNumber) {
  const query = new URLSearchParams({ 'filter[app]': appId, 'filter[version]': buildNumber });
  for (let attempt = 0; attempt < 32; attempt++) {
    if (attempt > 0) await wait(15000);
    const builds = await listApple('/v1/builds?' + query);
    if (builds.length > 1) throw Error('Expected a unique new Lexcoria build.');
    const [build] = builds;
    const state = build?.attributes.processingState ?? 'PENDING';
    if (attempt % 4 === 0) console.log('Apple processing for ' + buildNumber + ': ' + state);
    if (state === 'FAILED' || state === 'INVALID') throw Error('Apple rejected Lexcoria build ' + buildNumber + '.');
    if (state !== 'VALID') continue;
    if (build.attributes.buildAudienceType !== 'INTERNAL_ONLY' || build.attributes.expired) {
      throw Error('The new Lexcoria build is not eligible for internal-only testing.');
    }
    if (build.attributes.usesNonExemptEncryption !== false) throw Error('Apple requires export compliance for ' + buildNumber + '.');
    const path = '/v1/builds/' + build.id;
    const { data: release } = await apple(path + '/preReleaseVersion');
    if (release?.attributes.version !== version || release?.attributes.platform !== 'IOS') throw Error('Wrong version or platform.');
    const { personal, internal } = await checkGroups();
    if (!personal) throw Error('Upload processed. The exact group ' + personalGroupName + ' was not found.');
    const groupPath = '/v1/betaGroups/' + personal.id;
    const testers = await listApple(groupPath + '/relationships/betaTesters');
    if (testers.length === 0) throw Error('The personal testing group has no active invitations or tester records.');
    const groupHasBuild = async group => group.attributes.hasAccessToAllBuilds === true ||
      (await listApple('/v1/betaGroups/' + group.id + '/builds?fields[builds]=version')).some(item => item.id === build.id);
    const otherGroups = internal.filter(group => group.id !== personal.id);
    if ((await Promise.all(otherGroups.map(groupHasBuild))).some(Boolean)) {
      throw Error('The build has an unexpected internal group assignment.');
    }
    if (!await groupHasBuild(personal)) {
      await apple(path + '/relationships/betaGroups', [{ type: 'betaGroups', id: personal.id }]);
    }
    const betaResult = await apple(path + '/buildBetaDetail').catch(error => {
      if (error.message.endsWith('HTTP 404')) return null;
      throw error;
    });
    const beta = betaResult?.data;
    if (await groupHasBuild(personal) && beta?.attributes.internalBuildState === 'IN_BETA_TESTING') {
      console.log(JSON.stringify({ build: buildNumber, processing: state, audience: 'INTERNAL_ONLY',
        internal: beta.attributes.internalBuildState, group: personal.attributes.name, testers: testers.length, publicLinkEnabled: false }));
      return;
    }
  }
  throw Error('Upload accepted. Apple did not confirm readiness and the exact group assignment within eight minutes.');
}

const { data: app } = await apple('/v1/apps/' + appId + '?fields[apps]=bundleId,name');
if (app?.id !== appId || app.attributes?.bundleId !== bundleId) {
  throw Error('The Apple app record does not match the Lexcoria upload target.');
}
if (internalOnly) {
  await checkGroups(true);
}
const builds = (await listApple('/v1/builds?filter[app]=' + app.id + '&limit=200')).map(build => build.attributes.version);
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
  for (const [name, expected] of [['CFBundleIdentifier', bundleId], ['CFBundleShortVersionString', version], ['CFBundleVersion', build]]) {
    if (run('plutil', ['-extract', name, 'raw', '-o', '-', info], true) !== expected) throw Error('Archive ' + name + ' mismatch.');
  }
  run('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportPath', join(work, 'export'),
    '-exportOptionsPlist', options, ...auth]);
  console.log('Upload accepted for ' + bundleId + ' ' + version + ' (' + build + '). Check Apple processing before distributing.');
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (internalOnly) await verifyPersonalTesting(build);
