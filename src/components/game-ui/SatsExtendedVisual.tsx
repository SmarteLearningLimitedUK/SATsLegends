import type { MissionVisual } from '../../systems/content/satsAdventure';
export default function SatsExtendedVisual({visual}:{visual:MissionVisual}){
 if(visual.type==='polygon'){
  const points=Array.from({length:visual.sides},(_,i)=>{const angle=(i/visual.sides*2-.5)*Math.PI;return `${200+95*Math.cos(angle)},${125+95*Math.sin(angle)}`;}).join(' ');
  return <svg className="sats-diagram" viewBox="0 0 400 250" role="img" aria-label={`Regular polygon with ${visual.sides} equal sides and equal angles`}><polygon points={points} fill="#6cdddf33" stroke="#a1e8f4" strokeWidth="4"/><text x="200" y="245" textAnchor="middle">{visual.sides} equal sides</text></svg>;
 }
 if(visual.type==='scale')return <svg className="sats-diagram" viewBox="0 0 400 210" role="img" aria-label={`Scale from zero to ${visual.max} ${visual.unit}, ${visual.intervals} equal intervals. Pointer at division ${visual.position}.`}>
  <path d="M40 120H360" stroke="#e6f9ff" strokeWidth="4"/>{Array.from({length:visual.intervals+1},(_,i)=><g key={i}><path d={`M${40+i*320/visual.intervals} 105V135`} stroke="#e6f9ff" strokeWidth="3"/>{i%2===0?<text x={40+i*320/visual.intervals} y="165" textAnchor="middle">{visual.max*i/visual.intervals}</text>:null}</g>)}
  <path d={`M${40+visual.position*320/visual.intervals} 100l-12 -22h24Z`} fill="#ffda79"/><text x="200" y="32" textAnchor="middle">Mass ({visual.unit})</text>
 </svg>;
 if(visual.type==='cutout')return <svg className="sats-diagram" viewBox="0 0 400 250" role="img" aria-label={`Rectangle ${visual.width} cm by ${visual.height} cm, triangular cutout base ${visual.cutBase} cm and height ${visual.cutHeight} cm. Not to scale.`}>
  <rect x="60" y="50" width="280" height="140" fill="#6cdddf66" stroke="#a5f1f5" strokeWidth="3"/><path d="M60 190L230 190L145 50Z" fill="#0c263b" stroke="#ffe091" strokeWidth="3"/><path d="M145 50V190" stroke="#ffe091" strokeWidth="2" strokeDasharray="4 4"/>
  <text x="200" y="30" textAnchor="middle">{visual.width} cm</text><text x="365" y="130" textAnchor="middle">{visual.height} cm</text><text x="145" y="220" textAnchor="middle">Base {visual.cutBase} cm</text><text x="200" y="247" textAnchor="middle">Triangle height {visual.cutHeight} cm</text>
 </svg>;
 if(visual.type==='angles')return <svg className="sats-diagram" viewBox="0 0 400 240" role="img" aria-label={`${visual.kind==='cross'?'Crossing straight lines':'Isosceles triangle with equal sloping sides'}, marked angle ${visual.angle} degrees. Diagram not to scale.`}>
  {visual.kind==='cross'?<><path d="M70 175L330 45M70 45L330 175" stroke="#a1e8f4" strokeWidth="4"/><text x="200" y="70" textAnchor="middle">{visual.angle}°</text><text x="200" y="175" textAnchor="middle">?</text></>:<><path d="M70 185L200 40L330 185Z" fill="#6cdddf33" stroke="#a1e8f4" strokeWidth="4"/><path d="M126 109l16 12M258 121l16 -12" stroke="#ffdc82" strokeWidth="4"/><text x="200" y="100" textAnchor="middle">{visual.angle}°</text><text x="105" y="175">?</text></>}
  <text x="200" y="225" textAnchor="middle">Not to scale</text>
 </svg>;
 if(visual.type==='symmetry')return <svg className="sats-diagram" viewBox="0 0 300 180" role="img" aria-label="Three-row pattern. Complete the reflection across the vertical dashed line.">{Array.from({length:18},(_,i)=>{const x=i%6,y=Math.floor(i/6);return <rect key={i} x={30+x*40} y={25+y*40} width="40" height="40" fill={visual.cells.some(([a,b])=>a===x&&b===y)?'#7de2e9':'#0c263b'} stroke="#a1e8f4"/>;})}<path d="M150 18V152" stroke="#ffda79" strokeWidth="4" strokeDasharray="7 5"/></svg>;
 return null;
}
