import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';

interface PrimePopGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type BubbleTint = 'blue' | 'green' | 'purple' | 'gold' | 'red';

interface Bubble {
  id: number;
  x: number;
  y: number;
  drift: number;
  vy: number;
  radius: number;
  value: number;
  isPrime: boolean;
  tint: BubbleTint;
}

interface PrimePopConfig {
  roundSeconds: number;
  targetScore: number;
  maxNumber: number;
  minBubbles: number;
  maxBubbles: number;
  minRadius: number;
  maxRadius: number;
  minSpeed: number;
  maxSpeed: number;
  primeChance: number;
  spawnEveryMs: number;
  primePoints: number;
  nonPrimePoints: number;
  comboStep: number;
}

const INITIAL_LIVES = 10;
const BUBBLE_PIXEL_SCALE = 7.2;

const BUBBLE_TINTS: BubbleTint[] = ['blue', 'green', 'purple', 'gold', 'red'];

const TINT_STYLE: Record<BubbleTint, { from: string; to: string; ring: string }> = {
  blue: { from: '#38bdf8', to: '#1d4ed8', ring: 'rgba(56,189,248,0.7)' },
  green: { from: '#4ade80', to: '#15803d', ring: 'rgba(74,222,128,0.7)' },
  purple: { from: '#c084fc', to: '#7e22ce', ring: 'rgba(192,132,252,0.7)' },
  gold: { from: '#facc15', to: '#b45309', ring: 'rgba(250,204,21,0.72)' },
  red: { from: '#fb7185', to: '#b91c1c', ring: 'rgba(251,113,133,0.72)' },
};

const randomBetween = (min: number, max: number) => min + (Math.random() * (max - min));
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));

const isPrime = (n: number) => {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
};

const getConfig = (levelId: number): PrimePopConfig => {
  const level = Math.max(1, levelId);
  if (level <= 3) {
    return {
      roundSeconds: 75,
      targetScore: 900 + ((level - 1) * 80),
      maxNumber: 40,
      minBubbles: 4,
      maxBubbles: 6,
      minRadius: 6.2,
      maxRadius: 8.5,
      minSpeed: 2.8,
      maxSpeed: 4.1,
      primeChance: 0.58,
      spawnEveryMs: 1200,
      primePoints: 220,
      nonPrimePoints: 60,
      comboStep: 0.1,
    };
  }

  if (level <= 7) {
    return {
      roundSeconds: 70,
      targetScore: 1150 + ((level - 4) * 95),
      maxNumber: 70,
      minBubbles: 5,
      maxBubbles: 7,
      minRadius: 5.8,
      maxRadius: 8,
      minSpeed: 3.2,
      maxSpeed: 4.6,
      primeChance: 0.5,
      spawnEveryMs: 1080,
      primePoints: 230,
      nonPrimePoints: 55,
      comboStep: 0.12,
    };
  }

  return {
    roundSeconds: 66,
    targetScore: 1520 + ((level - 8) * 110),
    maxNumber: 99,
    minBubbles: 6,
    maxBubbles: 8,
    minRadius: 5.2,
    maxRadius: 7.5,
    minSpeed: 3.6,
    maxSpeed: 5.2,
    primeChance: 0.45,
    spawnEveryMs: 980,
    primePoints: 240,
    nonPrimePoints: 50,
    comboStep: 0.14,
  };
};

const scoreToStars = (score: number, target: number, primeAccuracy: number) => {
  if (score >= target * 1.35 && primeAccuracy >= 0.65) return 3;
  if (score >= target * 0.9) return 2;
  return 1;
};

