import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import diamondBlue from '../assets/place_value/jewels/diamond_blue.png';
import diamondGreen from '../assets/place_value/jewels/diamond_green.png';
import diamondPurple from '../assets/place_value/jewels/diamond_purple.png';
import diamondYellow from '../assets/place_value/jewels/diamond_yellow.png';
import gemCore from '../assets/place_value/jewels/gem.png';

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
  vx: number;
  vy: number;
  radius: number;
  value: number;
  isPrime: boolean;
  tint: BubbleTint;
  coreAsset: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
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
const BULLET_SPEED = 98;
const BULLET_RADIUS = 3.3;
const CANNON_ORIGIN = { x: 50, y: 93 };
const BUBBLE_PIXEL_SCALE = 10;

const BUBBLE_TINTS: BubbleTint[] = ['blue', 'green', 'purple', 'gold', 'red'];
const BUBBLE_CORES = [diamondBlue, diamondGreen, diamondPurple, diamondYellow, gemCore];

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
      maxBubbles: 5,
      minRadius: 12,
      maxRadius: 15,
      minSpeed: 6.2,
      maxSpeed: 8.4,
      primeChance: 0.58,
      spawnEveryMs: 920,
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
      maxBubbles: 6,
      minRadius: 10.5,
      maxRadius: 13.5,
      minSpeed: 7.8,
      maxSpeed: 10,
      primeChance: 0.5,
      spawnEveryMs: 840,
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
    maxBubbles: 7,
    minRadius: 9.5,
    maxRadius: 12.5,
    minSpeed: 8.8,
    maxSpeed: 11.2,
    primeChance: 0.45,
    spawnEveryMs: 740,
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

const PrimeBubble: React.FC<{ bubble: Bubble }> = ({ bubble }) => {
  const tint = TINT_STYLE[bubble.tint];
  const bubblePx = Math.round(bubble.radius * BUBBLE_PIXEL_SCALE);
  const size = `${Math.max(104, Math.min(180, bubblePx))}px`;

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
      <img
        src={bubble.coreAsset}
        alt=""
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-[58%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_4px_6px_rgba(2,6,23,0.42)]"
      />
      <span className="absolute inset-0 flex items-center justify-center text-[clamp(1.1rem,2.9vw,1.85rem)] font-black text-white drop-shadow-[0_3px_6px_rgba(2,6,23,0.8)]">
        {bubble.value}
      </span>
    </div>
  );
};

