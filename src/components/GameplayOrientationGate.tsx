import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, Smartphone } from 'lucide-react';
import { useDialogFocus } from './game-ui/useDialogFocus';
import './gameplay-orientation.css';
import type { GameOrientation } from '../app/gameOrientation';

/** The session is paused by App before this gate is shown. No orientation API
 * is required. Entry waits for Start; mid-round rotation preserves the game. */
export default function GameplayOrientationGate({ onBack, orientation = 'landscape', ready = false, onStart, gameTitle }: {
  onBack: () => void; orientation?: GameOrientation; ready?: boolean; onStart?: () => void; gameTitle?: string;
}) {
  const panel = useDialogFocus(true, onBack);
  // Escape the game's transformed stage so briefing/help portals cannot cover
  // this required interruption or intercept its Back button.
  return createPortal(<div ref={panel} className="gameplay-orientation-gate" role="dialog" aria-modal="true" aria-labelledby="rotate-title" aria-describedby="rotate-description" tabIndex={-1} data-gameplay-orientation-gate data-required-orientation={orientation} data-ready={ready}>
    <div className="gameplay-ready-panel">
    <div className="gameplay-orientation-symbol" aria-hidden="true"><Smartphone /><RotateCw /></div>
    <h1 id="rotate-title">{ready ? gameTitle || 'Ready to play?' : orientation === 'portrait' ? 'Hold your phone upright' : 'Turn your phone sideways'}</h1>
    <p id="rotate-description">{ready ? 'Press Start when you’re ready to begin.' : `Play in ${orientation} to see the whole adventure.`}</p>
    <p className="gameplay-orientation-status">Your game is paused.</p>
    {!ready && <p className="gameplay-orientation-status">If the screen does not turn, switch off your phone’s rotation lock.</p>}
    {onStart && <button type="button" className="gameplay-start-button" disabled={!ready} onClick={onStart} data-gameplay-start>Start</button>}
    <button type="button" onClick={onBack}>Back to island</button>
    </div>
  </div>, document.body);
}
