import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['variants/matharia/src/app/nativeStorage.ts'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'native-platform-fixture',setup(b){b.onResolve({filter:/^@capacitor\/core$/},()=>({path:'platform',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const Capacitor={isNativePlatform:()=>globalThis.__nativeStoragePlatform===true}'}));}}]});
const storage=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
function memory(){const values={};Object.defineProperties(values,{getItem:{value:key=>Object.hasOwn(values,key)?values[key]:null},setItem:{value:(key,value)=>{values[key]=String(value);}},removeItem:{value:key=>{delete values[key];}}});return values;}
function setup(native=true){globalThis.__nativeStoragePlatform=native;globalThis.localStorage=memory();globalThis.sessionStorage=memory();}
const parent='10000000-0000-4000-8000-000000000001',child='20000000-0000-4000-8000-000000000001';
test('native upgrade preserves selected cached player and matching progression once',()=>{
  setup();localStorage.setItem(storage.NATIVE_AUTH_KEY,JSON.stringify({user:{id:parent}}));sessionStorage.setItem('legends-child:'+parent,child);
  localStorage.setItem('maths_quest_player_v2',JSON.stringify({xp:1}));localStorage.setItem('maths_quest_player_v2:'+child,JSON.stringify({xp:99}));localStorage.setItem('sats-legends-save:'+child,JSON.stringify({state:{totalStars:23},version:1}));
  storage.migrateNativeDeviceSaves();assert.equal(JSON.parse(localStorage.getItem(storage.NATIVE_PLAYER_KEY)).xp,99);assert.equal(JSON.parse(localStorage.getItem(storage.NATIVE_PROGRESSION_KEY)).state.totalStars,23);
  localStorage.setItem(storage.NATIVE_PLAYER_KEY,JSON.stringify({xp:101}));storage.migrateNativeDeviceSaves();assert.equal(JSON.parse(localStorage.getItem(storage.NATIVE_PLAYER_KEY)).xp,101);
});
test('browser preview never imports or clears website caches',()=>{
  setup(false);localStorage.setItem('maths_quest_player_v2',JSON.stringify({xp:99}));localStorage.setItem('sats-legends-save:'+child,'website');storage.migrateNativeDeviceSaves();assert.equal(localStorage.getItem(storage.NATIVE_PLAYER_KEY),null);storage.clearNativeDeviceProgress();assert.ok(localStorage.getItem('maths_quest_player_v2'));assert.equal(localStorage.getItem('sats-legends-save:'+child),'website');
});
test('bad selected cache falls back to a valid guest save',()=>{
  setup();localStorage.setItem(storage.NATIVE_AUTH_KEY,JSON.stringify({user:{id:parent}}));sessionStorage.setItem('legends-child:'+parent,child);localStorage.setItem('maths_quest_player_v2:'+child,'damaged');localStorage.setItem('maths_quest_player_v2',JSON.stringify({xp:7}));storage.migrateNativeDeviceSaves();assert.equal(JSON.parse(localStorage.getItem(storage.NATIVE_PLAYER_KEY)).xp,7);
});
test('confirmed deletion clears old native copies and queued Matharia saves',()=>{
  setup();for(const key of [storage.NATIVE_PLAYER_KEY,storage.NATIVE_PROGRESSION_KEY,'maths_quest_player_v2','maths_quest_player_v2:'+child,'sats-legends-save:'+child,'legends-outbox:'+child+':matharia'])localStorage.setItem(key,'{}');sessionStorage.setItem('legends-child:'+parent,child);localStorage.setItem('sound-setting','true');storage.clearNativeDeviceProgress();storage.migrateNativeDeviceSaves();assert.deepEqual(Object.keys(localStorage),['sound-setting']);assert.equal(sessionStorage.getItem('legends-child:'+parent),null);
});
