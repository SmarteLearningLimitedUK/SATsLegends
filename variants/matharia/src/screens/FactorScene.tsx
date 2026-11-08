import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import IndependentAnswer,{answerAsNumber} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React from 'react';
import {CheckCircle2,RotateCcw} from 'lucide-react';
import {asset} from '../assets';
import ArtworkFrame from '../ArtworkFrame';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';
interface Problem{id:number;type:string;number:number;number2?:number;question:string;options:number[];correctAnswers:number[];}
interface Props{problem:Problem|null;status:'playing'|'correct'|'incorrect'|'complete';score:number;remaining:number;runRemaining?:number;limit:number;health:number;total:number;selected:number[];instruction:string;feedback:string;hit:boolean;paused:boolean;onToggle:(value:number)=>void;onSubmit:(entered?:number[])=>void;onClaim:()=>void;onRestart:()=>void;}
export default function FactorScene(p:Props){
 const support=useLearningPolicy(),untimed=support.noTimeLimit||support.relaxedPractice;
 useSceneContact(`${p.problem?.id}:${p.health}`,p.hit,'digital',150,p.paused);
 usePresentationHint(`${p.instruction}\nCorrect set = one pulse. Open all ${p.total} locks.`);const opened=p.total-p.health,playing=p.status==='playing',count=p.problem?.options.length??0,columns=count<=4||count===7||count===8?4:3;
 const runFirst=p.runRemaining!==undefined&&p.runRemaining<p.remaining,remaining=Math.min(p.remaining,p.runRemaining??p.remaining);
 const questionStep = opened - (p.status === 'correct' ? 1 : 0);
 const question = p.status === 'complete' ? 'Sentinel unlocked!' : p.problem
  ? p.problem.question
  : 'Preparing the factor locks…';
 return <section className="factor-scene" data-factor-game data-factor-id={p.problem?.id} data-factor-type={p.problem?.type} data-factor-number={p.problem?.number} data-factor-number2={p.problem?.number2} data-factor-health={p.health} data-factor-status={p.status} data-factor-time={p.remaining} data-factor-limit={p.limit} data-factor-score={p.score} data-factor-count={p.problem?.options.length??0} data-paused={p.paused}>
  <div className="factor-workspace">
  <div className="factor-lock-panel"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><header><strong>Sentinel locks</strong><span className="factor-pulse-clock" role="timer" aria-label={untimed?'Untimed practice':`${remaining} seconds left for ${runFirst?'the run':'this pulse'}`} data-urgent={remaining<=5}>{untimed?'Untimed':`${remaining}s`} <small>{!untimed&&(runFirst?'run':'this pulse')}</small></span><span>{opened} / {p.total} open</span></header><div className="factor-locks" role="progressbar" aria-label="Sentinel locks opened" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={opened}>{Array.from({length:p.total},(_,i)=><svg key={i} viewBox="0 0 40 12" aria-hidden="true" data-open={i<opened}><path d="M4 1H36L39 6L36 11H4L1 6Z" fill={i<opened?'#73e7bd':'#153f4b'} stroke={i<opened?'#ffe3a0':'#95c4d3'} strokeWidth="1.2"/></svg>)}</div></div>
  <section className="factor-question" data-concept-panel data-game-question="true" aria-label="Question from the Sentinel" aria-live="polite" aria-atomic="true">
   <div key={p.problem?.id} className="factor-question-bubble" data-reduced-movement={support.reducedMovement} data-question-copy>
    {question}
    {p.problem&&p.status!=='complete'&&<small className="scalable-question-story">{adventureTask('factor_frenzy',questionStep)}</small>}
   </div>
  </section>
  <div className="factor-illustration">
  <img className="factor-pedestal" src={asset('props','factor_pedestal_v3')} alt="" aria-hidden="true"/><div className="factor-sentinel" data-hit={p.hit} data-reaction={p.status} aria-hidden="true"><img src={asset('characters','factor_sentinel_v3')} alt="" draggable={false}/></div>
  </div>
  {p.status==='complete'?<section className="factor-complete"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><h2>Sentinel unlocked!</h2><p>All ten factor locks opened.</p><strong>{p.score.toLocaleString()} points</strong><button type="button" className="factor-claim" data-button-skin="none" disabled={p.paused} onClick={p.onClaim}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/><CheckCircle2 aria-hidden="true"/>Claim Victory</button><button type="button" className="factor-restart" data-button-skin="none" disabled={p.paused} onClick={p.onRestart}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><RotateCcw aria-hidden="true"/>Restart</button></section>:<>
   <section className="factor-console" aria-label="Load factor runes"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><div className="factor-caption"><p className="factor-feedback" role={!playing?'status':undefined} aria-live={!playing?'polite':undefined}>{roundFeedback(p.feedback)}</p></div><div className="factor-runes" role="group" aria-label="Choose factor runes" data-columns={columns}>{p.problem?.type==='missing_factor'?<IndependentAnswer submitLabel="Fire pulse" questionId={p.problem.id} fingerprint={JSON.stringify([p.problem.number,p.problem.number2,p.problem.question])} gameKey="factor_frenzy" skillId="factors.missing" curriculumRefs={["4C6a"]} disabled={!playing||p.paused} onSubmit={value=>p.onSubmit([answerAsNumber(value)])}>{open=><button type="button" data-button-skin="none" disabled={!playing||p.paused} onClick={open}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/><img className="factor-rune-jewel" src={asset('frames','sapphire_crest_v3')} alt="" aria-hidden="true"/><span>Enter factor</span></button>}</IndependentAnswer>:<>{p.problem?.options.map(value=><button type="button" key={`${p.problem!.id}:${value}`} data-button-skin="none" data-factor-option={value} data-answer={!playing&&p.problem?.correctAnswers.includes(value)||undefined} aria-label={`Factor ${value}`} aria-pressed={p.selected.includes(value)} disabled={!playing||p.paused} onClick={()=>p.onToggle(value)}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/><img className="factor-rune-jewel" src={asset('frames','sapphire_crest_v3')} alt="" aria-hidden="true"/><span>{value}</span></button>)}</>}</div>
   {p.problem?.type!=='missing_factor'&&<button type="button" className="factor-fire" data-button-skin="none" disabled={!playing||!p.selected.length||p.paused} onClick={() => p.onSubmit()}><ArtworkFrame name={playing&&p.selected.length?'buttons/pvp_submit_v2':'buttons/scale_key_v4'} corner={.12} fit="height"/>{p.status==='correct'?'Pulse connected!':p.status==='incorrect'?'Recharging…':p.selected.length?'Fire pulse':'Fire pulse'}</button>}</section>
  </>}
  {p.hit&&<svg key={`${p.problem?.id}:${opened}`} className="factor-pulse-effect" data-factor-pulse viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path className="factor-pulse-trail" d="M50 95 Q43 66 50 42"/><circle className="factor-pulse-orb" cx="50" cy="42" r="2"/><circle className="factor-pulse-contact" cx="50" cy="42" r="6"/></svg>}
  </div>
 </section>;
}
