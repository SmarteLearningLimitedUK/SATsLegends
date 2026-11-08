import React from 'react';
import {Check} from 'lucide-react';
import ArtworkFrame from './ArtworkFrame';

interface Props {
 cue:string;
 detail:string;
 running:boolean;
 paused:boolean;
 finished:boolean;
 canFinish:boolean;
 onPause:()=>void;
 onBegin:()=>void;
 onFinish:()=>void;
}

/** Presentation only: all phase, pace and completion state comes from the source activity. */
export default function BloomControlPanel(p:Props) {
 const label=p.running?(p.paused?'Resume':'Pause'):p.canFinish?'Finish':'Begin';
 const pausing=p.running&&!p.paused;
 return <div className="bloom-control-panel" data-bloom-console data-console-paused={p.paused}>
  <ArtworkFrame name="frames/glacier_panel_v3" corner={.075}/>
  <div className="wellbeing-breath-cue" role="status" aria-live="polite">
   <strong>{p.cue}</strong><span>{p.detail}</span>
  </div>
  <div className="wellbeing-controlbar wellbeing-breath-actions">
   {p.finished?<span className="bloom-complete-mark" aria-hidden="true"><ArtworkFrame name="buttons/scale_key_v4" corner={.1} fit="height"/><Check/></span>:
    <button type="button" className={p.running?'wellbeing-quiet-action':'wellbeing-action'} data-button-skin="none" aria-pressed={p.running?p.paused:undefined} onClick={p.running?p.onPause:p.canFinish?p.onFinish:p.onBegin}>
     {p.running&&<ArtworkFrame name="buttons/scale_key_v4" corner={.1} fit="height"/>}
     {!p.running&&<ArtworkFrame name="buttons/paper_gold_v3" corner={.1} fit="height"/>}
     <span className="bloom-action-content">
      <svg viewBox={pausing?'0 0 16 20':'0 0 18 20'} width={pausing?16:18} height="20" fill="currentColor" aria-hidden="true">
       {pausing?<><rect width="5" height="20" rx="1"/><rect x="11" width="5" height="20" rx="1"/></>:<path d="M0 0 18 10 0 20Z"/>}
      </svg>
      <span>{label}</span>
     </span>
    </button>}
  </div>
 </div>;
}
