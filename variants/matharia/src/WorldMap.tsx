import React,{useLayoutEffect,useRef} from 'react';
import {motion,useIsPresent,useReducedMotion} from 'motion/react';
import {ISLANDS} from '../../../src/constants';
import type {IslandData, PlayerData} from '../../../src/types';
import {UNLOCK_ALL_LEVELS} from '../../../src/app/testingFlags';
import {asset} from './assets';
import {useNativeAccess} from './app/NativeAccess';
import {ChevronsDown,ChevronsUp,UserRound} from 'lucide-react';

interface Props {player:PlayerData; onSelectIsland:(island:IslandData)=>void; onOpenShop:()=>void; onOpenAchievements:()=>void; onOpenParentReport:()=>void;}
const islands:Record<number,string>={1:'island_arithmetic_acropolis',2:'island_fraction_forest',3:'island_geometry_glacier',4:'island_data_desert',5:'island_operations_outpost',6:'island_measurement_mountain',7:'island_ratio_rapids',8:'island_calculation_core'};
// The map presents the numbered islands in sequence without changing shared progression data.
const mapIslands=[...ISLANDS].sort((a,b)=>a.id-b.id);
// Navigation context only: the map unmounts while an island or another hub is open.
let lastViewedIslandId=mapIslands[0].id;

export default function WorldMap({player,onSelectIsland}:Props) {
  const reduced=useReducedMotion();
  const present=useIsPresent();
  const access=useNativeAccess();
  const scroll=useRef<HTMLDivElement|null>(null);
  const viewedIslandId=useRef(lastViewedIslandId);
  const leaving=useRef(false);
  const viewportHeight=useRef(0);
  const rememberIsland=(islandId:number)=>{
    viewedIslandId.current=islandId;
    lastViewedIslandId=islandId;
  };
  useLayoutEffect(()=>{
    const container=scroll.current;if(!container)return;
    const restoreIsland=()=>{
      viewportHeight.current=container.clientHeight;
      const page=container.querySelector<HTMLElement>(`[data-map-island-position="${viewedIslandId.current}"]`);
      if(page)container.scrollTop=page.offsetTop;
    };
    restoreIsland();
    // Keep the same island aligned when safe-area, orientation or viewport size changes.
    const resize=new ResizeObserver(restoreIsland);
    resize.observe(container);
    return()=>resize.disconnect();
  },[]);
  const rememberScroll=()=>{
    const container=scroll.current;if(!container)return;
    // Outgoing frames and resize clamping must not replace the selected island.
    if(!present||leaving.current||container.clientHeight!==viewportHeight.current)return;
    const pages=Array.from<HTMLElement>(container.querySelectorAll('[data-map-island-position]'));
    const nearest=pages.reduce<HTMLElement|null>((best,page)=>!best||Math.abs(page.offsetTop-container.scrollTop)<Math.abs(best.offsetTop-container.scrollTop)?page:best,null);
    if(nearest)rememberIsland(Number(nearest.dataset.mapIslandPosition));
  };
  const scrollToIsland=(index:number)=>{
    const container=scroll.current,page=container?.children.item(index) as HTMLElement|null|undefined;
    if(!container||!page)return;
    container.scrollTo({top:page.offsetTop,behavior:reduced?'auto':'smooth'});
    page.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});
  };
  return <div className="matharia-map" data-matharia-map>
    <button className="native-map-account" type="button" aria-label="Parent account" onClick={access.openAccount}><UserRound size={21}/></button>
    <img className="matharia-map-wordmark" src={asset('branding','logo_matharia')} alt="Matharia"/>
    <div ref={scroll} onScroll={rememberScroll} className="matharia-island-scroll" role="region" aria-label="Islands of Matharia" tabIndex={0}>
      {mapIslands.map((island,index)=>{
        const levels=island.levels.filter(level=>!level.isPractice), counted=levels.length?levels:island.levels;
        const earned=counted.reduce((sum,level)=>sum+Math.max(0,Math.min(3,player.levelStars[`${island.id}-${level.id}`]||0)),0);
        const completion=counted.length?Math.round(earned/(counted.length*3)*100):0;
        const unlocked=!access.fullAccess||UNLOCK_ALL_LEVELS||player.unlockedIslands.includes(island.id);
        const last=index===mapIslands.length-1,target=last?index-1:index+1,Arrow=last?ChevronsUp:ChevronsDown;
        return <section key={island.id} className="matharia-island-page" data-map-island-position={island.id} aria-label={island.name}>
          <div className="matharia-island-heading"><span>Island {index+1} of {mapIslands.length}</span><h1 tabIndex={-1}>{island.name}</h1></div>
          <motion.img className="matharia-island-art" src={asset('map',islands[island.id])} alt="" draggable={false} loading={index===0?'eager':'lazy'} decoding="async" initial={reduced?false:{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.5}} transition={{duration:reduced?0:.55}}/>
          <div className="matharia-island-details"><p>{completion}% complete</p><div className="matharia-map-progress" role="progressbar" aria-label={`${island.name} completion`} aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${completion}%`}}/></div>
            <button className="matharia-explore" type="button" disabled={!unlocked} data-map-explore-island={island.id} onClick={()=>{rememberIsland(island.id);leaving.current=true;onSelectIsland(island)}}>{!access.fullAccess?'View levels':unlocked?'Explore Island':'Island Locked'}</button>
          </div>
          <button className="matharia-map-scroll-cue" type="button" data-map-scroll-direction={last?'up':'down'} aria-label={`Scroll to ${mapIslands[target].name}`} onClick={()=>scrollToIsland(target)}><span>Scroll</span><Arrow size={22} strokeWidth={2.5} aria-hidden="true"/></button>
        </section>;
      })}
    </div>

  </div>;
}
