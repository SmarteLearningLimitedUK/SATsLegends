import {chromium,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {installReleaseAccountFixture} from './qa/release-account-fixture.mjs';
process.env.VITE_SUPABASE_URL=loadEnv('ios',process.cwd(),'VITE_').VITE_SUPABASE_URL;
process.env.LEGEND_QA_FETCH_FIXTURE='1';
const base=process.env.LEGEND_IOS_QA_URL||'http://127.0.0.1:3024',out=process.env.LEGEND_QA_OUT||'qa-artifacts/full-playtest/results-audio';
await mkdir(out,{recursive:true});const browser=await chromium.launch(),row={passed:false,errors:[]};
const context=await browser.newContext({viewport:{width:844,height:390},reducedMotion:'reduce'});
await installReleaseAccountFixture(context);
await context.addInitScript(()=>{
 if(!localStorage.getItem('__release_qa_api_state__'))localStorage.setItem('__release_qa_api_state__',JSON.stringify({revision:1,saved:{player:{avatarId:'barratt',level:100},revision:1},requests:{}}));
 if(!localStorage.getItem('sats_mastery_music_enabled'))localStorage.setItem('sats_mastery_music_enabled','false');
 window.__audioPlaytest={contexts:0,starts:[],stops:0};
 const Native=window.AudioContext;
 const media=[],createMedia=Native.prototype.createMediaElementSource;
 Native.prototype.createMediaElementSource=function(element){media.push(element);return createMedia.call(this,element);};
 Object.defineProperty(window.__audioPlaytest,'musicActivity',{enumerable:true,get:()=>window.__audioPlaytest.starts.length+Math.floor(media.reduce((total,m)=>total+m.currentTime*1000,0))});
 window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioPlaytest.contexts++;}};
 for(const [C,type]of [[AudioBufferSourceNode,'sample'],[OscillatorNode,'synth']]){
  const start=C.prototype.start,stop=C.prototype.stop;
  C.prototype.start=function(...args){window.__audioPlaytest.starts.push({type,duration:this.buffer?.duration,loop:this.loop||false});return start.apply(this,args);};
  C.prototype.stop=function(...args){window.__audioPlaytest.stops++;return stop.apply(this,args);};
 }
});
const p=await context.newPage();p.on('pageerror',e=>row.errors.push(e.message));
await p.clock.install();
async function start(){const b=p.getByRole('button',{name:'Start',exact:true});if(await b.isVisible())await b.click();await p.locator('[data-chrono-game]').waitFor();for(let i=0;i<5;i++){const b=p.locator('[data-dialog-primary]:visible').first();if(!await b.count())break;await b.click();await p.waitForTimeout(150);}}
const progress=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('sats-legends-save:20000000-0000-4000-8000-000000000001')||'{}').state);
const audio=()=>p.evaluate(()=>structuredClone(window.__audioPlaytest));
const snap=label=>p.screenshot({path:`${out}/${label}.png`});
async function correct(){
 const target=(await p.locator('[data-chrono-game]').getAttribute('data-clock-target')).split(':').map(Number);
 const current=(await p.locator('[data-clock-face]').getAttribute('data-clock-current')).split(':').map(Number);
 let hours=(target[0]-current[0]+12)%12;
 const hdir=hours>6?'Decrease hour':'Increase hour';if(hours>6)hours=12-hours;
 for(let i=0;i<hours;i++)await p.getByRole('button',{name:hdir,exact:true}).click();
 let minutes=(target[1]-current[1]+60)%60;
 const mdir=minutes>30?'Decrease minutes':'Increase minutes';if(minutes>30)minutes=60-minutes;
 for(let i=0;i<minutes;i++)await p.getByRole('button',{name:mdir,exact:true}).click();
 await p.getByRole('button',{name:'RESTORE TIME',exact:true}).click();
 await expect(p.locator('[data-chrono-game]')).toContainText('Time restored!');
 await p.waitForTimeout(350);
}
try{
 await p.goto(base+'/game/6/9',{waitUntil:'domcontentloaded'});
 await expect(p.getByRole('button',{name:'Start',exact:true})).toBeVisible();
 expect((await audio()).contexts).toBe(0);row.gestureSafe=true;await start();
 // Three actual mistakes consume the shared lives and create one failed attempt.
 const target=(await p.locator('[data-chrono-game]').getAttribute('data-clock-target')).split(':').map(Number);
 if(target[0]===12&&target[1]===0)await p.getByRole('button',{name:'Increase hour',exact:true}).click();
 const beforeWrong=(await audio()).starts.length;
 for(let n=0;n<3;n++){await p.getByRole('button',{name:'RESTORE TIME',exact:true}).click();await p.waitForTimeout(450);}
 const result=p.getByRole('dialog',{name:'Mission results'});await expect(result).toBeVisible();
 row.failure=(await progress()).levels['6-9'];expect(row.failure.timesPlayed).toBe(1);expect(row.failure.completed).toBe(false);expect(row.failure.bestStars).toBe(0);
 row.wrongSources=(await audio()).starts.slice(beforeWrong);expect(row.wrongSources.some(s=>s.type==='sample')).toBe(true);
 await snap('failure');await p.getByRole('button',{name:'Retry',exact:true}).click();await start();
 const beforeCorrect=(await audio()).starts.length;await correct();
 row.correctSources=(await audio()).starts.slice(beforeCorrect);expect(row.correctSources.some(s=>s.type==='sample')).toBe(true);
 // Mute is exercised through the real control and a correct game action.
 await p.getByRole('button',{name:'Mute audio',exact:true}).click();await p.waitForTimeout(200);
 const mutedCount=(await audio()).starts.length;await correct();expect((await audio()).starts.length).toBe(mutedCount);row.mutedGameplaySilent=true;
 await p.getByRole('button',{name:'Unmute audio',exact:true}).click();
 await p.getByRole('button',{name:'Turn music on',exact:true}).click();await p.waitForTimeout(1100);
 const musicCount=(await audio()).musicActivity;await p.waitForTimeout(600);expect((await audio()).musicActivity).toBeGreaterThan(musicCount);row.musicStarts=true;
 await p.getByRole('button',{name:'Open on-screen working board',exact:true}).click();await expect(p.getByRole('dialog',{name:'On-screen maths working board'})).toBeVisible();
 await p.waitForTimeout(350);const pausedCount=(await audio()).musicActivity;await p.waitForTimeout(700);expect((await audio()).musicActivity).toBe(pausedCount);row.workpadPausesAudio=true;
 await p.getByRole('button',{name:'Back to game',exact:true}).click();await p.getByRole('button',{name:'Turn music off',exact:true}).click();
 // Accelerated browser clock runs real interval callbacks; no game completion callback is invoked.
 await p.clock.runFor(92000);await expect(result).toBeVisible();
 row.victory=(await progress()).levels['6-9'];expect(row.victory.timesPlayed).toBe(2);expect(row.victory.completed).toBe(true);expect(row.victory.bestStars).toBeGreaterThan(0);
 row.victoryProgress=await progress();await snap('victory');
 await p.clock.runFor(1500);expect((await progress()).levels['6-9'].timesPlayed).toBe(2);row.resultSettledOnce=true;
 await p.getByRole('button',{name:'Close results',exact:true}).click();
 await p.evaluate(()=>window.dispatchEvent(new Event('online')));
 await expect.poll(()=>p.evaluate(()=>JSON.parse(localStorage.getItem('__release_qa_api_state__')).saved?.progression?.levels?.['6-9']?.timesPlayed)).toBe(2);
 await p.reload();await expect.poll(async()=>(await progress())?.levels?.['6-9']?.timesPlayed).toBe(2);
 expect((await progress()).levels['6-9'].completed).toBe(true);expect((await audio()).contexts).toBe(0);row.savedProgressAfterReload=true;
 expect(row.errors).toEqual([]);row.passed=true;console.log('PASS real failures/retry/victory/single settlement/cloud fixture/reload/audio lifecycle');
}catch(e){row.error=e.message;console.log('FAIL results/audio',e.message);await snap('failure-diagnostic').catch(()=>{});process.exitCode=1;}
finally{await writeFile(`${out}/results.json`,JSON.stringify(row,null,2));await context.close();await browser.close();}
