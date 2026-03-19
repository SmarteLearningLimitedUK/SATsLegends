import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleDollarSign, Crosshair, Shield, Snowflake, Target, Timer as TimerIcon, Zap, Flame } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';

interface PrimePopGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type BubbleType = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

interface Bubble {
  id: number;
  x: number; // percent
  y: number; // percent
  vx: number; // percent/sec
  vy: number; // percent/sec
  radius: number; // percent
  type: BubbleType;
  number: number;
  isPrime: boolean;
}

const BUBBLE_TYPES: BubbleType[] = ['red', 'blue', 'green', 'yellow', 'purple'];
const ROUND_SECONDS_BASE = 60;
const TARGET_SCORE_BASE = 1000;
const TARGET_SCORE_STEP = 500;
const PRIME_POINTS = 75;
const COMPOSITE_PENALTY = 50;
const MIN_ACTIVE_BUBBLES = 7;
const MAX_ACTIVE_BUBBLES = 9;

const BUBBLE_COLORS: Record<BubbleType, { base: string; light: string; dark: string }> = {
  red: { base: '#ef4444', light: '#f87171', dark: '#b91c1c' },
  blue: { base: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
  green: { base: '#22c55e', light: '#4ade80', dark: '#15803d' },
  yellow: { base: '#eab308', light: '#facc15', dark: '#a16207' },
  purple: { base: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
};

const isPrimeNumber = (num: number) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  let i = 5;
  while (i * i <= num) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
    i += 6;
  }
  return true;
};

const BevelledBubble = ({ bubble }: { bubble: Bubble }) => {
  const colors = BUBBLE_COLORS[bubble.type];
  const size = `${bubble.radius * 2}%`;

  return (
    <div
      className="relative overflow-hidden rounded-full shadow-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.base,
        borderTop: `4px solid ${colors.light}`,
        borderLeft: `4px solid ${colors.light}`,
        borderBottom: `4px solid ${colors.dark}`,
        borderRight: `4px solid ${colors.dark}`,
      }}
    >
      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/50 via-transparent to-black/25" />
      <div className="absolute left-[14%] top-[14%] h-[18%] w-[18%] rounded-full bg-white/70 blur-[1px]" />
      <span className="absolute inset-0 flex items-center justify-center text-[1.05rem] font-black text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.7)] sm:text-[1.25rem]">
        {bubble.number}
      </span>
    </div>
  );
};

const Cannon = () => (
  <div className="relative flex h-20 w-20 items-center justify-center">
    <div className="absolute bottom-0 z-10 h-10 w-16 rounded-t-full border-2 border-[#78350f] bg-gradient-to-b from-[#fcd34d] to-[#b45309] shadow-xl" />
    <div className="absolute bottom-5 h-14 w-8 origin-bottom rounded-t-lg border-2 border-[#78350f] bg-gradient-to-r from-[#fcd34d] via-[#f59e0b] to-[#78350f] shadow-lg">
      <div className="absolute left-0 top-0 h-3 w-full rounded-t-sm bg-black/40" />
    </div>
  </div>
);

