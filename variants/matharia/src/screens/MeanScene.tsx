import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useState} from 'react';
import Character from '../../../../src/components/game-ui/OriginalHeroCharacter';
import {VisionSceneContext} from '../VisionScene';
import ArtworkFrame from '../ArtworkFrame';
import ArtworkPlane from '../ArtworkPlane';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';
import preparation from '../../reference/statistics-assets.json';
type Mode='mean'|'median'|'mode'|'missing';
interface Props {mode:Mode;title:string;instruction:string;phase:'idle'|'spinning'|'answering'|'resolved';readings:(number|string)[];active:number[];choices:number[];selected:number|null;feedback:{type:'success'|'error';message:string}|null;score:number;round:number;total:number;lifeActive:boolean;paused:boolean;shake:boolean;jackpot:boolean;glitch:boolean;intro:React.ReactNode;onScan:()=>void;onAnswer:(answer:number)=>void;}
const engine=preparation.assets.find(a=>a.name==='props/mean_engine_v4')!.dimensions;
// Current means are whole numbers, halves or fifths; discard only binary noise near a tenth.
const displayNumber=(value:number)=>{const tenth=Math.round(value*10)/10;return String(Math.abs(value-tenth)<1e-10?tenth:value)};
export default function MeanScene(p:Props){
 const scene=useContext(VisionSceneContext),mode=p.mode==='missing'?'Repair':p.mode,scanDisabled=!p.lifeActive||p.paused||p.phase==='spinning'||p.phase==='resolved'||!p.active.length;
 useSceneContact(p.round,roundFeedback(p.feedback)?.type==='success','metal',80,p.paused||scene.paused);
 const [hidden,setHidden]=useState(()=>document.hidden);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 const scanReady=p.phase==='idle'&&!scanDisabled&&!scene.paused&&!hidden;
 const step=p.phase==='idle'?'Press Scan to reveal the readings.':p.phase==='spinning'?'Scanning… Wait for the readings.':p.instruction;
 usePresentationHint(p.instruction);
 return <section className="mean-scene" data-mean-game data-mean-round={p.round} data-mean-mode={p.mode} data-mean-phase={p.phase} data-mean-score={p.score} data-mean-active-count={p.active.length} data-mean-paused={p.paused||scene.paused} data-mean-feedback={roundFeedback(p.feedback)?.type??'none'} data-mean-long-question={p.title.length>62||Boolean(roundFeedback(p.feedback)&&roundFeedback(p.feedback).message.length>78)}>
  {p.intro}
  <div className="mean-layout">
  <section className="mean-question" data-game-question="true" aria-label="Question"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span className="mean-question-main">{p.title}</span><div className="mean-question-detail"><span aria-live="polite">{step}</span><span className="mean-copy-reserve" aria-hidden="true">{p.instruction}</span></div></section>
  <div className="mean-playfield">
  <div className="mean-scholar" aria-hidden="true"><Character identity={scene.heroIdentity??'barratt'} artPose="guide" decorative/></div>
  <ArtworkPlane className="mean-engine-region" aspect={engine[0]/engine[1]} align="end"><div className="mean-engine-assembly" data-shake={p.shake} data-repaired={p.jackpot} data-fault={p.glitch}>
   <img className="mean-engine-housing" src={asset('props','mean_engine_v4')} alt="" draggable={false}/>
   <strong className="mean-mode-plate">{mode}</strong>
   <div className="mean-reading-bank" role="group" aria-label="Power cell readings">{Array.from({length:6},(_,index)=>{const active=p.active.includes(index),value=active?p.readings[index]:'';return <div key={index} className="mean-live-reel" data-mean-reel={index} data-reel-active={active} data-reel-value={String(value)} data-scanning={p.phase==='spinning'&&active} aria-label={active?`Reading ${index+1}: ${value}`:`Inactive reading ${index+1}`}><span key={String(value)}>{value}</span></div>})}</div>
   <button className="mean-scan" data-button-skin="none" data-ready={scanReady} data-scanning={p.phase==='spinning'} type="button" aria-label="Scan the power cells" aria-busy={p.phase==='spinning'} disabled={scanDisabled} onClick={p.onScan}><span>Scan</span></button>
  </div></ArtworkPlane>
  </div>
  <div className="mean-answer-region" data-feedback={Boolean(roundFeedback(p.feedback))}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><strong className="mean-answer-caption">{roundFeedback(p.feedback)?roundFeedback(p.feedback).type==='success'?'Correct':'Try again':p.mode==='missing'?'Pick the number':`Pick the ${p.mode}`}</strong><div className="mean-answers" role="group" aria-label="Choose your answer" aria-hidden={Boolean(roundFeedback(p.feedback))}>{p.choices.map(value=><button key={`${p.round}:${value}`} data-button-skin="none" data-mean-answer={value} type="button" aria-pressed={p.selected===value} disabled={p.phase!=='answering'||!p.lifeActive||p.paused} onClick={()=>p.onAnswer(value)}><ArtworkFrame name="buttons/amber_answer_v4" corner={.12} fit="height"/><span>{displayNumber(value)}</span></button>)}</div>{roundFeedback(p.feedback)&&<div className="mean-feedback" role="status" aria-live="polite"><strong>Your answer: {p.selected===null?'':displayNumber(p.selected)}</strong><p>{roundFeedback(p.feedback).message}</p></div>}</div>
  </div>
 </section>;
}
