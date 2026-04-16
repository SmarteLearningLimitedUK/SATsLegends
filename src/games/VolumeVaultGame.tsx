import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, Undo2, Wrench } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import vaultSprite from '../assets/vault.png';
import vaultBackdrop from '../assets/maps/finalmap.png';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface VolumeVaultGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type VolumeVaultGameShellProps = VolumeVaultGameProps & MiniGameShellContractProps;
type ChallengeType = 'buildTargetVolume' | 'buildCuboid' | 'countVolume' | 'fillMissingCubes' | 'chooseCorrectShape';
type BoardState = number[][];
type VaultAnimationState = 'locked' | 'shudder' | 'unlocking' | 'open';
type QuestionKind = 'fluency' | 'reasoning';

interface BoardSize { rows: number; cols: number; maxHeight: number }
interface CuboidDimensions { length: number; width: number; height: number }
interface ShapeChoice { id: string; label: string; board: BoardState; volume: number }

interface VolumeQuestion {
  id: string;
  type: ChallengeType;
  prompt: string;
  boardSize: BoardSize;
  initialBoard: BoardState;
  targetVolume?: number;
  targetDimensions?: CuboidDimensions;
  expectedBoard?: BoardState;
  ghostBoard?: BoardState;
  countOptions?: number[];
  correctCountAnswer?: number;
  missingCubeTarget?: number;
  shapeChoices?: ShapeChoice[];
  correctShapeChoiceId?: string;
  kind: QuestionKind;
}

interface VaultLevelConfig {
  id: number;
  title: string;
  questions: VolumeQuestion[];
}

const SAFE_SHAKE_MS = 520;
const ADVANCE_MS = 660;
const FINAL_OPEN_MS = 1380;
const MAX_HISTORY = 50;
const TILE_W = 54;
const TILE_H = 28;
const STACK_LIFT = 18;
const CUBE_W = 50;

let qSeed = 0;
const qId = () => {
  qSeed += 1;
  return `volume-vault-q-${qSeed}`;
};

const createBoard = (rows: number, cols: number, fill = 0): BoardState => Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
const cloneBoard = (board: BoardState): BoardState => board.map((r) => [...r]);
const sumBoard = (board: BoardState) => board.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatDims = (d: CuboidDimensions) => `${d.length} x ${d.width} x ${d.height}`;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const boardEquals = (a: BoardState, b: BoardState) => {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r += 1) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c += 1) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
};

const centeredCuboid = (size: BoardSize, dims: CuboidDimensions): BoardState => {
  const board = createBoard(size.rows, size.cols, 0);
  const rs = Math.max(0, Math.floor((size.rows - dims.width) / 2));
  const cs = Math.max(0, Math.floor((size.cols - dims.length) / 2));
  for (let r = rs; r < rs + dims.width; r += 1) {
    for (let c = cs; c < cs + dims.length; c += 1) board[r][c] = dims.height;
  }
  return board;
};

const removeCubes = (fullBoard: BoardState, amount: number): BoardState => {
  const next = cloneBoard(fullBoard);
  let removed = 0;
  while (removed < amount) {
    const cells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < next.length; r += 1) {
      for (let c = 0; c < next[r].length; c += 1) if (next[r][c] > 0) cells.push({ r, c });
    }
    if (!cells.length) break;
    const pick = cells[Math.floor(Math.random() * cells.length)];
    next[pick.r][pick.c] -= 1;
    removed += 1;
  }
  return next;
};

const countOptions = (answer: number) => {
  const set = new Set<number>([answer, answer - 1, answer + 1, answer - 2, answer + 2, answer + 3]);
  const valid = [...set].filter((v) => v > 0);
  const options = shuffle(valid).slice(0, 4);
  if (!options.includes(answer)) options[0] = answer;
  return shuffle(options);
};