const GameShell: React.FC<{
  children: React.ReactNode;
  score: number;
  timerProgress: number;
  onBack: () => void;
}> = ({ children, score, timerProgress, onBack }) => (
  <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0a1a3a] p-2 font-sans text-white select-none">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#0a1a3a_100%)]" />

    <div className="relative flex h-full w-full max-h-[850px] max-w-[450px] flex-col rounded-[2.5rem] bg-gradient-to-br from-[#fcd34d] via-[#f59e0b] to-[#78350f] p-1 shadow-[0_30px_80px_rgba(0,0,0,0.9)]">
      <div className="m-1 flex flex-1 flex-col gap-3 rounded-[2.3rem] border-4 border-[#78350f]/50 bg-[#0a1a3a] p-3 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
        <div className="flex h-12 items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="h-8 w-8 rounded-lg border-2 border-[#fcd34d] bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg active:scale-95"
              aria-label="Back"
            >
              <Target className="m-auto h-5 w-5 text-white" />
            </button>
            <div className="min-w-[72px] rounded-full border border-[#fcd34d]/30 bg-black/40 px-3 py-1 text-center">
              <span className="text-lg font-black italic text-[#fcd34d]">{score}</span>
            </div>
          </div>

          <div className="flex max-w-[150px] flex-1 flex-col gap-1">
            <div className="flex justify-center">
              <TimerIcon className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full border border-[#78350f] bg-black/80">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300"
                animate={{ width: `${timerProgress}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#fcd34d] bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-[2rem] border-[4px] border-[#f59e0b] bg-[#050b1a] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          {children}
        </div>

        <div className="flex h-24 items-center justify-between gap-2 px-2">
          <div className="flex gap-2">
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#fcd34d] bg-gradient-to-b from-blue-400 to-blue-700 shadow-lg active:scale-95">
              <Snowflake className="h-6 w-6 text-white" />
            </button>
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#fcd34d] bg-gradient-to-b from-orange-400 to-orange-700 shadow-lg active:scale-95">
              <Flame className="h-6 w-6 text-white" />
            </button>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#78350f] bg-gradient-to-br from-[#fcd34d] via-[#f59e0b] to-[#b45309] shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#fcd34d] bg-[#0a1a3a] shadow-inner">
              <Crosshair className="h-8 w-8 animate-pulse text-[#fcd34d]" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#fcd34d] bg-gradient-to-b from-sky-400 to-sky-700 shadow-lg active:scale-95">
              <Shield className="h-6 w-6 text-white" />
            </button>
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#fcd34d] bg-gradient-to-b from-green-400 to-green-700 shadow-lg active:scale-95">
              <CircleDollarSign className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PrimePopGame: React.FC<PrimePopGameProps> = ({ levelId, onVictory, onGameOver, onBack }) => {
  const roundSeconds = useMemo(() => ROUND_SECONDS_BASE + (levelId * 10), [levelId]);
  const targetScore = useMemo(() => TARGET_SCORE_BASE + (levelId * TARGET_SCORE_STEP), [levelId]);
  const includeHardComposites = levelId >= 2;
  const maxNumber = levelId <= 1 ? 30 : levelId === 2 ? 50 : 100;

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundSeconds);
  const [combo, setCombo] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [bubblesView, setBubblesView] = useState<Bubble[]>([]);
  const [crosshair, setCrosshair] = useState({ x: 50, y: 50 });

  const nextIdRef = useRef(1);
  const requestRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const bubblesRef = useRef<Bubble[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const overRef = useRef(false);

  const pickBubbleNumber = useCallback((existingNumbers: Set<number>) => {
    const trickyComposites = [51, 57, 87, 91, 39, 69, 93].filter((n) => n <= maxNumber);
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97].filter((n) => n <= maxNumber);

    for (let i = 0; i < 20; i += 1) {
      const random = Math.random();
      let candidate = Math.floor(Math.random() * (maxNumber - 1)) + 2;
      if (random < 0.45 && primes.length > 0) {
        candidate = primes[Math.floor(Math.random() * primes.length)];
      } else if (includeHardComposites && random < 0.65 && trickyComposites.length > 0) {
        candidate = trickyComposites[Math.floor(Math.random() * trickyComposites.length)];
      }
      if (!existingNumbers.has(candidate)) {
        return candidate;
      }
    }

    return Math.floor(Math.random() * (maxNumber - 1)) + 2;
  }, [includeHardComposites, maxNumber]);

  const makeBubble = useCallback((existing: Bubble[]): Bubble => {
    const existingNumbers = new Set(existing.map((bubble) => bubble.number));
    const number = pickBubbleNumber(existingNumbers);
    const radius = 8.8 + (Math.random() * 2.4); // larger bubbles (17.6% - 22.4% diameter)
    const margin = radius + 1.5;
    let x = Math.random() * (100 - (margin * 2)) + margin;
    let y = Math.random() * (72 - (margin * 2)) + margin;

    for (let i = 0; i < 18; i += 1) {
      const overlaps = existing.some((bubble) => {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        return Math.hypot(dx, dy) < (bubble.radius + radius + 1.8);
      });
      if (!overlaps) break;
      x = Math.random() * (100 - (margin * 2)) + margin;
      y = Math.random() * (72 - (margin * 2)) + margin;
    }

    return {
      id: nextIdRef.current++,
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 8,
      radius,
      type: BUBBLE_TYPES[Math.floor(Math.random() * BUBBLE_TYPES.length)],
      number,
      isPrime: isPrimeNumber(number),
    };
  }, [pickBubbleNumber]);

  const normalizeBubbleCount = useCallback((list: Bubble[]) => {
    let working = [...list];
    while (working.length < MIN_ACTIVE_BUBBLES) {
      working = [...working, makeBubble(working)];
    }
    while (working.length > MAX_ACTIVE_BUBBLES) {
      working.pop();
    }
    return working;
  }, [makeBubble]);

  const finalizeRound = useCallback((finalScore: number) => {
    if (overRef.current) return;
    overRef.current = true;
    setIsOver(true);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (finalScore >= targetScore) {
      const stars = finalScore >= targetScore * 2 ? 3 : finalScore >= targetScore * 1.5 ? 2 : 1;
      confetti({
        particleCount: 140,
        spread: 72,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#87CEEB'],
      });
      onVictory(stars, finalScore);
      return;
    }

    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  useEffect(() => {
    overRef.current = false;
    setIsOver(false);
    setScore(0);
    setCombo(0);
    scoreRef.current = 0;
    comboRef.current = 0;
    setTimeLeft(roundSeconds);

    nextIdRef.current = 1;
    let initial: Bubble[] = [];
    for (let i = 0; i < MIN_ACTIVE_BUBBLES; i += 1) {
      initial = [...initial, makeBubble(initial)];
    }
    bubblesRef.current = initial;
    setBubblesView(initial);
    lastFrameRef.current = null;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finalizeRound(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    spawnIntervalRef.current = setInterval(() => {
      if (overRef.current) return;
      let next = [...bubblesRef.current];
      if (next.length < MIN_ACTIVE_BUBBLES) {
        next = normalizeBubbleCount(next);
        bubblesRef.current = next;
        setBubblesView(next);
      }
    }, Math.max(900 - (levelId * 60), 480));

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [finalizeRound, levelId, makeBubble, normalizeBubbleCount, roundSeconds]);

  const popBubbleAt = useCallback((clientX: number, clientY: number) => {
    if (!gameAreaRef.current || overRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    let nearest: Bubble | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const bubble of bubblesRef.current) {
      const distance = Math.hypot(bubble.x - x, bubble.y - y);
      const hitRadius = bubble.radius + 1.8;
      if (distance <= hitRadius && distance < nearestDistance) {
        nearest = bubble;
        nearestDistance = distance;
      }
    }

    if (!nearest) return;

    let next = bubblesRef.current.filter((bubble) => bubble.id !== nearest.id);

    if (nearest.isPrime) {
      const multiplier = 1 + (comboRef.current * 0.1);
      const earned = Math.round(PRIME_POINTS * multiplier);
      scoreRef.current = scoreRef.current + earned;
      comboRef.current = comboRef.current + 1;
      confetti({
        particleCount: 22,
        spread: 42,
        origin: { x: nearest.x / 100, y: nearest.y / 100 },
        colors: ['#34d399', '#10b981', '#059669'],
      });
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - COMPOSITE_PENALTY);
      comboRef.current = 0;
      confetti({
        particleCount: 16,
        spread: 32,
        origin: { x: nearest.x / 100, y: nearest.y / 100 },
        colors: ['#ef4444', '#b91c1c'],
      });
    }

    next = normalizeBubbleCount(next);
    bubblesRef.current = next;
    setBubblesView(next);
    setScore(scoreRef.current);
    setCombo(comboRef.current);

    if (scoreRef.current >= targetScore) {
      finalizeRound(scoreRef.current);
    }
  }, [finalizeRound, normalizeBubbleCount, targetScore]);

  const updateFrame = useCallback((timestamp: number) => {
    if (overRef.current) return;
    const last = lastFrameRef.current ?? timestamp;
    const dt = Math.min((timestamp - last) / 1000, 0.05);
    lastFrameRef.current = timestamp;

    const moved = bubblesRef.current.map((bubble) => {
      let x = bubble.x + (bubble.vx * dt);
      let y = bubble.y + (bubble.vy * dt);
      let vx = bubble.vx;
      let vy = bubble.vy;

      const minX = bubble.radius + 1.5;
      const maxX = 100 - bubble.radius - 1.5;
      const minY = bubble.radius + 1.5;
      const maxY = 72 - bubble.radius;

      if (x < minX || x > maxX) {
        vx *= -1;
        x = Math.max(minX, Math.min(maxX, x));
      }
      if (y < minY || y > maxY) {
        vy *= -1;
        y = Math.max(minY, Math.min(maxY, y));
      }

      return { ...bubble, x, y, vx, vy };
    });

    bubblesRef.current = moved;
    setBubblesView(moved);
    requestRef.current = requestAnimationFrame(updateFrame);
  }, []);

  useEffect(() => {
    if (isOver) return;
    requestRef.current = requestAnimationFrame(updateFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isOver, updateFrame]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCrosshair({ x, y });
  };

  const timerProgress = Math.max(0, Math.min(100, (timeLeft / roundSeconds) * 100));
  const activeNumbers = useMemo(
    () => bubblesView.map((bubble) => bubble.number).sort((a, b) => a - b).slice(0, 10),
    [bubblesView],
  );

  return (
    <GameShell score={score} timerProgress={timerProgress} onBack={onBack}>
      <div
        ref={gameAreaRef}
        className="relative h-full w-full cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={(event) => popBubbleAt(event.clientX, event.clientY)}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#1ec4ea_0%,#3fd0ee_38%,#66d8f1_74%,#95e6f7_100%)]" />
        <div className="absolute left-[-14%] top-[5%] h-[42%] w-[60%] rounded-full bg-white/22 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[42%] w-[56%] rounded-full bg-white/18 blur-3xl" />
        <div className="absolute left-[-10%] bottom-[-20%] h-[54%] w-[70%] rounded-full bg-yellow-100/24 blur-3xl" />

        <AnimatePresence>
          {bubblesView.map((bubble) => (
            <motion.div
              key={bubble.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0, filter: 'brightness(2)' }}
              transition={{ duration: 0.18 }}
            >
              <BevelledBubble bubble={bubble} />
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
          <Cannon />
        </div>

        <div
          className="pointer-events-none absolute hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-80 md:block"
          style={{ left: `${crosshair.x}%`, top: `${crosshair.y}%` }}
        >
          <Crosshair className="h-full w-full" />
        </div>

        <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center justify-between gap-2">
          <div className="rounded-full border border-cyan-100/60 bg-[linear-gradient(180deg,rgba(37,99,235,0.95),rgba(30,64,175,0.95))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_8px_16px_rgba(2,6,23,0.26)]">
            Pop Prime Numbers
          </div>
          <div className="rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.98))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)]">
            Prime +75 | Non-prime -50 | Combo {combo}
          </div>
          <div className="w-full rounded-full border border-cyan-100/60 bg-[linear-gradient(180deg,rgba(37,99,235,0.82),rgba(30,64,175,0.82))] px-3 py-1 text-[10px] font-black tracking-[0.06em] text-cyan-50 shadow-[0_8px_16px_rgba(2,6,23,0.26)]">
            Numbers in play: {activeNumbers.join(' • ')}
          </div>
        </div>
      </div>
    </GameShell>
  );
};

export default PrimePopGame;
