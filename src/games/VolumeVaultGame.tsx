import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Layers, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../haptics';
import volumeBackground from '../assets/maps/facctor frenzy.jpg';

interface VolumeVaultGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type GridMatrix = number[][];
type ToolMode = 'place' | 'remove';
type ChallengeKind = 'build' | 'missing_dimension' | 'prefilled' | 'compound';

interface MissingDimensionPrompt {
  text: string;
  answer: number;
  options: number[];
}

interface VolumeChallenge {
  id: string;
  level: number;
  kind: ChallengeKind;
  length: number;
  depth: number;
  targetHeights: GridMatrix;
  prefilledHeights: GridMatrix;
  prompt: string;
  helper: string;
  answerUnit: string;
  missingPrompt: MissingDimensionPrompt | null;
}

interface FeedbackState {
  type: 'success' | 'error' | 'info';
  message: string;
}

const FALLBACK_TIME = 90;
const PUZZLES_TO_WIN = 6;
const MAX_CELL_HEIGHT = 9;

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const createMatrix = (rows: number, cols: number, value = 0): GridMatrix =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));

const cloneMatrix = (matrix: GridMatrix): GridMatrix => matrix.map((row) => [...row]);

const sumMatrix = (matrix: GridMatrix): number =>
  matrix.reduce((total, row) => total + row.reduce((rowTotal, cell) => rowTotal + cell, 0), 0);

const maxMatrix = (matrix: GridMatrix): number =>
  matrix.reduce((maxValue, row) => Math.max(maxValue, ...row), 0);

const buildCuboid = (depth: number, length: number, height: number): GridMatrix =>
  createMatrix(depth, length, height);

const buildCompound = (depth: number, length: number, baseHeight: number): GridMatrix => {
  const matrix = createMatrix(depth, length, baseHeight);
  const dents = randInt(2, Math.max(3, Math.floor((depth * length) / 3)));
  for (let i = 0; i < dents; i += 1) {
    const y = randInt(0, depth - 1);
    const x = randInt(0, length - 1);
    matrix[y][x] = Math.max(1, matrix[y][x] - randInt(1, Math.max(1, baseHeight - 1)));
  }
  return matrix;
};

const buildPrefilled = (target: GridMatrix, ratio: number): GridMatrix => {
  const prefilled = createMatrix(target.length, target[0]?.length ?? 0, 0);
  const total = sumMatrix(target);
  const wanted = Math.max(1, Math.floor(total * ratio));
  let placed = 0;

  while (placed < wanted) {
    const y = randInt(0, target.length - 1);
    const x = randInt(0, target[0].length - 1);
    if (prefilled[y][x] >= target[y][x]) continue;
    prefilled[y][x] += 1;
    placed += 1;
  }

  return prefilled;
};

const makeOptions = (correct: number): number[] => {
  const spread = Math.max(1, Math.round(correct * 0.3));
  const set = new Set<number>([correct]);
  while (set.size < 4) {
    set.add(Math.max(1, correct + randInt(-spread, spread)));
  }
  return shuffle(Array.from(set));
};

const createMissingPrompt = (length: number, depth: number, height: number, unit: string): MissingDimensionPrompt => {
  const volume = length * depth * height;
  const axis = randomFrom<'length' | 'depth' | 'height'>(['length', 'depth', 'height']);

  if (axis === 'height') {
    const oneLayer = length * depth;
    return {
      text: `Volume is ${volume} ${unit}^3. One layer has ${oneLayer} cubes. How many layers?`,
      answer: height,
      options: makeOptions(height),
    };
  }

  if (axis === 'length') {
    return {
      text: `Volume is ${volume} ${unit}^3. Depth = ${depth}, Height = ${height}. Missing length?`,
      answer: length,
      options: makeOptions(length),
    };
  }

  return {
    text: `Volume is ${volume} ${unit}^3. Length = ${length}, Height = ${height}. Missing depth?`,
    answer: depth,
    options: makeOptions(depth),
  };
};

