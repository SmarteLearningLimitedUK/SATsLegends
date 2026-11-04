import React,{useEffect,useRef,useState}from'react';
import{ArrowLeft}from'lucide-react';
import ArtworkFrame from'./ArtworkFrame';
import ThoughtBalloon from'./ThoughtBalloon';
interface Props{words:string[];thoughts:string[];selected:string[];balanced:string|null;finished:boolean;onWord:(word:string)=>void;onThought:(thought:string)=>void;onRelease:()=>void;}
export default function ThoughtRelease(p:Props){
 const[step,setStep]=useState<1|2|3>(1),ready=p.selected.length>0&&Boolean(p.balanced),heading=useRef<HTMLHeadingElement>(null),mounted=useRef(false);
 useEffect(()=>{if(mounted.current)heading.current?.focus({preventScroll:true});else mounted.current=true},[step]);
 return <div className="thought-release" data-thought-stage={step} data-thought-ready={ready} data-thought-finished={p.finished}>
  <div className="thought-step-caption">{step===1?<span>1 of 3</span>:<button className="thought-step-back" type="button" data-button-skin="none" disabled={p.finished} aria-label={step===2?'Change feelings':'Change thought'} onClick={()=>setStep(step===2?1:2)}><ArrowLeft size={20} aria-hidden="true"/></button>}<h2 ref={heading} tabIndex={-1}>{step===1?'Name a feeling':step===2?'What else could be true?':'Release your balloon'}</h2></div>
  <div className="thought-balloon-space"><ThoughtBalloon selected={p.selected} balanced={p.balanced} finished={p.finished}/></div>
  <section className="thought-decision" aria-label={step===1?'Choose your feelings':step===2?'Choose a balanced thought':'Ready to release'}>
   {step===1?<>
    <p className="thought-prompt">Choose one or two feeling words.</p>
    <div className="feeling-words" role="group" aria-label="Feeling words">{p.words.map(word=><button key={word} type="button" data-button-skin="none" className="feeling-word" aria-pressed={p.selected.includes(word)} disabled={p.finished} onClick={()=>p.onWord(word)}>{word}</button>)}</div>
    <button className="thought-primary" type="button" data-button-skin="none" data-thought-next disabled={!p.selected.length||p.finished} onClick={()=>setStep(2)}><ArtworkFrame name="buttons/paper_gold_v3" corner={.1} fit="height"/>Choose a fairer thought</button>
   </>:step===2?<>
    <p className="thought-challenge">“One hard question means I cannot do this.”</p>
    <div className="thought-reframe-options" role="group" aria-label="Balanced thoughts">{p.thoughts.map(thought=><button type="button" key={thought} className="thought-reframe-option" data-thought-option data-button-skin="none" aria-pressed={p.balanced===thought} disabled={p.finished} onClick={()=>{p.onThought(thought);setStep(3)}}>{thought}</button>)}</div>
   </>:<>
    <p className="thought-chosen">{p.balanced}</p>
    <button type="button" className="thought-primary" data-button-skin="none" data-thought-release disabled={!ready||p.finished} onClick={p.onRelease}><ArtworkFrame name="buttons/paper_gold_v3" corner={.1} fit="height"/>Release balloon</button>
   </>}
  </section>
 </div>;
}
