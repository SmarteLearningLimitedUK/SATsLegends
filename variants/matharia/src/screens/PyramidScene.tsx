import {adventureTask} from '../../../../src/systems/content/adventureStory';
import IndependentAnswer,{answerAsNumber,matchingAnswerIndex,canonicalAnswer} from '../../../../src/components/game-ui/IndependentAnswer';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useEffect,useRef} from 'react';
import {VisionSceneContext} from '../VisionScene';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import {usePresentationHint} from '../PresentationHint';
import {useSceneContact} from '../useSceneContact';
import {pyramidCellValue,type PyramidNumbers,type PyramidStep,type PyramidCell} from '../../../../src/games/pyramidPuzzle';
import stone from '../../reference/pyramid-stone-v4.json';
interface Props{round:PyramidNumbers;index:number;correct:number;attempts:number;steps:PyramidStep[];step:number;completed:number;selected:number|null;locked:boolean;glow:boolean;feedback:string;tone:string;paused:boolean;intro:React.ReactNode;onAnswer:(n:number)=>void;}
export default function PyramidScene(p:Props){
 const scene=useContext(VisionSceneContext),paused=p.paused||scene.paused,current=p.steps[p.step],value=(cell:PyramidCell)=>pyramidCellValue(p.round,p.steps,p.completed,cell);
 useSceneContact(`${p.round.id}:${p.completed}`,p.completed>0,'stone',120,paused);
 const heading=useRef<HTMLHeadingElement>(null),mounted=useRef(false);
 useEffect(()=>{if(mounted.current)heading.current?.focus({preventScroll:true});else mounted.current=true},[p.step,p.index]);
 const rows=[[{value:value('top'),cell:'top',kind:'top'}],[{value:value('left'),cell:'left',kind:'middle'},{value:value('right'),cell:'right',kind:'middle'}],p.round.base.map((_,index)=>({value:value(`base-${index}` as PyramidCell),cell:`base-${index}`,kind:'base'}))];
 usePresentationHint('Restore each highlighted stone, then the top.\nEach stone is the sum of the two directly below it. Subtract to find a missing lower stone.\nEnter a value with the number pad at each step.');
 return <section className="pyramid-scene" data-pyramid-game data-pyramid-round={p.round.id} data-pyramid-index={p.index} data-pyramid-correct={p.correct} data-pyramid-attempts={p.attempts} data-pyramid-step={p.step} data-pyramid-completed={p.completed} data-pyramid-state={p.tone} data-pyramid-paused={paused} data-pyramid-restored={p.glow}>
  {p.intro}
  <section className="pyramid-question" data-concept-panel data-concept-question="true" data-game-question="true" aria-label="Question">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><img className="question-jewel question-jewel--top" src={asset('frames','sapphire_crest_v3')} alt=""/>
   <div className="scalable-question-copy" data-question-copy>
    <span className="pyramid-question-progress">Pyramid {p.index+1} of 6 <span>Step {p.step+1} of {p.steps.length}</span></span>
    <h2 ref={heading} tabIndex={-1}>Restore the {current.label}.</h2>
    <p>{adventureTask('problem_pyramid',p.index*3+p.step)}</p>
   </div>
  </section>
  <div className="pyramid-board-space">
   <div className="pyramid-physical-board" style={{'--pyramid-stone-ratio':String(stone.dimensions[0]/stone.dimensions[1])} as React.CSSProperties} data-pyramid-puzzle role="img" aria-label={`Number pyramid. Bottom: ${[value('base-0'),value('base-1'),value('base-2')].join(', ')}. Middle: ${value('left')}, ${value('right')}. Top: ${value('top')}. Restore the ${current.label}.`}>
    {rows.map((row,i)=><div className="pyramid-stone-row" key={i}>{row.map(item=><div className="pyramid-stone" key={item.cell} style={{aspectRatio:`${stone.dimensions[0]}/${stone.dimensions[1]}`}} data-active={item.cell===current.cell} data-solved={item.kind!=='base'&&item.value!=='?'}>
     <img src={asset('props','pyramid_stone_v4')} alt="" draggable={false}/><span data-pyramid-value={item.kind} data-pyramid-cell={item.cell}>{item.value}</span>
    </div>)}</div>)}
   </div>
  </div>
  <section className="pyramid-answer-panel" aria-label="Answer the highlighted stone">
   <ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>
   <div className="pyramid-live-choices" role="group" aria-label={`Choose the ${current.label}`}><IndependentAnswer questionId={`${p.round.id}:${current.cell}`} fingerprint={JSON.stringify([p.round,current.cell])} gameKey="problem_pyramid" skillId="algebra.missing-sum" curriculumRefs={["6A1"]} disabled={p.locked||paused} onSubmit={value=>p.onAnswer(answerAsNumber(value))}>{open=><button type="button" data-button-skin="none" disabled={p.locked||paused} onClick={open}><ArtworkFrame name="buttons/sapphire_answer_v3" corner={.13}/><span>Enter answer</span></button>}</IndependentAnswer></div>
   <div className="pyramid-status" role="status" aria-live="polite" aria-atomic="true"><span className="pyramid-live-feedback">{roundFeedback(p.feedback)||'Choose the value for the glowing stone.'}</span></div>
  </section>
 </section>;
}