const makeBuildTarget = (targetVolume: number, boardSize: BoardSize): VolumeQuestion => ({
  id: qId(),
  type: 'buildTargetVolume',
  prompt: `Build a shape with volume ${targetVolume}.`,
  boardSize,
  initialBoard: createBoard(boardSize.rows, boardSize.cols, 0),
  targetVolume,
  kind: 'fluency',
});

const makeBuildCuboid = (dims: CuboidDimensions, boardSize: BoardSize): VolumeQuestion => {
  const expected = centeredCuboid(boardSize, dims);
  return {
    id: qId(),
    type: 'buildCuboid',
    prompt: `Build a cuboid ${dims.length} long, ${dims.width} wide, and ${dims.height} high.`,
    boardSize,
    initialBoard: createBoard(boardSize.rows, boardSize.cols, 0),
    targetDimensions: dims,
    targetVolume: dims.length * dims.width * dims.height,
    expectedBoard: expected,
    ghostBoard: expected,
    kind: 'fluency',
  };
};

const makeCount = (shape: BoardState, boardSize: BoardSize): VolumeQuestion => {
  const answer = sumBoard(shape);
  return {
    id: qId(),
    type: 'countVolume',
    prompt: 'What is the volume of this shape?',
    boardSize,
    initialBoard: shape,
    correctCountAnswer: answer,
    targetVolume: answer,
    countOptions: countOptions(answer),
    kind: 'fluency',
  };
};

const makeFill = (dims: CuboidDimensions, boardSize: BoardSize, missing: number): VolumeQuestion => {
  const full = centeredCuboid(boardSize, dims);
  const initial = removeCubes(full, missing);
  return {
    id: qId(),
    type: 'fillMissingCubes',
    prompt: `Fill the missing cubes to complete ${formatDims(dims)}.`,
    boardSize,
    initialBoard: initial,
    expectedBoard: full,
    ghostBoard: full,
    targetDimensions: dims,
    targetVolume: sumBoard(full),
    missingCubeTarget: Math.max(0, sumBoard(full) - sumBoard(initial)),
    kind: 'fluency',
  };
};

const makeChoose = (targetVolume: number, shapes: BoardState[]): VolumeQuestion => {
  const shapeChoices: ShapeChoice[] = shapes.map((board, index) => ({
    id: `shape-${qId()}-${index}`,
    label: String.fromCharCode(65 + index),
    board,
    volume: sumBoard(board),
  }));
  const correct = shapeChoices.find((s) => s.volume === targetVolume) || shapeChoices[0];
  return {
    id: qId(),
    type: 'chooseCorrectShape',
    prompt: `Which shape has volume ${targetVolume}?`,
    boardSize: { rows: 4, cols: 4, maxHeight: 4 },
    initialBoard: createBoard(4, 4, 0),
    targetVolume,
    shapeChoices,
    correctShapeChoiceId: correct.id,
    kind: 'fluency',
  };
};

const randomCountShape = (size: BoardSize, maxDim: number): BoardState => {
  const dims = { length: randomInt(2, maxDim), width: randomInt(2, maxDim), height: randomInt(1, size.maxHeight) };
  const cuboid = centeredCuboid(size, dims);
  if (randomInt(0, 1) === 1) return cuboid;
  return removeCubes(cuboid, randomInt(1, Math.max(1, Math.floor(sumBoard(cuboid) / 4))));
};

