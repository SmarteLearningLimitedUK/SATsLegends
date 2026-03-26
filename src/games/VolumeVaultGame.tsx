import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Layers, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import GameActionDock from '../components/GameActionDock';
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
  hiddenLayers: boolean;
  answerUnit: string;
  prompt: string;
  helper: string;
  missingPrompt: MissingDimensionPrompt | null;
}

interface CubeInstance {
  key: string;
  x: number;
  y: number;
  z: number;
  kind: 'player' | 'prefilled' | 'ghost' | 'extra';
}

interface FeedbackState {
  type: 'correct' | 'incorrect' | 'info';
  message: string;
}

interface IsoMetrics {
  tileW: number;
  tileH: number;
  cubeH: number;
  originX: number;
  originY: number;
}

const TOTAL_TIME = 92;
const PUZZLES_TO_WIN = 8;

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const shuffle = <T,>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const createMatrix = (rows: number, cols: number, value = 0): GridMatrix =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));

const cloneMatrix = (matrix: GridMatrix): GridMatrix => matrix.map((row) => [...row]);

const sumMatrix = (matrix: GridMatrix): number =>
  matrix.reduce((total, row) => total + row.reduce((rowTotal, cell) => rowTotal + cell, 0), 0);

const maxMatrix = (matrix: GridMatrix): number =>
  matrix.reduce((maxValue, row) => Math.max(maxValue, ...row), 0);

const makeOptions = (correct: number): number[] => {
  const spread = Math.max(1, Math.round(correct * 0.24));
  const options = new Set<number>([correct]);
  while (options.size < 4) {
    const candidate = Math.max(1, correct + randInt(-spread, spread));
    options.add(candidate);
  }
  return shuffle(Array.from(options));
};

const buildCuboidHeights = (depth: number, length: number, height: number): GridMatrix =>
  createMatrix(depth, length, height);

const buildCompoundHeights = (depth: number, length: number, baseHeight: number): GridMatrix => {
  const matrix = createMatrix(depth, length, baseHeight);
  const cutouts = randInt(2, Math.max(3, Math.floor((depth * length) / 4)));
  for (let i = 0; i < cutouts; i += 1) {
    const y = randInt(0, depth - 1);
    const x = randInt(0, length - 1);
    matrix[y][x] = Math.max(1, matrix[y][x] - randInt(1, Math.max(1, baseHeight - 1)));
  }
  return matrix;
};

const buildPrefilled = (target: GridMatrix, ratio: number): GridMatrix => {
  const prefilled = createMatrix(target.length, target[0]?.length ?? 0, 0);
  const total = sumMatrix(target);
  const targetPrefill = Math.max(1, Math.floor(total * ratio));
  let running = 0;

  while (running < targetPrefill) {
    const y = randInt(0, target.length - 1);
    const x = randInt(0, target[0].length - 1);
    if (prefilled[y][x] >= target[y][x]) continue;
    prefilled[y][x] += 1;
    running += 1;
  }

  return prefilled;
};

const createMissingPrompt = (
  level: number,
  length: number,
  depth: number,
  height: number,
  unit: string,
): MissingDimensionPrompt => {
  const volume = length * depth * height;
  const axis = randomFrom<'length' | 'depth' | 'height'>(['length', 'depth', 'height']);

  if (axis === 'height') {
    const oneLayer = length * depth;
    return {
      text: `Volume is ${volume} ${unit}³. One layer holds ${oneLayer} cubes. How many layers?`,
      answer: height,
      options: makeOptions(height),
    };
  }

  if (axis === 'length') {
    return {
      text: `Volume is ${volume} ${unit}³. Depth = ${depth} ${unit}, Height = ${height} ${unit}. Missing length?`,
      answer: length,
      options: makeOptions(length),
    };
  }

  return {
    text: `Volume is ${volume} ${unit}³. Length = ${length} ${unit}, Height = ${height} ${unit}. Missing depth?`,
    answer: depth,
    options: makeOptions(depth),
  };
};

