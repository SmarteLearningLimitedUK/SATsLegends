import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readdir} from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL || 'http://127.0.0.1:4183';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.addInitScript(()=>{
  window.__music=[];
  const original=AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource=function(media){window.__music.push(media);return original.call(this,media)};
 });
 await page.goto(base+'/game/5/24');
 await page.getByRole('button',{name:'Turn music off'}).waitFor();
 assert.equal(await page.evaluate(()=>window.__music.length),0,'No music player before gesture');
 await page.getByRole('button',{name:'Turn music off'}).click();
 await page.getByRole('button',{name:'Turn music on'}).click();
 await page.waitForFunction(()=>window.__music[0]?.currentTime>.15);
 assert.equal(await page.evaluate(()=>window.__music.length),1,'One shared streaming player');
 // Isolate the catalogue check from the native route's own music selection.
 await page.route('**/__music-audit', route=>route.fulfill({contentType:'text/html',body:'<button id="start">Start music</button>'}));
 await page.goto(base+'/__music-audit');
 await page.evaluate(async()=>{
  const audio=await import('/src/audio/gameAudio.ts');
  audio.configureGameMusic(true,'gameplay','angle_arena');
  document.getElementById('start').onclick=()=>audio.unlockGameAudioFromGesture();
 });
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.__music[0]?.currentTime>.1);
 const files=(await readdir('src/assets/audio/music')).filter(x=>x.endsWith('.mp3'));
 const mapping=await page.evaluate(async()=>{
  const {levelMusicTracks,getLevelMusicUrl}=await import('/src/audio/gameMusicLibrary.ts');
  return Object.entries(levelMusicTracks).map(([key,id])=>({key,id,url:getLevelMusicUrl(key)}));
 });
 assert.equal(new Set(mapping.map(x=>x.id)).size,files.length,'Every supplied arrangement is assigned');
 for(const {key,id,url} of mapping.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i)){
  assert(url?.includes(id),'Track URL exists: '+key);
  await page.evaluate(async key=>{const a=await import('/src/audio/gameAudio.ts');a.configureGameMusic(true,'gameplay',key)},key);
  await page.waitForFunction(id=>window.__music[0]?.src.includes(id)&&window.__music[0].duration>1&&window.__music[0].currentTime>.03,id,{timeout:7000}).catch(async error=>{console.log(id,await page.evaluate(()=>window.__music.map(m=>({src:m.src,time:m.currentTime,paused:m.paused,error:m.error?.message,ready:m.readyState,duration:m.duration}))));throw error});
  assert.equal(await page.evaluate(()=>window.__music[0].loop),true,'Track loops: '+id);
 }
 await page.evaluate(async()=>{const a=await import('/src/audio/gameAudio.ts');a.configureGameMusic(false,'gameplay','take_out_rush')});
 const pausedAt=await page.evaluate(()=>window.__music[0].currentTime);
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__music[0].currentTime),pausedAt,'Paused music remains stopped');
 assert.equal(await page.evaluate(()=>window.__music.length),1,'Track changes reuse one player');
 console.log(`PASS level music: ${files.length} supplied tracks, all assignments load/play/loop, gesture gating, one player, pause`);
}finally{await browser.close()}
