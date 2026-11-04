import {useState} from 'react';
import type {DepthModel} from '../../systems/content/satsDepthModels';
import {Protractor,colours} from './SatsDepthVisual';
import SatsRevisionGapConstruction from './SatsRevisionGapConstruction';
export default function SatsDepthConstruction({model:m,value,onChange,part='all'}:{model:DepthModel;value:string;onChange:(value:string)=>void;part?:'all'|'model'|'controls'}){
 const [active,setActive]=useState(0);
 if(m.kind==='fraction-grid'||m.kind==='pictogram-build')return <SatsRevisionGapConstruction model={m} value={value} onChange={onChange} part={part}/>;
 if(m.kind==='rectangle-build'){
  const parsed=value.match(/^rect:(\d+):(\d+)$/),length=Number(parsed?.[1]??4),width=Number(parsed?.[2]??4),scale=140/Math.max(length,width);
  return <div className="sats-depth-construction">{part!=='controls'?<svg className="sats-diagram" viewBox="0 0 400 240" role="img" aria-label={`Your rectangle: ${length} cm by ${width} cm`}><rect x={200-length*scale/2} y={110-width*scale/2} width={length*scale} height={width*scale} fill="#69dce244" stroke="#a6edf1" strokeWidth="3"/><text x="200" y="220" textAnchor="middle">{length} cm × {width} cm</text></svg>:null}{part!=='model'?<>{['Length','Width'].map((label,i)=><label key={label}>{label}: {i?width:length} cm<input aria-label={label} type="range" min="1" max="20" step="1" value={i?width:length} onChange={e=>onChange(i?`rect:${length}:${e.target.value}`:`rect:${e.target.value}:${width}`)}/></label>)}</>:null}</div>;
 }
 if(m.kind==='angle-draw'){
  const angle=Number(value.match(/^angle:(\d+)$/)?.[1]??0);
  return <div className="sats-depth-construction">{part!=='controls'?<Protractor angle={angle}/>:null}{part!=='model'?<><label>Position the second ray<input aria-label="Ray angle" type="range" min="0" max="180" step="1" value={angle} onChange={e=>onChange(`angle:${e.target.value}`)}/></label><p role="status">Ray: {angle}°</p></>:null}</div>;
 }
 if(m.kind==='symmetry-axes'){
  const selected=value.split(',').filter(Boolean),angles=[0,90,45,135];
  return <div className="sats-depth-construction">{part!=='controls'?<svg className="sats-diagram" viewBox="0 -45 350 290" role="img" aria-label={`${m.square?'Square':'Non-square rectangle'}, turned ${m.turn} degrees. Selected lines are drawn through the centre.`}><g transform={`rotate(${m.turn} 175 100)`}><rect x="80" y={m.square?5:45} width="190" height={m.square?190:110} fill="#70dbe344" stroke="#a6ecf5" strokeWidth="3"/>{selected.map(s=><path key={s} d="M55 100H295" transform={`rotate(${angles[Number(s)]} 175 100)`} stroke="#ffda79" strokeWidth="3" strokeDasharray="6 4"/>)}</g></svg>:null}{part!=='model'?<div className="sats-depth-tabs">{angles.map((_,i)=><button key={i} type="button" aria-pressed={selected.includes(String(i))} onClick={()=>{const next=selected.includes(String(i))?selected.filter(s=>s!==String(i)):[...selected,String(i)];onChange(next.join(','));}}>Line {'ABCD'[i]}</button>)}</div>:null}</div>;
 }
 if(m.kind!=='line-build'&&m.kind!=='pie-build')return null;
 const line=m.kind==='line-build',prefix=line?'line':'pie',count=m.labels.length;
 const raw=value.startsWith(prefix+':')?value.split(':').slice(1):[];
 const values=Array.from({length:count},(_,i)=>/^\d+$/.test(raw[i]||'')?Number(raw[i]):null);
 const change=(n:number)=>{const next=[...values];next[active]=n;onChange(`${prefix}:${next.map(n=>n===null?'_':n).join(':')}`);};
 const max=line?m.max:360,step=line?m.step:15;
 const x=(i:number)=>55+i*270/(count-1),y=(v:number)=>175-v/(line?m.max:360)*140;
 let angle=-90;
 return <div className="sats-depth-construction" role="group" aria-label={line?'Construct the complete line graph':'Construct the pie chart'}>
  {part!=='controls'?<>{part==='all'?<div className="sats-depth-data">{m.labels.map((label,i)=><span key={label}><strong>{label}</strong> {line?m.readings[i]:m.counts[i]}</span>)}</div>:null}
  <svg className="sats-diagram" viewBox="0 -14 380 253" role="img" aria-label={line?'Your plotted line graph':'Your pie chart sectors'}>
   {line?<><text x="190" y="20" textAnchor="middle">Temperature (°C)</text>{Array.from({length:m.max/m.step+1},(_,i)=><g key={i}><path d={`M40 ${y(i*m.step)}H340`} stroke="#a9e5ef44"/>{i%2===0?<text x="32" y={y(i*m.step)+5} textAnchor="end">{i*m.step}</text>:null}</g>)}{m.labels.map((label,i)=><text key={label} x={x(i)} y="210" textAnchor="middle">{label}</text>)}{values.map((v,i)=>v===null?null:<g key={i}>{i>0&&values[i-1]!==null?<path d={`M${x(i-1)} ${y(values[i-1]!)}L${x(i)} ${y(v)}`} stroke="#6de7ee" strokeWidth="3"/>:null}<circle cx={x(i)} cy={y(v)} r="6" fill="#ffda79"/></g>)}</>:<><circle cx="160" cy="112" r="85" fill="#153b49" stroke="#91e1ec"/>{values.map((v,i)=>{if(!v)return null;const begin=angle;angle+=v;const a=begin*Math.PI/180,b=angle*Math.PI/180;return <path key={i} d={v===360?'M160 27a85 85 0 1 1 0 170a85 85 0 1 1 0 -170':`M160 112L${160+85*Math.cos(a)} ${112+85*Math.sin(a)}A85 85 0 ${v>180?1:0} 1 ${160+85*Math.cos(b)} ${112+85*Math.sin(b)}Z`} fill={colours[i]} stroke="#082c43"/>;})}<text x="280" y="100" textAnchor="middle">Total</text><text x="280" y="135" textAnchor="middle">{values.reduce<number>((sum,n)=>sum+(n??0),0)}°</text></>}
  </svg></>:null}
  {part!=='model'?<><div className="sats-depth-tabs" aria-label={line?'Table of readings: choose a time':'Vote counts: choose a category'}>{m.labels.map((label,i)=><button key={label} type="button" aria-pressed={active===i} style={line?undefined:{borderBottomColor:colours[i],borderBottomWidth:3}} onClick={()=>{setActive(i);if(values[i]===null){const next=[...values];next[i]=0;onChange(`${prefix}:${next.map(n=>n===null?'_':n).join(':')}`);}}}><small>{label}</small><strong>{line?m.readings[i]:`${m.counts[i]} votes`}</strong></button>)}</div>
  <label>{m.labels[active]} {line?'plotted reading':'sector angle'}: {values[active]??'—'}{line?'':'°'}<input type="range" aria-label={line?'Plot reading':'Sector angle'} min="0" max={max} step={step} value={values[active]??0} onChange={e=>change(Number(e.target.value))}/></label></>:null}
 </div>;
}
