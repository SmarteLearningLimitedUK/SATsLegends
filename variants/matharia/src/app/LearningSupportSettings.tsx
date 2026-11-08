import {useState} from 'react';
import {SUPPORT_OPTIONS,useLearningSupport,saveLearningSupport,type SupportOption} from '../../../../src/systems/learning/learningSupport';
import {personalisationEnabled,setPersonalisation,resetLearningState} from '../../../../src/systems/learning/learningStorage';
export default function LearningSupportSettings(){
 const config=useLearningSupport(),[personalised,setPersonalised]=useState(personalisationEnabled),[notice,setNotice]=useState('');
 return <details className="native-form"><summary>Learning Support and revision preferences</summary>
  <p className="native-small">Optional adaptations for any learner. No diagnosis is needed. These choices stay on this device.</p>
  <label className="native-consent"><input type="checkbox" checked={config.enabled} onChange={e=>saveLearningSupport({...config,enabled:e.target.checked})}/>Learning Support {config.enabled?'On':'Off'}</label>
  <fieldset disabled={!config.enabled}><legend>Saved adaptations</legend>{(Object.entries(SUPPORT_OPTIONS) as [SupportOption,string][]).map(([key,label])=><label className="native-consent" key={key}><input type="checkbox" checked={config.selected[key]} onChange={e=>saveLearningSupport({...config,selected:{...config.selected,[key]:e.target.checked}})}/>{label}</label>)}</fieldset>
  <p className="native-small">Turning Learning Support off keeps these selections for next time. Core quizzes have no time limit, and working notes are not marked.</p>
  <label className="native-consent"><input type="checkbox" checked={personalised} onChange={e=>{setPersonalised(e.target.checked);setPersonalisation(e.target.checked);}}/>Personalised revision: save question-level learning evidence on this device</label>
  <p className="native-small">Off by default. No answers, working, audio or diagnosis are saved in the revision evidence. Question evidence is kept for up to 90 days, with earlier secure/retained milestone dates kept for up to one year. Turning this off stops new evidence; use the reset below to erase it.</p>
  <button type="button" className="native-account-link" onClick={()=>{resetLearningState();setNotice('Revision evidence cleared. Stars and game progress are retained.');}}>Reset revision evidence</button>
  {notice&&<p role="status" className="native-small">{notice}</p>}
 </details>;
}
