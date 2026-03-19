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

interface Projectile {
  id: number;
  x: number; // percent
  y: number; // percent
  vx: number; // percent/second
  vy: number; // percent/second
}

interface Bubble {
  id: number;
  x: number; // percent
  y: number; // percent
  vx: number; // percent/second
  vy: number; // percent/second
  radius: number; // percent
  type: BubbleType;
  number: number;
  isPrime: boolean;
}

const BUBBLE_COLORS: Record<BubbleType, { base: string; light: string; dark: string }> = {
  red: { base: '#ef4444', light: '#f87171', dark: '#b91c1c' },
  blue: { base: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
  green: { base: '#22c55e', light: '#4ade80', dark: '#15803d' },
  yellow: { base: '#eab308', light: '#facc15', dark: '#a16207' },
  purple: { base: '#a855f7', light: '#c084fc', dark: '#7e22ce' },
};

const BUBBLE_TYPES: BubbleType[] = ['red', 'blue', 'green', 'yellow', 'purple'];
const ROUND_SECONDS_BASE = 60;
const TARGET_SCORE_BASE = 1000;
const TARGET_SCORE_STEP = 500;
const PRIME_POINTS = 75;
const COMPOSITE_PENALTY = 50;

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
      className="relative overflow-hidden rounded-full shadow-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.base,
        borderTop: `3px solid ${colors.light}`,
        borderLeft: `3px solid ${colors.light}`,
        borderBottom: `3px solid ${colors.dark}`,
        borderRight: `3px solid ${colors.dark}`,
      }}
    >
      <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-white/40 via-transparent to-black/20" />
      <div className="absolute left-[16%] top-[16%] h-[16%] w-[16%] rounded-full bg-white/60 blur-[1px]" />
      <span className="absolute inset-0 flex items-center justify-center text-[0.95rem] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)] sm:text-[1.1rem]">
        {bubble.number}
      </span>
    </div>
  );
};

