import React, { useMemo, useState } from 'react';
import { getRevisionMissions, markMission } from '../../systems/content/satsAdventure';
import SatsMissionVisual from './SatsMissionVisual';
import './sats-adventure.css';

export default function RevisionWorkshop({ game }: { game: string }) {
  const missions = useMemo(() => getRevisionMissions(game), [game]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const q = missions[index];
  if (!q) return null;
  return <section className="revision-workshop" aria-label="Guided SATs practice">
    <h3>Try a SATs mission</h3><p>{q.prompt}</p><SatsMissionVisual visual={q.visual} />
    <form onSubmit={e => { e.preventDefault(); setChecked(true); }}>
      {q.fields.map((f, i) => <label key={i}>{f.label}{f.options ? <select value={values[i] ?? ''} onChange={e => { setValues(old => { const next = [...old]; next[i] = e.target.value; return next; }); setChecked(false); }}><option value="">Choose…</option>{f.options.map(v => <option key={v}>{v}</option>)}</select> : <input autoComplete="off" value={values[i] ?? ''} onChange={e => { setValues(old => { const next = [...old]; next[i] = e.target.value; return next; }); setChecked(false); }} />}</label>)}
      <button className="ui-button-primary" type="submit">Check my method</button>
    </form>
    {checked ? <div role="status" className="revision-solution"><strong>{markMission(q, values) === q.marks ? 'You’ve got it!' : 'Let’s work it through.'}</strong><p>{q.explanation}</p><p>Answer: {q.fields.map(f => `${f.label}: ${f.answer}`).join(' · ')}</p></div> : null}
    <button type="button" className="ui-button-secondary" onClick={() => { setIndex((index + 1) % missions.length); setValues([]); setChecked(false); }}>Next practice mission ({index + 1}/{missions.length})</button>
  </section>;
}
