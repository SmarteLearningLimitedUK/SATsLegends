import React from 'react';
import type { MissionVisual } from '../../systems/content/satsAdventure';

/** Familiar teaching models used by both the guided workshop and Core missions. */
export default function SatsMissionVisual({ visual }: { visual: MissionVisual }) {
  if (visual.type === 'numberline') return <svg className="sats-diagram" viewBox="0 0 420 150" role="img" aria-label={`Number line from ${visual.min} to ${visual.max}, start marker at ${visual.marker}`}>
    <path d="M20 75H400" stroke="#cef5ff" strokeWidth="3" />
    {Array.from({ length: 11 }, (_, i) => <g key={i}><path d={`M${20+i*38} 64V86`} stroke="#cef5ff" strokeWidth="2" /><text x={20+i*38} y="113" textAnchor="middle">{visual.min+(visual.max-visual.min)*i/10}</text></g>)}
    <path d={`M${20+(visual.marker-visual.min)/(visual.max-visual.min)*380} 64l-9 -17h18z`} fill="#ffd15a" />
  </svg>;
  if (visual.type === 'pie') {
    let angle = -90;
    const colours = ['#69dde7', '#ffc94c', '#ea9289'];
    return <svg className="sats-diagram" viewBox="0 0 420 240" role="img" aria-label={`Pie chart: ${visual.labels.map((l,i)=>`${l} ${visual.angles[i]} degrees`).join(', ')}`}>
      {visual.angles.map((sector,i) => { const from = angle * Math.PI / 180; angle += sector; const to = angle * Math.PI / 180; return <path key={i} d={`M125 120L${125+Math.cos(from)*95} ${120+Math.sin(from)*95}A95 95 0 ${sector>180?1:0} 1 ${125+Math.cos(to)*95} ${120+Math.sin(to)*95}Z`} fill={colours[i]} stroke="#082844" strokeWidth="3" />; })}
      {visual.labels.map((l,i)=><g key={l}><rect x="240" y={58+i*50} width="16" height="16" rx="3" fill={colours[i]} /><text x="265" y={72+i*50}>{l}: {visual.angles[i]}°</text></g>)}
    </svg>;
  }
  if (visual.type === 'equation' || visual.type === 'sequence') return <div className="sats-equation">{(visual.type === 'equation' ? visual.lines : visual.values).map((line, i) => <span key={i}>{line}</span>)}</div>;
  if (visual.type === 'fractions') return <div className="sats-fractions">{visual.values.map((value, i) => {
    const [top, bottom] = value.split('/');
    return <div key={i} className="sats-fraction">{bottom ? <><span>{top}</span><span>{bottom}</span></> : <span>{value}</span>}</div>;
  })}</div>;
  if (visual.type === 'table') return <table className="sats-table"><thead><tr>{visual.headings.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visual.rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>;
  if (visual.type === 'ratio') return <div className="sats-ratio">{visual.labels.map((label, i) => <div key={label}><strong>{label}: {visual.parts[i]}</strong><div aria-hidden="true">{Array.from({ length: Math.min(visual.parts[i], 8) }, (_, j) => <span key={j} />)}</div></div>)}</div>;
  if (visual.type === 'bars' || visual.type === 'line') {
    const max = Math.ceil(Math.max(...visual.values) / 5) * 5;
    const x = (i: number) => 65 + i * (270 / Math.max(1, visual.values.length - 1));
    const y = (v: number) => 190 - v / max * 150;
    return <svg className="sats-diagram" viewBox="0 0 400 250" role="img" aria-label={`${visual.unit} ${visual.type === 'bars' ? 'bar chart' : 'line graph'}. ${visual.labels.map((l, i) => `${l}: ${visual.values[i]}`).join('; ')}`}>
      <text x="200" y="22" textAnchor="middle">{visual.unit}</text>
      {Array.from({ length: 6 }, (_, i) => <g key={i}><line x1="45" x2="360" y1={190 - i * 30} y2={190 - i * 30} className="sats-grid-line" /><text x="36" y={196 - i * 30} textAnchor="end">{max * i / 5}</text></g>)}
      {visual.type === 'line' ? <polyline points={visual.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke="#68e4ef" strokeWidth="4" /> : null}
      {visual.values.map((v, i) => <g key={i}>{visual.type === 'bars' ? <rect x={x(i) - 20} y={y(v)} width="40" height={190 - y(v)} fill={i % 2 ? '#ffc94c' : '#68e4ef'} rx="5" /> : <circle cx={x(i)} cy={y(v)} r="6" fill="#ffc94c" />}<text x={x(i)} y="222" textAnchor="middle">{visual.labels[i]}</text></g>)}
    </svg>;
  }
  if (visual.type === 'grid') return <svg className="sats-diagram" viewBox="0 0 300 300" role="img" aria-label={`Coordinate grid. Marked points: ${visual.points.map(p => `(${p[0]}, ${p[1]})`).join(', ')}`}>
    {Array.from({ length: 11 }, (_, i) => <g key={i}><line x1={25 + i * 25} x2={25 + i * 25} y1="25" y2="275" className="sats-grid-line" /><line x1="25" x2="275" y1={25 + i * 25} y2={25 + i * 25} className="sats-grid-line" />{i !== 5 ? <><text x={25 + i * 25} y="169" textAnchor="middle">{i - 5}</text><text x="139" y={30 + i * 25} textAnchor="end">{5 - i}</text></> : null}</g>)}
    <path d="M25 150H275 M150 25V275" stroke="#e5f6ff" strokeWidth="2" /><text x="158" y="168">0</text><text x="283" y="145">x</text><text x="157" y="18">y</text>
    {visual.points.map(([x, y], i) => <circle key={i} cx={150 + x * 25} cy={150 - y * 25} r="7" fill="#ffc94c" stroke="#061b35" strokeWidth="2" />)}
  </svg>;
  if (visual.type === 'clock') return <svg className="sats-diagram" viewBox="0 0 260 260" role="img" aria-label={`Analogue clock. The short hand is between ${visual.hours} and ${visual.hours + 1}; the long hand points to ${visual.minutes / 5}.`}>
    <circle cx="130" cy="130" r="114" fill="#ecfaff" stroke="#ffc94c" strokeWidth="7" />
    {Array.from({ length: 12 }, (_, i) => { const a = (i + 1) * Math.PI / 6; return <text key={i} x={130 + Math.sin(a) * 90} y={137 - Math.cos(a) * 90} textAnchor="middle" fill="#082a45" style={{ fill: '#082a45', fontSize: 21 }}>{i + 1}</text>; })}
    <line x1="130" y1="130" x2={130 + Math.sin(visual.minutes * Math.PI / 30) * 77} y2={130 - Math.cos(visual.minutes * Math.PI / 30) * 77} stroke="#135782" strokeWidth="6" strokeLinecap="round" />
    <line x1="130" y1="130" x2={130 + Math.sin((visual.hours + visual.minutes / 60) * Math.PI / 6) * 52} y2={130 - Math.cos((visual.hours + visual.minutes / 60) * Math.PI / 6) * 52} stroke="#092b46" strokeWidth="9" strokeLinecap="round" /><circle cx="130" cy="130" r="8" fill="#092b46" />
  </svg>;
  if (visual.type === 'shape') return <svg className="sats-diagram" viewBox="0 0 400 260" role="img" aria-label={`${visual.shape} diagram. ${visual.labels.join(', ')}. Diagram not to scale.`}>
    <g fill="#58cee638" stroke="#68e4ef" strokeWidth="4">
      {visual.shape === 'rectangle' ? <rect x="70" y="55" width="240" height="135" rx="3" /> : null}
      {visual.shape === 'triangle' ? <><path d="M70 190L190 50L320 190Z" /><path d="M190 50V190" strokeDasharray="5 5" /><path d="M190 177H203V190" fill="none" /></> : null}
      {visual.shape === 'cuboid' ? <><path d="M80 85H260V205H80Z M80 85L140 40H320V160L260 205 M260 85L320 40 M140 40V160H320" /><path d="M80 205L140 160" strokeDasharray="6 5" /></> : null}
      {visual.shape === 'circle' ? <><circle cx="200" cy="125" r="82" /><path d="M200 125H282" /><circle cx="200" cy="125" r="4" fill="#ffc94c" /></> : null}
      {visual.shape === 'net' ? [[1,0],[0,1],[1,1],[2,1],[1,2],[1,3]].map(([x,y],i) => <rect key={i} x={115+x*43} y={35+y*43} width="43" height="43" />) : null}
    </g>
    {visual.labels.map((label, i) => <text key={i} x={i === 1 && label.length <= 14 ? 325 : 200} y={i === 0 ? 225 : i === 1 ? label.length > 14 ? 250 : 133 : 27} textAnchor="middle">{label}</text>)}
  </svg>;
  return null;
}
