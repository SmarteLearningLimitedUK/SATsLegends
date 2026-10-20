import React, { useEffect, useRef } from 'react';
import { RotateCw, Smartphone } from 'lucide-react';
import './gameplay-orientation.css';

/** The session is paused by App before this gate is shown. No orientation API
 * is required: rotating the device resumes the same mounted game. */
export default function GameplayOrientationGate({ onBack }: { onBack: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div ref={panel} className="gameplay-orientation-gate" role="dialog" aria-modal="true" aria-labelledby="rotate-title" aria-describedby="rotate-description" tabIndex={-1} data-gameplay-orientation-gate>
    <div className="gameplay-orientation-symbol" aria-hidden="true"><Smartphone /><RotateCw /></div>
    <h1 id="rotate-title">Turn your phone sideways</h1>
    <p id="rotate-description">Play in landscape to see the whole adventure.</p>
    <p className="gameplay-orientation-status">Your game is paused.</p>
    <button type="button" onClick={onBack}>Back to island</button>
  </div>;
}
