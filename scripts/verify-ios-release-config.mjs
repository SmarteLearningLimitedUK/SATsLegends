import assert from 'node:assert/strict';
import { validateIOSReleaseConfig } from './ios-release-config.mjs';
const valid = { VITE_SUPABASE_URL:'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(30),
  VITE_IOS_PRIVACY_URL:'https://revision.school/privacy', VITE_IOS_TERMS_URL:'https://revision.school/terms', VITE_IOS_AUTH_ORIGIN:'https://revision.school', VITE_ALLOW_GAME_PREVIEW:'false' };
assert.deepEqual(validateIOSReleaseConfig(valid), []);
for (const [key,value] of [ ['VITE_SUPABASE_URL','http://project.supabase.co'], ['VITE_IOS_PRIVACY_URL','https://policy.example.invalid/privacy'],
  ['VITE_IOS_TERMS_URL','https://user:password@host.test'], ['VITE_IOS_AUTH_ORIGIN','https://host.test/callback'],
  ['VITE_ALLOW_GAME_PREVIEW','true'], ['VITE_ASSET_BASE','./'], ['VITE_SUPABASE_PUBLISHABLE_KEY','sb_secret_never_use'],
  ['VITE_APPLE_PRIVATE_KEY','do-not-print-me'] ]) {
  const errors = validateIOSReleaseConfig({...valid,[key]:value}); assert.ok(errors.some(e=>e.includes(key))); assert.ok(!errors.join('').includes(value), 'Do not echo configuration values');
}
assert.ok(validateIOSReleaseConfig({}).length >= 5);
const token = role => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
assert.deepEqual(validateIOSReleaseConfig({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:token('anon')}),[]);
assert.ok(validateIOSReleaseConfig({...valid,VITE_SUPABASE_PUBLISHABLE_KEY:token('service_role')}).length);
console.log('PASS iOS release config: public settings, unsafe URLs, preview bypass and secret-key rejection.');
