import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import { Crosshair, Heart, Sparkles, Target } from './GameIcons';
import { triggerHaptic } from '../haptics';

interface DecimalSniperGameProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type PromptMode = 'largest' | 'smallest' | 'closest' | 'rounding' | 'place' | 'boss';
type PlaceName = 'tenths' | 'hundredths' | 'thousandths';
type DronePalette = 'cyan' | 'violet' | 'amber' | 'emerald';

interface DroneTarget {
  id: string;
  label: string;
  value: number;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  palette: DronePalette;
}

interface DecimalRound {
  mode: PromptMode;
  instruction: string;
  sublabel: string;
  targets: DroneTarget[];
  correctIds: string[];
  orderIds?: string[];
}

interface ImpactFlash {
  id: number;
  x: number;
  y: number;
  success: boolean;
  title: string;
  subtitle: string;
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 6, 7, 8, 9];

const DRONE_THEMES: Record<DronePalette, { shell: string; ring: string; text: string; glow: string; rotor: string }> = {
  cyan: {
    shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.94), rgba(125,211,252,0.96) 18%, rgba(56,189,248,0.84) 46%, rgba(8,145,178,0.82) 72%, rgba(8,47,73,0.96) 100%)',
    ring: 'rgba(186,230,253,0.85)',
    text: '#effbff',
    glow: '0 0 30px rgba(34,211,238,0.32)',
    rotor: 'linear-gradient(180deg,#7564f2,#41328d)',
  },
  violet: {
    shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.94), rgba(216,180,254,0.96) 18%, rgba(168,85,247,0.84) 46%, rgba(126,34,206,0.82) 72%, rgba(59,7,100,0.96) 100%)',
    ring: 'rgba(233,213,255,0.84)',
    text: '#fbf7ff',
    glow: '0 0 30px rgba(192,132,252,0.3)',
    rotor: 'linear-gradient(180deg,#7c68ff,#4a2798)',
  },
  amber: {
    shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.94), rgba(253,230,138,0.96) 18%, rgba(251,146,60,0.84) 46%, rgba(249,115,22,0.82) 72%, rgba(124,45,18,0.96) 100%)',
    ring: 'rgba(254,243,199,0.84)',
    text: '#fff9ef',
    glow: '0 0 30px rgba(251,146,60,0.32)',
    rotor: 'linear-gradient(180deg,#7e6cff,#5b31b0)',
  },
  emerald: {
    shell: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,0.94), rgba(187,247,208,0.96) 18%, rgba(52,211,153,0.84) 46%, rgba(5,150,105,0.82) 72%, rgba(6,78,59,0.96) 100%)',
    ring: 'rgba(209,250,229,0.84)',
    text: '#f3fff9',
    glow: '0 0 30px rgba(52,211,153,0.28)',
    rotor: 'linear-gradient(180deg,#6c79ff,#3e4cb6)',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;

const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max + 1));

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const getPlaceDigit = (label: string, place: PlaceName) => {
  const decimalPart = (label.split('.')[1] || '').padEnd(3, '0');
  const index = place === 'tenths' ? 0 : place === 'hundredths' ? 1 : 2;
  return Number(decimalPart[index] || 0);
};

const createDecimalLabel = (levelId: number, forcePlaces?: number, forceDigit?: { place: PlaceName; digit: number }) => {
  const placesPool = levelId <= 1 ? [1, 2] : levelId === 2 ? [2, 2, 3] : [2, 3, 3];
  const places = forcePlaces ?? placesPool[randomInt(0, placesPool.length - 1)];
  const digits = Array.from({ length: places }, (_, index) => randomInt(index === 0 ? 1 : 0, 9));

  if (forceDigit) {
    const placeIndex = forceDigit.place === 'tenths' ? 0 : forceDigit.place === 'hundredths' ? 1 : 2;
    while (digits.length <= placeIndex) {
      digits.push(randomInt(0, 9));
    }
    digits[placeIndex] = forceDigit.digit;
  }

  const label = `0.${digits.join('')}`;
  return {
    label,
    value: Number(label),
  };
};

