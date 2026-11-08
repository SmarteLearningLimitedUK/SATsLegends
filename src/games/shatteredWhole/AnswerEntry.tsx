import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import SatsAnswerFields from '../../components/game-ui/SatsAnswerFields';
import {useDialogFocus} from '../../components/game-ui/useDialogFocus';
import type {SatsMission} from '../../systems/content/satsAdventure';
import {parseRational} from '../../systems/content/shatteredWhole/rational';
/** Reuses the shipped keypad; there are no editable/native keyboard inputs. */
export default function ShatteredAnswerEntry({questionId,open,fraction,value,wholeNumber=false,unit,onKeep,onClose}:{questionId:string;open:boolean;fraction:boolean;value:string;wholeNumber?:boolean;unit:string;onKeep:(value:string)=>void;onClose:()=>void}){
 const [values,setValues]=useState<string[]>([]),[pad,setPad]=useState(false),[notice,setNotice]=useState('');
 const committed=useRef('');
 useEffect(()=>{setValues([]);committed.current='';setNotice('');setPad(false)},[questionId]);
 useEffect(()=>{if(open){if(value!==committed.current){setValues(fraction?value.split('/'):[value]);committed.current=value}setNotice('');setPad(false)}},[open,value,fraction]);
 const focus=useDialogFocus(open&&!pad,onClose);
 const fields=fraction?[{label:'Numerator',answer:'0'},{label:'Denominator',answer:'1'}]:[{label:unit==='%'?'Percentage (%)':unit==='decimal'?'Decimal':'Missing value',answer:'0'}];
 const mission:SatsMission={id:'shattered-entry',reference:'',domain:'F',game:'shattered_whole',difficulty:1,prompt:'',visual:{type:'equation',lines:[]},fields,explanation:'',marks:1};
 if(!open)return null;
 const keep=(event:React.FormEvent)=>{event.preventDefault();const text=fraction?`${values[0]??''}/${values[1]??''}`:values[0]??'';if(!parseRational(text)||fraction&&(!/^\d+$/.test(values[0]??'')||!/^\d+$/.test(values[1]??'')||Number(values[1])===0)){setNotice(fraction?'Use whole numbers and a denominator greater than zero.':'Enter a number using the pad.');return;}const parsed=parseRational(text)!;if(wholeNumber&&(parsed.d!==1||parsed.n<=0)){setNotice('Use a positive whole number.');return;}const accepted=wholeNumber?String(parsed.n):text;committed.current=accepted;onKeep(accepted);};
 return createPortal(<div className="sats-answer-pad-scrim"><form ref={focus as React.RefObject<HTMLFormElement>} role="dialog" aria-modal="true" aria-label={fraction?'Enter a fraction':'Enter your answer'} className="sats-answer-pad legend-dialog sw-entry" onSubmit={keep}>
  <h2>{fraction?'Your fraction':'Your answer'}</h2><div className="sw-entry-fields"><SatsAnswerFields mission={mission} values={values} compactPad onPadOpenChange={setPad} onChange={(next,index)=>{setValues(old=>{const a=[...old];a[index]=next;return a});setNotice('')}}/></div>
  {notice&&<p role="alert">{notice}</p>}<button className="ui-button-primary" type="submit">Keep answer</button><button className="ui-button-secondary" type="button" onClick={onClose}>Back to puzzle</button>
 </form></div>,document.body);
}
