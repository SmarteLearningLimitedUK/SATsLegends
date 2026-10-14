import React from 'react';

const HARBOURS = new Set(['graph_grabber','remainder_run']);
const MACHINES = new Set(['factor_frenzy','formula_forge','mean_machine','percent_power','timekeeper_temple','conversion_canyon']);
const FIRE = new Set(['unit_mixer','fraction_forge','formula_forge','problem_pyramid']);
const SKY = new Set(['coordinates_quest','treasure_path','rounding_rocket','line_graph_lab','scale_builder','area_architect']);

/** Peripheral atmosphere stays behind the playable controls. No timers or scoring. */
export default function GameSceneEffects({id}:{id:string}) {
  return <div className="scene-effects" data-scene-effects={id} aria-hidden="true">
    {HARBOURS.has(id)&&<svg className="scene-dock-swing" viewBox="0 0 140 240"><path d="M69 0V128" stroke="#392d22" strokeWidth="6"/><path d="M60 128Q90 134 71 155Q48 158 53 143" fill="none" stroke="#a7c2bd" strokeWidth="7"/><path d="M20 177L67 151L116 179L116 222L69 237L20 219Z" fill="#a86732" stroke="#3e2e20" strokeWidth="4"/><path d="M20 177L69 198L116 179M69 198V237M42 177L92 225M94 167L45 228" fill="none" stroke="#e1ac64" strokeWidth="6"/></svg>}
    {MACHINES.has(id)&&<svg className="scene-machinery" viewBox="0 0 120 300"><path d="M20 280V66Q20 34 52 34H100" fill="none" stroke="#43322b" strokeWidth="20"/><path d="M20 280V66Q20 34 52 34H100" fill="none" stroke="#bf995b" strokeWidth="12"/><g className="scene-turbine" fill="#d0aa62" stroke="#65503c" strokeWidth="3">{Array.from({length:8},(_,i)=><path key={i} d="M48 118H68L75 130L68 145H48Z" transform={`rotate(${i*45} 60 170)`}/>)}<circle cx="60" cy="170" r="22" fill="#154457"/><circle cx="60" cy="170" r="10" fill="#9af7ec"/></g><path className="scene-energy-stream" d="M20 270V64Q20 34 52 34H100" fill="none" stroke="#a2fff1" strokeWidth="4" strokeDasharray="12 35"/></svg>}
    {FIRE.has(id)&&<div className="scene-embers">{Array.from({length:10},(_,i)=><i key={i} style={{left:`${i%2?88+(i%4)*2:2+(i%4)*2}%`,animationDelay:`${-i*.65}s`}}/>)}</div>}
    {SKY.has(id)&&<div className="scene-sky-haze"><i/><i/></div>}
    <div className="scene-reward-flare" />
  </div>;
}
