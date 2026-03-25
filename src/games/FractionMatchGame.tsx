import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleDollarSign, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';

interface FractionMatchGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  variantGameType?: 'fraction_match' | 'cloud_collapse';
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type GemType = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

type TileValueFormat = 'fraction' | 'percentage' | 'decimal';

interface GemValueOption {
  label: string;
  format: TileValueFormat;
}

interface GemCell {
  type: GemType;
  label: string;
}

type BoardCell = GemCell | null;

const GEM_TYPES: GemType[] = ['red', 'blue', 'green', 'yellow', 'purple'];
const GRID_SIZE = 6;
const ROUND_SECONDS = 60;
const BASE_TARGET_SCORE = 900;
const TARGET_SCORE_STEP = 140;

const GEM_COLORS: Record<GemType, { base: string; light: string; dark: string }> = {
  red: { base: '#ef4444', light: '#f87171', dark: '#b91c1c' },
  blue: { base: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
  green: { base: '#22c55e', light: '#4ade80', dark: '#15803d' },
  yellow: { base: '#eab308', light: '#facc15', dark: '#a16207' },
  purple: { base: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
};

const GEM_VALUE_POOLS: Record<GemType, GemValueOption[]> = {
  red: [
    { label: '1/2', format: 'fraction' },
    { label: '2/4', format: 'fraction' },
    { label: '50%', format: 'percentage' },
    { label: '0.5', format: 'decimal' },
  ],
  blue: [
    { label: '1/4', format: 'fraction' },
    { label: '2/8', format: 'fraction' },
    { label: '25%', format: 'percentage' },
    { label: '0.25', format: 'decimal' },
  ],
  green: [
    { label: '3/4', format: 'fraction' },
    { label: '6/8', format: 'fraction' },
    { label: '75%', format: 'percentage' },
    { label: '0.75', format: 'decimal' },
  ],
  yellow: [
    { label: '1/5', format: 'fraction' },
    { label: '2/10', format: 'fraction' },
    { label: '20%', format: 'percentage' },
    { label: '0.2', format: 'decimal' },
  ],
  purple: [
    { label: '2/5', format: 'fraction' },
    { label: '4/10', format: 'fraction' },
    { label: '40%', format: 'percentage' },
    { label: '0.4', format: 'decimal' },
  ],
};

const sleep = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

const indexFor = (row: number, col: number) => (row * GRID_SIZE) + col;

const findMatches = (board: BoardCell[]): number[] => {
  const matches = new Set<number>();

  // Horizontal scan.
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE - 2; col += 1) {
      const idx = indexFor(row, col);
      const cell = board[idx];
      if (!cell) continue;
      if (cell.type === board[idx + 1]?.type && cell.type === board[idx + 2]?.type) {
        matches.add(idx);
        matches.add(idx + 1);
        matches.add(idx + 2);
      }
    }
  }

  // Vertical scan.
  for (let col = 0; col < GRID_SIZE; col += 1) {
    for (let row = 0; row < GRID_SIZE - 2; row += 1) {
      const idx = indexFor(row, col);
      const cell = board[idx];
      if (!cell) continue;
      if (cell.type === board[indexFor(row + 1, col)]?.type && cell.type === board[indexFor(row + 2, col)]?.type) {
        matches.add(idx);
        matches.add(indexFor(row + 1, col));
        matches.add(indexFor(row + 2, col));
      }
    }
  }

  return Array.from(matches);
};

const wouldCreateImmediateMatch = (board: BoardCell[], row: number, col: number, gemType: GemType) => {
  if (col >= 2) {
    const leftA = board[indexFor(row, col - 1)];
    const leftB = board[indexFor(row, col - 2)];
    if (leftA?.type === gemType && leftB?.type === gemType) return true;
  }

  if (row >= 2) {
    const aboveA = board[indexFor(row - 1, col)];
    const aboveB = board[indexFor(row - 2, col)];
    if (aboveA?.type === gemType && aboveB?.type === gemType) return true;
  }

  return false;
};

const pickTileLabel = (type: GemType, includeDecimals: boolean) => {
  const pool = includeDecimals
    ? GEM_VALUE_POOLS[type]
    : GEM_VALUE_POOLS[type].filter((option) => option.format !== 'decimal');

  const selected = pool[Math.floor(Math.random() * pool.length)] ?? GEM_VALUE_POOLS[type][0];
  return selected.label;
};

const buildCell = (type: GemType, includeDecimals: boolean): GemCell => ({
  type,
  label: pickTileLabel(type, includeDecimals),
});

const createInitialBoard = (includeDecimals: boolean): BoardCell[] => {
  const board: BoardCell[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => null);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const candidates = GEM_TYPES.filter((gemType) => !wouldCreateImmediateMatch(board, row, col, gemType));
      const chosenPool = candidates.length > 0 ? candidates : GEM_TYPES;
      const chosenType = chosenPool[Math.floor(Math.random() * chosenPool.length)];
      board[indexFor(row, col)] = buildCell(chosenType, includeDecimals);
    }
  }

  return board;
};

