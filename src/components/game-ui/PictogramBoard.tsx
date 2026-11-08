import type {RevisionGapModel} from '../../systems/content/satsRevisionGapMissions';

/** Screen-sized mathematical rows avoid shrinking all labels with an SVG viewBox. */
export default function PictogramBoard({model,symbols,showTargets=false}:{model:Extract<RevisionGapModel,{kind:'pictogram-build'}>;symbols:(number|null)[];showTargets?:boolean}){
 return <div className="revision-pictogram" aria-label="Pictogram" data-shows-targets={showTargets||undefined}>
  <div className="revision-pictogram-key" data-pictogram-key>Key: ● = {model.hideKey?'?':model.key} {model.key===1&&!model.hideKey?'item':'items'}{!model.hideKey&&model.key>1?` · ½ = ${model.key/2}`:''}</div>
  <div className="revision-pictogram-rows" role="table" aria-label="Pictogram rows">
   {model.labels.map((label,i)=>{
    const halves=symbols[i]??0;
    return <div role="row" key={label} data-pictogram-row={label} className="revision-pictogram-row">
     <span role="rowheader">{label}</span>
     <span role="cell" className="revision-pictogram-symbols" aria-label={`${label}: ${symbols[i]===null?'no symbols placed':`${halves/2} symbols`}`}>
      {halves===0&&<span className="revision-pictogram-empty" aria-hidden="true">—</span>}
      {Array.from({length:Math.ceil(halves/2)},(_,j)=><span key={j} className="revision-pictogram-symbol" data-half={halves<(j+1)*2||undefined} aria-hidden="true"/>)}
     </span>
     {showTargets&&<span role="cell" className="revision-pictogram-target">{model.hiddenCountIndex===i?'?':model.counts[i]} items</span>}
    </div>;
   })}
  </div>
 </div>;
}
