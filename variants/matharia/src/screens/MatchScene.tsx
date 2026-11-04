import React,{useLayoutEffect,useState} from 'react';
import {Hourglass} from 'lucide-react';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';

export interface MatchSceneProps {
 children:React.ReactNode; XP:number; completionProgress:number; timeLeft:number;
 levelName:string; questionText:React.ReactNode; heroGuidance?:string|null;
 goalLabel?:string;
 fireActive?:boolean; firePulse?:number; variantGameType:'fraction_match'|'cloud_collapse';
 useSharedTopHud?:boolean; onBack:()=>void;
}
/** Presentation only: every number, tile and event handler comes from FractionMatchGame. */
export function MatchScene({children,XP,timeLeft,questionText,heroGuidance,fireActive,completionProgress,goalLabel}:MatchSceneProps){
 const breakAt=typeof questionText==='string'&&questionText.startsWith('Restore the board:')?questionText.indexOf(' values.'):-1;
 const [copyNode,setCopyNode]=useState<HTMLDivElement|null>(null);
 const questionKey=typeof questionText==='string'?questionText:'feedback';
 // Enlarged text gets more of the reserved guide band; the board never moves.
 useLayoutEffect(()=>{
  const stage=copyNode?.closest<HTMLElement>('.concept-stage'),panel=copyNode?.closest<HTMLElement>('.scalable-question-panel');
  const hero=stage?.querySelector<HTMLElement>('.concept-hero');
  if(!stage||!panel||!hero)return;
  let active=true,pending=0,lastKey='';
  const fit=()=>{
   if(!active)return;
   const copy=copyNode!.parentElement!,hint=copy.querySelector<HTMLElement>('.match-concept-guidance');
   const key=`${stage.clientWidth}:${stage.clientHeight}:${getComputedStyle(copyNode!).fontSize}:${hint?getComputedStyle(hint).fontSize:''}`;
   if(key!==lastKey){stage.dataset.matchGuideLayout='default';lastKey=key;}
   const layouts=['default','wide','full'];
   for(const layout of layouts.slice(Math.max(0,layouts.indexOf(stage.dataset.matchGuideLayout??'default')))){
    stage.dataset.matchGuideLayout=layout;
    const style=getComputedStyle(copy);
    const textHeight=(node:HTMLElement)=>{const range=document.createRange();range.selectNodeContents(node);return Math.max(node.scrollHeight,range.getBoundingClientRect().height);};
    const height=Math.ceil(Math.max(80,textHeight(copyNode!)+(hint?textHeight(hint):0)+(hint?parseFloat(style.rowGap)||0:0)+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)));
    panel.style.height=`${height}px`;
    if(height<=hero.getBoundingClientRect().height-18)break;
   }
  };
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(()=>{pending=0;fit();});};
  const observer=new ResizeObserver(schedule);observer.observe(stage);observer.observe(copyNode!);
  const hint=copyNode!.parentElement?.querySelector('.match-concept-guidance');if(hint)observer.observe(hint);
  const mutations=new MutationObserver(fit);mutations.observe(copyNode!,{attributes:true,attributeFilter:['style','class']});if(hint)mutations.observe(hint,{attributes:true,attributeFilter:['style','class']});
  window.addEventListener('resize',schedule);void document.fonts.ready.then(()=>{lastKey='';schedule();});fit();
  return()=>{active=false;observer.disconnect();mutations.disconnect();cancelAnimationFrame(pending);window.removeEventListener('resize',schedule);delete stage.dataset.matchGuideLayout;panel.style.removeProperty('height');};
 },[copyNode,heroGuidance,questionKey]);
 return <section className="match-concept-scene" data-match-main>
  <ScalableQuestionPanel><div ref={setCopyNode} className="match-question-main">{typeof questionText==='string'&&breakAt>=0?<>
   {questionText.slice(0,breakAt)}<br/>{questionText.slice(breakAt+1)}
  </>:questionText}</div>
   {heroGuidance&&typeof questionText==='string'&&<p className="match-concept-guidance" role="status">{heroGuidance}</p>}
  </ScalableQuestionPanel>
  <div className="match-concept-status" data-match-status aria-label="Round status">
   <ArtworkFrame name="frames/question_scalable_v2" corner={.06}/>
   <span className="match-round-time" role="timer" aria-label={`Time remaining: ${timeLeft} seconds`}><Hourglass aria-hidden="true"/>Time {timeLeft}s</span>
   <span className="match-score">Score {XP}</span>
   <div className="match-goal"><span>{goalLabel??`${XP} points`}</span><progress value={completionProgress} max={100} aria-label="Board completion" aria-valuetext={`${XP} points; ${goalLabel??''}`}/></div>
  </div>
  <div className="match-concept-board-space" data-match-board-space data-fire-active={Boolean(fireActive)}>
   {children}
  </div>
 </section>;
}
const colours={blue:'sapphire',red:'ruby',purple:'amethyst',yellow:'amber',green:'emerald'} as const;
/** Coloured tiers keep their semantic colour; the colourless challenge stays colourless. */
export function MatchGem({type,label,isSelected=false,colourless=false,onClick,disabled=false}:{
 type:keyof typeof colours;label:string;size?:number;isSelected?:boolean;colourless?:boolean;onClick?:()=>void;disabled?:boolean;
}){
 return <button type="button" className="match-concept-gem" data-button-skin="none"
  data-match-tile-appearance={colourless?'colourless':'coloured'}
  aria-label={`Gem ${label}`} aria-pressed={isSelected} onClick={onClick} disabled={disabled}>
  <img src={asset('gameplay',`match_gem_${colourless?'neutral':colours[type]}`)} alt="" draggable={false}/>
  <span>{label}</span>
 </button>;
}