const createUniqueTargets = (levelId: number, count: number, factory?: (index: number) => { label: string; value: number }) => {
  const used = new Set<number>();
  const targets: { label: string; value: number }[] = [];

  while (targets.length < count) {
    const next = factory ? factory(targets.length) : createDecimalLabel(levelId);
    const numericKey = Number(next.value.toFixed(4));
    if (used.has(numericKey)) continue;
    used.add(numericKey);
    targets.push(next);
  }

  return targets;
};

const decorateTargets = (entries: { label: string; value: number }[]): DroneTarget[] => {
  const palettes: DronePalette[] = ['cyan', 'violet', 'amber', 'emerald'];
  const positions = shuffle([
    { x: 18, y: 28 },
    { x: 36, y: 20 },
    { x: 53, y: 31 },
    { x: 72, y: 22 },
    { x: 82, y: 37 },
  ]);

  return entries.map((entry, index) => ({
    id: `target-${index}-${entry.label}`,
    label: entry.label,
    value: entry.value,
    x: positions[index].x,
    y: positions[index].y,
    driftX: randomBetween(-10, 10),
    driftY: randomBetween(-6, 6),
    palette: palettes[index % palettes.length],
  }));
};

const buildLargestRound = (levelId: number): DecimalRound => {
  const targets = decorateTargets(createUniqueTargets(levelId, 4));
  const winner = targets.reduce((best, candidate) => (candidate.value > best.value ? candidate : best), targets[0]);
  return {
    mode: 'largest',
    instruction: 'Shoot the largest decimal',
    sublabel: 'Compare tenths first, then scan the smaller place values.',
    targets,
    correctIds: [winner.id],
  };
};

const buildSmallestRound = (levelId: number): DecimalRound => {
  const targets = decorateTargets(createUniqueTargets(levelId, 4));
  const winner = targets.reduce((best, candidate) => (candidate.value < best.value ? candidate : best), targets[0]);
  return {
    mode: 'smallest',
    instruction: 'Shoot the smallest decimal',
    sublabel: 'Look for the smallest place value from left to right.',
    targets,
    correctIds: [winner.id],
  };
};

const buildClosestRound = (levelId: number): DecimalRound => {
  let anchor = Number((randomInt(2, 8) / 10).toFixed(1));
  let targets = decorateTargets(createUniqueTargets(levelId, 4));
  let sorted = [...targets].sort((a, b) => Math.abs(a.value - anchor) - Math.abs(b.value - anchor));

  while (Math.abs(Math.abs(sorted[0].value - anchor) - Math.abs(sorted[1].value - anchor)) < 0.0001) {
    anchor = Number((randomInt(2, 8) / 10).toFixed(1));
    targets = decorateTargets(createUniqueTargets(levelId, 4));
    sorted = [...targets].sort((a, b) => Math.abs(a.value - anchor) - Math.abs(b.value - anchor));
  }

  return {
    mode: 'closest',
    instruction: `Shoot the decimal closest to ${anchor.toFixed(1)}`,
    sublabel: 'Estimate the gap between each decimal and the target value.',
    targets,
    correctIds: [sorted[0].id],
  };
};