const generateChallenge = (level: number): VolumeChallenge => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const unit = 'u';

  if (level <= 3) {
    const length = randInt(2, 3);
    const depth = randInt(2, 3);
    const height = randInt(1, 3);
    const targetHeights = buildCuboidHeights(depth, length, height);
    return {
      id,
      level,
      kind: 'build',
      length,
      depth,
      targetHeights,
      prefilledHeights: createMatrix(depth, length, 0),
      hiddenLayers: false,
      answerUnit: unit,
      prompt: `Build a ${length} x ${depth} x ${height} cuboid.`,
      helper: 'Tap or drag over tiles to stack cubes.',
      missingPrompt: null,
    };
  }

  if (level <= 6) {
    const length = randInt(3, 5);
    const depth = randInt(2, 4);
    const height = randInt(2, 4);
    const targetHeights = buildCuboidHeights(depth, length, height);
    return {
      id,
      level,
      kind: 'missing_dimension',
      length,
      depth,
      targetHeights,
      prefilledHeights: createMatrix(depth, length, 0),
      hiddenLayers: false,
      answerUnit: unit,
      prompt: 'Solve the missing dimension, then build the cuboid.',
      helper: 'Use volume logic first, then pack the cubes.',
      missingPrompt: createMissingPrompt(level, length, depth, height, unit),
    };
  }

  if (level <= 10) {
    const length = randInt(3, 6);
    const depth = randInt(3, 5);
    const height = randInt(2, 5);
    const targetHeights = buildCuboidHeights(depth, length, height);
    return {
      id,
      level,
      kind: 'prefilled',
      length,
      depth,
      targetHeights,
      prefilledHeights: buildPrefilled(targetHeights, 0.28),
      hiddenLayers: false,
      answerUnit: unit,
      prompt: `Complete this ${length} x ${depth} x ${height} cuboid.`,
      helper: 'Some cubes are locked in place. Finish the volume.',
      missingPrompt: null,
    };
  }

  const length = randInt(4, 6);
  const depth = randInt(4, 6);
  const baseHeight = randInt(2, 5);
  const targetHeights = buildCompoundHeights(depth, length, baseHeight);
  const maxHeight = maxMatrix(targetHeights);
  const maybeMissing = Math.random() > 0.55;
  const missingPrompt = maybeMissing
    ? createMissingPrompt(level, length, depth, maxHeight, unit)
    : null;

  return {
    id,
    level,
    kind: 'compound',
    length,
    depth,
    targetHeights,
    prefilledHeights: buildPrefilled(targetHeights, 0.2),
    hiddenLayers: true,
    answerUnit: unit,
    prompt: 'Build the irregular volume exactly.',
    helper: 'Use layer view to inspect hidden stacks.',
    missingPrompt,
  };
};

const scoreToStars = (score: number) => {
  if (score >= 3600) return 3;
  if (score >= 2400) return 2;
  return 1;
};

const getIsoMetrics = (
  width: number,
  height: number,
  length: number,
  depth: number,
  maxHeight: number,
): IsoMetrics => {
  const usableW = Math.max(260, width - 14);
  const usableH = Math.max(210, height - 14);
  const tileW = Math.min(54, usableW / (length + depth + 1));
  const tileH = tileW * 0.54;
  const cubeH = tileW * 0.48;
  const originX = usableW / 2;
  const originY = usableH - 12 - maxHeight * cubeH - tileH;
  return { tileW, tileH, cubeH, originX, originY };
};

const getCubePoints = (x: number, y: number, z: number, metrics: IsoMetrics) => {
  const cx = metrics.originX + (x - y) * (metrics.tileW / 2);
  const cy = metrics.originY + (x + y) * (metrics.tileH / 2) - z * metrics.cubeH;

  const top = [
    [cx, cy],
    [cx + metrics.tileW / 2, cy + metrics.tileH / 2],
    [cx, cy + metrics.tileH],
    [cx - metrics.tileW / 2, cy + metrics.tileH / 2],
  ];
  const right = [
    [cx + metrics.tileW / 2, cy + metrics.tileH / 2],
    [cx + metrics.tileW / 2, cy + metrics.tileH / 2 + metrics.cubeH],
    [cx, cy + metrics.tileH + metrics.cubeH],
    [cx, cy + metrics.tileH],
  ];
  const left = [
    [cx - metrics.tileW / 2, cy + metrics.tileH / 2],
    [cx - metrics.tileW / 2, cy + metrics.tileH / 2 + metrics.cubeH],
    [cx, cy + metrics.tileH + metrics.cubeH],
    [cx, cy + metrics.tileH],
  ];

  return { top, right, left };
};

