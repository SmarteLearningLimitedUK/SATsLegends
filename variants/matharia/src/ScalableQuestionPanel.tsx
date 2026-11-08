import React from 'react';
import {asset} from './assets';
import QuestionDock from './QuestionDock';
import ArtworkFrame from './ArtworkFrame';
import {useLearningPolicy} from '../../../src/systems/learning/learningSupport';
function Jewel({className}:{className:string}){return <img className={className} src={asset('frames','sapphire_crest_v3')} alt="" draggable={false}/>;}
export function QuestionArrival({identity}:{identity:string|number}){
 const {reducedMovement,reducedEffects}=useLearningPolicy();
 return reducedMovement||reducedEffects?null:<span key={identity} className="scalable-question-arrival" aria-hidden="true"/>;
}

export function QuestionCardFrame(){
 return <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>;
}

export default function ScalableQuestionPanel({children,heading,longText,story,roundKey}:{children:React.ReactNode;heading?:React.ReactNode;longText?:boolean;story?:string;roundKey?:string|number}){
 const long=longText??(typeof children==='string'&&children.length>85);
 const identity=roundKey??(typeof children==='string'?children:undefined);
 return <QuestionDock><section className="concept-question-panel scalable-question-panel" data-concept-panel data-game-question="true" data-question-long={long||undefined} aria-label="Question">
  <QuestionCardFrame/>
  <Jewel className="question-jewel question-jewel--top"/><Jewel className="question-jewel question-jewel--bottom"/>
  {identity!==undefined&&<QuestionArrival identity={identity}/>}
  {heading}
  <div className="scalable-question-copy" data-question-copy aria-live={identity!==undefined?'polite':undefined} aria-atomic={identity!==undefined||undefined}>
   {story?<div className="scalable-question-stack"><div>{children}</div><small className="scalable-question-story">{story}</small></div>:children}
  </div>
 </section></QuestionDock>;
}
