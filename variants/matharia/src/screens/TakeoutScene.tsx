import {adventureTask} from '../../../../src/systems/content/adventureStory';
import {useLearningPolicy} from '../../../../src/systems/learning/learningSupport';
import {Ban} from 'lucide-react';
import {roundFeedback} from '../roundFeedback';
import React,{useContext,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import SceneActor from '../SceneActor';
import SceneTransfer from '../SceneTransfer';
import TakeoutCustomer from './TakeoutCustomer';
import CelebrationSplash from '../../../../src/components/CelebrationSplash';
import {VisionSceneContext,type VisionSceneState} from '../VisionScene';
import ScalableQuestionPanel from '../ScalableQuestionPanel';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
type Fraction={n:number;d:number};
type Food={id:string;name:string;image:string;value:Fraction;colorClass:string};
// The existing sprite kinds are retained, including the source's non-semantic internal IDs.
const portionArt:Record<string,number>={burger_meal:1,ribs_plate:2,berry_dessert:3,salad_bowl:4,rice_bowl:5,pizza_slice:6,hotdog_combo:7,roast_chicken:8,fries:9};
const foodImage=(item:Food)=>asset('food',`portion_${portionArt[item.id]}_v3`);
function OrderTicket({number,time}:{number:number;time:number}){
 const [ticket]=useState(number);const support=useLearningPolicy(),untimed=support.noTimeLimit||support.relaxedPractice;
 return <div className="takeout-ticket"><ArtworkFrame name="frames/pvp_question_v3_hollow" surface="#00434b"/><strong>Ticket #{ticket}</strong><span data-takeout-clock role="timer" aria-label={untimed?'Untimed practice':`Shift time remaining: ${time} seconds`}>{untimed?'Untimed':`${time}s`}</span></div>;
}
interface Props{
 target:Fraction;total:Fraction;items:Food[];tray:{item:Food;count:number}[];format:(f:Fraction)=>string;
 orderId:string;time:number;served:number;combo:number;pressure:string;wrong:number;score:number;selected:number;
 queued:number;elapsed:number;customerLine:string;cast:readonly string[];customerScene:VisionSceneState;
 over:boolean;exact:boolean;constraintsMet:boolean;minItems:number;minValues:number;limits:Readonly<Record<string,number>>;counts:Readonly<Record<string,number>>;banned:Set<string>;practice:boolean;submitLabel:string;trayHint:string;
 blocked:boolean;resolving:boolean;finished:boolean;present:boolean;canSubmit:boolean;paused:boolean;
 preparation:number;cooking:boolean;celebration:boolean;feedback:{tone:'success'|'error'|'info';text:string}|null;
 onAdd:(id:string)=>void;onRemove:(id:string)=>void;onClear:()=>void;onSubmit:()=>void;
}
export default function TakeoutScene(p:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion(),disabled=!p.present||p.resolving||p.finished||p.blocked||p.paused;
 const leaving=p.resolving&&roundFeedback(p.feedback)?.tone==='success',paused=p.paused||!p.present||p.finished;
 const actorScene={...p.customerScene,paused:paused||p.customerScene.paused};
 const ready=p.canSubmit&&!p.paused&&p.exact&&p.constraintsMet;
 const feedback=roundFeedback(p.feedback);
 const feedbackText=feedback?.text||(!p.queued||p.over||p.exact?p.trayHint:'');
 const submitState=paused?'paused':p.finished?'finished':p.resolving?'serving':!p.queued?'waiting':!p.selected?'empty':ready?'ready':'building';
 return <section className="takeout-scene" data-takeout-game data-takeout-order={p.orderId} data-takeout-state={p.finished?'finished':roundFeedback(p.feedback)?.tone||'idle'} data-takeout-time={p.time} data-takeout-paused={p.paused} data-takeout-present={p.present} data-takeout-served={p.served} data-takeout-combo={p.combo} data-takeout-pressure={p.pressure} data-takeout-selected-count={p.selected} data-takeout-wrong={p.wrong} data-takeout-score={p.score} data-takeout-min-items={p.minItems} data-takeout-min-values={p.minValues} data-takeout-constraints-met={p.constraintsMet}>
  <ScalableQuestionPanel story={adventureTask('take_out_rush',p.served)}><div className="takeout-order-copy"><strong>Make {p.format(p.target)} of a meal.</strong><small>{p.minItems}+ portions · {p.minValues} fraction sizes</small></div></ScalableQuestionPanel>
  <div className="takeout-ticket-slot" key={p.orderId}><OrderTicket number={p.served+1} time={p.time}/></div>
  <section className="takeout-live-kitchen" data-takeout-playfield data-takeout-target={`${p.target.n}/${p.target.d}`} data-takeout-total={`${p.total.n}/${p.total.d}`} aria-label="Kitchen">
   <div className="takeout-customers" data-customer-queue={p.queued} aria-label="Customer being served"><VisionSceneContext.Provider value={actorScene}>{(p.queued>0||leaving)&&<div className="takeout-customer-slot" key={p.orderId}><TakeoutCustomer serial={p.served} cast={p.cast} leaving={leaving} paused={paused} elapsed={p.elapsed}/></div>}</VisionSceneContext.Provider></div>
   <div className="takeout-chef" data-chef-preparation={p.preparation} data-chef-cooking={p.cooking}><VisionSceneContext.Provider value={actorScene}><SceneActor source={asset('heroes',`chef_${scene.heroIdentity??'barratt'}_v4`)} identity={scene.heroIdentity??'barratt'} activity="cook" alt="Your hero chef" reaction={p.preparation&&p.selected?'taunt':'idle'} reactionKey={p.preparation}/></VisionSceneContext.Provider></div>
   <img className="takeout-stove" src={asset('props','takeout_stove_v3')} alt="" draggable={false}/>
   <svg className="takeout-steam" viewBox="0 0 80 100" aria-hidden="true"><path d="M20 96C0 72 40 65 20 36S35 12 25 2"/><path d="M42 96C20 72 62 65 42 36S57 12 47 2"/><path d="M64 96C44 72 84 65 64 36S79 12 69 2"/></svg>
   <span className="sr-only" role="status">{p.queued?p.customerLine:'Your next customer is on the way.'}</span>
  </section>
  <span className="takeout-queue-status" role="status"><ArtworkFrame name="frames/glacier_panel_v3" corner={.075} surface="#00434b"/>{p.queued} in queue · {p.served} served · Next: {20-p.elapsed%20}s</span>
  <div className="takeout-responses" data-takeout-responses><ArtworkFrame name="frames/takeout_board_v3" corner={.08}/>
   <div className="takeout-tray" data-takeout-tray data-overfilled={p.over||undefined}><div className="takeout-tray-label"><span>Your tray</span><strong>{p.format(p.total)} / {p.format(p.target)}</strong></div><div className="takeout-tray-items">{p.tray.length?p.tray.map(({item,count})=><button key={item.id} type="button" data-takeout-remove={item.id} aria-label={`Remove one ${p.format(item.value)} portion`} disabled={disabled} onClick={()=>p.onRemove(item.id)}><img src={foodImage(item)} alt="" draggable={false}/><span>{p.format(item.value)} ×{count}</span><small aria-hidden="true">−</small></button>):<span>Empty</span>}</div></div>
   <div className="takeout-food-shelf" style={{'--takeout-item-count':p.items.length} as React.CSSProperties}>{p.items.map(item=>{const banned=p.banned.has(item.id),limit=p.limits[item.id],remaining=limit===undefined?undefined:Math.max(0,limit-(p.counts[item.id]||0));return <button key={item.id} type="button" data-button-skin="none" data-takeout-food={item.id} data-food-fraction={`${item.value.n}/${item.value.d}`} data-food-limit={limit} data-food-remaining={remaining} data-food-blocked={banned} aria-label={`${banned?'Blocked':'Add'} ${p.format(item.value)} portion${remaining===undefined?'':`, ${remaining} left`}`} disabled={disabled||banned||remaining===0} onClick={()=>p.onAdd(item.id)}><ArtworkFrame name="frames/takeout_food_card_v3" corner={.20}/>{banned?<small className="takeout-stock"><Ban width={16} height={16} aria-hidden="true"/></small>:remaining!==undefined?<small className="takeout-stock">{remaining} left</small>:null}<img src={foodImage(item)} alt="" draggable={false}/><strong>{p.format(item.value)}</strong></button>})}</div>
   <div className="takeout-actions">
    <button type="button" data-button-skin="none" onClick={p.onClear} disabled={disabled || !p.selected}>
     <ArtworkFrame name="buttons/scale_key_v4" corner={.1} fit="height"/>
     Reset tray
    </button>
    <button type="button" data-button-skin="none" data-takeout-submit data-submit-state={submitState} aria-describedby="takeout-feedback" onClick={p.onSubmit} disabled={!p.canSubmit || p.paused}>
     <ArtworkFrame name={ready ? 'buttons/paper_gold_v3' : 'buttons/scale_key_v4'} corner={.1} fit="height"/>
     {p.submitLabel}
    </button>
   </div>
  </div>
  <div className={feedbackText?'takeout-feedback':'sr-only'} id="takeout-feedback" data-feedback-active={Boolean(feedback)} data-tone={feedback?.tone} role="status" aria-live="polite">{feedbackText&&<><ArtworkFrame name="frames/glacier_panel_v3" corner={.075} surface="#00434b"/>{feedbackText}</>}</div>
  {leaving&&<SceneTransfer key={p.orderId} from="[data-takeout-tray]" to=".takeout-customers" images={p.tray.map(({item})=>foodImage(item))} base={asset('props','prop_takeout_tray')} paused={paused}/>}
  <CelebrationSplash active={p.celebration&&!reduced} message="Order Up!" theme="takeout" sweepDuration={1.35}/>
 </section>;
}
