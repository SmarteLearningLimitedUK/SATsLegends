export const appleProducts: Record<string, 'month' | 'year'> = {
  'com.smartelearning.satslegends.matharia.monthly': 'month',
  'com.smartelearning.satslegends.matharia.annual': 'year',
};
export interface AppleServerConfig { issuer: string; keyId: string; privateKey: string; bundleId: string; environment: 'Production' | 'Sandbox' }
export function transactionIdsFrom(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'transactionIds')) throw Error('Invalid purchase verification request.');
  const ids = (body as { transactionIds: unknown }).transactionIds;
  if (!Array.isArray(ids) || ids.length > 25 || ids.some(id => typeof id !== 'string' || !/^\d{1,30}$/.test(id))) throw Error('Invalid Apple transaction identifiers.');
  return [...new Set(ids)];
}
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const text64 = (value: unknown) => encode(new TextEncoder().encode(JSON.stringify(value)));
export async function appleServerToken(config: AppleServerConfig, now = Date.now()): Promise<string> {
  const pem = config.privateKey.replaceAll('\\n','\n').replace(/-----[^-]+-----|\s/g,'');
  const key = await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const input = `${text64({alg:'ES256',kid:config.keyId,typ:'JWT'})}.${text64({iss:config.issuer,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+300,aud:'appstoreconnect-v1',bid:config.bundleId})}`;
  const signature = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(input));
  return `${input}.${encode(new Uint8Array(signature))}`;
}
/** Decode only a payload received directly from Apple's authenticated HTTPS
 * API. Never call this with a JWS supplied by a browser or webhook caller. */
function apiPayload(jws: unknown): Record<string, unknown> {
  if (typeof jws !== 'string' || jws.length > 32768 || jws.split('.').length !== 3) throw Error('Invalid Apple server response.');
  const part = jws.split('.')[1].replaceAll('-','+').replaceAll('_','/');
  const value = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(part.padEnd(Math.ceil(part.length/4)*4,'=')),c=>c.charCodeAt(0))));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid Apple server response.');
  return value;
}
export interface AppleEntitlement { id: string; parent_id: string; product_code: 'matharia'; status: 'active' | 'canceled'; interval: 'month' | 'year'; current_period_end: string; cancel_at_period_end: boolean }
export async function fetchAppleEntitlements(ids: string[], parentId: string, config: AppleServerConfig,
  request: typeof fetch = fetch, now = Date.now()): Promise<AppleEntitlement[]> {
  const jwt = await appleServerToken(config, now);
  const host = config.environment === 'Production' ? 'https://api.storekit.itunes.apple.com' : 'https://api.storekit-sandbox.itunes.apple.com';
  const rows = new Map<string, AppleEntitlement>();
  for (const id of ids) {
    // The host is fixed here; no client-controlled URLs or redirect targets.
    const response = await request(`${host}/inApps/v1/subscriptions/${id}`, {headers:{Authorization:`Bearer ${jwt}`},redirect:'error',signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw Error('Apple could not confirm this subscription. Please restore purchases later.');
    const result = await response.json();
    if (result.bundleId !== config.bundleId || result.environment !== config.environment || !Array.isArray(result.data)) throw Error('Apple subscription belongs to a different app or environment.');
    for (const group of result.data) for (const item of group.lastTransactions ?? []) {
      const transaction = apiPayload(item.signedTransactionInfo);
      if (!(typeof transaction.productId === 'string' && Object.hasOwn(appleProducts,transaction.productId))) continue;
      if (transaction.bundleId !== config.bundleId || transaction.environment !== config.environment
        || typeof transaction.appAccountToken !== 'string' || transaction.appAccountToken.toLowerCase() !== parentId.toLowerCase()) throw Error('This Apple purchase is linked to a different parent account. Sign in to the original account.');
      const original = transaction.originalTransactionId, expiry = transaction.expiresDate;
      if (typeof original !== 'string' || !/^\d{1,30}$/.test(original) || typeof expiry !== 'number' || !Number.isFinite(expiry) || expiry <= 0 || ![1,2,3,4,5].includes(item.status)) throw Error('Invalid Apple subscription status.');
      let end = expiry;
      const renewal = item.signedRenewalInfo ? apiPayload(item.signedRenewalInfo) : null;
      if (renewal && renewal.originalTransactionId !== original) throw Error('Invalid Apple renewal information.');
      if (item.status === 4) {
        if (!renewal || typeof renewal.gracePeriodExpiresDate !== 'number' || !Number.isFinite(renewal.gracePeriodExpiresDate)) throw Error('Invalid Apple grace period.');
        end = Math.max(end,renewal.gracePeriodExpiresDate);
      }
      const active = [1,4].includes(item.status) && !transaction.revocationDate && end > now;
      rows.set(original,{id:`apple:${config.environment}:${original}`,parent_id:parentId,product_code:'matharia',status:active?'active':'canceled',interval:appleProducts[transaction.productId],current_period_end:new Date(end).toISOString(),cancel_at_period_end:renewal?.autoRenewStatus===0});
    }
  }
  return [...rows.values()];
}
