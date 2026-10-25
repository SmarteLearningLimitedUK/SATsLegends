import React, { useLayoutEffect, useRef } from 'react';
import { Gem, Leaf, BarChart3, Landmark, Waves, Snowflake, Star, Lock } from 'lucide-react';
import type { IslandData } from '../../types';
import mapScene from '../../assets/reference-batch-two/map-scene.png';
import guide from '../../assets/reference-screens/island-guide.png';

type IslandState = {island:IslandData;isUnlocked:boolean;completion:number;earnedBrainpower:number;totalPossibleBrainpower:number};
interface Props {states:IslandState[];recommended?:IslandState;onSelect:(island:IslandData)=>void;atlas:string;bounds:Record<number,string>}
const sites=[{id:3,x:30,y:24.5},{id:2,x:75,y:35.3},{id:4,x:25,y:49},{id:7,x:75,y:63},{id:1,x:30,y:76.5}];
const icons:Record<number,React.ElementType>={1:Landmark,2:Leaf,3:Snowflake,4:BarChart3,7:Waves};
export default function ReferenceWorldMap({states,recommended,onSelect,atlas,bounds}:Props){
 const scroll=useRef<HTMLDivElement>(null),extra=useRef<HTMLDivElement>(null);
 const current=recommended??states[0];
 useLayoutEffect(()=>{const align=()=>{if(scroll.current&&extra.current)scroll.current.scrollTop=extra.current.offsetHeight;};align();const frame=requestAnimationFrame(align);return()=>cancelAnimationFrame(frame);},[]);
 const label=(state:IslandState)=>{const Icon=icons[state.island.id]??Gem,stars=Math.round(state.completion/20);return <><span className="reference-map-name"><Icon aria-hidden="true"/><span>{state.island.name}</span>{!state.isUnlocked&&<Lock aria-hidden="true"/>}</span><span className="reference-map-stars" role="img" aria-label={`${state.completion}% complete`}>{[1,2,3,4,5].map(i=><Star key={i} fill={i<=stars?'currentColor':'none'} data-earned={i<=stars} aria-hidden="true"/>)}</span></>;};
 return <div className="reference-world-map" data-reference-world-map>
  <div className="reference-map-scroll" ref={scroll} aria-label="Island map. Scroll up for more islands" tabIndex={0}>
   <div ref={extra} className="reference-map-extra" data-map-extra-islands>
    <svg className="reference-map-extra-water" viewBox="340 530 140 600" preserveAspectRatio="none" aria-hidden="true"><image href={mapScene} width="851" height="1848"/></svg>
    {[8,6,5].map((id,index)=>{const state=states.find(s=>s.island.id===id);if(!state)return null;return <button key={id} className="reference-map-extra-island" data-map-island-id={id} data-button-skin="none" disabled={!state.isUnlocked} aria-label={`${state.island.name}${!state.isUnlocked?', locked':''}`} onClick={()=>onSelect(state.island)} style={{left:index%2?'8%':'49%',top:`${index*28+5}%`}}><svg viewBox={bounds[id]} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><image href={atlas} width="888" height="1776"/></svg>{label(state)}</button>;})}
   </div>
   <div className="reference-map-five" style={{backgroundImage:`url(${mapScene})`}} data-reference-map-scene>
    {sites.map(site=>{const state=states.find(s=>s.island.id===site.id);if(!state)return null;return <button key={site.id} className="reference-map-island" data-map-island-id={site.id} data-button-skin="none" disabled={!state.isUnlocked} aria-label={`${state.island.name}${!state.isUnlocked?', locked':''}`} onClick={()=>onSelect(state.island)} style={{left:`${site.x}%`,top:`${site.y}%`}}>{label(state)}{current.island.id===site.id&&<span className="reference-map-pin" aria-hidden="true"><img src={guide} alt=""/></span>}</button>;})}
   </div>
  </div>
  <header className="reference-map-header">
   <div className="reference-map-current"><span className="reference-map-avatar"><img src={guide} alt=""/></span><div><span className="reference-map-category">{current.island.category} · Island {current.island.id}</span><h1>{current.island.name}</h1><div className="reference-map-completion"><div role="progressbar" aria-label={`${current.island.name} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.completion}><span style={{width:`${current.completion}%`}}/></div><strong>{current.completion}%</strong></div></div></div>
   <div className="reference-map-tokens"><span>Brainpower<br/>Tokens</span><strong><Gem aria-hidden="true"/>{current.earnedBrainpower}/{current.totalPossibleBrainpower}</strong></div>
  </header>
 </div>;
}
