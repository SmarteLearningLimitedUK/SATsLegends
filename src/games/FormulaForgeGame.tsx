import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import CelebrationSplash from '../components/CelebrationSplash';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { triggerHaptic } from '../haptics';
import { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import fractionForgeBackground from '../assets/maps/premium/formula-forge.webp';

interface FormulaForgeGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

type FormulaKind = 'area_rect' | 'perimeter_rect' | 'triangle_area' | 'volume_cuboid';
type SolveMode = 'compute' | 'missing';

interface GivenValue {
  label: string;
  value: number;
}

interface FormulaRound {
  id: string;
  kind: 'fluency' | 'reasoning';
  diagram: 'rectangle' | 'triangle' | 'cuboid';
  title: string;
  formula: string;
  prompt: string;
  targetLabel: string;
  given: GivenValue[];
  answer: number;
  options: number[];
  hint: string;
}

type FeedbackState = null | {
  tone: 'success' | 'error';
  title: string;
  subtitle: string;
};

const MAX_LIVES = 3;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const makeOptions = (answer: number) => {
  const pool = new Set<number>([answer]);
  const offsets = [-12, -8, -5, -3, 3, 5, 8, 11];
  for (const offset of shuffle(offsets)) {
    if (pool.size >= 4) break;
    const candidate = answer + offset;
    if (candidate > 0) pool.add(candidate);
  }
  while (pool.size < 4) {
    pool.add(Math.max(1, answer + randomInt(-14, 14)));
  }
  return shuffle(Array.from(pool).slice(0, 4));
};

const FORGE_TARGET_LABELS: Record<string, string> = {
  A: 'area',
  P: 'perimeter',
  V: 'volume',
  b: 'base',
  h: 'height',
  l: 'length',
  w: 'width',
};

const formatGivenValues = (given: GivenValue[]) => given.map(({ label, value }) => `${label} = ${value}`).join(', ');

const describeTargetLabel = (label: string) => FORGE_TARGET_LABELS[label] || label;

const buildQuestionStem = (round: FormulaRound) => {
  const givenText = formatGivenValues(round.given);
  const targetText = describeTargetLabel(round.targetLabel);
  const leadIn = round.kind === 'reasoning' ? 'Find the missing' : 'Work out the';

  return `The forge shows ${givenText}.\n${leadIn} ${targetText}, ${round.targetLabel}.`;
};

const buildAreaRound = (mode: SolveMode, level: number): FormulaRound => {
  const length = randomInt(3, 10 + level);
  const width = randomInt(2, 8 + level);
  const area = length * width;

  if (mode === 'missing') {
    const missing = Math.random() > 0.5 ? 'l' : 'w';
    return {
      id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'reasoning',
      diagram: 'rectangle',
      title: 'Rectangle Area',
      formula: 'A = l × w',
      prompt: `A Monster Mind has hidden the ${missing === 'l' ? 'length' : 'width'} rune.`,
      targetLabel: missing === 'l' ? 'l' : 'w',
      given: missing === 'l'
        ? [{ label: 'A', value: area }, { label: 'w', value: width }]
        : [{ label: 'A', value: area }, { label: 'l', value: length }],
      answer: missing === 'l' ? length : width,
      options: makeOptions(missing === 'l' ? length : width),
      hint: 'Area equals length multiplied by width.',
    };
  }

  return {
    id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    diagram: 'rectangle',
    title: 'Rectangle Area',
    formula: 'A = l × w',
    prompt: 'The forge runes need restoring before the spell can hold.',
    targetLabel: 'A',
    given: [{ label: 'l', value: length }, { label: 'w', value: width }],
    answer: area,
    options: makeOptions(area),
    hint: 'Multiply length by width.',
  };
};

const buildPerimeterRound = (mode: SolveMode, level: number): FormulaRound => {
  const length = randomInt(3, 12 + level);
  const width = randomInt(2, 9 + level);
  const perimeter = 2 * (length + width);

  if (mode === 'missing') {
    const missing = Math.random() > 0.5 ? 'l' : 'w';
    const answer = missing === 'l' ? length : width;
    return {
      id: `perimeter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'reasoning',
      diagram: 'rectangle',
      title: 'Rectangle Perimeter',
      formula: 'P = 2(l + w)',
      prompt: `A Monster Mind has hidden the ${missing === 'l' ? 'length' : 'width'} rune.`,
      targetLabel: missing === 'l' ? 'l' : 'w',
      given: missing === 'l'
        ? [{ label: 'P', value: perimeter }, { label: 'w', value: width }]
        : [{ label: 'P', value: perimeter }, { label: 'l', value: length }],
      answer,
      options: makeOptions(answer),
      hint: 'Half the perimeter equals length plus width.',
    };
  }

  return {
    id: `perimeter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    diagram: 'rectangle',
    title: 'Rectangle Perimeter',
    formula: 'P = 2(l + w)',
    prompt: 'The forge boundary rune has been scrambled.',
    targetLabel: 'P',
    given: [{ label: 'l', value: length }, { label: 'w', value: width }],
    answer: perimeter,
    options: makeOptions(perimeter),
    hint: 'Add length + width, then multiply by 2.',
  };
};

const buildTriangleRound = (level: number): FormulaRound => {
  const base = randomInt(4, 12 + level);
  const height = randomInt(4, 12 + level);
  const area = (base * height) / 2;
  return {
    id: `triangle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    diagram: 'triangle',
    title: 'Triangle Area',
    formula: 'A = (b × h) ÷ 2',
    prompt: 'The triangle rune is unstable. Restore it with the correct formula.',
    targetLabel: 'A',
    given: [{ label: 'b', value: base }, { label: 'h', value: height }],
    answer: area,
    options: makeOptions(area),
    hint: 'Multiply base by height, then halve.',
  };
};

const buildVolumeRound = (mode: SolveMode, level: number): FormulaRound => {
  const length = randomInt(3, 8 + level);
  const width = randomInt(2, 6 + level);
  const height = randomInt(2, 6 + level);
  const volume = length * width * height;

  if (mode === 'missing') {
    const missing = Math.random() > 0.5 ? 'l' : 'h';
    const answer = missing === 'l' ? length : height;
    return {
      id: `volume-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'reasoning',
      diagram: 'cuboid',
      title: 'Cuboid Volume',
      formula: 'V = l × w × h',
      prompt: `A Monster Mind has hidden the ${missing === 'l' ? 'length' : 'height'} rune.`,
      targetLabel: missing === 'l' ? 'l' : 'h',
      given: missing === 'l'
        ? [{ label: 'V', value: volume }, { label: 'w', value: width }, { label: 'h', value: height }]
        : [{ label: 'V', value: volume }, { label: 'l', value: length }, { label: 'w', value: width }],
      answer,
      options: makeOptions(answer),
      hint: 'Divide the volume by the other dimensions.',
    };
  }

  return {
    id: `volume-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    diagram: 'cuboid',
    title: 'Cuboid Volume',
    formula: 'V = l × w × h',
    prompt: 'The cuboid rune has been disturbed. Restore the full formula.',
    targetLabel: 'V',
    given: [{ label: 'l', value: length }, { label: 'w', value: width }, { label: 'h', value: height }],
    answer: volume,
    options: makeOptions(volume),
    hint: 'Multiply all three dimensions.',
  };
};

const createRound = (level: number): FormulaRound => {
  const modes: FormulaKind[] = level === 1 ? ['area_rect']
    : level === 2 ? ['area_rect', 'perimeter_rect']
      : level === 3 ? ['triangle_area']
        : level === 4 ? ['triangle_area', 'volume_cuboid']
          : ['area_rect', 'perimeter_rect', 'triangle_area', 'volume_cuboid'];

  const mode = modes[randomInt(0, modes.length - 1)];
  const solveMode: SolveMode = level >= 5 && Math.random() > 0.48 ? 'missing' : 'compute';

  if (mode === 'area_rect') return buildAreaRound(solveMode, level);
  if (mode === 'perimeter_rect') return buildPerimeterRound(solveMode, level);
  if (mode === 'volume_cuboid') return buildVolumeRound(solveMode, level);
  return buildTriangleRound(level);
};

const scoreToStars = (correct: number, rounds: number, lives: number) => {
  const accuracy = rounds > 0 ? correct / rounds : 1;
  if (accuracy >= 0.9 && lives >= 2) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const FormulaShapePanel: React.FC<{ round: FormulaRound; chargedLabels: string[]; onToggleRune: (label: string) => void; reducedMotion: boolean }> = ({ round, chargedLabels, onToggleRune, reducedMotion }) => {
  const charged = chargedLabels.length === round.given.length;
  return (
    <div data-formula-playfield="true" className={`flex h-full min-h-[8rem] flex-col rounded-[1.35rem] border bg-[linear-gradient(180deg,rgba(8,18,36,0.45),rgba(15,23,42,0.2))] p-2 shadow-[0_12px_22px_rgba(2,6,23,0.12)] ${charged ? 'border-amber-300/70' : 'border-cyan-200/14'}`}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-bold text-cyan-100">
        <span>{round.title}</span>
        <span data-formula-equation="true">{round.formula}</span>
      </div>
      <div className="relative mt-1 min-h-[2.5rem] flex-1 overflow-hidden rounded-[1.1rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.06)_42%,rgba(8,15,30,0.28)_100%)]">
        <motion.div aria-hidden="true" animate={charged && !reducedMotion ? { opacity: [0.2, 0.65, 0.2] } : { opacity: charged ? 0.38 : 0 }} transition={{ duration: 1.8, repeat: charged && !reducedMotion ? Infinity : 0 }} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.6),transparent_62%)]" />
        {round.diagram === 'triangle' ? (
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <polygon points="50,16 18,78 82,78" fill="rgba(56,189,248,0.16)" stroke="rgba(191,219,254,0.9)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="50" y1="16" x2="50" y2="78" stroke="rgba(191,219,254,0.45)" strokeDasharray="3 3" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ) : round.diagram === 'cuboid' ? (
          <svg viewBox="0 0 120 100" className="absolute inset-0 h-full w-full">
            <polygon points="28,24 70,24 92,40 50,40" fill="rgba(56,189,248,0.18)" stroke="rgba(191,219,254,0.9)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polygon points="28,24 28,66 50,82 50,40" fill="rgba(14,165,233,0.12)" stroke="rgba(191,219,254,0.85)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polygon points="50,40 92,40 92,82 50,82" fill="rgba(15,118,110,0.12)" stroke="rgba(191,219,254,0.85)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="28" y1="24" x2="50" y2="40" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="70" y1="24" x2="92" y2="40" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="50" y1="40" x2="50" y2="82" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <rect x="18" y="18" width="64" height="64" rx="10" fill="rgba(56,189,248,0.16)" stroke="rgba(191,219,254,0.9)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <g opacity="0.24" stroke="rgba(255,255,255,0.85)" strokeWidth="0.8">
              {Array.from({ length: 4 }).map((_, index) => (
                <React.Fragment key={`grid-${index}`}>
                  <line x1={18 + ((index + 1) * 12)} y1="18" x2={18 + ((index + 1) * 12)} y2="82" />
                  <line x1="18" y1={18 + ((index + 1) * 12)} x2="82" y2={18 + ((index + 1) * 12)} />
                </React.Fragment>
              ))}
            </g>
          </svg>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl font-black text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] md:text-5xl">{round.targetLabel} = ?</div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Given runes">
        {round.given.map(({ label, value }) => (
          <motion.button
            key={label}
            type="button"
            data-button-skin="none"
            data-formula-rune={label}
            aria-pressed={chargedLabels.includes(label)}
            aria-label={`${label} equals ${value}. ${chargedLabels.includes(label) ? 'Charged' : 'Tap to charge'}`}
            onClick={() => onToggleRune(label)}
            whileTap={reducedMotion ? undefined : { scale: 0.94 }}
            className={`min-h-10 min-w-16 rounded-xl border px-2 py-1 text-sm font-black focus-visible:outline-2 focus-visible:outline-amber-300 ${chargedLabels.includes(label) ? 'border-amber-300 bg-amber-300/25 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.3)]' : 'border-cyan-300/35 bg-slate-900/60 text-cyan-100'}`}
          >
            {label} = {value}
          </motion.button>
        ))}
      </div>
      <div data-formula-rune-status="true" aria-live="polite" className="mt-1 text-center text-[11px] font-bold text-amber-100/90">
        {charged ? `Runes charged. Use ${round.formula} to find ${round.targetLabel}.` : `Tap the given runes to light the forge (${chargedLabels.length}/${round.given.length}).`}
      </div>
    </div>
  );
};

const FormulaForgeGame: React.FC<FormulaForgeGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = true,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(5, levelId || 1)), [levelId]);
  const totalRounds = useMemo(() => Math.min(10, 6 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);

  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<FormulaRound>(() => createRound(resolvedLevel));
  const [XP, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [chargedLabels, setChargedLabels] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [compactViewport, setCompactViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 700px) and (max-height: 720px)').matches
  ));

  useEffect(() => {
    const query = window.matchMedia('(min-width: 700px) and (max-height: 720px)');
    const update = () => setCompactViewport(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const timersRef = useRef<number[]>([]);
  const answerLockRef = useRef(false);
  const reportedResultRef = useRef(false);
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const sessionEventsRef = useRef(sessionEvents);
  sessionEventsRef.current = sessionEvents;
  const scoreRef = useRef(0);
  scoreRef.current = XP;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useLayoutEffect(() => {
    if (!isPresent) {
      answerLockRef.current = true;
      clearTimers();
    }
  }, [clearTimers, isPresent]);

  useEffect(() => {
    clearTimers();
    answerLockRef.current = false;
    reportedResultRef.current = false;
    scoreRef.current = 0;
    setRoundNumber(1);
    setRound(createRound(resolvedLevel));
    setScore(0);
    setLives(MAX_LIVES);
    setCorrectCount(0);
    setFeedback(null);
    setSelectedChoice(null);
    setChargedLabels([]);
    setIsFinished(false);
    setShowCelebrationSplash(false);
  }, [clearTimers, resolvedLevel]);

  const advanceRound = useCallback((nextScore: number, nextCorrectCount: number, nextLives: number) => {
    if (roundNumber >= totalRounds) {
      setIsFinished(true);
      const timeoutId = window.setTimeout(() => {
        if (!presentRef.current || reportedResultRef.current) return;
        reportedResultRef.current = true;
        const stars = scoreToStars(nextCorrectCount, totalRounds, nextLives);
        if (!reducedMotion) {
          confetti({
            particleCount: 110,
            spread: 70,
            origin: { y: 0.62 },
            colors: ['#fcd34d', '#67e8f9', '#ffffff'],
          });
        }
        sessionEventsRef.current?.onGameComplete?.({ score: nextScore, stars });
        onVictoryRef.current(stars, nextScore);
      }, 520);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!presentRef.current) return;
      setShowCelebrationSplash(false);
      setRoundNumber((prev) => prev + 1);
      setRound(createRound(resolvedLevel));
      setFeedback(null);
      setSelectedChoice(null);
      setChargedLabels([]);
      answerLockRef.current = false;
    }, 520);
    timersRef.current.push(timeoutId);
  }, [reducedMotion, roundNumber, resolvedLevel, totalRounds]);

  const handleAnswer = (choice: number) => {
    if (!presentRef.current || answerLockRef.current || feedback || isFinished) return;
    answerLockRef.current = true;
    setSelectedChoice(choice);

    if (choice === round.answer) {
      const gained = 140 + (resolvedLevel * 12);
      const updatedScore = XP + gained;
      scoreRef.current = updatedScore;
      setScore(updatedScore);
      setCorrectCount((prev) => prev + 1);
      setShowCelebrationSplash(true);
      setFeedback({
        tone: 'success',
        title: 'Runes Restored',
        subtitle: `+${gained} XP`,
      });
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { formula: round.title } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound(updatedScore, correctCount + 1, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedback({
      tone: 'error',
      title: 'Runes Unstable',
      subtitle: `Correct answer: ${round.answer}`,
    });
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({ score: XP, metadata: { correctAnswer: round.answer } });

    if (nextLives <= 0) {
      setIsFinished(true);
      const timeoutId = window.setTimeout(() => {
        if (!presentRef.current || reportedResultRef.current) return;
        reportedResultRef.current = true;
        sessionEventsRef.current?.onGameFailed?.({ score: scoreRef.current, reason: 'lives' });
        onGameOverRef.current(scoreRef.current);
      }, 620);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!presentRef.current) return;
      setFeedback(null);
      setSelectedChoice(null);
      answerLockRef.current = false;
    }, 520);
    timersRef.current.push(timeoutId);
  };

  return (
    <GameScreenShell
      className="overflow-hidden"
      backgroundImage={fractionForgeBackground}
      backgroundOpacity={1}
      overlayDisabled
    >

      <div data-formula-game="true" data-formula-tier={resolvedLevel} data-formula-question={roundNumber} data-formula-state={isFinished ? 'finished' : feedback?.tone || 'idle'} className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 ${compactViewport ? 'pb-0' : 'pb-[calc(env(safe-area-inset-bottom)+2.1rem)]'} ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.75rem)] md:pt-[calc(env(safe-area-inset-top)+5rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.5rem)]'}`}>
        <div className={`relative flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] p-2 md:rounded-[2rem] ${compactViewport ? '' : 'md:p-3'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),rgba(15,23,42,0.02)_36%,rgba(15,23,42,0.08)_100%)]" />

          <div className={`relative z-10 flex h-full w-full min-h-0 flex-col overflow-y-auto px-2 pt-2 ${compactViewport ? 'pb-0' : 'pb-2 md:px-4 md:pb-4'}`}>
            <div className="flex shrink-0 justify-center">
              <GameQuestionCard
                title={`Formula Forge · ${roundNumber}/${totalRounds}`}
                style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%', transform: 'none', fontSize: '0.92rem', padding: '5px 8px' }}
                className="max-w-[860px] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(8,18,36,0.42),rgba(8,18,36,0.18))] shadow-[0_12px_26px_rgba(2,6,23,0.12)]"
              >
                {formatFantasyPrompt(buildQuestionStem(round))}
              </GameQuestionCard>
            </div>

            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2">
              <div className="h-[10rem] shrink-0 md:min-h-[8rem] md:flex-1 md:shrink">
                <FormulaShapePanel round={round} chargedLabels={chargedLabels} onToggleRune={(label) => setChargedLabels((current) => current.includes(label) ? current.filter((rune) => rune !== label) : [...current, label])} reducedMotion={Boolean(reducedMotion)} />
              </div>

              <div data-formula-hint="true" className="shrink-0 rounded-[1rem] border border-white/10 bg-black/10 px-2 py-1 text-[11px] font-semibold text-cyan-100/80">
                Rune hint: {round.hint}
              </div>

              <div data-formula-answers="true" className="answer-choice-surface shrink-0 rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(30,64,175,0.08),rgba(15,23,42,0.46))] p-2 shadow-[0_14px_26px_rgba(2,6,23,0.12)]">
                <div className="text-[11px] font-bold text-amber-100/85">Choose {round.targetLabel}</div>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {round.options.map((option) => (
                    <motion.button
                      key={`${round.id}-${option}`}
                      type="button"
                      data-formula-answer={option}
                      onClick={() => handleAnswer(option)}
                      disabled={Boolean(feedback) || isFinished}
                      whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                      animate={!reducedMotion && selectedChoice === option ? (feedback?.tone === 'success' ? { scale: [1, 1.1, 0.98, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: [1, 1.04, 1] }) : { scale: 1 }}
                      className={`min-h-[2.8rem] rounded-[1.05rem] px-2 py-1.5 text-base font-black shadow-[0_12px_20px_rgba(2,6,23,0.2)] disabled:opacity-60 md:min-h-[3.3rem] md:text-2xl ${
                        selectedChoice === option
                          ? feedback?.tone === 'success'
                            ? 'ui-button-success'
                            : 'ui-button-primary'
                          : 'ui-button-secondary'
                      }`}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <CelebrationSplash active={showCelebrationSplash} message="Forge Restored!" theme="forge" />

          <AnimatePresence>
            {feedback && feedback.tone === 'error' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-red-500/16"
              >
                <div className="rounded-[1.6rem] border border-white/14 bg-slate-950/62 px-6 py-5 text-center shadow-[0_18px_28px_rgba(0,0,0,0.24)] md:rounded-[2rem] md:px-8 md:py-6">
                  <div className="text-3xl font-black uppercase tracking-[0.12em] text-amber-100 md:text-5xl">{feedback.title}</div>
                  <div className="mt-1 text-sm font-bold text-white/92 md:mt-2 md:text-xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </GameScreenShell>
  );
};

export default FormulaForgeGame;
