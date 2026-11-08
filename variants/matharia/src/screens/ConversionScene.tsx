import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {useReducedMotion} from 'motion/react';
import ConversionWeight from './ConversionWeight';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import ArtworkPlane from '../ArtworkPlane';
import RasterMechanicalScale from './RasterMechanicalScale';
import {usePresentationHint} from '../PresentationHint';
import {useDismissiblePanel} from '../useDismissiblePanel';
import {asset} from '../assets';
type Token={id:string;grams:number;gem:string};
interface Props {rootRef:React.RefObject<HTMLDivElement|null>;dropRef:React.RefObject<HTMLDivElement|null>;tier:number;round:number;total:number;target:number;targetLabel:string;startingGrams:number;grams:number;tokens:Token[];placed:string[];groups:{token:Token;count:number}[];score:number;success:boolean;broken:boolean;feedback:{tone:'success'|'error';text:string}|null;paused:boolean;label:(n:number)=>string;inside:(x:number,y:number)=>boolean;onPlace:(id:string)=>void;onRemove:(id:string)=>void;onReset:()=>void;onSubmit:()=>void;}
export default function ConversionScene(p:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion(),disabled=p.success||p.paused,[loadsOpen,setLoadsOpen]=useState(false),summary=useRef<HTMLButtonElement>(null),loads=useRef<HTMLDivElement>(null);
 useEffect(()=>{setLoadsOpen(false)},[p.round,p.success]);useEffect(()=>{if(!p.placed.length)setLoadsOpen(false)},[p.placed.length]);useDismissiblePanel(loadsOpen,setLoadsOpen,summary,loads);
 const closeLoads=()=>{setLoadsOpen(false);summary.current?.focus()};
 const hasCargo=p.startingGrams>0,startsOverweight=p.startingGrams>p.target;
 const cargo=hasCargo&&<span className="conversion-cargo" data-conversion-cargo={p.startingGrams}><img src={asset('props','remainder_crate_v3')} alt="" draggable={false}/>Cargo: {p.label(p.startingGrams)}</span>;
 const feedback=roundFeedback(p.feedback);
 usePresentationHint(hasCargo
  ? 'The cargo stays on the tray. A positive weight adds to the total and a negative weight subtracts from it. Tap a selected weight again to remove it. Reset weights restores the starting load.'
  : 'Choose weights with the stated total mass. 1 kilogram is 1,000 grams. Tap a weight to add it; tap it again or tap its group on the tray to remove one. Reset weights clears the tray. Submit Shipment checks your total.');
 return <section ref={p.rootRef} className="conversion-scene" data-conversion-game data-conversion-tier={p.tier} data-conversion-round={p.round} data-conversion-score={p.score} data-conversion-success={p.success} data-conversion-paused={p.paused}>
  <ScalableQuestionPanel>
   <span className="conversion-question-main">{hasCargo?'Bring the load to ':'Choose weights with a total mass of '}<strong>{p.targetLabel}</strong>.</span>
   <span className="conversion-question-detail" role={feedback?'status':undefined} aria-live={feedback?'polite':undefined} data-tone={feedback?.tone}>
    {feedback?.text??(adventureTask('conversion_canyon',p.round-1)+(startsOverweight?' Use negative weights.':' Tap weights onto the tray.'))}
   </span>
  </ScalableQuestionPanel>
  <ArtworkPlane className="conversion-scale-region" aspect={.9} align="end"><RasterMechanicalScale grams={p.grams} target={p.target} paused={p.paused} broken={p.broken} dropRef={p.dropRef}>
   {p.placed.length>0
    ? <button ref={summary} type="button" className="conversion-loaded-summary" data-button-skin="none" disabled={disabled} aria-expanded={loadsOpen} aria-controls="conversion-loads" onClick={()=>setLoadsOpen(v=>!v)}>
       <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
       {cargo||<span aria-hidden="true">{p.groups.slice(0,3).map(g=><img key={g.token.grams} src={g.token.gem} alt="" draggable={false}/>)}</span>}
       {p.placed.length} {p.placed.length===1?'weight':'weights'} on tray
      </button>
    : hasCargo
      ? <div className="conversion-loaded-summary"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{cargo}</div>
      : <span className="conversion-empty-hint"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Tap or drop weights here</span>}
  </RasterMechanicalScale></ArtworkPlane>
  <div className="conversion-carrier" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="carry" decorative/></div>
  {loadsOpen&&<div ref={loads} id="conversion-loads" className="conversion-loads-popup" role="group" aria-label="Loaded weights" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closeLoads()}}}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><strong>Tap a group to remove one weight</strong><button type="button" data-button-skin="none" className="conversion-loads-close" aria-label="Close loaded weights" onClick={closeLoads}><X aria-hidden="true"/></button><div>{p.groups.map(({token,count})=><button key={token.grams} type="button" className="conversion-loaded-group" disabled={disabled} aria-label={`Remove ${p.label(token.grams)} weight`} onClick={()=>p.onRemove(token.id)}><img src={token.gem} alt="" draggable={false}/><span>{p.label(token.grams)}{count>1?` ×${count}`:''}</span></button>)}</div></div>}
  <div className="conversion-token-bank" role="group" aria-label="Available shipment weights">{p.tokens.map(token=><ConversionWeight key={token.id} id={token.id} grams={token.grams} gem={token.gem} label={p.label(token.grams)} placed={p.placed.includes(token.id)} disabled={disabled} reduced={Boolean(reduced)} rootRef={p.rootRef} inside={p.inside} onPlace={p.onPlace} onRemove={p.onRemove}/>)}</div>
  <div className="conversion-actions"><button type="button" data-button-skin="none" disabled={disabled} onClick={p.onReset}><ArtworkFrame name="buttons/angle_answer_v4" corner={.16}/>{p.broken?'Repair & reset':'Reset weights'}</button><button type="button" data-button-skin="none" disabled={disabled} onClick={p.onSubmit}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/><span className="conversion-submit-label">Submit Shipment</span></button></div>
 </section>;
}
