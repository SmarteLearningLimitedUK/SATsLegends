import React, {memo, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties} from 'react';
import {VisionSceneContext} from '../../games/visionScene';
import {GOBLIN_ATLAS_LAYOUT} from '../../games/goblinAtlasLayout';
import {RHINO_ATLAS_LAYOUT} from '../../games/rhinoAtlasLayout';
import idle from '../../assets/game-visions/characters/goblin-idle-v3.webp';
import taunt from '../../assets/game-visions/characters/goblin-taunt-v3.webp';
import hit from '../../assets/game-visions/characters/goblin-hit-v3.webp';
import rhinoIdle from '../../assets/game-visions/characters/rhino-idle-v3.webp';
import rhinoTaunt from '../../assets/game-visions/characters/rhino-taunt-v3.webp';
import rhinoHit from '../../assets/game-visions/characters/rhino-hit-v3.webp';
import {playGameSound, playMonsterSound} from '../../audio/gameAudio';
import type {VisionCharacterProps} from './VisionCharacter';

type Motion = 'idle'|'taunt'|'hit';
const atlases = {
  goblin: {sources:{idle,taunt,hit},layouts:GOBLIN_ATLAS_LAYOUT},
  rhino: {sources:{idle:rhinoIdle,taunt:rhinoTaunt,hit:rhinoHit},layouts:RHINO_ATLAS_LAYOUT},
};
type Identity = keyof typeof atlases;
const durations = {idle: 1000, taunt: 660, hit: 900};
const rhinoDurations = {...durations,taunt:520};
type Sample = {motion: Motion; frame: number};
const reducedQuery = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (notify:()=>void) => {
  const query=window.matchMedia(reducedQuery);query.addEventListener('change',notify);
  return()=>query.removeEventListener('change',notify);
};
const readReduced = () => window.matchMedia(reducedQuery).matches;

function spriteStyle({motion, frame}: Sample, identity:Identity): CSSProperties {
  const {sources,layouts}=atlases[identity];
  const layout = layouts[`characters/${identity}-${motion}-v3`];
  const [x,y,w,h] = layout.frames[frame];
  const [anchorX,anchorY] = layout.anchors[frame];
  // Pin the measured boot anchor, rather than centring a changing hat/hand
  // bounding box. All sheets share one grounded display height.
  const height = 88, width = height*w/h;
  return {position:'absolute', width:`${width}%`, height:`${height}%`,
    left:`${50-width*anchorX}%`, bottom:`${5-height*(1-anchorY)}%`,
    backgroundImage:`url("${sources[motion]}")`,
    backgroundSize:`${layout.width/w*100}% ${layout.height/h*100}%`,
    backgroundPosition:`${x/(layout.width-w)*100}% ${y/(layout.height-h)*100}%`,
    clipPath:`polygon(${layout.clips[frame]})`};
}

/** Each gesture has twenty consecutive drawings, including its recovery. */
export default memo(function ContinuousAtlasCharacter({identity,alt='', className='', style, reaction='idle', reactionKey, decorative=false, legacyIdentity, soundMode='off'}: VisionCharacterProps & {identity:Identity}) {
  const {sources}=atlases[identity];
  const timings=identity==='rhino'?rhinoDurations:durations;
  const scene = useContext(VisionSceneContext);
  const reduced = useSyncExternalStore(subscribeReduced,readReduced,()=>true);
  const [ready,setReady] = useState(false);
  const [sample,setSample] = useState<Sample>({motion:'idle',frame:0});
  const requested: Motion = reaction==='hit'||reaction==='defeated'?'hit'
    :reaction==='taunt'?'taunt':scene.cue==='error'?'taunt':scene.cue==='reward'?'hit':'idle';
  const signature = `${identity}:${requested}:${reactionKey??''}:${requested==='idle'?0:scene.sequence}:${reaction}`;
  const clock = useRef({signature:'',elapsed:0,motion:'idle' as Motion});
  const lastSound = useRef('');

  useEffect(()=>{
    let active=true;setReady(false);
    Promise.all(Object.values(sources).map(source=>{const image=new Image();image.src=source;return image.decode();}))
      .then(()=>{if(active)setReady(true);}).catch(()=>{});
    return()=>{active=false;};
  },[sources]);

  useEffect(()=>{
    if(!ready||reduced){setSample({motion:'idle',frame:0});return;}
    if(clock.current.signature!==signature)clock.current={signature,elapsed:0,motion:requested};
    if(scene.paused)return;
    let previous:number|undefined, handle=0;
    const tick=(now:number)=>{
      const state=clock.current;
      state.elapsed+=previous===undefined?0:Math.max(0,now-previous);previous=now;
      let frame:number;
      if(reaction==='defeated')frame=Math.min(8,Math.floor(state.elapsed/45));
      else if(state.motion==='idle')frame=Math.floor(state.elapsed/timings.idle*20)%20;
      else if(state.elapsed<timings[state.motion])frame=Math.min(19,Math.floor(state.elapsed/timings[state.motion]*20));
      else {state.motion='idle';state.elapsed=0;frame=0;}
      setSample(old=>old.frame===frame&&old.motion===state.motion?old:{motion:state.motion,frame});
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(handle);
  },[ready,reduced,scene.paused,signature,requested,reaction,timings]);

  useEffect(()=>{
    if(!ready||soundMode==='off'||scene.paused||document.hidden||document.querySelector('[role="dialog"][aria-modal="true"]'))return;
    const signature=`${identity}:${reaction}:${reactionKey??''}`;
    if(lastSound.current===signature)return;
    const first=!lastSound.current;lastSound.current=signature;
    if(reaction==='hit'||reaction==='defeated'){
      if(soundMode==='all')playGameSound('impact');
      playMonsterSound('monster_hurt');
    }else if(reaction==='taunt')playMonsterSound('monster_laugh');
    else if(first)playMonsterSound('monster_growl');
  },[identity,reaction,reactionKey,ready,scene.paused,soundMode]);

  return <span className={`vision-character vision-character--continuous ${legacyIdentity?'monster-mind-actor':''} ${className}`} style={style}
    role={decorative?undefined:'img'} aria-label={decorative?undefined:alt} aria-hidden={decorative||undefined}
    data-monster-actor={legacyIdentity?'true':undefined} data-monster-identity={legacyIdentity}
    data-monster-ready={legacyIdentity?ready:undefined} data-monster-reaction={legacyIdentity?reaction:undefined}
    data-vision-character={identity} data-vision-frame={sample.frame} data-vision-frame-count="20"
    data-vision-pose={sample.motion==='hit'?5:sample.motion==='taunt'?3:0}
    data-vision-total-frames="60" data-vision-motion={sample.motion} data-vision-ready={ready} data-vision-paused={scene.paused}>
    <span className="vision-character-contact"/>
    <span className="vision-character-breath"><span className="vision-character-frame" data-continuous-frame style={spriteStyle(sample,identity)}/></span>
  </span>;
});
