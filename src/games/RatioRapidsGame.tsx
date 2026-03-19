import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import { AVATARS } from '../constants';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface RatioRapidsGameProps {
  levelId: number;
  avatarId: string;
  gameTitle?: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type UnitType = 'sword' | 'cannon';
type Phase = 'setup' | 'battle' | 'victory' | 'breach';

interface DefenseRound {
  mode: 'deploy' | 'boss';
  ratioSword: number;
  ratioCannon: number;
  multiplier: number;
  totalSlots: number;
  enemyCount: number;
  prompt: string;
  support: string;
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];
const SLOT_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  3: [
    { x: 26, y: 52 },
    { x: 50, y: 40 },
    { x: 74, y: 52 },
  ],
  4: [
    { x: 26, y: 50 },
    { x: 42, y: 36 },
    { x: 58, y: 36 },
    { x: 74, y: 50 },
  ],
  5: [
    { x: 22, y: 54 },
    { x: 38, y: 40 },
    { x: 50, y: 30 },
    { x: 62, y: 40 },
    { x: 78, y: 54 },
  ],
  6: [
    { x: 20, y: 56 },
    { x: 34, y: 42 },
    { x: 48, y: 30 },
    { x: 62, y: 30 },
    { x: 76, y: 42 },
    { x: 86, y: 56 },
  ],
  8: [
    { x: 18, y: 58 },
    { x: 30, y: 46 },
    { x: 42, y: 34 },
    { x: 54, y: 28 },
    { x: 66, y: 28 },
    { x: 78, y: 34 },
    { x: 88, y: 46 },
    { x: 94, y: 58 },
  ],
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createDefenseRound = (levelId: number, roundNumber: number, totalRounds: number): DefenseRound => {
  if (roundNumber === totalRounds) {
    return {
      mode: 'boss',
      ratioSword: 4,
      ratioCannon: 1,
      multiplier: 1,
      totalSlots: 5,
      enemyCount: 1,
      prompt: 'Power the Dragon Cannon in a 4 : 1 defence ratio.',
      support: 'Fill the five island slots with 4 swords and 1 cannon.',
    };
  }

  const pairPool = levelId <= 1
    ? [[1, 1], [2, 1], [1, 2], [3, 1]]
    : levelId === 2
      ? [[2, 1], [3, 2], [2, 3], [4, 1]]
      : [[2, 1], [3, 2], [2, 3], [4, 1], [3, 1]];
  const multiplierPool = levelId <= 1 ? [1, 2] : levelId === 2 ? [1, 2] : [1, 2, 2];

  let ratioSword = 2;
  let ratioCannon = 1;
  let multiplier = 1;
  let totalSlots = 3;

  for (let attempts = 0; attempts < 12; attempts += 1) {
    const [nextSword, nextCannon] = pairPool[randomInt(0, pairPool.length - 1)];
    const nextMultiplier = multiplierPool[randomInt(0, multiplierPool.length - 1)];
    const nextTotal = (nextSword + nextCannon) * nextMultiplier;

    if (nextTotal <= 8) {
      ratioSword = nextSword;
      ratioCannon = nextCannon;
      multiplier = nextMultiplier;
      totalSlots = nextTotal;
      break;
    }
  }

  return {
    mode: 'deploy',
    ratioSword,
    ratioCannon,
    multiplier,
    totalSlots,
    enemyCount: Math.min(5, 2 + roundNumber + Math.floor(totalSlots / 2)),
    prompt: `Deploy defenders in the ratio ${ratioSword} : ${ratioCannon}.`,
    support: multiplier > 1
      ? `Scale that ratio to fill all ${totalSlots} island slots.`
      : `Place the right mix of pirates before the raiders land.`,
  };
};

const formatRatio = (a: number, b: number) => `${a} : ${b}`;

const DefenderToken: React.FC<{ type: UnitType; compact?: boolean }> = ({ type, compact = false }) => {
  if (type === 'sword') {
    return (
      <div className={`relative flex items-center justify-center rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,#ef4444,#b91c1c_72%,#7f1d1d)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(127,29,29,0.35)] ${compact ? 'h-9 w-9' : 'h-14 w-14 md:h-16 md:w-16'}`}>
        <div className="absolute inset-x-[18%] top-[16%] h-[18%] rounded-full bg-white/22 blur-sm" />
        <div className={`rounded-full border border-white/16 bg-black/16 font-black text-amber-50 shadow-[0_4px_10px_rgba(0,0,0,0.2)] ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-xs md:text-sm'}`}>
          SWD
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center rounded-[1.2rem] border border-white/16 bg-[linear-gradient(180deg,#2563eb,#1d4ed8_66%,#1e3a8a)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(30,58,138,0.35)] ${compact ? 'h-9 w-9' : 'h-14 w-14 md:h-16 md:w-16'}`}>
      <div className="absolute inset-x-[18%] top-[16%] h-[18%] rounded-full bg-white/22 blur-sm" />
      <div className={`relative h-3 w-6 rounded-full bg-[linear-gradient(180deg,#dbeafe,#93c5fd)] shadow-[0_0_0_2px_rgba(30,41,59,0.28)] ${compact ? 'scale-90' : 'md:scale-110'}`}>
        <div className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-slate-800" />
        <div className="absolute right-[-4px] top-1/2 h-1.5 w-2 -translate-y-1/2 rounded-r-full bg-amber-200" />
      </div>
      <div className={`absolute bottom-[10%] rounded-full border border-white/16 bg-black/16 font-black text-amber-50 ${compact ? 'px-1 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[10px] md:text-xs'}`}>
        CAN
      </div>
    </div>
  );
};

const UnitCard: React.FC<{
  type: UnitType;
  selected: boolean;
  placed: number;
  onSelect: () => void;
}> = ({ type, selected, placed, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`relative flex min-h-[5.2rem] flex-1 items-center gap-3 overflow-hidden rounded-[1.5rem] border px-3 py-3 text-left shadow-[0_18px_30px_rgba(15,23,42,0.2)] transition-all active:scale-[0.98] md:min-h-[6rem] md:px-4 ${selected ? 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(251,191,36,0.38),rgba(147,51,234,0.24))] ring-2 ring-amber-200/40' : 'border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.8),rgba(30,41,59,0.9))]'}`}
  >
    <div className="absolute inset-x-[8%] top-[10%] h-[20%] rounded-full bg-white/12 blur-md" />
    <DefenderToken type={type} />
    <div className="relative min-w-0">
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">{type === 'sword' ? 'Sword Pirate' : 'Cannon Pirate'}</div>
      <div className="mt-1 text-lg font-black tracking-tight text-white md:text-2xl">{placed} placed</div>
      <div className="mt-1 text-xs font-bold text-white/72 md:text-sm">{type === 'sword' ? 'Front-line blocker' : 'Heavy shot support'}</div>
    </div>
  </button>
);

const ShipEnemy: React.FC<{
  index: number;
  phase: Phase;
  boss: boolean;
}> = ({ index, phase, boss }) => (
  <motion.div
    initial={false}
    animate={{
      x: phase === 'battle' ? 26 + (index * 6) : 0,
      y: phase === 'battle' ? 14 + ((index % 2) * 6) : [0, -8, 0],
      rotate: phase === 'battle' ? 3 : [-1, 1, -1],
      opacity: phase === 'breach' ? 0.45 : 1,
      scale: boss ? 1.05 : 1,
    }}
    transition={phase === 'battle'
      ? { duration: 0.9, delay: index * 0.05 }
      : { duration: 2.4 + (index * 0.12), repeat: Infinity, ease: 'easeInOut' }}
    className={`absolute ${boss ? 'h-24 w-24 md:h-28 md:w-28' : 'h-16 w-16 md:h-20 md:w-20'}`}
    style={{ left: `${10 + index * 14}%`, top: `${12 + ((index + 1) % 2) * 7}%` }}
  >
    {boss ? (
      <div className="relative h-full w-full">
        <div className="absolute inset-x-[14%] top-[16%] h-[34%] rounded-[999px] bg-[linear-gradient(180deg,#f97316,#b91c1c)] shadow-[0_10px_20px_rgba(153,27,27,0.35)]" />
        <div className="absolute left-[20%] top-[36%] h-[34%] w-[60%] rounded-[46%_54%_52%_48%/52%_54%_46%_48%] bg-[linear-gradient(180deg,#166534,#14532d)] shadow-[0_14px_22px_rgba(20,83,45,0.35)]" />
        <div className="absolute left-[14%] top-[44%] h-[18%] w-[16%] rounded-full bg-emerald-700" />
        <div className="absolute right-[14%] top-[44%] h-[18%] w-[16%] rounded-full bg-emerald-700" />
        <div className="absolute left-[30%] top-[42%] h-[8%] w-[10%] rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.45)]" />
        <div className="absolute right-[30%] top-[42%] h-[8%] w-[10%] rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.45)]" />
        <div className="absolute left-[28%] top-[60%] h-[8%] w-[44%] rounded-full bg-red-950/80" />
        <div className="absolute left-[18%] top-[26%] h-[18%] w-[10%] rotate-[-30deg] rounded-full bg-orange-300" />
        <div className="absolute right-[18%] top-[26%] h-[18%] w-[10%] rotate-[30deg] rounded-full bg-orange-300" />
      </div>
    ) : (
      <div className="relative h-full w-full">
        <div className="absolute inset-x-[18%] bottom-[20%] h-[32%] rounded-[40%_60%_52%_48%/45%_45%_55%_55%] bg-[linear-gradient(180deg,#1d4ed8,#1e3a8a)] shadow-[0_10px_16px_rgba(30,58,138,0.3)]" />
        <div className="absolute left-1/2 top-[18%] h-[42%] w-[6%] -translate-x-1/2 rounded-full bg-amber-300" />
        <div className="absolute left-[42%] top-[18%] h-[28%] w-[28%] -skew-x-[12deg] rounded-[0.4rem] bg-[linear-gradient(180deg,#f8fafc,#dbeafe)] shadow-[0_4px_10px_rgba(255,255,255,0.18)]" />
        <div className="absolute left-[30%] top-[54%] h-[10%] w-[40%] rounded-full bg-cyan-200/55 blur-sm" />
      </div>
    )}
  </motion.div>
);

const RatioRapidsGame: React.FC<RatioRapidsGameProps> = ({
  levelId,
  avatarId,
  gameTitle,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 960 + (levelId * 260);
  const timeoutsRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(450);
  const [timeLeft, setTimeLeft] = useState(54 + (levelId * 8));
  const [roundNumber, setRoundNumber] = useState(1);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>('setup');
  const [round, setRound] = useState<DefenseRound>(() => createDefenseRound(levelId, 1, totalRounds));
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('sword');
  const [placements, setPlacements] = useState<Array<UnitType | null>>(() => Array.from({ length: createDefenseRound(levelId, 1, totalRounds).totalSlots }, () => null));
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);
  const slotLayout = SLOT_LAYOUTS[round.totalSlots] || SLOT_LAYOUTS[5];
  const swordCount = placements.filter((unit) => unit === 'sword').length;
  const cannonCount = placements.filter((unit) => unit === 'cannon').length;
  const requiredSword = round.ratioSword * round.multiplier;
  const requiredCannon = round.ratioCannon * round.multiplier;
  const allSlotsFilled = placements.every(Boolean);
  const enemyDisplayCount = round.mode === 'boss' ? 1 : Math.min(round.enemyCount, 5);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    clearTimers();
    const startingRound = createDefenseRound(levelId, 1, totalRounds);
    setScore(0);
    setCoins(450);
    setTimeLeft(54 + (levelId * 8));
    setRoundNumber(1);
    setHearts(MAX_HEARTS);
    setStreak(0);
    setPhase('setup');
    setRound(startingRound);
    setSelectedUnit('sword');
    setPlacements(Array.from({ length: startingRound.totalSlots }, () => null));
    setFeedback(null);
    setIsFinished(false);
  }, [levelId, totalRounds]);

  useEffect(() => {
    if (isFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isFinished, onGameOver, score]);

  const resetForRound = (nextRoundNumber: number) => {
    const nextRound = createDefenseRound(levelId, nextRoundNumber, totalRounds);
    setRoundNumber(nextRoundNumber);
    setRound(nextRound);
    setPhase('setup');
    setPlacements(Array.from({ length: nextRound.totalSlots }, () => null));
    setSelectedUnit('sword');
    setFeedback(null);
  };

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    setPhase('victory');
    const stars = finalScore >= targetScore * 1.45 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;

    confetti({
      particleCount: 180,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#fde68a', '#ffffff', '#86efac'],
    });
    onVictory(stars, finalScore);
  };

  const handleFailure = (title: string, subtitle: string) => {
    if (feedback || isFinished) return;

    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setPhase('breach');
    setFeedback({ type: 'error', title, subtitle });

    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(score);
      }, 950);
      timeoutsRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPlacements(Array.from({ length: round.totalSlots }, () => null));
      setPhase('setup');
      setFeedback(null);
    }, 1100);
    timeoutsRef.current.push(timeoutId);
  };

  const handleStartBattle = () => {
    if (!allSlotsFilled || feedback || isFinished) return;

    if (swordCount !== requiredSword || cannonCount !== requiredCannon) {
      handleFailure(
        round.mode === 'boss' ? 'Dragon Shield Holds' : 'Raiders Break Through',
        round.mode === 'boss'
          ? `You needed ${requiredSword} swords and ${requiredCannon} cannon.`
          : `That wave needed ${requiredSword} swords and ${requiredCannon} cannon.`
      );
      return;
    }

    const points = 170 + (round.totalSlots * 24) + (streak * 30) + (round.mode === 'boss' ? 160 : 0);
    const coinReward = 30 + (round.totalSlots * 8) + (round.mode === 'boss' ? 90 : 0);
    const updatedScore = score + points;

    setScore(updatedScore);
    setCoins((previous) => previous + coinReward);
    setStreak((previous) => previous + 1);
    setPhase('battle');
    setFeedback({
      type: 'success',
      title: round.mode === 'boss' ? 'Dragon Cannon Online!' : 'Defence Activated!',
      subtitle: `+${points} score  +${coinReward} coins`,
    });

    const confettiId = window.setTimeout(() => {
      confetti({
        particleCount: round.mode === 'boss' ? 90 : 45,
        spread: 56,
        origin: { y: 0.64 },
        colors: ['#fcd34d', '#60a5fa', '#ffffff'],
      });
    }, 320);
    timeoutsRef.current.push(confettiId);

    const nextId = window.setTimeout(() => {
      if (roundNumber >= totalRounds) {
        finishVictory(updatedScore);
        return;
      }
      resetForRound(roundNumber + 1);
    }, 1450);
    timeoutsRef.current.push(nextId);
  };

  const handleSlotClick = (index: number) => {
    if (phase !== 'setup' || feedback || isFinished) return;

    setPlacements((previous) => {
      const next = [...previous];
      next[index] = next[index] === selectedUnit ? null : selectedUnit;
      return next;
    });
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="ratio_rapids" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title={gameTitle || 'Ratio Raiders'}
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-amber-950"
            accentSoftBg="bg-amber-100/84"
            accentBorder="border-amber-200/88"
            progressBar="bg-gradient-to-r from-cyan-300 via-blue-400 to-emerald-300"
            statLabel="Wave"
            statValue={`${roundNumber}/${totalRounds}`}
          />
        </div>

        <PuzzleStage className="w-full max-w-6xl rounded-[2.3rem] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.14)_100%)]" />
          <div className="absolute inset-x-[6%] top-[12%] h-[34%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(186,230,253,0.22),rgba(56,189,248,0.06),transparent_72%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.16),rgba(15,23,42,0.58))]" />

          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/32 px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:left-5 md:top-5 md:gap-2 md:px-4 md:py-2">
            {Array.from({ length: MAX_HEARTS }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/32 px-3 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:right-5 md:top-5 md:gap-2 md:px-4 md:py-2">
            <AssetIcon name="coin" className="h-5 w-5 md:h-6 md:w-6" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70 md:text-xs">Coins</div>
              <div className="text-lg font-black text-white md:text-2xl">{coins}</div>
            </div>
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
            <div className="licensed-slice-paper-panel max-w-[94%] px-5 py-3 text-center shadow-[0_16px_30px_rgba(15,23,42,0.16)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-900 md:text-[1.85rem]">{round.prompt}</div>
                <div className="mt-1 text-xs font-bold text-amber-950/76 md:text-base">{round.support}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:mt-4 md:gap-3">
              <div className="licensed-slice-cyan-pill flex min-h-[2.35rem] items-center justify-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] md:min-h-[2.8rem] md:text-base">
                Defence ratio {formatRatio(round.ratioSword, round.ratioCannon)}
              </div>
              <div className="licensed-slice-green-pill flex min-h-[2.35rem] items-center justify-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] md:min-h-[2.8rem] md:text-base">
                Total defenders {round.totalSlots}
              </div>
            </div>

            <div className="relative mt-3 flex min-h-0 flex-1 flex-col justify-between md:mt-4">
              <div className="relative flex min-h-[19rem] flex-1 items-center justify-center overflow-hidden md:min-h-[25rem]">
                <div className="absolute inset-x-[10%] top-[4%] h-[32%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),rgba(59,130,246,0.06),transparent_72%)]" />

                {Array.from({ length: enemyDisplayCount }).map((_, index) => (
                  <ShipEnemy
                    key={`${roundNumber}-${index}`}
                    index={index}
                    phase={phase}
                    boss={round.mode === 'boss'}
                  />
                ))}

                <div className="absolute inset-x-[9%] bottom-[10%] top-[26%]">
                  <div className="absolute inset-x-[12%] bottom-[0%] h-[44%] rounded-[50%] bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.32),rgba(34,197,94,0.14),transparent_72%)]" />
                  <div className="absolute inset-x-[14%] bottom-[10%] h-[50%] rounded-[52%_48%_38%_42%/38%_36%_64%_62%] border border-emerald-200/16 bg-[linear-gradient(180deg,#86efac,#34d399_42%,#15803d_100%)] shadow-[0_30px_50px_rgba(21,128,61,0.28)]" />
                  <div className="absolute left-[48%] bottom-[28%] h-[18%] w-[16%] rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,#fcd34d,#f59e0b_62%,#b45309)] shadow-[0_18px_26px_rgba(180,83,9,0.24)]" />
                  <div className="absolute left-[52%] bottom-[40%] h-[18%] w-[3%] rounded-full bg-[linear-gradient(180deg,#38bdf8,#1d4ed8)]" />
                  <div className="absolute left-[47.5%] bottom-[54%] h-[6%] w-[12%] rounded-[999px] bg-[linear-gradient(180deg,#111827,#374151)] shadow-[0_10px_14px_rgba(15,23,42,0.24)]" />
                  <div className="absolute left-[28%] bottom-[48%] h-[10%] w-[4%] rounded-full bg-emerald-900/40" />
                  <div className="absolute right-[28%] bottom-[52%] h-[12%] w-[4%] rounded-full bg-emerald-900/40" />

                  {slotLayout.map((slot, index) => {
                    const unit = placements[index];
                    return (
                      <button
                        key={`slot-${index}`}
                        type="button"
                        onClick={() => handleSlotClick(index)}
                        className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.2rem] border border-white/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0.68))] shadow-[0_16px_24px_rgba(15,23,42,0.25)] transition-transform active:scale-[0.98] md:h-16 md:w-16"
                        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                      >
                        <div className="absolute inset-[6%] rounded-[1rem] border border-white/12 bg-black/10" />
                        {unit ? (
                          <DefenderToken type={unit} compact />
                        ) : (
                          <div className="relative text-[10px] font-black uppercase tracking-[0.16em] text-white/52 md:text-xs">Slot</div>
                        )}
                      </button>
                    );
                  })}

                  {phase === 'battle' && (
                    <>
                      {placements.map((unit, index) => {
                        if (!unit) return null;
                        const slot = slotLayout[index];
                        return (
                          <motion.div
                            key={`shot-${index}-${unit}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: [0, 1, 0], scale: [0.9, 1.1, 0.9], x: [0, unit === 'cannon' ? -30 : -14], y: [0, -90] }}
                            transition={{ duration: 0.8, delay: index * 0.06 }}
                            className={`absolute h-3 rounded-full ${unit === 'cannon' ? 'w-10 bg-[linear-gradient(90deg,#fcd34d,#f97316)]' : 'w-6 bg-[linear-gradient(90deg,#f8fafc,#93c5fd)]'}`}
                            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                          />
                        );
                      })}
                      {Array.from({ length: Math.max(2, enemyDisplayCount) }).map((_, index) => (
                        <motion.div
                          key={`impact-${index}`}
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.15, 0.72] }}
                          transition={{ duration: 0.7, delay: 0.16 + index * 0.08 }}
                          className="absolute h-12 w-12 rounded-full bg-[radial-gradient(circle_at_center,#fef3c7,#f59e0b_35%,rgba(249,115,22,0.08)_70%)] blur-[1px]"
                          style={{ left: `${16 + index * 13}%`, top: `${24 + (index % 2) * 8}%` }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 rounded-[1.8rem] border border-amber-100/18 bg-[linear-gradient(180deg,rgba(129,74,28,0.96),rgba(84,48,18,0.98))] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_16px_28px_rgba(0,0,0,0.2)] md:p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(15rem,0.85fr)_auto] md:items-center">
                  <div className="grid grid-cols-2 gap-3">
                    <UnitCard type="sword" selected={selectedUnit === 'sword'} placed={swordCount} onSelect={() => setSelectedUnit('sword')} />
                    <UnitCard type="cannon" selected={selectedUnit === 'cannon'} placed={cannonCount} onSelect={() => setSelectedUnit('cannon')} />
                  </div>

                  <div className="rounded-[1.5rem] border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.9))] px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-50/58">Current defence</div>
                    <div className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">{swordCount} swords / {cannonCount} cannon</div>
                    <div className="mt-1 text-xs font-bold text-amber-950/72 md:text-sm">
                      <span className="text-amber-50/72">{allSlotsFilled ? 'Ready to test the wave.' : `${round.totalSlots - swordCount - cannonCount} slots still empty.`}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartBattle}
                    disabled={!allSlotsFilled || feedback !== null || isFinished}
                    className="ui-button-primary licensed-submit-button flex min-w-[11rem] items-center justify-center px-5 py-4 text-base font-black uppercase tracking-[0.14em] text-white disabled:opacity-45 md:min-w-[13rem] md:text-xl"
                  >
                    {round.mode === 'boss' ? 'Fire Dragon Cannon' : 'Start Battle'}
                  </button>
                </div>
              </div>
            </div>
          </div>

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
        </PuzzleStage>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default RatioRapidsGame;
