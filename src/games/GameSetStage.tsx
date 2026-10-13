import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import GameSetAtmosphere from './GameSetAtmosphere';
import GameSetFixture from './GameSetFixture';
import {GAME_SETS} from './gameStaging';
import './game-staging.css';
import type {MiniGameSessionEventHandlers} from '../app/gameplaySessionContract';
interface Props<P>{id:string;Component:React.ComponentType<P>|React.LazyExoticComponent<React.ComponentType<P>>;gameProps:P;}
/** Decorates the real play surface. It never moves controls or changes game events. */
export default function GameSetStage<P extends Record<string,unknown>>({id,Component,gameProps}:Props<P>){
 const scope=useRef<HTMLDivElement>(null);const [anchor,setAnchor]=useState<HTMLElement|null>(null);const [world,setWorld]=useState<HTMLElement|null>(null);
 const spec=GAME_SETS[id];if(!spec)throw new Error(`Missing staging definition: ${id}`);
 const [cue,setCue]=useState<'idle'|'reward'|'error'>('idle');const cueTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{setCue('idle');return()=>{if(cueTimer.current)clearTimeout(cueTimer.current);};},[id]);
 const incoming=gameProps.sessionEvents as MiniGameSessionEventHandlers|undefined;
 const events=useMemo<MiniGameSessionEventHandlers|undefined>(()=>{
  if(!incoming||spec.material==='native')return incoming;
  const flash=(value:'reward'|'error')=>{if(cueTimer.current)clearTimeout(cueTimer.current);setCue(value);cueTimer.current=setTimeout(()=>setCue('idle'),1100);};
  return {...incoming,onCorrectAnswer:event=>{flash('reward');incoming.onCorrectAnswer?.(event);},onIncorrectAnswer:event=>{flash('error');incoming.onIncorrectAnswer?.(event);}};
 },[incoming,spec]);
 const stagedProps={...gameProps,sessionEvents:events};
 const paused=Boolean((gameProps.sessionState as {paused?:boolean}|undefined)?.paused);
 useEffect(()=>{
  if(spec.material==='native'||!spec.anchor){setAnchor(null);setWorld(null);return;}
  const root=scope.current;if(!root)return;
  let installed:HTMLElement|null=null;
  const find=()=>{
   setWorld(root.querySelector<HTMLElement>('[data-game-scene-image]')?.closest('div') ?? root.firstElementChild as HTMLElement|null);
   const candidate=root.querySelector<HTMLElement>(spec.anchor!);
   if(candidate===installed){if(candidate&&getComputedStyle(candidate).position==='static')candidate.classList.add('game-stage-positioned');return;}
   installed?.removeAttribute('data-stage-surface');installed?.classList.remove('game-stage-positioned');
   installed=candidate;
   if(candidate){candidate.setAttribute('data-stage-surface',spec.material);candidate.style.setProperty('--stage-accent',spec.accent);if(getComputedStyle(candidate).position==='static')candidate.classList.add('game-stage-positioned');}
   setAnchor(candidate);
  };
  find();const observer=new MutationObserver(find);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  return()=>{observer.disconnect();installed?.removeAttribute('data-stage-surface');installed?.classList.remove('game-stage-positioned');installed?.style.removeProperty('--stage-accent');};
 },[id,spec]);
 return <div ref={scope} className="game-staging-host" data-game-set={id} data-stage-name={spec.name} data-stage-native={spec.material==='native'} data-stage-paused={paused} data-stage-cue={cue}>
  <Component {...stagedProps}/>
  {world&&createPortal(<GameSetAtmosphere set={spec}/>,world)}
  {anchor&&createPortal(<GameSetFixture set={spec}/>,anchor)}
 </div>;
}
