import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import CelebrationSplash from '../components/CelebrationSplash';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { triggerHaptic } from '../haptics';
import { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import fractionForgeBackground from '../assets/maps/backgroundsforgames/fraction forge map.jpg';

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

  return `The forge runes reveal ${givenText}.\n${leadIn} ${targetText}, ${round.targetLabel}.`;
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
      prompt: `The forge rune hides the ${missing === 'l' ? 'length' : 'width'} mark.`,
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
    prompt: 'The forge runes glow with a fresh shape spell.',
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
      prompt: `The forge rune hides the ${missing === 'l' ? 'length' : 'width'} mark.`,
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
    prompt: 'The forge runes glow with a boundary spell.',
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
    prompt: 'The triangle rune waits for your calculation.',
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
      prompt: `The forge rune hides the ${missing === 'l' ? 'length' : 'height'} mark.`,
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
    prompt: 'The cuboid rune hums with all three dimensions.',
    targetLabel: 'V',
    given: [{ label: 'l', value: length }, { label: 'w', value: width }, { label: 'h', value: height }],
    answer: volume,
    options: makeOptions(volume),
    hint: 'Multiply all three dimensions.',
  };
};

const createRound = (level: number): FormulaRound => {
  const modes: FormulaKind[] = level <= 2
    ? ['area_rect', 'perimeter_rect']
    : level <= 4
      ? ['area_rect', 'perimeter_rect', 'triangle_area']
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

const FormulaShapePanel: React.FC<{ round: FormulaRound }> = ({ round }) => {
  const valueFor = (label: string) => round.given.find((item) => item.label === label)?.value ?? 0;

  if (round.diagram === 'triangle') {
    const base = valueFor('b');
    const height = valueFor('h');

    return (
      <div className="rounded-[1.35rem] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(8,18,36,0.45),rgba(15,23,42,0.2))] p-3 shadow-[0_12px_22px_rgba(2,6,23,0.12)] md:p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/72 md:text-[11px]">
          <span>Shape blueprint</span>
          <span>{round.title}</span>
        </div>
        <div className="mt-2 rounded-[0.95rem] border border-white/10 bg-black/14 px-3 py-2 text-sm font-semibold text-cyan-50/88">
          {round.prompt}
        </div>
        <div className="relative mt-3 aspect-[1.3/1] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.06)_42%,rgba(8,15,30,0.28)_100%)] p-3">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <polygon points="50,16 18,78 82,78" fill="rgba(56,189,248,0.16)" stroke="rgba(191,219,254,0.9)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="50" y1="16" x2="50" y2="78" stroke="rgba(191,219,254,0.45)" strokeDasharray="3 3" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  if (round.diagram === 'cuboid') {
    const length = valueFor('l');
    const width = valueFor('w');
    const height = valueFor('h');

    return (
      <div className="rounded-[1.35rem] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(8,18,36,0.45),rgba(15,23,42,0.2))] p-3 shadow-[0_12px_22px_rgba(2,6,23,0.12)] md:p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/72 md:text-[11px]">
          <span>Shape blueprint</span>
          <span>{round.title}</span>
        </div>
        <div className="mt-2 rounded-[0.95rem] border border-white/10 bg-black/14 px-3 py-2 text-sm font-semibold text-cyan-50/88">
          {round.prompt}
        </div>
        <div className="relative mt-3 aspect-[1.25/1] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.06)_42%,rgba(8,15,30,0.28)_100%)] p-3">
          <svg viewBox="0 0 120 100" className="absolute inset-0 h-full w-full">
            <polygon points="28,24 70,24 92,40 50,40" fill="rgba(56,189,248,0.18)" stroke="rgba(191,219,254,0.9)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polygon points="28,24 28,66 50,82 50,40" fill="rgba(14,165,233,0.12)" stroke="rgba(191,219,254,0.85)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <polygon points="50,40 92,40 92,82 50,82" fill="rgba(15,118,110,0.12)" stroke="rgba(191,219,254,0.85)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <line x1="28" y1="24" x2="50" y2="40" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="70" y1="24" x2="92" y2="40" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="50" y1="40" x2="50" y2="82" stroke="rgba(191,219,254,0.45)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  const length = valueFor('l');
  const width = valueFor('w');

  return (
    <div className="rounded-[1.35rem] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(8,18,36,0.45),rgba(15,23,42,0.2))] p-3 shadow-[0_12px_22px_rgba(2,6,23,0.12)] md:p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/72 md:text-[11px]">
        <span>Shape blueprint</span>
        <span>{round.title}</span>
      </div>
      <div className="mt-2 rounded-[0.95rem] border border-white/10 bg-black/14 px-3 py-2 text-sm font-semibold text-cyan-50/88">
        {round.prompt}
      </div>
      <div className="relative mt-3 aspect-[1.25/1] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),rgba(15,23,42,0.06)_42%,rgba(8,15,30,0.28)_100%)] p-3">
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
  sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const totalRounds = useMemo(() => Math.min(10, 6 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);

  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<FormulaRound>(() => createRound(resolvedLevel));
  const [XP, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);

  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  scoreRef.current = XP;

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setRoundNumber(1);
    setRound(createRound(resolvedLevel));
    setScore(0);
    setLives(MAX_LIVES);
    setCorrectCount(0);
    setFeedback(null);
    setSelectedChoice(null);
    setIsFinished(false);
    setShowCelebrationSplash(false);
  }, [resolvedLevel]);

  const advanceRound = useCallback(() => {
    if (roundNumber >= totalRounds) {
      setIsFinished(true);
      const stars = scoreToStars(correctCount + 1, totalRounds, lives);
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.62 },
        colors: ['#fcd34d', '#67e8f9', '#ffffff'],
      });
      sessionEvents?.onGameComplete?.({ score: XP, stars });
      onVictory(stars, XP);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCelebrationSplash(false);
      setRoundNumber((prev) => prev + 1);
      setRound(createRound(resolvedLevel));
      setFeedback(null);
      setSelectedChoice(null);
    }, 520);
    timersRef.current.push(timeoutId);
  }, [XP, correctCount, lives, onVictory, roundNumber, resolvedLevel, sessionEvents, totalRounds]);

  const handleAnswer = (choice: number) => {
    if (feedback || isFinished) return;
    setSelectedChoice(choice);

    if (choice === round.answer) {
      const gained = 140 + (resolvedLevel * 12);
      const updatedScore = XP + gained;
      setScore(updatedScore);
      setCorrectCount((prev) => prev + 1);
      setShowCelebrationSplash(true);
      setFeedback({
        tone: 'success',
        title: 'Formula Locked',
        subtitle: `+${gained} XP`,
      });
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { formula: round.title } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound();
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedback({
      tone: 'error',
      title: 'Forge Miss',
      subtitle: `Correct answer: ${round.answer}`,
    });
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({ score: XP, metadata: { correctAnswer: round.answer } });

    if (nextLives <= 0) {
      setIsFinished(true);
      const timeoutId = window.setTimeout(() => {
        sessionEvents?.onGameFailed?.({ score: XP, reason: 'lives' });
        onGameOver(scoreRef.current);
      }, 620);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setSelectedChoice(null);
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

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.75rem)] md:pt-[calc(env(safe-area-inset-top)+5rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.5rem)]'}`}>
        <div className="relative flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] p-2 md:rounded-[2rem] md:p-3">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),rgba(15,23,42,0.02)_36%,rgba(15,23,42,0.08)_100%)]" />

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-2 md:px-4 md:pb-4">
            <div className="flex justify-center">
              <GameQuestionCard
                title="Formula Forge"
                subtitle={`Question ${roundNumber} of ${totalRounds}`}
                className="max-w-[860px] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(8,18,36,0.42),rgba(8,18,36,0.18))] shadow-[0_12px_26px_rgba(2,6,23,0.12)]"
              >
                {formatFantasyPrompt(buildQuestionStem(round))}
              </GameQuestionCard>
            </div>

            <div className="mt-3 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 md:gap-3">
              <FormulaShapePanel round={round} />

              <div className="answer-choice-surface min-h-0 rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(30,64,175,0.08),rgba(15,23,42,0.46))] p-3 shadow-[0_14px_26px_rgba(2,6,23,0.12)] md:p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-100/85 md:text-xs">Choose the correct value for {round.targetLabel}</div>
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 md:gap-2.5">
                  {round.options.map((option) => (
                    <motion.button
                      key={`${round.id}-${option}`}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={Boolean(feedback) || isFinished}
                      whileTap={{ scale: 0.96 }}
                      animate={selectedChoice === option ? (feedback?.tone === 'success' ? { scale: [1, 1.1, 0.98, 1.05, 1], rotate: [0, -2, 2, 0] } : { scale: [1, 1.04, 1] }) : { scale: 1 }}
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

              <div className="rounded-[1rem] border border-white/10 bg-black/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100/80">
                Hint: {round.hint}
              </div>
            </div>
          </div>

          <CelebrationSplash active={showCelebrationSplash} message="Now We're Cookin'!" theme="forge" />

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
