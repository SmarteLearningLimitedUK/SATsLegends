import { DeleteError } from './handler.ts';

type AppleConfig = { clientId: string; teamId: string; keyId: string; privateKey: string };
const encode = (data: Uint8Array | string) => btoa(typeof data === 'string' ? data : String.fromCharCode(...data)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
export async function appleClientSecret(config: AppleConfig, now = Date.now()) {
  const pem = config.privateKey.replace(/\\n/g, '\n').replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), char => char.charCodeAt(0)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const body = `${encode(JSON.stringify({ alg: 'ES256', kid: config.keyId }))}.${encode(JSON.stringify({ iss: config.teamId, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 300, aud: 'https://appleid.apple.com', sub: config.clientId }))}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(body));
  return `${body}.${encode(new Uint8Array(signature))}`;
}
export async function revokeAppleAuthorization(code: string, subject: string, config: AppleConfig, request: typeof fetch = fetch, now = Date.now()) {
  const clientSecret = await appleClientSecret(config, now);
  const exchange = await request('https://appleid.apple.com/auth/token', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(12000), redirect: 'error' });
  if (!exchange.ok) throw new DeleteError(409, 'Apple could not authorise deletion. Please try again with the Apple Account used to sign in.');
  const tokens = await exchange.json();
  // This ID token comes directly from Apple's HTTPS token endpoint, never from
  // the caller. Bind the freshly exchanged code to the verified user's identity.
  let claims;
  try { claims = JSON.parse(atob(String(tokens.id_token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { throw new DeleteError(409, 'Apple account verification failed.'); }
  if (claims.iss !== 'https://appleid.apple.com' || claims.aud !== config.clientId || claims.sub !== subject || typeof claims.exp !== 'number' || claims.exp <= now / 1000) throw new DeleteError(409, 'Use the Apple Account linked to this sign-in.');
  const token = tokens.refresh_token || tokens.access_token;
  if (typeof token !== 'string' || !token) throw new DeleteError(502, 'Apple did not return a revocable credential. Please try again.');
  const revoke = await request('https://appleid.apple.com/auth/revoke', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, client_secret: clientSecret, token, token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token' }), signal: AbortSignal.timeout(12000), redirect: 'error' });
  if (!revoke.ok) throw new DeleteError(502, 'Apple credential revocation could not be confirmed. Your account has not been deleted.');
}
