import React,{useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {motion,useReducedMotion,useSpring,useTransform} from 'motion/react';
import {VisionSceneContext} from '../VisionScene';
import ArtworkFrame from '../ArtworkFrame';
import {asset} from '../assets';
import survey from '../../reference/survey-assets.json';
interface Props {grams:number;target:number;paused:boolean;broken:boolean;dropRef:React.RefObject<HTMLDivElement|null>;children:React.ReactNode;}
const housing=survey.assets.find(a=>a.name==='props/scale_housing_v3')! as {dimensions:number[];dial:{centre:number[];radius:number[]}};
const traySize=survey.assets.find(a=>a.name==='props/scale_tray_v4')!.dimensions;
/** Same source spring/load response; a clean housing and separate tray replace the old illustration. */
export default function RasterMechanicalScale({grams,target,paused,broken,dropRef,children}:Props){
 const scene=useContext(VisionSceneContext),reduced=useReducedMotion(),root=useRef<HTMLDivElement>(null),[unit,setUnit]=useState(1),load=useSpring(0,{stiffness:180,damping:18,mass:.9});
 const frozen=paused||scene.paused,ratio=Math.min(2,grams/Math.max(1,target));
 useEffect(()=>{if(frozen){load.jump(load.get());return}if(reduced)load.jump(ratio);else load.set(ratio)},[frozen,load,ratio,reduced]);
 useLayoutEffect(()=>{const e=root.current!,update=()=>{const r=e.getBoundingClientRect();setUnit(Math.min(r.width/360,r.height/400)||1)};update();const o=new ResizeObserver(update);o.observe(e);return()=>o.disconnect()},[]);
 const tray=useTransform(load,v=>Math.max(-2,Math.min(24,v*12))),panY=useTransform(tray,v=>v*unit),bottom=useTransform(tray,v=>`${100-(118+v)/400*100}%`),angle=useTransform(load,v=>-115+Math.min(2,Math.max(0,v))*115);
 const ih=276,iw=ih*housing.dimensions[0]/housing.dimensions[1],ix=(360-iw)/2,iy=120,cx=ix+iw*housing.dial.centre[0],cy=iy+ih*housing.dial.centre[1],rx=iw*housing.dial.radius[0],ry=ih*housing.dial.radius[1],font=Math.max(18,12/unit);
 return <div ref={root} className="raster-mechanical-scale" data-conversion-scale data-conversion-target={target} data-conversion-broken={broken} data-scale-load-ratio={ratio}>
  <img className="conversion-scale-housing" src={asset('props','scale_housing_v3')} style={{left:`${ix/360*100}%`,top:`${iy/400*100}%`,width:`${iw/360*100}%`,height:`${ih/400*100}%`}} alt="" draggable={false}/>
  <svg viewBox="0 0 360 400" className="conversion-scale-art" aria-hidden="true">
   {Array.from({length:23},(_,i)=>{const a=(-115+i*230/22)*Math.PI/180,r=i%2===0?.84:.9;return <line key={i} x1={cx+rx*r*Math.sin(a)} y1={cy-ry*r*Math.cos(a)} x2={cx+rx*.95*Math.sin(a)} y2={cy-ry*.95*Math.cos(a)} stroke="#44311c" strokeWidth={i%2===0?1.6:.8}/>})}
   <g fill="#182c33" fontFamily="Matharia Rounded" fontWeight="650" fontSize={font} textAnchor="middle"><text x={cx} y={cy-ry*.62}>TARGET</text><text x={cx-rx*.6} y={cy+ry*.43}>0</text><text x={cx+rx*.5} y={cy+ry*.43}>MAX</text><text x={cx} y={cy+ry*.7}>MASS</text></g>
   <motion.g data-scale-needle style={{rotate:angle,originX:`${cx}px`,originY:`${cy}px`,transformBox:'view-box'}}><path d={`M${cx-3} ${cy+11}L${cx} ${cy-ry*.83}L${cx+3} ${cy+11}Z`} fill={broken?'#bc503b':'#bf7b17'} stroke="#6e3d0d" strokeWidth="1"/></motion.g><circle cx={cx} cy={cy} r="8" fill="#dfb64c" stroke="#85551b" strokeWidth="2"/><circle cx={cx-1} cy={cy-1} r="3" fill="#fff0b5"/>
  </svg>
  <motion.img className="conversion-scale-pan" data-scale-pan src={asset('props','scale_tray_v4')} alt="" draggable={false} style={{left:`${22/360*100}%`,top:`${99/400*100}%`,width:`${316/360*100}%`,height:`${316*traySize[1]/traySize[0]/400*100}%`,y:panY}}/>
  <motion.div ref={dropRef} className="conversion-load-tray" data-conversion-tray style={{bottom}}>{children}</motion.div>
  <div className="conversion-load-meter" data-conversion-load={grams} role="status" aria-live="polite"><ArtworkFrame name="frames/glacier_panel_v3" corner={.13}/><span className="sr-only">{broken?'Overload: reset.':'Measured load:'}</span><strong>{grams.toLocaleString()} g</strong></div>
 </div>;
}
