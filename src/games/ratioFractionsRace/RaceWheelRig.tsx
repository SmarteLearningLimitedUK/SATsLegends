import React, {useId} from 'react';
import kart1 from '../../assets/gokarts/karts/1.png';
import kart2 from '../../assets/gokarts/karts/2.png';
import kart3 from '../../assets/gokarts/karts/3.png';
const hubsFor = (src:string) => src===kart1 ? [[323,544],[717,567]] : src===kart2 ? [[259,620],[650,642]] : src===kart3 ? [[300,648],[679,671]] : [[248,650],[647,676]];
/** Animated hub cutouts preserve each kart's painted wheel and perspective. */
export default function RaceWheelRig({src}:{src:string}) {
 const id=useId().replace(/:/g,'');
 return <svg className="race-wheel-rig" viewBox="0 0 1200 800" aria-hidden="true">
  {hubsFor(src).map(([x,y],i)=><g key={i}>
   <defs><clipPath id={`${id}-${i}`}><ellipse cx={x} cy={y} rx="30" ry="47"/></clipPath></defs>
   <g clipPath={`url(#${id}-${i})`}><image href={src} width="1200" height="800" className="race-wheel-spin" style={{transformOrigin:`${x}px ${y}px`}}/></g>
  </g>)}
 </svg>;
}