const generateChallenge = (level: number): VolumeChallenge => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const unit = 'u';

  if (level <= 3) {
    const length = randInt(2, 3);
    const depth = randInt(2, 3);
    const height = randInt(1, 3);
    return {
      id,
      level,
      kind: 'build',
      length,
      depth,
      targetHeights: buildCuboid(depth, length, height),
      prefilledHeights: createMatrix(depth, length, 0),
      prompt: `Build a ${length} x ${depth} x ${height} cuboid`,
      helper: 'Tap tiles to stack cubes.',
      answerUnit: unit,
      missingPrompt: null,
    };
  }

  if (level <= 6) {
    const length = randInt(3, 4);
    const depth = randInt(2, 4);
    const height = randInt(2, 4);
    return {
      id,
      level,
      kind: 'missing_dimension',
      length,
      depth,
      targetHeights: buildCuboid(depth, length, height),
      prefilledHeights: createMatrix(depth, length, 0),
      prompt: 'Solve the missing dimension, then build the shape',
      helper: 'Use volume logic before placing cubes.',
      answerUnit: unit,
      missingPrompt: createMissingPrompt(length, depth, height, unit),
    };
  }

  if (level <= 10) {
    const length = randInt(3, 5);
    const depth = randInt(3, 4);
    const height = randInt(2, 4);
    const targetHeights = buildCuboid(depth, length, height);
    return {
      id,
      level,
      kind: 'prefilled',
      length,
      depth,
      targetHeights,
      prefilledHeights: buildPrefilled(targetHeights, 0.3),
      prompt: `Complete the ${length} x ${depth} x ${height} vault`,
      helper: 'Blue base cubes are locked. Build from there.',
      answerUnit: unit,
      missingPrompt: null,
    };
  }

  const length = randInt(4, 5);
  const depth = randInt(4, 5);
  const baseHeight = randInt(2, 5);
  const targetHeights = buildCompound(depth, length, baseHeight);
  const highest = maxMatrix(targetHeights);

  return {
    id,
    level,
    kind: 'compound',
    length,
    depth,
    targetHeights,
    prefilledHeights: buildPrefilled(targetHeights, 0.22),
    prompt: 'Match the irregular volume exactly',
    helper: 'Keep checking total volume and tile heights.',
    answerUnit: unit,
    missingPrompt: Math.random() > 0.5 ? createMissingPrompt(length, depth, highest, unit) : null,
  };
};

const scoreToStars = (score: number) => {
  if (score >= 3200) return 3;
  if (score >= 2200) return 2;
  return 1;
};

