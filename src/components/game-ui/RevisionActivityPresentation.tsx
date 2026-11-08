import type {ReactNode} from 'react';
import SceneEnvironment from '../SceneEnvironment';
import {GameQuestionCard} from './GameUiKit';
import './revision-activities.css';
import calendarBackground from '../../assets/graph-grabber/matharia/bg_acropolis_landscape.png';
export interface RevisionActivityPresentationProps {id:string;title:string;prompt:string;hint:string;board:ReactNode;controls:ReactNode;intro:ReactNode;paused:boolean;round:number;score:number;total?:number;time?:number;hearts?:number;}
/** The root app uses its existing question/panel components; Matharia supplies its existing GraphScene regions. */
export default function RevisionActivityPresentation(p:RevisionActivityPresentationProps){
 return <section className="revision-activity-root" data-revision-activity={p.id}>
  <SceneEnvironment src={calendarBackground}/>{p.intro}
  <GameQuestionCard title={p.title}>{p.prompt}</GameQuestionCard>
  <div className="revision-activity-workspace"><div className="ui-panel revision-activity-board">{p.board}</div><div className="ui-panel revision-activity-controls">{p.controls}</div></div>
 </section>;
}
