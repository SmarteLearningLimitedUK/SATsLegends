import { connectToken, signingConfiguration } from '../../matharia/scripts/ios-testflight-config.mjs';

const appId = '6835860442';
const bundleId = 'com.smartelearning.lexcoria';
const internal = process.env.LEXCORIA_INTERNAL_BUILD === 'true';
const buildNumber = internal ? '100.87.1' : '100.82.1';
const groupName = 'Lexcoria Closed Beta';
const signing = signingConfiguration(process.env);
const origin = 'https://api.appstoreconnect.apple.com';

async function api(path, method = 'GET', data) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw Error('Unexpected App Store Connect API origin.');
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + connectToken(signing),
      ...(data && { 'Content-Type': 'application/json' }),
    },
    body: data ? JSON.stringify({ data }) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = String(payload.errors?.[0]?.code ?? '').replace(/[^A-Z0-9_.-]/gi, '');
    throw Error(method + ' ' + url.pathname + ' returned HTTP ' + response.status + ' ' + code);
  }
  return response.status === 204 ? null : response.json();
}

async function list(path) {
  const records = [];
  for (let page = 0; path; page++) {
    if (page === 25) throw Error('Unexpected App Store Connect pagination.');
    const response = await api(path);
    records.push(...response.data);
    path = response.links?.next;
  }
  return records;
}

