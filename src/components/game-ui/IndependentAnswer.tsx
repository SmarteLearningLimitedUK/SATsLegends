import {finiteDecimalAnswer,validateAnswerEntry} from '../../systems/content/answerEntry';
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import SatsAnswerFields from './SatsAnswerFields';
import {answersMatch, type SatsMission} from '../../systems/content/satsAdventure';
import {prepareIndependentResponse, clearIndependentResponse} from '../../systems/learning/responseContext';
import {useDialogFocus} from './useDialogFocus';
import {mathematicalFingerprint} from '../../systems/learning/fingerprint';
export const matchingAnswerIndex=(value:string,options:readonly (string|number)[])=>options.findIndex(option=>answersMatch(value,String(option)));
export const canonicalAnswer=(value:string,options:readonly (string|number)[])=>{const i=matchingAnswerIndex(value,options);return i<0?value:String(options[i]);};
export const answerAsNumber=finiteDecimalAnswer;
interface Props {
  key?:string;
  questionId:string|number; fingerprint:string; gameKey:string; skillId:string; curriculumRefs:string[];
  label?:string; submitLabel?:string; reference?:string; expectedUnit?:string; disabled?:boolean; fraction?:boolean; simplest?:boolean; remainder?:boolean;
  onSubmit:(value:string)=>void;
  inline?:boolean;
  scaffolded?:boolean;
  retryToken?:number;
  children?:(open:()=>void)=>React.ReactNode;
}
/** Existing answer pad and dialog, inside the existing game's response region. */
export default function IndependentAnswer(p:Props) {
  const [open,setOpen]=useState(false),[values,setValues]=useState<string[]>([]),[notice,setNotice]=useState('');
  const submitted=useRef(false),mathReminderUsed=useRef(false),ordinal=useRef(0),focus=useDialogFocus(open,()=>setOpen(false));
  const questionId=String(p.questionId);
  useEffect(()=>{setOpen(false);setValues([]);setNotice('');submitted.current=false;mathReminderUsed.current=false;ordinal.current=0;clearIndependentResponse();return()=>clearIndependentResponse(questionId);},[questionId,p.fingerprint]);
  useEffect(()=>{if(p.retryToken===undefined)return;setValues([]);setNotice('');submitted.current=false;clearIndependentResponse(questionId);},[p.retryToken,questionId]);
  const field:SatsMission={id:questionId,reference:p.curriculumRefs[0]||'',domain:'N',game:p.gameKey,difficulty:1,prompt:'',visual:{type:'equation',lines:[]},fields:p.remainder?[{label:'Full boxes',answer:'0'},{label:'Leftover crates',answer:'0'}]:[{label:p.label||'Answer',answer:'0'}],explanation:'',marks:1};
  const submit=(event:React.FormEvent)=>{
    event.preventDefault();if(submitted.current||p.disabled)return;
    const entry=validateAnswerEntry(p.remainder?`${values[0]||''} r${values[1]||''}`:values[0]||'',{kind:p.remainder?'quotient-remainder':p.fraction?'fraction':'number',expectedUnit:p.expectedUnit,simplest:p.simplest});
    if(entry.ok===false){if(entry.mathematicalReminder)mathReminderUsed.current=true;setNotice(entry.message);return;}
    const value=entry.value;
    submitted.current=true;ordinal.current++;
    prepareIndependentResponse({questionId,familyId:p.skillId,gameKey:p.gameKey,skillId:p.skillId,curriculumRefs:p.curriculumRefs,
      variantFingerprint:mathematicalFingerprint(p.fingerprint),contentVersion:'2026-11-04.1',responseKind:'numeric',attemptOrdinal:ordinal.current,
      eventId:globalThis.crypto?.randomUUID?.()??`${Date.now()}:${Math.random()}`,independent:true,mathematicalScaffoldUsed:Boolean(p.scaffolded)||mathReminderUsed.current});
    setOpen(false);p.onSubmit(value);
  };
  // Preserve the scene's trigger and artwork while identifying its text action.
  const trigger=p.children?.(()=>{if(!p.disabled){submitted.current=false;setOpen(true);}});
  const markedTrigger=React.isValidElement<Record<string,unknown>>(trigger)
    ?React.cloneElement(trigger,{'data-independent-answer-trigger':true}):trigger;
  if(p.inline)return <form className="sats-inline-answer" aria-label={p.label||'Enter your answer'} onSubmit={submit}>
    <fieldset className="sats-inline-answer-body" disabled={p.disabled}>
      {p.reference&&<p className="sats-answer-reference">{p.reference}</p>}
      <SatsAnswerFields mission={field} values={values} inlinePad compactPad onChange={(value,i)=>{setValues(old=>{const next=[...old];next[i]=value;return next;});setNotice('');}}/>
      {notice&&<p role="alert">{notice}</p>}
      <button type="submit" className="ui-button-primary" aria-label={p.submitLabel??'Submit answer'}>{p.submitLabel??'Submit'}</button>
    </fieldset>
  </form>;
  return <>{markedTrigger}{open&&createPortal(<div className="sats-answer-pad-scrim"><form ref={focus as React.RefObject<HTMLFormElement>} role="dialog" aria-modal="true" aria-label={p.label||'Enter your answer'} className="sats-answer-pad sats-independent-pad legend-dialog" onSubmit={submit}>
    {p.reference&&<p className="sats-answer-reference">{p.reference}</p>}
    <SatsAnswerFields mission={field} values={values} inlinePad compactPad onChange={(value,i)=>{setValues(old=>{const next=[...old];next[i]=value;return next;});setNotice('');}}/>
    {notice&&<p role="alert">{notice}</p>}
    <div className="sats-independent-actions">
     <button type="submit" className="ui-button-primary" aria-label={p.submitLabel??'Submit answer'} disabled={p.disabled}>{p.submitLabel??'Submit'}</button>
     <button type="button" className="ui-button-secondary" aria-label="Return to question" onClick={()=>setOpen(false)}>Back</button>
    </div>
  </form></div>,document.body)}</>;
}
