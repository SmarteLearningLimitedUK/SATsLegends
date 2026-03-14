import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS } from '../constants';
import AssetIcon from './AssetIcon';
import chestGold from '../assets/licensed/slices/chest_gold.png';
import rewardBagCoins from '../assets/licensed/reward_bag_coins.png';

interface RatioRapidsGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type RoundMode = 'split' | 'boss';

interface SplitRound {
  mode: 'split';
  ratioA: number;
  ratioB: number;
  total: number;
  targetA: number;
  targetB: number;
}

interface BossRound {
  mode: 'boss';
  rawA: number;
  rawB: number;
  options: string[];
  answer: string;
}

type RatioRound = SplitRound | BossRound;

interface DragState {
  active: boolean;
  x: number;
  y: number;
}

interface FloatingCoin {
  id: number;
  x: number;
  y: number;
  target: 'left' | 'right';
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];

const gcd = (a: number, b: number): number => {
  let x = a;
  let y = b;
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const formatRatio = (a: number, b: number) => `${a} : ${b}`;

const createSplitRound = (levelId: number): SplitRound => {
  const pairs = levelId <= 1
    ? [[1, 1], [1, 2], [2, 3], [3, 2], [1, 3]]
    : levelId === 2
      ? [[2, 3], [3, 4], [1, 4], [4, 1], [2, 5], [5, 3]]
      : [[3, 2], [4, 3], [5, 4], [2, 5], [3, 5], [4, 5]];
  const [ratioA, ratioB] = pairs[randomInt(0, pairs.length - 1)];
  const multiplier = randomInt(3, levelId >= 3 ? 6 : 5);
  const total = (ratioA + ratioB) * multiplier;

  return {
    mode: 'split',
    ratioA,
    ratioB,
    total,
    targetA: ratioA * multiplier,
    targetB: ratioB * multiplier,
  };
};

const createBossRound = (levelId: number): BossRound => {
  const simplifiedPairs = levelId <= 2
    ? [[2, 3], [1, 2], [3, 4], [2, 5]]
    : [[2, 3], [3, 5], [4, 5], [3, 4], [5, 4]];
  const [simpleA, simpleB] = simplifiedPairs[randomInt(0, simplifiedPairs.length - 1)];
  const multiplier = randomInt(2, levelId >= 3 ? 5 : 4);
  const rawA = simpleA * multiplier;
  const rawB = simpleB * multiplier;
  const answer = formatRatio(simpleA, simpleB);

  const distractors = new Set<string>();
  while (distractors.size < 2) {
    const variantA = randomInt(1, Math.max(simpleA + 3, 6));
    const variantB = randomInt(1, Math.max(simpleB + 3, 6));
    const candidate = formatRatio(variantA, variantB);
    if (candidate !== answer) {
      distractors.add(candidate);
    }
  }

  const sameFactor = randomInt(2, 4);
  distractors.add(formatRatio(simpleA * sameFactor, simpleB * sameFactor));

  return {
    mode: 'boss',
    rawA,
    rawB,
    answer,
    options: shuffle([answer, ...Array.from(distractors).slice(0, 2)]),
  };
};

const createRound = (levelId: number, roundNumber: number, totalRounds: number): RatioRound => {
  if (roundNumber === totalRounds) {
    return createBossRound(levelId);
  }
  return createSplitRound(levelId);
};

const PirateBarrel: React.FC<{
  label: string;
  value: string | number;
  glow?: boolean;
  success?: boolean;
  boss?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({
  label,
  value,
  glow = false,
  success = false,
  boss = false,
  onClick,
  disabled = false,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`relative flex h-32 w-full items-end justify-center rounded-[2rem] border border-amber-200/18 bg-transparent transition-transform ${disabled ? '' : 'active:scale-[0.98]'} ${className}`}
  >
    <div className={`absolute inset-x-[16%] bottom-[6%] h-9 rounded-full ${success ? 'bg-emerald-300/28' : 'bg-amber-300/18'} blur-xl`} />
    {boss && (
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full border border-slate-950/14 bg-slate-950/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50">
        {label}
      </div>
    )}
    {!boss && (
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full border border-slate-950/14 bg-slate-950/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50">
        {label}
      </div>
    )}
    <div className={`absolute inset-x-[12%] bottom-[12%] top-[16%] rounded-[1.8rem] border border-orange-950/28 bg-[linear-gradient(180deg,#a15c23,#804217_45%,#6a3416_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_24px_rgba(0,0,0,0.22)] ${glow ? 'ring-2 ring-amber-200/40' : ''}`}>
      <div className="absolute inset-x-[8%] top-[14%] h-[12%] rounded-full bg-white/16 blur-sm" />
      <div className="absolute inset-x-0 top-[26%] h-[10%] bg-[linear-gradient(180deg,rgba(148,163,184,0.96),rgba(71,85,105,0.98))] shadow-[0_2px_0_rgba(15,23,42,0.26)]" />
      <div className="absolute inset-x-0 top-[62%] h-[10%] bg-[linear-gradient(180deg,rgba(148,163,184,0.96),rgba(71,85,105,0.98))] shadow-[0_2px_0_rgba(15,23,42,0.26)]" />
      <div className="absolute inset-x-[12%] bottom-[13%] top-[40%] flex items-center justify-center rounded-[1rem] border border-black/18 bg-black/12 px-3">
        <span className={`text-center font-black tracking-tight drop-shadow-[0_3px_0_rgba(60,30,12,0.75)] ${boss ? 'text-[1.8rem] md:text-[2.4rem]' : 'text-[2rem] md:text-[2.7rem]'} ${success ? 'text-emerald-100' : 'text-amber-50'}`}>
          {value}
        </span>
      </div>
    </div>
  </button>
);

const RatioRapidsGame: React.FC<RatioRapidsGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 900 + (levelId * 260);

  const leftBarrelRef = useRef<HTMLDivElement>(null);
  const rightBarrelRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(64 + (levelId * 8));
  const [roundNumber, setRoundNumber] = useState(1);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState<RatioRound>(() => createRound(levelId, 1, totalRounds));
  const [leftCoins, setLeftCoins] = useState(0);
  const [rightCoins, setRightCoins] = useState(0);
  const [drag, setDrag] = useState<DragState>({ active: false, x: 0, y: 0 });
  const [floatingCoins, setFloatingCoins] = useState<FloatingCoin[]>([]);
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);

  useEffect(() => {
    setScore(0);
    setTimeLeft(64 + (levelId * 8));
    setRoundNumber(1);
    setHearts(MAX_HEARTS);
    setStreak(0);
    setRound(createRound(levelId, 1, totalRounds));
    setLeftCoins(0);
    setRightCoins(0);
    setDrag({ active: false, x: 0, y: 0 });
    setFloatingCoins([]);
    setFeedback(null);
    setIsVictory(false);
    setIsGameOver(false);
  }, [levelId, totalRounds]);

  useEffect(() => {
    if (isGameOver || isVictory) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isGameOver, isVictory, onGameOver, score]);

  useEffect(() => {
    if (!drag.active) return undefined;

    const handleMove = (event: PointerEvent) => {
      setDrag((previous) => ({ ...previous, x: event.clientX, y: event.clientY }));
    };

    const finishDrag = (event: PointerEvent) => {
      setDrag({ active: false, x: 0, y: 0 });

      if (round.mode !== 'split') return;
      const remaining = round.total - leftCoins - rightCoins;
      if (remaining <= 0) return;

      const leftRect = leftBarrelRef.current?.getBoundingClientRect();
      const rightRect = rightBarrelRef.current?.getBoundingClientRect();

      if (leftRect && event.clientX >= leftRect.left && event.clientX <= leftRect.right && event.clientY >= leftRect.top && event.clientY <= leftRect.bottom) {
        setLeftCoins((previous) => previous + 1);
        setFloatingCoins((previous) => [...previous, { id: Date.now(), x: event.clientX, y: event.clientY, target: 'left' }]);
        return;
      }

      if (rightRect && event.clientX >= rightRect.left && event.clientX <= rightRect.right && event.clientY >= rightRect.top && event.clientY <= rightRect.bottom) {
        setRightCoins((previous) => previous + 1);
        setFloatingCoins((previous) => [...previous, { id: Date.now(), x: event.clientX, y: event.clientY, target: 'right' }]);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finishDrag, { once: true });

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finishDrag);
    };
  }, [drag.active, leftCoins, rightCoins, round]);

  useEffect(() => {
    if (!floatingCoins.length) return undefined;
    const timeoutId = window.setTimeout(() => {
      setFloatingCoins([]);
    }, 520);
    return () => window.clearTimeout(timeoutId);
  }, [floatingCoins]);

  const loseHeart = (title: string, subtitle: string) => {
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setScore((previous) => Math.max(0, previous - 40));
    setFeedback({ type: 'error', title, subtitle });

    if (nextHearts <= 0) {
      window.setTimeout(() => {
        setIsGameOver(true);
        onGameOver(Math.max(0, score - 40));
      }, 520);
      return;
    }

    window.setTimeout(() => {
      setFeedback(null);
      if (round.mode === 'split') {
        setLeftCoins(0);
        setRightCoins(0);
      }
    }, 850);
  };

  const completeGame = (finalScore: number) => {
    setIsVictory(true);
    const stars = finalScore >= targetScore * 1.45 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;

    confetti({
      particleCount: 170,
      spread: 70,
      origin: { y: 0.58 },
      colors: ['#fcd34d', '#86efac', '#ffffff'],
    });
    onVictory(stars, finalScore);
  };

  const goToNextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      completeGame(updatedScore);
      return;
    }

    window.setTimeout(() => {
      const nextRound = roundNumber + 1;
      setRoundNumber(nextRound);
      setRound(createRound(levelId, nextRound, totalRounds));
      setLeftCoins(0);
      setRightCoins(0);
      setFeedback(null);
    }, 850);
  };

  const handleCheckSplit = () => {
    if (round.mode !== 'split' || feedback) return;
    if (leftCoins + rightCoins !== round.total) {
      loseHeart('Not Packed Yet', 'Use every coin before you set sail.');
      return;
    }

    const correct = leftCoins === round.targetA && rightCoins === round.targetB;
    if (!correct) {
      loseHeart('Wrong Split', `The treasure should be ${round.targetA} and ${round.targetB}.`);
      return;
    }

    const points = 160 + (streak * 25);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Success!', subtitle: `+${points} points` });

    confetti({
      particleCount: 40,
      spread: 46,
      origin: { y: 0.68 },
      colors: ['#fcd34d', '#fde68a', '#ffffff'],
    });

    goToNextRound(updatedScore);
  };

  const handleBossPick = (option: string) => {
    if (round.mode !== 'boss' || feedback) return;
    if (option !== round.answer) {
      loseHeart('Captain Blocks!', `${option} is not the simplest form.`);
      return;
    }

    const points = 240 + (streak * 30);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Critical Hit!', subtitle: `+${points} points` });

    confetti({
      particleCount: 56,
      spread: 52,
      origin: { y: 0.66 },
      colors: ['#fcd34d', '#86efac', '#ffffff'],
    });

    goToNextRound(updatedScore);
  };

  const startDragCoin = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (round.mode !== 'split' || feedback) return;
    const remaining = round.total - leftCoins - rightCoins;
    if (remaining <= 0) return;
    setDrag({ active: true, x: event.clientX, y: event.clientY });
  };

  const splitRound = round.mode === 'split' ? round : null;
  const bossRound = round.mode === 'boss' ? round : null;
  const remainingCoins = splitRound ? Math.max(splitRound.total - leftCoins - rightCoins, 0) : 0;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#062243_0%,#0b3a67_42%,#04101f_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(180deg,rgba(56,189,248,0.2),rgba(59,130,246,0.08),transparent)]" />
        <div className="absolute left-[-8%] top-[20%] h-24 w-48 rounded-full bg-white/12 blur-2xl" />
        <div className="absolute right-[-6%] top-[16%] h-24 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute inset-x-[16%] top-[8%] h-24 rounded-full bg-cyan-200/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[56%] bg-[linear-gradient(180deg,rgba(19,78,74,0),rgba(101,67,33,0.12)_16%,rgba(66,33,11,0.55)_52%,rgba(25,12,6,0.92)_100%)]" />
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="absolute h-[2px] w-8 rotate-[14deg] rounded-full bg-white/80"
            style={{ left: `${18 + index * 10}%`, top: `${9 + (index % 2) * 2}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Ratio Raiders"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-amber-950"
            accentSoftBg="bg-amber-100/84"
            accentBorder="border-amber-200/88"
            progressBar="bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400"
            statLabel="Round"
            statValue={`${roundNumber}/${totalRounds}`}
          />
        </div>

        <div className="relative flex w-full max-w-6xl flex-1 min-h-0 overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_28%,rgba(15,23,42,0.12)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(20,83,45,0),rgba(120,53,15,0.14)_12%,rgba(69,33,12,0.68)_68%,rgba(25,12,6,0.96)_100%)]" />
          <div className="absolute left-[4%] top-[24%] h-[66%] w-[22%] rounded-[1rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.35),rgba(41,37,36,0.18))] opacity-45" />
          <div className="absolute left-[24%] top-[22%] h-[70%] w-[18%] rounded-[1rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.35),rgba(41,37,36,0.18))] opacity-24" />
          <div className="absolute right-[5%] top-[24%] h-[66%] w-[20%] rounded-[1rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.35),rgba(41,37,36,0.18))] opacity-45" />
          <div className="absolute inset-x-0 bottom-0 h-[16%] bg-[repeating-linear-gradient(90deg,rgba(120,53,15,0.94)_0px,rgba(120,53,15,0.94)_72px,rgba(146,64,14,0.98)_72px,rgba(146,64,14,0.98)_78px)] opacity-94" />

          <div className="absolute left-4 top-3 z-20 flex items-center gap-2 rounded-full border border-white/12 bg-slate-950/42 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:left-5 md:top-5 md:px-4">
            {Array.from({ length: MAX_HEARTS }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full md:h-6 md:w-6 ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'}`} />
            ))}
          </div>

          {splitRound && (
            <div className="absolute right-4 top-3 z-20 rounded-full border border-white/12 bg-slate-950/42 px-4 py-2 text-center shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:right-5 md:top-5">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70 md:text-xs">Ratio / Total</div>
              <div className="mt-0.5 text-lg font-black text-white md:text-2xl">{formatRatio(splitRound.ratioA, splitRound.ratioB)} / {splitRound.total}</div>
            </div>
          )}

          {bossRound && (
            <div className="absolute right-4 top-3 z-20 rounded-full border border-white/12 bg-slate-950/42 px-4 py-2 text-center shadow-[0_10px_24px_rgba(2,6,23,0.24)] md:right-5 md:top-5">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70 md:text-xs">Boss Round</div>
              <div className="mt-0.5 text-lg font-black text-white md:text-2xl">{bossRound.rawA} : {bossRound.rawB}</div>
            </div>
          )}

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
              <div className="max-w-[88%] rounded-[1.4rem] border border-orange-200/22 bg-[linear-gradient(180deg,rgba(146,64,14,0.96),rgba(120,53,15,0.98))] px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_16px_30px_rgba(120,53,15,0.24)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-50 md:text-[2rem]">
                  {splitRound ? `Divide the treasure ${formatRatio(splitRound.ratioA, splitRound.ratioB)}` : `Simplify ${bossRound?.rawA} : ${bossRound?.rawB}`}
                </div>
              </div>
            </div>

            <div className="relative mt-3 flex min-h-0 flex-1 flex-col justify-end md:mt-6">
              {splitRound && (
                <>
                  <div className="pointer-events-none absolute left-[2%] top-[8%] w-[28%] md:left-[4%] md:top-[12%] md:w-[22%]">
                    <img src={chestGold} alt="" className="w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.3)]" draggable={false} />
                  </div>
                  <div className="pointer-events-none absolute left-[7%] top-[28%] flex gap-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <motion.div
                        key={index}
                        animate={{ y: [0, -18 - (index % 3) * 8, 0], opacity: [0.45, 1, 0.45] }}
                        transition={{ duration: 1.8 + index * 0.1, repeat: Infinity, delay: index * 0.07 }}
                        className="rounded-full bg-amber-200/90 p-1.5 shadow-[0_0_18px_rgba(251,191,36,0.34)]"
                      >
                        <AssetIcon name="coin" className="h-4 w-4 md:h-5 md:w-5" />
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid flex-1 grid-cols-2 items-end gap-3 pb-28 md:gap-8 md:pb-32">
                    <div ref={leftBarrelRef} className="relative flex justify-center">
                      <PirateBarrel
                        label="Barrel A"
                        value={leftCoins}
                        glow={drag.active}
                        success={feedback?.type === 'success'}
                        onClick={() => setLeftCoins((previous) => Math.max(0, previous - 1))}
                        disabled={feedback !== null}
                      />
                    </div>
                    <div ref={rightBarrelRef} className="relative flex justify-center">
                      <PirateBarrel
                        label="Barrel B"
                        value={rightCoins}
                        glow={drag.active}
                        success={feedback?.type === 'success'}
                        onClick={() => setRightCoins((previous) => Math.max(0, previous - 1))}
                        disabled={feedback !== null}
                      />
                    </div>
                  </div>

                  <div className="relative flex items-end justify-between gap-3 md:gap-6">
                    <div className="relative w-[34%] max-w-[16rem]">
                      <img src={rewardBagCoins} alt="" className="w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.3)]" draggable={false} />
                    </div>

                    <button
                      type="button"
                      onPointerDown={startDragCoin}
                      disabled={remainingCoins <= 0 || feedback !== null}
                      className="relative flex flex-1 items-center justify-center rounded-[1.8rem] border border-amber-200/28 bg-[linear-gradient(180deg,rgba(251,191,36,0.22),rgba(120,53,15,0.28))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_26px_rgba(0,0,0,0.2)] disabled:opacity-50"
                    >
                      <div className="absolute inset-x-[8%] top-[12%] h-[22%] rounded-full bg-white/18 blur-md" />
                      <div className="relative flex items-center gap-3">
                        <div className="rounded-full bg-amber-200/92 p-2 shadow-[0_0_18px_rgba(251,191,36,0.35)]">
                          <AssetIcon name="coin" className="h-6 w-6 md:h-7 md:w-7" />
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75 md:text-xs">Coin Pile</div>
                          <div className="text-xl font-black text-amber-50 md:text-3xl">{remainingCoins} left</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckSplit}
                      disabled={feedback !== null}
                      className="licensed-submit-button flex min-w-[10rem] items-center justify-center rounded-[1.4rem] px-4 py-4 text-lg font-black text-white disabled:opacity-45 md:min-w-[12rem] md:rounded-[1.8rem] md:text-2xl"
                    >
                      Check Loot
                    </button>
                  </div>
                </>
              )}

              {bossRound && (
                <div className="relative flex flex-1 flex-col justify-between gap-4 pb-4 md:gap-6 md:pb-6">
                  <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-end">
                    <div className="relative flex min-h-[16rem] items-end justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(41,37,36,0.2),rgba(24,24,27,0.5))] p-4 shadow-[0_24px_36px_rgba(0,0,0,0.22)]">
                      <div className="absolute inset-x-[16%] top-[8%] h-16 rounded-full bg-amber-300/18 blur-2xl" />
                      <div className="absolute bottom-0 left-[10%] right-[10%] h-8 rounded-full bg-amber-300/16 blur-2xl" />
                      <div className="absolute left-[12%] top-[12%] h-10 w-10 rounded-full bg-red-500/18 blur-xl" />
                      <div className="absolute right-[14%] top-[10%] h-10 w-10 rounded-full bg-orange-400/18 blur-xl" />
                      <div className="relative flex h-full w-full flex-col items-center justify-end">
                        <div className="mb-3 rounded-full border border-white/12 bg-slate-950/55 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-amber-100 md:text-base">
                          Pirate Captain
                        </div>
                        <div className="relative h-52 w-44 md:h-64 md:w-52">
                          <div className="absolute left-1/2 top-0 h-14 w-14 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f5d0a9,#b45309_68%,#7c2d12)] shadow-[0_10px_18px_rgba(0,0,0,0.24)]" />
                          <div className="absolute left-1/2 top-10 h-16 w-28 -translate-x-1/2 rounded-[1.5rem] bg-[linear-gradient(180deg,#111827,#3f3f46)] shadow-[0_10px_18px_rgba(0,0,0,0.22)]" />
                          <div className="absolute left-1/2 top-3 h-10 w-40 -translate-x-1/2 rounded-[999px] bg-[linear-gradient(180deg,#111827,#18181b)] shadow-[0_14px_18px_rgba(0,0,0,0.22)]" />
                          <div className="absolute left-1/2 top-[4.3rem] h-10 w-16 -translate-x-1/2 rounded-b-[1.3rem] bg-[linear-gradient(180deg,#7c2d12,#451a03)]" />
                          <div className="absolute left-[28%] top-[4.2rem] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.45)]" />
                          <div className="absolute right-[28%] top-[4.2rem] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.45)]" />
                          <div className="absolute left-1/2 top-[5.2rem] h-3 w-6 -translate-x-1/2 rounded-full bg-red-900/85" />
                          <div className="absolute left-[18%] top-[7.8rem] h-14 w-20 rounded-[1.5rem] bg-[linear-gradient(180deg,#854d0e,#78350f)]" />
                          <div className="absolute right-[18%] top-[7.8rem] h-14 w-20 rounded-[1.5rem] bg-[linear-gradient(180deg,#854d0e,#78350f)]" />
                          <div className="absolute left-[10%] top-[8rem] h-12 w-12 rounded-full border border-amber-200/18 bg-[radial-gradient(circle_at_35%_30%,#fcd34d,#f59e0b_65%,#7c2d12)]" />
                          <div className="absolute right-[8%] top-[7.6rem] h-16 w-6 rotate-[-28deg] rounded-[999px] bg-[linear-gradient(180deg,#fde68a,#fb923c)] shadow-[0_10px_16px_rgba(251,146,60,0.28)]" />
                          <div className="absolute left-1/2 bottom-0 h-20 w-32 -translate-x-1/2 rounded-t-[2rem] bg-[linear-gradient(180deg,#7c2d12,#451a03)]" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      {bossRound.options.map((option) => (
                        <PirateBarrel
                          key={option}
                          label="Pick"
                          value={option}
                          boss
                          success={feedback?.type === 'success' && option === bossRound.answer}
                          onClick={() => handleBossPick(option)}
                          disabled={feedback !== null}
                          className="h-44 md:h-56"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {floatingCoins.map((coin) => (
              <motion.div
                key={coin.id}
                initial={{ opacity: 1, scale: 1, x: coin.x, y: coin.y }}
                animate={{
                  opacity: 0,
                  scale: 0.7,
                  x: coin.target === 'left' ? window.innerWidth * 0.34 : window.innerWidth * 0.66,
                  y: window.innerHeight * 0.6,
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="pointer-events-none fixed z-50 rounded-full bg-amber-200/92 p-2 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
              >
                <AssetIcon name="coin" className="h-5 w-5" />
              </motion.div>
            ))}
          </AnimatePresence>

          {drag.active && (
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/92 p-2.5 shadow-[0_0_22px_rgba(251,191,36,0.42)]"
              style={{ left: drag.x, top: drag.y }}
            >
              <AssetIcon name="coin" className="h-6 w-6 md:h-7 md:w-7" />
            </div>
          )}

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </div>
  );
};

export default RatioRapidsGame;
