import React from 'react';
import QuestionDock from './QuestionDock';
import {QuestionCardFrame} from './ScalableQuestionPanel';
/** The illustrated frame and the padded live-copy region have independent bounds. */
export default function ConceptQuestionPanel({children,decoration}:{children:React.ReactNode;decoration?:React.ReactNode}){
 return <QuestionDock><section className="concept-question-panel" data-concept-panel data-game-question="true" data-question-long={typeof children==='string'&&children.length>85||undefined} aria-label="Question">
  <QuestionCardFrame/>
  {decoration}
  <div className="concept-question-copy" data-question-copy>{children}</div>
 </section></QuestionDock>;
}
