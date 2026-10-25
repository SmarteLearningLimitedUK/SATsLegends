import { playGameSound } from '../audio/gameAudio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import factorFrenzyBackground from '../assets/maps/backgroundsforgames/Factor Frenzy.jpg';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './fraction-match.css';


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
  id: number;
  type: GemType;
  label: string;
}

type BoardCell = GemCell | null;

const GEM_TYPES: GemType[] = ['red', 'blue', 'green', 'yellow', 'purple'];
const MIXED_FORMATS: TileValueFormat[] = ['fraction', 'decimal', 'percentage'];
const GRID_COLS = 6;
const GRID_ROWS = 5;
const ROUND_SECONDS = 60;
const BASE_TARGET_SCORE = 900;
const TARGET_SCORE_STEP = 140;
const MIN_COLOURLESS_MATCHES = 5;

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

const indexFor = (row: number, col: number) => (row * GRID_COLS) + col;

const findMatches = (board: BoardCell[]): number[] => {
  const matches = new Set<number>();

  // Horizontal scan.
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS - 2; col += 1) {
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
  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS - 2; row += 1) {
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

const pickTileLabel = (type: GemType, tier: number, isMatchMastery = true, preferredFormat?: TileValueFormat) => {
  const values = GEM_VALUE_POOLS[type];
  const pool = isMatchMastery && tier >= 3 ? values
    : tier === 1 ? values.slice(0, 1)
    : tier === 2 ? values.filter((option) => option.format === 'fraction')
      : tier === 3 ? values.filter((option) => option.format !== 'decimal')
        : tier === 4 ? values.filter((option) => option.format !== 'percentage') : values;

  const preferredPool = preferredFormat ? pool.filter((option) => option.format === preferredFormat) : pool;
  const selected = preferredPool[Math.floor(Math.random() * preferredPool.length)] ?? pool[0];
  return selected.label;
};

let nextTileId = 0;
const buildCell = (type: GemType, tier: number, isMatchMastery: boolean, preferredFormat?: TileValueFormat): GemCell => ({
  id: ++nextTileId,
  type,
  label: pickTileLabel(type, tier, isMatchMastery, preferredFormat),
});

const buildRandomBoard = (tier: number, isMatchMastery: boolean): BoardCell[] => {
  const board: BoardCell[] = Array.from({ length: GRID_ROWS * GRID_COLS }, () => null);

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const candidates = GEM_TYPES.filter((gemType) => !wouldCreateImmediateMatch(board, row, col, gemType));
      const chosenPool = candidates.length > 0 ? candidates : GEM_TYPES;
      const chosenType = chosenPool[Math.floor(Math.random() * chosenPool.length)];
      const preferredFormat = isMatchMastery && tier >= 3
        ? MIXED_FORMATS[indexFor(row, col) % MIXED_FORMATS.length]
        : undefined;
      board[indexFor(row, col)] = buildCell(chosenType, tier, isMatchMastery, preferredFormat);
    }
  }

  return board;
};

const countLegalSwaps = (board: BoardCell[]): number => {
  let total = 0;
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const index = indexFor(row, col);
      for (const neighbor of [
        col + 1 < GRID_COLS ? indexFor(row, col + 1) : -1,
        row + 1 < GRID_ROWS ? indexFor(row + 1, col) : -1,
      ]) {
        if (neighbor < 0 || !board[index] || !board[neighbor] || board[index]?.type === board[neighbor]?.type) continue;
        const swapped = [...board];
        [swapped[index], swapped[neighbor]] = [swapped[neighbor], swapped[index]];
        if (findMatches(swapped).length > 0) total += 1;
      }
    }
  }
  return total;
};

const ensurePlayableBoard = (board: BoardCell[], tier: number, isMatchMastery: boolean): BoardCell[] => {
  if (!isMatchMastery || tier !== 5 || countLegalSwaps(board) >= MIN_COLOURLESS_MATCHES) return board;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = buildRandomBoard(tier, isMatchMastery);
    if (countLegalSwaps(candidate) >= MIN_COLOURLESS_MATCHES) return candidate;
  }

  // A fixed layout guarantees five choices even if the random generator is unhelpful.
  const fallbackRows = ['BGPBYP', 'BBGPRG', 'RBBYRY', 'GPGPYY', 'BYRYYR'];
  const typeForSymbol: Record<string, GemType> = { R: 'red', B: 'blue', G: 'green', Y: 'yellow', P: 'purple' };
  return [...fallbackRows.join('')].map((symbol, index) =>
    buildCell(typeForSymbol[symbol], tier, isMatchMastery, MIXED_FORMATS[index % MIXED_FORMATS.length]));
};