const buildRoundingRound = (levelId: number): DecimalRound => {
  const precision = levelId >= 3 ? 2 : 1;
  const target = Number(randomBetween(0.2, 0.9).toFixed(precision));
  const matching = createUniqueTargets(levelId, 1, () => {
    const step = precision === 1 ? 0.1 : 0.01;
    const lower = target - step / 2 + 0.001;
    const upper = target + step / 2 - 0.001;
    const value = Number(randomBetween(lower, upper).toFixed(precision + 1));
    return { label: value.toFixed(precision + 1), value };
  })[0];

  const distractors = createUniqueTargets(levelId, 3, () => {
    const value = Number(randomBetween(0.11, 0.99).toFixed(precision + 1));
    return { label: value.toFixed(precision + 1), value };
  }).filter((item) => Number(item.value.toFixed(precision)) !== target);

  while (distractors.length < 3) {
    const value = Number(randomBetween(0.11, 0.99).toFixed(precision + 1));
    if (Number(value.toFixed(precision)) !== target) {
      distractors.push({ label: value.toFixed(precision + 1), value });
    }
  }

  const targets = decorateTargets(shuffle([matching, ...distractors.slice(0, 3)]));
  const winner = targets.find((targetItem) => Number(targetItem.value.toFixed(precision)) === target) || targets[0];

  return {
    mode: 'rounding',
    instruction: `Shoot the decimal that rounds to ${target.toFixed(precision)}`,
    sublabel: precision === 1 ? 'Check the hundredths digit before rounding to tenths.' : 'Check the thousandths digit before rounding to hundredths.',
    targets,
    correctIds: [winner.id],
  };
};

const buildPlaceRound = (levelId: number): DecimalRound => {
  const places: PlaceName[] = levelId <= 1 ? ['tenths', 'hundredths'] : ['tenths', 'hundredths', 'thousandths'];
  const place = places[randomInt(0, places.length - 1)];
  const digit = randomInt(1, 8);
  const matching = createUniqueTargets(levelId, 1, () => createDecimalLabel(levelId, undefined, { place, digit }))[0];
  const distractors = createUniqueTargets(levelId, 3, () => createDecimalLabel(levelId)).filter((item) => getPlaceDigit(item.label, place) !== digit);

  while (distractors.length < 3) {
    const candidate = createDecimalLabel(levelId);
    if (getPlaceDigit(candidate.label, place) !== digit) {
      distractors.push(candidate);
    }
  }

  const targets = decorateTargets(shuffle([matching, ...distractors.slice(0, 3)]));
  const winner = targets.find((targetItem) => getPlaceDigit(targetItem.label, place) === digit) || targets[0];

  return {
    mode: 'place',
    instruction: `Shoot the decimal with ${digit} in the ${place} place`,
    sublabel: 'Read each decimal place carefully before you fire.',
    targets,
    correctIds: [winner.id],
  };
};

const buildBossRound = (levelId: number): DecimalRound => {
  const rawTargets = createUniqueTargets(levelId + 1, 4, () => {
    const places = levelId >= 3 ? 3 : 2;
    const value = Number(randomBetween(0.11, 0.99).toFixed(places));
    return { label: value.toFixed(places), value };
  });
  const targets = decorateTargets(rawTargets);
  const ordered = [...targets].sort((a, b) => a.value - b.value);

  return {
    mode: 'boss',
    instruction: 'Boss round: hit the decimals from smallest to largest',
    sublabel: 'Stay in sequence to break the shield in one clean volley.',
    targets,
    correctIds: ordered.map((target) => target.id),
    orderIds: ordered.map((target) => target.id),
  };
};

const buildRound = (levelId: number, roundNumber: number, totalRounds: number, forceBoss: boolean): DecimalRound => {
  if (forceBoss || roundNumber === totalRounds) {
    return buildBossRound(levelId);
  }

  const builders = [buildLargestRound, buildSmallestRound, buildClosestRound, buildRoundingRound, buildPlaceRound];
  return builders[(roundNumber - 1) % builders.length](levelId);
};

