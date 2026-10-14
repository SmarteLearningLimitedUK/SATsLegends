import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const base=process.env.LEGEND_QA_URL||'http://127.0.0.1:4180';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__sfx={contexts:0,starts:[],stops:0,notes:0};const C=window.AudioContext,start=AudioBufferSourceNode.prototype.start,stop=AudioBufferSourceNode.prototype.stop,osc=C.prototype.createOscillator;
  AudioBufferSourceNode.prototype.start=function(...args){window.__sfx.starts.push(this.buffer?.duration??0);return start.apply(this,args);};
  AudioBufferSourceNode.prototype.stop=function(...args){window.__sfx.stops++;return stop.apply(this,args);};
  C.prototype.createOscillator=function(...args){window.__sfx.notes++;return osc.apply(this,args);};
  window.AudioContext=class extends C{constructor(...args){super(...args);window.__sfx.contexts++;}};
 });
 await page.goto(base+'/');
 await page.evaluate(async()=>{window.__api=await import('/src/audio/gameAudio.ts');window.__api.configureGameSoundProfile('potion_panic');});
 assert.equal(await page.evaluate(()=>window.__api.playMonsterSound('monster_growl')),false,'creature arrivals cannot autoplay before a gesture');
 assert.equal(await page.evaluate(()=>window.__sfx.contexts),0,'preloading must wait for a gesture before opening audio');
 await page.evaluate(()=>{const b=document.createElement('button');b.textContent='Unlock test sound';b.onclick=()=>window.__api.playGameSound('tap');document.body.append(b);});
 await page.getByRole('button',{name:'Unlock test sound'}).click();await page.waitForTimeout(200);
 const cases=[['default','tap'],['default','incorrect'],['default','correct'],['default','complete'],['default','cast'],['default','place'],['default','impact'],['change_counter','tap'],['change_counter','correct'],['change_counter','complete'],['area_architect','place'],['fraction_forge','impact'],['ratio_fractions','correct'],['potion_panic','tap'],['mean_machine','cast'],['maths_vs_zombies','impact'],['angle_arena','impact'],['maths_vs_zombies','monster_growl'],['angle_arena','monster_laugh'],['factor_frenzy','monster_hurt']];
 for(const [profile,effect] of cases){await page.evaluate(([p,e])=>{window.__api.configureGameSoundProfile(p);window.__sfx.starts=[];window.__api.playGameSound(e);},[profile,effect]);await page.waitForFunction(()=>window.__sfx.starts.length>0);const durations=await page.evaluate(()=>window.__sfx.starts);assert.ok(durations[0]>.1&&durations[0]<3.3,`${profile}/${effect}: invalid duration`);console.log('PASS recorded cue',profile,effect,durations[0].toFixed(2)+'s');}
 await page.evaluate(()=>{window.__api.configureGameSoundProfile('change_counter');window.__api.playGameSound('complete');});await page.waitForTimeout(70);const stops=await page.evaluate(()=>window.__sfx.stops);
 await page.evaluate(()=>{localStorage.setItem('sats_mastery_muted','true');window.dispatchEvent(new Event('sats-mastery:mute-sync'));});assert.ok(await page.evaluate(()=>window.__sfx.stops)>stops,'mute stops an active recording');
 const count=await page.evaluate(()=>window.__sfx.starts.length);assert.equal(await page.evaluate(()=>window.__api.playGameSound('correct')),false);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__sfx.starts.length),count,'mute starts no samples');
 await page.evaluate(()=>{localStorage.setItem('sats_mastery_muted','false');window.__api.configureGameSoundProfile('change_counter');window.__api.playGameSound('complete');window.__api.configureGameSoundProfile(null);});const leaving=await page.evaluate(()=>window.__sfx.starts.length);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__sfx.starts.length),leaving,'leaving cancels pending recordings');
 // Verify every compressed clip decodes to real, finite audio below full-scale.
 const manifest=JSON.parse(await readFile('docs/sfx-assets.json','utf8'));
 const waveforms=await page.evaluate(async names=>{const ctx=new OfflineAudioContext(2,44100,44100);return Promise.all(names.map(async name=>{const r=await fetch('/src/assets/audio/sfx/'+name);if(!r.ok)throw Error(name+' failed');const b=await ctx.decodeAudioData(await r.arrayBuffer());let peak=0,sum=0;for(let c=0;c<b.numberOfChannels;c++)for(const v of b.getChannelData(c)){peak=Math.max(peak,Math.abs(v));sum+=v*v;}return{name,duration:b.duration,peak,rms:Math.sqrt(sum/(b.length*b.numberOfChannels))};}));},manifest.map(m=>m.asset));
 for(const w of waveforms){assert.ok(w.peak>0&&w.peak<1,JSON.stringify(w));assert.ok(w.rms>.0001&&w.rms<.2,JSON.stringify(w));}
 assert.deepEqual(errors,[]);console.log('PASS all 20 clips decode without clipping; mute, gesture unlock, profile changes and pending cancellation');
 // A missing audio file must preserve responsive synthesized feedback.
 const fallback=await browser.newPage();await fallback.route('**/src/assets/audio/sfx/*.mp3',r=>r.abort());await fallback.goto(base+'/');
 const fallbackResult=await fallback.evaluate(async()=>{const api=await import('/src/audio/gameAudio.ts');let notes=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(...a){notes++;return original.apply(this,a);};api.configureGameSoundProfile('fraction_forge');api.playGameSound('impact');await new Promise(r=>setTimeout(r,250));return notes;});assert.ok(fallbackResult>0,'missing recording must use the synth fallback');console.log('PASS missing asset fallback');
}finally{await browser.close();}
