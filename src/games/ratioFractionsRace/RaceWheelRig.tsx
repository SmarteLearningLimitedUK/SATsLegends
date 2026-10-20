import React, {useId} from 'react';
const hubsFor = (src:string) => src.includes('kart-bran-v2') ? [[218,613],[762,653]] : src.includes('kart-mochi-v2') ? [[170,575],[676,634]] : src.includes('kart-vex-v2') ? [[188,598],[720,653]] : [[196,592],[719,646]];
/** Animated hub cutouts preserve each kart's painted wheel and perspective. */
export default function RaceWheelRig({src}:{src:string}) {
 const id=useId().replace(/:/g,'');
 return <svg className="race-wheel-rig" viewBox="0 0 1200 800" aria-hidden="true">
  {hubsFor(src).map(([x,y],i)=><g key={i}>
   <defs><clipPath id={`${id}-${i}`}><ellipse cx={x} cy={y} rx="43" ry="57"/></clipPath></defs>
   <g clipPath={`url(#${id}-${i})`}><image href={src} width="1200" height="800" className="race-wheel-spin" style={{transformOrigin:`${x}px ${y}px`}}/></g>
  </g>)}
 </svg>;
}
