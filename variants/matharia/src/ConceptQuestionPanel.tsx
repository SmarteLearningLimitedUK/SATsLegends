import React from 'react';
import QuestionDock from './QuestionDock';
import {asset} from './assets';
/** The illustrated frame and the padded live-copy region have independent bounds. */
export default function ConceptQuestionPanel({children,frame='concept_question_v3',decoration}:{children:React.ReactNode;frame?:string;decoration?:React.ReactNode}){
 return <QuestionDock><section className="concept-question-panel" data-concept-panel data-game-question="true" data-question-long={typeof children==='string'&&children.length>85||undefined} aria-label="Question">
  <img className="concept-question-frame" src={asset('frames',frame)} alt="" aria-hidden="true" draggable={false}/>
  {decoration}
  <div className="concept-question-copy" data-question-copy>{children}</div>
 </section></QuestionDock>;
}
