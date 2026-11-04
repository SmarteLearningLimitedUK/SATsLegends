// Uses the repository's existing mesh renderer with an explicit independent art source.
import '../../../src/components/game-ui/vision-character.css';
import {type HeroArtFrame} from '../../../src/assets/characters/originalHeroActivities';
import React, {memo, useContext, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {VisionSceneContext} from '../../../src/games/visionScene';
import {originalHeroSource} from '../../../src/assets/characters/originalHeroes';
import {playGameSound,playMonsterSound} from '../../../src/audio/gameAudio';
import {createHeroMesh, measureHeroArtwork, type HeroPose} from '../../../src/components/game-ui/originalHeroMesh';
import type {VisionCharacterProps} from '../../../src/components/game-ui/VisionCharacter';

const motionQuery='(prefers-reduced-motion: reduce)';
const subscribeMotion=(notify:()=>void)=>{const media=window.matchMedia(motionQuery);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);};
const readReducedMotion=()=>window.matchMedia(motionQuery).matches;

/** Stable high resolution artwork, continuously animated without pose swaps. */
type SceneActorProps=VisionCharacterProps & {source:string;frame?:HeroArtFrame;children?:React.ReactNode;idleMotion?:'study'|'investigate';paused?:boolean};
export default memo(function SceneActor({source,frame,children,idleMotion,paused=false,identity, alt='', className='', style, reaction='idle', reactionKey, decorative=false, walking=false, legacyIdentity, soundMode='off',activity:requestedActivity,artPose}: SceneActorProps) {
  const scene=useContext(VisionSceneContext), reduced=useSyncExternalStore(subscribeMotion,readReducedMotion,()=>true);
  const actorPaused=paused||scene.paused;
  const hero=Boolean(originalHeroSource(identity));
  const lastSound=useRef('');
  const canvas=useRef<HTMLCanvasElement>(null), root=useRef<HTMLSpanElement>(null);
  const visible=useRef(true);
  const mesh=useRef<Awaited<ReturnType<typeof createHeroMesh>>|null>(null);
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
    let active=true,owned:Awaited<ReturnType<typeof createHeroMesh>>|null=null;
    setReady(false);setFallback(false);
    const task=createHeroMesh(canvas.current!,source,frame);
    task.then(value=>{
      if(!active){value.dispose();return;}
      owned=value;mesh.current=value;value.draw(pose.current);setReady(true);
    }).catch(()=>{if(active){setFallback(true);setReady(true);}});
    return()=>{active=false;owned?.dispose();if(mesh.current===owned)mesh.current=null;};
  },[source,frame?.x,frame?.y,frame?.width,frame?.height]);
  useEffect(()=>{
    if(!showFallback)return;
    let active=true;
    // A still image needs no drawing buffer. Use the same silhouette bounds
    // and floor baseline as the animated mesh, including atlas crops.
    void measureHeroArtwork(source,frame).then(({bounds,w,h})=>{
      const height=Math.min(.88,.92*h/w);
      if(active)setFallbackFit({box:`${bounds[0]*1000} ${bounds[1]*1000} ${(bounds[2]-bounds[0])*1000} ${(bounds[3]-bounds[1])*1000}`,width:`${height*w/h*100}%`,height:`${height*100}%`});
    }).catch(()=>{});
    return()=>{active=false;};
  },[showFallback,source,frame?.x,frame?.y,frame?.width,frame?.height]);
  useEffect(()=>{
    const renderer=mesh.current;
    if(!ready||!renderer)return;
    if(reduced){pose.current={time:0,lean:0,lift:0,recoil:0,defeat:0,stride:0};renderer.draw(pose.current);if(root.current){root.current.dataset.visionJoints='0.0000,0.0000,0.0000';root.current.dataset.visionTime='0.0000';}return;}
    if(gesture.current.signature!==signature)gesture.current={signature,elapsed:0};
    if(actorPaused)return;
    let previous:number|undefined, handle=0;
    const tick=(now:number)=>{
      const dt=previous===undefined||document.hidden?0:Math.min(.05,(now-previous)/1000);previous=now;
      if(document.hidden||!visible.current){handle=requestAnimationFrame(tick);return;}
      const p=pose.current, g=gesture.current;g.elapsed+=dt;p.time+=dt;
      const amount=Math.sin(Math.PI*Math.min(1,g.elapsed/1.1))**2;
      const phase=p.time*(activity==='cook'?3.5:9),work=activity==='cook'?1:cue==='idle'?0:amount;
      const idlePhase=p.time*(idleMotion==='study'?1.5:1.15),idleWave=idleMotion?Math.sin(idlePhase):0;
      const rightArm=(activity==='cook'?Math.sin(phase)*.15-.08:activity==='forge'?-.38*work:activity==='cast'?-.25*amount:activity==='load'?-.28*amount:activity==='run'?Math.sin(phase)*.18:0)+idleWave*(idleMotion==='study'?.18:.14);
      const leftArm=(activity==='cook'?Math.cos(phase)*.08:activity==='load'?.28*amount:activity==='run'?-Math.sin(phase)*.18:activity==='forge'?.10*work:0)+(idleMotion?Math.sin(idlePhase+.8)*.05:0);
      const groundedWork=activity==='cook'||activity==='forge'||activity==='load'||activity==='cast';
      const target={lean:(cue==='reward'?amount*(groundedWork?.3:.65):0)+idleWave*.18,lift:cue==='reward'&&!groundedWork&&!walking?amount*.2:0,recoil:cue==='error'?amount:0,defeat:reaction==='defeated'?1:0,stride:walking||activity==='run'?1:0,rightArm,leftArm,workLean:(activity==='cook'?Math.sin(phase)*.18:activity==='forge'?work*.5:0)+idleWave*.2};
      const follow=1-Math.exp(-12*dt);
      for(const key of ['lean','lift','recoil','defeat','stride','rightArm','leftArm','workLean'] as const)p[key]=(p[key]??0)+(target[key]-(p[key]??0))*follow;
      renderer.draw(p);
      if(root.current){root.current.dataset.visionTime=p.time.toFixed(4);root.current.dataset.visionDeformation=[p.lean,p.lift,p.recoil,p.defeat,p.stride].map(n=>n.toFixed(4)).join(',');}
      if(root.current)root.current.dataset.visionJoints=[p.rightArm??0,p.leftArm??0,p.workLean??0].map(n=>n.toFixed(4)).join(',');
      handle=requestAnimationFrame(tick);
    };
    handle=requestAnimationFrame(tick);return()=>cancelAnimationFrame(handle);
  },[ready,reduced,actorPaused,signature,cue,reaction,walking,activity,idleMotion]);
  useEffect(()=>{
    if(hero||!ready||soundMode==='off'||actorPaused||document.hidden||document.querySelector('[role="dialog"][aria-modal="true"]'))return;
    const signature=`${reaction}:${reactionKey??''}`;if(signature===lastSound.current)return;
    const initial=!lastSound.current;lastSound.current=signature;
    if(reaction==='hit'||reaction==='defeated'){if(soundMode==='all')playGameSound('impact');playMonsterSound('monster_hurt');}
    else if(reaction==='taunt')playMonsterSound('monster_laugh');else if(initial)playMonsterSound('monster_growl');
  },[hero,ready,reaction,reactionKey,soundMode,actorPaused]);
  return <span ref={root} className={`vision-character vision-character--continuous vision-character--original-hero ${legacyIdentity?'monster-mind-actor':''} ${className}`} style={style}
    role={decorative?undefined:'img'} aria-label={decorative?undefined:alt} aria-hidden={decorative||undefined}
    data-original-hero={hero?(identity==='deer'?'barratt':identity):undefined} data-cohesive-cast={identity} data-vision-character={identity} data-vision-ready={ready} data-vision-paused={actorPaused} data-scene-idle-motion={idleMotion??'none'}
    data-monster-actor={legacyIdentity?'true':undefined} data-monster-identity={legacyIdentity} data-monster-ready={legacyIdentity?ready:undefined} data-monster-reaction={legacyIdentity?reaction:undefined}
    data-vision-art-pose={artPose??'rest'} data-vision-frame="0" data-vision-frame-count="1" data-vision-total-frames="1"
    data-vision-activity={activity} data-vision-playback={showFallback?'continuous-fallback':'mesh'} data-vision-motion={walking?'walk':reaction==='idle'?cue:reaction}>
    <span className="vision-character-contact"/>
    <span className="vision-character-breath"><canvas ref={canvas} className="original-hero-canvas" style={showFallback?{visibility:'hidden'}:undefined} aria-hidden="true"/>
      {showFallback?<svg className="original-hero-fallback" style={fallbackFit?{inset:'auto',left:'50%',bottom:'5%',translate:'-50% 0',width:fallbackFit.width,height:fallbackFit.height}:undefined} viewBox={fallbackFit?.box??'0 0 1000 1000'} preserveAspectRatio="none" aria-hidden="true"><image href={source} width="1000" height="1000" preserveAspectRatio="none" /></svg>:null}
      {children}
    </span>
  </span>;
});