const VolumeVaultGame: React.FC<VolumeVaultGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const initialChallengeRef = useRef<VolumeChallenge>(generateChallenge(Math.max(1, levelId)));
  const finishedRef = useRef(false);

  const [sessionLevel, setSessionLevel] = useState(Math.max(1, levelId));
  const [challenge, setChallenge] = useState<VolumeChallenge>(initialChallengeRef.current);
  const [playerHeights, setPlayerHeights] = useState<GridMatrix>(() => cloneMatrix(initialChallengeRef.current.prefilledHeights));
  const [toolMode, setToolMode] = useState<ToolMode>('place');
  const [activeLayer, setActiveLayer] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(FALLBACK_TIME);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [missingSolved, setMissingSolved] = useState(false);
  const [selectedMissingOption, setSelectedMissingOption] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const targetHeights = challenge.targetHeights;
  const prefilledHeights = challenge.prefilledHeights;
  const maxTargetHeight = maxMatrix(targetHeights);
  const clampedLayer = Math.max(1, Math.min(activeLayer, Math.max(1, maxTargetHeight)));

  const targetVolume = useMemo(() => sumMatrix(targetHeights), [targetHeights]);
  const playerVolume = useMemo(() => sumMatrix(playerHeights), [playerHeights]);

  const extraVolume = useMemo(() => {
    let extra = 0;
    for (let y = 0; y < challenge.depth; y += 1) {
      for (let x = 0; x < challenge.length; x += 1) {
        extra += Math.max(0, playerHeights[y][x] - targetHeights[y][x]);
      }
    }
    return extra;
  }, [challenge.depth, challenge.length, playerHeights, targetHeights]);

  const missingVolume = useMemo(() => {
    let missing = 0;
    for (let y = 0; y < challenge.depth; y += 1) {
      for (let x = 0; x < challenge.length; x += 1) {
        missing += Math.max(0, targetHeights[y][x] - playerHeights[y][x]);
      }
    }
    return missing;
  }, [challenge.depth, challenge.length, playerHeights, targetHeights]);

  const progressRatio = Math.max(0, Math.min(1, targetVolume > 0 ? playerVolume / targetVolume : 0));
  const canBuild = !challenge.missingPrompt || missingSolved;
  const isExact = missingVolume === 0 && extraVolume === 0;

  useEffect(() => {
    const next = generateChallenge(Math.max(1, levelId));
    setSessionLevel(Math.max(1, levelId));
    setChallenge(next);
    setPlayerHeights(cloneMatrix(next.prefilledHeights));
    setToolMode('place');
    setActiveLayer(1);
    setScore(0);
    setStreak(0);
    setSolvedCount(0);
    setTimeLeft(FALLBACK_TIME);
    setFeedback(null);
    setMissingSolved(!next.missingPrompt);
    setSelectedMissingOption(null);
    setLocked(false);
    finishedRef.current = false;
  }, [levelId]);

  useEffect(() => {
    if (useSharedTopHud || finishedRef.current) return undefined;

    const id = window.setInterval(() => {
      setTimeLeft((previous) => {
        const next = Math.max(0, previous - 1);
        if (next <= 0 && !finishedRef.current) {
          finishedRef.current = true;
          onGameOver(score);
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [onGameOver, score, useSharedTopHud]);

  useEffect(() => {
    if (!canBuild || locked || !isExact) return;
    if (sessionLevel > 3) return;

    const id = window.setTimeout(() => {
      if (!locked && isExact) {
        completeChallenge();
      }
    }, 280);

    return () => window.clearTimeout(id);
  }, [canBuild, isExact, locked, sessionLevel]);

  const loadNextChallenge = () => {
    const nextLevel = sessionLevel + 1;
    const next = generateChallenge(nextLevel);
    setSessionLevel(nextLevel);
    setChallenge(next);
    setPlayerHeights(cloneMatrix(next.prefilledHeights));
    setToolMode('place');
    setActiveLayer(1);
    setMissingSolved(!next.missingPrompt);
    setSelectedMissingOption(null);
    setFeedback(null);
    setLocked(false);
  };

  const completeChallenge = () => {
    if (locked || finishedRef.current) return;

    setLocked(true);
    triggerHaptic('success');

    const gained = 220 + sessionLevel * 20 + streak * 35 + (useSharedTopHud ? 0 : Math.floor(timeLeft * 2));
    const nextScore = score + gained;
    const nextStreak = streak + 1;
    const nextSolved = solvedCount + 1;

    setScore(nextScore);
    setStreak(nextStreak);
    setSolvedCount(nextSolved);
    setFeedback({ type: 'success', message: 'Perfect build! Vault matched exactly.' });

    confetti({
      particleCount: 50,
      spread: 55,
      origin: { y: 0.67 },
      colors: ['#60a5fa', '#22d3ee', '#fde047'],
    });

    window.setTimeout(() => {
      if (nextSolved >= PUZZLES_TO_WIN) {
        finishedRef.current = true;
        onVictory(scoreToStars(nextScore), nextScore);
        return;
      }
      loadNextChallenge();
    }, 580);
  };

  const failCheck = () => {
    if (locked) return;

    setLocked(true);
    setStreak(0);
    setFeedback({
      type: 'error',
      message:
        extraVolume > 0
          ? `Too many cubes: remove ${extraVolume} extra.`
          : `Missing ${missingVolume} cubes. Add more stacks.`,
    });

    if (!useSharedTopHud) {
      setTimeLeft((previous) => Math.max(0, previous - 4));
    }

    triggerHaptic('warning');

    window.setTimeout(() => {
      setLocked(false);
      setFeedback(null);
    }, 820);
  };

  const handleMissingSelection = (option: number) => {
    if (!challenge.missingPrompt || missingSolved || locked) return;

    setSelectedMissingOption(option);

    if (option === challenge.missingPrompt.answer) {
      setMissingSolved(true);
      setFeedback({ type: 'info', message: 'Correct. Now build the vault.' });
      triggerHaptic('selection');
      window.setTimeout(() => setFeedback(null), 700);
      return;
    }

    setFeedback({
      type: 'error',
      message: `Not quite. Correct answer is ${challenge.missingPrompt.answer}.`,
    });
    setStreak(0);
    if (!useSharedTopHud) {
      setTimeLeft((previous) => Math.max(0, previous - 3));
    }
    triggerHaptic('error');
    window.setTimeout(() => setFeedback(null), 860);
  };

  const applyToCell = (x: number, y: number) => {
    if (!canBuild || locked) return;

    setPlayerHeights((previous) => {
      const next = cloneMatrix(previous);
      const current = next[y][x];
      const target = targetHeights[y][x];
      const floor = prefilledHeights[y][x];
      const cap = Math.min(MAX_CELL_HEIGHT, Math.max(maxTargetHeight + 1, target + 2));

      if (toolMode === 'place') {
        if (current >= cap) return previous;
        next[y][x] = current + 1;
        triggerHaptic('light');
      } else {
        if (current <= floor) return previous;
        next[y][x] = current - 1;
        triggerHaptic('tap');
      }

      return next;
    });
  };

  const fillCurrentLayer = () => {
    if (!canBuild || locked) return;

    setPlayerHeights((previous) => {
      const next = cloneMatrix(previous);
      for (let y = 0; y < challenge.depth; y += 1) {
        for (let x = 0; x < challenge.length; x += 1) {
          if (targetHeights[y][x] >= clampedLayer) {
            next[y][x] = Math.max(next[y][x], clampedLayer);
          }
        }
      }
      return next;
    });

    triggerHaptic('medium');
  };

  const resetBuild = () => {
    if (locked) return;
    setPlayerHeights(cloneMatrix(prefilledHeights));
    setToolMode('place');
    setFeedback(null);
    triggerHaptic('tap');
  };

  const feedbackToneClass =
    feedback?.type === 'success'
      ? 'border-emerald-200/55 bg-emerald-500/18 text-emerald-100'
      : feedback?.type === 'error'
        ? 'border-rose-200/50 bg-rose-500/16 text-rose-100'
        : 'border-sky-100/28 bg-slate-950/44 text-white/90';

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#040a1c]">
      <img
        src={volumeBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,28,0.44),rgba(4,10,28,0.2)_32%,rgba(4,10,28,0.56)_100%)]" />

      <div className={`relative z-10 flex h-full min-h-0 flex-1 flex-col px-3 ${useSharedTopHud ? 'pb-2 pt-2' : 'pb-[max(5.1rem,calc(env(safe-area-inset-bottom)+4.35rem))] pt-[max(0.6rem,env(safe-area-inset-top))]'}`}>
        {!useSharedTopHud && (
          <header className="shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="rounded-full border border-sky-100/34 bg-slate-950/62 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-sky-100">
                Volume Vault - Lv {sessionLevel}
              </div>
              <div className="rounded-full border border-emerald-200/45 bg-emerald-400/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100">
                Streak x{streak}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-sky-100/30 bg-slate-950/58">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#22c55e,#84cc16,#facc15,#fb923c,#ef4444)] transition-all duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, (timeLeft / FALLBACK_TIME) * 100))}%` }}
                />
              </div>
              <div className="w-11 text-right text-sm font-black text-white">{Math.ceil(timeLeft)}s</div>
            </div>
          </header>
        )}

        <main className={`flex min-h-0 flex-1 flex-col gap-2 ${useSharedTopHud ? 'mt-0' : 'mt-2'}`}>
          <div className="rounded-2xl border border-white/20 bg-slate-950/46 px-3 py-2 text-center shadow-[0_8px_20px_rgba(2,6,23,0.34)]">
            <div className="text-sm font-black text-white">{challenge.prompt}</div>
            <div className="mt-0.5 text-xs font-semibold text-sky-100/82">{challenge.helper}</div>
            <div className="mt-1 text-xs font-black text-amber-100/90">
              Target: {targetVolume} cubes | Filled: {playerVolume} | Progress: {Math.round(progressRatio * 100)}%
            </div>
          </div>

          {challenge.missingPrompt && !missingSolved && (
            <div className="rounded-2xl border border-amber-200/35 bg-slate-950/55 p-3">
              <div className="text-center text-sm font-black text-amber-100">{challenge.missingPrompt.text}</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {challenge.missingPrompt.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleMissingSelection(option)}
                    className={`h-11 rounded-xl border text-lg font-black ${
                      selectedMissingOption === option
                        ? 'border-yellow-200/80 bg-[linear-gradient(180deg,#fcd34d,#f59e0b)] text-amber-950'
                        : 'border-sky-100/28 bg-slate-900/75 text-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-sky-100/24 bg-slate-950/36 p-2">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(125,211,252,0.24),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(250,204,21,0.14),transparent_34%)]" />

            <div
              className="relative grid h-full min-h-0 gap-2"
              style={{
                gridTemplateColumns: `repeat(${challenge.length}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${challenge.depth}, minmax(0, 1fr))`,
              }}
            >
              {targetHeights.map((row, y) => row.map((targetHeight, x) => {
                const value = playerHeights[y][x];
                const prefilled = prefilledHeights[y][x];
                const ratio = Math.max(0, Math.min(1, targetHeight > 0 ? value / targetHeight : 0));
                const isOver = value > targetHeight;

                return (
                  <button
                    key={`${challenge.id}-${x}-${y}`}
                    onClick={() => applyToCell(x, y)}
                    disabled={!canBuild || locked}
                    className={`group relative min-h-[64px] rounded-xl border px-2 py-2 text-left transition-all ${
                      isOver
                        ? 'border-rose-200/55 bg-rose-500/16'
                        : 'border-sky-100/30 bg-slate-900/66 hover:border-cyan-200/55'
                    } ${!canBuild || locked ? 'opacity-60' : 'active:scale-[0.985]'}`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.08em] text-sky-100/82">
                      <span>Tile {y + 1}-{x + 1}</span>
                      {prefilled > 0 ? <span className="text-cyan-200">Lock {prefilled}</span> : <span>Open</span>}
                    </div>

                    <div className="mt-1 flex items-end justify-between gap-2">
                      <div className="text-2xl font-black leading-none text-white">{value}</div>
                      <div className="text-xs font-black text-amber-100">/ {targetHeight}</div>
                    </div>

                    <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-sky-100/22 bg-slate-950/65">
                      <div
                        className={`h-full transition-all duration-150 ${isOver ? 'bg-[linear-gradient(90deg,#fb7185,#ef4444)]' : 'bg-[linear-gradient(90deg,#22d3ee,#60a5fa,#fde047)]'}`}
                        style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }}
                      />
                    </div>
                  </button>
                );
              }))}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto] gap-2">
            <div className="rounded-2xl border border-white/18 bg-slate-950/46 p-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setToolMode('place')}
                  disabled={!canBuild || locked}
                  className={`h-11 rounded-xl border text-sm font-black uppercase tracking-[0.08em] ${
                    toolMode === 'place'
                      ? 'border-cyan-200/78 bg-[linear-gradient(180deg,#22d3ee,#2563eb)] text-white'
                      : 'border-sky-100/24 bg-slate-900/72 text-sky-100'
                  }`}
                >
                  Place
                </button>
                <button
                  onClick={() => setToolMode('remove')}
                  disabled={!canBuild || locked}
                  className={`h-11 rounded-xl border text-sm font-black uppercase tracking-[0.08em] ${
                    toolMode === 'remove'
                      ? 'border-cyan-200/78 bg-[linear-gradient(180deg,#22d3ee,#2563eb)] text-white'
                      : 'border-sky-100/24 bg-slate-900/72 text-sky-100'
                  }`}
                >
                  Remove
                </button>
                <button
                  onClick={resetBuild}
                  disabled={locked}
                  className="flex h-11 items-center justify-center gap-1 rounded-xl border border-sky-100/24 bg-slate-900/72 text-sm font-black uppercase tracking-[0.08em] text-sky-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setActiveLayer((previous) => Math.max(1, previous - 1))}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-100/24 bg-slate-900/72 text-sm font-black text-white"
                >
                  <Minus className="h-4 w-4" /> Layer
                </button>
                <div className="flex h-10 items-center justify-center rounded-xl border border-amber-200/42 bg-amber-400/14 text-sm font-black text-amber-100">
                  {clampedLayer}/{Math.max(1, maxTargetHeight)}
                </div>
                <button
                  onClick={() => setActiveLayer((previous) => Math.min(Math.max(1, maxTargetHeight), previous + 1))}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-100/24 bg-slate-900/72 text-sm font-black text-white"
                >
                  Layer <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex w-[8rem] flex-col gap-2 rounded-2xl border border-white/18 bg-slate-950/46 p-2">
              <button
                onClick={fillCurrentLayer}
                disabled={!canBuild || locked}
                className="flex h-11 items-center justify-center gap-1 rounded-xl border border-emerald-200/48 bg-emerald-500/16 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-100"
              >
                <Layers className="h-4 w-4" />
                Fill Layer
              </button>
              <button
                onClick={isExact ? completeChallenge : failCheck}
                disabled={!canBuild || locked}
                className="flex h-11 items-center justify-center gap-1 rounded-xl border border-yellow-200/68 bg-[linear-gradient(180deg,#fde047,#f59e0b)] text-xs font-black uppercase tracking-[0.1em] text-amber-950"
              >
                {isExact ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                Submit
              </button>
            </div>
          </div>

          <div className={`shrink-0 rounded-xl border px-3 py-2 text-center text-sm font-bold ${feedbackToneClass}`}>
            {feedback?.message ?? `Solve ${PUZZLES_TO_WIN - solvedCount} more vault${PUZZLES_TO_WIN - solvedCount === 1 ? '' : 's'} to clear this run.`}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VolumeVaultGame;
