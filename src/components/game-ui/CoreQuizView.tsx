import type React from 'react';
import type {SatsMission} from '../../systems/content/satsAdventure';
import GameplaySceneBackdrop from '../GameplaySceneBackdrop';
import {GameQuestionCard} from './GameUiKit';
import CorePaperFrame from './CorePaperFrame';
import SatsTapWorkpad from './SatsTapWorkpad';
import './core-paper-presentation.css';
import './sats-quiz.css';
export interface CoreQuizViewProps {
 question:SatsMission;
 gameType:string;number:number;construction:boolean;denseModel:boolean;fieldCount:number;modelType:string;
 phase:string;mission:string;index:number;marks:number;total:number;completed:number;prompt:string;reading:string;paused:boolean;
 intro:React.ReactNode;review:React.ReactNode;model:React.ReactNode;fields:React.ReactNode;overlays:React.ReactNode;
 notice:string;work:string;onWork:(v:string)=>void;onSubmit:(e:React.FormEvent)=>void;onLater:()=>void;onNav:()=>void;onFinish:()=>void;
}
export default function CoreQuizView(p:CoreQuizViewProps){return <div className={`sats-mock${p.construction?' sats-mock--construction':''}`} data-core-quiz data-sats-paper={p.number} data-sats-phase={p.phase} data-sats-mission={p.mission} data-sats-untimed="true" data-question-reading={p.reading}>
 <GameplaySceneBackdrop gameType={p.gameType}/>{p.intro}{p.phase==='review'?p.review:<div className="sats-mock-content">
 <GameQuestionCard title={`Question ${p.index+1} of ${p.total}`} className="sats-mission-strip" style={{position:'relative',top:0,transform:'none'}}>{p.prompt}</GameQuestionCard>
 <div className="sats-playfield" data-sats-playfield><div className="sats-charge" role="status">{p.completed}/{p.total} answered</div>
 <div className="sats-model"><CorePaperFrame paper={p.number} title="Question" charged={0}/><div className="sats-model-canvas">{p.model}</div></div>
 <div className="sats-mission-tools"><button type="button" onClick={p.onNav}>Question list</button><button type="button" onClick={p.onFinish}>Finish quiz</button></div></div>
 <form className="sats-response answer-choice-surface" onSubmit={p.onSubmit}><fieldset disabled={p.paused||p.phase!=='play'}>{p.fields}<SatsTapWorkpad value={p.work} onChange={p.onWork}/><div className="sats-response-actions"><button type="button" className="ui-button-secondary" onClick={p.onLater}>Later</button><button type="submit" className="ui-button-primary">Save &amp; continue</button></div><span role="status">{p.notice}</span></fieldset></form>{p.overlays}</div>}
 </div>;}
