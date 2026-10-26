import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SatsMission } from '../../systems/content/satsAdventure';
import { getMissionFieldChoices } from '../../systems/content/satsAnswerChoices';
import { useDialogFocus } from './useDialogFocus';
interface Props {mission:SatsMission;values:string[];onChange:(value:string,index:number)=>void;guided?:boolean;}
const keys=['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','/','+',',',':','(',')'];
/** Independent responses in Core; familiar choice tiles remain available in guided practice. */
export default function SatsAnswerFields({mission,values,onChange,guided=false}:Props){
 const [active,setActive]=useState(0),[pad,setPad]=useState(false);
 const focus=useDialogFocus(pad,()=>setPad(false));
 const append=(symbol:string)=>onChange(((values[active]||'')+symbol).slice(0,500),active);
 return <div className="sats-fields sats-entered-fields">
  {mission.fields.map((field,i)=>{
   if(!guided && field.response==='working')return null;
   if(!guided && /^ar-long-(mult|div)-/.test(mission.id) && i===0)return null;
   const choice=!field.response&&!mission.marking&&(Boolean(field.options)||guided);
   const numeric=/^[\d\s.,/;():+×÷−-]+$/.test(field.answer);
   return <fieldset key={i}><legend>{field.label}</legend>{choice?<div className="sats-answer-options">{getMissionFieldChoices(mission,i).map(value=><button type="button" key={value} data-answer-length={value.length>8?'long':'short'} aria-pressed={values[i]===value} onClick={()=>onChange(value,i)}>{value}</button>)}</div>:<div className="sats-answer-entry"><input aria-label={field.label} value={values[i]||''} autoComplete="off" spellCheck={false} inputMode={numeric||field.response==='working'?'none':'text'} maxLength={500} placeholder={field.response==='working'?'Optional calculations':'Your answer'} onFocus={()=>setActive(i)} onChange={e=>onChange(e.target.value,i)} /><button type="button" aria-label={`Open answer pad for ${field.label}`} onClick={()=>{setActive(i);setPad(true);}}>Answer pad</button></div>}</fieldset>;
  })}
  {pad?createPortal(<div className="sats-answer-pad-scrim" role="presentation"><div ref={focus} tabIndex={-1} className="sats-answer-pad" role="dialog" aria-modal="true" aria-label={`Answer pad: ${mission.fields[active].label}`}>
   <div className="sats-pad-heading"><strong>{mission.fields[active].label}</strong><button type="button" onClick={()=>setPad(false)}>Done</button></div>
   <output aria-live="polite">{values[active]||'Enter your answer'}</output>
   <div className="sats-pad-keys">{keys.map(key=><button type="button" key={key} onClick={()=>append(key)}>{key}</button>)}<button type="button" onClick={()=>onChange((values[active]||'').slice(0,-1),active)}>Delete</button><button type="button" onClick={()=>onChange('',active)}>Clear</button><button type="button" onClick={()=>append(' ')}>Space</button><button type="button" onClick={()=>append(';')}>;</button></div>
  </div></div>,document.body):null}
 </div>;
}
