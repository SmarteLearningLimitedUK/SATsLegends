import type {NetCell} from '../../systems/content/cubeNets';
/** Mathematical diagram only; labels and equal square faces are generated from the net. */
export default function CubeNetDiagram({cells,labels,marked}:{cells:NetCell[];labels:number[];marked?:number}) {
 const w=Math.max(...cells.map(c=>c[0]))+1,h=Math.max(...cells.map(c=>c[1]))+1;
 return <svg className="sats-diagram h-full w-full min-h-0" viewBox={`-.35 -.35 ${w+.7} ${h+.7}`} role="img" aria-label={`Cube net with numbered faces. ${marked===undefined?'':`Find the face opposite ${marked} after folding.`}`}>
  {cells.map(([x,y],i)=><g key={i}><rect x={x} y={y} width="1" height="1" fill={labels[i]===marked?'#ffda79':'#6edce4'} stroke="#082c43" strokeWidth=".04"/><text x={x+.5} y={y+.52} textAnchor="middle" dominantBaseline="middle" fill="#082c43" style={{fontSize:'.38px',fontWeight:700}}>{labels[i]}</text></g>)}
 </svg>;
}
