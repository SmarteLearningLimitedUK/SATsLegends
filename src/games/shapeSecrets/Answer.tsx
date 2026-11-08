import {useEffect,useState} from 'react';
import SatsAnswerFields from '../../components/game-ui/SatsAnswerFields';
import type {SatsMission} from '../../systems/content/satsAdventure';
import {validateAnswerEntry} from '../../systems/content/answerEntry';
import ArtworkFrame from '../../../variants/matharia/src/ArtworkFrame';
export default function SecretAnswer({id,paused,phase,feedback,onSubmit,onRetry}:{id:string;paused:boolean;phase:string;feedback:string;onSubmit:(value:string)=>void;onRetry:()=>void}){
 const [value,setValue]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{setValue('');setNotice('')},[id]);
 const mission:SatsMission={id,game:'shape_secrets',domain:'M',reference:'3M7',difficulty:1,prompt:'',visual:{type:'equation',lines:[]},fields:[{label:'Answer (cm)',answer:'0'}],explanation:'',marks:1};
 const blocked=paused||phase!=='playing',showFeedback=phase==='correct'||phase==='error';
 return <form className="secret-answer" data-feedback={showFeedback} onSubmit={e=>{e.preventDefault();if(blocked)return;const entry=validateAnswerEntry(value,{kind:'number',expectedUnit:'cm'});if(entry.ok===false){setNotice('Enter a number.');return;}setNotice('');onSubmit(entry.value)}} aria-label="Restore the geometry seal">
  <fieldset className="secret-answer-body" disabled={paused}><fieldset className="secret-inputs" disabled={blocked}><SatsAnswerFields mission={mission} values={[value]} inlinePad compactPad onChange={text=>{setValue(text);setNotice('')}}/></fieldset><button type="submit" disabled={blocked} className="secret-submit" aria-label="Restore seal" data-button-skin="none"><ArtworkFrame name="buttons/paper_gold_v3" corner={.13} fit="height"/><span>Restore</span></button><div className="secret-result"><p className="secret-feedback" role={notice?'alert':'status'} aria-live="polite">{notice||feedback}</p>{phase==='error'&&<button type="button" className="secret-retry" data-button-skin="none" onClick={()=>{setNotice('');onRetry()}}><ArtworkFrame name="buttons/scale_key_v4" corner={.13} fit="height"/><span>Try again</span></button>}</div></fieldset>
 </form>;
}
