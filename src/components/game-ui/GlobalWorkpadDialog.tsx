import React from 'react';
import SatsTapWorkpad from './SatsTapWorkpad';
import { useDialogFocus } from './useDialogFocus';
import './sats-adventure.css';

export default function GlobalWorkpadDialog({ open, value, onChange, onClose }: {
  open: boolean; value: string; onChange: (value: string) => void; onClose: () => void;
}) {
  const dialogRef = useDialogFocus(open, onClose);
  if (!open) return null;
  return <div className="global-workpad-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} tabIndex={-1} className="global-workpad-dialog" role="dialog" aria-modal="true" aria-label="On-screen maths working board">
      <div className="global-workpad-heading"><h2>Working board</h2><button type="button" data-dialog-primary onClick={onClose}>Back to game</button></div>
      <SatsTapWorkpad value={value} onChange={onChange} defaultOpen />
    </div>
  </div>;
}