const buildLevel = (id: number): VaultLevelConfig => {
  const easy = { rows: 3, cols: 3, maxHeight: 2 };
  const mid = { rows: 4, cols: 4, maxHeight: 3 };
  const hard = { rows: 5, cols: 5, maxHeight: 4 };

  if (id <= 2) {
    return {
      id,
      title: id === 1 ? 'Cube Basics I' : 'Cube Basics II',
      questions: [
        makeBuildTarget(2 + id, easy),
        makeBuildTarget(3 + id, easy),
        makeCount(randomCountShape(easy, 2), easy),
        makeBuildTarget(4 + id, mid),
        makeCount(randomCountShape(mid, 2), mid),
      ],
    };
  }

  if (id <= 4) {
    return {
      id,
      title: id === 3 ? 'Layers' : 'Cuboid Workshop',
      questions: [
        makeBuildTarget(6 + id, mid),
        makeBuildCuboid({ length: 2 + (id % 2), width: 2, height: 2 }, mid),
        makeCount(randomCountShape(mid, 3), mid),
        makeBuildCuboid({ length: 3, width: 2 + (id % 2), height: 2 }, mid),
        makeCount(randomCountShape(mid, 3), mid),
      ],
    };
  }

  if (id <= 6) {
    return {
      id,
      title: id === 5 ? 'Cuboid Mastery' : 'Missing Cubes I',
      questions: [
        makeBuildCuboid({ length: 3, width: 2, height: 2 + (id % 2) }, hard),
        makeFill({ length: 3, width: 2 + (id % 2), height: 2 }, hard, 3 + id),
        makeCount(randomCountShape(hard, 3), hard),
        makeBuildTarget(14 + id, hard),
        makeFill({ length: 4, width: 2, height: 2 + (id % 2) }, hard, 4 + id),
      ],
    };
  }

  if (id <= 8) {
    return {
      id,
      title: id === 7 ? 'Missing Cubes II' : 'Compound Shapes',
      questions: [
        makeFill({ length: 4, width: 3, height: 2 }, hard, 5 + id),
        makeCount(randomCountShape(hard, 4), hard),
        makeBuildTarget(18 + id, hard),
        makeBuildCuboid({ length: 4, width: 2 + (id % 2), height: 2 }, hard),
        makeChoose(18, [
          centeredCuboid(mid, { length: 3, width: 2, height: 3 }),
          centeredCuboid(mid, { length: 4, width: 2, height: 2 }),
          centeredCuboid(mid, { length: 3, width: 3, height: 1 }),
        ]),
      ],
    };
  }

  return {
    id,
    title: id === 9 ? 'Comparison Trials' : 'Master Vault',
    questions: [
      makeChoose(24, [
        centeredCuboid(hard, { length: 4, width: 3, height: 2 }),
        centeredCuboid(hard, { length: 3, width: 3, height: 2 }),
        centeredCuboid(hard, { length: 4, width: 2, height: 2 }),
      ]),
      makeBuildTarget(22 + id, hard),
      makeBuildCuboid({ length: 4, width: 3, height: 2 }, hard),
      makeFill({ length: 4, width: 3, height: 2 }, hard, 6 + id),
      makeCount(randomCountShape(hard, 4), hard),
    ],
  };
};

const VOLUME_LEVELS = Array.from({ length: 10 }, (_, i) => buildLevel(i + 1));
const getLevel = (levelId: number) => VOLUME_LEVELS[(Math.max(1, levelId) - 1) % VOLUME_LEVELS.length];

const scoreToStars = (XP: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (XP >= 1700 && accuracy >= 0.88) return 3;
  if (XP >= 1100 && accuracy >= 0.7) return 2;
  return 1;
};

const CubeVisual: React.FC<{ ghost?: boolean; glow?: boolean }> = ({ ghost = false, glow = false }) => (
  <div className={`absolute h-[42px] w-[50px] ${ghost ? 'opacity-35' : 'opacity-100'}`}>
    <div
      className={`absolute left-[1px] top-0 h-[18px] w-[48px] ${ghost ? 'bg-cyan-200/75' : glow ? 'bg-amber-200' : 'bg-sky-200'}`}
      style={{ clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0 50%)' }}
    />
    <div
      className={`absolute left-[1px] top-[16px] h-[24px] w-[25px] ${ghost ? 'bg-cyan-400/70' : glow ? 'bg-amber-500' : 'bg-sky-500'}`}
      style={{ clipPath: 'polygon(0 0,100% 50%,100% 100%,0 50%)' }}
    />
    <div
      className={`absolute right-[1px] top-[16px] h-[24px] w-[25px] ${ghost ? 'bg-cyan-500/75' : glow ? 'bg-orange-500' : 'bg-blue-600'}`}
      style={{ clipPath: 'polygon(0 50%,100% 0,100% 50%,0 100%)' }}
    />
    {!ghost ? <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_60%)]" /> : null}
  </div>
);

