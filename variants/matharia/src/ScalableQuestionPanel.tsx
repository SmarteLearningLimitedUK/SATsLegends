import React from 'react';
import {asset} from './assets';
import QuestionDock from './QuestionDock';
import ArtworkFrame from './ArtworkFrame';
function Jewel({className}:{className:string}){return <img className={className} src={asset('frames','sapphire_crest_v3')} alt="" draggable={false}/>;}

export default function ScalableQuestionPanel({children,heading,longText,frame='frames/question_scalable_v2',corner=.06,surface}:{children:React.ReactNode;heading?:React.ReactNode;longText?:boolean;frame?:string;corner?:number;surface?:string}){
 const long=longText??(typeof children==='string'&&children.length>85);
 return <QuestionDock><section className="concept-question-panel scalable-question-panel" data-concept-panel data-game-question="true" data-question-long={long||undefined} aria-label="Question"><ArtworkFrame name={frame} corner={corner} surface={surface}/><Jewel className="question-jewel question-jewel--top"/><Jewel className="question-jewel question-jewel--bottom"/>{heading}<div className="scalable-question-copy" data-question-copy>{children}</div></section></QuestionDock>;
}
