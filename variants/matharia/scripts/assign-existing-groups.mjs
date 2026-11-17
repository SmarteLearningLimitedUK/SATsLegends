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
  const groupChecks = await Promise.allSettled(target.existingBetaGroups.map(async id => {
    const path = `/v1/betaGroups/${encodeURIComponent(id)}`;
    const [group,owner] = await Promise.all([api(path), api(`${path}/app`)]);
    if (group.data.id !== id || group.data.attributes.isInternalGroup !== false || owner.data.id !== IOS_APP_ID) {
      throw Error('An existing external group could not be verified for this app.');
    }
    return {id,path};
  }));
  const groups = groupChecks.flatMap(row => row.status === 'fulfilled' ? [row.value] : []);
  const groupErrors = groupChecks.flatMap((row,index) => row.status === 'rejected'
    ? [{id:target.existingBetaGroups[index],error:row.reason.message}] : []);
  const current = (await api(`${buildPath}/buildBetaDetail`)).data;
  if (groups.length && !current.attributes.autoNotifyEnabled) {
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
  const assignedGroups = [];
  for (const group of groups) {
    try {
      if (!await listed(group)) {
        try {
          await api(`${group.path}/relationships/builds`, {
            method: 'POST', body: { data: [{ type: 'builds', id: target.buildId }] },
          });
        } catch (error) {
          if (!await listed(group)) throw error;
        }
      }
      if (!await listed(group)) throw Error('Apple did not confirm the build in the group.');
      assignedGroups.push(group.id);
    } catch (error) {
      groupErrors.push({id:group.id,error:error.message});
    }
  }
  const report = { buildId: target.buildId, build: target.build, version: target.version, assignedGroups, groupErrors };
  if (!assignedGroups.length) return {...report,externalAvailable:false};
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
