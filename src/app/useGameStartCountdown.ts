import {useEffect,useRef,useState} from 'react';
import {playGameCountdownTick} from '../audio/gameAudio';

/** Hold the session until its loaded scene and briefing are ready, then count three active seconds. */
export function useGameStartCountdown(active:boolean,runKey:string,blocked:boolean){
 const [count,setCount]=useState({key:runKey,value:3});
 const [ready,setReady]=useState(false);
 const [hidden,setHidden]=useState(()=>document.hidden);
 const ticked=useRef('');
 const held=active&&(count.key!==runKey||count.value>0);
 useEffect(()=>{setCount({key:runKey,value:3});setReady(false);ticked.current='';},[active,runKey]);
 useEffect(()=>{
  const update=()=>setHidden(document.hidden);
  document.addEventListener('visibilitychange',update);
  return()=>document.removeEventListener('visibilitychange',update);
 },[]);
 useEffect(()=>{
  if(!held)return;
  const update=()=>{
   const question=document.querySelector('.screen-gameplay [data-game-set] [data-game-question]');
   const dialog=[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(node=>node.getClientRects().length>0);
   setReady(Boolean(question?.getClientRects().length)&&!dialog);
  };
  const observer=new MutationObserver(update);
  observer.observe(document.body,{childList:true,subtree:true});update();
  return()=>observer.disconnect();
 },[held,runKey,blocked]);
 const value=held&&ready&&!blocked&&!hidden?(count.key===runKey?count.value:3):null;
 useEffect(()=>{
  if(value===null)return;
  const stamp=`${runKey}:${value}`;
  if(ticked.current!==stamp){ticked.current=stamp;playGameCountdownTick();}
  const timer=window.setTimeout(()=>setCount(current=>({key:runKey,value:Math.max(0,(current.key===runKey?current.value:3)-1)})),1000);
  return()=>window.clearTimeout(timer);
 },[runKey,value]);
 return {held,value};
}
