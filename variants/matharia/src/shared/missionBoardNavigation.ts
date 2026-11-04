import {useLayoutEffect,useRef,useState} from 'react';
import type {GameScreen,LevelData} from '../../../../src/types';
import {getLevelGroupKey} from '../../../../src/utils/gameNames';

interface BoardPosition {gameId:string|null;levelId:number|null;scrollTop:number}
export interface MissionRow {level:LevelData;isUnlocked:boolean;isCompleted:boolean}
interface MissionGroup {id:string;levels:MissionRow[]}

// Transient navigation context only; it never changes player progress or saves.
const positions=new Map<number,BoardPosition>();
export function readMissionBoardPosition(islandId:number):BoardPosition|undefined {
 const value=positions.get(islandId);return value?{...value}:undefined;
}
export function rememberActiveMission(islandId:number,level:LevelData,scrollTop?:number) {
 const gameId=getLevelGroupKey(level),previous=positions.get(islandId);
 positions.set(islandId,{gameId,levelId:level.id,scrollTop:scrollTop??(previous?.gameId===gameId?previous.scrollTop:0)});
}
/** Observes the real selected level, covering direct links, retry and Next too. */
export function useRememberActiveMission(screen:GameScreen,islandId:number|undefined,level:LevelData|null) {
 useLayoutEffect(()=>{if(screen==='gameplay'&&islandId&&level)rememberActiveMission(islandId,level)},[screen,islandId,level]);
}
export function nextMissionInGroup<Row extends MissionRow>(group:{levels:Row[]}|undefined,levelId:number|null,fallback:Row|undefined):Row|undefined {
 if(!group)return fallback;
 return group.levels.find(row=>row.isUnlocked&&!row.isCompleted&&!row.level.isPractice)
  ??group.levels.find(row=>row.isUnlocked&&row.level.id===levelId)
  ??group.levels.find(row=>row.isUnlocked&&!row.level.isPractice)
  ??group.levels.find(row=>row.isUnlocked)
  ??fallback;
}
export function useMissionBoardNavigation(islandId:number,groups:MissionGroup[],suggestedGroup:string|null) {
 const [initial]=useState(()=>{
  const saved=readMissionBoardPosition(islandId);
  return saved&&(saved.gameId===null||groups.some(group=>group.id===saved.gameId))?saved:undefined;
 });
 const [expandedGameId,setExpandedGameId]=useState<string|null>(initial?initial.gameId:suggestedGroup);
 const [hasSelection,setHasSelection]=useState(Boolean(initial));
 const scrollRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!hasSelection)setExpandedGameId(suggestedGroup)},[hasSelection,suggestedGroup]);
 const saveScroll=()=>{
  const saved=positions.get(islandId);
  if(saved&&saved.gameId===expandedGameId&&scrollRef.current)positions.set(islandId,{...saved,scrollTop:scrollRef.current.scrollTop});
 };
 useLayoutEffect(()=>{
  if(!initial||!scrollRef.current)return;
  const frame=requestAnimationFrame(()=>{
   const scroll=scrollRef.current;if(!scroll)return;
   scroll.scrollTop=initial.scrollTop;
   const group=initial.gameId?scroll.querySelector(`[data-game-key="${CSS.escape(initial.gameId)}"]`):null;
   const target=group?.querySelector(initial.levelId===null?'.adventure-game-header':`[data-level-route="${initial.levelId}"]`)
    ??(initial.levelId===null?null:scroll.querySelector(`[data-free-practice="${initial.levelId}"]`))
    ??group?.querySelector('.adventure-game-header');
   if(target){
    const view=scroll.getBoundingClientRect(),row=target.getBoundingClientRect();
    if(row.top<view.top)scroll.scrollTop+=row.top-view.top;
    else if(row.bottom>view.bottom)scroll.scrollTop+=row.height>view.height?row.top-view.top:row.bottom-view.bottom;
   }
  });
  return()=>cancelAnimationFrame(frame);
 },[initial]);
 const onExpand=(gameId:string|null)=>{
  const saved=positions.get(islandId);
  positions.set(islandId,{gameId,levelId:saved?.gameId===gameId?saved.levelId:null,scrollTop:scrollRef.current?.scrollTop??0});
  setHasSelection(true);
  setExpandedGameId(gameId);
 };
 const rememberLevel=(level:LevelData)=>rememberActiveMission(islandId,level,scrollRef.current?.scrollTop);
 return{expandedGameId,hasSelection,onExpand,scrollRef,onScroll:saveScroll,rememberLevel,levelId:readMissionBoardPosition(islandId)?.levelId??null};
}
