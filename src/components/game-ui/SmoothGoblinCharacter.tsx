import React, {memo, useContext, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {VisionSceneContext} from '../../games/visionScene';
import {createGoblinMesh, goblinBaseStyle, type GoblinPose} from './goblinMesh';
import idle from '../../assets/game-visions/characters/goblin-idle-v3.webp';
import {playGameSound, playMonsterSound} from '../../audio/gameAudio';
import type {VisionCharacterProps} from './VisionCharacter';

type Motion = 'idle'|'taunt'|'hit';
const query='(prefers-reduced-motion: reduce)';
const subscribe=(notify:()=>void)=>{const media=window.matchMedia(query);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const readReduced=()=>window.matchMedia(query).matches;

/** One stable drawing, continuously deformed on a GPU mesh: no silhouette swaps. */
export default memo(function SmoothGoblinCharacter({alt='',className='',style,reaction='idle',reactionKey,decorative=false,legacyIdentity,soundMode='off'}:VisionCharacterProps){
 const scene=useContext(VisionSceneContext),reduced=useSyncExternalStore(subscribe,readReduced,()=>true);
 const [ready,setReady]=useState(false);
 const root=useRef<HTMLSpanElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const renderer=useRef<Awaited<ReturnType<typeof createGoblinMesh>>|null>(null);
 const initialization=useRef<Promise<Awaited<ReturnType<typeof createGoblinMesh>>>|null>(null),generation=useRef(0);
 const pose=useRef<GoblinPose>({time:0,lean:0,lift:0,recoil:0,defeat:0});
 const clock=useRef({signature:'',motion:'idle' as Motion,elapsed:0});
 const [fallback,setFallback]=useState(false);
 const lastSound=useRef('');
 const requested:Motion=reaction==='hit'||reaction==='defeated'?'hit':reaction==='taunt'?'taunt':scene.cue==='error'?'taunt':scene.cue==='reward'?'hit':'idle';
 const signature=`${requested}:${reactionKey??''}:${requested==='idle'?0:scene.sequence}:${reaction}`;
 useEffect(()=>{
  let active=true;const owner=++generation.current;
  // Strict Mode replays effects on the same canvas. Reuse its initialization;
  // an obsolete cleanup must never destroy the active owner's WebGL context.
  const pending=initialization.current??=createGoblinMesh(canvas.current!,idle);
  pending.then(mesh=>{if(active){renderer.current=mesh;mesh.draw(pose.current);setReady(true);}})
   .catch(()=>{if(active){setFallback(true);setReady(true);}});
  return()=>{active=false;queueMicrotask(()=>{
   if(generation.current!==owner)return;
   generation.current++;renderer.current=null;
   void pending.then(mesh=>mesh.dispose()).catch(()=>{});
  });};
 },[]);
 useEffect(()=>{
  const mesh=renderer.current,node=root.current;
  if(!ready||!mesh||!node)return;
  if(reduced){pose.current={time:0,lean:0,lift:0,recoil:0,defeat:0};mesh.draw(pose.current);node.dataset.visionMotion='idle';clock.current.signature='';return;}
  if(clock.current.signature!==signature)clock.current={signature,motion:requested,elapsed:0};
  if(scene.paused)return;
  let previous:number|undefined,handle=0;
  const tick=(now:number)=>{
   const dt=previous===undefined||document.hidden?0:Math.min(.05,(now-previous)/1000);previous=now;
   const state=clock.current,p=pose.current;state.elapsed+=dt;if(reaction!=='defeated'||state.elapsed<1.1)p.time+=dt;
   const duration=state.motion==='taunt'?1.3:1.1;
   const progress=Math.min(1,state.elapsed/duration);
   const gesture=Math.sin(Math.PI*progress)**2;
   const target={lean:state.motion==='taunt'?gesture:0,lift:state.motion==='taunt'?gesture:0,recoil:state.motion==='hit'&&reaction!=='defeated'?gesture:0,defeat:reaction==='defeated'?1:0};
   const follow=1-Math.exp(-12*dt);
   for(const key of ['lean','lift','recoil','defeat'] as const)p[key]+=(target[key]-p[key])*follow;
   if(progress===1&&reaction!=='defeated')state.motion='idle';
   if(progress===1&&reaction==='defeated')p.defeat=1;
   mesh.draw(p);node.dataset.visionMotion=state.motion;node.dataset.visionTime=p.time.toFixed(4);
   node.dataset.visionPose=state.motion==='hit'?'5':state.motion==='taunt'?'3':'0';
   node.dataset.visionDeformation=[p.lean,p.lift,p.recoil,p.defeat].map(n=>n.toFixed(4)).join(',');
   handle=requestAnimationFrame(tick);
  };
  handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
 },[ready,reduced,scene.paused,signature,requested,reaction]);
 useEffect(()=>{
  if(!ready||soundMode==='off'||scene.paused||document.hidden||document.querySelector('[role="dialog"][aria-modal="true"]'))return;
  const key=`${reaction}:${reactionKey??''}`;if(lastSound.current===key)return;
  const initial=!lastSound.current;lastSound.current=key;
  if(reaction==='hit'||reaction==='defeated'){if(soundMode==='all')playGameSound('impact');playMonsterSound('monster_hurt');}
  else if(reaction==='taunt')playMonsterSound('monster_laugh');else if(initial)playMonsterSound('monster_growl');
 },[reaction,reactionKey,ready,scene.paused,soundMode]);
 return <span ref={root} className={`vision-character vision-character--continuous vision-character--smooth-goblin ${legacyIdentity?'monster-mind-actor':''} ${className}`} style={style}
  role={decorative?undefined:'img'} aria-label={decorative?undefined:alt} aria-hidden={decorative||undefined}
  data-monster-actor={legacyIdentity?'true':undefined} data-monster-identity={legacyIdentity} data-monster-ready={legacyIdentity?ready:undefined} data-monster-reaction={legacyIdentity?reaction:undefined}
  data-vision-character="goblin" data-vision-frame="0" data-vision-frame-count="1" data-vision-total-frames="1" data-vision-motion="idle" data-vision-pose="0" data-vision-ready={ready} data-vision-paused={scene.paused} data-vision-playback="mesh">
  <span className="vision-character-contact"/>
  <span className="vision-character-breath"><canvas ref={canvas} className="goblin-mesh-canvas" aria-hidden="true"/>{fallback?<span className="goblin-mesh-fallback" style={{...goblinBaseStyle,backgroundImage:`url("${idle}")`}}/>:null}</span>
 </span>;
});
