import {originalHeroActivity} from '../../assets/characters/originalHeroActivities';
import React, {memo, useContext, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {VisionSceneContext} from '../../games/visionScene';
import {originalHeroSource} from '../../assets/characters/originalHeroes';
import {cohesiveCharacterSource} from '../../assets/characters/cohesiveCast';
import {playGameSound,playMonsterSound} from '../../audio/gameAudio';
import {createHeroMesh, measureHeroArtwork, type HeroPose} from './originalHeroMesh';
import type {VisionCharacterProps} from './VisionCharacter';

const motionQuery='(prefers-reduced-motion: reduce)';
const subscribeMotion=(notify:()=>void)=>{const media=window.matchMedia(motionQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const readReducedMotion=()=>window.matchMedia(motionQuery).matches;

/** Stable high resolution artwork, continuously animated without pose swaps. */
export default memo(function OriginalHeroCharacter({identity, alt='', className='', style, reaction='idle', reactionKey, decorative=false, walking=false, legacyIdentity, soundMode='off',activity:requestedActivity,artPose}: VisionCharacterProps) {
  const scene=useContext(VisionSceneContext), reduced=useSyncExternalStore(subscribeMotion,readReducedMotion,()=>true);
  const artwork=originalHeroActivity(identity,artPose);
  const source=artwork?.source??cohesiveCharacterSource(identity)!;
  const hero=Boolean(originalHeroSource(identity));
  const lastSound=useRef('');
  const canvas=useRef<HTMLCanvasElement>(null), root=useRef<HTMLSpanElement>(null);
  const visible=useRef(true);
  const mesh=useRef<Awaited<ReturnType<typeof createHeroMesh>>|null>(null);
  const pending=useRef<Promise<Awaited<ReturnType<typeof createHeroMesh>>>|null>(null), generation=useRef(0);
  const pose=useRef<HeroPose>({time:0,lean:0,lift:0,recoil:0,defeat:0,stride:0});
  const [fallbackFit,setFallbackFit]=useState<{box:string;width:string;height:string}>();
  const [ready,setReady]=useState(false), [fallback,setFallback]=useState(false);
  const showFallback=fallback||reduced;
  const gesture=useRef({signature:'',elapsed:0});
  const cue=reaction==='hit'||reaction==='defeated'?'error':reaction==='taunt'?'reward':scene.cue;
  const signature=`${cue}:${scene.sequence}:${reaction}:${reactionKey??''}`;
  const activity=requestedActivity??(walking?'run':scene.key==='order_ops_arena'?'cast':hero&&scene.key==='remainder_run'?'load':'idle');
  useEffect(()=>{
    const observer=new IntersectionObserver(([entry])=>{visible.current=entry.isIntersecting;});
    if(root.current)observer.observe(root.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    let active=true;const owner=++generation.current;
    const task=pending.current??=createHeroMesh(canvas.current!,source,artwork?.frame);
    task.then(value=>{if(active){mesh.current=value;value.draw(pose.current);setReady(true);}})
      .catch(()=>{
        if(active){setFallback(true);setReady(true);}
      });
    return()=>{active=false;queueMicrotask(()=>{if(generation.current!==owner)return;generation.current++;mesh.current=null;void task.then(value=>value.dispose()).catch(()=>{});});};
  },[source]);
  useEffect(()=>{
    if(!showFallback)return;
    let active=true;
    // A still image needs no drawing buffer. Use the same silhouette bounds
    // and floor baseline as the animated mesh, including atlas crops.
    void measureHeroArtwork(source,artwork?.frame).then(({bounds,w,h})=>{
      const height=Math.min(.88,.92*h/w);
      if(active)setFallbackFit({box:`${bounds[0]*1000} ${bounds[1]*1000} ${(bounds[2]-bounds[0])*1000} ${(bounds[3]-bounds[1])*1000}`,width:`${height*w/h*100}%`,height:`${height*100}%`});
    }).catch(()=>{});
    return()=>{active=false;};
  },[showFallback,source]);
  useEffect(()=>{
    const renderer=mesh.current;
    if(!ready||!renderer)return;
    if(reduced){pose.current={time:0,lean:0,lift:0,recoil:0,defeat:0,stride:0};renderer.draw(pose.current);if(root.current){root.current.dataset.visionJoints='0.0000,0.0000,0.0000';root.current.dataset.visionTime='0.0000';}return;}
    if(gesture.current.signature!==signature)gesture.current={signature,elapsed:0};
    if(scene.paused)return;
    let previous:number|undefined, handle=0;
    const tick=(now:number)=>{
      const dt=previous===undefined||document.hidden?0:Math.min(.05,(now-previous)/1000);previous=now;
      if(document.hidden||!visible.current){handle=requestAnimationFrame(tick);return;}
      const p=pose.current, g=gesture.current;g.elapsed+=dt;p.time+=dt;
      const amount=Math.sin(Math.PI*Math.min(1,g.elapsed/1.1))**2;
      const phase=p.time*(activity==='cook'?3.5:9),work=activity==='cook'?1:cue==='idle'?0:amount;
      const rightArm=activity==='cook'?Math.sin(phase)*.15-.08:activity==='forge'?-.38*work:activity==='cast'?-.25*amount:activity==='load'?-.28*amount:activity==='run'?Math.sin(phase)*.18:0;
      const leftArm=activity==='cook'?Math.cos(phase)*.08:activity==='load'?.28*amount:activity==='run'?-Math.sin(phase)*.18:activity==='forge'?.10*work:0;
      const target={lean:cue==='reward'?amount:0,lift:cue==='reward'?amount:0,recoil:cue==='error'?amount:0,defeat:reaction==='defeated'?1:0,stride:walking||activity==='run'?1:0,rightArm,leftArm,workLean:activity==='cook'?Math.sin(phase)*.18:activity==='forge'?work*.5:0};
      const follow=1-Math.exp(-12*dt);
      for(const key of ['lean','lift','recoil','defeat','stride','rightArm','leftArm','workLean'] as const)p[key]=(p[key]??0)+(target[key]-(p[key]??0))*follow;
      renderer.draw(p);
      if(root.current){root.current.dataset.visionTime=p.time.toFixed(4);root.current.dataset.visionDeformation=[p.lean,p.lift,p.recoil,p.defeat,p.stride].map(n=>n.toFixed(4)).join(',');}
      if(root.current)root.current.dataset.visionJoints=[p.rightArm??0,p.leftArm??0,p.workLean??0].map(n=>n.toFixed(4)).join(',');
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
  },[ready,reduced,scene.paused,signature,cue,reaction,walking,activity]);
  useEffect(()=>{
    if(hero||!ready||soundMode==='off'||scene.paused||document.hidden||document.querySelector('[role="dialog"][aria-modal="true"]'))return;
    const signature=`${reaction}:${reactionKey??''}`;if(signature===lastSound.current)return;
    const initial=!lastSound.current;lastSound.current=signature;
    if(reaction==='hit'||reaction==='defeated'){if(soundMode==='all')playGameSound('impact');playMonsterSound('monster_hurt');}
    else if(reaction==='taunt')playMonsterSound('monster_laugh');else if(initial)playMonsterSound('monster_growl');
  },[hero,ready,reaction,reactionKey,soundMode,scene.paused]);
  return <span ref={root} className={`vision-character vision-character--continuous vision-character--original-hero ${legacyIdentity?'monster-mind-actor':''} ${className}`} style={style}
    role={decorative?undefined:'img'} aria-label={decorative?undefined:alt} aria-hidden={decorative||undefined}
    data-original-hero={hero?(identity==='deer'?'barratt':identity):undefined} data-cohesive-cast={identity} data-vision-character={identity} data-vision-ready={ready} data-vision-paused={scene.paused}
    data-monster-actor={legacyIdentity?'true':undefined} data-monster-identity={legacyIdentity} data-monster-ready={legacyIdentity?ready:undefined} data-monster-reaction={legacyIdentity?reaction:undefined}
    data-vision-art-pose={artwork?artPose:'rest'} data-vision-frame="0" data-vision-frame-count="1" data-vision-total-frames="1"
    data-vision-activity={activity} data-vision-playback={showFallback?'continuous-fallback':'mesh'} data-vision-motion={walking?'walk':reaction==='idle'?cue:reaction}>
    <span className="vision-character-contact"/>
    <span className="vision-character-breath"><canvas ref={canvas} className="original-hero-canvas" style={showFallback?{visibility:'hidden'}:undefined} aria-hidden="true"/>
      {showFallback?<svg className="original-hero-fallback" style={fallbackFit?{inset:'auto',left:'50%',bottom:'5%',translate:'-50% 0',width:fallbackFit.width,height:fallbackFit.height}:undefined} viewBox={fallbackFit?.box??'0 0 1000 1000'} preserveAspectRatio="none" aria-hidden="true"><image href={source} width="1000" height="1000" preserveAspectRatio="none" /></svg>:null}
    </span>
  </span>;
});
