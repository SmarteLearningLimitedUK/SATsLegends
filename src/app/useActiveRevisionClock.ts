import {useCallback,useEffect,useRef} from 'react';
/** Independent of countdowns; no wall-clock/background time is credited. */
export function useActiveRevisionClock(key:string,active:boolean,paused:boolean){
 const clock=useRef({elapsed:0,last:performance.now(),active:false});
 useEffect(()=>{clock.current={elapsed:0,last:performance.now(),active:false};},[key]);
 useEffect(()=>{
  const sample=()=>{const now=performance.now(),c=clock.current;if(c.active)c.elapsed+=Math.max(0,now-c.last);c.last=now;c.active=active&&!paused&&!document.hidden;};
  sample();const timer=window.setInterval(sample,250);document.addEventListener('visibilitychange',sample);
  return()=>{sample();clock.current.active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',sample);};
 },[key,active,paused]);
 return useCallback(()=>clock.current.elapsed+(clock.current.active?Math.max(0,performance.now()-clock.current.last):0),[]);
}
