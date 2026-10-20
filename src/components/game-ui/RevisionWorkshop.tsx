import React, { useMemo, useState } from 'react';
import SatsAnswerFields from './SatsAnswerFields';
import { getRevisionMissions, markMission } from '../../systems/content/satsAdventure';
import SatsMissionVisual from './SatsMissionVisual';
import SatsConstructionControl, { isConstructionMission } from './SatsConstructionControl';
import SatsTapWorkpad from './SatsTapWorkpad';
import './sats-adventure.css';
import { revisionAnswerSummary } from './satsRevisionFeedback';
import { playGameSound } from '../../audio/gameAudio';

export default function RevisionWorkshop({ game }: { game: string }) {
  const missions = useMemo(() => getRevisionMissions(game), [game]);
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [workpad, setWorkpad] = useState('');
  const q = missions[index];
  if (!q) return null;
  return <section className="revision-workshop" aria-label="Guided SATs practice">
    <h3>Try a SATs mission</h3>
    <label className="revision-question-picker">Choose a practice question<select aria-label="Choose a practice question" value={index} onChange={e => { setIndex(Number(e.target.value)); setValues([]); setChecked(false); setWorkpad(''); }}>{missions.map((mission, i) => <option key={mission.id} value={i}>{mission.prompt}</option>)}</select></label>
    <p>{q.prompt}</p>{isConstructionMission(q.id)
      ? <SatsConstructionControl mission={q} value={values[0] ?? ''} onChange={value => { setValues([value]); setChecked(false); }} />
      : <SatsMissionVisual visual={q.visual} />}
    <SatsTapWorkpad value={workpad} onChange={value => { setWorkpad(value); setChecked(false); }} />
    <form onSubmit={e => { e.preventDefault(); if (checked) return; setChecked(true); playGameSound(markMission(q, values, workpad) === q.marks ? 'correct' : 'incorrect'); }}>
      {!isConstructionMission(q.id) && <div key={q.id}><SatsAnswerFields mission={q} values={values} guided onChange={(value,i)=>{setValues(old=>{const next=[...old];next[i]=value;return next;});setChecked(false);}} /></div>}
      <button className="ui-button-primary" type="submit" disabled={q.fields.some((field, i) => field.response!=='working' && !values[i])}>{isConstructionMission(q.id) ? 'Check build' : 'Check answer'}</button>
    </form>
    {checked ? <div role="status" className="revision-solution"><strong>{markMission(q, values, workpad) === q.marks ? 'You’ve got it!' : 'Check your answer.'}</strong><p>{q.explanation}</p><p>Answer: {revisionAnswerSummary(q)}</p></div> : null}
    <button type="button" className="ui-button-secondary" onClick={() => { setIndex((index + 1) % missions.length); setValues([]); setChecked(false); setWorkpad(''); }}>Next practice mission ({index + 1}/{missions.length})</button>
  </section>;
}
