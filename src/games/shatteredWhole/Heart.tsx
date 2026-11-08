import {useId} from 'react';
const edge=[[50,12],[25,0],[3,17],[0,45],[16,65],[50,105],[84,65],[100,45],[97,17],[75,0]];
/** Ten persistent facets: one becomes whole after each accepted puzzle. */
export default function Heart({restored}:{restored:number}){
 const id=useId().replaceAll(':','');
 return <svg viewBox="-10 -10 120 130" role="img" aria-label={`Heart of Wholeness: ${restored} of 10 fragments restored`} data-sw-heart={restored}><defs><linearGradient id={id} x2="1" y2="1"><stop stopColor="#d7fff4"/><stop offset=".5" stopColor="#47dede"/><stop offset="1" stopColor="#7f4bd9"/></linearGradient></defs>{edge.map(([x,y],i)=>{const [a,b]=edge[(i+1)%edge.length],done=i<restored,dx=done?0:(x-50)*.08,dy=done?0:(y-45)*.08;return <polygon key={i} points={`50,45 ${x},${y} ${a},${b}`} data-restored={done} style={{transform:`translate(${dx}px,${dy}px)`}} fill={done?`url(#${id})`:'#455363'} stroke={done?'#c0fff3':'#bda979'} strokeWidth="1.4"/>})}<path d="M50 12V105M3 17 50 45 97 17M0 45 50 45 100 45" fill="none" stroke="#efffe6" strokeWidth="1" opacity=".65"/></svg>;
}