const MiniShapePreview: React.FC<{ board: BoardState; selected?: boolean }> = ({ board, selected = false }) => {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const width = (rows + cols) * 10 + 20;
  const height = (rows + cols) * 5 + 70;
  const ox = width / 2;
  const oy = 32;
  const tiles: Array<{ r: number; c: number; h: number }> = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) tiles.push({ r, c, h: board[r][c] });
  }
  tiles.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  return (
    <div className="relative overflow-hidden rounded-xl border border-cyan-100/30 bg-slate-900/45" style={{ height }}>
      {tiles.flatMap((tile) => {
        const x = ox + (tile.c - tile.r) * 10;
        const y = oy + (tile.c + tile.r) * 5;
        return Array.from({ length: tile.h }).map((_, i) => (
          <div
            key={`mini-${tile.r}-${tile.c}-${i}`}
            className="absolute"
            style={{ left: x - 9, top: y - (i * 9) - 17, width: 18, height: 16 }}
          >
            <div className={`absolute left-0 top-0 h-[8px] w-full ${selected ? 'bg-amber-200' : 'bg-cyan-200'}`} style={{ clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0 50%)' }} />
            <div className={`absolute left-0 top-[6px] h-[10px] w-[50%] ${selected ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ clipPath: 'polygon(0 0,100% 50%,100% 100%,0 50%)' }} />
            <div className={`absolute right-0 top-[6px] h-[10px] w-[50%] ${selected ? 'bg-orange-500' : 'bg-blue-600'}`} style={{ clipPath: 'polygon(0 50%,100% 0,100% 50%,0 100%)' }} />
          </div>
        ));
      })}
    </div>
  );
};

const VolumeVaultGame: React.FC<VolumeVaultGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const activeLevel = useMemo(() => getLevel(levelId), [levelId]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [board, setBoard] = useState<BoardState>(() => cloneBoard(activeLevel.questions[0].initialBoard));
  const [history, setHistory] = useState<BoardState[]>([]);
  const [removeMode, setRemoveMode] = useState(false);
  const [selectedCountAnswer, setSelectedCountAnswer] = useState<number | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [safeState, setSafeState] = useState<VaultAnimationState>('locked');
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [XP, setScore] = useState(0);
  const [wrongPulse, setWrongPulse] = useState(false);
  const [didComplete, setDidComplete] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const [locked, setLocked] = useState(false);
  const timers = useRef<number[]>([]);

  const question = activeLevel.questions[questionIndex];
  const totalQuestions = activeLevel.questions.length;
  const currentVolume = useMemo(() => sumBoard(board), [board]);
  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const queue = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  const resetQuestion = (q: VolumeQuestion) => {
    setBoard(cloneBoard(q.initialBoard));
    setHistory([]);
    setRemoveMode(false);
    setSelectedCountAnswer(null);
    setSelectedShapeId(null);
    setFeedback(null);
    setWrongPulse(false);
    setLocked(false);
  };

  const resetRun = () => {
    clearTimers();
    setQuestionIndex(0);
    resetQuestion(activeLevel.questions[0]);
    setSafeState('locked');
    setCorrectCount(0);
    setAttempts(0);
    setScore(0);
    setDidComplete(false);
    setDidFail(false);
  };

  useEffect(() => { resetRun(); }, [activeLevel.id]);
  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    resetRun();
  }, [sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => { resetQuestion(question); }, [question.id]);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (isSessionActive) return;
    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [didComplete, didFail, isSessionActive, lives, onGameOver, XP, sessionEvents, sessionState]);

  const finishRun = (finalScore: number, solved: number, tries: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, solved, tries);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { solved, tries, level: activeLevel.id },
    });
    onVictory(stars, finalScore);
  };

  const validate = () => {
    if (question.type === 'buildTargetVolume') return { ok: question.targetVolume === currentVolume, msg: `Reach exactly ${question.targetVolume}.` };
    if (question.type === 'buildCuboid') return { ok: !!question.expectedBoard && boardEquals(board, question.expectedBoard), msg: `Build ${question.targetDimensions ? formatDims(question.targetDimensions) : 'the cuboid'} exactly.` };
    if (question.type === 'countVolume') return { ok: selectedCountAnswer === question.correctCountAnswer, msg: selectedCountAnswer === null ? 'Choose an answer first.' : `Correct volume is ${question.correctCountAnswer}.` };
    if (question.type === 'fillMissingCubes') return { ok: !!question.expectedBoard && boardEquals(board, question.expectedBoard), msg: 'Add cubes until all missing spaces are filled.' };
    return { ok: selectedShapeId === question.correctShapeChoiceId, msg: selectedShapeId ? `Pick the shape with volume ${question.targetVolume}.` : 'Select a shape first.' };
  };

  const onCheck = () => {
    if (!isSessionActive || didComplete || didFail || locked) return;
    const result = validate();
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (!result.ok) {
      setFeedback({ kind: 'error', message: result.msg });
      setWrongPulse(true);
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        score: XP,
        metadata: { type: question.type, livesBefore: lives, livesLost: 1 },
      });
      queue(() => setWrongPulse(false), 360);
      return;
    }

    const solved = correctCount + 1;
    const gain = 180 + (activeLevel.id * 20) + (solved % 3 === 0 ? 30 : 0);
    const nextScore = XP + gain;
    const finalQ = questionIndex >= totalQuestions - 1;

    setCorrectCount(solved);
    setScore(nextScore);
    setFeedback({ kind: 'success', message: finalQ ? 'Final lock released!' : 'Lock mechanism loosened!' });
    setLocked(true);

    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: XP, metadata: { scoreAfter: nextScore, scoreDelta: gain, type: question.type } });
    emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: nextScore, metadata: { questionIndex: questionIndex + 1, totalQuestions } });

    if (finalQ) {
      setSafeState('unlocking');
      queue(() => setSafeState('open'), 520);
      queue(() => finishRun(nextScore, solved, nextAttempts), FINAL_OPEN_MS);
      return;
    }

    setSafeState('shudder');
    queue(() => {
      setSafeState('locked');
      setQuestionIndex((v) => v + 1);
    }, SAFE_SHAKE_MS);
    queue(() => {
      setFeedback(null);
      setLocked(false);
    }, ADVANCE_MS);
  };

  const interactive = question.type === 'buildTargetVolume' || question.type === 'buildCuboid' || question.type === 'fillMissingCubes';

  const onTileTap = (r: number, c: number) => {
    if (!interactive || !isSessionActive || didComplete || didFail || locked) return;
    setBoard((prev) => {
      const value = prev[r][c];
      const delta = removeMode ? -1 : 1;
      if (removeMode && value <= 0) return prev;
      if (!removeMode && value >= question.boardSize.maxHeight) return prev;
      setHistory((h) => [cloneBoard(prev), ...h].slice(0, MAX_HISTORY));
      const next = cloneBoard(prev);
      next[r][c] = clamp(value + delta, 0, question.boardSize.maxHeight);
      return next;
    });
  };

  const onUndo = () => {
    if (!history.length || locked) return;
    setHistory((h) => {
      const [last, ...rest] = h;
      if (last) setBoard(last);
      return rest;
    });
  };

  const boardRows = question.boardSize.rows;
  const boardCols = question.boardSize.cols;
  const boardW = (boardRows + boardCols) * (TILE_W / 2) + TILE_W;
  const boardH = (boardRows + boardCols) * (TILE_H / 2) + (question.boardSize.maxHeight * STACK_LIFT) + 88;
  const ox = boardW / 2;
  const oy = (question.boardSize.maxHeight * STACK_LIFT) + 28;

  const tiles: Array<{ r: number; c: number; h: number }> = [];
  for (let r = 0; r < boardRows; r += 1) {
    for (let c = 0; c < boardCols; c += 1) tiles.push({ r, c, h: board[r]?.[c] ?? 0 });
  }
  tiles.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  const safeProgress = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const lockedFrame = safeProgress >= 0.5 ? '0% 100%' : '0% 0%';
  const openFrame = safeProgress >= 0.85 ? '100% 100%' : '100% 0%';
  const safeFrame = safeState === 'open' || safeState === 'unlocking' ? openFrame : lockedFrame;
  const safeMotion = safeState === 'shudder'
    ? { x: [0, -5, 5, -3, 3, 0], scale: [1, 0.985, 1.01, 1] }
    : safeState === 'unlocking'
      ? { scale: [1, 1.04, 1.08, 1.04], rotate: [0, -2, 2, 0] }
      : { y: [0, -2, 0] };

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <img src={vaultBackdrop} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-cover" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.9rem)] pt-1">
        <header className="shrink-0 pt-1">
          <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-1.5">
            <div className="flex w-full items-center justify-between rounded-2xl border border-cyan-100/30 bg-slate-900/55 px-3 py-2">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">{activeLevel.title}</p>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">Question {questionIndex + 1}/{totalQuestions}</p>
            </div>
            <div className="relative flex w-full items-center justify-center">
              <div className="pointer-events-none absolute top-1/2 h-20 w-56 -translate-y-1/2 rounded-full bg-amber-300/25 blur-2xl" />
              <motion.div animate={safeMotion} transition={{ duration: safeState === 'shudder' ? 0.42 : safeState === 'unlocking' ? 0.62 : 2.5, ease: 'easeInOut' }} className="relative h-[92px] w-[182px]">
                <div className="h-full w-full bg-no-repeat" style={{ backgroundImage: `url(${vaultSprite})`, backgroundSize: '200% 200%', backgroundPosition: safeFrame }} />
              </motion.div>
              <div className="absolute bottom-1 left-1/2 h-2 w-40 -translate-x-1/2 overflow-hidden rounded-full border border-cyan-100/40 bg-slate-950/70">
                <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#fbbf24_0%,#f59e0b_40%,#22d3ee_100%)]" animate={{ width: `${safeProgress * 100}%` }} transition={{ duration: 0.28, ease: 'easeOut' }} />
              </div>
            </div>
          </div>
        </header>

        <section className="shrink-0 pt-1.5">
          <motion.div animate={wrongPulse ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.3 }} className="mx-auto w-full max-w-[760px] rounded-[1.35rem] border border-cyan-100/35 bg-slate-900/58 px-4 py-2.5 text-center shadow-[0_14px_24px_rgba(2,6,23,0.38)]">
            <p className="game-question-copy leading-snug text-cyan-50">
              {formatFantasyPrompt(question.prompt)}
            </p>
          </motion.div>
        </section>

        <main className="relative mt-2 flex min-h-0 flex-1 flex-col items-center justify-start gap-2.5">
          <div className="relative flex w-full max-w-[760px] flex-1 min-h-0 items-center justify-center rounded-[1.5rem] border border-cyan-100/28 bg-slate-900/42 p-2.5 shadow-[0_16px_30px_rgba(2,6,23,0.4)]">
            <div className="relative max-h-full w-full max-w-[680px]" style={{ width: boardW, height: boardH, maxWidth: '100%' }}>
              <div className="pointer-events-none absolute left-1/2 top-[64%] h-[32%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/18 blur-[20px]" />
              {question.ghostBoard ? tiles.flatMap((tile) => {
                const gh = question.ghostBoard?.[tile.r]?.[tile.c] ?? 0;
                const ch = board[tile.r]?.[tile.c] ?? 0;
                const miss = Math.max(0, gh - ch);
                const x = ox + (tile.c - tile.r) * (TILE_W / 2);
                const y = oy + (tile.c + tile.r) * (TILE_H / 2);
                return Array.from({ length: miss }).map((_, i) => (
                  <div key={`ghost-${tile.r}-${tile.c}-${i}`} className="absolute pointer-events-none" style={{ left: x - (CUBE_W / 2), top: y - ((ch + i) * STACK_LIFT) - 24 }}>
                    <CubeVisual ghost />
                  </div>
                ));
              }) : null}

              {tiles.flatMap((tile) => {
                const x = ox + (tile.c - tile.r) * (TILE_W / 2);
                const y = oy + (tile.c + tile.r) * (TILE_H / 2);
                return Array.from({ length: tile.h }).map((_, i) => (
                  <motion.div key={`cube-${tile.r}-${tile.c}-${i}`} initial={{ y: -8, scale: 0.9, opacity: 0.85 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="absolute pointer-events-none" style={{ left: x - (CUBE_W / 2), top: y - (i * STACK_LIFT) - 24 }}>
                    <CubeVisual glow={tile.h >= question.boardSize.maxHeight} />
                  </motion.div>
                ));
              })}

              {tiles.map((tile) => {
                const x = ox + (tile.c - tile.r) * (TILE_W / 2);
                const y = oy + (tile.c + tile.r) * (TILE_H / 2);
                const tapY = y - (tile.h * STACK_LIFT) - (TILE_H / 2);
                const canTap = interactive && !didComplete && !didFail && isSessionActive && !locked;
                return (
                  <button key={`tile-btn-${tile.r}-${tile.c}`} type="button" onClick={() => onTileTap(tile.r, tile.c)} disabled={!canTap} className={`absolute border-0 bg-transparent p-0 ${canTap ? 'cursor-pointer' : 'cursor-default'}`} style={{ left: x - (TILE_W / 2), top: tapY, width: TILE_W, height: TILE_H, clipPath: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)' }} aria-label={`Stack tile ${tile.r + 1}, ${tile.c + 1}`}>
                    <div className={`h-full w-full border border-cyan-100/30 ${removeMode ? 'bg-rose-500/18' : 'bg-cyan-200/15'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {question.type === 'countVolume' && question.countOptions ? (
            <div className="grid w-full max-w-[680px] grid-cols-2 gap-2">
              {question.countOptions.map((option) => {
                const selected = selectedCountAnswer === option;
                return (
                  <motion.button key={`count-${question.id}-${option}`} whileTap={{ scale: 0.97 }} type="button" onClick={() => setSelectedCountAnswer(option)} className={`h-11 rounded-full border px-4 text-lg font-black transition ${selected ? 'border-amber-100/80 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] text-slate-900 shadow-[0_8px_14px_rgba(180,83,9,0.5)]' : 'border-cyan-100/45 bg-slate-900/65 text-cyan-100 shadow-[0_8px_14px_rgba(2,6,23,0.35)]'}`}>
                    {option}
                  </motion.button>
                );
              })}
            </div>
          ) : null}

          {question.type === 'chooseCorrectShape' && question.shapeChoices ? (
            <div className="grid w-full max-w-[760px] grid-cols-3 gap-2">
              {question.shapeChoices.map((choice) => {
                const selected = selectedShapeId === choice.id;
                return (
                  <motion.button key={choice.id} whileTap={{ scale: 0.97 }} type="button" onClick={() => setSelectedShapeId(choice.id)} className={`rounded-2xl border p-2 transition ${selected ? 'border-amber-100/80 bg-slate-900/78 shadow-[0_0_22px_rgba(251,191,36,0.42)]' : 'border-cyan-100/35 bg-slate-900/52'}`}>
                    <MiniShapePreview board={choice.board} selected={selected} />
                    <p className="mt-1 text-center text-xs font-black uppercase tracking-[0.12em] text-cyan-50">{choice.label}</p>
                  </motion.button>
                );
              })}
            </div>
          ) : null}
        </main>

        <section className="shrink-0">
          <div className="mx-auto flex w-full max-w-[760px] items-center gap-2">
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onUndo} disabled={!interactive || history.length === 0 || locked} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-cyan-100/45 bg-slate-900/68 text-xs font-black uppercase tracking-[0.11em] text-cyan-50 disabled:opacity-45"><Undo2 className="h-4 w-4" />Undo</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => setRemoveMode((v) => !v)} disabled={!interactive || locked} className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border text-xs font-black uppercase tracking-[0.11em] disabled:opacity-45 ${removeMode ? 'border-rose-200/70 bg-rose-500/70 text-white' : 'border-cyan-100/45 bg-slate-900/68 text-cyan-50'}`}><Wrench className="h-4 w-4" />{removeMode ? 'Remove' : 'Add'}</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={() => resetQuestion(question)} disabled={locked} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-cyan-100/45 bg-slate-900/68 text-xs font-black uppercase tracking-[0.11em] text-cyan-50 disabled:opacity-45"><RotateCcw className="h-4 w-4" />Reset</motion.button>
            <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onCheck} disabled={!isSessionActive || locked || didComplete || didFail} className="inline-flex h-10 flex-[1.3] items-center justify-center gap-2 rounded-full border border-amber-100/80 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] px-4 text-xs font-black uppercase tracking-[0.13em] text-amber-950 shadow-[0_10px_18px_rgba(180,83,9,0.45)] disabled:opacity-45"><Check className="h-4 w-4" />Check Answer</motion.button>
          </div>
        </section>

        <section className="shrink-0 pt-1.5">
          <div className="mx-auto grid w-full max-w-[760px] grid-cols-2 gap-2 rounded-2xl border border-cyan-100/35 bg-slate-900/52 px-3 py-2 text-[11px] font-black uppercase tracking-[0.11em] text-cyan-100">
            <div className="rounded-xl bg-slate-950/45 px-2 py-1">Volume: <span className="text-amber-100">{currentVolume}</span></div>
            <div className="rounded-xl bg-slate-950/45 px-2 py-1 text-right">Target: <span className="text-amber-100">{question.targetVolume ?? '--'}</span></div>
            <div className="rounded-xl bg-slate-950/45 px-2 py-1">{question.targetDimensions ? `Dims: ${formatDims(question.targetDimensions)}` : 'Dims: Free build'}</div>
            <div className="rounded-xl bg-slate-950/45 px-2 py-1 text-right">XP: <span className="text-amber-100">{XP}</span></div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.div key={`${feedback.kind}-${feedback.message}`} initial={{ opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }} className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
            <div className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.16em] ${feedback.kind === 'success' ? 'bg-emerald-400/95 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.72)]' : 'bg-rose-500/95 text-white shadow-[0_0_22px_rgba(244,63,94,0.65)]'}`}>{feedback.message}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {safeState === 'open' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-40">
            <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(250,204,21,0.55),rgba(250,204,21,0)_58%)]" animate={{ opacity: [0.3, 1, 0.45], scale: [0.95, 1.05, 1] }} transition={{ duration: 1, ease: 'easeOut' }} />
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span key={`spark-${i}`} className="absolute h-2.5 w-2.5 rounded-full bg-amber-200" style={{ left: '50%', top: '23%' }} animate={{ x: Math.cos((i / 24) * Math.PI * 2) * randomInt(60, 180), y: Math.sin((i / 24) * Math.PI * 2) * randomInt(50, 120), opacity: [1, 0.95, 0], scale: [1, 1.22, 0.4] }} transition={{ duration: 0.9, ease: 'easeOut' }} />
            ))}
            <div className="absolute left-1/2 top-[26%] -translate-x-1/2 rounded-full bg-amber-300/90 px-6 py-2 text-sm font-black uppercase tracking-[0.16em] text-amber-950 shadow-[0_0_30px_rgba(251,191,36,0.85)]">Vault Opened</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default VolumeVaultGame;
