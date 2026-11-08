import {useEffect,useMemo,useRef,useState} from 'react';
import {emitMiniGameSessionEvent,type MiniGameShellContractProps} from '../app/gameplaySessionContract';
import {buildCalendarQuestion,MONTHS} from '../systems/content/calendarQuestions';
import {buildPictogramQuestion} from '../systems/content/pictogramQuestions';
import {markMission} from '../systems/content/satsAdventure';
import {validateAnswerEntry} from '../systems/content/answerEntry';
import {questionMetadata} from '../systems/learning/questionMetadata';
import CalendarBoard from '../components/game-ui/CalendarBoard';
import SatsAnswerFields from '../components/game-ui/SatsAnswerFields';
import PictogramBoard from '../components/game-ui/PictogramBoard';
import SatsRevisionGapConstruction from '../components/game-ui/SatsRevisionGapConstruction';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import {PrimaryActionCTA,SecondaryUtilityButton} from '../layout/ScreenPrimitives';
import RevisionActivityPresentation from '../components/game-ui/RevisionActivityPresentation';
export interface RevisionActivityGameProps extends MiniGameShellContractProps {levelId:number;avatarId:string;onVictory:(stars:number,xp:number)=>void;onGameOver:(xp:number)=>void;onBack:()=>void;kind:'calendar'|'pictogram';}
const ROUNDS=5;
export default function RevisionActivityGame(p:RevisionActivityGameProps){
 const seed=useRef(Math.floor(Math.random()*1000000)),[round,setRound]=useState(0),[value,setValue]=useState(''),[feedback,setFeedback]=useState<{correct:boolean;text:string}|null>(null),[notice,setNotice]=useState(''),[intro,setIntro]=useState(Boolean(p.isPractice)),[pad,setPad]=useState(false),[hidden,setHidden]=useState(document.hidden);
 const mistakes=useRef(0),locked=useRef(false),revealed=useRef(false),finished=useRef(false);
 const callbacks=useRef(p);callbacks.current=p;
 const calendar=useMemo(()=>buildCalendarQuestion(p.levelId,seed.current,round),[p.levelId,round]);
 const pictogram=useMemo(()=>buildPictogramQuestion(p.levelId,seed.current,round),[p.levelId,round]);
 const q=p.kind==='calendar'?calendar.mission:pictogram.mission,build=p.kind==='pictogram'&&pictogram.build;
 const paused=Boolean(p.sessionState?.paused)||intro||hidden||pad;
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{setValue(build?pictogram.initialValue:'');setFeedback(null);setNotice('');locked.current=false;revealed.current=false;},[round,p.kind,p.levelId]);
 useEffect(()=>{
  if(!feedback?.correct||paused||finished.current)return;
  const timer=setTimeout(()=>{
   if(round+1===ROUNDS){finished.current=true;callbacks.current.onVictory(mistakes.current===0?3:mistakes.current<=2?2:1,ROUNDS*150);}
   else setRound(r=>r+1);
  },1400);
  return()=>clearTimeout(timer);
 },[feedback,paused,round]);
 const submit=()=>{
  if(paused||locked.current||finished.current)return;
  let entered=value;
  if(build){if(!/^pictogram:\d+:\d+:\d+$/.test(value)){setNotice('Complete all three rows before checking.');return;}}
  else if(p.kind==='calendar'&&calendar.response==='date'){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))){setNotice('Select a complete date.');return;}
  }else{const valid=validateAnswerEntry(value,{kind:'number'});if(valid.ok===false){setNotice(valid.message);return;}entered=valid.value;}
  locked.current=true;
  const correct=markMission(q,[entered])===q.marks;
  const metadata={...questionMetadata(q.game,q.skillId!,q,build?'construction':'numeric',q.reference?[q.reference]:[]),familyId:q.id,answerRevealed:revealed.current};
  emitMiniGameSessionEvent(p.sessionEvents,correct?'correct_answer':'incorrect_answer',{metadata});
  if(!correct){mistakes.current++;revealed.current=true;}
  setNotice('');setFeedback({correct,text:correct?'Correct.':q.explanation});
 };
 const selectedMonth=p.kind==='calendar'&&calendar.response==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?{year:Number(value.slice(0,4)),month:Number(value.slice(5,7))-1}:null;
 const board=p.kind==='calendar'?<CalendarBoard year={selectedMonth?.year??calendar.year} month={selectedMonth?.month??calendar.month} start={calendar.start} selected={value}/>:<PictogramBoard model={pictogram.model} showTargets={build} symbols={(build?value:pictogram.initialValue).split(':').slice(1).map(v=>/^\d+$/.test(v)?Number(v):null)}/>;
 const update=(next:string)=>{if(!locked.current){setValue(next);setNotice('');}};
 const controls=<>
  {!feedback&&<>{build?<SatsRevisionGapConstruction model={pictogram.model} value={value} onChange={update} part="controls" compact/>:<SatsAnswerFields mission={q} values={[value]} compactPad onChange={update} onPadOpenChange={setPad}/>}
  <div data-activity-check><PrimaryActionCTA disabled={paused||locked.current||!value} onClick={submit}>{build?'Check build':p.kind==='calendar'&&calendar.response==='date'?'Check date':'Check answer'}</PrimaryActionCTA></div>
  </>}{notice&&<p role="alert">{notice}</p>}
  {feedback&&<div role="status" aria-live="polite" data-activity-result={feedback.correct?'correct':'incorrect'}><p>{feedback.text}</p>{!feedback.correct&&<SecondaryUtilityButton disabled={paused} onClick={()=>{locked.current=false;setFeedback(null);}}>Try again</SecondaryUtilityButton>}</div>}
 </>;
 return <RevisionActivityPresentation id={q.id} title={p.kind==='calendar'?`${MONTHS[selectedMonth?.month??calendar.month]} ${selectedMonth?.year??calendar.year}`:'Pictograms'} prompt={q.prompt} hint={p.kind==='calendar'?'Read the dates carefully. A week has 7 days.':'Read the symbol key before answering.'} board={board} controls={controls} paused={paused} round={round+1} score={round*150} intro={<PracticeIntroPopup open={intro} title={p.kind==='calendar'?'Calendar Quest':'Pictograms'} body={p.kind==='calendar'?'Read the calendar and solve the date mission. Enter a number or select a date, then check.':'Read or build the pictogram. Use the key and half symbols where needed, then check every row.'} briefing={p.practiceBriefing} onAction={()=>setIntro(false)}/>}/>;
}