const PrimeBubble: React.FC<{ bubble: Bubble; isPhone: boolean }> = ({ bubble, isPhone }) => {
  const tint = TINT_STYLE[bubble.tint];
  const renderScale = isPhone ? 0.95 : 0.9;
  const bubblePx = Math.round(bubble.radius * BUBBLE_PIXEL_SCALE * renderScale);
  const minSize = isPhone ? 54 : 50;
  const maxSize = isPhone ? 94 : 88;
  const size = `${Math.max(minSize, Math.min(maxSize, bubblePx))}px`;

  return (
    <div
      className="relative overflow-hidden rounded-full shadow-[0_14px_30px_rgba(2,6,23,0.45)]"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 28% 24%, rgba(255,255,255,0.54), ${tint.from} 38%, ${tint.to} 80%)`,
        border: '3px solid rgba(255,255,255,0.58)',
        boxShadow: `0 0 0 2px ${tint.ring}, 0 18px 30px rgba(2,6,23,0.4)`,
      }}
    >
      <div className="absolute left-[15%] top-[12%] h-[18%] w-[18%] rounded-full bg-white/70 blur-[1px]" />
      <span className="absolute inset-0 flex items-center justify-center text-[clamp(1.1rem,2.9vw,1.85rem)] font-black text-white drop-shadow-[0_3px_6px_rgba(2,6,23,0.8)]">
        {bubble.value}
      </span>
    </div>
  );
};

const PrimePopGame: React.FC<PrimePopGameProps> = ({ levelId, avatarId, onVictory, onGameOver, onBack }) => {
  const config = useMemo(() => getConfig(levelId), [levelId]);
  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const [isPhone, setIsPhone] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : true));
  const onVictoryRef = useRef(onVictory);
  const onGameOverRef = useRef(onGameOver);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.roundSeconds);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const bubbleIdRef = useRef(1);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const comboRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const primePopsRef = useRef(0);
  const totalPopsRef = useRef(0);

  const targetScore = config.targetScore;
  const progress = Math.min((score / Math.max(targetScore, 1)) * 100, 100);
  const bubbleRuntime = useMemo(() => {
    if (!isPhone) {
      return {
        minBubbles: config.minBubbles,
        maxBubbles: config.maxBubbles,
        minRadius: config.minRadius,
        maxRadius: config.maxRadius,
        minSpeed: config.minSpeed,
        maxSpeed: config.maxSpeed,
      };
    }

    return {
      minBubbles: Math.max(3, config.minBubbles - 1),
      maxBubbles: Math.max(4, config.maxBubbles - 1),
      minRadius: config.minRadius * 1.02,
      maxRadius: config.maxRadius * 1.1,
      minSpeed: config.minSpeed * 0.9,
      maxSpeed: config.maxSpeed * 0.9,
    };
  }, [config.maxBubbles, config.maxRadius, config.maxSpeed, config.minBubbles, config.minRadius, config.minSpeed, isPhone]);
  const clearLoops = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (spawnRef.current !== null) {
      window.clearInterval(spawnRef.current);
      spawnRef.current = null;
    }
  }, []);

  useEffect(() => {
    onVictoryRef.current = onVictory;
    onGameOverRef.current = onGameOver;
  }, [onVictory, onGameOver]);

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const finalize = useCallback((finalScore: number) => {
    if (overRef.current) return;
    overRef.current = true;
    clearLoops();

    const totalPops = Math.max(1, totalPopsRef.current);
    const primeAccuracy = primePopsRef.current / totalPops;
    if (finalScore >= targetScore) {
      const stars = scoreToStars(finalScore, targetScore, primeAccuracy);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.62 },
        colors: ['#fde047', '#34d399', '#38bdf8', '#ffffff'],
      });
      onVictoryRef.current(stars, finalScore);
      return;
    }
    onGameOverRef.current(finalScore);
  }, [clearLoops, targetScore]);

  const makeBubble = useCallback((existing: Bubble[]) => {
    const radius = randomBetween(bubbleRuntime.minRadius, bubbleRuntime.maxRadius);
    const margin = radius + 2.2;
    let x = randomBetween(margin, 100 - margin);
    let y = randomBetween(margin, 67 - margin);

    for (let i = 0; i < 24; i += 1) {
      const hasOverlap = existing.some((bubble) => {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        return Math.hypot(dx, dy) < (bubble.radius + radius + 2.1);
      });
      if (!hasOverlap) break;
      x = randomBetween(margin, 100 - margin);
      y = randomBetween(margin, 67 - margin);
    }

    const pickPrime = Math.random() < config.primeChance;
    let value = randomInt(2, config.maxNumber);
    if (pickPrime) {
      for (let i = 0; i < 18; i += 1) {
        const candidate = randomInt(2, config.maxNumber);
        if (isPrime(candidate)) {
          value = candidate;
          break;
        }
      }
    } else {
      for (let i = 0; i < 18; i += 1) {
        const candidate = randomInt(4, config.maxNumber);
        if (!isPrime(candidate)) {
          value = candidate;
          break;
        }
      }
    }

    return {
      id: bubbleIdRef.current++,
      x,
      y: randomBetween(80, 102),
      drift: (Math.random() < 0.5 ? -1 : 1) * randomBetween(1.1, 2.7),
      vy: randomBetween(bubbleRuntime.minSpeed, bubbleRuntime.maxSpeed),
      radius,
      value,
      isPrime: isPrime(value),
      tint: BUBBLE_TINTS[Math.floor(Math.random() * BUBBLE_TINTS.length)],
    };
  }, [bubbleRuntime.maxRadius, bubbleRuntime.maxSpeed, bubbleRuntime.minRadius, bubbleRuntime.minSpeed, config.maxNumber, config.primeChance]);

  useEffect(() => {
    overRef.current = false;
    clearLoops();
    bubbleIdRef.current = 1;
    scoreRef.current = 0;
    comboRef.current = 0;
    livesRef.current = INITIAL_LIVES;
    primePopsRef.current = 0;
    totalPopsRef.current = 0;
    setScore(0);
    setCombo(0);
    setLives(INITIAL_LIVES);
    setTimeLeft(config.roundSeconds);
    setFeedback(null);

    let initial: Bubble[] = [];
    for (let i = 0; i < bubbleRuntime.minBubbles; i += 1) {
      initial = [...initial, makeBubble(initial)];
    }
    bubblesRef.current = initial;
    setBubbles(initial);
    lastFrameRef.current = null;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          finalize(scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    spawnRef.current = window.setInterval(() => {
      if (overRef.current) return;
      if (bubblesRef.current.length >= bubbleRuntime.maxBubbles) return;
      const next = [...bubblesRef.current, makeBubble(bubblesRef.current)];
      bubblesRef.current = next;
      setBubbles(next);
    }, config.spawnEveryMs);

    return () => clearLoops();
  }, [bubbleRuntime.maxBubbles, bubbleRuntime.minBubbles, clearLoops, config.roundSeconds, config.spawnEveryMs, finalize, makeBubble]);

  const popBubble = useCallback((bubbleId: number) => {
    if (overRef.current) return;
    const target = bubblesRef.current.find((bubble) => bubble.id === bubbleId);
    if (!target) return;

    let scoreNext = scoreRef.current;
    let comboNext = comboRef.current;
    let livesNext = livesRef.current;

    totalPopsRef.current += 1;

    if (target.isPrime) {
      primePopsRef.current += 1;
      const earned = Math.round(config.primePoints * (1 + comboNext * config.comboStep));
      scoreNext += earned;
      comboNext += 1;
      setFeedback(`Prime +${earned}`);
      confetti({
        particleCount: 18,
        spread: 26,
        origin: { y: 0.62 },
        colors: ['#fde047', '#22d3ee', '#34d399'],
      });
    } else {
      comboNext = 0;
      livesNext -= 1;
      setFeedback('Not prime -1 life');
    }

    const nextBubbles = bubblesRef.current.filter((bubble) => bubble.id !== bubbleId);
    bubblesRef.current = nextBubbles;
    scoreRef.current = Math.max(0, scoreNext);
    comboRef.current = Math.max(0, comboNext);
    livesRef.current = Math.max(0, livesNext);

    setBubbles(nextBubbles);
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setLives(livesRef.current);
    window.setTimeout(() => setFeedback(null), 520);

    if (scoreRef.current >= targetScore || livesRef.current <= 0) {
      finalize(scoreRef.current);
    }
  }, [config.comboStep, config.primePoints, finalize, targetScore]);

  const loop = useCallback((ts: number) => {
    if (overRef.current) return;
    const last = lastFrameRef.current ?? ts;
    const dt = Math.min((ts - last) / 1000, 0.05);
    lastFrameRef.current = ts;

    const movedBubbles = bubblesRef.current.map((bubble) => {
      let x = bubble.x + (bubble.drift * dt);
      const y = bubble.y - (bubble.vy * dt);
      let drift = bubble.drift;
      const minX = bubble.radius + 2;
      const maxX = 100 - bubble.radius - 2;

      if (x < minX || x > maxX) {
        drift *= -1;
        x = Math.max(minX, Math.min(maxX, x));
      }

      return { ...bubble, x, y, drift };
    });

    const escapedPrime = movedBubbles.filter((bubble) => bubble.y < -(bubble.radius + 3) && bubble.isPrime).length;
    const nextBubbles = movedBubbles.filter((bubble) => bubble.y >= -(bubble.radius + 3));
    let scoreNext = scoreRef.current;
    let comboNext = comboRef.current;
    let livesNext = livesRef.current;

    if (escapedPrime > 0) {
      livesNext -= escapedPrime;
      comboNext = 0;
      setFeedback(`Missed prime -${escapedPrime} life${escapedPrime > 1 ? 's' : ''}`);
      window.setTimeout(() => setFeedback(null), 520);
    }

    bubblesRef.current = nextBubbles;
    scoreRef.current = Math.max(0, scoreNext);
    comboRef.current = Math.max(0, comboNext);
    livesRef.current = Math.max(0, livesNext);

    setBubbles(nextBubbles);
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setLives(livesRef.current);

    if (scoreRef.current >= targetScore || livesRef.current <= 0) {
      finalize(scoreRef.current);
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [finalize, targetScore]);

  useEffect(() => {
    if (overRef.current) return;
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [loop]);

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none">
      <GameplaySceneBackdrop gameType="prime_pop" />

      <div className="relative z-10 flex h-full w-full flex-col pt-[env(safe-area-inset-top)]">
        <GameplayHUD
          title="Prime Pop"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-cyan-900"
          accentSoftBg="bg-cyan-100/80"
          accentBorder="border-cyan-200/80"
          progressBar="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
          statLabel="Lives"
          statValue={lives}
          compact
        />

        <div className="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(6,25,55,0.22),rgba(3,12,32,0.52))]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.28),transparent_35%),radial-gradient(circle_at_15%_25%,rgba(196,181,253,0.2),transparent_30%),radial-gradient(circle_at_84%_30%,rgba(74,222,128,0.17),transparent_28%)]" />

          <div className="absolute left-2 right-2 top-2 z-20 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-full border border-cyan-100/60 bg-cyan-500/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Prime +{config.primePoints}
            </div>
            <div className="rounded-full border border-white/35 bg-slate-900/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Composite: -1 life
            </div>
            <div className="rounded-full border border-amber-100/60 bg-amber-500/34 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-50">
              Combo x{combo}
            </div>
          </div>

          <AnimatePresence>
            {bubbles.map((bubble) => (
              <motion.div
                key={bubble.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.28, opacity: 0, rotate: 30 }}
                transition={{ duration: 0.18 }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  popBubble(bubble.id);
                }}
              >
                <PrimeBubble bubble={bubble} isPhone={isPhone} />
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {feedback ? (
              <motion.div
                key={feedback}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full border border-cyan-100/60 bg-slate-900/70 px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-100 shadow-[0_10px_24px_rgba(2,6,23,0.48)]"
              >
                {feedback}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
          <div className="pointer-events-auto">
            <GameActionDock onBack={onBack} compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrimePopGame;
