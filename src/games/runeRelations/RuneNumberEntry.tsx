import {useEffect,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import SatsAnswerFields from '../../components/game-ui/SatsAnswerFields';
import {useDialogFocus} from '../../components/game-ui/useDialogFocus';
import {validateAnswerEntry} from '../../systems/content/answerEntry';
import type {SatsMission} from '../../systems/content/satsAdventure';
export default function RuneNumberEntry({label,value,onKeep,onClose,suspended=false}:{label:string;value:string;onKeep:(text:string)=>void;onClose:()=>void;suspended?:boolean}){
 const [draft,setDraft]=useState(value),[notice,setNotice]=useState('');
 useEffect(()=>{setDraft(value);setNotice('')},[label,value]);
 const focus=useDialogFocus(!suspended,onClose);
 const mission:SatsMission={id:'rune-entry',game:'rune_relations',reference:'6A1',domain:'A',difficulty:1,prompt:'',visual:{type:'equation',lines:[]},fields:[{label,answer:'0'}],marks:1,explanation:''};
 if(suspended)return null;
 return createPortal(<div className="sats-answer-pad-scrim"><form ref={focus as RefObject<HTMLFormElement>} className="sats-answer-pad sats-independent-pad legend-dialog rune-number-entry" role="dialog" aria-modal="true" aria-label="Rune number pad" onSubmit={event=>{event.preventDefault();if(draft.trim().length>8){setNotice('Use at most eight characters for this value.');return;}const result=validateAnswerEntry(draft,{kind:'number'});if(result.ok===false){setNotice(result.message);return;}onKeep(result.value);}}>
  <SatsAnswerFields mission={mission} values={[draft]} inlinePad compactPad onChange={text=>{setDraft(text);setNotice('')}}/>
  {notice&&<p role="alert">{notice}</p>}<div className="sats-independent-actions"><button type="submit" className="ui-button-primary">Keep value</button><button type="button" className="ui-button-secondary" onClick={onClose}>Back to runes</button></div>
 </form></div>,document.body);
}
