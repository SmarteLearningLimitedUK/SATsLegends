import React from 'react';
import '../../../src/components/gameplay-orientation.css';
export default function OrientationGate({onBack}:{onBack:()=>void}){
 const upright=window.innerWidth>window.innerHeight;
 return <div className="gameplay-orientation-gate" data-gameplay-orientation-gate role="dialog" aria-modal="true" aria-labelledby="matharia-rotate-title">
  <h1 id="matharia-rotate-title">{upright?'Turn your device upright':'Turn your device sideways'}</h1>
  <p>This adventure is designed for {upright?'portrait':'landscape'} play.</p><p>Your game is paused.</p>
  <button type="button" onClick={onBack}>{window.location.pathname.startsWith('/wellbeing')?'Back to Calm Grove':'Back to island'}</button>
 </div>;
}
