import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import GameSetAtmosphere from './GameSetAtmosphere';
import GameSetFixture from './GameSetFixture';
import GameSceneEffects from './GameSceneEffects';
import {GAME_SETS} from './gameStaging';
import './game-staging.css';
import './scene-production.css';
import { GameSceneArtworkContext, getGameSceneArtwork } from './gameSceneArtwork';
import type {MiniGameSessionEventHandlers} from '../app/gameplaySessionContract';
interface Props<P>{id:string;Component:React.ComponentType<P>|React.LazyExoticComponent<React.ComponentType<P>>;gameProps:P;}
/** Decorates the real play surface. It never moves controls or changes game events. */
export default function GameSetStage<P extends Record<string,unknown>>({id,Component,gameProps}:Props<P>){
 const scope=useRef<HTMLDivElement>(null);const [anchor,setAnchor]=useState<HTMLElement|null>(null);const [world,setWorld]=useState<HTMLElement|null>(null);
 const [effectsHost,setEffectsHost]=useState<HTMLElement|null>(null);
 const spec=GAME_SETS[id];if(!spec)throw new Error(`Missing staging definition: ${id}`);
 const scenery=getGameSceneArtwork(id);
 const [cue,setCue]=useState<{kind:'idle'|'reward'|'error';sequence:number}>({kind:'idle',sequence:0});const cueTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{setCue({kind:'idle',sequence:0});return()=>{if(cueTimer.current)clearTimeout(cueTimer.current);};},[id]);
 const flash=useCallback((value:'reward'|'error')=>{if(cueTimer.current)clearTimeout(cueTimer.current);setCue(previous=>({kind:value,sequence:previous.sequence+1}));cueTimer.current=setTimeout(()=>setCue(previous=>({...previous,kind:'idle'})),1100);},[]);
 const incoming=gameProps.sessionEvents as MiniGameSessionEventHandlers|undefined;
 const events=useMemo<MiniGameSessionEventHandlers|undefined>(()=>{
  if(!incoming)return incoming;
  return {...incoming,onCorrectAnswer:event=>{flash('reward');incoming.onCorrectAnswer?.(event);},onIncorrectAnswer:event=>{flash('error');incoming.onIncorrectAnswer?.(event);}};
 },[incoming,flash]);
 // Angle Arena reports rounds through its existing callback rather than the
 // typed answer handlers. Decorate that path without emitting a second score.
 const incomingRoundComplete=gameProps.onRoundComplete as ((correct:boolean)=>void)|undefined;
 const roundComplete=useMemo(()=>incomingRoundComplete?(correct:boolean)=>{flash(correct?'reward':'error');incomingRoundComplete(correct);}:undefined,[incomingRoundComplete,flash]);
 const stagedProps={...gameProps,sessionEvents:events,...(roundComplete?{onRoundComplete:roundComplete}:{})};
 const paused=Boolean((gameProps.sessionState as {paused?:boolean}|undefined)?.paused);
 const [backgrounded,setBackgrounded]=useState(false);
 useEffect(()=>{
  const update=()=>setBackgrounded(document.hidden);
  update();document.addEventListener('visibilitychange',update);
  return()=>document.removeEventListener('visibilitychange',update);
 },[]);
 useEffect(()=>{
  const root=scope.current;if(!root)return;
  let installed:HTMLElement|null=null;
  const find=()=>{
   setEffectsHost(root.firstElementChild as HTMLElement|null);
   setWorld(root.querySelector<HTMLElement>('[data-game-scene-image]')?.closest('div') ?? root.firstElementChild as HTMLElement|null);
   const candidate=spec.material==='native'||!spec.anchor?null:root.querySelector<HTMLElement>(spec.anchor);
   if(candidate===installed){if(candidate&&getComputedStyle(candidate).position==='static')candidate.classList.add('game-stage-positioned');return;}
   installed?.removeAttribute('data-stage-surface');installed?.classList.remove('game-stage-positioned');
   installed=candidate;
   if(candidate){candidate.setAttribute('data-stage-surface',spec.material);candidate.style.setProperty('--stage-accent',spec.accent);if(getComputedStyle(candidate).position==='static')candidate.classList.add('game-stage-positioned');}
   setAnchor(candidate);
  };
  find();const observer=new MutationObserver(find);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  return()=>{observer.disconnect();installed?.removeAttribute('data-stage-surface');installed?.classList.remove('game-stage-positioned');installed?.style.removeProperty('--stage-accent');};
 },[id,spec,scenery]);
 return <div ref={scope} className="game-staging-host" data-game-set={id} data-stage-name={spec.name} data-stage-native={spec.material==='native'} data-stage-paused={paused||backgrounded} data-stage-cue={cue.kind}>
  <GameSceneArtworkContext.Provider value={scenery}><Component {...stagedProps}/></GameSceneArtworkContext.Provider>
  {world&&createPortal(<GameSetAtmosphere set={spec}/>,world)}
  {effectsHost&&createPortal(<GameSceneEffects id={id} cue={cue.kind} sequence={cue.sequence}/>,effectsHost)}
  {anchor&&createPortal(<GameSetFixture set={spec}/>,anchor)}
 </div>;
}