const isAdjacent = (first: number, second: number) => {
  const rowA = Math.floor(first / GRID_SIZE);
  const colA = first % GRID_SIZE;
  const rowB = Math.floor(second / GRID_SIZE);
  const colB = second % GRID_SIZE;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
};

const BevelledGem: React.FC<{
  type: GemType;
  label: string;
  size?: number;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ type, label, size = 46, isSelected = false, onClick }) => {
  const colors = GEM_COLORS[type];

  return (
    <motion.button
      type="button"
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isSelected ? 1.12 : 1,
        opacity: 1,
        rotate: isSelected ? [0, -4, 4, 0] : 0,
      }}
      exit={{ scale: 0.5, opacity: 0, filter: 'brightness(2) blur(4px)' }}
      transition={{ rotate: { repeat: Infinity, duration: 0.5 }, exit: { duration: 0.22 } }}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-xl shadow-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.base,
        borderTop: `4px solid ${colors.light}`,
        borderLeft: `4px solid ${colors.light}`,
        borderBottom: `4px solid ${colors.dark}`,
        borderRight: `4px solid ${colors.dark}`,
      }}
      aria-label={`Gem ${label}`}
    >
      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/40 via-transparent to-black/20" />
      <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/60 blur-[1px]" />
      <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[11px] font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs">
        {label}
      </span>

      {isSelected && (
        <div className="absolute inset-0 animate-pulse border-2 border-white shadow-[0_0_15px_white]" />
      )}
    </motion.button>
  );
};

