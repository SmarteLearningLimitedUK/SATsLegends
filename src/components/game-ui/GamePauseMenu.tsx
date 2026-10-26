import React from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,Lightbulb,LayoutGrid,Play,Volume2,Music2} from 'lucide-react';
import {useDialogFocus} from './useDialogFocus';

interface Props {onClose:()=>void;onBack:()=>void;onHelp?:()=>void;onWork?:()=>void;muted:boolean;music:boolean;onSound:()=>void;onMusic:()=>void;}
export default function GamePauseMenu({onClose,onBack,onHelp,onWork,muted,music,onSound,onMusic}:Props){
 const focus=useDialogFocus(true,onClose);
 const act=(action:()=>void)=>{onClose();action();};
 return createPortal(<div className="production-pause-overlay" data-game-pause-menu>
  <div ref={focus} className="production-pause-panel" role="dialog" aria-modal="true" aria-labelledby="production-pause-title" tabIndex={-1}>
   <h2 id="production-pause-title">Game paused</h2>
   <p>Your round will continue where you left it.</p>
   <button type="button" className="production-resume" data-dialog-primary onClick={onClose}><Play aria-hidden="true"/>Resume game</button>
   <div className="production-pause-tools">
    {onHelp&&<button type="button" onClick={()=>act(onHelp)}><Lightbulb aria-hidden="true"/>Rules and tips</button>}
    {onWork&&<button type="button" onClick={()=>act(onWork)}><LayoutGrid aria-hidden="true"/>Working board</button>}
   </div>
   <button type="button" role="switch" aria-checked={!muted} aria-label="Sound effects" onClick={onSound}><Volume2 aria-hidden="true"/><span>Sound effects</span><strong>{muted?'Off':'On'}</strong></button>
   <button type="button" role="switch" aria-checked={music} aria-label="Music" onClick={onMusic}><Music2 aria-hidden="true"/><span>Music</span><strong>{music?'On':'Off'}</strong></button>
   <button type="button" aria-label="Back" onClick={()=>act(onBack)}><ArrowLeft aria-hidden="true"/>Back to island</button>
  </div>
 </div>,document.body);
}
