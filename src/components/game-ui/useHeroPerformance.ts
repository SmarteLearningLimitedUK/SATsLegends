import {useEffect, useRef, useState} from 'react';
import type {VisionCue} from '../../games/visionScene';

type Motion = 'idle'|'walk'|'attack'|'reward'|'retry';
const SEQUENCES = {
  attack: [[5,70],[6,120],[7,220],[8,140],[9,100]],
  reward: [[10,60],[11,120],[12,600],[13,160],[14,100]],
  retry: [[15,80],[16,150],[17,550],[18,150],[19,120]],
} as const;

/** One elapsed-time clock per hero. Pausing retains its frame and phase;
 * rendering is capped at the sheet's 20 fps, rather than every browser frame. */
export function useHeroPerformance({identity, walking, cue, sequence, reaction, reactionKey, enabled, paused}: {
  identity:string; walking:boolean; cue:VisionCue; sequence:number;
  reaction:'idle'|'hit'|'taunt'|'defeated'; reactionKey?:string|number;
  enabled:boolean; paused:boolean;
}) {
  const [sample,setSample]=useState<{frame:number;motion:Motion}>({frame:0,motion:'idle'});
  const requested:Motion = reaction==='taunt'?'attack':reaction!=='idle'?'retry':cue==='reward'?'reward':cue==='error'?'retry':walking?'walk':'idle';
  const signature=`${identity}:${requested}:${requested==='walk'||requested==='idle'?'':cue!=='idle'?sequence:reactionKey??''}`;
  const clock=useRef({signature:'',motion:'idle' as Motion,elapsed:0});
  useEffect(()=>{
    if(!enabled){clock.current={signature:'',motion:'idle',elapsed:0};setSample({frame:0,motion:'idle'});return;}
    if(clock.current.signature!==signature)clock.current={signature,motion:requested,elapsed:0};
    if(paused)return;
    let previous:number|undefined;let handle=0;
    const tick=(now:number)=>{
      // RAF timestamps refer to the frame's start, which can precede the
      // effect's performance.now(). Seed from RAF itself to avoid frame -1.
      const state=clock.current;state.elapsed+=previous===undefined?0:Math.max(0,now-previous);previous=now;
      let frame=0;
      if(state.motion==='walk')frame=Math.floor(state.elapsed/50)%20;
      else if(state.motion==='idle'){
        const wait=2600+identity.length*137;
        const time=state.elapsed%(wait+220);
        frame=time<wait?0:Math.min(4,1+Math.floor((time-wait)/55));
      }else{
        const beats=SEQUENCES[state.motion];let end=0;let found=false;
        for(const [index,duration] of beats){end+=duration;if(state.elapsed<end){frame=index;found=true;break;}}
        if(!found){state.motion='idle';state.elapsed=0;}
      }
      setSample(old=>old.frame===frame&&old.motion===state.motion?old:{frame,motion:state.motion});
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(handle);
  },[enabled,identity,paused,requested,signature]);
  return sample;
}
