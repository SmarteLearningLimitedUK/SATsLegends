import React,{memo,useId} from 'react';

/** Static decorative markup; CSS drives the breeze without another JS animation loop. */
export default memo(function BloomBreeze(){
 const id=useId().replace(/:/g,'');
 return <div className="bloom-breeze" aria-hidden="true">
  <svg className="bloom-wind-trails" viewBox="0 0 1200 480" preserveAspectRatio="none">
   <defs><linearGradient id={`breeze-${id}`}><stop stopColor="#b7fff0" stopOpacity="0"/><stop offset=".3" stopColor="#b7fff0" stopOpacity=".7"/><stop offset=".65" stopColor="#ffe8a4" stopOpacity=".8"/><stop offset="1" stopColor="#ffe8a4" stopOpacity="0"/></linearGradient></defs>
   <g fill="none" stroke={`url(#breeze-${id})`} strokeWidth="1.5">
    <path className="bloom-wind-path" pathLength="1" d="M-80 280C180 90 330 390 630 230S1030 250 1280 100"/>
    <path className="bloom-wind-path" pathLength="1" d="M-80 360C220 170 480 430 780 290S1100 210 1280 260"/>
    <path className="bloom-wind-path" pathLength="1" d="M-80 190C170 300 320 100 580 155S980 360 1280 175"/>
   </g>
  </svg>
  {[0,1,2,3,4,5].map(i=><span key={i} className="bloom-air-leaf" style={{top:`${18+i*11}%`,'--drift-delay':`${i*-2.3}s`,'--drift-duration':`${13+i*.9}s`} as React.CSSProperties}>
   <svg viewBox="0 0 24 14" fill="currentColor"><path d="M1 12C5 0 16-2 23 2C19 12 9 16 1 12Z"/><path d="M3 11L19 4" fill="none" stroke="#fff7d2" strokeWidth="1"/></svg>
  </span>)}
  {[0,1,2,3,4,5,6,7].map(i=><span key={i} className="bloom-pollen" style={{left:`${9+(i*17)%83}%`,top:`${12+(i*23)%75}%`,'--pollen-delay':`${i*-1.7}s`,'--pollen-duration':`${7+i*.6}s`} as React.CSSProperties}>
   <svg viewBox="-5 -5 10 10" fill="currentColor"><path d="M0-5L1.1-1.1L5 0L1.1 1.1L0 5L-1.1 1.1L-5 0L-1.1-1.1Z"/></svg>
  </span>)}
 </div>;
});
