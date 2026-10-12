import React from 'react';

const TILES = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+', '/', '(', ')'];

/** Optional in-game working space: every mark is made with a tap, never a keyboard or paper. */
export default function SatsTapWorkpad({ value, onChange, defaultOpen = false }: { value: string; onChange: (value: string) => void; defaultOpen?: boolean }) {
  const append = (tile: string) => onChange((value + tile).slice(0, 240));
  return <details className="sats-tap-workpad" open={defaultOpen || undefined}>
    <summary>{defaultOpen ? 'On-screen working board' : 'Open on-screen working board'}</summary>
    <p>Tap number and operation tiles to plan your steps. This board does not calculate or submit an answer.</p>
    <div className="sats-workpad-display" role="status" aria-label="Your on-screen working">{value || 'Your steps appear here'}</div>
    <div className="sats-workpad-tiles">{TILES.map(tile => <button type="button" key={tile} aria-label={`Add ${tile}`} onClick={() => append(tile)}>{tile}</button>)}
      <button type="button" onClick={() => append('\n')} aria-label="Start a new line">New line</button>
      <button type="button" onClick={() => onChange(value.slice(0, -1))} aria-label="Remove last symbol">Undo</button>
      <button type="button" onClick={() => onChange('')} aria-label="Clear working board">Clear</button>
    </div>
  </details>;
}
