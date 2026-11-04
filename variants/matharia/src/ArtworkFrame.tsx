import React,{useLayoutEffect,useRef,useState} from 'react';
import CanvasFrame from './CanvasFrame';
import {asset} from './assets';
import preparation from '../reference/forge-assets.json';
import additional from '../reference/next-assets.json';
import zombies from '../reference/zombie-assets.json';
import takeout from '../reference/takeout-assets.json';
import rocket from '../reference/rocket-assets.json';
import glacier from '../reference/glacier-assets.json';
import geometry from '../reference/geometry-assets.json';
import statistics from '../reference/statistics-assets.json';
import arena from '../reference/ops-assets.json';
import mine from '../reference/mine-assets.json';
import remainder from '../reference/remainder-assets.json';
import checkout from '../reference/change-assets.json';
import papers from '../reference/paper-assets.json';
import potions from '../reference/potion-assets.json';
import scale from '../reference/scale-assets.json';
const sizes=Object.fromEntries([...preparation.assets,...additional.assets,...zombies.assets,...takeout.assets,...rocket.assets,...glacier.assets,...geometry.assets,...statistics.assets,...arena.assets,...mine.assets,...remainder.assets,...checkout.assets,...papers.assets,...potions.assets,...scale.assets].map(a=>[a.name,a.dimensions]));
/** Nine-slice only for plain-centred assets without centre ornaments. Corners retain their aspect ratio. */
export default function ArtworkFrame({name,corner=.18,surface,horizontalCorner,fit='contain'}:{name:string;corner?:number;surface?:string;horizontalCorner?:number;fit?:'contain'|'height'}){
 // Explicit panel material is separate from its ornamental frame.
 const panelSurface=surface??(name==='frames/glacier_panel_v3'?'#043c4b':undefined);
 const dimensions=sizes[name];if(!dimensions)throw new Error(`Unregistered Matharia artwork frame: ${name}`);
 const canvasMode=true;
 const [canvasReady,setCanvasReady]=useState(false);useLayoutEffect(()=>setCanvasReady(false),[name]);
 const [group,key]=name.split('/'),[w,h]=dimensions,node=useRef<HTMLSpanElement>(null),[size,setSize]=useState({w:0,h:0});
 const cap=Math.min(w*corner,h*.45),capX=horizontalCorner===undefined?cap:w*horizontalCorner;
 const scale=fit==='height'?Math.min(size.h/h,size.w/(capX*2+1)):Math.min(size.w/w,size.h/h),pixels=cap*scale,pixelsX=capX*scale;
 // This hollow 1600x533 frame needs a material backing fitted to its aperture.
 // Source-pixel insets overlap the inner rim and scale with the corner slices;
 // percentage clipping leaves scenery visible beside wide, shallow panels.
 const surfaceStyle:React.CSSProperties={background:panelSurface};
 if(name==='frames/pvp_question_v3_hollow')Object.assign(surfaceStyle,{
  inset:`${48*scale}px ${56*scale}px ${56*scale}px`,borderRadius:80*scale,
  clipPath:'none',visibility:scale>0?'visible':'hidden',
 });
 useLayoutEffect(()=>{const parent=node.current!.parentElement!;const update=()=>{const r=parent.getBoundingClientRect();setSize(old=>Math.abs(old.w-r.width)+Math.abs(old.h-r.height)<.1?old:{w:r.width,h:r.height})};update();const observer=new ResizeObserver(update);observer.observe(parent);return()=>observer.disconnect()},[name]);
 return <>{panelSurface&&<span className="artwork-surface" aria-hidden="true" style={surfaceStyle}/>}<span ref={node} className="artwork-frame" aria-hidden="true" data-artwork-ready={canvasMode?canvasReady:undefined} style={{
  borderImageSource:canvasMode&&canvasReady?undefined:`url(${asset(group,key)})`,borderImageSlice:`${cap} ${capX} fill`,
  borderWidth:canvasMode&&canvasReady?0:`${pixels}px ${pixelsX}px`,borderImageWidth:`${pixels}px ${pixelsX}px`,
 }}>{canvasMode&&<CanvasFrame source={asset(group,key)} width={size.w} height={size.h} cap={cap} capX={capX} scale={scale} onReady={setCanvasReady}/>}</span></>;
}
