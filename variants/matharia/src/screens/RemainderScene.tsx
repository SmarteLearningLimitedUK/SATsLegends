import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {useSceneContact} from '../useSceneContact';
import {usePresentationHint} from '../PresentationHint';
interface Problem{id:string;dividend:number;displayDividend:string;divisor:number;quotient:number;remainder:number;answerMode:'remainder'|'decimal'|'group_board';answerLabel:string;options:string[];stage:number;}
interface Working{remaining:number;quotient:number;steps:{groups:number;amount:number}[];}
interface Props{problem:Problem;working:Working;groups:readonly number[];feedback:{tone:string;title:string;subtitle:string}|null;selected:string|null;time:number;score:number;correct:number;solved:number;tier:number;locked:boolean;finished:boolean;present:boolean;paused:boolean;practice:boolean;intro:React.ReactNode;onBatch:(groups:number)=>void;onReset:()=>void;onAnswer:(answer:string)=>void;}
/** Original problems, working and grading enter this scene without substitution. */
export default function RemainderScene(p:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion(),guided=p.problem.answerMode==='group_board',decimal=p.problem.answerMode==='decimal',disabled=p.locked||p.finished||!p.present||p.paused,departing=Boolean(roundFeedback(p.feedback)&&roundFeedback(p.feedback).tone!=='error'),pallet=useRef<HTMLDivElement>(null),animations=useRef<Animation[]>([]),batchLock=useRef(false),[questionNode,setQuestionNode]=useState<HTMLDivElement|null>(null);
 const question=decimal?`Share ${p.problem.displayDividend} metres of rope equally between ${p.problem.divisor} boats. How many metres does each boat get?`:`There are ${p.problem.displayDividend} crates. Each box holds ${p.problem.divisor} crates. How many full boxes can be filled, and how many crates are left over?`,helper=decimal?'Give your answer as a decimal.':guided?'Load full boxes, then send your shipment.':'Choose the shipment with the right boxes and leftovers.';
 usePresentationHint(`${helper}\n${guided?'Choose batches of full boxes. Unload resets the current working; Ship it is ready when fewer than one boxful remains.':''}`);
 useLayoutEffect(()=>{if(!questionNode)return;const screen=questionNode.closest<HTMLElement>('.screen-gameplay'),copy=questionNode.closest<HTMLElement>('[data-question-copy]');if(!screen||!copy)return;const previous=screen.style.getPropertyValue('--remainder-question-height');const fit=()=>{const style=getComputedStyle(copy);screen.style.setProperty('--remainder-question-height',`${Math.max(68,Math.ceil(questionNode.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)))}px`)};fit();const observer=new ResizeObserver(fit);observer.observe(questionNode);return()=>{observer.disconnect();if(previous)screen.style.setProperty('--remainder-question-height',previous);else screen.style.removeProperty('--remainder-question-height')};},[questionNode,p.problem.id,roundFeedback(p.feedback),p.working]);
 useLayoutEffect(()=>{batchLock.current=false},[p.working]);
 useEffect(()=>{for(const a of animations.current)a.cancel();animations.current=[];const e=pallet.current;if(!e||reduced)return;
  if(departing)animations.current.push(e.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(100px)',opacity:0}],{duration:650,easing:'ease-in',fill:'forwards'}));
  else if(p.working.steps.length){const box=e.querySelector('.remainder-loading-crate');if(box)animations.current.push(box.animate([{transform:'translate(-65px,-55px) rotate(-5deg)',opacity:0,offset:0},{transform:'translate(-30px,-25px)',opacity:1,offset:.2},{transform:'translate(0,5px)',opacity:1,offset:.8},{transform:'translate(0,5px)',opacity:0,offset:1}],{duration:650,easing:'cubic-bezier(.2,.8,.3,1)',fill:'both'}));}
  return()=>{for(const a of animations.current)a.cancel()};
 },[p.problem.id,p.working.steps.length,departing,reduced]);
 useEffect(()=>{const update=()=>{for(const a of animations.current)if(a.playState!=='finished'){if(p.paused||document.hidden)a.pause();else a.play()}};update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[p.paused,p.problem.id,p.working.steps.length,departing,reduced]);
 useSceneContact(`${p.problem.id}:${p.working.steps.length}`,p.working.steps.length>0,'wood',500,p.paused);
 const cargo=guided?p.working.remaining:p.problem.dividend;
 const instruction=roundFeedback(p.feedback)?`${roundFeedback(p.feedback).title}. ${roundFeedback(p.feedback).subtitle}`:guided?(p.working.remaining<p.problem.divisor?`${p.working.quotient} full boxes · ${p.working.remaining} crates left over`:`Fill boxes of ${p.problem.divisor}. Leave fewer than ${p.problem.divisor} crates.`):decimal?'Choose the decimal answer':'Choose full boxes and leftovers';
 return <section className="remainder-scene" data-remainder-game data-remainder-id={p.problem.id} data-remainder-tier={p.tier} data-remainder-stage={p.problem.stage} data-remainder-mode={p.problem.answerMode} data-remainder-dividend={p.problem.dividend} data-remainder-divisor={p.problem.divisor} data-remainder-remaining={p.working.remaining} data-remainder-loaded={p.working.quotient} data-remainder-correct={p.correct} data-remainder-solved={p.solved} data-remainder-score={p.score} data-remainder-seconds={p.time} data-remainder-state={roundFeedback(p.feedback)?.tone??'idle'} data-remainder-paused={p.paused}>
 {p.intro}<ScalableQuestionPanel frame="frames/glacier_panel_v3" corner={.13}>
  <div className="remainder-question-content" ref={setQuestionNode}>
   <span className="remainder-question-text">{question}</span>
   <small className="remainder-question-helper remainder-shipping-instruction" role={roundFeedback(p.feedback)?'status':undefined} aria-live="polite" data-tone={roundFeedback(p.feedback)?.tone}>{roundFeedback(p.feedback)||guided?instruction:helper}</small>
  </div>
 </ScalableQuestionPanel>
 <div className="remainder-workspace">
  <div className="remainder-foreman" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <div className="remainder-yard">
   <div className="remainder-cargo-counters" aria-live="polite">
    <div><ArtworkFrame name="buttons/remainder_batch_v3" corner={.15} surface="#043e4b"/><span>{decimal?'Rope length':'On the dock'}</span><strong>{guided?p.working.remaining:p.problem.displayDividend}{decimal?' m':''}</strong></div>
    <div><ArtworkFrame name="buttons/remainder_batch_v3" corner={.15} surface="#043e4b"/><span>{guided?'Boxes loaded':decimal?'Boats':'In each box'}</span><strong>{guided?p.working.quotient:p.problem.divisor}</strong></div>
   </div>
   <div className="remainder-cargo-platform" aria-hidden="true"><div className="remainder-cargo-art" ref={pallet}>
    <img className="remainder-conveyor" src={asset('props','remainder_conveyor_v3')} alt="" draggable={false}/>
    {decimal?<img className="remainder-rope" src={asset('props','remainder_rope_v3')} alt="" draggable={false}/>:<div className="remainder-stock-crates" style={{'--cargo-columns':Math.min(6,cargo>24?1:cargo)} as React.CSSProperties}>{Array.from({length:cargo>24?1:Math.max(0,Math.floor(cargo))},(_,i)=><img key={i} src={asset('props','remainder_crate_v3')} alt="" draggable={false}/>)}</div>}
    {!decimal&&cargo>24&&<span className="remainder-stock-quantity">×{cargo.toLocaleString()} crates</span>}
    {guided&&!reduced&&p.working.steps.length>0&&<div className="remainder-loading-crate"><img src={asset('props','remainder_crate_v3')} alt=""/></div>}
   </div></div>
   {guided&&<div className="remainder-load-state">
    <div className="remainder-load-caption">{p.working.steps.length?`${p.working.quotient} boxes loaded`:'Load your first batch'}</div>
    <div className="remainder-track" role="progressbar" aria-label="Amount divided" aria-valuemin={0} aria-valuemax={p.problem.dividend} aria-valuenow={p.problem.dividend-p.working.remaining}><span style={{width:`${100*(p.problem.dividend-p.working.remaining)/p.problem.dividend}%`}}/></div>
   </div>}
  </div>
   {guided&&<div className="remainder-manifest" data-empty={p.working.steps.length===0} aria-live="polite">{p.working.steps.length?p.working.steps.slice(-4).map((step,i)=><span key={`${i}:${step.groups}`}>{step.groups} boxes · {step.amount} crates</span>):<span>Choose a batch to load →</span>}</div>}
  <section className="remainder-console" aria-label={guided?'Load the shipment':'Choose the shipment answer'}>
   <ArtworkFrame name="frames/chart_wood_hollow_v4" corner={.15} surface="#39271e"/>
   {guided?<div className="remainder-batches" role="group" aria-label="Choose groups to subtract"><strong className="remainder-batch-heading">Load boxes</strong>
    {p.groups.map(groups=><button key={groups} type="button" data-button-skin="none" data-cargo-batch={groups} aria-label={`Load ${groups} boxes, ${groups*p.problem.divisor} crates`} disabled={disabled||groups*p.problem.divisor>p.working.remaining} onClick={()=>{if(batchLock.current)return;batchLock.current=true;p.onBatch(groups)}}><ArtworkFrame name="buttons/remainder_batch_v3" corner={.15} surface="#043e4b"/><span><strong>{groups}</strong></span><span><strong>{groups*p.problem.divisor}</strong> <small>crates</small></span></button>)}
    <button type="button" className="remainder-unload" data-button-skin="none" disabled={disabled} onClick={p.onReset}><ArtworkFrame name="buttons/remainder_unload_v3" corner={.13}/>Unload</button>
    <button type="button" data-button-skin="none" className="remainder-ship" data-cargo-send disabled={disabled||p.working.remaining>=p.problem.divisor} onClick={()=>p.onAnswer(`${p.working.quotient} r${p.working.remaining}`)}><ArtworkFrame name="buttons/remainder_ship_v3" corner={.13}/><strong>Ship it!</strong></button>
   </div>:<div className="remainder-answer-choices" role="group" aria-label="Choose your division answer">
    {p.problem.options.map(option=><button key={`${p.problem.id}:${option}`} type="button" data-button-skin="none" data-remainder-answer={option} data-selected={p.selected===option} disabled={disabled} onClick={()=>p.onAnswer(option)}><ArtworkFrame name="buttons/remainder_batch_v3" corner={.15} surface="#043e4b"/><span>{decimal?`${option} m each`: <><strong>{option.split(' r')[0]} {option.startsWith('1 r')?'box':'boxes'}</strong><small>{option.split(' r')[1]} left</small></>}</span></button>)}
   </div>}
  </section>
 </div>
 </section>;
}
