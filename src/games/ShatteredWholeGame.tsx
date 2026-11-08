import {useEffect,useMemo,useRef,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {emitMiniGameSessionEvent,type MiniGameShellContractProps} from '../app/gameplaySessionContract';
import {useLearningPolicy} from '../systems/learning/learningSupport';
import {questionMetadata} from '../systems/learning/questionMetadata';
import {buildShatteredLevel,shatteredSignature,type ShatteredResponse} from '../systems/content/shatteredWhole/questions';
import {shatteredPracticeTier} from '../systems/content/shatteredWhole/revision';
import {advanceShattered,initialShatteredState,shatteredStars,submitShattered} from '../systems/content/shatteredWhole/state';
import {usePausedTimers} from '../../variants/matharia/src/usePausedTimers';
import {usePresentationHint} from '../../variants/matharia/src/PresentationHint';
import ShatteredWholeScene from './shatteredWhole/Scene';
interface Props extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;}
function newSeed(tier:number){
 let old=-1,last:string|null=null;
 try{old=Number(sessionStorage.getItem('matharia-shattered-seed-v1')??-1);last=sessionStorage.getItem('matharia-shattered-last-v1')}catch{/* Seed history is optional. */}
 const seed=new Uint32Array(1);crypto.getRandomValues(seed);if(seed[0]===old)seed[0]=(old+1)>>>0;
 for(let tries=0;tries<128&&shatteredSignature(buildShatteredLevel(tier,seed[0])[0])===last;tries++)seed[0]++;
 try{sessionStorage.setItem('matharia-shattered-seed-v1',String(seed[0]))}catch{/* Gameplay remains available without seed history. */}
 return seed[0];
}
export default function ShatteredWholeGame(p:Props){
 const tier=p.isPractice?shatteredPracticeTier(new URLSearchParams(location.search).get('revisionSkill')):p.levelId;
 const [seed]=useState(()=>newSeed(tier)),questions=useMemo(()=>buildShatteredLevel(tier,seed),[tier,seed]);
 const [state,setState]=useState(initialShatteredState),stateRef=useRef(state);stateRef.current=state;
 const [response,setResponse]=useState<ShatteredResponse>({}),[entry,setEntry]=useState(false),[hidden,setHidden]=useState(document.hidden);
 const support=useLearningPolicy(),osMotion=useReducedMotion(),ended=useRef(false),callbacks=useRef(p);callbacks.current=p;
 const question=questions[Math.min(state.index,9)],relaxed=Boolean(p.isPractice||p.sessionState?.relaxed||support.relaxedPractice),expired=Boolean(p.sessionState&&!p.sessionState.untimed&&!support.noTimeLimit&&!relaxed&&p.sessionState.timeLeft<=0),paused=Boolean(p.sessionState?.paused)||hidden||expired;
 const timers=usePausedTimers(paused||entry);
 usePresentationHint(question.hint);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 useEffect(()=>{setResponse({});setEntry(false);try{sessionStorage.setItem('matharia-shattered-last-v1',shatteredSignature(question))}catch{/* Optional replay history. */}},[question.id]);
 useEffect(()=>{if(state.phase!=='correct')return;return timers.schedule(()=>setState(s=>advanceShattered(s)),1000)},[state.phase,state.index,timers]);
 useEffect(()=>{
  if(state.phase!=='complete'||ended.current)return;
  return timers.schedule(()=>{if(ended.current)return;ended.current=true;callbacks.current.onVictory(shatteredStars(state.mistakes),state.score)},1400);
 },[state.phase,state.score,state.mistakes,timers]);
 useEffect(()=>{if(state.phase==='failed'&&!ended.current){ended.current=true;callbacks.current.onGameOver(state.score)}},[state.phase,state.score]);
 const change=(next:ShatteredResponse)=>{if(!paused&&stateRef.current.phase==='playing'&&!stateRef.current.feedback){setResponse(next);setState(s=>({...s,notice:''}))}};
 const submit=()=>{
  if(paused||entry||ended.current)return;
  const previous=stateRef.current,lives=p.sessionState?.lives??Math.max(0,3-previous.mistakes),next=submitShattered(previous,question,response,relaxed,lives);
  stateRef.current=next;setState(next);
  if(next.attempts===previous.attempts)return;
  const kind=['order','compare'].includes(question.interaction)?'recognition':['shade','place'].includes(question.interaction)?'construction':'numeric';
  const metadata={...questionMetadata('shattered_whole',question.skillId,question,kind,question.references),familyId:`shattered-${question.family}`,tier:question.tier,untimed:Boolean(p.sessionState?.untimed||support.noTimeLimit||relaxed),preservesLives:relaxed};
  emitMiniGameSessionEvent(p.sessionEvents,next.feedback!.correct?'correct_answer':'incorrect_answer',{metadata});
 };
 return <ShatteredWholeScene question={question} state={state} response={response} change={change} submit={submit} retry={()=>{if(!paused)setState(s=>({...s,feedback:null,notice:''}))}} paused={paused} avatarId={p.avatarId} reducedMovement={support.reducedMovement||Boolean(osMotion)} reducedEffects={support.reducedEffects} entry={entry} setEntry={setEntry} seed={seed}/>;
}
