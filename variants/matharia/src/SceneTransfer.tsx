import React,{useLayoutEffect,useRef,useState} from 'react';

/** Decorative transfer between measured live anchors; never owns input or game state. */
export default function SceneTransfer({from,to,images,paused=false,base}:{key?:string|number;from:string;to:string;images:string[];paused?:boolean;base?:string}) {
 const node=useRef<HTMLDivElement>(null),[points,setPoints]=useState<React.CSSProperties|null>(null);
 useLayoutEffect(()=>{
  const scope=node.current?.parentElement,a=scope?.querySelector(from),b=scope?.querySelector(to);if(!scope||!a||!b)return;
  const r=scope.getBoundingClientRect(),s=a.getBoundingClientRect(),t=b.getBoundingClientRect();
  const x=s.x+s.width/2-r.x,y=s.y+s.height/2-r.y,tx=t.x+t.width/2-r.x,ty=t.y+t.height*.75-r.y;
  setPoints({'--transfer-x':`${x}px`,'--transfer-y':`${y}px`,'--transfer-tx':`${tx}px`,'--transfer-ty':`${ty}px`,'--transfer-mx':`${(x+tx)/2}px`,'--transfer-my':`${Math.min(y,ty)-24}px`} as React.CSSProperties);
 },[from,to]);
 return <div ref={node} className="scene-item-transfer" data-scene-paused={paused} aria-hidden="true" style={{...points,visibility:points?'visible':'hidden'}}>{base&&<img className="scene-transfer-base" src={base} alt=""/>}<span>{images.slice(0,3).map((src,i)=><img key={i} src={src} alt=""/>)}</span></div>;
}
