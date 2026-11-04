import React,{useEffect,useRef,useSyncExternalStore} from 'react';
let current:{owner:symbol;text:string}|null=null;
const listeners=new Set<()=>void>();
const notify=()=>listeners.forEach(fn=>fn());
/** Retains method guidance inside the existing Help destination. */
export function usePresentationHint(text:string){
 const owner=useRef(Symbol());
 useEffect(()=>{current={owner:owner.current,text};notify();return()=>{if(current?.owner===owner.current){current=null;notify()}}},[text]);
}
export default function PresentationHint(){
 const text=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>current?.text??'',()=>'');
 return text?<p className="concept-live-hint" data-gameplay-tip>{text}</p>:null;
}