const PrimePopGame: React.FC<PrimePopGameProps> = ({ levelId, avatarId, onVictory, onGameOver, onBack }) => {
  const config = useMemo(() => getConfig(levelId), [levelId]);
  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.roundSeconds);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [crosshair, setCrosshair] = useState({ x: 50, y: 35 });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  const bubbleIdRef = useRef(1);
  const bulletIdRef = useRef(1);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(INITIAL_LIVES);
  const comboRef = useRef(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const primePopsRef = useRef(0);
  const totalPopsRef = useRef(0);

  const targetScore = config.targetScore;
  const progress = Math.min((score / Math.max(targetScore, 1)) * 100, 100);
  const cannonAngle = useMemo(() => {
    const dx = crosshair.x - CANNON_ORIGIN.x;
    const dy = crosshair.y - CANNON_ORIGIN.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return Math.max(-62, Math.min(62, angle));
  }, [crosshair.x, crosshair.y]);

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
      onVictory(stars, finalScore);
      return;
    }
    onGameOver(finalScore);
  }, [clearLoops, onGameOver, onVictory, targetScore]);

  const makeBubble = useCallback((existing: Bubble[]) => {
    const radius = randomBetween(config.minRadius, config.maxRadius);
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
      y,
      vx: (Math.random() < 0.5 ? -1 : 1) * randomBetween(config.minSpeed, config.maxSpeed),
      vy: (Math.random() < 0.5 ? -1 : 1) * randomBetween(config.minSpeed * 0.62, config.maxSpeed * 0.75),
      radius,
      value,
      isPrime: isPrime(value),
      tint: BUBBLE_TINTS[Math.floor(Math.random() * BUBBLE_TINTS.length)],
      coreAsset: BUBBLE_CORES[Math.floor(Math.random() * BUBBLE_CORES.length)],
    };
  }, [config.maxNumber, config.maxRadius, config.maxSpeed, config.minRadius, config.minSpeed, config.primeChance]);

  const replenishBubbles = useCallback((list: Bubble[]) => {
    let next = [...list];
    while (next.length < config.minBubbles) {
      next = [...next, makeBubble(next)];
    }
    while (next.length > config.maxBubbles) {
      next.pop();
    }
    return next;
  }, [config.maxBubbles, config.minBubbles, makeBubble]);

  useEffect(() => {
    overRef.current = false;
    clearLoops();
    bubbleIdRef.current = 1;
    bulletIdRef.current = 1;
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
    for (let i = 0; i < config.minBubbles; i += 1) {
      initial = [...initial, makeBubble(initial)];
    }
    bubblesRef.current = initial;
    bulletsRef.current = [];
    setBubbles(initial);
    setBullets([]);
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
      const next = replenishBubbles(bubblesRef.current);
      bubblesRef.current = next;
      setBubbles(next);
    }, config.spawnEveryMs);

    return () => clearLoops();
  }, [clearLoops, config.minBubbles, config.roundSeconds, config.spawnEveryMs, finalize, makeBubble, replenishBubbles]);

  const fireBullet = useCallback((clientX: number, clientY: number) => {
    if (!areaRef.current || overRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const targetX = ((clientX - rect.left) / rect.width) * 100;
    const targetY = ((clientY - rect.top) / rect.height) * 100;

    setCrosshair({
      x: Math.max(0, Math.min(100, targetX)),
      y: Math.max(0, Math.min(100, targetY)),
    });

    const dx = targetX - CANNON_ORIGIN.x;
    const rawDy = targetY - CANNON_ORIGIN.y;
    const dy = Math.min(rawDy, -1.2); // Prevent downward fire.
    const magnitude = Math.hypot(dx, dy) || 1;
    const vx = (dx / magnitude) * BULLET_SPEED;
    const vy = (dy / magnitude) * BULLET_SPEED;

    const bullet: Bullet = {
      id: bulletIdRef.current++,
      x: CANNON_ORIGIN.x,
      y: CANNON_ORIGIN.y,
      vx,
      vy,
    };
    const next = [...bulletsRef.current, bullet];
    bulletsRef.current = next;
    setBullets(next);
  }, []);

  const loop = useCallback((ts: number) => {
    if (overRef.current) return;
    const last = lastFrameRef.current ?? ts;
    const dt = Math.min((ts - last) / 1000, 0.05);
    lastFrameRef.current = ts;

    const movedBubbles = bubblesRef.current.map((bubble) => {
      let x = bubble.x + (bubble.vx * dt);
      let y = bubble.y + (bubble.vy * dt);
      let vx = bubble.vx;
      let vy = bubble.vy;
      const minX = bubble.radius + 2;
      const maxX = 100 - bubble.radius - 2;
      const minY = bubble.radius + 2;
      const maxY = 69 - bubble.radius;

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

    const movedBullets = bulletsRef.current
      .map((bullet) => ({
        ...bullet,
        x: bullet.x + (bullet.vx * dt),
        y: bullet.y + (bullet.vy * dt),
      }))
      .filter((bullet) => bullet.x >= -4 && bullet.x <= 104 && bullet.y >= -10 && bullet.y <= 104);

    const hitBubbleIds = new Set<number>();
    const remainingBullets: Bullet[] = [];
    let scoreNext = scoreRef.current;
    let comboNext = comboRef.current;
    let livesNext = livesRef.current;
    let feedbackText: string | null = null;

    for (const bullet of movedBullets) {
      if (overRef.current) break;
      const hit = movedBubbles.find((bubble) => (
        !hitBubbleIds.has(bubble.id)
        && Math.hypot(bullet.x - bubble.x, bullet.y - bubble.y) <= (bubble.radius + BULLET_RADIUS)
      ));

      if (!hit) {
        remainingBullets.push(bullet);
        continue;
      }

      // No passthrough: bullet is consumed immediately on first collision.
      hitBubbleIds.add(hit.id);
      totalPopsRef.current += 1;
      livesNext -= 1;

      if (hit.isPrime) {
        primePopsRef.current += 1;
        const earned = Math.round(config.primePoints * (1 + comboNext * config.comboStep));
        scoreNext += earned;
        comboNext += 1;
        feedbackText = `Prime hit +${earned}`;
      } else {
        scoreNext += config.nonPrimePoints;
        comboNext = 0;
        feedbackText = `Composite +${config.nonPrimePoints}`;
      }
    }

    let nextBubbles = movedBubbles.filter((bubble) => !hitBubbleIds.has(bubble.id));
    if (hitBubbleIds.size > 0) {
      nextBubbles = replenishBubbles(nextBubbles);
      setFeedback(feedbackText);
      window.setTimeout(() => setFeedback(null), 520);
      confetti({
        particleCount: 22,
        spread: 34,
        origin: { y: 0.62 },
        colors: ['#fde047', '#22d3ee', '#34d399'],
      });
    }

    bubblesRef.current = nextBubbles;
    bulletsRef.current = remainingBullets;
    scoreRef.current = Math.max(0, scoreNext);
    comboRef.current = Math.max(0, comboNext);
    livesRef.current = Math.max(0, livesNext);

    setBubbles(nextBubbles);
    setBullets(remainingBullets);
    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setLives(livesRef.current);

    if (scoreRef.current >= targetScore || livesRef.current <= 0) {
      finalize(scoreRef.current);
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [config.comboStep, config.nonPrimePoints, config.primePoints, finalize, replenishBubbles, targetScore]);

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

      <div className="relative z-10 flex h-full w-full flex-col p-2 pt-[env(safe-area-inset-top)] md:p-4">
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

        <div
          ref={areaRef}
          className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border-2 border-cyan-100/50 bg-[linear-gradient(180deg,rgba(6,25,55,0.56),rgba(3,12,32,0.75))]"
          onPointerDown={(event) => fireBullet(event.clientX, event.clientY)}
          onPointerMove={(event) => {
            if (!areaRef.current) return;
            const rect = areaRef.current.getBoundingClientRect();
            setCrosshair({
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
          style={{ touchAction: 'none' }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.28),transparent_35%),radial-gradient(circle_at_15%_25%,rgba(196,181,253,0.2),transparent_30%),radial-gradient(circle_at_84%_30%,rgba(74,222,128,0.17),transparent_28%)]" />

          <div className="absolute left-2 right-2 top-2 z-20 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-full border border-cyan-100/60 bg-cyan-500/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Prime +{config.primePoints}
            </div>
            <div className="rounded-full border border-white/35 bg-slate-900/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
              Composite +{config.nonPrimePoints}
            </div>
            <div className="rounded-full border border-amber-100/60 bg-amber-500/34 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-50">
              Combo x{combo}
            </div>
          </div>

          <AnimatePresence>
            {bubbles.map((bubble) => (
              <motion.div
                key={bubble.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.28, opacity: 0, rotate: 30 }}
                transition={{ duration: 0.18 }}
              >
                <PrimeBubble bubble={bubble} />
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {bullets.map((bullet) => (
              <motion.div
                key={bullet.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${bullet.x}%`, top: `${bullet.y}%` }}
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="h-11 w-11 rounded-full border-2 border-white/80 bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-500 shadow-[0_0_28px_rgba(251,191,36,0.95)]" />
              </motion.div>
            ))}
          </AnimatePresence>

          <div
            className="pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/80 md:block"
            style={{
              left: `${crosshair.x}%`,
              top: `${crosshair.y}%`,
              width: '2.2rem',
              height: '2.2rem',
              boxShadow: '0 0 18px rgba(34,211,238,0.48)',
            }}
          />

          <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
            <div className="relative h-44 w-44">
              <div className="absolute bottom-0 left-1/2 h-20 w-44 -translate-x-1/2 rounded-[2rem] border-[3px] border-amber-200/85 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 shadow-[0_12px_24px_rgba(2,6,23,0.55)]" />
              <div className="absolute bottom-10 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-[3px] border-amber-100/90 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-500 shadow-[0_8px_16px_rgba(2,6,23,0.45)]" />
              <div
                className="absolute bottom-[4.6rem] left-1/2 h-24 w-12 rounded-t-[1.8rem] border-[3px] border-amber-100/90 bg-gradient-to-b from-amber-50 via-amber-200 to-amber-500 shadow-[0_12px_20px_rgba(2,6,23,0.48)]"
                style={{ transform: `translateX(-50%) rotate(${cannonAngle}deg)`, transformOrigin: 'bottom center' }}
              />
              <div
                className="absolute bottom-[10.1rem] left-1/2 h-5 w-5 rounded-full border-2 border-cyan-100/90 bg-cyan-200 shadow-[0_0_16px_rgba(125,211,252,0.85)]"
                style={{ transform: `translateX(-50%) rotate(${cannonAngle}deg)` }}
              />
            </div>
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
