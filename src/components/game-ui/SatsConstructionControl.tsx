import React, { useState } from 'react';
import SatsSymmetryControl from './SatsSymmetryControl';
import SatsDepthConstruction from './SatsDepthConstruction';
import type { SatsMission } from '../../systems/content/satsAdventure';

const graphNames = ['Red', 'Blue', 'Green'] as const;
const graphColours = ['#fa6b6b', '#67b4fa', '#70d688'];

export const isConstructionMission = (id: string) => ['draw-rectangle', 'draw-angle', 'construct-graph', 'ext-symmetry','depth-line-build','depth-pie-build','depth-angle-draw','depth-symmetry-axes','depth-rectangle-build','revision-fraction-shade','revision-pictogram-build'].includes(id);

export default function SatsConstructionControl({ mission, value, onChange, part }: {
  mission: SatsMission; value: string; onChange: (value: string) => void;
  part?:'all'|'model'|'controls';
}) {
  const [activeBar, setActiveBar] = useState(0);
  if(mission.visual.type==='depth')return <div key={mission.id} className="sats-depth-host" data-construction-part={part ?? 'all'}><SatsDepthConstruction model={mission.visual.model} value={value} onChange={onChange} part={part} /></div>;
  if (mission.id === 'ext-symmetry') return part === 'controls' ? <p>Tap squares on the diagram to complete the reflection.</p> : <SatsSymmetryControl mission={mission} value={value} onChange={onChange} />;
  if (mission.id === 'draw-rectangle') {
    const match = value.match(/^rect:(\d+):(\d+):(\d+)$/);
    const [length, width] = value === mission.fields[0].answer ? [6, 4] : match ? match.slice(1,3).map(Number) : [4, 4];
    const corners=4;
    const change = (nextLength: number, nextWidth: number) => {
      onChange(nextLength === 6 && nextWidth === 4
        ? mission.fields[0].answer : `rect:${nextLength}:${nextWidth}:4`);
    };
    return <div className="sats-construction" data-construction-part={part ?? 'all'} aria-label="Build a rectangle">
      {part !== 'controls' && <svg className="sats-diagram" viewBox="0 0 260 150" role="img" aria-label={`${length} centimetres long, ${width} centimetres wide, ${corners} right angles`}>
        <rect x="45" y="24" width={length * 26} height={width * 22} rx="2" fill="#268ab7" stroke="#d5faff" strokeWidth="3" />
        {corners === 4 ? <path d={`M45 37h13V24M45 ${24 + width * 22 - 13}h13v13M${45 + length * 26 - 13} 24v13h13M${45 + length * 26 - 13} ${24 + width * 22}v-13h13`} fill="none" stroke="#fff1ac" strokeWidth="2" /> : null}
        <text x="130" y="143" textAnchor="middle">{length} cm × {width} cm</text>
      </svg>}
      {part !== 'model' && <div className="sats-construction-controls">
        <div><span>Long side: {length} cm</span><button type="button" aria-label="Decrease long side" onClick={() => change(Math.max(2, length - 1), width)}>−</button><button type="button" aria-label="Increase long side" onClick={() => change(Math.min(8, length + 1), width)}>+</button></div>
        <div><span>Short side: {width} cm</span><button type="button" aria-label="Decrease short side" onClick={() => change(length, Math.max(2, width - 1))}>−</button><button type="button" aria-label="Increase short side" onClick={() => change(length, Math.min(8, width + 1))}>+</button></div>
        <p>A rectangle always has four right angles.</p>
      </div>}
    </div>;
  }
  if (mission.id === 'draw-angle') {
    const current = value === mission.fields[0].answer ? 65 : Number(value.match(/^angle:(\d+)$/)?.[1] ?? 45);
    const angle = Math.max(20, Math.min(120, current));
    const radians = angle * Math.PI / 180;
    const x = 50 + Math.cos(radians) * 105;
    const y = 122 - Math.sin(radians) * 105;
    const change = (next: number) => onChange(next === 65 ? mission.fields[0].answer : `angle:${next}`);
    return <div className="sats-construction" data-construction-part={part ?? 'all'} aria-label="Set the angle">
      {part !== 'controls' && <svg className="sats-diagram" viewBox="0 0 230 155" role="img" aria-label={`Current angle ${angle} degrees`}>
        <circle cx="50" cy="122" r="6" fill="#ffd36e" /><path d={`M195 122H50L${x} ${y}`} fill="none" stroke="#a8f5ff" strokeWidth="5" strokeLinecap="round" />
        <text x="115" y="150" textAnchor="middle">{angle}°</text>
      </svg>}
      {part !== 'model' && <div className="sats-construction-controls"><div><span>Angle: {angle}°</span><button type="button" aria-label="Decrease angle by five degrees" onClick={() => change(Math.max(20, angle - 5))}>− 5°</button><button type="button" aria-label="Increase angle by five degrees" onClick={() => change(Math.min(120, angle + 5))}>+ 5°</button></div></div>}
    </div>;
  }
  const parsed = value.match(/^graph:(\d+):(\d+):(\d+)$/);
  const bars = value === mission.fields[0].answer ? [10, 15, 5] : parsed ? parsed.slice(1).map(Number) : [0, 0, 0];
  const change = (index: number, delta: number) => {
    const next = [...bars]; next[index] = Math.max(0, Math.min(20, next[index] + delta));
    onChange(next[0] === 10 && next[1] === 15 && next[2] === 5
      ? mission.fields[0].answer : `graph:${next.join(':')}`);
  };
  return <div className="sats-construction" data-construction-part={part ?? 'all'} aria-label="Build a bar chart">
    {part !== 'controls' && <svg className="sats-diagram" viewBox="0 0 280 170" role="img" aria-label={`Chart: Red ${bars[0]}, Blue ${bars[1]}, Green ${bars[2]}`}>
      {[0, 5, 10, 15, 20].map((tick) => <g key={tick}><line x1="40" x2="266" y1={130 - tick * 5} y2={130 - tick * 5} stroke="#a9dce477" /><text x="28" y={135 - tick * 5} textAnchor="end">{tick}</text></g>)}
      {bars.map((bar, index) => <g key={graphNames[index]}><rect x={58 + index * 74} y={130 - bar * 5} width="42" height={bar * 5} fill={graphColours[index]} stroke="#f5feff" strokeWidth="2" /><text x={79 + index * 74} y="151" textAnchor="middle">{graphNames[index]}</text></g>)}
    </svg>}
    {part !== 'model' && <div className="sats-legacy-graph-controls">
      <div className="sats-legacy-graph-tabs">{graphNames.map((name,index)=><button type="button" key={name} aria-label={`Choose ${name} bar`} aria-pressed={activeBar===index} onClick={()=>setActiveBar(index)}>{name}</button>)}</div>
      <div className="sats-legacy-graph-step"><span>{graphNames[activeBar]}: {bars[activeBar]}</span><button type="button" aria-label={`Decrease ${graphNames[activeBar]} bar by five`} onClick={()=>change(activeBar,-5)}>− 5</button><button type="button" aria-label={`Increase ${graphNames[activeBar]} bar by five`} onClick={()=>change(activeBar,5)}>+ 5</button></div>
    </div>}
  </div>;
}
