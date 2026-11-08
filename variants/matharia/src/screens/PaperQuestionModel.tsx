import type {ReactNode} from 'react';
import type {SatsMission} from '../../../../src/systems/content/satsAdventure';
import {asset} from '../assets';
import {paperQuestionScene} from './paperQuestionScenes';
import './paper-question-scenes.css';

/** A question-specific still life, with the original live mathematical data. */
export default function PaperQuestionModel({question,children}:{question:SatsMission;children:ReactNode}) {
 const scene=paperQuestionScene(question);
 if(!scene)return <>{children}</>;
 const ratio=question.visual.type==='ratio'?question.visual:null;
 if(ratio)return <div className="paper-context-ratio" data-paper-question-scene={scene.kind} role="group" aria-label={scene.label}>
  {ratio.labels.map((label,index)=>{
   const object=scene.objects[index%scene.objects.length];
   return <div className="paper-context-part" key={label}>
    <img src={asset(object.group,object.name)} alt="" aria-hidden="true" draggable={false}/>
    <span>{label}: <strong>{ratio.parts[index]}</strong></span>
   </div>;
  })}
 </div>;
 const object=scene.objects[0];
 return <div className="paper-context-model" data-paper-question-scene={scene.kind} data-context-lines={question.visual.type==='equation'?question.visual.lines.length:undefined}>
  <img className="paper-context-object" src={asset(object.group,object.name)} alt="" aria-hidden="true" draggable={false}/>
  <div className="paper-context-data"><span className="paper-context-label">{scene.label}</span>{children}</div>
 </div>;
}
