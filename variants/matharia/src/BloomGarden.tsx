import React,{useLayoutEffect,useMemo,useRef,useState} from 'react';
import BloomBreeze from './BloomBreeze';

interface Props {count:number;bloomScale:number;paused:boolean;phase:string;artwork:string}
type Slot={x:number;waterY:number;width:number;rear:boolean};
const ASPECT=956/730;
// The source breath reaches 1.12. Extra room also covers the gentle sway.
const ENVELOPE=1.2;
const clamp=(n:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,n));

function arrange(width:number,height:number,count:number):Slot[]{
 if(!width||!height)return [];
 const margin=clamp(width*.025,6,16),gap=clamp(width*.032,8,18);
 if(count===1){
  const w=Math.max(0,Math.min(300,width*.56,(height-2*margin)*ASPECT/ENVELOPE));
  return [{x:width/2,waterY:(height+w/ASPECT*ENVELOPE)/2,width:w,rear:false}];
 }
 const rear=count>=4;
 const fromWidth=(width-2*margin-2*gap)/(3.45*ENVELOPE);
 const fromHeight=(height-2*margin-(rear?gap:0))*ASPECT/(ENVELOPE*(1.45+(rear?.72:0)));
 const unit=Math.max(0,Math.min(fromWidth,fromHeight,300/1.45));
 const widths=[unit,unit*1.45,unit],rowWidth=unit*3.45*ENVELOPE+2*gap;
 let cursor=(width-rowWidth)/2;
 const xs=widths.map(w=>{const x=cursor+w*ENVELOPE/2;cursor+=w*ENVELOPE+gap;return x});
 const frontHeight=unit*1.45/ASPECT*ENVELOPE,backHeight=rear?unit*.72/ASPECT*ENVELOPE:0;
 const total=frontHeight+(rear?gap+backHeight:0),top=(height-total)/2,waterY=top+total;
 const slots:Slot[]=[{x:xs[1],waterY,width:widths[1],rear:false},{x:xs[0],waterY,width:widths[0],rear:false},{x:xs[2],waterY,width:widths[2],rear:false}];
 if(rear)slots.push({x:width*.33,waterY:top+backHeight,width:unit*.72,rear:true},{x:width*.67,waterY:top+backHeight,width:unit*.72,rear:true});
 return slots.slice(0,count);
}

export default function BloomGarden(p:Props){
 const root=useRef<HTMLDivElement|null>(null),[size,setSize]=useState({width:0,height:0});
 useLayoutEffect(()=>{const node=root.current!;const measure=()=>{const width=node.clientWidth,height=node.clientHeight;setSize(old=>old.width===width&&old.height===height?old:{width,height})};measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect()},[]);
 const slots=useMemo(()=>arrange(size.width,size.height,p.count),[size.width,size.height,p.count]);
 return <div ref={root} className="wellbeing-bloom-garden" data-bloom-flower-count={p.count} data-garden-paused={p.paused} data-garden-phase={p.phase} data-garden-measured={Boolean(size.width&&size.height)} aria-hidden="true" style={{'--bloom-scale':p.bloomScale} as React.CSSProperties}>
  <BloomBreeze/>
  {slots.map((slot,i)=><div key={i} className="wellbeing-garden-flower" data-bloom-flower={i+1} data-bloom-depth={slot.rear?'rear':'front'} style={{left:slot.x,top:slot.waterY,width:slot.width,height:slot.width/ASPECT,'--sway-delay':`${i*-1.6}s`,'--sway-duration':`${8+i*.8}s`,'--plant-delay':i?'550ms':'0ms'} as React.CSSProperties}>
   <div className="bloom-flower-appearance">
    <svg className="bloom-water-ripple" viewBox="0 0 160 30" preserveAspectRatio="none" fill="none"><ellipse cx="80" cy="15" rx="70" ry="9"/><ellipse cx="80" cy="15" rx="52" ry="5"/></svg>
    <div className="bloom-breeze-sway">
     <div className="wellbeing-bloom" style={{transform:`scale(${p.bloomScale})`}}><img className="wellbeing-bloom-artwork" src={p.artwork} alt="" draggable={false}/></div>
    </div>
    <svg className="bloom-arrival-glint" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="32"/><path d="M50 5V18M50 82V95M5 50H18M82 50H95M18 18L27 27M73 73L82 82M18 82L27 73M73 27L82 18"/></svg>
   </div>
  </div>)}
 </div>;
}
