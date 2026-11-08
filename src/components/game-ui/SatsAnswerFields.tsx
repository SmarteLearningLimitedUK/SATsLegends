import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SatsMission } from '../../systems/content/satsAdventure';
import {normaliseAnswer} from '../../systems/content/satsAdventure';
import { getMissionFieldChoices } from '../../systems/content/satsAnswerChoices';
import { useDialogFocus } from './useDialogFocus';
interface Props {mission:SatsMission;values:string[];onChange:(value:string,index:number)=>void;guided?:boolean;compactPad?:boolean;inlinePad?:boolean;onPadOpenChange?:(open:boolean)=>void;}
const digits=['1','2','3','4','5','6','7','8','9','.','0','Delete'];
/** Independent responses in Core; familiar choice tiles remain available in guided practice. */
export default function SatsAnswerFields({mission,values,onChange,guided=false,compactPad=false,inlinePad=false,onPadOpenChange}:Props){
 const [active,setActive]=useState(0),[pad,setPad]=useState(false);
 const closePad=()=>{setPad(false);onPadOpenChange?.(false);};
 const focus=useDialogFocus(pad,closePad);
 const append=(symbol:string)=>onChange(((values[active]||'')+symbol).slice(0,500),active);
 const openPad=(index:number)=>{setActive(index);if(!inlinePad){setPad(true);onPadOpenChange?.(true);}};
 const numericPad=inlinePad||compactPad;
 const extraSymbols=numericPad?['−','/']:['−','/','+','×','÷',',',':','(',')','r',';'];
 const padKeys=<>
  <div className="sats-pad-digits" role="group" aria-label={`Number pad: ${mission.fields[active]?.label||'answer'}`}>{digits.map(key=><button type="button" data-button-skin="none" key={key} aria-label={key==='Delete'?'Delete':undefined} onClick={()=>key==='Delete'?onChange((values[active]||'').slice(0,-1),active):append(key)}>{key==='Delete'?'⌫':key}</button>)}</div>
  <div className="sats-pad-tools" role="group" aria-label="Answer symbols">{extraSymbols.map(key=><button type="button" key={key} onClick={()=>append(key)}>{key}</button>)}<button type="button" onClick={()=>append(' ')}>Space</button>{!numericPad&&<button type="button" onClick={()=>onChange('',active)}>Clear</button>}</div>
 </>;
 return <div className="sats-fields sats-entered-fields">
  {mission.fields.map((field,i)=>{
   if(!guided && field.response==='working')return null;
   if(!guided && !mission.assessment?.quiz && /^ar-long-(mult|div)-/.test(mission.id) && i===0)return null;
   const numerical=/^(?:number|percent|degrees|time):/.test(normaliseAnswer(field.answer));
   const recognition=/which.*(?:prime|factor|multiple)|(?:select|identify).*shape/i.test(mission.prompt);
   const choice=!field.response&&!mission.marking&&Boolean(field.options)&&(!numerical||recognition);
   if(/^\d{4}-\d{2}-\d{2}$/.test(field.answer))return <fieldset key={i}><legend>{field.label}</legend><input type="date" aria-label={field.label} value={values[i]||''} onChange={e=>onChange(e.target.value,i)}/></fieldset>;
   return <fieldset key={i}><legend>{field.label}</legend>{choice?<div className="sats-answer-options">{getMissionFieldChoices(mission,i).map(value=><button type="button" key={value} aria-pressed={values[i]===value} onClick={()=>onChange(value,i)}>{value}</button>)}</div>:<div className="sats-answer-entry" data-inline-pad={inlinePad||undefined}><input aria-label={field.label} value={values[i]||''} readOnly autoComplete="off" spellCheck={false} inputMode="none" maxLength={500} placeholder={field.response==='working'?'Optional calculations':compactPad?'Answer':'Your answer'} onFocus={()=>setActive(i)} onClick={()=>openPad(i)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPad(i);}}} />{!inlinePad&&<button type="button" aria-label={`Open answer pad for ${field.label}`} onClick={()=>openPad(i)}>{compactPad?'Pad':'Answer pad'}</button>}</div>}</fieldset>;
  })}
  {inlinePad&&<div className="sats-pad-keys sats-mini-number-pad">{padKeys}</div>}
  {pad?createPortal(<div className="sats-answer-pad-scrim" role="presentation"><div ref={focus} tabIndex={-1} className={compactPad?'sats-answer-pad sats-compact-field-pad':'sats-answer-pad'} role="dialog" aria-modal="true" aria-label={`Answer pad: ${mission.fields[active].label}`}>
   <div className="sats-pad-heading"><strong>{mission.fields[active].label}</strong><button type="button" onClick={closePad}>Done</button></div>
   <output aria-live="polite">{values[active]||'Enter your answer'}</output>
   <div className="sats-pad-keys">{padKeys}</div>
  </div></div>,document.body):null}
 </div>;
}
