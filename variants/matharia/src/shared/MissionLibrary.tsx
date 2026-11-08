import {LEVEL_NAMES as SHATTERED_LEVEL_NAMES} from '../../../../src/systems/content/shatteredWhole/questions';
import React,{useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,ChevronLeft,ChevronRight,GraduationCap,Leaf,Lock,Play,Snowflake,Sparkles,UserRound} from 'lucide-react';

import type {IslandData,LevelData} from '../../../../src/types';
import {getLevelGroupKey} from '../../../../src/utils/gameNames';
import {GAME_DIFFICULTY_LABELS,getGameDifficulty} from '../../../../src/systems/content/gameDifficulty';
import {asset,islandArtworkFor} from '../assets';
import {islandSelectionBackgroundFor,islandSelectionThumbnailFor as selectionThumbnailFor} from '../selectionArtwork';
import ArtworkFrame from '../ArtworkFrame';
import {AdventureControlFrame,AdventureHero} from './AdventureArtwork';
import GemArtwork from './GemArtwork';
import {useNativeAccess} from '../app/NativeAccess';
import {canAccessLevel} from '../app/accessPolicy';
import {nextMissionInGroup,useMissionBoardNavigation} from './missionBoardNavigation';
import {TESTFLIGHT_ALL_GAMES} from '../testingFlags';
import './mission-library.css';
import './mission-reference.css';
import './mission-island-header.css';
import './mission-concept.css';
import './mission-world-art.css';

