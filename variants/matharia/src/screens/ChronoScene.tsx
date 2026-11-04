import {roundFeedback} from '../roundFeedback';
import React,{useState} from 'react';
import {Plus,Minus,RotateCcw} from 'lucide-react';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
interface Time{hours:number;minutes:number;}
interface Props{question:string;target:Time;current:Time;clock:React.ReactNode;face:string;format:string;step:number;tier:number;feedback:string|null;score:number;time:number;correct:number;disabled:boolean;paused:boolean;state:string;onAdjust:(type:'hours'|'minutes',amount:number)=>void;onRestore:()=>void;onReset:()=>void;}
const label=(t:Time)=>`${String(t.hours).padStart(2,'0')}:${String(t.minutes).padStart(2,'0')}`;
export default function ChronoScene(p:Props){
 const [hand,setHand]=useState<'hours'|'minutes'|null>(null);
 const prefix='Set the clock to ',instruction=p.format==='roman'?'The time is written in Roman numerals. Set both hands.':'Match both hands to restore time.';
 usePresentationHint('Short hand: hours. Long hand: minutes.\n'+instruction);
 return <section className="chrono-scene" data-chrono-game data-selected-hand={hand??undefined} data-chrono-tier={p.tier} data-chrono-time={p.time} data-chrono-score={p.score} data-chrono-correct={p.correct} data-chrono-feedback={roundFeedback(p.feedback)??'idle'} data-chrono-state={p.state} data-clock-target={label(p.target)} data-clock-question-format={p.format} data-chrono-paused={p.paused}>
  <section className="chrono-question" data-concept-panel data-concept-question="true" data-game-question="true" aria-label="Question">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <img className="question-jewel question-jewel--top" src={asset('frames','sapphire_crest_v3')} alt="" draggable={false}/>
   <div className="scalable-question-copy" data-question-copy><div className="chrono-question-content">
    <span className="chrono-live-question">{p.question.startsWith(prefix)?<>{prefix}<strong>{p.question.slice(prefix.length)}</strong></>:p.question}</span>
    <span className="chrono-feedback-slot" role="status" aria-live="polite" aria-atomic="true"><span aria-hidden={Boolean(roundFeedback(p.feedback))} className="chrono-instruction">{instruction}</span>{roundFeedback(p.feedback)&&<span className="chrono-live-feedback">{roundFeedback(p.feedback)}</span>}</span>
   </div></div>
  </section>
  <div className="chrono-workspace">
   <div className="chrono-clock-space"><div className="chrono-clock-region" data-clock-face data-clock-current={label(p.current)} data-clock-numerals={p.face}>{p.clock}</div></div>
   <section className="chrono-console" aria-label="Clock controls">
    <div className="chrono-hand-bays" role="group" aria-label="Adjust the clock hands">{(['hours','minutes'] as const).map(type=><div className="chrono-hand-bay" data-hand-selected={hand===type} key={type}>
     <h2>{type==='hours'?'Hour hand':`Minute hand · ${p.step} min`}</h2>
     <div className="chrono-hand-buttons">{[-1,1].map(direction=><button key={direction} type="button" data-button-skin="none" aria-label={`${direction<0?'Decrease':'Increase'} ${type==='hours'?'hour':'minutes'}`} disabled={p.disabled} onClick={()=>{setHand(type);p.onAdjust(type,direction*(type==='hours'?1:p.step))}}><ArtworkFrame name="buttons/angle_answer_v4" corner={.13} fit="height"/>{direction<0?<Minus aria-hidden="true"/>:<Plus aria-hidden="true"/>}</button>)}</div>
    </div>)}</div>
    <div className="chrono-live-actions">
     <button type="button" data-button-skin="none" className="chrono-restore" disabled={p.disabled} onClick={p.onRestore}><ArtworkFrame name="buttons/ops_answer_v3" corner={.13}/><span>{p.state==='complete'?'TIME RESTORED':'RESTORE TIME'}</span></button>
     <button type="button" data-button-skin="none" className="chrono-reset" aria-label="RESET TIMEKEEPER" disabled={p.paused} onClick={p.onReset}><ArtworkFrame name="buttons/angle_answer_v4" corner={.13} fit="height"/><RotateCcw aria-hidden="true"/><span>Reset</span></button>
    </div>
   </section>
  </div>
 </section>;
}
