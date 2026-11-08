import React,{useLayoutEffect,useRef,useState} from 'react';
import {asset} from '../../../variants/matharia/src/assets';
import ArtworkFrame from '../../../variants/matharia/src/ArtworkFrame';
import ScalableQuestionPanel from '../../../variants/matharia/src/ScalableQuestionPanel';
import OriginalHeroCharacter from '../../components/game-ui/OriginalHeroCharacter';
import type {ShatteredQuestion,ShatteredResponse} from '../../systems/content/shatteredWhole/questions';
import {FAMILY_NAMES,LEVEL_NAMES,shatteredReading} from '../../systems/content/shatteredWhole/questions';
import type {ShatteredState} from '../../systems/content/shatteredWhole/state';
import ShatteredDiagram from './Diagrams';
import Heart from './Heart';
import AnswerEntry from './AnswerEntry';
import '../../../variants/matharia/src/screens/shattered-whole.css';
interface Props {question:ShatteredQuestion;state:ShatteredState;response:ShatteredResponse;change:(r:ShatteredResponse)=>void;submit:()=>void;retry:()=>void;paused:boolean;avatarId:string;reducedMovement:boolean;reducedEffects:boolean;entry:boolean;setEntry:(open:boolean)=>void;seed:number;}
export default function ShatteredWholeScene(p:Props){
 const {question:q,state:s}=p,root=useRef<HTMLElement>(null),[size,setSize]=useState({width:844,height:390});
 useLayoutEffect(()=>{const node=root.current;if(!node)return;const fit=()=>{const r=node.getBoundingClientRect();setSize({width:r.width,height:r.height})};fit();const observer=new ResizeObserver(fit);observer.observe(node);return()=>observer.disconnect()},[]);
 const scale=Math.max(size.width/1672,size.height/941),left=(size.width-1672*scale)/2,pedestalX=Math.min(size.width-70,left+1375*scale),pedestalTop=460*scale;
 const disabled=p.paused||s.phase!=='playing'||Boolean(s.feedback),independent=q.interaction==='fraction'||q.interaction==='number';
 const responseLabel=q.interaction==='fraction'?'Enter fraction':q.values.unit==='%'?'Enter percentage':q.values.decimal?'Enter decimal':'Enter value';
 return <section ref={root} className="shattered-scene" data-shattered-whole data-question-reading={shatteredReading(q)} data-sw-family={q.family} data-sw-interaction={q.interaction} data-sw-question={q.id} data-sw-seed={p.seed} data-sw-tier={q.tier} data-sw-phase={s.phase} data-sw-score={s.score} data-sw-mistakes={s.mistakes} data-sw-restored={s.restored} data-sw-paused={p.paused} data-sw-motion={!p.reducedMovement} data-sw-effects={!p.reducedEffects}>
  <img className="sw-environment" src={asset('backgrounds','bg_shattered_sanctuary_v1')} alt="" draggable={false} style={{filter:`brightness(${p.reducedEffects?1:.9+s.restored*.01})`}}/>
  <ScalableQuestionPanel><div className="sw-question-content"><strong>{q.prompt}</strong><span className="sw-family-name">{FAMILY_NAMES[q.family]} · {Math.min(s.index+1,10)}/10</span></div></ScalableQuestionPanel>
  <div className="sw-hero" aria-hidden="true"><OriginalHeroCharacter identity={p.avatarId} artPose="guide" decorative/></div>
  <div className="sw-puzzle" data-sw-puzzle aria-label={FAMILY_NAMES[q.family]}><ShatteredDiagram question={q} response={p.response} change={p.change} disabled={disabled}/></div>
  <div className="sw-heart" style={{left:pedestalX,top:pedestalTop}}><Heart restored={s.restored}/></div>
  <div className="sw-restoration"><strong>{s.phase==='complete'?'The Heart is whole!':`${s.restored}/10 fragments restored`}</strong><span>{LEVEL_NAMES[q.tier-1]} · {s.score} points</span></div>
  <section className="sw-response" aria-label="Restore a fragment">
   {s.feedback||s.notice?<div className="sw-feedback" data-sw-feedback={s.feedback?.correct?'correct':s.feedback?'incorrect':'notice'} role="status" aria-live="polite"><p>{s.notice||s.feedback?.text}</p>{!s.feedback?.correct&&s.phase!=='failed'&&<button type="button" disabled={p.paused} onClick={p.retry}>{s.notice?'Continue puzzle':'Try again'}</button>}</div>:<>
   {q.family==='equivalent'?<div className="sw-value-controls"><button type="button" data-button-skin="none" aria-label="Decrease missing value" disabled={disabled||Number(p.response.text??0)<=0} onClick={()=>p.change({text:String(Math.max(0,Math.floor(Number(p.response.text??0))-1))})}><ArtworkFrame name="buttons/scale_key_v4" corner={.13}/>−</button><button type="button" className="sw-answer" data-button-skin="none" aria-label="Enter missing value" disabled={disabled} onClick={()=>p.setEntry(true)}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/>{p.response.text||'?'}</button><button type="button" data-button-skin="none" aria-label="Increase missing value" disabled={disabled||Number(p.response.text??0)>=9999} onClick={()=>p.change({text:String(Math.min(9999,Math.floor(Number(p.response.text??0))+1))})}><ArtworkFrame name="buttons/scale_key_v4" corner={.13}/>+</button></div>:independent&&<button type="button" className="sw-answer" data-button-skin="none" disabled={disabled} onClick={()=>p.setEntry(true)}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/><span>{p.response.text||responseLabel}{p.response.text&&q.values.unit==='%'?'%':''}</span></button>}
   {!independent&&<div className="sw-response-summary">{q.interaction==='shade'?`${p.response.cells?.length??0} extra cells lit`:q.interaction==='order'?(p.response.order??[]).map(i=>String.fromCharCode(65+i)).join(' → ')||'Tap shields in order':q.interaction==='compare'?p.response.order?.length?'Shield selected':'Tap a shield':'Move the crystal marker'}</div>}
   <button type="button" className="sw-submit" data-button-skin="none" disabled={disabled||independent&&!p.response.text} onClick={p.submit}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.13}/><span>Restore fragment</span></button></>}
  </section>
  <AnswerEntry questionId={q.id} open={p.entry} fraction={q.interaction==='fraction'} wholeNumber={q.family==='equivalent'} value={p.response.text??''} unit={String(q.values.unit??(q.values.decimal?'decimal':''))} onKeep={text=>{p.change({text});p.setEntry(false)}} onClose={()=>p.setEntry(false)}/>
 </section>;
}
