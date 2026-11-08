import React from 'react';

/** Shared glass material. Every pane keeps the same complete outer cell area. */
export function GlassDefinitions({id}:{id:string}){
 return <defs>
  <linearGradient id={`${id}-lit`} x2=".8" y2="1"><stop stopColor="#a4fff3"/><stop offset=".45" stopColor="#49d4df"/><stop offset="1" stopColor="#167e9e"/></linearGradient>
  <linearGradient id={`${id}-dark`} x2=".7" y2="1"><stop stopColor="#315c6b"/><stop offset=".48" stopColor="#153b4b"/><stop offset="1" stopColor="#092b3b"/></linearGradient>
  <linearGradient id={`${id}-broken`} x2=".9" y2="1"><stop stopColor="#b7a0d4"/><stop offset=".5" stopColor="#79548f"/><stop offset="1" stopColor="#49375f"/></linearGradient>
 </defs>;
}

const fractures=[
 'M16 1 14 9 18 14 13 19 15 27 M14 9 7 12 1 9 M18 14 24 11 27 13 M13 19 6 21 3 27 M7 12 8 4',
 'M1 18 8 15 12 8 17 13 22 9 27 11 M12 8 10 1 M17 13 16 20 21 27 M8 15 6 22 1 24 M16 20 25 19 27 23',
 'M5 1 10 8 9 14 17 17 20 27 M10 8 18 6 22 1 M9 14 3 17 1 23 M17 17 23 12 27 15 M18 6 20 12',
] as const;

export function GlassPane({id,lit,cracked,index}:{id:string;lit:boolean;cracked:boolean;index:number}){
 const state=cracked?'broken':lit?'lit':'dark';
 return <g className="sw-glass-pane">
  <rect x="1" y="1" width="26" height="26" rx="2" fill={`url(#${id}-${state})`} stroke="#d7c691" strokeWidth=".75"/>
  <path d="M2 2H26L23 5H5V23L2 26Z" fill={cracked?'#e2c7f5':'#d4fff8'} opacity={lit?.65:.35}/>
  <path d="M2 26H26V2L23 5V23H5Z" fill="#041d30" opacity=".55"/>
  <path d="M5 5H23V23H5Z" fill="none" stroke={lit?'#c4fff4':'#91bac6'} strokeOpacity=".55" strokeWidth=".6"/>
  {cracked?<>
   <path d="M3 3H14L9 13 3 17Z" fill="#e2c8fa" opacity=".22"/>
   <path d="M18 14 25 12 25 24 15 24Z" fill="#231f43" opacity=".26"/>
   <path className="sw-glass-fracture" d={fractures[index%fractures.length]} fill="none" stroke="#2d2345" strokeWidth="1.25" strokeLinejoin="miter"/>
   <path d={fractures[index%fractures.length]} transform="translate(.4 -.35)" fill="none" stroke="#f6eaff" strokeWidth=".7" strokeLinejoin="miter"/>
  </>:<>
   <path d="M5 5H23L5 17Z" fill="#f3ffff" opacity={lit?.22:.11}/>
   <path d="M8 23 23 9V13L12 23Z" fill="#e6ffff" opacity={lit?.17:.08}/>
  </>}
 </g>;
}
