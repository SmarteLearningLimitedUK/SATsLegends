import React, {useEffect, useRef} from 'react';
import {Info} from 'lucide-react';
import ArtworkFrame from './ArtworkFrame';

export default function WellbeingGuidance({purpose}: {purpose?: string}) {
 const root = useRef<HTMLDetailsElement>(null);
 const summary = useRef<HTMLElement>(null);
 useEffect(() => {
  const outside = (event: PointerEvent) => {
   if (root.current?.open && !root.current.contains(event.target as Node)) root.current.open = false;
  };
  const key = (event: KeyboardEvent) => {
   if (event.key === 'Escape' && root.current?.open) {
    root.current.open = false;
    summary.current?.focus();
   }
  };
  document.addEventListener('pointerdown', outside, true);
  document.addEventListener('keydown', key);
  return () => {
   document.removeEventListener('pointerdown', outside, true);
   document.removeEventListener('keydown', key);
  };
 }, []);
 if (!purpose) return null;
 return <details ref={root} className="matharia-pond-guidance">
  <summary ref={summary} aria-label="Calming tips">
   <ArtworkFrame name="buttons/scale_key_v4" corner={.07} fit="height"/>
   <Info aria-hidden="true"/><span>Tips</span>
  </summary>
  <div className="matharia-pond-note-panel">{purpose}</div>
 </details>;
}
