import {useLayoutEffect,useRef,type RefObject} from 'react';

/** Fit the two actual outlines; hold the coordinate projection steady throughout a drag. */
export function useBlueprintViewport(ref:RefObject<SVGSVGElement|null>,signature:string) {
 const dragging=useRef(false),fit=useRef(()=>{});
 useLayoutEffect(()=>{
  const svg=ref.current;if(!svg)return;
  fit.current=()=>{
   if(dragging.current)return;
   const shapes=[...svg.querySelectorAll<SVGGraphicsElement>('[data-scale-original-shape],[data-scale-new-shape]')];
   if(!shapes.length)return;
   const boxes=shapes.map(shape=>shape.getBBox()),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
   const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
   const padding=Math.max(32,(bottom-y)*.18);
   svg.setAttribute('viewBox',`${x-padding} ${y-padding} ${right-x+padding*2} ${bottom-y+padding*2}`);
  };
  fit.current();
 },[ref,signature]);
 useLayoutEffect(()=>{
  const svg=ref.current;if(!svg)return;
  const start=()=>{dragging.current=true},end=()=>{dragging.current=false;fit.current()};
  svg.addEventListener('pointerdown',start,true);svg.addEventListener('pointerup',end,true);svg.addEventListener('pointercancel',end,true);svg.addEventListener('lostpointercapture',end);
  return()=>{svg.removeEventListener('pointerdown',start,true);svg.removeEventListener('pointerup',end,true);svg.removeEventListener('pointercancel',end,true);svg.removeEventListener('lostpointercapture',end)};
 },[ref]);
}
