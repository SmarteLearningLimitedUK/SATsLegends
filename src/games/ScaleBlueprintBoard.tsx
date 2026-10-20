import React, {useId} from 'react';
interface Props {
 shape: 'rect'|'triangle'|'l-shape'; baseLength:number; baseWidth:number;
 length:number; width:number; unit:number; showBase:boolean; locked:boolean;
 onResize:(axis:0|1,value:number)=>void;
}
export default function ScaleBlueprintBoard({shape,baseLength,baseWidth,length,width,unit,showBase,locked,onResize}:Props){
 const id=useId().replace(/:/g,'');
 const w=Math.min(240,length*unit),h=Math.min(240,width*unit);
 const path=(a:number,b:number)=>shape==='triangle'?`M${50+a/2} 50 L${50+a} ${50+b} L50 ${50+b} Z`:shape==='l-shape'?`M50 50 h${a*.28} v${b*.72} h${a*.72} v${b*.28} H50 Z`:`M50 50 h${a} v${b} H50 Z`;
 const resize=(event:React.PointerEvent<SVGGElement>,axis:0|1)=>{
  const svg=event.currentTarget.ownerSVGElement;const matrix=svg?.getScreenCTM();if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  const distance=(axis===0?point.x:point.y)-50;
  onResize(axis,Math.max(.5,Math.min(Math.round(240/unit*2)/2,Math.round(distance/unit*2)/2)));
 };
 return <svg className="scale-numeric-blueprint" data-scale-blueprint viewBox="0 0 320 320" preserveAspectRatio="xMidYMax meet" aria-label="Original dashed blueprint and your resized shape">
  <defs><pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#b6e6f2" strokeOpacity=".16"/></pattern></defs>
  <rect x="1" y="1" width="318" height="318" rx="18" fill="#102e49" stroke="#8ccddb" strokeWidth="2"/><rect width="320" height="320" rx="18" fill={`url(#${id})`}/>
  {showBase&&<path data-scale-original-shape d={path(baseLength*unit,baseWidth*unit)} fill="none" stroke="#e6eaf0" strokeWidth="2" strokeDasharray="6 5" opacity=".55"/>}
  <path data-scale-new-shape d={path(w,h)} fill="#38bdf822" stroke={locked?'#68e4a4':'#70dcf0'} strokeWidth="3"/>
  {([0,1] as const).map(axis=><g key={axis} className="scale-resize-handle" role="slider" tabIndex={locked?-1:0} aria-label={`Drag new ${axis===0?'length':'width'}`} aria-valuemin={.5} aria-valuemax={Math.round(240/unit*2)/2} aria-valuenow={axis===0?length:width} aria-valuetext={`${axis===0?length:width} units`} aria-disabled={locked} transform={`translate(${axis===0?50+w:50+w/2} ${axis===0?50+h/2:50+h})`}
   onPointerDown={e=>{if(locked)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onResize(axis,axis===0?length:width);}}
   onPointerMove={e=>{if(!locked&&e.currentTarget.hasPointerCapture(e.pointerId))resize(e,axis);}}
   onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
   onKeyDown={e=>{if(locked)return;const direction=['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:0;if(direction){e.preventDefault();onResize(axis,Math.max(.5,Math.min(Math.round(240/unit*2)/2,(axis===0?length:width)+direction*.5)));}}}>
    <circle r="30" fill="transparent"/><circle r="12" fill="#ffe09a" stroke="#132e47" strokeWidth="3" pointerEvents="none"/>
    <path d={axis===0?'M-6 0H6 M-3 -3L-6 0 -3 3 M3 -3L6 0 3 3':'M0 -6V6 M-3 -3L0 -6 3 -3 M-3 3L0 6 3 3'} fill="none" stroke="#143b51" strokeWidth="2" pointerEvents="none"/>
   </g>)}
 </svg>;
}
