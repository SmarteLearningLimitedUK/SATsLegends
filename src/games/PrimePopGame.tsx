import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import AssetIcon from '../components/AssetIcon';
import { AVATARS } from '../constants';
import primePopBackground from '../assets/maps/primepopbkground.jpg';

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
const DANGER_LINE_Y = 12;
const PRIME_SPEED_MULTIPLIER = 1.22;

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
      maxBubbles: 7,
      minRadius: 4.8,
      maxRadius: 10.2,
      minSpeed: 2.8,
      maxSpeed: 4.1,
      primeChance: 0.72,
      spawnEveryMs: 500,
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
      maxBubbles: 8,
      minRadius: 4.4,
      maxRadius: 9.6,
      minSpeed: 3.2,
      maxSpeed: 4.6,
      primeChance: 0.66,
      spawnEveryMs: 440,
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
    maxBubbles: 9,
    minRadius: 4.1,
    maxRadius: 9.1,
    minSpeed: 3.6,
    maxSpeed: 5.2,
    primeChance: 0.62,
    spawnEveryMs: 380,
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

const clampBubbleInsideBounds = (bubble: Bubble): Bubble => {
  const minX = bubble.radius + 2;
  const maxX = 100 - bubble.radius - 2;
  return {
    ...bubble,
    x: Math.max(minX, Math.min(maxX, bubble.x)),
  };
};

const resolveBubbleCollisions = (items: Bubble[]) => {
  if (items.length <= 1) return items;
  const next = items.map((item) => ({ ...item }));
  const minSeparationPadding = 2.4;

  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius + minSeparationPadding;

        if (dist >= minDist) continue;

        const angle = dist === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);
        const overlap = (minDist - (dist || 0.001)) * 0.5;
        const offsetX = Math.cos(angle) * overlap;
        const offsetY = Math.sin(angle) * overlap;

        a.x -= offsetX;
        a.y -= offsetY;
        b.x += offsetX;
        b.y += offsetY;

        next[i] = clampBubbleInsideBounds(a);
        next[j] = clampBubbleInsideBounds(b);
      }
    }
  }

  return next;
};

const PrimeBubble: React.FC<{ bubble: Bubble; isPhone: boolean }> = ({ bubble, isPhone }) => {
  const tint = TINT_STYLE[bubble.tint];
  const renderScale = isPhone ? 0.95 : 0.9;
  const bubblePx = Math.round(bubble.radius * BUBBLE_PIXEL_SCALE * renderScale);
  const minSize = isPhone ? 42 : 40;
  const maxSize = isPhone ? 108 : 96;
  const size = `${Math.max(minSize, Math.min(maxSize, bubblePx))}px`;
  const labelSize = Math.max(1, Math.min(2.1, bubblePx / 42));

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
      <span
        className="absolute inset-0 flex items-center justify-center font-black text-white drop-shadow-[0_3px_6px_rgba(2,6,23,0.8)]"
        style={{ fontSize: `${labelSize}rem` }}
      >
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
  const healthHearts = useMemo(() => (
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: INITIAL_LIVES }).map((_, index) => (
        <AssetIcon
          key={`heart-${index}`}
          name={index < lives ? 'heart' : 'heartOutline'}
          className={`h-3.5 w-3.5 md:h-4 md:w-4 ${index < lives ? '' : 'opacity-50'}`}
        />
      ))}
    </div>
  ), [lives]);

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
    const margin = radius + 2.8;
    let x = randomBetween(margin, 100 - margin);
    let y = randomBetween(margin, 67 - margin);

    for (let i = 0; i < 48; i += 1) {
      const hasOverlap = existing.some((bubble) => {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        return Math.hypot(dx, dy) < (bubble.radius + radius + 2.6);
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

    const prime = isPrime(value);

    return {
      id: bubbleIdRef.current++,
      x,
      y: randomBetween(80, 102),
      drift: (Math.random() < 0.5 ? -1 : 1) * randomBetween(1.1, 2.7),
      vy: randomBetween(bubbleRuntime.minSpeed, bubbleRuntime.maxSpeed) * (prime ? PRIME_SPEED_MULTIPLIER : 1),
      radius,
      value,
      isPrime: prime,
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
      setFeedback(`+${earned}`);
      confetti({
        particleCount: 18,
        spread: 26,
        origin: { y: 0.62 },
        colors: ['#fde047', '#22d3ee', '#34d399'],
      });
    } else {
      comboNext = 0;
      livesNext -= 1;
      setFeedback('-1 life');
    }

    const nextBubbles = bubblesRef.current.filter((bubble) => bubble.id !== bubbleId);
    bubblesRef.current = nextBubbles;
    scoreRef.current = Math.max(0, scoreNext);
    comboRef.current = Math.max(0, comboNext);
    livesRef.current = Math.max(0, livesNext);

    setBubbles(nextBubbles);
    setScore(scoreRef.current);
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
    const movedWithoutOverlap = resolveBubbleCollisions(movedBubbles);

    const dangerPrimeHits = movedWithoutOverlap.filter((bubble) => bubble.isPrime && (bubble.y - bubble.radius) <= DANGER_LINE_Y).length;
    const nextBubbles = movedWithoutOverlap.filter((bubble) => {
      if ((bubble.y - bubble.radius) <= DANGER_LINE_Y && bubble.isPrime) return false;
      return bubble.y >= -(bubble.radius + 3);
    });
    let scoreNext = scoreRef.current;
    let comboNext = comboRef.current;
    let livesNext = livesRef.current;

    if (dangerPrimeHits > 0) {
      livesNext -= dangerPrimeHits;
      comboNext = 0;
      setFeedback(`-${dangerPrimeHits} life${dangerPrimeHits > 1 ? 's' : ''}`);
      window.setTimeout(() => setFeedback(null), 520);
    }

    bubblesRef.current = nextBubbles;
    scoreRef.current = Math.max(0, scoreNext);
    comboRef.current = Math.max(0, comboNext);
    livesRef.current = Math.max(0, livesNext);

    setBubbles(nextBubbles);
    setScore(scoreRef.current);
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
    <div
      className="relative z-20 flex h-full min-h-0 w-full flex-col overflow-hidden bg-cover bg-center bg-no-repeat select-none"
      style={{ backgroundImage: `url(${primePopBackground})` }}
    >
      <div className="relative z-10 flex h-full min-h-0 w-full flex-col pt-[env(safe-area-inset-top)]">
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
          statLabel="Health"
          statValue={healthHearts}
          compact
        />

        <div className="relative min-h-0 flex-1 overflow-hidden bg-transparent">
          <div className="absolute inset-[40px] z-10 overflow-hidden">
            <div
              className="pointer-events-none absolute left-0 right-0 z-20 border border-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_0_12px_rgba(255,255,255,0.45)]"
              style={{
                top: `${DANGER_LINE_Y}%`,
                height: '0.5rem',
                backgroundImage: 'repeating-linear-gradient(90deg, #ffffff 0 10px, #111111 10px 20px)',
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full border border-rose-100/70 bg-rose-600/40 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-rose-50"
              style={{ top: `calc(${DANGER_LINE_Y}% - 1.3rem)` }}
            >
              Danger Line
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
          </div>

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

        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.35rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
          <div className="pointer-events-auto">
            <GameActionDock onBack={onBack} compact variant="global" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrimePopGame;