const toPoints = (points: number[][]) => points.map((point) => `${point[0]},${point[1]}`).join(' ');

const VolumeVaultGame: React.FC<VolumeVaultGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const initialChallengeRef = useRef<VolumeChallenge>(generateChallenge(Math.max(1, levelId)));
  const [sessionLevel, setSessionLevel] = useState(Math.max(1, levelId));
  const [challenge, setChallenge] = useState<VolumeChallenge>(initialChallengeRef.current);
  const [playerHeights, setPlayerHeights] = useState<GridMatrix>(() => cloneMatrix(initialChallengeRef.current.prefilledHeights));
  const [toolMode, setToolMode] = useState<ToolMode>('place');
  const [layerView, setLayerView] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctSolved, setCorrectSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [boardFlash, setBoardFlash] = useState(false);
  const [snapPulse, setSnapPulse] = useState<{ x: number; y: number; z: number } | null>(null);
  const [missingSolved, setMissingSolved] = useState(false);
  const [selectedMissingOption, setSelectedMissingOption] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [boardSize, setBoardSize] = useState({ width: 420, height: 360 });

  const boardRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);
  const finishedRef = useRef(false);

  const prefilledHeights = challenge.prefilledHeights;
  const targetHeights = challenge.targetHeights;
  const maxTargetHeight = maxMatrix(targetHeights);
  const activeLayer = Math.max(1, Math.min(layerView, Math.max(1, maxTargetHeight)));
  const metrics = useMemo(
    () => getIsoMetrics(boardSize.width, boardSize.height, challenge.length, challenge.depth, maxTargetHeight + 1),
    [boardSize.height, boardSize.width, challenge.depth, challenge.length, maxTargetHeight],
  );

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

  const canBuild = !challenge.missingPrompt || missingSolved;
  const isExact = missingVolume === 0 && extraVolume === 0;
  const progressRatio = Math.max(0, Math.min(1, targetVolume > 0 ? playerVolume / targetVolume : 0));
  const timeRatio = Math.max(0, Math.min(1, timeLeft / TOTAL_TIME));

  const cubeInstances = useMemo(() => {
    const instances: CubeInstance[] = [];
    const visibleLimit = challenge.hiddenLayers ? activeLayer : maxTargetHeight + 1;

    for (let y = 0; y < challenge.depth; y += 1) {
      for (let x = 0; x < challenge.length; x += 1) {
        const target = targetHeights[y][x];
        const player = playerHeights[y][x];
        const lockedPrefill = prefilledHeights[y][x];

        for (let z = 0; z < Math.min(player, visibleLimit); z += 1) {
          const kind: CubeInstance['kind'] =
            z < target
              ? z < lockedPrefill
                ? 'prefilled'
                : 'player'
              : 'extra';
          instances.push({ key: `p-${x}-${y}-${z}`, x, y, z, kind });
        }

        for (let z = player; z < Math.min(target, visibleLimit); z += 1) {
          instances.push({ key: `g-${x}-${y}-${z}`, x, y, z, kind: 'ghost' });
        }
      }
    }

    return instances.sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z));
  }, [activeLayer, challenge.depth, challenge.hiddenLayers, challenge.length, maxTargetHeight, playerHeights, prefilledHeights, targetHeights]);

  const cellTopPolys = useMemo(() => {
    const cells: Array<{ x: number; y: number; points: number[][] }> = [];
    for (let y = 0; y < challenge.depth; y += 1) {
      for (let x = 0; x < challenge.length; x += 1) {
        const z = Math.max(0, playerHeights[y][x] - 1);
        cells.push({ x, y, points: getCubePoints(x, y, z, metrics).top });
      }
    }
    return cells;
  }, [challenge.depth, challenge.length, metrics, playerHeights]);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) return undefined;
    const syncSize = () => {
      const rect = node.getBoundingClientRect();
      setBoardSize((previous) => {
        const width = Math.max(220, Math.round(rect.width));
        const height = Math.max(200, Math.round(rect.height));
        if (previous.width === width && previous.height === height) {
          return previous;
        }
        return { width, height };
      });
    };

    syncSize();

    // Guard for browsers/environments where ResizeObserver is unavailable.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncSize);
      return () => {
        window.removeEventListener('resize', syncSize);
      };
    }

    const observer = new ResizeObserver(() => {
      syncSize();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const initial = generateChallenge(Math.max(1, levelId));
    setChallenge(initial);
    setPlayerHeights(cloneMatrix(initial.prefilledHeights));
    setSessionLevel(Math.max(1, levelId));
    setToolMode('place');
    setLayerView(1);
    setScore(0);
    setStreak(0);
    setCorrectSolved(0);
    setTimeLeft(TOTAL_TIME);
    setFeedback(null);
    setBoardFlash(false);
    setSnapPulse(null);
    setMissingSolved(false);
    setSelectedMissingOption(null);
    setLocked(false);
    finishedRef.current = false;
  }, [levelId]);

  useEffect(() => {
    if (finishedRef.current) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        const drain = sessionLevel >= 11 ? 0.18 : 0.12;
        const next = Math.max(0, previous - drain);
        if (next <= 0.001 && !finishedRef.current) {
          finishedRef.current = true;
          onGameOver(score);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [onGameOver, score, sessionLevel]);

  useEffect(() => {
    if (!canBuild || locked || !isExact) return;

    const autoEarly = sessionLevel <= 3;
    if (!autoEarly) return;

    const timeout = window.setTimeout(() => {
      if (!locked && isExact) {
        completeChallenge();
      }
    }, 260);

    return () => window.clearTimeout(timeout);
  }, [canBuild, isExact, locked, sessionLevel]);

  const loadNextChallenge = () => {
    const nextLevel = sessionLevel + 1;
    const nextChallenge = generateChallenge(nextLevel);
    setSessionLevel(nextLevel);
    setChallenge(nextChallenge);
    setPlayerHeights(cloneMatrix(nextChallenge.prefilledHeights));
    setLayerView(1);
    setMissingSolved(!nextChallenge.missingPrompt);
    setSelectedMissingOption(null);
    setFeedback(null);
    setLocked(false);
    setToolMode('place');
  };

  const completeChallenge = () => {
    if (finishedRef.current || locked) return;
    setLocked(true);
    setBoardFlash(true);
    triggerHaptic('success');

    const gained = 220 + sessionLevel * 22 + streak * 36 + Math.floor(timeLeft * 3);
    const nextScore = score + gained;
    const nextStreak = streak + 1;
    const nextSolved = correctSolved + 1;

    setScore(nextScore);
    setStreak(nextStreak);
    setCorrectSolved(nextSolved);
    setFeedback({ type: 'correct', message: 'Perfect build! Volume matched exactly.' });

    confetti({
      particleCount: 60,
      spread: 58,
      origin: { y: 0.65 },
      colors: ['#60a5fa', '#22d3ee', '#fde047'],
    });

    window.setTimeout(() => {
      setBoardFlash(false);
      if (nextSolved >= PUZZLES_TO_WIN) {
        finishedRef.current = true;
        onVictory(scoreToStars(nextScore), nextScore);
        return;
      }
      loadNextChallenge();
    }, 650);
  };

  const failCheck = () => {
    if (locked) return;
    setLocked(true);
    setStreak(0);
    setFeedback({
      type: 'incorrect',
      message: extraVolume > 0
        ? `Too many cubes (${extraVolume} extra). Remove extras and retry.`
        : `Missing ${missingVolume} cubes. Keep stacking!`,
    });
    triggerHaptic('warning');
    window.setTimeout(() => {
      setLocked(false);
      setFeedback(null);
    }, 920);
  };

  const handleMissingSelection = (option: number) => {
    if (!challenge.missingPrompt || missingSolved || locked) return;
    setSelectedMissingOption(option);
    if (option === challenge.missingPrompt.answer) {
      setMissingSolved(true);
      setFeedback({ type: 'info', message: 'Dimension solved. Build the cuboid now.' });
      triggerHaptic('selection');
      window.setTimeout(() => setFeedback(null), 700);
      return;
    }
    setFeedback({ type: 'incorrect', message: `Not quite. Correct answer is ${challenge.missingPrompt.answer}.` });
    setStreak(0);
    setTimeLeft((previous) => Math.max(0, previous - 4));
    triggerHaptic('error');
    window.setTimeout(() => setFeedback(null), 900);
  };

  const applyToCell = (x: number, y: number) => {
    if (!canBuild || locked) return;
    setPlayerHeights((previous) => {
      const next = cloneMatrix(previous);
      const current = next[y][x];
      const target = targetHeights[y][x];
      const lockedFloor = prefilledHeights[y][x];
      const maxHeight = Math.max(target + 1, maxTargetHeight + 1);

      if (toolMode === 'place') {
        if (current >= maxHeight) return previous;
        next[y][x] = current + 1;
        setSnapPulse({ x, y, z: current });
        triggerHaptic('light');
      } else {
        if (current <= lockedFloor) return previous;
        next[y][x] = current - 1;
        triggerHaptic('tap');
      }
      return next;
    });
  };

  const fillCurrentLayer = () => {
    if (!canBuild || locked) return;
    const layer = activeLayer;
    setPlayerHeights((previous) => {
      const next = cloneMatrix(previous);
      for (let y = 0; y < challenge.depth; y += 1) {
        for (let x = 0; x < challenge.length; x += 1) {
          if (targetHeights[y][x] >= layer) {
            next[y][x] = Math.max(next[y][x], layer);
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
  };

  const cubeStyle = (kind: CubeInstance['kind']) => {
    if (kind === 'prefilled') {
      return {
        top: 'rgba(147,197,253,0.98)',
        left: 'rgba(59,130,246,0.98)',
        right: 'rgba(37,99,235,0.98)',
        stroke: 'rgba(191,219,254,0.92)',
      };
    }
    if (kind === 'ghost') {
      return {
        top: 'rgba(96,165,250,0.18)',
        left: 'rgba(96,165,250,0.12)',
        right: 'rgba(96,165,250,0.14)',
        stroke: 'rgba(125,211,252,0.36)',
      };
    }
    if (kind === 'extra') {
      return {
        top: 'rgba(251,113,133,0.95)',
        left: 'rgba(244,63,94,0.95)',
        right: 'rgba(225,29,72,0.95)',
        stroke: 'rgba(254,205,211,0.9)',
      };
    }
    return {
      top: 'rgba(253,230,138,0.98)',
      left: 'rgba(251,191,36,0.98)',
      right: 'rgba(245,158,11,0.98)',
      stroke: 'rgba(254,240,138,0.94)',
    };
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#040a1c]">
      <img
        src={volumeBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,28,0.48),rgba(4,10,28,0.22)_34%,rgba(4,10,28,0.58)_100%)]" />

      <div className={`relative z-10 flex h-full flex-col px-3 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.2rem)]' : 'pt-[max(0.6rem,env(safe-area-inset-top))]'}`}>
        {!useSharedTopHud && (
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-full border border-sky-100/34 bg-slate-950/62 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-sky-100">
              Volume Vault • Lv {sessionLevel}
            </div>
            <div className="rounded-full border border-emerald-200/45 bg-emerald-400/14 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100">
              Streak x{streak}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-3 flex-1 overflow-hidden rounded-full border border-sky-100/30 bg-slate-950/58">
              <motion.div
                animate={{ width: `${timeRatio * 100}%` }}
                transition={{ duration: 0.15, ease: 'linear' }}
                className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#22c55e,#84cc16,#facc15,#fb923c,#ef4444)]"
              />
            </div>
            <div className="w-11 text-right text-sm font-black text-white">{Math.ceil(timeLeft)}s</div>
          </div>
        </header>
        )}

        <main className={`flex min-h-0 flex-1 flex-col gap-2 ${useSharedTopHud ? 'mt-0' : 'mt-2'}`}>
          <div className="rounded-2xl border border-white/20 bg-slate-950/48 px-3 py-2 text-center shadow-[0_8px_20px_rgba(2,6,23,0.34)]">
            <div className="text-sm font-black text-white">{challenge.prompt}</div>
            <div className="mt-0.5 text-xs font-semibold text-sky-100/82">{challenge.helper}</div>
            <div className="mt-1 text-xs font-black text-amber-100/90">
              Target: {targetVolume} cubes • Filled: {playerVolume} • Progress: {Math.round(progressRatio * 100)}%
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

          <div
            ref={boardRef}
            className={`relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-sky-100/22 ${
              boardFlash ? 'bg-emerald-400/18' : 'bg-slate-950/34'
            }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(125,211,252,0.24),transparent_28%),radial-gradient(circle_at_50%_95%,rgba(250,204,21,0.15),transparent_32%)]" />

            <svg
              viewBox={`0 0 ${Math.max(240, boardSize.width)} ${Math.max(220, boardSize.height)}`}
              className="h-full w-full"
              onPointerUp={() => { paintingRef.current = false; }}
              onPointerLeave={() => { paintingRef.current = false; }}
            >
              {cubeInstances.map((cube) => {
                const points = getCubePoints(cube.x, cube.y, cube.z, metrics);
                const style = cubeStyle(cube.kind);
                const isPulse =
                  snapPulse &&
                  snapPulse.x === cube.x &&
                  snapPulse.y === cube.y &&
                  snapPulse.z === cube.z &&
                  cube.kind !== 'ghost';

                return (
                  <g key={cube.key} opacity={challenge.hiddenLayers && cube.z + 1 > activeLayer ? 0.08 : 1}>
                    <polygon points={toPoints(points.left)} fill={style.left} stroke={style.stroke} strokeWidth={0.8} />
                    <polygon points={toPoints(points.right)} fill={style.right} stroke={style.stroke} strokeWidth={0.8} />
                    <polygon points={toPoints(points.top)} fill={style.top} stroke={style.stroke} strokeWidth={0.9} />
                    {isPulse && (
                      <polygon
                        points={toPoints(points.top)}
                        fill="rgba(255,255,255,0.34)"
                        stroke="rgba(255,255,255,0.65)"
                        strokeWidth={0.8}
                      />
                    )}
                  </g>
                );
              })}

              {canBuild && cellTopPolys.map((cell) => (
                <polygon
                  key={`cell-${cell.x}-${cell.y}`}
                  points={toPoints(cell.points)}
                  fill="rgba(255,255,255,0.001)"
                  stroke="rgba(255,255,255,0.0)"
                  strokeWidth={0.01}
                  onPointerDown={() => {
                    paintingRef.current = true;
                    applyToCell(cell.x, cell.y);
                  }}
                  onPointerEnter={() => {
                    if (paintingRef.current) {
                      applyToCell(cell.x, cell.y);
                    }
                  }}
                />
              ))}
            </svg>
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
                  onClick={() => setLayerView((previous) => Math.max(1, previous - 1))}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-100/24 bg-slate-900/72 text-sm font-black text-white"
                >
                  <Minus className="h-4 w-4" /> Layer
                </button>
                <div className="flex h-10 items-center justify-center rounded-xl border border-amber-200/42 bg-amber-400/14 text-sm font-black text-amber-100">
                  {activeLayer}/{Math.max(1, maxTargetHeight)}
                </div>
                <button
                  onClick={() => setLayerView((previous) => Math.min(Math.max(1, maxTargetHeight), previous + 1))}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-sky-100/24 bg-slate-900/72 text-sm font-black text-white"
                >
                  Layer <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex w-[7.7rem] flex-col gap-2 rounded-2xl border border-white/18 bg-slate-950/46 p-2">
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
                <Sparkles className="h-4 w-4" />
                Submit
              </button>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-white/16 bg-slate-950/42 px-3 py-2 text-center text-sm font-bold text-white/90">
            {feedback?.message ?? `Solve ${PUZZLES_TO_WIN - correctSolved} more build${PUZZLES_TO_WIN - correctSolved === 1 ? '' : 's'} to clear the vault.`}
          </div>
        </main>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </div>
  );
};

export default VolumeVaultGame;
