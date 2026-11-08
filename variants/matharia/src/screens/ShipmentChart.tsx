import React,{useId} from 'react';
import {useSceneSize} from '../useSceneSize';
export interface ShipmentBar {label:string;value:number;color:string;}
/** Same source tick interval and one-crate-per-interval drawing; actual physical chart bounds. */
export default function ShipmentChart({bars,difficulty,caption}:{id:string;bars:ShipmentBar[];difficulty:number;caption:string}){
 const size=useSceneSize(),wood=useId().replaceAll(':','');
 const step=[1,2,5,10,20][Math.max(0,Math.min(4,difficulty-1))],maximum=Math.ceil(Math.max(...bars.map(b=>b.value))/step)*step,top=12,bottom=Math.max(top+1,size.h-10),left=44,right=Math.max(left+1,size.w-8),plotWidth=right-left,column=plotWidth/bars.length;
 const count=maximum/step,stride=Math.max(1,Math.ceil(count/Math.max(2,Math.floor((bottom-top)/22)))),ticks=Array.from({length:count+1},(_,i)=>i*step).filter((v,i)=>i%stride===0||v===maximum).filter((value,index)=>index===0||value===maximum||(maximum-value)/maximum*(bottom-top)>=22),at=(value:number)=>bottom-value/maximum*(bottom-top);
 return <div className="shipment-chart" role="group" aria-label={caption}>
  <div ref={size.ref} className="shipment-chart-plot" style={{visibility:size.w>0?'visible':'hidden'}}><svg viewBox={`0 0 ${size.w||1} ${size.h||1}`} role="img" aria-label={`${caption}. Vertical axis: crates; horizontal axis: boats.`}>
   <defs><linearGradient id={wood} x2="1" y2="1"><stop stopColor="#e2ac64"/><stop offset=".48" stopColor="#b97635"/><stop offset="1" stopColor="#96551e"/></linearGradient></defs>
   {ticks.map(value=><g key={value}><line x1={left} x2={right} y1={at(value)} y2={at(value)} stroke="#83a4aa" strokeWidth=".7" strokeDasharray="4 3"/><text data-shipment-y-tick={value} x={left-7} y={at(value)} dominantBaseline="middle" textAnchor="end" fill="#fff5df" fontSize="14" fontWeight="650">{value}</text></g>)}
   <path d={`M${left} ${top}V${bottom}H${right}`} fill="none" stroke="#e6efe6" strokeWidth="1.1"/>
   {bars.map((bar,index)=>{const n=Math.max(1,Math.round(bar.value/step)),height=bottom-at(bar.value),unitHeight=height/n,side=Math.min(column*.42,unitHeight),x=left+(index+.5)*column-side/2;return <g key={bar.label} data-crate-bar={bar.label} data-crate-value={bar.value}>{Array.from({length:n},(_,i)=>{const y=at(bar.value)+i*unitHeight+(unitHeight-side)/2;return <g key={i}><rect x={x+.5} y={y+.5} width={Math.max(0,side-1)} height={Math.max(0,side-1)} rx="1" fill={`url(#${wood})`} stroke="#663c1c" strokeWidth="1"/><rect x={x+2} y={y+2} width={Math.max(0,side-4)} height={Math.max(0,side-4)} fill="none" stroke="#ffdb96" strokeWidth=".7"/><path d={`M${x+3} ${y+3}L${x+side-3} ${y+side-3}M${x+side-3} ${y+3}L${x+3} ${y+side-3}`} stroke="#603c20" strokeWidth={Math.max(1,side*.09)}/><path d={`M${x+3} ${y+2}L${x+side-2} ${y+side-3}`} stroke="#f2c583" strokeWidth={Math.max(.5,side*.035)}/></g>})}</g>})}
  </svg></div>
  <div className="shipment-chart-labels" style={{paddingLeft:left,paddingRight:size.w-right}} aria-label="Boat names">{bars.map(bar=><span key={bar.label}>{bar.label}</span>)}</div>
 </div>;
}
