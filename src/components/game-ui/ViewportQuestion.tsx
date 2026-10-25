import React, {cloneElement, useLayoutEffect, useRef, useState, type ReactElement} from 'react';
import {createPortal} from 'react-dom';
import {isReferenceGame} from './ReferenceScreenArt';

const owners=new WeakMap<HTMLElement,symbol>();
interface Dock {host:HTMLElement;layer:HTMLElement}

/** Centre the primary question outside actor columns and reserve a real header band. */
export default function ViewportQuestion({children}:{children:ReactElement<any>}) {
 const card=useRef<HTMLDivElement>(null),owner=useRef(Symbol('viewport-question'));
 const [dock,setDock]=useState<Dock|null>(null);
 useLayoutEffect(()=>{
  const node=card.current,host=node?.closest<HTMLElement>('[data-game-set]');
  const viewport=host?.closest<HTMLElement>('.app-viewport'),layer=host?.querySelector<HTMLElement>('[data-question-dock]');
  if(!node||!host||!viewport||!layer)return;
  if(isReferenceGame(viewport.dataset.activeGame))return;
  const measure=()=>{
   if(owners.has(host)&&owners.get(host)!==owner.current)return;
   if(host.querySelector('[data-game-question="true"]')!==node)return;
   const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();
   if(r.width>0&&Math.abs(r.left+r.width/2-(v.left+v.width/2))>1){
    owners.set(host,owner.current);setDock({host,layer});
   }
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(node);observer.observe(host);
  window.addEventListener('resize',measure);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 useLayoutEffect(()=>{
  if(!dock)return;
  owners.set(dock.host,owner.current);
  const reserve=()=>{
   const node=card.current;if(!node)return;
   dock.host.dataset.questionLayout='viewport';
   dock.host.style.setProperty('--viewport-question-space',`${node.offsetHeight+8}px`);
  };
  reserve();const observer=new ResizeObserver(reserve);if(card.current)observer.observe(card.current);
  return()=>{
   observer.disconnect();
   if(owners.get(dock.host)===owner.current){
    owners.delete(dock.host);delete dock.host.dataset.questionLayout;
    dock.host.style.removeProperty('--viewport-question-space');
   }
  };
 },[dock]);
 const panel=cloneElement(children,{ref:card,...(dock?{'data-viewport-question':'true'}:{})});
 if(!dock)return panel;
 // The shared header supplies the space; the old column must not reserve it a second time.
 return <><span data-question-spacer hidden aria-hidden="true"/>{createPortal(panel,dock.layer)}</>;
}
