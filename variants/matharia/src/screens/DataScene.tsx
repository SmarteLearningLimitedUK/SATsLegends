import {fractionShare} from '../../../../src/games/detectiveCaseMath';
import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {roundFeedback} from '../roundFeedback';
import React,{useCallback,useContext,useId,useLayoutEffect,useRef} from 'react';
import {Check,ChevronRight} from 'lucide-react';
import {VisionSceneContext} from '../VisionScene';
import {asset} from '../assets';
import {detectiveArt} from '../activityArt';
import SceneActor from '../SceneActor';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import EvidenceChart,{type EvidenceItem} from './EvidenceChart';
const evidenceArtwork=(name:string)=>asset('icons',`evidence_${name.includes('Cookie')?'cookie':name.includes('Sock')?'socks':name.includes('Coin')?'coins':'gem'}_v3`);
import {usePresentationHint} from '../PresentationHint';
import {useDismissiblePanel} from '../useDismissiblePanel';
interface Suspect{id:number;name:string;items:number[];portrait?:string;}
interface Props{items:EvidenceItem[];suspects:Suspect[];selected:Suspect|null;phase:'playing'|'success'|'complete';level:number;total:number;score:number;lives:number;mode:string;brief:string;type:'bar'|'pie';ticks:number[];maximum:number;pinned:string|null;incorrect:number[];caught:number|null;feedback:{type:'success'|'error';message:string}|null;paused:boolean;intro:React.ReactNode;dossierRef:React.RefObject<HTMLDivElement|null>;onInspect:(id:number)=>void;onAccuse:(id:number)=>void;onClose:()=>void;onNext:()=>void;onPin:(name:string)=>void;}
const originalInstruction='A thief has hidden the stolen loot! Whose stash matches the evidence?';
function Portrait({id,name}:{id:number;name:string}){
 const clip=useId();
 return <svg className="data-suspect-portrait" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" role="img" aria-label={name}>
  <defs><clipPath id={clip}><circle cx="500" cy="500" r="430"/></clipPath></defs>
  <circle cx="500" cy="500" r="430" fill="#285a50"/>
  <image href={asset('portraits',`data_suspect_${id}_v3`)} x="70" y="70" width="860" height="860" preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clip})`}/>
  <image href={asset('frames','concept_round_rim_v2')} width="1000" height="1000" preserveAspectRatio="xMidYMid meet"/>
 </svg>;
}
export default function DataScene(p:Props){
 const scene=useContext(VisionSceneContext),identity=scene.heroIdentity??'barratt',art=detectiveArt(identity),trigger=useRef<HTMLElement|null>(null),closeRef=useRef(p.onClose),next=useRef(false),accusing=useRef(false),wasOpen=useRef(false),lineup=useRef<HTMLDivElement>(null);closeRef.current=p.onClose;const closePanel=useCallback((open:boolean)=>{if(!open)closeRef.current()},[]);useDismissiblePanel(Boolean(p.selected),closePanel,trigger,p.dossierRef);
 // Restore focus after React has removed inert from the underlying cards.
 useLayoutEffect(()=>{const open=Boolean(p.selected);if(wasOpen.current&&!open){const preferred=p.phase==='success'?lineup.current?.querySelector<HTMLButtonElement>('.data-next-case'):trigger.current;const target=preferred instanceof HTMLButtonElement&&preferred.disabled?lineup.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'):preferred;target?.focus()}wasOpen.current=open},[p.selected,p.phase]);
 useLayoutEffect(()=>{next.current=false;accusing.current=false},[p.level,p.selected?.id]);usePresentationHint(`${originalInstruction}\nInspect each suspect and compare every total.\n${p.brief}`);
 const question=roundFeedback(p.feedback)?.message??(p.type==='pie'?p.brief:adventureTask('data_detective',p.level-1)+' Match every clue.');
 return <section className="data-scene" data-detective-game data-detective-case={p.level} data-detective-chart={p.type} data-detective-state={p.phase} data-detective-score={p.score} data-detective-lives={p.lives} data-detective-mode={p.mode} data-detective-paused={p.paused||scene.paused}>
  {p.intro}<ScalableQuestionPanel>{question}</ScalableQuestionPanel>
  <div className="data-detective-hero" aria-hidden="true"><SceneActor identity={identity} source={art.source} idleMotion="investigate" paused={p.paused} decorative/></div>
  <div className="data-case-progress"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>Case {p.level} / {p.total}</div>
  <div className="data-evidence-board" inert={p.selected?true:undefined}><ArtworkFrame name="frames/chart_wood_hollow_v4" corner={.15} surface="#073d49"/><div className="data-evidence-heading"><strong><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.type==='pie'?'Share of each stash':'Items in each stash'}<small>{p.type==='pie'?'Pie':'Bar'}</small></strong></div><EvidenceChart items={p.items} type={p.type} ticks={p.ticks} maximum={p.maximum} pinned={p.pinned}/><div className="data-evidence-legend" aria-label="Pin evidence to focus the chart">{p.items.map(i=><button type="button" key={i.name} data-button-skin="none" data-evidence-name={i.name} data-evidence-total={i.amount} aria-pressed={p.pinned===i.name} disabled={p.paused} onClick={()=>p.onPin(i.name)}><img src={evidenceArtwork(i.name)} alt=""/><span>{i.name}</span><strong>{p.type==='pie'?fractionShare(i.amount,p.items.reduce((n,i)=>n+i.amount,0)):i.amount}</strong></button>)}</div></div>
  <div ref={lineup} className="data-suspects" data-data-resolved={p.phase!=='playing'} inert={p.selected?true:undefined}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{p.suspects.map(s=><button type="button" key={s.id} data-button-skin="none" data-data-suspect={s.id} data-suspect-caught={p.caught===s.id} data-suspect-excluded={p.incorrect.includes(s.id)} aria-label={`Inspect ${s.name}`} aria-pressed={p.selected?.id===s.id} disabled={p.paused||p.phase!=='playing'||p.incorrect.includes(s.id)} onClick={e=>{trigger.current=e.currentTarget;p.onInspect(s.id)}}><Portrait id={s.id} name={s.name}/><span className="data-suspect-name"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/>{s.name}</span>{p.caught===s.id&&<Check className="data-caught-check" aria-label="Correct suspect"/>}</button>)}{p.phase!=='playing'&&<button type="button" className="data-next-case" data-button-skin="none" disabled={p.paused||p.phase!=='success'} onClick={()=>{if(next.current)return;next.current=true;p.onNext()}}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/>Next Case<ChevronRight aria-hidden="true"/></button>}</div>
  {p.selected&&<div className="data-dossier-overlay"><div ref={p.dossierRef} className="data-dossier" role="dialog" aria-modal="true" aria-label={`${p.selected.name} evidence dossier`} onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=p.dossierRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><header><Portrait id={p.selected.id} name={p.selected.name}/><div><span>Suspect</span><h2>{p.selected.name}</h2></div></header><div className="data-dossier-items">{p.items.map((item,i)=><div key={item.name} data-dossier-item={item.name} data-dossier-amount={p.selected!.items[i]}><img src={evidenceArtwork(item.name)} alt=""/><span>{item.name}</span><strong>{p.selected!.items[i]}</strong></div>)}</div><footer><button type="button" data-button-skin="none" onClick={()=>{p.onClose();trigger.current?.focus()}}><ArtworkFrame name="buttons/amber_answer_v4" corner={.13} fit="height"/>Close</button><button type="button" data-button-skin="none" disabled={p.paused} onClick={()=>{if(accusing.current)return;accusing.current=true;p.onAccuse(p.selected!.id)}}><ArtworkFrame name="buttons/pvp_submit_v2" corner={.12} fit="height"/>Accuse</button></footer></div></div>}
 </section>;
}
