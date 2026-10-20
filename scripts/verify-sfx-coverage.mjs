import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
const base = process.env.LEGEND_QA_URL || 'http://127.0.0.1:4183';
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage({reducedMotion:'reduce'});
 await page.addInitScript(() => {
  localStorage.setItem('sats_mastery_music_enabled','false');
  window.__cues=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer)window.__cues.push(this.buffer.duration);return start.apply(this,args)};
 });
 await page.goto(base);
 const clips=(await readdir('src/assets/audio/sfx')).filter(x=>x.endsWith('.mp3'));
 await page.evaluate(async clips=>{
  const ctx=new OfflineAudioContext(1,1,44100);
  for(const file of clips){const r=await fetch('/src/assets/audio/sfx/'+file);if(!r.ok)throw Error(file);const b=await ctx.decodeAudioData(await r.arrayBuffer());if(!b.length)throw Error('Empty '+file)}
 },clips);
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {default:Actor}=await import('/src/components/game-ui/MonsterMindActor.tsx');
  const audio=await import('/src/audio/gameAudio.ts');
  const lib=await import('/src/audio/gameSampleLibrary.ts');
  const {getGameSoundProfile}=await import('/src/audio/gameSoundProfiles.ts');
  for(const id of ['number_line_ninja','place_value_panic','order_ops_arena','factor_frenzy','maths_vs_zombies','default']){
   for(const effect of ['monster_growl','monster_hurt','monster_laugh'])if(!lib.sampleForEffect(getGameSoundProfile(id),effect))throw Error(id+': '+effect);
  }
  audio.configureGameSoundProfile('number_line_ninja');
  document.getElementById('root').remove();
  const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
  window.__audio=audio;
  window.__renderActor=(reaction,key,mode='all')=>root.render(React.createElement(Actor,{src:window.__enemySrc,reaction,reactionKey:key,soundMode:mode,style:{width:180,height:220}}));
 });
 // Use the same goblin artwork as the native combat games.
 const src=await page.evaluate(async()=>{
  const r=await fetch('/src/games/NumberLineNinjaGame.tsx');const text=await r.text();
  const m=text.match(/import\s+\w+\s+from\s+["']([^"']*goblin[^"']*)["']/i);
  if(!m)throw Error('Goblin import missing');return new URL(m[1],location.origin+'/src/games/NumberLineNinjaGame.tsx').pathname;
 });
 await page.evaluate(src=>{window.__enemySrc=src;window.__audio.unlockGameAudioFromGesture();window.__renderActor('idle',0)},src);
 await page.locator('[data-monster-ready="true"]').waitFor();
 await page.waitForTimeout(1500);
 const cue=async(reaction,key,mode='all')=>{await page.evaluate(({reaction,key,mode})=>{window.__cues=[];window.__renderActor(reaction,key,mode)},{reaction,key,mode});await page.waitForTimeout(300);return page.evaluate(()=>window.__cues)};
 assert.equal((await cue('hit',1)).length,2,'Hit must play one impact and one recorded hurt even with reduced motion');
 assert.equal((await cue('hit',1)).length,0,'Same reaction must not replay on rerender');
 assert.equal((await cue('hit',2)).length,2,'Consecutive hit must play again');
 assert.equal((await cue('hit',3,'voice')).length,1,'Voice-only owner must not duplicate physical impact');
 assert.equal((await cue('hit',4,'off')).length,0,'Explicit combat owner must not duplicate audio');
 await page.evaluate(()=>localStorage.setItem('sats_mastery_muted','true'));
 assert.equal((await cue('hit',5)).length,0,'Mute must silence shared reactions');
 await page.evaluate(()=>localStorage.setItem('sats_mastery_muted','false'));
 await page.waitForTimeout(1300);
 assert.equal((await cue('taunt',6)).length,1,'Taunt must play a recorded laugh');
 await page.evaluate(()=>{const modal=document.createElement('div');modal.id='audit-pause';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');document.body.append(modal)});
 assert.equal((await cue('hit',7)).length,0,'Modal pause must suppress monster reactions');
 await page.evaluate(()=>document.getElementById('audit-pause').remove());
 for(const name of ['goblin','rhino','jelly','cyclops-slime','zombie']){
  await page.evaluate(name=>{window.__enemySrc='/src/assets/enemies/cohesive/'+name+'.webp';window.__renderActor('idle','spawn-'+name)},name);
  await page.waitForTimeout(500);
  await page.locator('[data-monster-ready="true"]').waitFor();
  assert.equal((await cue('hit','hit-'+name)).length,2,name+' must have impact and hurt cues');
 }
 console.log(`PASS SFX coverage: ${clips.length} recordings decode; monster mappings, hit/hurt, repeated hits, duplicate suppression, owner overrides, all 5 enemy artworks, mute, pause, taunt, reduced motion`);
} finally {await browser.close()}