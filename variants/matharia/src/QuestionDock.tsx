import React,{cloneElement,useLayoutEffect,useRef,useState,type ReactElement} from 'react';
import {createPortal} from 'react-dom';
const owners=new WeakMap<Element,symbol>();
export default function QuestionDock({children}:{children:ReactElement<any>}){
 const ref=useRef<HTMLDivElement>(null),owner=useRef(Symbol()),[target,setTarget]=useState<Element|null>(null);
 useLayoutEffect(()=>{
  const host=ref.current?.closest('[data-game-set]'),dock=host?.querySelector('[data-question-dock]');
  if(!host||!dock||owners.has(host))return;
  owners.set(host,owner.current);setTarget(dock);
  return()=>{if(owners.get(host)===owner.current)owners.delete(host);};
 },[]);
 const child=cloneElement(children,{ref,'data-concept-question':target?'true':undefined});
 return target?<>{createPortal(child,target)}</>:child;
}
