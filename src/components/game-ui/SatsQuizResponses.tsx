import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {SatsMission} from '../../systems/content/satsAdventure';
import SatsAnswerFields from './SatsAnswerFields';
import {useDialogFocus} from './useDialogFocus';
import './sats-quiz.css';

const readArray=(value:string|undefined):string[]|null=>{try{const q=JSON.parse(value??'');return Array.isArray(q)&&q.every(v=>typeof v==='string')?q:null;}catch{return null;}};
export default function SatsQuizResponses({mission:q,values,onChange}:{mission:SatsMission;values:string[];onChange:(value:string,index:number)=>void}){
 const [open,setOpen]=useState(false),[padOpen,setPadOpen]=useState(false),[active,setActive]=useState(0);
 const response=q.assessment?.response;
 const close=()=>{if(response?.kind==='ordering'&&!values[0])onChange(JSON.stringify(response.values),0);setOpen(false);};
 const focus=useDialogFocus(open&&!padOpen,()=>setOpen(false));
 useEffect(()=>{setOpen(false);setActive(0);setPadOpen(false);},[q.id]);
 if(!response)return <SatsAnswerFields mission={q} values={values} onChange={onChange}/>;
 const simple=['number','fraction','mixed','parts','construction'].includes(response.kind)&&q.fields.length<=2;
 if(simple)return <SatsAnswerFields mission={q} values={values} onChange={onChange}/>;
 const selected=readArray(values[0])??[],order=response.kind==='ordering'?(readArray(values[0])??response.values):[];
 const label=response.kind==='matching'?'Match the values':response.kind==='ordering'?'Put the values in order':response.kind==='table'?'Complete the table':response.kind==='blanks'?'Complete the missing values':response.kind==='select-one'||response.kind==='select-many'?'Choose your answer':'Enter your answers';
 const pad=<div key={`${q.id}:${active}`}><SatsAnswerFields mission={{...q,fields:[q.fields[active]]}} values={[values[active]??'']} onChange={value=>onChange(value,active)} onPadOpenChange={setPadOpen}/></div>;
 return <div className="sats-quiz-response">
  <button type="button" className="ui-button-secondary sats-quiz-open" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{label}{values.some(Boolean)?' · Saved':''}</button>
  {open&&createPortal(<div className="sats-answer-pad-scrim"><div ref={focus} tabIndex={-1} className="sats-answer-pad sats-quiz-editor" role="dialog" aria-modal="true" aria-label={label} data-quiz-response-editor={response.kind}>
   <div className="sats-pad-heading"><strong>{label}</strong><button type="button" data-dialog-primary onClick={close}>Done</button></div><p>{q.prompt}</p>
   {(response.kind==='select-one'||response.kind==='select-many')&&<div className="paper-choice-options sats-quiz-options">{response.options.map((option,i)=>{
    const pressed=response.kind==='select-one'?values[0]===option:selected.includes(String(i));
    return <button type="button" key={option} aria-pressed={pressed} className="ui-button-secondary" onClick={()=>onChange(response.kind==='select-one'?option:JSON.stringify(pressed?selected.filter(v=>v!==String(i)):[...selected,String(i)]),0)}>{option}</button>;
   })}</div>}
   {response.kind==='matching'&&<><p>Tap a value on the left, then its match on the right.</p><div className="sats-quiz-matching"><div>{response.left.map((left,i)=><button type="button" key={left} aria-pressed={active===i} onClick={()=>setActive(i)}>{left} → {values[i]||'?'}</button>)}</div><div>{response.right.map(right=><button type="button" key={right} aria-pressed={values[active]===right} onClick={()=>onChange(right,active)}>{right}</button>)}</div></div></>}
   {response.kind==='ordering'&&<><p>Move the values so the smallest is first.</p><ol className="sats-quiz-order">{order.map((value,i)=><li key={value}><span>{value}</span>{[-1,1].map(direction=><button type="button" key={direction} aria-label={`Move ${value} ${direction<0?'earlier':'later'}`} disabled={i+direction<0||i+direction>=order.length} onClick={()=>{const next=[...order];[next[i],next[i+direction]]=[next[i+direction],next[i]];onChange(JSON.stringify(next),0);}}>{direction<0?'↑':'↓'}</button>)}</li>)}</ol></>}
   {response.kind==='table'&&<><div className="sats-quiz-table"><table><thead><tr>{response.headings.map(h=><th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{response.rows.map((row,r)=><tr key={r}>{row.map((text,c)=>{const i=response.cells.findIndex(([rr,cc])=>rr===r&&cc===c);return <td key={c}>{i<0?text:<button type="button" aria-label={`Edit ${q.fields[i].label}`} aria-pressed={active===i} onClick={()=>setActive(i)}>{values[i]||'?'}</button>}</td>;})}</tr>)}</tbody></table></div>{pad}</>}
   {response.kind==='blanks'&&<><div className="sats-quiz-algorithm">{(()=>{let index=0;return response.lines.map((line,r)=><div key={r}>{line.split('□').map((part,c,parts)=><span key={c}>{part}{c<parts.length-1&&(()=>{const field=index++;return <button type="button" aria-label={`Edit ${q.fields[field].label}`} aria-pressed={active===field} onClick={()=>setActive(field)}>{values[field]||'?'}</button>;})()}</span>)}</div>);})()}</div>{pad}</>}
   {['number','fraction','mixed','parts','proof-prime'].includes(response.kind)&&<SatsAnswerFields mission={q} values={values} onChange={onChange} onPadOpenChange={setPadOpen}/>}
  </div></div>,document.body)}
 </div>;
}