const createInitialBoard = (tier: number, isMatchMastery = true): BoardCell[] =>
  ensurePlayableBoard(buildRandomBoard(tier, isMatchMastery), tier, isMatchMastery);

const isAdjacent = (first: number, second: number) => {
  const rowA = Math.floor(first / GRID_COLS);
  const colA = first % GRID_COLS;
  const rowB = Math.floor(second / GRID_COLS);
  const colB = second % GRID_COLS;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB) === 1;
};

const BevelledGem: React.FC<{
  type: GemType;
  label: string;
  size?: number;
  isSelected?: boolean;
  colourless?: boolean;
  onClick?: () => void;
}> = ({ type, label, size = 46, isSelected = false, colourless = false, onClick }) => {
  const colors = GEM_COLORS[type];

  return (
    <button
      type="button"
      data-button-skin="none"
      data-match-tile-appearance={colourless ? 'colourless' : 'coloured'}
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-xl ${colourless ? 'shadow-[0_4px_10px_rgba(0,0,0,0.24)]' : 'shadow-2xl'}`}
      style={{
        width: size,
        height: size,
        backgroundColor: colourless ? 'rgba(235, 243, 255, 0.08)' : colors.base,
        borderTop: `4px solid ${colourless ? 'rgba(238, 246, 255, 0.32)' : colors.light}`,
        borderLeft: `4px solid ${colourless ? 'rgba(238, 246, 255, 0.32)' : colors.light}`,
        borderBottom: `4px solid ${colourless ? 'rgba(238, 246, 255, 0.16)' : colors.dark}`,
        borderRight: `4px solid ${colourless ? 'rgba(238, 246, 255, 0.16)' : colors.dark}`,
      }}
      aria-label={`Gem ${label}`}
      aria-pressed={isSelected}
    >
      {colourless ? null : (
        <>
          <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/36 via-transparent to-black/18" />
          <div className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-white/54 blur-[1px]" />
        </>
      )}
      <span className="absolute inset-0 flex items-center justify-center px-0.5 text-center text-[19px] font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[20px]">
        {label}
      </span>

      {isSelected && (
        <div className="absolute inset-0 border-2 border-white shadow-[0_0_15px_white]" />
      )}
    </button>
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
  const flowQuestion = variantGameType === 'fraction_match';
  const reducedMotion = useReducedMotion();
  const particles = useMemo(() => Array.from({length:20}, () => ({x:Math.random()*100,y:Math.random()*100,duration:Math.random()*10+10})), []);
  return (
    <div className={`relative h-full w-full select-none overflow-hidden font-sans text-white ${flowQuestion ? 'match-mastery-shell' : ''}`}>
      <GameplaySceneBackdrop gameType={variantGameType} className="opacity-45" />

      <div className="pointer-events-none absolute inset-0">
        {!reducedMotion && particles.map((particle, idx) => (
          <motion.div
            key={`particle-${idx}`}
            className="absolute h-1 w-1 rounded-full bg-blue-300/20"
            initial={{ x: `${particle.x}%`, y: `${particle.y}%` }}
            animate={{ y: ['-10%', '110%'], opacity: [0, 0.5, 0] }}
            transition={{ duration: particle.duration, repeat: Infinity, ease: 'linear' }}
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
                  <span>XP</span>
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

        <div data-match-main className={`relative min-h-0 flex-1 ${flowQuestion ? 'flex flex-col' : ''} ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.15rem)]' : ''}`}>
           {useSharedTopHud ? (
             <div className={flowQuestion ? 'relative z-20 shrink-0 px-2 pt-1 sm:px-4' : 'absolute inset-x-2 top-2 z-20 sm:inset-x-4'}>
               <div className="mx-auto w-full max-w-[44rem]">
                 <GameQuestionCard context="" title="Match Mastery" className="bg-[#0a1f56]/76 backdrop-blur-sm" style={flowQuestion ? { position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%' } : undefined}>
                   {questionText}
                 </GameQuestionCard>
                 <div data-match-status className="mt-2 flex items-center gap-2">
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
                     <div className="rounded-lg border border-cyan-100/26 bg-[#0a1f56]/70 px-2 py-1 text-[13px] font-black tabular-nums text-cyan-50">
                       {timeLeft}s
                     </div>
                     <div className="flex items-center gap-1 rounded-lg border border-yellow-200/55 bg-[#0a1f56]/70 px-2 py-1 text-[13px] font-black text-yellow-100">
                       <span>XP</span>
                       <span>{XP}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           ) : null}

           <div data-match-board-space className={`relative z-10 flex w-full items-center justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] sm:px-4 ${flowQuestion ? 'min-h-0 flex-1 pt-2' : useSharedTopHud ? 'h-full pt-28' : 'h-full pt-2'}`}>
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
  practiceBriefing,
  sessionEvents,
  sessionState,
  variantGameType = 'fraction_match',
  onVictory,
  onGameOver,
  onBack,
  gameTitle,
}) => {
  const reducedMotion = useReducedMotion();
  const [board, setBoard] = useState<BoardCell[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [XP, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [gemSize, setGemSize] = useState(52);
  const [boardPixelWidth, setBoardPixelWidth] = useState(390);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [fireActive, setFireActive] = useState(false);
  const [firePulse, setFirePulse] = useState(0);
  const [successfulSwaps, setSuccessfulSwaps] = useState(0);
  const [swapHint, setSwapHint] = useState<string | null>(null);

  const endedRef = useRef(false);
  const epochRef = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = Boolean(sessionState?.paused) || showPracticeIntro;
  const waitForMotion = useCallback((duration: number) => new Promise<boolean>(resolve => {
    const epoch = epochRef.current; let elapsed = 0; let last: number | undefined;
    const tick = (now: number) => {
      if (endedRef.current || epoch !== epochRef.current) { resolve(false); return; }
      if (!pausedRef.current && !document.hidden && last !== undefined) elapsed += Math.min(50, now - last);
      last = now;
      if (elapsed >= duration) resolve(true); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), []);
  const successfulSwapsRef = useRef(0);
  const boardGridRef = useRef<HTMLDivElement | null>(null);
  const fireTimeoutRef = useRef<number | null>(null);
  const lastMatchAtRef = useRef<number | null>(null);

  const resolvedLevel = useMemo(() => Math.max(1, Math.min(5, miniGameLevel || levelId || 1)), [levelId, miniGameLevel]);
  const isMatchMastery = variantGameType === 'fraction_match';
  const targetScore = useMemo(() => BASE_TARGET_SCORE + (resolvedLevel * TARGET_SCORE_STEP), [resolvedLevel]);
  const levelName = useMemo(() => `Match ${Math.max(1, resolvedLevel)}`, [resolvedLevel]);

  const makeRandomCell = useCallback(() => {
    const randomType = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    return buildCell(randomType, resolvedLevel, isMatchMastery);
  }, [isMatchMastery, resolvedLevel]);

  const resetBoard = useCallback(() => {
    epochRef.current += 1;
    endedRef.current = false;
    setBoard(createInitialBoard(resolvedLevel, isMatchMastery));
    setSelectedIdx(null);
    setScore(0);
    setIsProcessing(false);
    setTimeLeft(ROUND_SECONDS);
    setFireActive(false);
    successfulSwapsRef.current = 0;
    setSuccessfulSwaps(0);
    setSwapHint(null);
    lastMatchAtRef.current = null;
    if (fireTimeoutRef.current !== null) window.clearTimeout(fireTimeoutRef.current);
    fireTimeoutRef.current = null;
  }, [isMatchMastery, resolvedLevel]);

  useEffect(() => {
    resetBoard();
  }, [resolvedLevel, resetBoard]);

  useEffect(() => () => {
    endedRef.current = true;
    epochRef.current += 1;
    if (fireTimeoutRef.current !== null) window.clearTimeout(fireTimeoutRef.current);
  }, []);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    const space = boardGridRef.current?.closest<HTMLElement>('[data-match-board-space]');
    const updateBoardWidth = () => {
      if (!space) return;
      const style = getComputedStyle(space);
      const usableWidth = space.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const usableHeight = space.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      // A wide six-column board keeps all 30 values large enough to tap on small phones.
      const compactPortrait = window.innerWidth <= 360 && window.innerHeight >= 500;
      const board = boardGridRef.current?.parentElement;
      const border = board ? parseFloat(getComputedStyle(board).borderLeftWidth) * 2 : 32;
      // Five square rows plus four 3px gaps; use the actual frame budget.
      const heightLimitedWidth = (usableHeight - border - 12) * GRID_COLS / GRID_ROWS + 15 + border;
      const nextWidth = Math.max(compactPortrait ? 334 : 150, Math.floor(Math.min(760, window.innerWidth * 0.94, usableWidth, heightLimitedWidth)));
      setBoardPixelWidth((previous) => previous === nextWidth ? previous : nextWidth);
    };
    const updateGemSize = () => {
      const node = boardGridRef.current;
      if (!node) return;

      const boardWidth = node.clientWidth;
      if (boardWidth <= 0) return;

      const gapPx = 3; // The rendered grid uses a 3px gap.
      const rawSize = Math.floor((boardWidth - (gapPx * (GRID_COLS - 1))) / GRID_COLS);
      const clampedSize = Math.max(18, Math.min(58, rawSize));

      setGemSize((prev) => (prev === clampedSize ? prev : clampedSize));
    };

    updateBoardWidth();
    updateGemSize();

    const resizeListener = () => {
      updateBoardWidth();
      updateGemSize();
    };

    window.addEventListener('resize', resizeListener);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && boardGridRef.current) {
      observer = new ResizeObserver(() => {
        updateBoardWidth();
        updateGemSize();
      });
      observer.observe(boardGridRef.current);
      if (space) observer.observe(space);
    }

    return () => {
      window.removeEventListener('resize', resizeListener);
      observer?.disconnect();
    };
  }, []);

  const finalizeRound = useCallback((finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;

    if (finalScore >= targetScore && (!isMatchMastery || resolvedLevel !== 5 || successfulSwapsRef.current >= MIN_COLOURLESS_MATCHES)) {
      const stars = finalScore >= targetScore * 1.8 ? 3 : finalScore >= targetScore * 1.3 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }

    onGameOver(finalScore);
  }, [isMatchMastery, onGameOver, onVictory, resolvedLevel, targetScore]);

  useEffect(() => {
    if (endedRef.current || sessionState?.paused || showPracticeIntro) return;
    if (timeLeft <= 0) {
      finalizeRound(XP);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [finalizeRound, XP, timeLeft, sessionState?.paused, showPracticeIntro]);

  useEffect(() => {
    if (endedRef.current) return;
    if (XP >= targetScore && (!isMatchMastery || resolvedLevel !== 5 || successfulSwaps >= MIN_COLOURLESS_MATCHES)) {
      finalizeRound(XP);
    }
  }, [finalizeRound, isMatchMastery, resolvedLevel, successfulSwaps, XP, targetScore]);

  const processBoard = useCallback(async (inputBoard: BoardCell[]) => {
    let workingBoard = [...inputBoard];
    let chainCount = 0;

    while (!endedRef.current) {
      const matches = findMatches(workingBoard);
      if (matches.length === 0) {
        const playable = ensurePlayableBoard(workingBoard, resolvedLevel, isMatchMastery);
        setBoard([...playable]);
        if (playable !== workingBoard && !await waitForMotion(reducedMotion ? 0 : 260)) return;
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

      playGameSound('impact');
      matches.forEach((idx) => {
        workingBoard[idx] = null;
      });

      setBoard([...workingBoard]);
      setScore((prev) => prev + (matches.length * 10));

      if (!await waitForMotion(reducedMotion ? 0 : 180)) return;

      // Gravity.
      for (let col = 0; col < GRID_COLS; col += 1) {
        let writeRow = GRID_ROWS - 1;

        for (let row = GRID_ROWS - 1; row >= 0; row -= 1) {
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
      if (!await waitForMotion(reducedMotion ? 0 : 320)) return;
    }
  }, [isMatchMastery, makeRandomCell, reducedMotion, resolvedLevel, waitForMotion]);

  const handleGemClick = useCallback(async (idx: number) => {
    if (endedRef.current || pausedRef.current || isProcessing) return;

    if (selectedIdx === null) {
      setSwapHint(null);
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
      setSwapHint('No match. Line up 3 equivalent values and try again.');
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
        score: XP,
        metadata: { firstTile: selectedIdx, secondTile: idx },
      });
      return;
    }

    setIsProcessing(true);
    setBoard(swapped);
    setSelectedIdx(null);
    setSwapHint(null);
    successfulSwapsRef.current += 1;
    setSuccessfulSwaps(successfulSwapsRef.current);
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
      score: XP + matches.length * 10,
      metadata: { firstTile: selectedIdx, secondTile: idx, matchedTiles: matches.length },
    });
    if (!await waitForMotion(reducedMotion ? 0 : 260)) return;
    await processBoard(swapped);
  }, [board, isProcessing, processBoard, reducedMotion, selectedIdx, sessionEvents, waitForMotion, XP]);

  const completionProgress = Math.max(0, Math.min(100, (XP / Math.max(1, targetScore)) * 100));

  return (
    <MatchGameShell
      XP={XP}
      completionProgress={completionProgress}
      timeLeft={timeLeft}
      levelName={levelName}
      questionText={swapHint ? <span role="status" aria-live="polite">{swapHint}</span> : isMatchMastery
        ? resolvedLevel === 5
          ? `Restore the board: line up 3 equal values. ${Math.min(successfulSwaps, MIN_COLOURLESS_MATCHES)}/${MIN_COLOURLESS_MATCHES} matches.`
          : resolvedLevel >= 3
            ? 'Match equal fractions, decimals and percentages.'
            : 'Match equivalent fractions.'
        : 'Match equivalent values.'}
      fireActive={fireActive && !reducedMotion}
      firePulse={firePulse}
      variantGameType={variantGameType}
      useSharedTopHud={useSharedTopHud}
      onBack={onBack}
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Match Mastery'}
        body="The Monster Minds have scrambled the values and have hidden them in plain sight.\nMatch the equivalent values and foil their plan!"
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div data-match-tier={resolvedLevel} data-match-processing={isProcessing} data-match-score={XP} className="match-mastery-board relative box-border shrink-0 rounded-[2rem] border border-cyan-100/20 bg-[linear-gradient(180deg,rgba(4,16,44,0.9),rgba(3,10,28,0.96))] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-4" style={{ width: boardPixelWidth }}>
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
        <div
          ref={boardGridRef}
          className="match-tile-grid relative z-10 grid w-full"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`, gap: '3px' }}
        >
          {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, idx) => <div key={idx} aria-hidden="true" className="match-cell-well aspect-square rounded-xl bg-[#06221e]" />)}
          <AnimatePresence initial={false}>
            {board.map((cell, idx) => cell && <motion.div key={cell.id}
              data-match-cell={idx} data-match-id={cell.id} data-match-value={cell.type}
              className="match-moving-tile"
              initial={reducedMotion ? false : { opacity: 0, y: -16 }}
              animate={{ left: `calc(${idx % GRID_COLS} * (100% + 3px) / ${GRID_COLS})`, top: `calc(${Math.floor(idx / GRID_COLS)} * (100% + 3px) / ${GRID_ROWS})`, opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: .82 }}
              transition={{ duration: reducedMotion ? 0 : .26, ease: [.22, .61, .36, 1], opacity: { duration: reducedMotion ? 0 : .16 } }}
              style={{ left: `calc(${idx % GRID_COLS} * (100% + 3px) / ${GRID_COLS})`, top: `calc(${Math.floor(idx / GRID_COLS)} * (100% + 3px) / ${GRID_ROWS})` }}>
              <BevelledGem type={cell.type} label={cell.label} size={Math.max(16, Math.min(gemSize, 69))}
                isSelected={selectedIdx === idx} colourless={isMatchMastery && resolvedLevel === 5}
                onClick={() => { void handleGemClick(idx); }} />
            </motion.div>)}
          </AnimatePresence>
        </div>
      </div>
    </MatchGameShell>
  );
};

export default FractionMatchGame;
