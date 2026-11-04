import assert from 'node:assert/strict';
import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base='http://127.0.0.1:3018',out='qa-artifacts/final-audio-qa';await mkdir(out,{recursive:true});
const catalog=JSON.parse(await readFile('qa-artifacts/full-screen-qa/catalog.json','utf8'));
const games=[...new Map(catalog.map(g=>[g.key,g])).values()];
const mobileKeys=new Set(['time_keeper_cove','potion_panic','change_counter','fraction_forge','ratio_fractions','rounding_rocket','crystal_core','mirror_gate','matrix_match']);
const profileFilter=process.env.LEGEND_AUDIO_PROFILE;
const keyFilter=new Set((process.env.LEGEND_AUDIO_KEYS||'').split(',').filter(Boolean));
const repair=process.env.LEGEND_AUDIO_REPAIR==='1';
const prior=JSON.parse(await readFile(out+'/checks.json','utf8').catch(()=>'[]'));
const regressionKeys=new Set(['time_keeper_cove','crystal_core','mirror_gate','matrix_match']);
const rows=repair?prior.filter(r=>r.passed&&(!regressionKeys.has(r.key)||(r.synthCancellation&&(r.key==='time_keeper_cove'?r.helpPractice&&r.mutePersistence:r.paperReview)))):profileFilter||keyFilter.size?prior.filter(r=>(profileFilter&&r.profile!==profileFilter)||(keyFilter.size&&!keyFilter.has(r.key))):[];
const profiles=[{name:'desktop',width:1440,height:900},{name:'phone',width:667,height:375},{name:'iphone-webkit',width:844,height:390}];
const clips=(await readdir('src/assets/audio/sfx')).filter(f=>f.endsWith('.mp3'));
async function dismiss(page){for(let i=0;i<5;i++){await page.waitForTimeout(100);const button=page.locator('[data-dialog-primary]:visible').last();if(!await button.count())break;const h=await button.elementHandle();try{await h.click({timeout:3000});}catch(error){if(await h.isVisible().catch(()=>false))throw error;}}}
async function calls(page){return page.evaluate(()=>window.__soundAudit.calls);}
async function resetCalls(page){await page.evaluate(()=>window.__soundAudit.calls=[]);}
async function closeHelp(page){
 const button=page.getByRole('button',{name:'Back to mission',exact:true}),handle=await button.elementHandle();
 try{await handle.click({timeout:3000});}catch(error){if(await handle.isVisible().catch(()=>false))throw error;}
 await button.waitFor({state:'hidden'});
}
for(const profile of profiles.filter(p=>!profileFilter||p.name===profileFilter)){
 const browser=profile.name.includes('webkit')?await webkit.launch({executablePath:'qa-artifacts/browser-runtime/webkit-2272/Playwright.exe'}):await chromium.launch();
 try{for(const game of games.filter(g=>(!keyFilter.size||keyFilter.has(g.key))&&(profile.name==='desktop'||mobileKeys.has(g.key))&&(!repair||!rows.some(r=>r.profile===profile.name&&r.key===g.key)))){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.width<1000,reducedMotion:'reduce'});
  await installReleaseAccountFixture(context);
  await context.addInitScript(()=>{
   if(localStorage.getItem('sats_mastery_music_enabled')===null)localStorage.setItem('sats_mastery_music_enabled','false');if(localStorage.getItem('sats_mastery_muted')===null)localStorage.setItem('sats_mastery_muted','false');
   window.__soundAudit={calls:[],starts:[],immediateStops:0,contexts:0};
   const Native=window.AudioContext||window.webkitAudioContext;
   window.__soundAudit.supported=Boolean(Native&&window.AudioBufferSourceNode&&window.OscillatorNode);
   if(!window.__soundAudit.supported)return;
   for(const [Ctor,type] of [[AudioBufferSourceNode,'sample'],[OscillatorNode,'synth']]){
    const start=Ctor.prototype.start,stop=Ctor.prototype.stop;
    Ctor.prototype.start=function(...args){window.__soundAudit.starts.push({type,duration:this.buffer?.duration,loop:this.loop||false});return start.apply(this,args);};
    Ctor.prototype.stop=function(...args){if(args.length===0)window.__soundAudit.immediateStops++;return stop.apply(this,args);};
   }
   window.AudioContext=class extends Native{constructor(...args){super(...args);window.__soundAudit.contexts++;}};
  });
  // Observe calls without changing production source or skipping the real engine.
  await context.route(/\/src\/audio\/gameAudio\.ts(?:\?|$)/,async route=>{
   const response=await route.fetch(),source=await response.text();
   const marker='export function playGameSound(effect, mutedOverride) {';
   assert.ok(source.includes(marker),'Audio instrumentation must match the served module');
   await route.fulfill({response,body:source.replace(marker,marker+'\n globalThis.__soundAudit?.calls.push(effect);')});
  });
  const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[],badAssets=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&/\.(mp3|webp|png|woff2)(\?|$)/.test(r.url()))badAssets.push(r.status()+' '+r.url());});
  const row={key:game.key,profile:profile.name,passed:false};
  try{
   await page.goto(base+game.route,{waitUntil:'domcontentloaded'});await page.locator('[data-game-set]').waitFor();
   if(!await page.evaluate(()=>window.__soundAudit.supported)){
    const error=new Error('This browser runner exposes no Web Audio API; playback cannot be verified here.');error.code='AUDIO_API_UNAVAILABLE';throw error;
   }
   assert.equal(await page.evaluate(()=>window.__soundAudit.contexts),0,'No audio context before gesture');
   await dismiss(page);await page.evaluate(()=>document.fonts.ready);
   await page.getByRole('button',{name:'How to play',exact:true}).click();
   await page.getByRole('button',{name:'Back to mission',exact:true}).waitFor();
   assert.ok((await calls(page)).includes('tap'),'Help opens with input feedback');
   await closeHelp(page);
   row.effects=await page.evaluate(async key=>{
    const audio=await import('/src/audio/gameAudio.ts');
    const library=await import('/src/audio/gameSampleLibrary.ts');
    const profiles=await import('/src/audio/gameSoundProfiles.ts');
    const profile=profiles.getGameSoundProfile(key);if(profile.id!==key)throw Error('Missing sound profile '+key);
    audio.configureGameSoundProfile(key);audio.unlockGameAudioFromGesture();
    const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;const ctx=Offline?new Offline(1,1,44100):new window.AudioContext(),results=[];
    for(const effect of ['tap','place','cast','impact','correct','incorrect','complete','fail']){
     const clip=library.sampleForEffect(profile,effect),buffer=await library.decodeGameSample(ctx,profile,effect);
     if(clip&&!buffer)throw Error('Failed decoding '+clip);
     const before=window.__soundAudit.starts.length;
     audio.playGameSound(effect);await new Promise(r=>setTimeout(r,130));
     if(window.__soundAudit.starts.length===before)throw Error('No source started for '+effect);
     results.push({effect,clip:clip||'synthesised',duration:buffer?.duration});audio.stopGameSoundEffects();
    }
    return results;
   },game.key);
   if(profile.name==='desktop'&&game===games[0]){
    row.recordings=await page.evaluate(async files=>{
     const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;const ctx=Offline?new Offline(1,1,44100):new window.AudioContext(),results=[];
     for(const file of files){const response=await fetch('/src/assets/audio/sfx/'+file);if(!response.ok)throw Error(file);const b=await ctx.decodeAudioData(await response.arrayBuffer());let peak=0,energy=0;const data=b.getChannelData(0);for(const value of data){if(!Number.isFinite(value))throw Error('Invalid PCM '+file);peak=Math.max(peak,Math.abs(value));energy+=value*value;}if(peak<.001||energy/data.length<1e-9)throw Error('Silent recording '+file);results.push({file,duration:b.duration,peak,rms:Math.sqrt(energy/data.length)});}return results;
    },clips);
   }
   row.synthCancellation=await page.evaluate(async()=>{
    const a=await import('/src/audio/gameAudio.ts');a.stopGameSoundEffects();
    const before=window.__soundAudit.starts.length,stops=window.__soundAudit.immediateStops;
    a.playGameSound('fail');const started=window.__soundAudit.starts.length-before;
    a.stopGameSoundEffects();const cancelled=window.__soundAudit.immediateStops-stops;
    if(started<3||cancelled<started)throw Error(`Synth cancellation: ${cancelled}/${started}`);
    return {started,cancelled};
   });
   row.lifecycleCancellation=await page.evaluate(async()=>{
    const a=await import('/src/audio/gameAudio.ts');a.stopGameSoundEffects();
    const before=window.__soundAudit.starts.length;
    a.playGameSound('correct');a.stopGameSoundEffects();await new Promise(r=>setTimeout(r,150));
    if(window.__soundAudit.starts.length!==before)throw Error('A cancelled pending recording started');
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
    a.playGameSound('correct');a.playGameSound('fail');a.playRocketCountdownSound();a.playRaceEngineSound(1);a.playRocketLaunchSound(1);
    await new Promise(r=>setTimeout(r,150));
    const silent=window.__soundAudit.starts.length===before;
    delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    if(!silent)throw Error('Hidden tab started a cue');return true;
   });
   // Mute must immediately cancel recorded and synthesised cues, including engines.
   await page.evaluate(async()=>{const a=await import('/src/audio/gameAudio.ts');a.playGameSound('complete');a.playGameSound('fail');a.playRaceEngineSound(5);});
   await page.waitForTimeout(70);const beforeStop=await page.evaluate(()=>window.__soundAudit.immediateStops);
   await page.getByRole('button',{name:'Mute audio',exact:true}).click();
   assert.ok(await page.evaluate(n=>window.__soundAudit.immediateStops>n,beforeStop),'Mute stops active cues');
   await page.waitForTimeout(80);
   const count=await page.evaluate(()=>window.__soundAudit.starts.length);
   await page.evaluate(async()=>{const a=await import('/src/audio/gameAudio.ts');for(const e of ['tap','place','correct','incorrect','fail'])a.playGameSound(e);a.playRocketCountdownSound();a.playRocketLaunchSound(1);a.playRaceEngineSound(1);});
   await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__soundAudit.starts.length),count,'No audio sources while muted');
   if(game.key==='time_keeper_cove'){await page.reload();await page.locator('[data-game-set]').waitFor();await page.getByRole('button',{name:'Unmute audio',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__soundAudit.contexts),0,'Reload stays silent before a gesture');await dismiss(page);row.mutePersistence=true;}
   await page.getByRole('button',{name:'Unmute audio',exact:true}).click();
   await page.getByRole('button',{name:'How to play',exact:true}).click();await closeHelp(page);
   if(game.key==='time_keeper_cove'){
    const target=(await page.locator('[data-chrono-game]').getAttribute('data-clock-target')).split(':').map(Number);
    await page.getByRole('button',{name:'Increase hour',exact:true}).click();if(target[0]===1&&target[1]===0)await page.getByRole('button',{name:'Increase hour',exact:true}).click();
    await resetCalls(page);await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Still out of sync'})).toBeVisible();assert.equal((await calls(page)).filter(e=>e==='incorrect').length,1);
    const [hour,minute]=(await page.locator('[data-clock-face]').getAttribute('data-clock-current')).split(':').map(Number);
    for(let i=0;i<(target[0]-hour+12)%12;i++)await page.getByRole('button',{name:'Increase hour',exact:true}).click();
    let steps=(target[1]-minute+60)%60;const direction=steps>30?'Decrease minutes':'Increase minutes';if(steps>30)steps=60-steps;
    for(let i=0;i<steps;i++)await page.getByRole('button',{name:direction,exact:true}).click();
    await resetCalls(page);await page.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
    await page.waitForTimeout(150);assert.equal((await calls(page)).filter(e=>e==='correct').length,1);row.realAnswers=true;
   }
   // Checking Help practice must give feedback without changing gameplay lives.
   if(game.key==='time_keeper_cove'){
    await page.getByRole('button',{name:'How to play',exact:true}).click();
    const picker=page.getByRole('combobox',{name:'Choose a practice question'});await picker.waitFor();
    const morning=(await picker.locator('option').allTextContents()).find(text=>text.includes('35 minutes later'));
    assert.ok(morning);await picker.selectOption({label:morning});
    const clockLabel=await page.locator('.revision-workshop svg[aria-label^="Analogue clock"]').getAttribute('aria-label');
    const clockParts=clockLabel.match(/between (\d+) and .*points to ([\d.]+)/);assert.ok(clockParts);
    const minutes=Number(clockParts[1])*60+Number(clockParts[2])*5;
    const format=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const answers=[format(minutes),format(minutes+35)];
    const fields=page.locator('.revision-workshop fieldset');
    for(let i=0;i<answers.length;i++){
     const field=fields.nth(i),options=field.getByRole('button');
     const values=await options.allTextContents();const value=i===0?values.find(v=>v.trim()!==String(answers[i])):String(answers[i]);
     assert.ok(value);await field.getByRole('button',{name:value,exact:true}).click();
    }
    await resetCalls(page);await page.getByRole('button',{name:'Check answer',exact:true}).click();
    assert.equal((await calls(page)).filter(e=>e==='incorrect').length,1);
    await fields.first().getByRole('button',{name:String(answers[0]),exact:true}).click();await resetCalls(page);await page.getByRole('button',{name:'Check answer',exact:true}).click();
    assert.equal((await calls(page)).filter(e=>e==='correct').length,1);
    await resetCalls(page);await page.getByRole('button',{name:'Check answer',exact:true}).click();assert.equal((await calls(page)).filter(e=>e==='correct'||e==='incorrect').length,0,'No repeated feedback on unchanged checked answer');
    row.helpPractice=true;
   }
   if(['crystal_core','mirror_gate','matrix_match'].includes(game.key)){
    await page.getByRole('button',{name:'Finish run',exact:true}).click();await resetCalls(page);
    await page.getByRole('button',{name:'Finish and review',exact:true}).click();
    await page.locator('[data-sats-phase=review]').waitFor();await page.waitForTimeout(250);
    const feedback=(await calls(page)).filter(e=>['complete','correct','incorrect'].includes(e));
    assert.deepEqual(feedback,['complete'],'A paper review announces once, without a marking cue burst');
    row.paperReview=true;
   }
   assert.deepEqual(errors,[]);assert.deepEqual(badAssets,[]);row.passed=true;
  }catch(error){row.error=error.message;if(error.code==='AUDIO_API_UNAVAILABLE'){row.passed=null;row.status='unavailable';}else await page.screenshot({path:`${out}/${profile.name}-${game.key}-failure.png`}).catch(()=>{});}
  row.runtimeErrors=errors;row.assetFailures=badAssets;rows.push(row);await writeFile(out+'/checks.json',JSON.stringify(rows,null,2));console.log(row.passed?'PASS':row.status==='unavailable'?'UNAVAILABLE':'FAIL',profile.name,game.key,row.error||'effects, mute, gesture, help');await context.close();
 }}finally{await browser.close();}
}
if(rows.some(row=>row.passed===false))process.exitCode=1;
