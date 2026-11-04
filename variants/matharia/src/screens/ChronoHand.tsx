import React,{useLayoutEffect,useRef} from 'react';
/**200ms source hand adjustment with continuous turns and pausable visual interpolation. */
export default function ChronoHand({angle,paused,reduced,children,...attributes}:{angle:number;paused:boolean;reduced:boolean;children:React.ReactNode;'data-clock-hour-hand'?:boolean;'data-clock-minute-hand'?:boolean}){
 const node=useRef<SVGGElement>(null),motion=useRef<{from:number;to:number;animation:Animation|null}>({from:angle,to:angle,animation:null});
 useLayoutEffect(()=>{const e=node.current!,m=motion.current,progress=m.animation?.effect?.getComputedTiming().progress??1,from=m.from+(m.to-m.from)*progress;m.animation?.cancel();m.from=from;m.to=angle;e.style.transform=`rotate(${angle}deg)`;m.animation=!reduced&&Math.abs(angle-from)>.001?e.animate([{transform:`rotate(${from}deg)`},{transform:`rotate(${angle}deg)`}],{duration:200,easing:'cubic-bezier(0,0,.58,1)',fill:'forwards'}):null},[angle,reduced]);
 useLayoutEffect(()=>()=>{motion.current.animation?.cancel()},[]);
 useLayoutEffect(()=>{const update=()=>{const a=motion.current.animation;if(a&&a.playState!=='finished'){if(paused||document.hidden)a.pause();else a.play()}};update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[angle,reduced,paused]);
 return <g {...attributes} ref={node} style={{transformOrigin:'50% 50%',transformBox:'view-box'}}>{children}</g>;
}
