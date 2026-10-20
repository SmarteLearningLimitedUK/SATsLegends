import { useGameSave } from '../website/GameSaveContext';
import { playGameSound } from '../audio/gameAudio';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { buildSatsPaper, markMission, type SatsMission } from '../systems/content/satsAdventure';
import SatsAnswerFields from '../components/game-ui/SatsAnswerFields';
import type { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import SatsMissionVisual from '../components/game-ui/SatsMissionVisual';
import { revisionAnswerSummary } from '../components/game-ui/satsRevisionFeedback';
import CorePaperFrame from '../components/game-ui/CorePaperFrame';
import '../components/game-ui/core-paper-presentation.css';
import SatsConstructionControl, { isConstructionMission } from '../components/game-ui/SatsConstructionControl';
import SatsTapWorkpad from '../components/game-ui/SatsTapWorkpad';
import { useDialogFocus } from '../components/game-ui/useDialogFocus';
import { isBossEncounterGameType, type SupportedBossGameType } from './bossEncounterTypes';
import '../components/game-ui/sats-adventure.css';
export { isBossEncounterGameType };
interface Props extends MiniGameShellContractProps {
  gameType: SupportedBossGameType; levelId: number; avatarId: string;
  onVictory: (stars: number, score: number, accuracy?: number) => void;
  onGameOver: (score: number, accuracy?: number) => void;
  onBack: () => void;
}
const CLOCK_EVENT = 'sats-mock-clock';
const HISTORY_KEY = 'sats-legends-mock-results-v1';
const CORE_CLEAR_RATIO = .5;
interface MockAttempt {
  id: string;
  completedAt: string;
  score: number;
  maxMarks: number;
  secondsUsed: number;
}
interface MockCheckpoint {
  version: 1;
  seed: number;
  deadline: number;
  index: number;
  answers: Record<string, string[]>;
  workpad: Record<string, string>;
  draft: string[];
  draftWorkpad: string;
}
// Reasoning selection changed; old saved indices must not reopen on a different mission.
const checkpointKey = (gameType: string, levelId: number) => `sats-legends-mock-checkpoint-v4:${gameType}:${levelId}`;
function readCheckpoint(key: string): MockCheckpoint | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null') as Partial<MockCheckpoint> | null;
    if (saved?.version !== 1 || !Number.isFinite(saved.seed) || !Number.isFinite(saved.deadline)
      || !Number.isInteger(saved.index) || typeof saved.answers !== 'object' || !saved.answers
      || typeof saved.workpad !== 'object' || !saved.workpad || !Array.isArray(saved.draft)
      || !Object.values(saved.answers).every(value => Array.isArray(value) && value.every(entry => typeof entry === 'string'))
      || !Object.values(saved.workpad).every(value => typeof value === 'string')
      || !saved.draft.every(value => typeof value === 'string') || typeof saved.draftWorkpad !== 'string') return null;
    return saved as MockCheckpoint;
  } catch { return null; }
}
const BossEncounterGame: React.FC<Props> = ({ gameType, levelId, sessionEvents, onVictory, onGameOver }) => {
  const gameSave = useGameSave();
  const historyKey = gameSave?.storageKey ? `${HISTORY_KEY}:${gameSave.storageKey}` : HISTORY_KEY;
  const baseCheckpointKey = checkpointKey(gameType, levelId);
  const key = gameSave?.storageKey ? `${baseCheckpointKey}:${gameSave.storageKey}` : baseCheckpointKey;
  const checkpoint = useMemo(() => readCheckpoint(key), [key]);
  const seed = useMemo(() => checkpoint?.seed ?? Date.now(), [checkpoint]);
  const paper = useMemo(() => buildSatsPaper(gameType, seed), [gameType, seed]);
  const savedIndex = checkpoint ? Math.max(0, Math.min(checkpoint.index, paper.missions.length - 1)) : 0;
  const restoredAnswers = checkpoint ? { ...checkpoint.answers, [paper.missions[savedIndex].id]: checkpoint.draft } : {};
  const restoredWorkpad = checkpoint ? { ...checkpoint.workpad, [paper.missions[savedIndex].id]: checkpoint.draftWorkpad } : {};
  const [phase, setPhase] = useState<'intro' | 'play' | 'review'>(checkpoint ? checkpoint.deadline > Date.now() ? 'play' : 'review' : 'intro');
  const [index, setIndex] = useState(savedIndex);
  const [answers, setAnswers] = useState<Record<string, string[]>>(restoredAnswers);
  const [workpad, setWorkpad] = useState<Record<string, string>>(restoredWorkpad);
  const [draft, setDraft] = useState<string[]>(checkpoint?.draft ?? []);
  const [draftWorkpad, setDraftWorkpad] = useState(checkpoint?.draftWorkpad ?? '');
  const [navOpen, setNavOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [notice, setNotice] = useState('');
  const [seconds, setSeconds] = useState(checkpoint ? Math.max(0, Math.ceil((checkpoint.deadline - Date.now()) / 1000)) : paper.seconds);
  const deadline = useRef(checkpoint?.deadline ?? 0);
  const answersRef = useRef(answers); answersRef.current = answers;
  const draftRef = useRef(draft); draftRef.current = draft;
  const workpadRef = useRef(draftWorkpad); workpadRef.current = draftWorkpad;
  const indexRef = useRef(index); indexRef.current = index;
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const emitted = useRef(false);
  const delivered = useRef(false);
  const reduced = useReducedMotion();
  const panelRef = useDialogFocus(navOpen || finishOpen, () => { setNavOpen(false); setFinishOpen(false); });
  const q = paper.missions[index];
  useEffect(() => {
    try {
      if (phase === 'review') sessionStorage.removeItem(key);
      else if (phase === 'play') sessionStorage.setItem(key, JSON.stringify({
        version: 1, seed, deadline: deadline.current, index, answers, workpad, draft, draftWorkpad,
      } satisfies MockCheckpoint));
    } catch { /* The mock remains playable if tab storage is unavailable. */ }
  }, [key, seed, phase, index, answers, workpad, draft, draftWorkpad]);
  const completed = paper.missions.filter(q => answers[q.id]?.some(v => v.trim())).length;
  const score = paper.missions.reduce((sum, mission) => sum + markMission(mission, answers[mission.id] ?? [], workpad[mission.id] ?? ''), 0);
  const clearTarget = Math.ceil(paper.marks * CORE_CLEAR_RATIO);
  const cleared = score >= clearTarget;
  const attemptId = `${gameType}:${seed}:${deadline.current}`;
  const previousAttempts = useMemo(() => {
    if (phase !== 'review') return [] as MockAttempt[];
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey) || '{}')?.[paper.number];
      if (Array.isArray(stored?.attempts)) return stored.attempts as MockAttempt[];
      return Number.isFinite(stored?.score) ? [{
        id: `legacy:${paper.number}:${stored.completedAt ?? 'unknown'}`,
        completedAt: stored.completedAt ?? new Date().toISOString(),
        score: stored.score,
        maxMarks: stored.maxMarks ?? paper.marks,
        secondsUsed: stored.secondsUsed ?? paper.seconds,
      }] : [];
    } catch { return [] as MockAttempt[]; }
  }, [phase, paper.number, paper.marks, paper.seconds, historyKey]);
  const revisionPriorities = useMemo(() => {
    return paper.missions.map((mission, index) => ({
      mission, index, marksToReview: mission.marks - markMission(mission, answers[mission.id] ?? [], workpad[mission.id] ?? ''),
    })).filter(({ marksToReview }) => marksToReview > 0)
      .sort((a, b) => b.marksToReview - a.marksToReview || a.index - b.index)
      .slice(0, 4);
  }, [paper.missions, answers, workpad]);
  const save = () => {
    setAnswers(old => ({ ...old, [q.id]: draft }));
    setWorkpad(old => ({ ...old, [q.id]: draftWorkpad }));
  };
  const go = (next: number) => {
    save(); const destination = paper.missions[next];
    setIndex(next); setDraft(answers[destination.id] ?? []); setDraftWorkpad(workpad[destination.id] ?? '');
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
        setWorkpad(old => ({ ...old, [current.id]: workpadRef.current }));
        setPhase('review'); setFinishOpen(false); setNavOpen(false);
      }
    };
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer);
  }, [phase, paper]);
  useEffect(() => {
    if (phase !== 'review' || emitted.current) return;
    emitted.current = true;
    // Marking the whole paper emits many answer events; announce review once.
    playGameSound('complete');
    for (const mission of paper.missions) {
      const full = markMission(mission, answersRef.current[mission.id] ?? []) === mission.marks;
      const event = { type: full ? 'correct_answer' as const : 'incorrect_answer' as const, metadata: { assessment: true, mission: mission.id } };
      if (full) sessionEvents?.onCorrectAnswer?.(event); else sessionEvents?.onIncorrectAnswer?.(event);
    }
  }, [phase, paper, sessionEvents]);
  useEffect(() => {
    if (phase !== 'review') return;
    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '{}');
      const prior = history[paper.number];
      const attempts: MockAttempt[] = Array.isArray(prior?.attempts) ? prior.attempts :
        Number.isFinite(prior?.score) ? [{
          id: `legacy:${paper.number}:${prior.completedAt ?? 'unknown'}`,
          completedAt: prior.completedAt ?? new Date().toISOString(),
          score: prior.score,
          maxMarks: prior.maxMarks ?? paper.marks,
          secondsUsed: prior.secondsUsed ?? paper.seconds,
        }] : [];
      if (!attempts.some(attempt => attempt.id === attemptId)) attempts.push({
        id: attemptId,
        completedAt: new Date().toISOString(),
        score,
        maxMarks: paper.marks,
        secondsUsed: paper.seconds - seconds,
      });
      history[paper.number] = {
        completedAt: new Date().toISOString(), score, maxMarks: paper.marks,
        secondsUsed: paper.seconds - seconds, answers, workpad, missions: paper.missions, attempts,
      };
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch { /* Review remains available when storage is unavailable. */ }
  }, [phase, score, answers, workpad, paper, seconds, attemptId, historyKey]);
  const update = (value: string, fieldIndex: number) => setDraft(old => { const next = [...old]; next[fieldIndex] = value; return next; });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.some(v => v.trim())) { setNotice('Choose an answer, or choose Later to return to this mission.'); return; }
    save(); setPulse(p => p + 1); setNotice('Mission saved. You can change it before finishing.');
    if (index < paper.missions.length - 1) go(index + 1); else setNavOpen(true);
  };
  const returnToIsland = () => {
    if (delivered.current) return;
    delivered.current = true;
    if (cleared) {
      sessionEvents?.onGameComplete?.({ type: 'game_complete', score, metadata: { assessment: true, marks: paper.marks } });
      onVictory(1, score, score / paper.marks);
    } else {
      sessionEvents?.onGameFailed?.({ type: 'game_failed', score, reason: 'below-core-target', metadata: { assessment: true, marks: paper.marks } });
      onGameOver(score, score / paper.marks);
    }
  };
  const reviewMission = (mission: SatsMission) => {
    const earned = markMission(mission, answers[mission.id] ?? [], workpad[mission.id] ?? '');
    return <details key={mission.id} id={`sats-review-${mission.id}`} className="sats-review-item"><summary>Mission {paper.missions.indexOf(mission) + 1}: {mission.prompt} — {earned}/{mission.marks}</summary>
      <p>{mission.prompt}</p><SatsMissionVisual visual={mission.visual} />
      <p>Your answer: {revisionAnswerSummary(mission, answers[mission.id] ?? [])}</p>
      <p><strong>Solution:</strong> {revisionAnswerSummary(mission)}</p><p>{mission.explanation}</p>
      {workpad[mission.id] ? <p>Your on-screen steps: {workpad[mission.id]}</p> : null}
    </details>;
  };
  return <div className={`sats-mock${isConstructionMission(q.id) ? ' sats-mock--construction' : ''}`} data-sats-paper={paper.number} data-sats-mission={q.id} data-sats-phase={phase}>
    <GameplaySceneBackdrop gameType={gameType} />
    <PracticeIntroPopup kind="mock" open={phase === 'intro'} title={`Paper ${paper.number}: ${paper.title}`} body={`${paper.seconds / 60} minutes · ${paper.marks} marks · ${paper.missions.length} missions. Enter your answers using the answer pad or keyboard. Use the working board for calculations. Save answers to charge the Core. Skip and return whenever you need; mistakes cannot end the run. Your answers are reviewed after you finish.`} actionLabel="Launch mock adventure" onAction={() => { deadline.current = Date.now() + paper.seconds * 1000; setPhase('play'); }} />
    {phase === 'review' ? <div className="sats-review" tabIndex={0} aria-label="Mock adventure review">
      <h2>Core run complete</h2><p className="sats-score">{score} / {paper.marks} marks</p>
      <p role="status">{cleared ? 'Core clear earned!' : `${clearTarget} marks charges the Core clear. Your run is still saved and ready to review.`} This 50% target is an in-game milestone, not an official SATs pass mark.</p>
      {previousAttempts.some(attempt => attempt.id !== attemptId) ? <section aria-label="Previous Core runs"><h3>Previous runs</h3><ol>{previousAttempts.filter(attempt => attempt.id !== attemptId).map((attempt, attemptIndex) => <li key={attempt.id}>Run {attemptIndex + 1}: {attempt.score}/{attempt.maxMarks} marks</li>)}</ol></section> : null}
      <p>Review your solutions, then recharge the skills you want to strengthen.</p>
      <p>Game mock score; this is not an official SATs scaled score.</p>
      <h3>Questions to revisit</h3><p>Open each worked solution below, then revisit the topic on its island before trying another Core run.</p>
      {revisionPriorities.length ? revisionPriorities.map(({ mission, index, marksToReview }) => <a key={mission.id} className="sats-practice-link rounded-lg border border-cyan-200/40 bg-cyan-950/60 px-3 py-2" href={`#sats-review-${mission.id}`} onClick={() => { const item = document.getElementById(`sats-review-${mission.id}`) as HTMLDetailsElement | null; if (item) { item.open = true; item.querySelector('summary')?.focus({ preventScroll: true }); } }}>Mission {index + 1}: {mission.prompt} <span className="block text-sm text-cyan-100">Open worked solution · {marksToReview} mark{marksToReview === 1 ? '' : 's'} to review</span></a>) : <p>All available skills were completed. Try a mixed island next.</p>}
      <h3>Mission review</h3>{paper.missions.map(reviewMission)}<button type="button" className="ui-button-primary" onClick={returnToIsland}>Save run and return</button>
    </div> : <div className="sats-mock-content">
      <GameQuestionCard title={`Mission ${index + 1} of ${paper.missions.length} · ${q.marks} mark${q.marks === 1 ? '' : 's'}`} className="sats-mission-strip" style={{ position: 'relative', top: 0, transform: 'none' }}>{q.prompt}</GameQuestionCard>
      <div className="sats-playfield" data-sats-playfield>
        <div className="sats-charge" aria-label={`${completed} of ${paper.missions.length} missions saved`}>
          <motion.svg className="sats-reactor" key={pulse} viewBox="0 0 64 64" aria-hidden="true" animate={{ scale: reduced ? 1 : [1, 1.1, 1] }} transition={{ duration: .4 }}>
            <circle cx="32" cy="32" r="27" fill="#06203c" stroke="#72dfea" strokeWidth="3" />
            <g className="sats-reactor-ring">{Array.from({length:6},(_,i)=><path key={i} d="M28 6H36L38 13H26Z" transform={`rotate(${i*60} 32 32)`} fill={completed / paper.missions.length >= (i+1)/6 ? '#ffcf57' : '#2c657d'} />)}</g>
            <path d="M32 17L44 28L38 46H26L20 28Z" fill="#65ddea" stroke="#bafaff" strokeWidth="2" /><path d="M32 17V46M20 28H44" stroke="#082e52" strokeWidth="2" />
          </motion.svg>
          <div className="sats-charge-readout"><span>{completed}/{paper.missions.length}<span className="sats-charge-suffix"> crystals charged</span></span><div><motion.i initial={false} animate={{ width: `${completed / paper.missions.length * 100}%` }} transition={{ duration: .4 }} /></div></div>
        </div>
        <div className="sats-model"><CorePaperFrame paper={paper.number} title={paper.title} charged={completed / paper.missions.length} /><div className="sats-model-canvas">{isConstructionMission(q.id)
          ? <SatsConstructionControl mission={q} value={draft[0] ?? ''} onChange={(value) => update(value, 0)} part="model" />
          : <SatsMissionVisual visual={q.visual} />}</div></div>
        <div className="sats-mission-tools"><button type="button" onClick={() => { save(); setNavOpen(true); }}>Mission list</button><button type="button" onClick={() => { save(); setFinishOpen(true); }}>Finish run</button></div>
      </div>
      <form className="sats-response answer-choice-surface" onSubmit={submit}>
        {isConstructionMission(q.id)
          ? <SatsConstructionControl mission={q} value={draft[0]??''} onChange={value=>update(value,0)} part="controls" />
          : <div key={q.id}><SatsAnswerFields mission={q} values={draft} onChange={update} /></div>}
        <SatsTapWorkpad value={draftWorkpad} onChange={setDraftWorkpad} />
        <div className="sats-response-actions"><button type="button" className="ui-button-secondary" onClick={() => go((index + 1) % paper.missions.length)}>Later</button><button className="ui-button-primary" type="submit">Save & continue</button></div>
        <span role="status" className="sats-notice">{notice}</span>
      </form>
      {navOpen ? <div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Mission list"><h3>Choose a mission</h3><p>● Saved · ○ Unanswered. You can change any answer.</p><div className="sats-mission-list">{paper.missions.map((m, i) => <button type="button" key={m.id} aria-current={i === index ? 'step' : undefined} aria-label={`Mission ${i + 1}, ${answers[m.id]?.some(v => v.trim()) ? 'saved' : 'unanswered'}`} onClick={() => go(i)}>{i + 1} {answers[m.id]?.some(v => v.trim()) ? '●' : '○'}</button>)}</div><button type="button" className="ui-button-secondary" onClick={() => setNavOpen(false)}>Back to mission</button></div> : null}
      {finishOpen ? <div ref={panelRef} tabIndex={-1} className="sats-inset-overlay" role="dialog" aria-modal="true" aria-label="Finish mock adventure"><h3>Ready to finish?</h3><p>{paper.missions.length - completed} unanswered missions remain. Once you finish, you can review solutions but cannot change answers.</p><button type="button" className="ui-button-primary" onClick={finish}>Finish and review</button><button type="button" className="ui-button-secondary" onClick={() => setFinishOpen(false)}>Keep exploring</button></div> : null}
    </div>}
  </div>;
};
export default BossEncounterGame;