const MatchGameShell: React.FC<{
  children: React.ReactNode;
  score: number;
  timerProgress: number;
  levelName: string;
  variantGameType: 'fraction_match' | 'cloud_collapse';
  useSharedTopHud?: boolean;
  onBack: () => void;
}> = ({
  children,
  score,
  timerProgress,
  levelName,
  variantGameType,
  useSharedTopHud = false,
  onBack,
}) => {
  return (
    <div className="relative h-full w-full select-none overflow-hidden font-sans text-white">
      <GameplaySceneBackdrop gameType={variantGameType} className="opacity-[0.96]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_32%,rgba(59,130,246,0.22),rgba(3,7,18,0.78)_56%)]" />

      <div className="pointer-events-none absolute inset-0">
        {[...Array(20)].map((_, idx) => (
          <motion.div
            key={`particle-${idx}`}
            className="absolute h-1 w-1 rounded-full bg-blue-300/20"
            initial={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
            animate={{ y: ['-10%', '110%'], opacity: [0, 0.5, 0] }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
        {!useSharedTopHud ? (
          <div className="flex items-center gap-3 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.35rem)] sm:px-5">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/45 bg-[#0a1f56]/88 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5 text-cyan-100" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-black uppercase tracking-[0.12em] text-cyan-50 sm:text-base">
                  {levelName}
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-yellow-200/55 bg-[#0a1f56]/92 px-2 py-1 text-xs font-black text-yellow-100">
                  <CircleDollarSign className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{score}</span>
                </div>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full border border-cyan-200/45 bg-[#04102c]/90">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                  animate={{ width: `${timerProgress}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className={`relative min-h-0 flex-1 ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.15rem)]' : ''}`}>
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          {useSharedTopHud ? (
            <div className="absolute inset-x-2 top-2 z-20 rounded-xl border border-cyan-100/30 bg-[#0a1f56]/70 px-3 py-2 shadow-[0_8px_16px_rgba(2,6,23,0.35)] sm:inset-x-4">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-cyan-50">
                  {levelName}
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-yellow-200/55 bg-[#0a1f56]/90 px-2 py-1 text-[11px] font-black text-yellow-100">
                  <CircleDollarSign className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{score}</span>
                </div>
              </div>
              <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full border border-cyan-200/40 bg-[#04102c]/90">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                  animate={{ width: `${timerProgress}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className={`relative z-10 flex h-full w-full items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] ${useSharedTopHud ? 'pt-16' : 'pt-2'} sm:px-4`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

const FractionMatchGame: React.FC<FractionMatchGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  useSharedTopHud = false,
  isBoss: _isBoss = false,
  variantGameType = 'fraction_match',
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [board, setBoard] = useState<BoardCell[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [gemSize, setGemSize] = useState(52);

  const endedRef = useRef(false);
  const boardGridRef = useRef<HTMLDivElement | null>(null);

  const resolvedLevel = useMemo(() => Math.max(1, miniGameLevel || levelId || 1), [levelId, miniGameLevel]);
  const targetScore = useMemo(() => BASE_TARGET_SCORE + (resolvedLevel * TARGET_SCORE_STEP), [resolvedLevel]);
  const levelName = useMemo(() => `Match ${Math.max(1, resolvedLevel)}`, [resolvedLevel]);
  const includeDecimals = resolvedLevel >= 3;

  const makeRandomCell = useCallback(() => {
    const randomType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    return buildCell(randomType, includeDecimals);
  }, [includeDecimals]);

  const resetBoard = useCallback(() => {
    endedRef.current = false;
    setBoard(createInitialBoard(includeDecimals));
    setSelectedIdx(null);
    setScore(0);
    setIsProcessing(false);
    setTimeLeft(ROUND_SECONDS);
  }, [includeDecimals]);

  useEffect(() => {
    resetBoard();
  }, [resolvedLevel, resetBoard]);

  useEffect(() => {
    const updateGemSize = () => {
      const node = boardGridRef.current;
      if (!node) return;

      const boardWidth = node.clientWidth;
      if (boardWidth <= 0) return;

      const gapPx = 10; // sync with responsive gap-2 / gap-2.5
      const rawSize = Math.floor((boardWidth - (gapPx * (GRID_SIZE - 1))) / GRID_SIZE);
      const clampedSize = Math.max(42, Math.min(122, rawSize));

      setGemSize((prev) => (prev === clampedSize ? prev : clampedSize));
    };

    updateGemSize();

    const resizeListener = () => {
      updateGemSize();
    };

    window.addEventListener('resize', resizeListener);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && boardGridRef.current) {
      observer = new ResizeObserver(() => {
        updateGemSize();
      });
      observer.observe(boardGridRef.current);
    }

    return () => {
      window.removeEventListener('resize', resizeListener);
      observer?.disconnect();
    };
  }, []);

  const finalizeRound = useCallback((finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (finalScore >= targetScore) {
      const stars = finalScore >= targetScore * 1.8 ? 3 : finalScore >= targetScore * 1.3 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }

    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  useEffect(() => {
    if (endedRef.current) return;
    if (timeLeft <= 0) {
      finalizeRound(score);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [finalizeRound, score, timeLeft]);

  useEffect(() => {
    if (endedRef.current) return;
    if (score >= targetScore) {
      finalizeRound(score);
    }
  }, [finalizeRound, score, targetScore]);

  const processBoard = useCallback(async (inputBoard: BoardCell[]) => {
    let workingBoard = [...inputBoard];

    while (!endedRef.current) {
      const matches = findMatches(workingBoard);
      if (matches.length === 0) {
        setBoard([...workingBoard]);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);

      matches.forEach((idx) => {
        workingBoard[idx] = null;
      });

      setBoard([...workingBoard]);
      setScore((prev) => prev + (matches.length * 10));

      await sleep(250);
      if (endedRef.current) return;

      // Gravity.
      for (let col = 0; col < GRID_SIZE; col += 1) {
        let writeRow = GRID_SIZE - 1;

        for (let row = GRID_SIZE - 1; row >= 0; row -= 1) {
          const readIdx = indexFor(row, col);
          if (workingBoard[readIdx] === null) continue;

          const writeIdx = indexFor(writeRow, col);
          workingBoard[writeIdx] = workingBoard[readIdx];
          if (writeIdx !== readIdx) {
            workingBoard[readIdx] = null;
          }
          writeRow -= 1;
        }

        while (writeRow >= 0) {
          const refillIdx = indexFor(writeRow, col);
          workingBoard[refillIdx] = makeRandomCell();
          writeRow -= 1;
        }
      }

      setBoard([...workingBoard]);
      await sleep(220);
      if (endedRef.current) return;
    }
  }, [makeRandomCell]);

  const handleGemClick = useCallback(async (idx: number) => {
    if (endedRef.current || isProcessing) return;

    if (selectedIdx === null) {
      setSelectedIdx(idx);
      return;
    }

    if (selectedIdx === idx) {
      setSelectedIdx(null);
      return;
    }

    if (!isAdjacent(selectedIdx, idx)) {
      setSelectedIdx(idx);
      return;
    }

    const swapped = [...board];
    const temp = swapped[selectedIdx];
    swapped[selectedIdx] = swapped[idx];
    swapped[idx] = temp;

    const matches = findMatches(swapped);
    if (matches.length === 0) {
      setSelectedIdx(null);
      return;
    }

    setBoard(swapped);
    setSelectedIdx(null);
    await processBoard(swapped);
  }, [board, isProcessing, processBoard, selectedIdx]);

  const timerProgress = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100));

  return (
    <MatchGameShell
      score={score}
      timerProgress={timerProgress}
      levelName={levelName}
      variantGameType={variantGameType}
      useSharedTopHud={useSharedTopHud}
      onBack={onBack}
    >
      <div
        ref={boardGridRef}
        className="grid w-[min(94vw,94vh)] grid-cols-6 gap-2 sm:gap-2.5"
      >
        {board.map((cell, idx) => (
          <div key={idx} className="relative" style={{ width: gemSize, height: gemSize }}>
            <AnimatePresence mode="popLayout">
              {cell && (
                <BevelledGem
                  key={`${idx}-${cell.type}-${cell.label}`}
                  type={cell.type}
                  label={cell.label}
                  size={gemSize}
                  isSelected={selectedIdx === idx}
                  onClick={() => {
                    void handleGemClick(idx);
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </MatchGameShell>
  );
};

export default FractionMatchGame;
