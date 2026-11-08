import {mathematicalFingerprint} from '../../systems/learning/fingerprint';
import {validateAnswerEntry} from '../../systems/content/answerEntry';
import {normaliseAnswer} from '../../systems/content/satsAdventure';
import {useActiveRevisionClock} from '../../app/useActiveRevisionClock';
import React, { useMemo, useState, useRef } from 'react';
import SatsAnswerFields from './SatsAnswerFields';
import { getRevisionMissions, markMission } from '../../systems/content/satsAdventure';
import SatsMissionVisual from './SatsMissionVisual';
import SatsConstructionControl, { isConstructionMission } from './SatsConstructionControl';
import SatsTapWorkpad from './SatsTapWorkpad';
import './sats-adventure.css';
import { revisionAnswerSummary } from './satsRevisionFeedback';
import { playGameSound } from '../../audio/gameAudio';
import {recordLearningEvidence,revisionSessionId} from '../../systems/learning/learningStorage';
import {questionMetadata} from '../../systems/learning/questionMetadata';
import {useLearningPolicy} from '../../systems/learning/learningSupport';
import type {SatsMission} from '../../systems/content/satsAdventure';
import {missionSkill} from '../../systems/learning/revisionSkills';

export default function RevisionWorkshop({ game,missionList,goal,onComplete,independent=false }: {key?:string;game:string;missionList?:SatsMission[];goal?:number;onComplete?:()=>void;independent?:boolean}) {
  const missions = useMemo(() => missionList??getRevisionMissions(game), [game,missionList]);
  const support=useLearningPolicy(),run=useRef(`workshop:${Date.now()}:${Math.random()}`),reminded=useRef(new Set<string>()),attempts=useRef(new Map<string,number>()),revealed=useRef(new Set<string>()),started=useRef(0);
  const activeMs=useActiveRevisionClock(run.current,true,false);
  const [formatNotice,setFormatNotice]=useState('');
  const [completed,setCompleted]=useState(0);
  const [result,setResult]=useState<number|null>(null);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [workpad, setWorkpad] = useState('');
  const q = missions[index];
  if (!q) return <section className="revision-workshop" role="status">No reviewed questions are available for this skill yet. Return to the game or choose another skill.</section>;
  const questionKey=q.id+mathematicalFingerprint(q);
  return <section className="revision-workshop" aria-label={independent?'Independent revision quest':'Guided SATs practice'}>
    <h3>Practise this skill</h3>
    {!goal&&<label className="revision-question-picker">Choose a practice question<select aria-label="Choose a practice question" value={index} onChange={e => { setFormatNotice('');started.current=activeMs();setIndex(Number(e.target.value)); setValues([]); setChecked(false); setWorkpad(''); }}>{missions.map((mission, i) => <option key={`${i}:${mission.id}`} value={i}>{mission.prompt}</option>)}</select></label>}
    <p>{q.prompt}</p>{isConstructionMission(q.id)
      ? <SatsConstructionControl key={`${index}:${q.id}`} mission={q} value={values[0] ?? ''} onChange={value => { setValues([value]); setChecked(false); }} />
      : <SatsMissionVisual visual={q.visual} />}
    <SatsTapWorkpad value={workpad} onChange={value => { setWorkpad(value); setChecked(false); }} />
    <form onSubmit={e => { e.preventDefault(); if (checked) return;
      const validated=[...values];
      for(let i=0;i<q.fields.length;i++){
        const field=q.fields[i];
        if(isConstructionMission(q.id)||field.response||!/^number:/.test(normaliseAnswer(field.answer))||(!independent&&field.options)||(!values[i]&&/^ar-long-(mult|div)-/.test(q.id)&&i===0))continue;
        const unit=field.label.match(/(?:cm²|m²|cm³|m³|mm|cm|km|kg|ml|m|g|l|°|%)(?=\)|$)/)?.[0];
        const entry=validateAnswerEntry(values[i]??'',{kind:field.answer.includes('/')&&/fraction/i.test(field.label+q.prompt)?'fraction':'number',expectedUnit:unit,simplest:/simplest|simplify|lowest terms/i.test(q.prompt+' '+field.label)});
        if(entry.ok===false){if(entry.mathematicalReminder)reminded.current.add(questionKey);setFormatNotice(entry.message);return;}
        validated[i]=entry.value;
      }
      setFormatNotice('');
      const marks=markMission(q,validated,workpad),metadata=questionMetadata(game,q.reference,q,isConstructionMission(q.id)?'construction':'reasoning',[q.reference]);
      const key=q.id+String(metadata.variantFingerprint),attempt=(attempts.current.get(key)??0)+1;attempts.current.set(key,attempt);
      setChecked(true);setResult(marks);playGameSound(marks===q.marks?'correct':'incorrect');
      recordLearningEvidence({version:1,eventId:String(metadata.eventId),sessionId:revisionSessionId(),runId:run.current,questionId:q.id,familyId:q.id,
        variantFingerprint:String(metadata.variantFingerprint),contentVersion:'2026-11-04.1',gameKey:game,skillId:missionSkill(q),curriculumRefs:q.curriculumRefs??(q.reference?[q.reference]:[]),tier:q.difficulty,
        responseKind:isConstructionMission(q.id)?'construction':'reasoning',attemptOrdinal:attempt,firstAttempt:attempt===1,
        correct:marks===q.marks,marksAwarded:marks,marksAvailable:q.marks,mathematicalScaffoldUsed:!independent||reminded.current.has(questionKey),answerRevealed:revealed.current.has(q.id+String(metadata.variantFingerprint)),
        instructionRepeated:false,readAloudUsed:support.readAloud,occurredAt:Date.now(),activeDurationMs:Math.max(0,activeMs()-started.current),supportSnapshot:{...support},context:'workshop'});
      revealed.current.add(q.id+String(metadata.variantFingerprint));started.current=activeMs(); }}>
      {!isConstructionMission(q.id) && <div key={`${index}:${q.id}`}><SatsAnswerFields mission={q} values={values} guided={!independent} onChange={(value,i)=>{setValues(old=>{const next=[...old];next[i]=value;return next;});setChecked(false);}} /></div>}
      {formatNotice&&<p role="alert">{formatNotice}</p>}<button className="ui-button-primary" type="submit" disabled={q.fields.some((field,i)=>field.response!=='working'&&!(independent&&/^ar-long-(mult|div)-/.test(q.id)&&i===0)&&!values[i])}>{isConstructionMission(q.id) ? 'Check build' : 'Check answer'}</button>
    </form>
    {checked ? <div role="status" className="revision-solution"><strong>{result === q.marks ? 'You’ve got it!' : 'Check your answer.'}</strong><p>{q.explanation}</p><p>Answer: {revisionAnswerSummary(q)}</p></div> : null}
    <button type="button" className="ui-button-secondary" disabled={Boolean(goal)&&!checked} onClick={() => {const next=completed+1;setCompleted(next);if(goal&&next>=Math.min(goal,missions.length)){onComplete?.();return;}setIndex((index+1)%missions.length);setFormatNotice('');setValues([]);setChecked(false);setResult(null);setWorkpad('');started.current=activeMs();}}>Next practice mission ({index + 1}/{missions.length})</button>
  </section>;
}
