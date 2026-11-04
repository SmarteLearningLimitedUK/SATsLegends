import React,{useState,useEffect} from 'react';
import {useSceneSize} from '../useSceneSize';
export interface ReadingPoint {label:string;value:number|null;}
/** Projects the original displayed graph, including its genuinely unknown plot point. */
export default function LinePlot({points,ticks,highlight,plotIndex,onInspect}:{points:ReadingPoint[];ticks:number[];highlight?:number;plotIndex?:number;onInspect?:(point:ReadingPoint|null)=>void}){
 const [inspected,setInspected]=useState<number|null>(null),signature=points.map(p=>`${p.label}:${p.value}`).join('|');
 useEffect(()=>setInspected(null),[signature]);
 const inspect=(index:number)=>{const next=inspected===index?null:index;setInspected(next);onInspect?.(next===null?null:points[next]);};
 const size=useSceneSize(),left=36,right=Math.max(left+1,size.w-12),top=12,bottom=Math.max(top+1,size.h-26),maximum=ticks.at(-1)??1;
 const x=(index:number)=>left+index/Math.max(1,points.length-1)*(right-left),y=(value:number)=>bottom-value/maximum*(bottom-top),stride=Math.max(1,Math.ceil((ticks.length-1)/Math.max(2,Math.floor((bottom-top)/22)))),visible=ticks.filter((v,i)=>i%stride===0||v===maximum).filter((v,i)=>i===0||v===maximum||(maximum-v)/maximum*(bottom-top)>=22),paths:string[]=[];let segment='';
 points.forEach((p,i)=>{if(p.value===null){if(segment)paths.push(segment);segment='';return}segment+=`${segment?'L':'M'}${x(i)} ${y(p.value)}`});if(segment)paths.push(segment);
 return <div ref={size.ref} className="line-live-plot" role="group" aria-label="Water temperature in degrees Celsius plotted against time in minutes. Tap a plotted point to trace its axes." style={{visibility:size.w>0?'visible':'hidden'}}><svg viewBox={`0 0 ${size.w||1} ${size.h||1}`}>
  {visible.map(value=><g key={value}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="#84a6ad" strokeWidth=".7" strokeDasharray="4 3"/><text data-line-y-tick={value} x={left-7} y={y(value)} dominantBaseline="middle" textAnchor="end" fontSize="14" fontWeight="650" fill="#fff6df">{value}</text></g>)}
  {points.map((p,i)=><g key={p.label}><line x1={x(i)} x2={x(i)} y1={top} y2={bottom} stroke="#84a6ad" strokeWidth=".7" strokeDasharray="4 3"/><text data-line-x-tick={p.label} x={x(i)} y={bottom+18} textAnchor="middle" fontSize="14" fontWeight="650" fill="#fff6df">{p.label}</text></g>)}
  <path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="#e0edec" strokeWidth="1.1"/>
  {plotIndex!==undefined&&<line data-line-missing-guide x1={x(plotIndex)} x2={x(plotIndex)} y1={top} y2={bottom} stroke="#f9d27d" strokeDasharray="5 4"/>}
  {paths.map((d,i)=><path key={i} d={d} fill="none" stroke="#35edbf" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
  {inspected!==null&&points[inspected]?.value!==null&&<path data-line-trace d={`M${left} ${y(points[inspected].value!)}H${x(inspected)}V${bottom}`} fill="none" stroke="#ffe5a4" strokeWidth="1.8" strokeDasharray="5 3" pointerEvents="none"/>}
  {points.map((p,i)=>p.value===null?null:<g key={p.label} role="button" tabIndex={0} aria-label={`Trace time ${p.label}`} aria-pressed={inspected===i} onClick={()=>inspect(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(i)}}}><circle cx={x(i)} cy={y(p.value)} r="22" fill="transparent"/><circle data-line-point={p.label} data-line-value={p.value} cx={x(i)} cy={y(p.value)} r={highlight===i||inspected===i?6:4.5} fill="#34d9b1" stroke={inspected===i?'#ffe5a4':'#ecfff4'} strokeWidth="1.8" pointerEvents="none"/></g>)}
 </svg></div>;
}
