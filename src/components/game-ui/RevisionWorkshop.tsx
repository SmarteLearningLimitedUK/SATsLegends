import React, { useMemo, useState } from 'react';
import { getMissionFieldChoices } from '../../systems/content/satsAnswerChoices';
import { getRevisionMissions, markMission } from '../../systems/content/satsAdventure';
import SatsMissionVisual from './SatsMissionVisual';
import SatsConstructionControl, { isConstructionMission } from './SatsConstructionControl';
import SatsTapWorkpad from './SatsTapWorkpad';
import './sats-adventure.css';

export default function RevisionWorkshop({ game }: { game: string }) {
  const missions = useMemo(() => getRevisionMissions(game), [game]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [workpad, setWorkpad] = useState('');
  const q = missions[index];
  if (!q) return null;
  return <section className="revision-workshop" aria-label="Guided SATs practice">
    <h3>Try a SATs mission</h3><p>{q.prompt}</p>{isConstructionMission(q.id)
      ? <SatsConstructionControl mission={q} value={values[0] ?? ''} onChange={value => { setValues([value]); setChecked(false); }} />
      : <SatsMissionVisual visual={q.visual} />}
    <SatsTapWorkpad value={workpad} onChange={setWorkpad} />
    <form onSubmit={e => { e.preventDefault(); setChecked(true); }}>
      {!isConstructionMission(q.id) && q.fields.map((f, i) => <fieldset className="revision-choice-field" key={`${q.id}-${i}`}>
        <legend>{f.label}</legend>
        <div className="revision-choice-grid">
          {getMissionFieldChoices(q, i).map(choice => <button
            key={choice}
            type="button"
            aria-pressed={values[i] === choice}
            className="revision-choice-button"
            onClick={() => {
              setValues(old => { const next = [...old]; next[i] = choice; return next; });
              setChecked(false);
            }}
          >{choice}</button>)}
        </div>
      </fieldset>)}
      <button className="ui-button-primary" type="submit" disabled={q.fields.some((_, i) => !values[i])}>{isConstructionMission(q.id) ? 'Check build' : 'Check choices'}</button>
    </form>
    {checked ? <div role="status" className="revision-solution"><strong>{markMission(q, values) === q.marks ? 'You’ve got it!' : 'Let’s work it through.'}</strong><p>{q.explanation}</p><p>Answer: {q.fields.map(f => `${f.label}: ${f.answer}`).join(' · ')}</p></div> : null}
    <button type="button" className="ui-button-secondary" onClick={() => { setIndex((index + 1) % missions.length); setValues([]); setChecked(false); setWorkpad(''); }}>Next practice mission ({index + 1}/{missions.length})</button>
  </section>;
}
