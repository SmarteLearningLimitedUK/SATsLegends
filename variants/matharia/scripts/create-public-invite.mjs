import { constants, createPublicKey, publicEncrypt } from 'node:crypto';
import { IOS_APP_ID, IOS_BUNDLE_ID } from './ios-testflight-config.mjs';

const GROUP_NAME = 'Matharia One-Spot Beta 2';

export async function createPublicInvite({ api, target }) {
  if (target.appId !== IOS_APP_ID || target.bundleId !== IOS_BUNDLE_ID || !target.buildId) {
    throw Error('Public link requires a verified Matharia build.');
  }
  const key = createPublicKey(target.publicInvite.deliveryKey);
  if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) {
    throw Error('Invalid invite delivery key.');
  }
  const all = async first => {
    const records = [];
    let path = first;
    for (let page = 0; path; page++) {
      if (page >= 25) throw Error('Unexpected beta group pagination.');
      const result = await api(path);
      records.push(...result.data);
      path = result.links?.next;
    }
    return records;
  };
  const app = (await api(`/v1/apps/${IOS_APP_ID}`)).data;
  if (app.id !== IOS_APP_ID || app.attributes.bundleId !== IOS_BUNDLE_ID) throw Error('Wrong Apple app.');

  const response = await api(`/v1/builds/${target.buildId}?include=app,preReleaseVersion,betaAppReviewSubmission`);
  const build = response.data;
  const version = response.included?.find(item => item.type === 'preReleaseVersions')?.attributes.version;
  if (build.id !== target.buildId || build.relationships.app.data.id !== IOS_APP_ID || version !== target.version ||
      build.attributes.version !== target.build || build.attributes.processingState !== 'VALID' ||
      build.attributes.expired || build.attributes.buildAudienceType !== 'APP_STORE_ELIGIBLE') {
    throw Error('The public link target is not the verified external build.');
  }
  const matches = (await all(`/v1/apps/${IOS_APP_ID}/betaGroups?limit=200`)).filter(group => group.attributes.name === GROUP_NAME);
  if (matches.length > 1) throw Error('The public invite group name is ambiguous.');
  let group = matches[0];
  if (!group) {
    const data = {
      type: 'betaGroups',
      attributes: { name: GROUP_NAME, isInternalGroup: false, publicLinkEnabled: false, hasAccessToAllBuilds: false },
      relationships: { app: { data: { type: 'apps', id: IOS_APP_ID } } },
    };
    group = (await api('/v1/betaGroups', { method: 'POST', body: { data } })).data;
  }
  if (group.attributes.isInternalGroup !== false || group.attributes.hasAccessToAllBuilds === true) {
    throw Error('Unexpected public invite group permissions.');
  }
  if ((await api(`/v1/betaGroups/${group.id}/app`)).data.id !== IOS_APP_ID) throw Error('Wrong public invite group app.');

  const buildsPath = `/v1/betaGroups/${group.id}/builds?limit=200`;
  const builds = await all(buildsPath);
  if (builds.some(item => item.id !== build.id)) throw Error('The public invite group has an unrelated build.');
  if (!builds.some(item => item.id === build.id)) {
    await api(`/v1/betaGroups/${group.id}/relationships/builds`, {
      method: 'POST', body: { data: [{ type: 'builds', id: build.id }] },
    });
  }
  if (!(await all(buildsPath)).some(item => item.id === build.id)) throw Error('Could not verify the build in the invite group.');
  const reviewState = response.included?.find(item => item.type === 'betaAppReviewSubmissions')?.attributes.betaReviewState;
  const externalState = (await api(`/v1/builds/${build.id}/buildBetaDetail`)).data.attributes.externalBuildState;
  const status = { groupId: group.id, buildId: build.id, build: target.build, reviewState, externalState, assigned: true };
  if (reviewState !== 'APPROVED' || !['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING'].includes(externalState)) {
    return { ...status, available: false };
  }

  const groupPath = `/v1/betaGroups/${group.id}`;
  const attributes = { publicLinkEnabled: true, publicLinkLimitEnabled: true, publicLinkLimit: 1 };
  await api(groupPath, { method: 'PATCH', body: { data: { type: 'betaGroups', id: group.id, attributes } } });
  const verified = (await api(groupPath)).data.attributes;
  if (!verified.publicLinkEnabled || !verified.publicLinkLimitEnabled || verified.publicLinkLimit !== 1 ||
      !/^https:\/\/testflight\.apple\.com\/join\/[A-Za-z0-9]+$/.test(verified.publicLink ?? '')) {
    throw Error('Apple did not confirm the one-spot TestFlight link.');
  }
  return {
    ...status, available: true, limit: 1,
    encryptedLink: publicEncrypt({ key, oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(verified.publicLink)).toString('base64'),
  };
}
