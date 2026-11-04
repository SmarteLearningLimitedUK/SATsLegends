import React,{useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {Pause,Play} from 'lucide-react';
import {useDialogFocus} from '../../../src/components/game-ui/useDialogFocus';
const listeners=new Set<()=>void>();
let paused=false;
export function setPresentationPaused(value:boolean){paused=value;for(const notify of listeners)notify();}
export function usePresentationPaused(){return useSyncExternalStore(notify=>{listeners.add(notify);return()=>listeners.delete(notify);},()=>paused,()=>false);}
/** The App adapter combines this state with the existing shared session pause conditions. */
export function PauseControl({style}:{style?:React.CSSProperties}={}){
 const open=usePresentationPaused(),resume=()=>setPresentationPaused(false),ref=useDialogFocus(open,resume);
 return <>
  <button style={style} className="concept-pause" type="button" aria-label="Pause game" onClick={()=>setPresentationPaused(true)}><Pause aria-hidden="true"/></button>
  {open&&createPortal(<div className="concept-pause-backdrop"><div ref={ref} className="concept-pause-dialog" role="dialog" aria-modal="true" aria-labelledby="concept-pause-title" tabIndex={-1}>
   <h2 id="concept-pause-title">Game paused</h2><p>Your timer and game are paused.</p>
   <button type="button" data-dialog-primary onClick={resume}><Play aria-hidden="true"/>Resume</button>
  </div></div>,document.body)}
 </>;
}
