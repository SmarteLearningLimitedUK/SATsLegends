import React,{useLayoutEffect,useRef,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import '../../../src/components/gameplay-orientation.css';
import './orientation-guard.css';
type Orientation='portrait'|'landscape';
const subscribeParentOverlay=(notify:()=>void)=>{window.addEventListener('matharia-parent-overlay',notify);return()=>window.removeEventListener('matharia-parent-overlay',notify);};
export function useWrongOrientation(requiredOrientation:Orientation){
 const query=`(orientation: ${requiredOrientation})`;
 return useSyncExternalStore(
  notify=>{const media=window.matchMedia(query);media.addEventListener('change',notify);return()=>media.removeEventListener('change',notify);},
  ()=>!window.matchMedia(query).matches,
  ()=>false,
 );
}

export default function OrientationGate({onBack,requiredOrientation,wrongOrientation}:{onBack?:()=>void;requiredOrientation:Orientation;wrongOrientation:boolean}){
 const parentOverlay=useSyncExternalStore(subscribeParentOverlay,()=>document.documentElement.dataset.parentOverlay==='true',()=>false);
 const blocked=wrongOrientation&&!parentOverlay;
 const panel=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  if(!blocked)return;
  const previous=document.activeElement as HTMLElement|null;
  const held=new Map<HTMLElement,boolean>();
  const holdPortals=()=>{for(const element of document.body.children){if(element instanceof HTMLElement&&element!==panel.current&&!held.has(element)){held.set(element,element.inert);element.inert=true;}}};
  holdPortals();
  const observer=new MutationObserver(holdPortals);observer.observe(document.body,{childList:true});
  const keepFocus=(event:FocusEvent)=>{if(event.target instanceof Node&&!panel.current?.contains(event.target))panel.current?.focus({preventScroll:true});};
  document.addEventListener('focusin',keepFocus,true);
  panel.current?.focus();
  return()=>{
   observer.disconnect();document.removeEventListener('focusin',keepFocus,true);
   for(const [element,inert] of held)if(element.isConnected)element.inert=inert;
   if(previous?.isConnected&&previous!==document.body&&!previous.closest('[inert]'))previous.focus({preventScroll:true});
   else {
    const dialog=[...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')].filter(node=>node!==panel.current&&node.getClientRects().length&&!node.closest('[inert]')).at(-1);
    (dialog?.querySelector<HTMLElement>('[data-dialog-primary],button')??dialog)?.focus({preventScroll:true});
   }
  };
 },[blocked]);
 const upright=requiredOrientation==='portrait';
 const dialog=<div ref={panel} tabIndex={-1} className="gameplay-orientation-gate" data-gameplay-orientation-gate data-required-orientation={requiredOrientation} role="dialog" aria-modal="true" aria-labelledby="matharia-rotate-title" onKeyDown={event=>{event.stopPropagation();if(event.key==='Tab'){event.preventDefault();(panel.current?.querySelector<HTMLButtonElement>('button')??panel.current)?.focus();}}}>
  <h1 id="matharia-rotate-title">{upright?'Turn your device upright':'Turn your device sideways'}</h1>
  <p>This adventure is designed for {upright?'portrait':'landscape'} play.</p><p>Your game is paused.</p>
  {onBack&&<button type="button" onClick={onBack}>{window.location.pathname.startsWith('/wellbeing')?'Back to Calm Grove':'Back to island'}</button>}
 </div>;
 return createPortal(dialog,document.body);
}