interface Row {level:LevelData;stars:number;isCompleted:boolean;isUnlocked:boolean;isNextPlayable:boolean;lockReason?:string}
interface Group {id:string;name:string;levels:Row[];totalStars:number;completedCount:number;hasNextPlayable:boolean}
const cardName=(group:Group)=>group.id==='time_keeper_cove'?'Chrono Dash':group.name;
// Optional syllable breaks keep long captions readable without shrinking the text.
const captionBreaks:Record<string,string>={Rounding:'Round\u00ading',Transformation:'Transfor\u00admation',Coordinates:'Coordi\u00adnates',Conversion:'Conver\u00adsion',Perimeter:'Peri\u00admeter',Multiplication:'Multipli\u00adcation',Remainder:'Remain\u00adder',Reasoning:'Reason\u00ading',Arithmetic:'Arith\u00admetic'};
const cardCaption=(group:Group)=>cardName(group).replace(/\b(Rounding|Transformation|Coordinates|Conversion|Perimeter|Multiplication|Remainder|Reasoning|Arithmetic)\b/g,word=>captionBreaks[word]);
interface Props {
 island:IslandData;avatarId:string;groups:Group[];next?:Row;earned:number;total:number;
 onBack:()=>void;onSelectLevel:(level:LevelData)=>void;
 levelLabel:(level:LevelData,rows:Row[])=>string;mockKeys:Set<string>;
 wellbeingTitle?:string;wellbeingSubtitle?:string;wellbeingType?:string;onOpenWellbeing?:()=>void;
}
function Tokens({earned=0}:{earned?:number}) {
 return <span className="mission-gems" aria-label={`${earned} of 3 brainpower tokens`}>{[0,1,2].map(i=><span key={i} data-earned={i<earned}><GemArtwork/></span>)}</span>;
}
function levelDetail(row:Row,isMock:boolean) {
 if(!row.isUnlocked)return row.lockReason;
 if(row.level.isPractice)return 'Warm up';
 if(row.isCompleted)return 'Complete';
 if(row.level.blueprintKey==='shattered_whole')return SHATTERED_LEVEL_NAMES[getGameDifficulty(row.level)-1];
 if(isMock)return '30 questions · No time limit';
 return row.level.isBoss?'':GAME_DIFFICULTY_LABELS[getGameDifficulty(row.level)];
}
export default function MissionLibrary(p:Props) {
 const access=useNativeAccess();
 const freeRows=p.groups.flatMap(item=>item.levels).filter(row=>canAccessLevel(false,p.island.id,row.level));
 const freeNext=freeRows.find(row=>!row.isCompleted)??freeRows[0];
 const suggested=!access.fullAccess&&freeNext?getLevelGroupKey(freeNext.level):p.groups.find(item=>item.hasNextPlayable)?.id??p.groups[0]?.id??null;
 const navigation=useMissionBoardNavigation(p.island.id,p.groups,suggested);
 const group=p.groups.find(item=>item.id===navigation.expandedGameId)??p.groups[0];
 const gameGroups=[...p.groups];
 if(p.island.id===2){const sprint=gameGroups.findIndex(item=>item.id==='simplify_sprint'),match=gameGroups.findIndex(item=>item.id==='match3_equivalence');if(sprint>=0&&match>=0){const [item]=gameGroups.splice(sprint,1);gameGroups.splice(gameGroups.findIndex(entry=>entry.id==='match3_equivalence')+1,0,item)}}
 const [choice,setChoice]=useState<{gameId:string;levelId:number}|null>(null);
 const picker=useRef<HTMLDivElement>(null);
 const activeIndex=Math.max(0,gameGroups.findIndex(item=>item.id===group?.id));
 const visibleGames=gameGroups.length>=3?[-1,0,1].map(offset=>gameGroups[(activeIndex+offset+gameGroups.length)%gameGroups.length]):gameGroups;
 const islandArtwork=islandArtworkFor(p.island.id);
 const sceneKey=p.groups[0]?.id??'polygon_palace';
 const sceneBackground=islandSelectionBackgroundFor(p.island.id);
 const IslandEmblem=p.island.id===3?Snowflake:Sparkles;
 const focusedFree=freeRows.filter(row=>getLevelGroupKey(row.level)===group?.id);
 const next=access.fullAccess
  ?(navigation.hasSelection?nextMissionInGroup(group,navigation.levelId,p.next):p.next)
  :(navigation.hasSelection?focusedFree.find(row=>!row.isCompleted)??focusedFree[0]??freeNext:freeNext);
 const scored=group?.levels.filter(row=>!row.level.isPractice)??[];
 const recommended=scored.find(row=>row.level.id===next?.level.id)??scored.find(row=>row.isUnlocked&&!row.isCompleted)??scored[0];
 const selected=(choice&&choice.gameId===group?.id?scored.find(row=>row.level.id===choice.levelId):undefined)??recommended;
 const practice=group?.levels.find(row=>row.level.isPractice);
 const selectedLocked=selected?!canAccessLevel(access.fullAccess,p.island.id,selected.level):false;
 const practiceLocked=practice?!canAccessLevel(access.fullAccess,p.island.id,practice.level):false;
 const practiceUnavailable=Boolean(access.fullAccess&&practice&&!practice.isUnlocked);
 const paperGroup=Boolean(scored.length===1&&scored[0].level.isBoss&&p.mockKeys.has(scored[0].level.gameType??''));
 const maximum=scored.length*3,completed=scored.filter(row=>row.isCompleted).length;
 const selectLevel=(level:LevelData)=>{navigation.rememberLevel(level);p.onSelectLevel(level)};
 const selectGame=(id:string)=>{if(id===group?.id)return;if(navigation.scrollRef.current)navigation.scrollRef.current.scrollTop=0;navigation.onExpand(id);setChoice(null)};
 const swipe=useRef<number|null>(null);
 const moveGame=(direction:number)=>{if(gameGroups.length>1)selectGame(gameGroups[(activeIndex+direction+gameGroups.length)%gameGroups.length].id)};
 const label=selected?p.levelLabel(selected.level,group!.levels):'';
 useLayoutEffect(()=>{
  if(picker.current?.contains(document.activeElement))picker.current.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus({preventScroll:true});
 },[group?.id]);
 const onTabKey=(event:React.KeyboardEvent<HTMLButtonElement>,index:number)=>{
  const direction=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  if(!direction&&event.key!=='Home'&&event.key!=='End')return;
  event.preventDefault();const nextIndex=event.key==='Home'?0:event.key==='End'?gameGroups.length-1:(index+direction+gameGroups.length)%gameGroups.length;
  selectGame(gameGroups[nextIndex].id);
 };
 const practiceSection=practice&&<div className="mission-practice"><button type="button" data-button-skin="none" className="mission-practice-button" data-level-route={practice.level.id} data-free-practice={canAccessLevel(false,p.island.id,practice.level)?practice.level.id:undefined} disabled={practiceUnavailable} aria-label={`${practiceUnavailable?'Locked':practiceLocked?'Unlock':'Play'} ${group.name} Practice`} onClick={()=>practiceLocked?access.openUpgrade():selectLevel(practice.level)}>{practiceLocked||practiceUnavailable?<Lock size={17}/>:<GraduationCap size={18}/>}<span>{practiceUnavailable?'Locked':practiceLocked?'Unlock practice':'Practice'}</span></button></div>;
 const levelSection=group?<section className="mission-level-choice" aria-label={`Choose a ${group.name} ${paperGroup?'quiz':'level'}`}>
      <div className="mission-level-heading"><span>Choose a {paperGroup?'quiz':'level'}</span><small>{scored.length} {paperGroup?(scored.length===1?'quiz':'quizzes'):(scored.length===1?'mission':'levels')}</small></div>
      <div className="mission-level-steps">{scored.map(row=>{
       const levelLabel=p.levelLabel(row.level,group.levels),parts=levelLabel.match(/^(.+?)\s+(\d+)$/),needsUpgrade=!canAccessLevel(access.fullAccess,p.island.id,row.level),locked=!row.isUnlocked||needsUpgrade;
       return <button type="button" data-button-skin="none" key={row.level.id} className="mission-step" data-level-route={row.level.id} data-level-difficulty={getGameDifficulty(row.level)} data-level-blueprint={row.level.blueprintKey} data-locked={locked} data-complete={row.isCompleted} data-current={row.level.id===recommended?.level.id} aria-pressed={row.level.id===selected?.level.id} disabled={!needsUpgrade&&!row.isUnlocked} aria-label={`${needsUpgrade?'Unlock':!row.isUnlocked?'Locked':row.isCompleted?'Complete':GAME_DIFFICULTY_LABELS[getGameDifficulty(row.level)]} ${levelLabel}, ${row.stars} of 3 brainpower`} onClick={()=>needsUpgrade?access.openUpgrade():setChoice({gameId:group.id,levelId:row.level.id})}>
        <ArtworkFrame name="buttons/scale_key_v4" corner={.105} fit="height"/>
        <span className="mission-step-kind">{parts?.[1]??levelLabel}</span><strong><span>{parts?.[2]??<Play size={21}/>}</span>{locked?<Lock className="mission-step-state" aria-hidden="true"/>:row.isCompleted?<Check className="mission-step-state" aria-hidden="true"/>:null}</strong><Tokens earned={row.stars}/>
       </button>;
      })}</div>
     </section>:null;
 return <div className="adventure-board mission-library" data-adventure-board={p.island.id} data-island-concept data-active-mission-group={group?.id}>
  <img className="mission-selection-backdrop" src={sceneBackground} alt="" aria-hidden="true" draggable={false}/>
  <header className="mission-island-scene" aria-labelledby={`mission-island-title-${p.island.id}`}>
   <div className="mission-island-toolbar">
    <button type="button" data-button-skin="none" className="mission-icon-button" aria-label="Back to islands" onClick={p.onBack}><AdventureControlFrame/><ArrowLeft size={23}/></button>
    <div className="mission-island-tokens" role="group" aria-label={`${p.earned} of ${p.total} brainpower tokens`}><GemArtwork/><span><strong>{p.earned}<b> / {p.total}</b></strong></span></div>
    <button type="button" data-button-skin="none" className="mission-icon-button" aria-label="Parent account" onClick={access.openAccount}><AdventureControlFrame/><UserRound size={21}/></button>
   </div>
   <div className="mission-island-illustration"><img className="mission-island-artwork" src={islandArtwork} alt="" aria-hidden="true" draggable={false}/><div className="mission-concept-guide" aria-hidden="true"><img className="mission-guide-ground" data-ground={p.island.id===3?'ice':'stone'} src={asset('props',p.island.id===3?'angle_platform_v4':'prop_hero_plinth')} alt="" draggable={false}/><AdventureHero gameKey={sceneKey} avatarId={p.avatarId} pose="navigate"/></div></div>
   <div className="mission-island-identity"><h1 id={`mission-island-title-${p.island.id}`}>{p.island.name}</h1></div>
   <div className="mission-concept-divider" aria-hidden="true"><span/><IslandEmblem/><span/></div>
  </header>
  <section className="mission-game-picker" aria-label={paperGroup?'Core quizzes':'Island games'}>
   <div className="mission-picker-heading"><span className="mission-picker-heading-copy"><span>{paperGroup?'Choose a quiz':'Choose a game'}</span>{gameGroups.length>1&&<span className="mission-swipe-hint" id={`mission-swipe-hint-${p.island.id}`}><span aria-hidden="true">↔</span> Swipe to explore</span>}</span></div>
   <span className="sr-only mission-access-status">{access.fullAccess?(TESTFLIGHT_ALL_GAMES?'TestFlight access':'Full access'):freeRows.length?`${freeRows.length} free practices`:'Full access to unlock'}</span>
   <div className="mission-carousel">
   <button type="button" className="mission-carousel-arrow" data-button-skin="none" aria-label="Previous game" disabled={gameGroups.length<2} onClick={()=>moveGame(-1)}><ChevronLeft aria-hidden="true"/></button>
   <div className="mission-game-tabs" ref={picker} role="tablist" aria-label={`${p.island.name} ${paperGroup?'quizzes':'games'}`} aria-describedby={gameGroups.length>1?`mission-swipe-hint-${p.island.id}`:undefined} style={{touchAction:'pan-y'}} onTouchStart={e=>{swipe.current=e.touches[0]?.clientX??null}} onTouchEnd={e=>{const start=swipe.current;swipe.current=null;const end=e.changedTouches[0]?.clientX;if(start!==null&&end!==undefined&&Math.abs(end-start)>35)moveGame(end<start?1:-1)}} onTouchCancel={()=>{swipe.current=null}}>
    {visibleGames.map(item=>{
     const index=gameGroups.findIndex(entry=>entry.id===item.id);
     const count=item.levels.filter(row=>!row.level.isPractice).length,done=item.levels.filter(row=>!row.level.isPractice&&row.isCompleted).length;
     const free=item.levels.some(row=>row.level.isPractice&&canAccessLevel(false,p.island.id,row.level));
     return <button type="button" data-button-skin="none" role="tab" aria-label={item.name} id={`mission-tab-${p.island.id}-${item.id}`} aria-controls={`mission-panel-${p.island.id}`} aria-selected={group?.id===item.id} tabIndex={group?.id===item.id?0:-1} className="mission-game-tab" data-game-select={item.id} key={item.id} onClick={()=>selectGame(item.id)} onKeyDown={e=>onTabKey(e,index)}>
      <span className="mission-tab-art"><img src={selectionThumbnailFor(item.id)} alt="" draggable={false}/>{!access.fullAccess&&(free?<Leaf size={12}/>:<Lock size={12}/>)}</span><strong lang="en-GB">{cardCaption(item)}</strong><small className="sr-only">{access.fullAccess?`${done}/${count} ${p.mockKeys.has(item.id)?'complete':'levels'}`:free?'Free practice':'Full access'}</small>
     </button>;
    })}
   </div>
   <button type="button" className="mission-carousel-arrow" data-button-skin="none" aria-label="Next game" disabled={gameGroups.length<2} onClick={()=>moveGame(1)}><ChevronRight aria-hidden="true"/></button>
   </div>
  </section>
  {group&&<section className="mission-selection-panel" data-mission-kind={paperGroup?'paper':'game'} id={`mission-panel-${p.island.id}`} role="tabpanel" aria-labelledby={`mission-tab-${p.island.id}-${group.id}`}>
   <header className="mission-selected-header">
    <img src={selectionThumbnailFor(group.id)} alt="" draggable={false}/>
    <div><h2 data-long-title={group.name.length>19||undefined}>{group.name}</h2><div className="mission-game-progress-copy"><span>{completed}/{scored.length} {paperGroup?(scored.length===1?'quiz':'quizzes'):'levels'} complete</span><span><GemArtwork/>{group.totalStars}/{maximum}</span></div><div className="mission-game-progress" role="progressbar" aria-label={`${group.name} brainpower`} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={group.totalStars}><span style={{width:`${maximum?Math.min(100,group.totalStars/maximum*100):0}%`}}/></div></div>
   </header>
   <div className="mission-options-scroll" ref={navigation.scrollRef} onScroll={navigation.onScroll}>
    <div className="mission-options-inner" data-game-key={group.id} key={group.id}>

     {levelSection}
     {selected&&<div className="mission-selection-summary"><strong>{label}</strong><span>{selectedLocked?'Upgrade for full access':levelDetail(selected,paperGroup)}</span></div>}
     {selected&&<button type="button" data-button-skin="none" className="mission-play-level" data-selected-level={selected.level.id} disabled={!selectedLocked&&!selected.isUnlocked} onClick={()=>selectedLocked?access.openUpgrade():selectLevel(selected.level)}><AdventureControlFrame primary/>{selectedLocked||!selected.isUnlocked?<Lock size={21}/>:<Play size={21} fill="currentColor"/>}<span>{selectedLocked?'Unlock':selected.isCompleted?`Replay ${label}`:`Play ${label}`}</span></button>}
     <div className="mission-secondary-actions">{practiceSection}
     {p.wellbeingTitle&&p.onOpenWellbeing&&<details className="mission-calm"><summary><Leaf size={15}/>Take a calm break<ChevronDown size={14}/></summary><div><h3>{p.wellbeingTitle}</h3><p>{p.wellbeingSubtitle||'A short reset activity to help you breathe, settle, and feel ready for the next challenge.'}</p>{p.wellbeingType&&<small>{p.wellbeingType}</small>}<button type="button" data-button-skin="none" onClick={p.onOpenWellbeing}>Open calm break<ArrowRight size={15}/></button></div></details>}
     </div>
    </div>
   </div>
  </section>}
 </div>;
}
