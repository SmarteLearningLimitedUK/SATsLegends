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
    let group;
    let owner;
    try {
      group = await api(`${path}?include=app`);
      owner = group.included?.find(row => row.type === 'apps' && row.id === IOS_APP_ID)
        ?? group.data.relationships?.app?.data;
    } catch (error) {
      if (!/HTTP (400|404|500)\b/.test(error.message)) throw error;
      group = await api(path);
    }
    if (!owner?.id) owner = (await api(`${path}/relationships/app`).catch(()=>({}))).data;
    if (!owner?.id) owner = (await api(`${path}/app?fields[apps]=bundleId`).catch(()=>({}))).data;
    if (group.data?.id !== id || group.data.attributes.isInternalGroup !== false || (owner?.id && owner.id !== IOS_APP_ID)) {
      throw Error('An existing external group could not be verified for this app.');
    }
    if (!owner?.id && !await listed({path},'20d5a522-2aea-45a6-a200-1884791de001')) {
      throw Error('Apple returned no app relationship or previous Matharia build for this group.');
    }
    return {id,path};
  }));
  const groups = groupChecks.flatMap(row => row.status === 'fulfilled' ? [row.value] : []);
  const groupErrors = groupChecks.flatMap((row,index) => row.status === 'rejected'
    ? [{id:target.existingBetaGroups[index],error:row.reason.message}] : []);

  async function listed({path},buildId=target.buildId) {
    let url = `${path}/relationships/builds?limit=200`;
    for (let count = 0; url; count++) {
      if (count >= 25) throw Error('Unexpected TestFlight list pagination.');
      let page;
      try { page = await api(url); }
      catch (error) {
        if (count > 0 || !/HTTP (400|403|404)\b/.test(error.message)) throw error;
        page = await api(`${path}/builds?limit=200`);
      }
      if (page.data.some(item => item.id === buildId)) return true;
      url = page.links?.next;
    }
    return false;
  }
  const assignedGroups = [];
  for (const group of groups) {
    try {
      if (!await listed(group).catch(()=>false)) {
        try {
          await api(`${buildPath}/relationships/betaGroups`, {
            method: 'POST', body: { data: [{ type: 'betaGroups', id: group.id }] },
          });
        } catch (error) {
          if (!await listed(group).catch(()=>false)) throw error;
        }
      }
      if (!await listed(group)) throw Error('Apple did not confirm the build in the group.');
      assignedGroups.push(group.id);
    } catch (error) {
      groupErrors.push({id:group.id,error:error.message});
    }
  }
  const report = { buildId: target.buildId, build: target.build, version: target.version, assignedGroups, groupErrors, externalAvailable:false };
  if (!assignedGroups.length) return report;

  let notified = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const latest = await api(`${buildPath}?include=buildBetaDetail,betaAppReviewSubmission`);
      const detail = latest.included?.find(row => row.type === 'buildBetaDetails')
        ?? (await api(`${buildPath}/buildBetaDetail`)).data;
      report.reviewState = latest.included?.find(row => row.type === 'betaAppReviewSubmissions')?.attributes.betaReviewState;
      report.externalState = detail.attributes.externalBuildState;
      report.externalAvailable = report.reviewState === 'APPROVED' && ['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING'].includes(report.externalState);
      if (report.externalAvailable || report.reviewState === 'REJECTED') break;
      if (!notified && detail.attributes.autoNotifyEnabled === false) {
        notified = true;
        await api(`/v1/buildBetaDetails/${detail.id}`, {
          method: 'PATCH', body: { data: { type: 'buildBetaDetails', id: detail.id, attributes: { autoNotifyEnabled: true } } },
        });
      }
    } catch (error) { report.statusError = error.message; }
    if (attempt < 7) await delay(15000);
  }
  return report;
}
