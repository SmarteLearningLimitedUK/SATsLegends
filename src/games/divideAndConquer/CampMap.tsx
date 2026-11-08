import {useId} from 'react';
import {asset} from '../../../variants/matharia/src/assets';
import {CAMP_NAMES,type DivisionCamp} from './engine';
/** Tactical symbols sit on the existing Operations Outpost island artwork. */
export function CampMarker({progress}:{progress:number}){
 const id=useId().replaceAll(':','');
 return <svg viewBox="0 0 120 100" aria-hidden="true"><defs><linearGradient id={id} x2="0" y2="1"><stop stopColor="#d4a44e"/><stop offset="1" stopColor="#6b4329"/></linearGradient></defs>
  <ellipse cx="60" cy="88" rx="54" ry="9" fill="#071e25" opacity=".5"/>
  {progress<1?<><g opacity={progress>.65?.3:1}><path d="M22 76L60 22L96 76Z" fill="#7c263b" stroke="#edc97c" strokeWidth="3"/><path d="M46 76L60 47L73 76" fill="#182e35" stroke="#cfa15c" strokeWidth="2"/></g>
   {progress<.5&&<path d="M15 76V59L21 53L27 59V76M33 76V59L39 53L45 59V76M76 76V59L82 53L88 59V76M94 76V59L100 53L106 59V76M12 65H108" stroke="#4e3022" strokeWidth="4" fill={`url(#${id})`}/>}
   <path d="M60 24V3L90 8L60 17" fill="#a52f4b" stroke="#f0ce82" strokeWidth="2"/><path d="M61 3V25" stroke="#f0ce82" strokeWidth="3"/>
  </>:<><path d="M23 82L33 68L43 83L55 74L70 84L87 69L100 83" fill={`url(#${id})`} stroke="#e2c280" strokeWidth="2"/><path d="M45 43L58 57L82 29" fill="none" stroke="#a2f2cf" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/></>}
 </svg>;
}
export default function CampMap({camps,completed,disabled,onSelect}:{camps:DivisionCamp[];completed:number[];disabled:boolean;onSelect:(index:number)=>void}){
 const places=[[24,29],[73,27],[26,66],[74,68]];
 return <div className="conquer-map" role="group" aria-label="Enemy camp map">
  <img className="conquer-island" src={asset('map','island_operations_outpost')} alt="Operations Outpost map" draggable={false}/>
  {camps.map((camp,index)=>{const progress=completed[index]/camp.steps.length,cleared=progress===1;return <button type="button" className="conquer-camp" data-camp={index} data-cleared={cleared} key={camp.id} data-button-skin="none" disabled={disabled||cleared} aria-label={`${CAMP_NAMES[index]}${cleared?', cleared':completed[index]?', continue division':', select camp'}`} style={{left:places[index][0]+'%',top:places[index][1]+'%'}} onClick={()=>onSelect(index)}><CampMarker progress={progress}/><span>{CAMP_NAMES[index]}</span>{completed[index]>0&&<span className="conquer-camp-status">{cleared?'Cleared':`${completed[index]}/${camp.steps.length} defences removed`}</span>}</button>})}
 </div>;
}
