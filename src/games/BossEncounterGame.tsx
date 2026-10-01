import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ISLANDS } from '../constants';
import { buildSatsPaper, markMission, type SatsMission } from '../systems/content/satsAdventure';
import { getLevelGameTitle } from '../utils/gameNames';
import type { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import SatsMissionVisual from '../components/game-ui/SatsMissionVisual';
import { useDialogFocus } from '../components/game-ui/useDialogFocus';
import { isBossEncounterGameType, type SupportedBossGameType } from './bossEncounterTypes';
import '../components/game-ui/sats-adventure.css';
export { isBossEncounterGameType };
interface Props extends MiniGameShellContractProps {
  gameType: SupportedBossGameType; levelId: number; avatarId: string;
  onVictory: (stars: number, XP: number) => void; onGameOver: (XP: number) => void; onBack: () => void;
}
const CLOCK_EVENT = 'sats-mock-clock';
function practiceRoute(game: string) {
  for (const island of ISLANDS) {
    const level = island.levels.find(l => l.blueprintKey === game && l.isPractice);
    if (level) return { href: `/game/${island.id}/${level.id}`, name: getLevelGameTitle(level) };
  }
  return null;
}
const BossEncounterGame: React.FC<Props> = ({ gameType, sessionEvents, onVictory }) => {
  const paper = useMemo(() => buildSatsPaper(gameType), [gameType]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'review'>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [working, setWorking] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<string[]>([]);
  const [draftWork, setDraftWork] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(paper.seconds);
  const deadline = useRef(0);
  const answersRef = useRef(answers); answersRef.current = answers;
  const draftRef = useRef(draft); draftRef.current = draft;
  const workRef = useRef(draftWork); workRef.current = draftWork;
  const indexRef = useRef(index); indexRef.current = index;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const emitted = useRef(false);
  const delivered = useRef(false);
  const reduced = useReducedMotion();
  const panelRef = useDialogFocus(navOpen || finishOpen, () => { setNavOpen(false); setFinishOpen(false); });
  const q = paper.missions[index];
  const completed = paper.missions.filter(q => answers[q.id]?.some(v => v.trim())).length;
  const score = paper.missions.reduce((sum, q) => sum + markMission(q, answers[q.id] ?? [], approved[q.id]), 0);
  const pending = paper.missions.filter(q => !approved[q.id] && ((q.formalWorking && markMission(q, answers[q.id] ?? []) === 0 && (working[q.id]?.trim() || answers[q.id]?.some(v => v.trim()))) || q.fields.some((f, i) => f.manual && answers[q.id]?.[i]?.trim())));
  const save = () => {
    setAnswers(old => ({ ...old, [q.id]: draft }));
    setWorking(old => ({ ...old, [q.id]: draftWork }));
    return { ...answers, [q.id]: draft };
  };
  const go = (next: number) => {
    save(); const destination = paper.missions[next];
    setIndex(next); setDraft(answers[destination.id] ?? []); setDraftWork(working[destination.id] ?? '');
    setNavOpen(false); setNotice('');
  };
  const finish = () => { save(); setPhase('review'); setFinishOpen(false); setNavOpen(false); };
  useEffect(() => {
    if (phase !== 'play') return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(remaining);
      window.dispatchEvent(new CustomEvent(CLOCK_EVENT, { detail: { timeLeft: remaining, totalTime: paper.seconds } }));
      if (remaining === 0 && phaseRef.current === 'play') {
        const current = paper.missions[indexRef.current];
        setAnswers(old => ({ ...old, [current.id]: draftRef.current }));
        setWorking(old => ({ ...old, [current.id]: workRef.current }));
        setPhase('review'); setFinishOpen(false); setNavOpen(false);
      }
    };
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer);
  }, [phase, paper]);
  useEffect(() => {
    if (phase !== 'review' || emitted.current) return;
    emitted.current = true;
    for (const mission of paper.missions) {
      const full = markMission(mission, answersRef.current[mission.id] ?? []) === mission.marks;
      const event = { type: full ? 'correct_answer' as const : 'incorrect_answer' as const, metadata: { assessment: true, mission: mission.id } };
      if (full) sessionEvents?.onCorrectAnswer?.(event); else sessionEvents?.onIncorrectAnswer?.(event);
    }
  }, [phase, paper, sessionEvents]);
  useEffect(() => {
    if (phase !== 'review') return;
    try {
      const history = JSON.parse(localStorage.getItem('sats-legends-mock-results-v1') || '{}');
      history[paper.number] = { completedAt: new Date().toISOString(), score, maxMarks: paper.marks, secondsUsed: paper.seconds - seconds, answers, working, approved, missions: paper.missions };
      localStorage.setItem('sats-legends-mock-results-v1', JSON.stringify(history));
    } catch { /* Review remains available when storage is unavailable. */ }
  }, [phase, score, answers, working, approved, paper, seconds]);
  const update = (value: string, fieldIndex: number) => setDraft(old => { const next = [...old]; next[fieldIndex] = value; return next; });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.some(v => v.trim())) { setNotice('Enter an answer, or choose Later to return to this mission.'); return; }
    save(); setPulse(p => p + 1); setNotice('Mission saved. You can change it before finishing.');
    if (index < paper.missions.length - 1) go(index + 1); else setNavOpen(true);
  };
  const returnToIsland = () => {
    if (delivered.current) return;
    delivered.current = true;
    sessionEvents?.onGameComplete?.({ type: 'game_complete', score, metadata: { assessment: true, marks: paper.marks } });
    onVictory(score >= paper.marks * .8 ? 3 : score >= paper.marks * .5 ? 2 : 1, score * 30);
  };
  const reviewMission = (mission: SatsMission) => {
    const route = practiceRoute(mission.game);
    const earned = markMission(mission, answers[mission.id] ?? [], approved[mission.id]);
    return <details key={mission.id} className="sats-review-item"><summary>{paper.missions.indexOf(mission) + 1}. {route?.name ?? mission.game} — {earned}/{mission.marks}</summary>
      <p>{mission.prompt}</p><SatsMissionVisual visual={mission.visual} />
      <p>Your answer: {(answers[mission.id] ?? []).filter(Boolean).join(' · ') || 'Not answered'}</p>
      <p><strong>Solution:</strong> {mission.fields.map(f => `${f.label}: ${f.answer}`).join(' · ')}</p><p>{mission.explanation}</p>
      {working[mission.id] ? <p>Your working: {working[mission.id]}</p> : null}
      {(mission.formalWorking && earned < 2 && (working[mission.id]?.trim() || answers[mission.id]?.some(v => v.trim()))) || mission.fields.some((f, i) => f.manual && answers[mission.id]?.[i]?.trim()) ? <label className="sats-method-check"><input type="checkbox" checked={approved[mission.id] ?? false} onChange={e => setApproved(old => ({ ...old, [mission.id]: e.target.checked }))} />Adult method check: award 1 mark for a valid {mission.formalWorking ? 'formal written method' : 'written response or drawing'}.</label> : null}
      {route ? <a href={route.href}>Practise in {route.name}</a> : null}
    </details>;
  };
  return <div className="sats-mock" data-sats-paper={paper.number} data-sats-mission={q.id} data-sats-phase={phase}>
    <GameplaySceneBackdrop gameType={gameType} />
    <PracticeIntroPopup kind="mock" open={phase === 'intro'} title={`Paper ${paper.number}: ${paper.title}`} body={`${paper.seconds / 60} minutes · ${paper.marks} marks · ${paper.missions.length} missions. Use paper for your working, without a calculator. Save answers to charge the Core. Skip and return whenever you need; mistakes cannot end the run. Your answers are reviewed after you finish.`} actionLabel="Launch mock adventure" onAction={() => { deadline.current = Date.now() + paper.seconds * 1000; setPhase('play'); }} />
    {phase === 'review' ? <div className="sats-review" tabIndex={0} aria-label="Mock adventure review">
      <h2>Core run complete</h2><p className="sats-score">{score} / {paper.marks} marks</p>
      <p>{pending.length ? `${pending.length} written response${pending.length === 1 ? '' : 's'} still need an adult check. The score includes automatic marks and any approved method marks.` : 'Review your solutions, then recharge the skills you want to strengthen.'}</p>
      <p>Game mock score; this is not an official SATs scaled score.</p>
      <h3>Your next revision missions</h3><p>Practise an unfinished skill, try its worked example, then return tomorrow and again later in the week. Mix islands before trying another Core run.</p>
      {[...new Set<string>(paper.missions.filter(q => markMission(q, answers[q.id] ?? [], approved[q.id]) < q.marks).map(q => q.game))].slice(0, 4).map(game => { const route = practiceRoute(game); return route ? <a key={game} className="sats-practice-link" href={route.href}>{route.name} →</a> : null; })}
      <h3>Mission review</h3>{paper.missions.map(reviewMission)}<button type="button" className="ui-button-primary" onClick={returnToIsland}>Collect rewards and return</button>
    </div> : <div className="sats-mock-content">
      <GameQuestionCard title={`Mission ${index + 1} of ${paper.missions.length} · ${q.marks} mark${q.marks === 1 ? '' : 's'}`} className="sats-mission-strip" style={{ position: 'relative', top: 0, transform: 'none' }}>{q.prompt}</GameQuestionCard>
      <div className="sats-playfield" data-sats-playfield>
        <div className="sats-charge" aria-label={`${completed} of ${paper.missions.length} missions saved`}>
          <motion.svg className="sats-reactor" key={pulse} viewBox="0 0 64 64" aria-hidden="true" animate={{ scale: reduced ? 1 : [1, 1.1, 1] }} transition={{ duration: .4 }}>
            <circle cx="32" cy="32" r="27" fill="#06203c" stroke="#72dfea" strokeWidth="3" />
            <g className="sats-reactor-ring">{Array.from({length:6},(_,i)=><path key={i} d="M28 6H36L38 13H26Z" transform={`rotate(${i*60} 32 32)`} fill={completed / paper.missions.length >= (i+1)/6 ? '#ffcf57' : '#2c657d'} />)}</g>
            <path d="M32 17L44 28L38 46H26L20 28Z" fill="#65ddea" stroke="#bafaff" strokeWidth="2" /><path d="M32 17V46M20 28H44" stroke="#082e52" strokeWidth="2" />
          </motion.svg>
          <div className="sats-charge-readout"><span>{completed}/{paper.missions.length} crystals charged</span><div><motion.i initial={false} animate={{ width: `${completed / paper.missions.length * 100}%` }} transition={{ duration: .4 }} /></div></div>
        </div>
        <div className="sats-model"><SatsMissionVisual visual={q.visual} /></div>
        <div className="sats-mission-tools"><button type="button" onClick={() => { save(); setNavOpen(true); }}>Mission list</button><button type="button" onClick={() => { save(); setFinishOpen(true); }}>Finish run</button></div>
      </div>
      <form className="sats-response answer-choice-surface" onSubmit={submit}>
        <div className="sats-fields">{q.fields.map((f, i) => <label key={`${q.id}-${i}`}>{f.label}{f.options ? <select value={draft[i] ?? ''} onChange={e => update(e.target.value, i)}><option value="">Choose…</option>{f.options.map(v => <option key={v} value={v}>{v}</option>)}</select> : f.manual ? <textarea value={draft[i] ?? ''} onChange={e => update(e.target.value, i)} rows={2} /> : <input value={draft[i] ?? ''} onChange={e => update(e.target.value, i)} autoComplete="off" spellCheck={false} inputMode={f.answer.includes(':') || f.answer.includes('/') || f.answer.includes(';') ? 'text' : 'decimal'} />}</label>)}</div>
        {q.formalWorking ? <details className="sats-working"><summary>Add written working (for method review)</summary><label>Describe your formal written method<textarea value={draftWork} onChange={e => setDraftWork(e.target.value)} rows={2} /></label></details> : null}
        <div className="sats-response-actions"><button type="button" className="ui-button-secondary" onClick={() => go((index + 1) % paper.missions.length)}>Later</button><button className="ui-button-primary" type="submit">Save & continue</button></div>
        <span role="status" className="sats-notice">{notice}</span>
      </form>
      {navOpen ? <div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Mission list"><h3>Choose a mission</h3><p>● Saved · ○ Unanswered. You can change any answer.</p><div className="sats-mission-list">{paper.missions.map((m, i) => <button type="button" key={m.id} aria-current={i === index ? 'step' : undefined} aria-label={`Mission ${i + 1}, ${answers[m.id]?.some(v => v.trim()) ? 'saved' : 'unanswered'}`} onClick={() => go(i)}>{i + 1} {answers[m.id]?.some(v => v.trim()) ? '●' : '○'}</button>)}</div><button type="button" className="ui-button-secondary" onClick={() => setNavOpen(false)}>Back to mission</button></div> : null}
      {finishOpen ? <div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Finish mock adventure"><h3>Ready to finish?</h3><p>{paper.missions.length - completed} unanswered missions remain. Once you finish, you can review solutions but cannot change answers.</p><button type="button" className="ui-button-primary" onClick={finish}>Finish and review</button><button type="button" className="ui-button-secondary" onClick={() => setFinishOpen(false)}>Keep exploring</button></div> : null}
    </div>}
  </div>;
};
export default BossEncounterGame;