const Cannon = ({ angle }: { angle: number }) => (
  <div className="relative flex h-20 w-20 items-center justify-center">
    <div className="absolute bottom-0 z-10 h-10 w-16 rounded-t-full border-2 border-[#78350f] bg-gradient-to-b from-[#fcd34d] to-[#b45309] shadow-xl" />
    <motion.div
      className="absolute bottom-5 h-14 w-8 origin-bottom rounded-t-lg border-2 border-[#78350f] bg-gradient-to-r from-[#fcd34d] via-[#f59e0b] to-[#78350f] shadow-lg"
      style={{ rotate: angle }}
    >
      <div className="absolute left-0 top-0 h-3 w-full rounded-t-sm bg-black/40" />
    </motion.div>
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
  const [angle, setAngle] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [bubblesView, setBubblesView] = useState<Bubble[]>([]);
  const [projectilesView, setProjectilesView] = useState<Projectile[]>([]);

  const nextIdRef = useRef(1);
  const requestRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameAreaRef = useRef<HTMLDivElement | null>(null);

  const bubblesRef = useRef<Bubble[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const overRef = useRef(false);
  const crosshairRef = useRef({ x: 50, y: 50 });

  const pickBubbleNumber = useCallback(() => {
    const trickyComposites = [51, 57, 87, 91, 39, 69, 93].filter((n) => n <= maxNumber);
    const random = Math.random();

    if (random < 0.4) {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97].filter((n) => n <= maxNumber);
      return primes[Math.floor(Math.random() * primes.length)];
    }

    if (includeHardComposites && random < 0.6 && trickyComposites.length > 0) {
      return trickyComposites[Math.floor(Math.random() * trickyComposites.length)];
    }

    return Math.floor(Math.random() * (maxNumber - 1)) + 2;
  }, [includeHardComposites, maxNumber]);

  const spawnBubble = useCallback(() => {
    if (overRef.current) return;
    const number = pickBubbleNumber();
    const bubble: Bubble = {
      id: nextIdRef.current++,
      x: Math.random() * 80 + 10,
      y: Math.random() * 42 + 8,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 8,
      radius: Math.random() * 2 + 5.5,
      type: BUBBLE_TYPES[Math.floor(Math.random() * BUBBLE_TYPES.length)],
      number,
      isPrime: isPrimeNumber(number),
    };
    bubblesRef.current = [...bubblesRef.current, bubble];
    setBubblesView([...bubblesRef.current]);
  }, [pickBubbleNumber]);

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
        particleCount: 150,
        spread: 70,
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

    bubblesRef.current = [];
    projectilesRef.current = [];
    setBubblesView([]);
    setProjectilesView([]);
    lastFrameRef.current = null;
    nextIdRef.current = 1;

    for (let i = 0; i < 5; i += 1) {
      spawnBubble();
    }

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
      if (bubblesRef.current.length < 8) {
        spawnBubble();
      }
    }, Math.max(850 - (levelId * 55), 420));

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [finalizeRound, levelId, roundSeconds, spawnBubble]);

  const shoot = useCallback(() => {
    if (overRef.current) return;
    const rad = (angle - 90) * (Math.PI / 180);
    const projectile: Projectile = {
      id: nextIdRef.current++,
      x: 50,
      y: 92,
      vx: Math.cos(rad) * 42,
      vy: Math.sin(rad) * 42,
    };
    projectilesRef.current = [...projectilesRef.current, projectile];
    setProjectilesView([...projectilesRef.current]);
  }, [angle]);

  const updateFrame = useCallback((timestamp: number) => {
    if (overRef.current) return;
    const last = lastFrameRef.current ?? timestamp;
    const dt = Math.min((timestamp - last) / 1000, 0.05);
    lastFrameRef.current = timestamp;

    // Move projectiles.
    const nextProjectiles = projectilesRef.current
      .map((p) => ({ ...p, x: p.x + (p.vx * dt), y: p.y + (p.vy * dt) }))
      .filter((p) => p.x >= -6 && p.x <= 106 && p.y >= -10 && p.y <= 106);

    // Move bubbles with soft bounds.
    const nextBubbles = bubblesRef.current.map((bubble) => {
      let x = bubble.x + (bubble.vx * dt);
      let y = bubble.y + (bubble.vy * dt);
      let vx = bubble.vx;
      let vy = bubble.vy;

      if (x < 8 || x > 92) {
        vx *= -1;
        x = Math.max(8, Math.min(92, x));
      }
      if (y < 8 || y > 68) {
        vy *= -1;
        y = Math.max(8, Math.min(68, y));
      }

      return { ...bubble, x, y, vx, vy };
    });

    // Projectile-to-bubble collisions.
    const consumedProjectileIds = new Set<number>();
    const consumedBubbleIds = new Set<number>();
    let scoreDelta = 0;
    let comboDelta = 0;

    for (const projectile of nextProjectiles) {
      for (const bubble of nextBubbles) {
        if (consumedBubbleIds.has(bubble.id)) continue;
        const dx = projectile.x - bubble.x;
        const dy = projectile.y - bubble.y;
        const dist = Math.hypot(dx, dy);
        const collisionRadius = bubble.radius + 1.2;

        if (dist <= collisionRadius) {
          consumedProjectileIds.add(projectile.id);
          consumedBubbleIds.add(bubble.id);
          if (bubble.isPrime) {
            const multiplier = 1 + (comboRef.current * 0.1);
            scoreDelta += Math.round(PRIME_POINTS * multiplier);
            comboRef.current += 1;
            comboDelta = comboRef.current;
            confetti({
              particleCount: 20,
              spread: 38,
              origin: { x: bubble.x / 100, y: bubble.y / 100 },
              colors: ['#34d399', '#10b981', '#059669'],
            });
          } else {
            scoreDelta -= COMPOSITE_PENALTY;
            comboRef.current = 0;
            comboDelta = 0;
            confetti({
              particleCount: 14,
              spread: 28,
              origin: { x: bubble.x / 100, y: bubble.y / 100 },
              colors: ['#ef4444', '#b91c1c'],
            });
          }
          break;
        }
      }
    }

    const remainingProjectiles = nextProjectiles.filter((p) => !consumedProjectileIds.has(p.id));
    let remainingBubbles = nextBubbles.filter((b) => !consumedBubbleIds.has(b.id));

    while (remainingBubbles.length < 5) {
      const number = pickBubbleNumber();
      remainingBubbles.push({
        id: nextIdRef.current++,
        x: Math.random() * 80 + 10,
        y: Math.random() * 22 + 4,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 8 + 3,
        radius: Math.random() * 2 + 5.5,
        type: BUBBLE_TYPES[Math.floor(Math.random() * BUBBLE_TYPES.length)],
        number,
        isPrime: isPrimeNumber(number),
      });
    }

    if (scoreDelta !== 0) {
      scoreRef.current = Math.max(0, scoreRef.current + scoreDelta);
      setScore(scoreRef.current);
      setCombo(comboDelta);
    }

    // Early clear when target reached.
    if (scoreRef.current >= targetScore) {
      finalizeRound(scoreRef.current);
      return;
    }

    projectilesRef.current = remainingProjectiles;
    bubblesRef.current = remainingBubbles;
    setProjectilesView(remainingProjectiles);
    setBubblesView(remainingBubbles);

    requestRef.current = requestAnimationFrame(updateFrame);
  }, [finalizeRound, pickBubbleNumber, targetScore]);

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
    crosshairRef.current = { x, y };

    const relativeX = e.clientX - rect.left - (rect.width / 2);
    const relativeY = e.clientY - rect.top - rect.height;
    const nextAngle = Math.atan2(relativeX, -relativeY) * (180 / Math.PI);
    setAngle(Math.max(-60, Math.min(60, nextAngle)));
  };

  const timerProgress = Math.max(0, Math.min(100, (timeLeft / roundSeconds) * 100));
  const crosshair = crosshairRef.current;

  return (
    <GameShell score={score} timerProgress={timerProgress} onBack={onBack}>
      <div
        ref={gameAreaRef}
        className="relative h-full w-full cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={shoot}
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
            >
              <BevelledBubble bubble={bubble} />
            </motion.div>
          ))}
        </AnimatePresence>

        {projectilesView.map((projectile) => (
          <div
            key={projectile.id}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-200 bg-white shadow-[0_0_10px_white]"
            style={{ left: `${projectile.x}%`, top: `${projectile.y}%` }}
          />
        ))}

        <div className="pointer-events-none absolute left-1/2 top-[92%] h-32 w-0.5 -translate-x-1/2 origin-bottom bg-gradient-to-t from-white/20 to-transparent" style={{ transform: `translateX(-50%) rotate(${angle}deg)` }} />
        <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2">
          <Cannon angle={angle} />
        </div>

        <div
          className="pointer-events-none absolute hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-cyan-400 opacity-80 md:block"
          style={{ left: `${crosshair.x}%`, top: `${crosshair.y}%` }}
        >
          <Crosshair className="h-full w-full" />
        </div>

        <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
          <div className="rounded-full border border-cyan-100/60 bg-[linear-gradient(180deg,rgba(37,99,235,0.95),rgba(30,64,175,0.95))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_8px_16px_rgba(2,6,23,0.26)]">
            Pop Prime Numbers
          </div>
          <div className="rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.98))] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)]">
            Prime +75 | Composite -50 | Combo {combo}
          </div>
        </div>
      </div>
    </GameShell>
  );
};

export default PrimePopGame;
