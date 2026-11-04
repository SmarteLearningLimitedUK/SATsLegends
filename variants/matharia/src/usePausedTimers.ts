import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
type Pending={callback:()=>void;remaining:number;started:number;timer:ReturnType<typeof setTimeout>|null};
/** Preserves each active-time delay while pausing queued feedback/round transitions. */
export function usePausedTimers(paused:boolean){
 const entries=useRef(new Set<Pending>()),pause=useRef(paused),[hidden,setHidden]=useState(()=>document.hidden);
 const inactive=useRef({total:0,started:paused||document.hidden?Date.now():null as number|null});
 const now=useCallback(()=>{const t=Date.now(),s=inactive.current;return t-s.total-(s.started===null?0:t-s.started)},[]);
 const arm=useCallback((entry:Pending)=>{entry.started=performance.now();entry.timer=setTimeout(()=>{entry.timer=null;if(pause.current)return;entries.current.delete(entry);entry.callback()},entry.remaining)},[]);
 const clear=useCallback(()=>{for(const e of entries.current)if(e.timer!==null)clearTimeout(e.timer);entries.current.clear()},[]);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 useLayoutEffect(()=>{
  pause.current=paused||hidden;
  const t=Date.now(),s=inactive.current;
  if(pause.current&&s.started===null)s.started=t;
  else if(!pause.current&&s.started!==null){s.total+=t-s.started;s.started=null;}
  for(const entry of entries.current){
   if(pause.current&&entry.timer!==null){clearTimeout(entry.timer);entry.timer=null;entry.remaining=Math.max(0,entry.remaining-(performance.now()-entry.started))}
   else if(!pause.current&&entry.timer===null)arm(entry);
  }
 },[paused,hidden,arm]);
 useEffect(()=>clear,[clear]);
 const schedule=useCallback((callback:()=>void,milliseconds:number)=>{const entry:Pending={callback,remaining:milliseconds,started:performance.now(),timer:null};entries.current.add(entry);if(!pause.current)arm(entry);return()=>{if(entry.timer!==null)clearTimeout(entry.timer);entries.current.delete(entry)}},[arm]);
 const interval=useCallback((callback:()=>void,milliseconds:number)=>{
  let active=true,cancel:()=>void;
  const tick=()=>{if(!active)return;callback();if(active)cancel=schedule(tick,milliseconds)};
  cancel=schedule(tick,milliseconds);
  return()=>{active=false;cancel()};
 },[schedule]);
 return useMemo(()=>({schedule,clear,now,interval}),[schedule,clear,now,interval]);
}
