import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useRef} from 'react';
import {VisionSceneContext} from '../VisionScene';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';
import {pyramidCellValue,type PyramidNumbers,type PyramidStep} from '../../../../src/games/pyramidPuzzle';
import stone from '../../reference/pyramid-stone-v4.json';
interface Props{round:PyramidNumbers;index:number;correct:number;attempts:number;steps:PyramidStep[];step:number;completed:number;selected:number|null;locked:boolean;glow:boolean;feedback:string;tone:string;paused:boolean;intro:React.ReactNode;onAnswer:(n:number)=>void;}
export default function PyramidScene(p:Props){
 const scene=useContext(VisionSceneContext),paused=p.paused||scene.paused,current=p.steps[p.step],value=(cell:'left'|'right'|'top')=>pyramidCellValue(p.round,p.steps,p.completed,cell);
 useSceneContact(`${p.round.id}:${p.completed}`,p.completed>0,'stone',120,paused);
 const heading=useRef<HTMLHeadingElement>(null),mounted=useRef(false);
 useEffect(()=>{if(mounted.current)heading.current?.focus({preventScroll:true});else mounted.current=true},[p.step,p.index]);
 const rows=[[{value:value('top'),cell:'top',kind:'top'}],[{value:value('left'),cell:'left',kind:'middle'},{value:value('right'),cell:'right',kind:'middle'}],p.round.base.map((value,index)=>({value,cell:`base-${index}`,kind:'base'}))];
 usePresentationHint('Restore the two middle stones, then the top stone.\nEach stone is the sum of the two directly below it.\nChoose one of four answers at each step.');
 return <section className="pyramid-scene" data-pyramid-game data-pyramid-round={p.round.id} data-pyramid-index={p.index} data-pyramid-correct={p.correct} data-pyramid-attempts={p.attempts} data-pyramid-step={p.step} data-pyramid-completed={p.completed} data-pyramid-state={p.tone} data-pyramid-paused={paused} data-pyramid-restored={p.glow}>
  {p.intro}
  <section className="pyramid-question" data-concept-panel data-concept-question="true" data-game-question="true" aria-label="Question">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><img className="question-jewel question-jewel--top" src={asset('frames','sapphire_crest_v3')} alt=""/>
   <div className="scalable-question-copy" data-question-copy>
    <span className="pyramid-question-progress">Pyramid {p.index+1} of 6 <span>Step {p.step+1} of {p.steps.length}</span></span>
    <h2 ref={heading} tabIndex={-1}>Restore the {current.label}.</h2>
    <p>Each stone is the sum of the two below.</p>
   </div>
  </section>
  <div className="pyramid-board-space">
   <div className="pyramid-physical-board" style={{'--pyramid-stone-ratio':String(stone.dimensions[0]/stone.dimensions[1])} as React.CSSProperties} data-pyramid-puzzle role="img" aria-label={`Number pyramid. Bottom: ${p.round.base.join(', ')}. Middle: ${value('left')}, ${value('right')}. Top: ${value('top')}. Restore the ${current.label}.`}>
    {rows.map((row,i)=><div className="pyramid-stone-row" key={i}>{row.map(item=><div className="pyramid-stone" key={item.cell} style={{aspectRatio:`${stone.dimensions[0]}/${stone.dimensions[1]}`}} data-active={item.cell===current.cell} data-solved={item.kind!=='base'&&item.value!=='?'}>
     <img src={asset('props','pyramid_stone_v4')} alt="" draggable={false}/><span data-pyramid-value={item.kind} data-pyramid-cell={item.cell}>{item.value}</span>
    </div>)}</div>)}
   </div>
  </div>
  <section className="pyramid-answer-panel" aria-label="Answer the highlighted stone">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <div className="pyramid-live-choices" role="group" aria-label={`Choose the ${current.label}`}>{current.options.map(option=><button key={`${p.round.id}:${current.cell}:${option}`} type="button" data-button-skin="none" data-pyramid-choice={option} data-selected={p.selected===option} data-tone={p.selected===option?p.tone:undefined} disabled={p.locked||paused} onClick={()=>p.onAnswer(option)}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/><span>{option}</span></button>)}</div>
   <div className="pyramid-status" role="status" aria-live="polite" aria-atomic="true"><span className="pyramid-live-feedback">{roundFeedback(p.feedback)||'Choose the value for the glowing stone.'}</span></div>
  </section>
 </section>;
}
