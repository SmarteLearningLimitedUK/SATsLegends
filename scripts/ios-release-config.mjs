import { loadEnv } from 'vite';
import { pathToFileURL } from 'node:url';

function validateIOSConfig(env, internalTesting) {
  const errors = [];
  const required=['VITE_SUPABASE_URL','VITE_IOS_AUTH_ORIGIN',...(!internalTesting?['VITE_IOS_PRIVACY_URL','VITE_IOS_TERMS_URL']:[])];
  if(internalTesting && env.VITE_IOS_INTERNAL_TESTING!=='true')errors.push('VITE_IOS_INTERNAL_TESTING: internal-test packages must disable new purchases.');
  if(!internalTesting && env.VITE_IOS_INTERNAL_TESTING==='true')errors.push('VITE_IOS_INTERNAL_TESTING: internal test builds cannot be public releases.');
  for (const name of required) {
    try {
      const url = new URL(env[name] || '');
      if (url.protocol !== 'https:' || url.username || url.password || /(^|\.)(localhost|invalid|test|example\.com|example\.org|example\.net)$/.test(url.hostname)
        || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.includes(':')) throw Error();
      if (['VITE_SUPABASE_URL','VITE_IOS_AUTH_ORIGIN'].includes(name) && (url.pathname !== '/' || url.search || url.hash)) throw Error();
    } catch { errors.push(`${name}: supply a public HTTPS ${name.endsWith('ORIGIN') || name === 'VITE_SUPABASE_URL' ? 'origin' : 'URL'}.`); }
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let publicKey = key.startsWith('sb_publishable_') && key.length > 25;
  if (key.split('.').length === 3) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch { publicKey = false; }
  }
  if (!publicKey) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY: supply a public publishable/anon key, never a server key.');
  if (env.VITE_ALLOW_GAME_PREVIEW === 'true') errors.push('VITE_ALLOW_GAME_PREVIEW: paid release must not bypass account access.');
  if (env.VITE_ASSET_BASE && env.VITE_ASSET_BASE !== '/') errors.push('VITE_ASSET_BASE: bundled iOS assets require /.');
  // Vite exposes every VITE_ variable to application code. Reject common secret mistakes without echoing values.
  for (const name of Object.keys(env)) if (/^VITE_.*(PRIVATE_KEY|SERVICE_ROLE|SECRET_KEY|APPLE_ISSUER|APPLE_KEY_ID)/i.test(name)) errors.push(`${name}: server credentials must not use the VITE_ prefix.`);
  return errors;
}

export const validateIOSReleaseConfig = env => validateIOSConfig(env,false);
export const validateIOSInternalTestConfig = env => validateIOSConfig(env,true);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...loadEnv('ios', process.cwd(), 'VITE_'), ...process.env };
  const internal=process.argv.includes('--internal-testing');
  const errors = internal?validateIOSInternalTestConfig(env):validateIOSReleaseConfig(env);
  if (errors.length) { console.error('iOS release configuration is incomplete:\n' + errors.map(e => `- ${e}`).join('\n')); process.exitCode = 1; }
  else console.log(`PASS iOS ${internal?'internal-test':'public release'} configuration structure. This does not verify live services, legal content or Apple product readiness.`);
}
