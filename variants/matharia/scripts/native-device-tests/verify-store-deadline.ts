import assert from 'node:assert/strict';
import {storeRequestDeadline} from '../../src/app/storeRequestDeadline';

await assert.rejects(storeRequestDeadline(new Promise<never>(() => {}), 15), /timed out/,
  'An unresponsive native bridge must not leave a mission loading forever');
const verified = {active:true,expiresAt:Date.now()+60000,configured:true,plans:[]};
assert.equal(await storeRequestDeadline(Promise.resolve(verified), 100), verified,
  'Verified cached access must be returned without needing a price list');
await assert.rejects(storeRequestDeadline(Promise.reject(new Error('Unavailable')), 100), /Unavailable/);
let resolveLate!: (value: typeof verified) => void;
const late = new Promise<typeof verified>(resolve => {resolveLate=resolve;});
await assert.rejects(storeRequestDeadline(late, 15), /timed out/);
resolveLate(verified);
assert.equal((await late).active,true, 'The deadline must not mutate native transaction results');
console.log('PASS bounded native access reads and unchanged verified entitlement results.');
