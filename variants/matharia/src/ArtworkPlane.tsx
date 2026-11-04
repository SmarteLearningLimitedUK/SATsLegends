import React,{useLayoutEffect,useRef,useState} from 'react';
/** One aspect-preserving coordinate system for an illustrated prop and its live controls. */
export default function ArtworkPlane({aspect,align='center',children,style,...rest}:React.HTMLAttributes<HTMLDivElement>&{aspect:number;align?:'center'|'end';children:React.ReactNode}){
 const node=useRef<HTMLDivElement>(null),[size,setSize]=useState({w:0,h:0});
 useLayoutEffect(()=>{const element=node.current!;const update=()=>{const r=element.getBoundingClientRect(),w=Math.min(r.width,r.height*aspect),h=w/aspect;setSize(old=>Math.abs(old.w-w)+Math.abs(old.h-h)<.1?old:{w,h})};update();const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()},[aspect]);
 return <div ref={node} {...rest} style={{display:'grid',justifyItems:'center',alignItems:align,...style}}><div className="artwork-plane" style={{position:'relative',isolation:'isolate',containerType:'size',width:size.w,height:size.h}}>{children}</div></div>;
}
