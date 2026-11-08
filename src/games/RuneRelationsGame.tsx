import {useEffect,useMemo,useRef,useState} from 'react';
import {emitMiniGameSessionEvent,type MiniGameShellContractProps} from '../app/gameplaySessionContract';
import {buildRuneLevel,RUNE_FAMILIES,RUNE_FAMILY_NAMES,RUNE_SKILLS,pairSatisfies,parseRuneNumber,type RuneResponse} from '../systems/content/runeRelationsQuestions';
import {initialRuneState,advanceRune,submitRune,runeStars} from '../systems/content/runeRelationsState';
import {useLearningPolicy} from '../systems/learning/learningSupport';
import {questionMetadata} from '../systems/learning/questionMetadata';
import {usePausedTimers} from '../../variants/matharia/src/usePausedTimers';
import RevisionActivityPresentation from '../components/game-ui/RevisionActivityPresentation';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import ArtworkFrame from '../../variants/matharia/src/ArtworkFrame';
import RuneBoard from './runeRelations/RuneBoard';
import RuneNumberEntry from './runeRelations/RuneNumberEntry';
import {playGameSound} from '../audio/gameAudio';
import './runeRelations/rune-relations.css';
import '../../variants/matharia/src/screens/rune-relations-layout.css';
interface Props extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;}
export default function RuneRelationsGame(p:Props){
 const focus=p.isPractice?RUNE_FAMILIES.find(family=>RUNE_SKILLS[family]===new URLSearchParams(location.search).get('revisionSkill')):undefined;
 const [seed]=useState(()=>{const values=new Uint32Array(1);crypto.getRandomValues(values);return values[0]}),tier=Math.max(1,Math.min(5,p.levelId||1));
 const questions=useMemo(()=>buildRuneLevel(tier,seed,focus),[tier,seed,focus]);
 const [state,setState]=useState(initialRuneState),ref=useRef(state);ref.current=state;
 const [response,setResponse]=useState<RuneResponse>({}),[draft,setDraft]=useState<[string,string]>(['','']),[entry,setEntry]=useState<'answer'|0|1|null>(null),[intro,setIntro]=useState(Boolean(p.isPractice)),[hidden,setHidden]=useState(document.hidden);
 const support=useLearningPolicy(),ended=useRef(false),helpUsed=useRef(false),callbacks=useRef(p);callbacks.current=p;
 const q=questions[Math.min(9,state.index)],relaxed=Boolean(p.isPractice||p.sessionState?.relaxed||support.relaxedPractice),expired=Boolean(p.sessionState&&!p.sessionState.untimed&&!support.noTimeLimit&&!relaxed&&p.sessionState.timeLeft<=0),paused=Boolean(p.sessionState?.paused)||intro||hidden||expired;
 const timers=usePausedTimers(paused||entry!==null),disabled=paused||state.phase!=='playing'||Boolean(state.feedback);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 useEffect(()=>{setResponse({});setDraft(['','']);setEntry(null);helpUsed.current=false;},[q.id]);
 useEffect(()=>{if(state.phase==='correct')return timers.schedule(()=>setState(s=>advanceRune(s)),1000)},[state.phase,state.index,timers]);
 useEffect(()=>{if(state.phase==='complete'&&!ended.current)return timers.schedule(()=>{if(ended.current)return;ended.current=true;callbacks.current.onVictory(runeStars(state.mistakes),state.score)},1000)},[state.phase,state.score,state.mistakes,timers]);
 useEffect(()=>{if(state.phase==='failed'&&!ended.current){ended.current=true;callbacks.current.onGameOver(state.score)}},[state.phase,state.score]);
 const change=(next:RuneResponse)=>{if(disabled)return;setResponse(next);setState(s=>({...s,notice:''}));playGameSound('place');};
 const submit=(given=response)=>{
  if(paused||entry!==null||ended.current)return;
  const before=ref.current,next=submitRune(before,q,given,relaxed,p.sessionState?.lives??Math.max(0,3-before.mistakes));ref.current=next;setState(next);
  if(next.attempts===before.attempts)return;
  const metadata={...questionMetadata('rune_relations',q.skillId,q,['missing','rule'].includes(q.family)?'numeric':q.family==='combinations'?'recognition':'construction',q.references,helpUsed.current),familyId:`rune-${q.family}-${q.mode}`,preservesLives:relaxed,answerRevealed:false};
  emitMiniGameSessionEvent(p.sessionEvents,next.feedback!.correct?'correct_answer':'incorrect_answer',{score:next.score,metadata});
  if(!next.feedback!.correct)helpUsed.current=true;
 };
 const recordPair=()=>{
  if(disabled)return;
  const parsed=draft.map(parseRuneNumber);
  if(parsed.some(value=>!value||value.d!==1||value.n<0)){setState(s=>({...s,notice:'Set x and y to whole numbers first.'}));return;}
  const pair:[number,number]=[parsed[0]!.n,parsed[1]!.n];
  if(response.pairs?.some(p=>p[0]===pair[0]&&p[1]===pair[1])){setState(s=>({...s,notice:'That pair is already recorded.'}));return;}
  if(!pairSatisfies(q,pair)){submit({pairs:[...(response.pairs??[]),pair]});return;}
  change({pairs:[...(response.pairs??[]),pair]});setDraft(['','']);
 };
 const button=(text:string,action:()=>void,primary=false,extra:Record<string,string>={})=><button type="button" data-button-skin="none" disabled={disabled} onClick={action} {...extra}><ArtworkFrame name={primary?'buttons/pvp_submit_v2':'buttons/scale_key_v4'} corner={.13} fit="height"/><span>{text}</span></button>;
 const controls=<div className="rune-controls" data-rune-controls data-rune-tier={tier} data-rune-score={state.score} data-rune-restored={state.restored} data-rune-phase={state.phase} data-rune-family={q.family} data-rune-seed={seed} data-rune-paused={paused}>
  {state.feedback?<div className="rune-feedback" data-rune-feedback={state.feedback.correct?'correct':'incorrect'} role="status"><p>{state.feedback.text}</p>{!state.feedback.correct&&state.phase!=='failed'&&<button type="button" className="ui-button-secondary" disabled={paused} onClick={()=>{setState(s=>({...s,feedback:null,notice:''}));}}>Try again</button>}</div>:<>
   <span className="rune-restored" aria-live="polite">{state.restored}/10 seals restored</span>
   {q.family==='pairs'?<><div className="rune-pair-entry">{button(`x: ${draft[0]||'?'}`,()=>setEntry(0),false,{'aria-label':'Set x'})}{button(`y: ${draft[1]||'?'}`,()=>setEntry(1),false,{'aria-label':'Set y'})}</div>{button('Record pair',recordPair,false,{'data-rune-record':'true'})}</>:q.family==='missing'||q.family==='rule'?button(response.text||'Enter value',()=>setEntry('answer'),false,{'aria-label':'Enter rune value'}):button('Clear runes',()=>change({}),false)}
   {button('Seal relation',()=>submit(),true,{'data-rune-submit':'true'})}
   {state.notice&&<p className="rune-notice" role="alert">{state.notice}</p>}
  </>}
 </div>;
 return <><RevisionActivityPresentation id={q.id} title={`Rune seal ${Math.min(10,state.index+1)} / 10`} prompt={q.prompt} hint={`${RUNE_FAMILY_NAMES[q.family]}. ${q.hint}`} board={<RuneBoard reducedMovement={support.reducedMovement} question={q} response={response} disabled={disabled} change={change} edit={()=>{if(!disabled)setEntry('answer')}}/>} controls={controls} paused={paused} round={state.index+1} score={state.score} total={10} intro={<PracticeIntroPopup open={intro} title="Rune Relations" body="Repair the Monster Minds’ broken number links and reclaim Matharia’s stolen brainpower." briefing={p.practiceBriefing} onAction={()=>setIntro(false)}/>}/>
  {entry!==null&&<RuneNumberEntry suspended={paused} label={entry==='answer'?'Missing value':entry===0?'x':'y'} value={entry==='answer'?response.text??'':draft[entry]} onKeep={text=>{if(entry==='answer')setResponse({text});else setDraft(old=>entry===0?[text,old[1]]:[old[0],text]);setEntry(null);setState(s=>({...s,notice:''}))}} onClose={()=>setEntry(null)}/>}
 </>;
}
