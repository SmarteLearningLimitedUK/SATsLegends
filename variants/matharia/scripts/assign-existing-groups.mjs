import { setTimeout as delay } from 'node:timers/promises';
import { IOS_APP_ID, IOS_BUNDLE_ID } from './ios-testflight-config.mjs';

export async function assignExistingGroups({api,target}) {
  if (target.appId !== IOS_APP_ID || target.bundleId !== IOS_BUNDLE_ID || !target.buildId ||
      !Array.isArray(target.existingBetaGroups) || target.existingBetaGroups.length !== 3 ||
      new Set(target.existingBetaGroups).size !== target.existingBetaGroups.length) {
    throw Error('An exact uploaded build and three existing tester groups are required.');
  }
  const buildPath = `/v1/builds/${target.buildId}`;
  const build = await api(`${buildPath}?include=app,preReleaseVersion,betaAppReviewSubmission`);
  const app = build.included?.find(item => item.type === 'apps' && item.id === IOS_APP_ID);
  const prerelease = build.included?.find(item => item.type === 'preReleaseVersions' && item.id === build.data.relationships?.preReleaseVersion?.data?.id);
  if (app?.attributes.bundleId !== IOS_BUNDLE_ID || build.data.id !== target.buildId ||
      build.data.relationships?.app?.data?.id !== IOS_APP_ID ||
      prerelease?.attributes.version !== target.version || build.data.attributes.version !== target.build ||
      build.data.attributes.processingState !== 'VALID' || build.data.attributes.expired ||
      build.data.attributes.buildAudienceType !== 'APP_STORE_ELIGIBLE') {
    throw Error('Unexpected Apple app, build or distribution audience.');
  }
  const groups = await Promise.all(target.existingBetaGroups.map(async id => {
    const path = `/v1/betaGroups/${encodeURIComponent(id)}`;
    const [group,owner] = await Promise.all([api(path), api(`${path}/app`)]);
    if (group.data.id !== id || group.data.attributes.isInternalGroup !== false || owner.data.id !== IOS_APP_ID) {
      throw Error('One of the pinned external tester groups has moved.');
    }
    return { id, path };
  }));
  const current = (await api(`${buildPath}/buildBetaDetail`)).data;
  if (!current.attributes.autoNotifyEnabled) {
    await api(`/v1/buildBetaDetails/${current.id}`, {
      method: 'PATCH', body: { data: { type: 'buildBetaDetails', id: current.id, attributes: { autoNotifyEnabled: true } } },
    });
  }
  async function listed({path}) {
    let url = `${path}/builds?limit=200`;
    for (let count = 0; url; count++) {
      if (count >= 25) throw Error('Unexpected TestFlight list pagination.');
      const page = await api(url);
      if (page.data.some(item => item.id === target.buildId)) return true;
      url = page.links?.next;
    }
    return false;
  }
  for (const group of groups) {
    if (!await listed(group)) {
      await api(`${group.path}/relationships/builds`, {
        method: 'POST', body: { data: [{ type: 'builds', id: target.buildId }] },
      });
    }
    if (!await listed(group)) throw Error('Apple did not confirm the new build in a tester group.');
  }
  const report = { buildId: target.buildId, build: target.build, version: target.version, assignedGroups: groups.map(group => group.id) };
  for (let attempt = 0; attempt < 12; attempt++) {
    const [submission, detail] = await Promise.all([
      api(`${buildPath}?include=betaAppReviewSubmission`), api(`${buildPath}/buildBetaDetail`),
    ]);
    report.reviewState = submission.included?.find(item => item.type === 'betaAppReviewSubmissions')?.attributes.betaReviewState;
    report.externalState = detail.data.attributes.externalBuildState;
    report.externalAvailable = report.reviewState === 'APPROVED' && ['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING'].includes(report.externalState);
    if (report.externalAvailable || report.reviewState === 'REJECTED' || attempt === 11) break;
    await delay(25_000);
  }
  return report;
}
