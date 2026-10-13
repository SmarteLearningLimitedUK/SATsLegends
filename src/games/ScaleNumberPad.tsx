import React, {useRef} from 'react';
interface Props {values:[string,string];active:0|1;locked:boolean;onActive:(axis:0|1)=>void;onChange:(axis:0|1,value:string)=>void;onSubmit:()=>void;}
const validDraft=(text:string)=>/^\d{0,4}(?:\.\d{0,2})?$/.test(text);
export default function ScaleNumberPad({values,active,locked,onActive,onChange,onSubmit}:Props){
 const fields=useRef<Array<HTMLInputElement|null>>([]);
 const change=(axis:0|1,text:string)=>{if(validDraft(text))onChange(axis,text);};
 const key=(value:string)=>{if(locked)return;change(active,value==='⌫'?values[active].slice(0,-1):values[active]+value);};
 return <div className="scale-number-entry">
  <div className="scale-dimension-fields">{(['length','width'] as const).map((label,i)=><label key={label} data-active={active===i}>
   <span>New {label} <small>(units)</small></span>
   <input ref={node=>{fields.current[i]=node;}} aria-label={`New ${label}`} inputMode="decimal" autoComplete="off" value={values[i]} placeholder="?" disabled={locked} onFocus={()=>onActive(i as 0|1)} onChange={e=>change(i as 0|1,e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(i===0){onActive(1);fields.current[1]?.focus();}else onSubmit();}}}/>
  </label>)}</div>
  <div className="scale-number-pad" role="group" aria-label={`Number pad for new ${active===0?'length':'width'}`}>
   {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(value=><button key={value} type="button" aria-label={value==='⌫'?'Delete digit':value==='.'?'Decimal point':value} disabled={locked||(value==='.'&&values[active].includes('.'))} onClick={()=>key(value)}>{value}</button>)}
  </div>
 </div>;
}
