import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleDollarSign, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import factorFrenzyBackground from '../assets/maps/backgroundsforgames/Factor Frenzy.jpg';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface FractionMatchGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  variantGameType?: 'fraction_match' | 'cloud_collapse';
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
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
      data-button-skin="none"
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
      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/36 via-transparent to-black/18" />
      <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/54 blur-[1px]" />
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
  XP: number;
  completionProgress: number;
  timeLeft: number;
  levelName: string;
  questionText: React.ReactNode;
  fireActive?: boolean;
  firePulse?: number;
  variantGameType: 'fraction_match' | 'cloud_collapse';
  useSharedTopHud?: boolean;
  onBack: () => void;
}> = ({
  children,
  XP,
  completionProgress,
  timeLeft,
  levelName,
  questionText,
  fireActive = false,
  firePulse = 0,
  variantGameType,
  useSharedTopHud = false,
  onBack,
}) => {
  return (
    <div className="relative h-full w-full select-none overflow-hidden font-sans text-white">
      <GameplaySceneBackdrop
        gameType={variantGameType}
        backgroundOverride={factorFrenzyBackground}
        className="opacity-[0.96]"
      />

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
                  <span>{XP}</span>
                </div>
              </div>
              <div className={`relative h-3 overflow-hidden rounded-full border border-cyan-200/45 bg-[#04102c]/90 ${fireActive ? 'shadow-[0_0_18px_rgba(251,146,60,0.85)]' : ''}`}>
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${fireActive ? 'bg-[linear-gradient(90deg,#fbbf24,#fb923c,#ef4444,#facc15)]' : 'bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300'}`}
                  animate={{ width: `${completionProgress}%` }}
                  transition={{ duration: fireActive ? 0.14 : 0.22, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className={`relative min-h-0 flex-1 ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.15rem)]' : ''}`}>
           {useSharedTopHud ? (
             <div className="absolute inset-x-2 top-2 z-20 sm:inset-x-4">
               <div className="mx-auto w-full max-w-[44rem]">
                 <GameQuestionCard title="Match Mastery" className="bg-[#0a1f56]/70 backdrop-blur-sm">
                   {questionText}
                 </GameQuestionCard>
                 <div className="mt-2 flex items-center gap-2">
                   <div className={`relative h-2.5 flex-1 overflow-hidden rounded-full border border-cyan-200/40 bg-[#04102c]/90 ${fireActive ? 'shadow-[0_0_18px_rgba(251,146,60,0.85)]' : ''}`}>
                     <motion.div
                       className={`absolute inset-y-0 left-0 rounded-full ${fireActive ? 'bg-[linear-gradient(90deg,#fbbf24,#fb923c,#ef4444,#facc15)]' : 'bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300'}`}
                       animate={{ width: `${completionProgress}%` }}
                       transition={{ duration: fireActive ? 0.14 : 0.22, ease: 'easeOut' }}
                       style={fireActive ? { filter: 'saturate(1.1)' } : undefined}
                     />
                     {fireActive ? (
                       <motion.div
                         key={`fire-bar-${firePulse}`}
                         className="pointer-events-none absolute inset-0"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: [0, 0.9, 0.5, 0] }}
                         transition={{ duration: 0.7, ease: 'easeOut' }}
                         style={{ background: 'radial-gradient(circle at 30% 50%, rgba(251,146,60,0.55), transparent 55%), radial-gradient(circle at 70% 50%, rgba(250,204,21,0.38), transparent 55%)' }}
                       />
                     ) : null}
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="rounded-lg border border-cyan-100/26 bg-[#0a1f56]/70 px-2 py-1 text-[11px] font-black tabular-nums text-cyan-50">
                       {timeLeft}s
                     </div>
                     <div className="flex items-center gap-1 rounded-lg border border-yellow-200/55 bg-[#0a1f56]/70 px-2 py-1 text-[11px] font-black text-yellow-100">
                       <CircleDollarSign className="h-3.5 w-3.5 text-yellow-300" />
                       <span>{XP}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           ) : null}

           <div className={`relative z-10 flex h-full w-full items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] ${useSharedTopHud ? 'pt-28' : 'pt-2'} sm:px-4`}>
             <AnimatePresence>
               {fireActive ? (
                 <motion.div
                   key={`fire-overlay-${firePulse}`}
                   className="pointer-events-none absolute inset-0 z-[1]"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   transition={{ duration: 0.18, ease: 'easeOut' }}
                   style={{ mixBlendMode: 'screen' }}
                 >
                   <motion.div
                     className="absolute inset-0"
                     animate={{ opacity: [0.18, 0.42, 0.22], scale: [0.98, 1.02, 1] }}
                     transition={{ duration: 0.75, ease: 'easeInOut' }}
                     style={{
                       background:
                         'radial-gradient(circle at 50% 80%, rgba(251,146,60,0.48) 0%, rgba(245,158,11,0.28) 22%, transparent 60%), radial-gradient(circle at 40% 55%, rgba(239,68,68,0.22) 0%, transparent 62%), radial-gradient(circle at 70% 60%, rgba(250,204,21,0.18) 0%, transparent 58%)',
                       filter: 'blur(6px)',
                     }}
                   />
                 </motion.div>
               ) : null}
             </AnimatePresence>
             <div className="relative z-[2]">{children}</div>
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
  isPractice,
  variantGameType = 'fraction_match',
  onVictory,
  onGameOver,
  onBack,
  gameTitle,
}) => {
  const [board, setBoard] = useState<BoardCell[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [XP, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [gemSize, setGemSize] = useState(52);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [fireActive, setFireActive] = useState(false);
  const [firePulse, setFirePulse] = useState(0);

  const endedRef = useRef(false);
  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const fireTimeoutRef = useRef<number | null>(null);
  const lastMatchAtRef = useRef<number | null>(null);

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
    setFireActive(false);
    lastMatchAtRef.current = null;
    if (fireTimeoutRef.current !== null) window.clearTimeout(fireTimeoutRef.current);
    fireTimeoutRef.current = null;
  }, [includeDecimals]);

  useEffect(() => {
    resetBoard();
  }, [resolvedLevel, resetBoard]);

  useEffect(() => () => {
    if (fireTimeoutRef.current !== null) window.clearTimeout(fireTimeoutRef.current);
  }, []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

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
      finalizeRound(XP);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [finalizeRound, XP, timeLeft]);

  useEffect(() => {
    if (endedRef.current) return;
    if (XP >= targetScore) {
      finalizeRound(XP);
    }
  }, [finalizeRound, XP, targetScore]);

  const processBoard = useCallback(async (inputBoard: BoardCell[]) => {
    let workingBoard = [...inputBoard];
    let chainCount = 0;

    while (!endedRef.current) {
      const matches = findMatches(workingBoard);
      if (matches.length === 0) {
        setBoard([...workingBoard]);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);

      chainCount += 1;
      const now = Date.now();
      const elapsedSinceLast = lastMatchAtRef.current === null ? Infinity : now - lastMatchAtRef.current;
      lastMatchAtRef.current = now;

      const shouldFire = matches.length > 3 || chainCount > 1 || elapsedSinceLast < 850;
      if (shouldFire) {
        setFireActive(true);
        setFirePulse((prev) => prev + 1);
        if (fireTimeoutRef.current !== null) window.clearTimeout(fireTimeoutRef.current);
        fireTimeoutRef.current = window.setTimeout(() => setFireActive(false), 900);
      }

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

  const completionProgress = Math.max(0, Math.min(100, (XP / Math.max(1, targetScore)) * 100));

  return (
    <MatchGameShell
      XP={XP}
      completionProgress={completionProgress}
      timeLeft={timeLeft}
      levelName={levelName}
      questionText="Match equivilent values."
      fireActive={fireActive}
      firePulse={firePulse}
      variantGameType={variantGameType}
      useSharedTopHud={useSharedTopHud}
      onBack={onBack}
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Match Mastery'}
        body="The Monster Minds have built a wall blocking our path, break the wall by matching frations to their equivilants."
        briefing={null}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="relative box-border w-[min(94vw,94vh)] rounded-[2rem] border border-cyan-100/20 bg-[#04102c]/86 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-4">
        <div
          className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.24]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.22) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-[2rem]"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 30px rgba(0,0,0,0.45)',
          }}
        />
        <div ref={boardGridRef} className="relative z-10 grid w-full grid-cols-6 gap-2 sm:gap-2.5">
          {board.map((cell, idx) => (
            <div
              key={idx}
              className="relative flex items-center justify-center rounded-2xl border border-cyan-100/16 bg-[#020816]/50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]"
              style={{ width: gemSize, height: gemSize }}
            >
              <AnimatePresence mode="popLayout">
                {cell && (
                  <BevelledGem
                    key={`${idx}-${cell.type}-${cell.label}`}
                    type={cell.type}
                    label={cell.label}
                    size={Math.max(34, gemSize - 8)}
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
      </div>
    </MatchGameShell>
  );
};

export default FractionMatchGame;