const DecimalSniperGame: React.FC<DecimalSniperGameProps> = ({
  levelId,
  avatarId,
  isBoss = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const roundGoal = isBoss ? 4 : (ROUND_GOAL_BY_LEVEL[levelId] || 8);
  const targetScore = 900 + (levelId * 320);
  const arenaRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(58 + (levelId * 8));
  const [roundNumber, setRoundNumber] = useState(1);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [crosshair, setCrosshair] = useState({ x: 50, y: 46 });
  const [impact, setImpact] = useState<ImpactFlash | null>(null);
  const [roundState, setRoundState] = useState<DecimalRound>(() => buildRound(levelId, 1, roundGoal, isBoss));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    setScore(0);
    setTimeLeft(58 + (levelId * 8));
    setRoundNumber(1);
    setCombo(0);
    setHearts(MAX_HEARTS);
    setCrosshair({ x: 50, y: 46 });
    setImpact(null);
    setSelectedIds([]);
    setLockedIds([]);
    setIsVictory(false);
    setIsGameOver(false);
    setRoundState(buildRound(levelId, 1, roundGoal, isBoss));
  }, [levelId, roundGoal, isBoss]);

  useEffect(() => {
    if (isGameOver || isVictory) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isGameOver, isVictory, onGameOver, score]);

  useEffect(() => {
    if (!impact) return undefined;
    const timeoutId = window.setTimeout(() => setImpact(null), 650);
    return () => window.clearTimeout(timeoutId);
  }, [impact]);

  const progress = Math.min((score / targetScore) * 100, 100);

  const queueNextRound = (nextRoundNumber: number) => {
    if (nextRoundNumber > roundGoal) {
      setIsVictory(true);
      const stars = score >= targetScore * 1.4 && hearts >= 3
        ? 3
        : score >= targetScore && hearts >= 2
          ? 2
          : 1;

      confetti({
        particleCount: 180,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#fcd34d', '#38bdf8', '#c084fc', '#86efac'],
      });
      onVictory(stars, score);
      return;
    }

    window.setTimeout(() => {
      setRoundNumber(nextRoundNumber);
      setLockedIds([]);
      setSelectedIds([]);
      setRoundState(buildRound(levelId, nextRoundNumber, roundGoal, isBoss));
    }, 650);
  };

  const registerImpact = (target: DroneTarget, success: boolean, title: string, subtitle: string) => {
    setCrosshair({ x: target.x, y: target.y });
    setImpact({
      id: Date.now(),
      x: target.x,
      y: target.y,
      success,
      title,
      subtitle,
    });
  };

  const damagePlayer = (target: DroneTarget, message: string) => {
    triggerHaptic('error');
    registerImpact(target, false, 'Ricochet', message);
    setCombo(0);
    setScore((previous) => Math.max(0, previous - 35));
    setSelectedIds([]);
    const nextHearts = hearts - 1;
    setHearts(nextHearts);

    if (nextHearts <= 0) {
      window.setTimeout(() => {
        setIsGameOver(true);
        onGameOver(Math.max(0, score - 35));
      }, 280);
    }
  };

  const handleBossTap = (target: DroneTarget) => {
    const expectedId = roundState.correctIds[selectedIds.length];

    if (target.id !== expectedId) {
      damagePlayer(target, 'You broke the order. Restart the boss sequence.');
      return;
    }

    triggerHaptic('selection');
    const nextSelected = [...selectedIds, target.id];
    setSelectedIds(nextSelected);
    setLockedIds((previous) => [...previous, target.id]);
    const points = 160 + (combo * 18);
    setCombo((previous) => previous + 1);
    setScore((previous) => previous + points);
    registerImpact(target, true, nextSelected.length === roundState.correctIds.length ? 'Shield Broken' : 'Locked In', `+${points} points`);

    confetti({
      particleCount: 26,
      spread: 40,
      origin: { x: clamp(target.x / 100, 0.1, 0.9), y: clamp(target.y / 100, 0.1, 0.85) },
      colors: ['#38bdf8', '#c084fc', '#fcd34d'],
    });

    if (nextSelected.length === roundState.correctIds.length) {
      queueNextRound(roundNumber + 1);
    }
  };

  const handleTargetTap = (target: DroneTarget) => {
    if (isGameOver || isVictory || lockedIds.includes(target.id)) return;

    if (roundState.mode === 'boss') {
      handleBossTap(target);
      return;
    }

    if (target.id !== roundState.correctIds[0]) {
      damagePlayer(target, 'That decimal does not match the targeting rule.');
      return;
    }

    triggerHaptic('success');
    const points = 140 + (combo * 16);
    setCombo((previous) => previous + 1);
    setScore((previous) => previous + points);
    setLockedIds([target.id]);
    registerImpact(target, true, combo >= 2 ? 'Critical Hit' : 'Direct Hit', `+${points} points`);

    confetti({
      particleCount: 32,
      spread: 52,
      origin: { x: clamp(target.x / 100, 0.1, 0.9), y: clamp(target.y / 100, 0.1, 0.8) },
      colors: ['#fcd34d', '#fb7185', '#38bdf8', '#c084fc'],
    });

    queueNextRound(roundNumber + 1);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setCrosshair({
      x: clamp(x, 8, 92),
      y: clamp(y, 10, 88),
    });
  };

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#07122c_0%,#0c1d46_35%,#06101f_100%)]">
      <GameplaySceneBackdrop gameType="place_value_peaks" className="opacity-90" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[6%] h-[34%] w-[40%] rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute right-[-12%] top-[12%] h-[30%] w-[44%] rounded-full bg-violet-500/18 blur-3xl" />
        <div className="absolute inset-x-[20%] top-[18%] h-[18%] rounded-full bg-white/12 blur-3xl" />
        <div className="absolute inset-x-[8%] bottom-[-8%] h-[26%] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute left-[8%] top-[38%] h-20 w-28 rounded-[46%] bg-white/8 blur-xl" />
        <div className="absolute right-[14%] top-[32%] h-24 w-32 rounded-[48%] bg-white/8 blur-xl" />
        {Array.from({ length: 16 }).map((_, index) => (
          <motion.div
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              width: `${3 + (index % 3)}px`,
              height: `${3 + (index % 3)}px`,
              left: `${8 + (index * 5.5) % 84}%`,
              top: `${6 + (index * 7.8) % 70}%`,
            }}
            animate={{ opacity: [0.12, 0.55, 0.12], scale: [1, 1.25, 1], y: [0, -8, 0] }}
            transition={{ duration: 2.8 + (index * 0.15), repeat: Infinity, delay: index * 0.12 }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Decimal Sniper"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/80"
            accentBorder="border-sky-200/80"
            progressBar="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400"
            statLabel="Round"
            statValue={`${roundNumber}/${roundGoal}`}
          />
        </div>

        <div
          ref={arenaRef}
          onPointerMove={handlePointerMove}
          className="relative flex w-full max-w-6xl flex-1 min-h-0 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,23,56,0.72),rgba(3,9,22,0.88))] shadow-[0_24px_60px_rgba(2,6,23,0.4)] touch-none md:rounded-[2.6rem]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(125,211,252,0.3),transparent_22%),radial-gradient(circle_at_18%_52%,rgba(192,132,252,0.2),transparent_22%),radial-gradient(circle_at_82%_62%,rgba(251,191,36,0.18),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_24%,rgba(2,6,23,0.3)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.12)_28%,rgba(7,12,24,0.72)_100%)]" />

          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/45 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:left-5 md:top-5 md:px-4">
            {Array.from({ length: MAX_HEARTS }).map((_, index) => (
              <Heart
                key={index}
                className={`h-5 w-5 md:h-6 md:w-6 ${index < hearts ? 'text-red-500' : 'text-white/15'}`}
              />
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:right-5 md:top-5 md:px-4">
            <Sparkles className="h-4 w-4 text-cyan-200 md:h-5 md:w-5" />
            <span className="text-sm font-black uppercase tracking-[0.14em] text-white md:text-base">Combo x{Math.max(combo, 1)}</span>
          </div>

          <div className="absolute inset-x-3 top-[4.8rem] z-20 flex flex-col items-center gap-2 md:inset-x-10 md:top-[5.8rem]">
            <div className="inline-flex max-w-[92%] items-center justify-center rounded-[1.3rem] border border-orange-200/24 bg-[linear-gradient(180deg,rgba(251,146,60,0.96),rgba(194,65,12,0.98))] px-4 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_30px_rgba(124,45,18,0.24)] md:px-6 md:py-3">
              <Target className="mr-2 hidden h-5 w-5 text-amber-100 md:block" />
              <span className="text-base font-black tracking-tight text-amber-50 md:text-[1.75rem]">{roundState.instruction}</span>
            </div>
            <div className="max-w-[88%] rounded-full border border-white/12 bg-slate-950/42 px-4 py-2 text-center text-[0.72rem] font-bold text-slate-100/90 md:text-sm">
              {roundState.sublabel}
            </div>
          </div>

          <div className="absolute inset-x-0 top-[24%] bottom-[15%] z-10">
            <AnimatePresence>
              {roundState.targets.map((target) => {
                const theme = DRONE_THEMES[target.palette];
                const isLocked = lockedIds.includes(target.id);
                const isSelected = selectedIds.includes(target.id);

                return (
                  <motion.button
                    key={target.id}
                    type="button"
                    onPointerDown={() => handleTargetTap(target)}
                    disabled={isLocked || isGameOver || isVictory}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${isLocked ? 'pointer-events-none opacity-35 grayscale' : ''}`}
                    style={{ left: `${target.x}%`, top: `${target.y}%` }}
                    initial={{ scale: 0.72, opacity: 0 }}
                    animate={{
                      scale: isSelected ? 0.94 : 1,
                      opacity: 1,
                      x: [0, target.driftX, 0, -target.driftX * 0.65, 0],
                      y: [0, -10 + target.driftY, 0, 8 - target.driftY, 0],
                      rotate: [0, 1.2, 0, -1.5, 0],
                    }}
                    exit={{ scale: 1.35, opacity: 0 }}
                    transition={{
                      scale: { duration: 0.2 },
                      opacity: { duration: 0.3 },
                      x: { duration: 5.4 + (target.x * 0.01), repeat: Infinity, ease: 'easeInOut' },
                      y: { duration: 4.6 + (target.y * 0.01), repeat: Infinity, ease: 'easeInOut' },
                      rotate: { duration: 6.2, repeat: Infinity, ease: 'easeInOut' },
                    }}
                  >
                    <div className="relative h-20 w-20 md:h-28 md:w-28">
                      <div
                        className="absolute left-1/2 top-0 z-20 h-5 w-9 -translate-x-1/2 rounded-full border border-white/20 md:h-7 md:w-12"
                        style={{ background: theme.rotor, boxShadow: '0 8px 16px rgba(15,23,42,0.32)' }}
                      >
                        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.65)] md:h-3.5 md:w-3.5" />
                      </div>
                      <div className="absolute left-[12%] top-[4%] h-2 w-6 rounded-full bg-violet-950/65 rotate-[-18deg] md:h-2.5 md:w-8" />
                      <div className="absolute right-[12%] top-[4%] h-2 w-6 rounded-full bg-violet-950/65 rotate-[18deg] md:h-2.5 md:w-8" />
                      <div
                        className="absolute left-1/2 top-[16%] h-12 w-12 -translate-x-1/2 rounded-full border-2 md:h-16 md:w-16"
                        style={{
                          background: theme.shell,
                          borderColor: theme.ring,
                          boxShadow: `${theme.glow}, inset 0 -14px 24px rgba(15,23,42,0.28), inset 0 10px 18px rgba(255,255,255,0.18)`,
                        }}
                      >
                        <div className="absolute inset-[9%] rounded-full border border-white/30 opacity-70" />
                        <div className="absolute inset-x-[20%] top-[14%] h-[18%] rounded-full bg-white/35 blur-md" />
                        <div className="flex h-full items-center justify-center px-2 text-center text-[1rem] font-black tracking-tight drop-shadow-[0_3px_0_rgba(41,24,14,0.82)] md:text-[1.55rem]" style={{ color: theme.text }}>
                          {target.label}
                        </div>
                      </div>
                      <div
                        className="absolute left-1/2 top-[58%] h-4 w-4 -translate-x-1/2 rotate-45 rounded-[0.35rem] border md:h-5 md:w-5"
                        style={{ background: theme.shell, borderColor: theme.ring }}
                      />
                      {roundState.mode === 'boss' && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-white/18 bg-slate-950/48 px-2 py-1 text-[10px] font-black text-white md:text-xs">
                          #{(roundState.orderIds || []).indexOf(target.id) + 1}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-center pb-3 md:pb-5">
            <div className="relative flex h-28 w-44 items-end justify-center md:h-36 md:w-56">
              <motion.div
                animate={{
                  rotate: [0, (crosshair.x - 50) * 0.12, 0],
                  y: [0, -1.5, 0],
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="absolute bottom-6 h-20 w-24 origin-bottom rounded-[2rem_2rem_1.4rem_1.4rem] border border-amber-200/30 bg-[linear-gradient(180deg,#6d57ff,#32226f)] shadow-[0_18px_28px_rgba(15,23,42,0.4)] md:bottom-8 md:h-24 md:w-28"
              >
                <div className="absolute inset-x-[18%] top-[12%] h-[18%] rounded-full bg-white/18 blur-md" />
                <div className="absolute left-1/2 top-[-40%] h-16 w-7 -translate-x-1/2 rotate-[18deg] rounded-[999px] border border-amber-200/24 bg-[linear-gradient(180deg,#fbbf24,#fb923c)] shadow-[0_10px_16px_rgba(251,146,60,0.28)] md:h-20 md:w-8" />
                <div className="absolute left-1/2 top-[-18%] h-8 w-8 -translate-x-1/2 rounded-full border border-amber-100/24 bg-[radial-gradient(circle_at_30%_30%,#fde68a,#f59e0b)] shadow-[0_0_22px_rgba(251,191,36,0.44)] md:h-10 md:w-10" />
              </motion.div>
              <div className="absolute bottom-0 h-8 w-36 rounded-[999px] bg-cyan-300/14 blur-2xl md:h-10 md:w-44" />
              <div className="absolute bottom-0 h-4 w-28 rounded-full border border-cyan-200/20 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.5),rgba(34,211,238,0.08))] md:h-5 md:w-32" />
            </div>
          </div>

          <motion.div
            className="pointer-events-none absolute z-30 hidden -translate-x-1/2 -translate-y-1/2 md:block"
            animate={{ x: `${crosshair.x}%`, y: `${crosshair.y}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.35 }}
            style={{ left: 0, top: 0 }}
          >
            <div className="rounded-full bg-cyan-300/12 p-1 shadow-[0_0_28px_rgba(34,211,238,0.3)]">
              <Crosshair className="h-10 w-10 text-cyan-300" />
            </div>
          </motion.div>

          <AnimatePresence>
            {impact && (
              <motion.div
                key={impact.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.35 }}
                className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${impact.x}%`, top: `${impact.y}%` }}
              >
                <div className={`flex h-20 w-20 items-center justify-center rounded-full border md:h-24 md:w-24 ${impact.success ? 'border-amber-200/45 bg-amber-300/16' : 'border-red-200/35 bg-red-400/14'}`}>
                  <Crosshair className={`h-10 w-10 md:h-12 md:w-12 ${impact.success ? 'text-amber-100' : 'text-red-100'}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {impact && (
              <motion.div
                key={`impact-text-${impact.id}`}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 1.04 }}
                className="pointer-events-none absolute inset-x-0 bottom-[16%] z-40 flex flex-col items-center"
              >
                <div className={`text-3xl font-black uppercase tracking-[0.12em] drop-shadow-[0_10px_18px_rgba(2,6,23,0.45)] md:text-5xl ${impact.success ? 'text-amber-200' : 'text-red-300'}`}>
                  {impact.title}
                </div>
                <div className="mt-1 rounded-full border border-white/12 bg-slate-950/52 px-4 py-1 text-sm font-bold text-white/92 md:text-lg">
                  {impact.subtitle}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-slate-100" />
        </div>
      </div>
    </div>
  );
};

export default DecimalSniperGame;
