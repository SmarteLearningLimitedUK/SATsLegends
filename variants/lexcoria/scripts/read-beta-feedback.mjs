import { constants, createCipheriv, publicEncrypt, randomBytes } from 'node:crypto';
import { connectToken, signingConfiguration } from '../../matharia/scripts/ios-testflight-config.mjs';

const appId = '6835860442';
const origin = 'https://api.appstoreconnect.apple.com';
const signing = signingConfiguration(process.env);

async function read(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw Error('Unexpected Apple API endpoint.');
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + connectToken(signing) },
    redirect: 'error',
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(url.pathname + ' returned HTTP ' + response.status);
  return response.json();
}

async function feedback(type) {
  const entries = [];
  let endpoint = '/v1/apps/' + appId + '/' + type + '?' + new URLSearchParams({
    ['fields[' + type + ']']: 'createdDate,comment,deviceModel,osVersion,build',
    'fields[builds]': 'version',
    include: 'build',
    limit: '100',
  });
  for (let page = 0; endpoint; page++) {
    if (page === 25) throw Error('Unexpected feedback pagination.');
    const response = await read(endpoint);
    const builds = new Map((response.included ?? []).map(build => [build.id, build.attributes.version]));
    for (const item of response.data) {
      const { createdDate, comment, deviceModel, osVersion } = item.attributes;
      entries.push({ createdDate, comment, deviceModel, osVersion, build: builds.get(item.relationships?.build?.data?.id) });
    }
    endpoint = response.links?.next;
  }
  return entries;
}

const { data: app } = await read('/v1/apps/' + appId + '?fields[apps]=bundleId');
if (app.id !== appId || app.attributes.bundleId !== 'com.smartelearning.lexcoria') {
  throw Error('Wrong Apple app.');
}
const [screenshots, crashes] = await Promise.all([
  feedback('betaFeedbackScreenshotSubmissions'),
  feedback('betaFeedbackCrashSubmissions'),
]);
const key = randomBytes(32);
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const content = Buffer.concat([cipher.update(JSON.stringify({ screenshots, crashes })), cipher.final()]);
const wrappedKey = publicEncrypt({
  key: Buffer.from(process.env.FEEDBACK_PUBLIC_KEY, 'base64').toString('utf8'),
  padding: constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256',
}, key);
const sealed = Buffer.concat([wrappedKey, iv, cipher.getAuthTag(), content]).toString('base64');
for (const segment of sealed.match(/.{1,3000}/g)) console.log('LEXCORIA_FEEDBACK_SEALED ' + segment);
