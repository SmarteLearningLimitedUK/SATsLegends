import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

interface Props { purpose?: string; fact?: string; affirmation?: string; paused: boolean }
const READ_MS = 12000;
const FADE_MS = 2400;
const QUIET_MS = 800;

/** One supplementary message at a time; instructions and controls remain visible. */
export default function WellbeingNotes({ purpose, fact, affirmation, paused }: Props) {
  const latest = useRef({ purpose, fact, affirmation });
  latest.current = { purpose, fact, affirmation };
  const [copy, setCopy] = useState(latest.current);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(true);
  const [kept, setKept] = useState(false);
  const elapsed = useRef(0);
  const notes = [
    { key: 'fact', label: 'GOOD TO KNOW', text: copy.fact },
    { key: 'affirmation', label: 'TAKE WITH YOU', text: copy.affirmation },
    { key: 'purpose', label: 'A MOMENT TO NOTICE', text: copy.purpose },
  ].filter(note => Boolean(note.text));
  useEffect(() => {
    if (paused || kept || notes.length < 2) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) elapsed.current += Math.min(300, now - previous);
      previous = now;
      if (elapsed.current >= READ_MS) setShown(false);
      if (elapsed.current >= READ_MS + FADE_MS + QUIET_MS) {
        setCopy(latest.current);
        setActive(index => (index + 1) % notes.length);
        setShown(true);
        elapsed.current = 0;
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [kept, paused, notes.length]);
  if (!notes.length) return null;
  return <div className="wellbeing-note-row" data-wellbeing-notes>
    <div className="wellbeing-note-slot">
      {notes.map((note, index) => <p key={note.key}
        className={`wellbeing-${note.key} wellbeing-slow-note`}
        data-wellbeing-purpose={note.key === 'purpose' ? true : undefined}
        data-wellbeing-fact={note.key === 'fact' ? true : undefined}
        data-wellbeing-affirmation={note.key === 'affirmation' ? true : undefined}
        data-note-active={index === active && shown}
        aria-hidden={index !== active || !shown}>
        <span>{note.label}</span>{note.text}
      </p>)}
    </div>
    {notes.length > 1 ? <button type="button" className="wellbeing-note-toggle" data-button-skin="none"
      aria-pressed={kept} aria-label={kept ? 'Resume hints and tips' : 'Keep this tip visible'}
      onClick={() => { setKept(value => !value); setShown(true); elapsed.current = 0; }}>
      {kept ? <Play size={16} aria-hidden="true"/> : <Pause size={16} aria-hidden="true"/>}
      <span>{kept ? 'Continue tips' : 'Keep this tip'}</span>
    </button> : null}
  </div>;
}