async function enablePersonalTesting(appPath, buildPath, buildId) {
  const groups = (await list(appPath + '/betaGroups')).filter(group => group.attributes.isInternalGroup === true);
  const personal = groups.filter(group => group.attributes.name.toLowerCase() === 'lexcoria personal testing');
  const candidates = personal.length ? personal : groups;
  const membership = await Promise.all(candidates.map(async group => ({
    group,
    count: (await list('/v1/betaGroups/' + group.id + '/relationships/betaTesters')).length,
  })));
  const populated = membership.filter(item => item.count > 0);
  if (populated.length !== 1 || populated[0].count !== 1) {
    throw Error('Could not identify a unique personal internal group with exactly one existing tester.');
  }
  const { group } = populated[0];
  const groupPath = '/v1/betaGroups/' + group.id;
  const { data: app } = await api(groupPath + '/app');
  if (app.id !== appId || group.attributes.publicLinkEnabled === true) throw Error('Wrong group for personal testing.');
  const isAssigned = async () => group.attributes.hasAccessToAllBuilds === true ||
    (await list(groupPath + '/builds?fields[builds]=version')).some(build => build.id === buildId);
  if (!await isAssigned()) {
    await api(buildPath + '/relationships/betaGroups', 'POST', [{ type: 'betaGroups', id: group.id }]);
  }
  for (let attempt = 0; attempt < 12; attempt++) {
    const { data: beta } = await api(buildPath + '/buildBetaDetail');
    const assigned = await isAssigned();
    const state = beta.attributes.internalBuildState;
    if (assigned && state === 'IN_BETA_TESTING') {
      console.log(JSON.stringify({ build: buildNumber, internal: state, group: group.attributes.name, assigned, testers: 1 }));
      return;
    }
    if (attempt === 11) throw Error('Internal group assignment ' + assigned + ', Apple state ' + state);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

async function submit() {
  const { data: app } = await api('/v1/apps/' + appId + '?fields[apps]=bundleId,name');
  if (app.id !== appId || app.attributes.bundleId !== bundleId) throw Error('Wrong Apple app.');
  const builds = await list('/v1/builds?filter[app]=' + appId + '&filter[version]=' + buildNumber);
  if (builds.length !== 1) throw Error('Expected one matching Lexcoria build. Found ' + builds.length + '.');
  const build = builds[0];
  const path = '/v1/builds/' + build.id;
  const { data: release } = await api(path + '/preReleaseVersion');
  if (build.attributes.version !== buildNumber || release.attributes.version !== '1.0' ||
      release.attributes.platform !== 'IOS') throw Error('Wrong Lexcoria version or platform.');
  const { data: beta } = await api(path + '/buildBetaDetail');
  const status = {
    build: buildNumber,
    processing: build.attributes.processingState,
    audience: build.attributes.buildAudienceType,
    external: beta.attributes.externalBuildState,
    expired: build.attributes.expired,
    usesNonExemptEncryption: build.attributes.usesNonExemptEncryption,
  };
  console.log(JSON.stringify(status));
  if (internal) {
    if (status.processing !== 'VALID' || status.expired || status.usesNonExemptEncryption !== false) {
      throw Error('Build must be processed, unexpired and cleared for encryption before it can be added.');
    }
    await enablePersonalTesting('/v1/apps/' + appId, path, build.id);
    return;
  }
  if (status.processing !== 'VALID' || status.expired || status.audience !== 'APP_STORE_ELIGIBLE') {
    throw Error('Build has to be valid and eligible for external testing.');
  }
  if (status.external === 'MISSING_EXPORT_COMPLIANCE') throw Error('Export compliance must be completed in App Store Connect.');

  const { data: detail } = await api('/v1/apps/' + appId + '/betaAppReviewDetail');
  const locales = await list('/v1/apps/' + appId + '/betaAppLocalizations');
  const missing = ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone'].filter(
    key => !String(detail?.attributes?.[key] ?? '').trim(),
  );
  if (!locales.some(locale => locale.attributes.description && locale.attributes.feedbackEmail)) {
    missing.push('beta description and feedback email');
  }
  if (missing.length) throw Error('Missing Lexcoria TestFlight information: ' + missing.join(', '));

  const groups = await list('/v1/apps/' + appId + '/betaGroups');
  const externalGroups = groups.filter(group => group.attributes.isInternalGroup === false);
  const named = externalGroups.filter(group => group.attributes.name === groupName);
  const privateGroups = externalGroups.filter(group => group.attributes.publicLinkEnabled === false);
  if (named.length > 1 || (!named.length && privateGroups.length > 1)) throw Error('More than one closed group matches.');
  let group = named[0] ?? privateGroups[0];
  if (!group) {
    ({ data: group } = await api('/v1/betaGroups', 'POST', {
      type: 'betaGroups',
      attributes: { name: groupName, isInternalGroup: false, publicLinkEnabled: false, hasAccessToAllBuilds: false },
      relationships: { app: { data: { type: 'apps', id: appId } } },
    }));
  }
  const { data: verifiedGroup } = await api('/v1/betaGroups/' + group.id);
  if (verifiedGroup.attributes.isInternalGroup !== false || verifiedGroup.attributes.publicLinkEnabled !== false) {
    throw Error('Group must be external with its public link disabled.');
  }
  const { data: groupApp } = await api('/v1/betaGroups/' + group.id + '/app');
  if (groupApp.id !== appId) throw Error('Wrong app for external group.');

  const { data: existingReview } = await api(path + '?include=betaAppReviewSubmission');
  const reviewId = existingReview.relationships?.betaAppReviewSubmission?.data?.id;
  const review = reviewId
    ? (await api('/v1/betaAppReviewSubmissions/' + reviewId)).data
    : (await api('/v1/betaAppReviewSubmissions', 'POST', {
      type: 'betaAppReviewSubmissions',
      relationships: { build: { data: { type: 'builds', id: build.id } } },
    })).data;
  console.log(JSON.stringify({ review: review.attributes.betaReviewState, submissionId: review.id }));

  const groupPath = '/v1/betaGroups/' + group.id;
  if (!(await list(groupPath + '/builds')).some(candidate => candidate.id === build.id)) {
    await api(groupPath + '/relationships/builds', 'POST', [{ type: 'builds', id: build.id }]);
  }
  const assigned = (await list(groupPath + '/builds')).some(candidate => candidate.id === build.id);
  if (!assigned) throw Error('Build assignment could not be verified.');
  console.log(JSON.stringify({ group: verifiedGroup.attributes.name, assigned, publicLinkEnabled: false }));
}

await submit().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
