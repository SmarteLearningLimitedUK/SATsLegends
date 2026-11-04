import type {DepthModel} from '../../systems/content/satsDepthModels';
import SatsRevisionGapVisual from './SatsRevisionGapVisual';
const colours=['#68e4ef','#ffc94c','#ed9290'];
export function Protractor({angle,reversed=false}:{angle:number;reversed?:boolean}){
 const point=(a:number,r:number)=>[200+(reversed?-1:1)*Math.cos(a*Math.PI/180)*r,205-Math.sin(a*Math.PI/180)*r];
 const [x,y]=point(angle,155);
 return <svg className="sats-diagram" viewBox="0 0 400 250" role="img" aria-label={`Protractor. Baseline points ${reversed?'left':'right'}. Read where the second ray crosses the degree scale.`}>
  <path d="M30 205A170 170 0 0 1 370 205Z" fill="#90dfe31a" stroke="#b4e9ef" strokeWidth="2"/>
  {Array.from({length:37},(_,i)=>{const a=i*5,[x1,y1]=point(a,170),[x2,y2]=point(a,i%2?163:156),[tx,ty]=point(a,138),[ux,uy]=point(a,112);return <g key={a}><path d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#b4e9ef"/>{i%6===0?<><text x={tx} y={ty} textAnchor="middle">{a}</text><text x={ux} y={uy} textAnchor="middle" className="sats-depth-secondary">{180-a}</text></>:null}</g>;})}
  <path d={`M${reversed?30:370} 205H200L${x} ${y}`} fill="none" stroke="#ffdc80" strokeWidth="4"/><circle cx="200" cy="205" r="5" fill="#ffdc80"/>
  <text x="200" y="242" textAnchor="middle">Start at zero on the baseline</text>
 </svg>;
}
export default function SatsDepthVisual({model:m}:{model:DepthModel}){
 if(m.kind==='fraction-grid'||m.kind==='similar-rectangles'||m.kind==='pictogram-build'||m.kind==='choice-pairs')return <SatsRevisionGapVisual model={m}/>;
 if(m.kind==='angle-picture'){
  const a=m.angle*Math.PI/180,x=175+120*Math.cos(a),y=125-120*Math.sin(a),ax=175+60*Math.cos(a),ay=125-60*Math.sin(a);
  return <svg className="sats-diagram" viewBox="0 0 350 260" role="img" aria-label="Two rays with a marked arc. Estimate the angle traced by the arc."><path d={`M305 125H175L${x} ${y}`} stroke="#a6edf1" strokeWidth="4" fill="none"/><path d={`M235 125A60 60 0 ${m.angle>180?1:0} 0 ${ax} ${ay}`} stroke="#ffda79" strokeWidth="4" fill="none"/><circle cx="175" cy="125" r="5" fill="#ffda79"/></svg>;
 }
 if(m.kind==='protractor')return <Protractor angle={m.angle} reversed={m.reversed}/>;
 if(m.kind==='angle-draw')return <Protractor angle={0}/>;
 if(m.kind==='ruler')return <svg className="sats-diagram" viewBox="0 0 400 200" role="img" aria-label={`Ruler in centimetres with millimetre divisions. Object starts at ${m.start/10} cm and ends at ${m.end/10} cm.`}>
  <rect x="25" y="85" width="350" height="75" fill="#dec98a"/>
  {Array.from({length:51},(_,i)=><g key={i}><path d={`M${25+i*7} 85v${i%10===0?28:i%5===0?21:12}`} stroke="#243849"/>{i%10===0?<text x={25+i*7} y="145" textAnchor="middle" style={{fill:'#102733'}}>{i/10}</text>:null}</g>)}
  <rect x={25+m.start*7} y="53" width={(m.end-m.start)*7} height="20" fill="#79dae6" stroke="#d2f8ff"/><text x="200" y="188" textAnchor="middle">centimetres</text>
 </svg>;
 if(m.kind==='capacity')return <svg className="sats-diagram" viewBox="0 0 350 260" role="img" aria-label="Measuring cylinder with ten equal intervals. Read the liquid surface against the scale.">
  <path d="M125 25V225H225V25" fill="#a6e6f21a" stroke="#afe5f0" strokeWidth="3"/><rect x="127" y={225-m.position*19} width="96" height={m.position*19} fill="#65d6e688"/>
  {Array.from({length:m.intervals+1},(_,i)=><g key={i}><path d={`M210 ${225-i*19}h18`} stroke="#ffdb87" strokeWidth="2"/>{i%5===0?<text x="240" y={231-i*19}>{m.max*i/m.intervals}</text>:null}</g>)}<text x="175" y="253" textAnchor="middle">millilitres (ml)</text>
 </svg>;
 if(m.kind==='estimate-line')return <svg className="sats-diagram" viewBox="0 0 400 150" role="img" aria-label={`Number line from ${m.min} to ${m.max} with halfway label and a pointer.`}>
  <path d="M30 75H370M30 65V85M200 65V85M370 65V85" stroke="#a9edf3" strokeWidth="3"/>{[m.min,(m.min+m.max)/2,m.max].map((n,i)=><text key={i} x={30+i*170} y="115" textAnchor="middle">{n}</text>)}<path d={`M${30+(m.marker-m.min)/(m.max-m.min)*340} 68l-10 -22h20Z`} fill="#ffda79"/>
 </svg>;
 if(m.kind==='pictogram')return <div className="sats-depth-pictogram"><p>Key: ● = {m.key} items</p>{m.labels.map((label,i)=><div key={label}><strong>{label}</strong><span aria-label={`${m.icons[i]} symbols`}>{Array.from({length:Math.ceil(m.icons[i])},(_,n)=><i key={n} style={{clipPath:n+1>m.icons[i]?'inset(0 50% 0 0)':undefined}}/>)}</span></div>)}</div>;
 if(m.kind==='irregular-area')return <svg className="sats-diagram" viewBox="0 0 340 220" role="img" aria-label="Grid with coloured whole and half squares. Every square has area one square centimetre.">
  {Array.from({length:24},(_,i)=>{const x=30+(i%6)*45,y=20+Math.floor(i/6)*45;return <g key={i}><rect x={x} y={y} width="45" height="45" fill={i<m.full?'#68dce1':'#0b2d40'} stroke="#b2e5ed"/>{i>=m.full&&i<m.full+m.halves?<path d={`M${x} ${y}h45l-45 45Z`} fill="#68dce1"/>:null}</g>;})}<text x="170" y="216" textAnchor="middle">Each square = 1 cm²</text>
 </svg>;
 if(m.kind==='line-types')return <svg className="sats-diagram" viewBox="0 -25 360 300" role="img" aria-label="Four labelled lines. Identify the one meeting A at a right angle."><g transform={`rotate(${m.turn} 180 120)`}><path d="M55 120H305M180 35V205M75 70L290 175M70 75H300" stroke="#9ce8f1" strokeWidth="3"/>{[['A',310,120],['B',180,25],['C',290,185],['D',305,75]].map(([label,x,y])=><text key={label} x={x} y={y}>{label}</text>)}</g></svg>;
 if(m.kind==='circle-name')return <svg className="sats-diagram" viewBox="0 0 350 250" role="img" aria-label={`Circle with highlighted ${m.part==='circumference'?'boundary':m.part==='radius'?'centre-to-edge line':'edge-to-edge line through the centre'}.`}><circle cx="175" cy="120" r="90" fill="#69dce21a" stroke={m.part==='circumference'?'#ffda79':'#9ce8f1'} strokeWidth={m.part==='circumference'?6:2}/><circle cx="175" cy="120" r="4" fill="#9ce8f1"/>{m.part!=='circumference'?<path d={`M${m.part==='radius'?175:85} 120H265`} stroke="#ffda79" strokeWidth="5"/>:null}</svg>;
 if(m.kind==='nets')return <div className="sats-depth-nets">{m.candidates.map((cells,i)=>{const maxX=Math.max(...cells.map(([x])=>x)),maxY=Math.max(...cells.map(([,y])=>y));return <figure key={i}><svg viewBox={`-1 -1 ${maxX+2} ${maxY+2}`} role="img" aria-label={`Net ${'ABC'[i]}`}>{cells.map(([x,y],n)=><rect key={n} x={x} y={y} width="1" height="1" fill="#6edce4" stroke="#082c43" strokeWidth=".06"/>)}</svg><figcaption>{'ABC'[i]}</figcaption></figure>;})}</div>;
 return null;
}
export {colours};
