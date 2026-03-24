import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Droplets, MinusCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import { Coins } from '../components/GameIcons';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import MiniGameTopBar from '../components/MiniGameTopBar';
import GameActionDock from '../components/GameActionDock';
import panelCardAsset from '../assets/licensed/slices/panel_paper.png';
import labelBlueLong from '../assets/licensed/slices/label_blue.png';
import labelGreenLong from '../assets/licensed/slices/label_green_long.png';
import woodPlankLong from '../assets/licensed/slices/wood_plank_long_3.png';

interface MeasurementForgeGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface ConversionRound {
  targetGrams: number;
  options: number[];
}

type FeedbackState = 'correct' | 'incorrect' | null;

const TOTAL_ROUNDS = 7;

const toKgLabel = (grams: number) => {
  const kg = grams / 1000;
  if (Number.isInteger(kg)) return `${kg} kg`;
  return `${kg.toFixed(2).replace(/\.00$/, '')} kg`;
};

const toGramLabel = (grams: number) => `${grams.toLocaleString()} g`;

const getRoundConfig = (roundIndex: number, levelId: number) => {
  const stage = Math.min(4, Math.floor((roundIndex + Math.max(0, levelId - 1)) / 2));

  if (stage === 0) {
    return {
      min: 500,
      max: 1500,
      step: 100,
      options: [100, 200, 300, 400, 500],
    };
  }

  if (stage === 1) {
    return {
      min: 1000,
      max: 2500,
      step: 100,
      options: [100, 250, 400, 500, 750],
    };
  }

  if (stage === 2) {
    return {
      min: 1500,
      max: 4000,
      step: 250,
      options: [250, 500, 750, 1000, 1250],
    };
  }

  if (stage === 3) {
    return {
      min: 2500,
      max: 6000,
      step: 250,
      options: [250, 500, 1000, 1250, 1500],
    };
  }

  return {
    min: 4000,
    max: 9000,
    step: 500,
    options: [500, 1000, 1500, 2000, 2500],
  };
};

const randomTarget = (min: number, max: number, step: number) => {
  const count = Math.floor((max - min) / step) + 1;
  const index = Math.floor(Math.random() * count);
  return min + index * step;
};

const generateRound = (roundIndex: number, levelId: number): ConversionRound => {
  const config = getRoundConfig(roundIndex, levelId);
  return {
    targetGrams: randomTarget(config.min, config.max, config.step),
    options: config.options,
  };
};

const MeasurementForgeGame: React.FC<MeasurementForgeGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(95 + levelId * 5);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<ConversionRound>(() => generateRound(0, levelId));
  const [selectedGrams, setSelectedGrams] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const targetScore = 1150 + levelId * 120;
  const currentGrams = selectedGrams.reduce((sum, value) => sum + value, 0);
  const gramsDelta = round.targetGrams - currentGrams;
  const fillRatio = Math.max(0, Math.min(1, currentGrams / round.targetGrams));
  const overflowRatio = currentGrams > round.targetGrams
    ? Math.min(1, (currentGrams - round.targetGrams) / round.targetGrams)
    : 0;

  useEffect(() => {
    setScore(0);
    setTimeLeft(95 + levelId * 5);
    setRoundIndex(0);
    setRound(generateRound(0, levelId));
    setSelectedGrams([]);
    setFeedback(null);
    setStreak(0);
    setIsGameOver(false);
    setIsVictory(false);
  }, [levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          if (score >= targetScore) {
            const stars = score >= targetScore * 1.7 ? 3 : score >= targetScore * 1.25 ? 2 : 1;
            setIsVictory(true);
            onVictory(stars, score);
            return 0;
          }

          setIsGameOver(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore]);

  const addAmount = (grams: number) => {
    if (feedback) return;
    setSelectedGrams((previous) => [...previous, grams]);
  };

  const removeLast = () => {
    if (feedback) return;
    setSelectedGrams((previous) => previous.slice(0, -1));
  };

  const clearBucket = () => {
    if (feedback) return;
    setSelectedGrams([]);
  };

  const nextRound = (nextRoundIndex: number, nextScore: number) => {
    if (nextRoundIndex >= TOTAL_ROUNDS || nextScore >= targetScore) {
      const stars = nextScore >= targetScore * 1.7 ? 3 : nextScore >= targetScore * 1.25 ? 2 : 1;
      setIsVictory(true);
      onVictory(stars, nextScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(generateRound(nextRoundIndex, levelId));
    setSelectedGrams([]);
    setFeedback(null);
  };

  const checkFill = () => {
    if (feedback) return;

    if (currentGrams === round.targetGrams) {
      const nextScore = score + 170 + streak * 35 + Math.max(0, Math.floor(timeLeft * 0.75));
      const nextRoundIndex = roundIndex + 1;
      setScore(nextScore);
      setFeedback('correct');
      setStreak((previous) => previous + 1);

      confetti({
        particleCount: 85,
        spread: 62,
        origin: { y: 0.56 },
        colors: ['#fde047', '#22c55e', '#38bdf8'],
      });

      window.setTimeout(() => nextRound(nextRoundIndex, nextScore), 1000);
      return;
    }

    setFeedback('incorrect');
    setStreak(0);
    setScore((previous) => Math.max(0, previous - 55));

    window.setTimeout(() => {
      setSelectedGrams([]);
      setFeedback(null);
    }, 850);
  };

  const groupedAdded = useMemo(() => {
    const groups = new Map<number, number>();
    selectedGrams.forEach((value) => groups.set(value, (groups.get(value) ?? 0) + 1));
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [selectedGrams]);

  const outcomeLabel = useMemo(() => {
    if (!feedback) return null;
    return feedback === 'correct'
      ? {
          title: 'Perfect Fill!',
          subtitle: 'Exact conversion. Bucket calibrated.',
          tone: 'text-emerald-300 border-emerald-300/60 bg-emerald-500/16',
        }
      : {
          title: 'Wrong Fill!',
          subtitle: 'That amount does not match the kg target.',
          tone: 'text-rose-300 border-rose-300/60 bg-rose-500/16',
        };
  }, [feedback]);

  return (
    <GameScreenShell className="items-center p-2 font-sans pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)] md:p-4">
      <GameplaySceneBackdrop gameType="measurement_forge" />

      <MiniGameTopBar
        onBack={onBack}
        score={score}
        metaLabel="Round"
        metaValue={`${Math.min(roundIndex + 1, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS}`}
        className="z-50"
      />

      <div className="pointer-events-none absolute right-3 top-[calc(env(safe-area-inset-top)+3.7rem)] z-40 md:right-5">
        <div className="pvp-hud-chip pvp-hud-chip-alt">
          Time {timeLeft}s
        </div>
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 md:gap-4">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem] border border-sky-100/20 bg-[linear-gradient(180deg,rgba(10,26,48,0.82),rgba(8,18,36,0.9)_42%,rgba(6,14,28,0.92))] shadow-[0_20px_36px_rgba(0,0,0,0.34)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.16),transparent_18%),radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_16%),radial-gradient(circle_at_84%_20%,rgba(250,204,21,0.18),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(5,10,22,0.18)_34%,rgba(5,10,22,0.34)_100%)]" />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative inline-flex h-[2.35rem] items-center justify-center px-6 md:h-[2.55rem] md:px-7">
                <img src={labelBlueLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                <div className="relative z-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white md:text-xs">
                  <AssetIcon name="star" className="h-4 w-4" />
                  Conversion Canyon
                </div>
              </div>

              <div className="relative w-full max-w-[20rem] px-4 py-3 md:max-w-[24rem] md:px-5 md:py-4">
                <img src={panelCardAsset} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_16px_34px_rgba(15,23,42,0.28)]" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-100/82 md:text-xs">Target Fill</div>
                  <div className="relative mt-1 inline-flex h-[3rem] min-w-[11rem] items-center justify-center px-5 md:h-[3.6rem] md:min-w-[13rem]">
                    <img src={labelGreenLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                    <div className="relative z-10 text-[1.2rem] font-black text-white md:text-[1.8rem]">
                      {toKgLabel(round.targetGrams)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[16rem] overflow-hidden rounded-[1.95rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_18%,rgba(8,15,30,0.2)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_34px_rgba(0,0,0,0.22)] md:min-h-[22rem] md:flex-1 md:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(56,189,248,0.18),transparent_18%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.12),transparent_20%)]" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 md:gap-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="licensed-slice-cyan-pill rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs">
                    Current {toKgLabel(currentGrams)}
                  </div>
                  <div className={`${gramsDelta === 0 ? 'licensed-slice-green-pill' : 'licensed-slice-orange-pill'} rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs`}>
                    {gramsDelta === 0 ? 'Exact amount' : `${toGramLabel(Math.abs(gramsDelta))} ${gramsDelta > 0 ? 'remaining' : 'over target'}`}
                  </div>
                </div>

                <div className="relative flex h-[13rem] w-[10rem] items-end justify-center md:h-[15rem] md:w-[11rem]">
                  <div className="absolute inset-x-1 bottom-0 h-[78%] rounded-b-[1.6rem] rounded-t-[1.2rem] border-4 border-sky-200/55 bg-[linear-gradient(180deg,rgba(15,23,42,0.55),rgba(2,132,199,0.24))] shadow-[0_18px_24px_rgba(0,0,0,0.25)]" />
                  <motion.div
                    animate={{ height: `${Math.max(4, fillRatio * 72)}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                    className={`absolute inset-x-[10%] bottom-[6%] rounded-b-[1.25rem] ${overflowRatio > 0 ? 'bg-[linear-gradient(180deg,rgba(244,63,94,0.8),rgba(225,29,72,0.9))]' : 'bg-[linear-gradient(180deg,rgba(56,189,248,0.7),rgba(14,116,144,0.95))]'}`}
                  />
                  <div className="absolute inset-x-[16%] top-[18%] bottom-[12%] rounded-[1rem] border border-white/16" />
                  <div className="absolute -top-2 flex items-center gap-1 rounded-full border border-sky-200/55 bg-sky-900/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-sky-100">
                    <Droplets className="h-3.5 w-3.5" /> Bucket
                  </div>
                </div>

                <div className="flex min-h-[2.2rem] flex-wrap items-center justify-center gap-1.5 px-2">
                  {groupedAdded.length === 0 ? (
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">No grams added yet</div>
                  ) : (
                    groupedAdded.map(([grams, count]) => (
                      <button
                        key={`${grams}-${count}`}
                        onClick={removeLast}
                        disabled={!!feedback}
                        className="rounded-full border border-yellow-100/40 bg-[linear-gradient(180deg,rgba(250,204,21,0.22),rgba(245,158,11,0.2))] px-2.5 py-1 text-[10px] font-black text-yellow-50 shadow-[0_6px_12px_rgba(0,0,0,0.2)] disabled:opacity-55"
                      >
                        {toGramLabel(grams)} x{count}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="relative shrink-0 px-3 py-3 md:px-4 md:py-3.5">
              <img src={woodPlankLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_16px_28px_rgba(0,0,0,0.2)]" />
              <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
                <div className="licensed-slice-yellow-plank rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-950 md:text-[10px]">
                  Gram picks
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={clearBucket}
                  disabled={selectedGrams.length === 0 || !!feedback}
                  className="relative inline-flex h-[2rem] min-w-[4.7rem] items-center justify-center gap-1 rounded-full border border-sky-200/50 bg-[linear-gradient(180deg,#38bdf8,#2563eb)] px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_16px_rgba(2,6,23,0.34)] transition-colors hover:bg-[linear-gradient(180deg,#22d3ee,#1d4ed8)] disabled:cursor-not-allowed disabled:opacity-35 md:h-[2.2rem] md:min-w-[5.2rem] md:text-[10px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </motion.button>
              </div>

              <div className="relative z-10 grid grid-cols-5 gap-2 md:gap-3">
                {round.options.map((grams) => (
                  <motion.button
                    key={`${roundIndex}-${grams}`}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => addAmount(grams)}
                    disabled={!!feedback}
                    className="min-h-[4.15rem] rounded-[1rem] border border-sky-200/35 bg-[linear-gradient(180deg,#1e3a8a,#0f172a)] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_8px_16px_rgba(0,0,0,0.2)] transition-colors hover:bg-[linear-gradient(180deg,#2563eb,#1e293b)] disabled:opacity-45"
                  >
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-200/90">Add</div>
                    <div className="mt-1 text-sm font-black text-white md:text-base">{grams.toLocaleString()}</div>
                    <div className="text-[9px] font-black uppercase text-sky-100/80">g</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-2 px-2 pb-1 md:pb-2">
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={removeLast}
                disabled={selectedGrams.length === 0 || !!feedback}
                className="relative flex h-[4rem] w-[8.4rem] items-center justify-center gap-2 rounded-[1.15rem] border border-slate-200/35 bg-[linear-gradient(180deg,#334155,#0f172a)] px-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[0_12px_20px_rgba(0,0,0,0.32)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <MinusCircle className="h-4 w-4" /> Undo
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={checkFill}
                disabled={selectedGrams.length === 0 || !!feedback}
                className="relative flex h-[4rem] w-full max-w-[18rem] items-center justify-center gap-3 rounded-[1.2rem] border border-yellow-200/60 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-5 text-lg font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_14px_24px_rgba(0,0,0,0.32)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShieldCheck className="h-5 w-5" />
                Check Fill
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {outcomeLabel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/18 backdrop-blur-[2px]"
              >
                <div className={`rounded-[2rem] border px-8 py-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.34)] ${outcomeLabel.tone}`}>
                  <div className="text-4xl font-black">{outcomeLabel.title}</div>
                  <div className="mt-2 text-sm font-bold text-white/82">{outcomeLabel.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <GameActionDock onBack={onBack} compact />
        </div>

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md"
            >
              <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-[2rem] border border-sky-200/30 bg-[linear-gradient(180deg,rgba(8,25,51,0.96),rgba(10,18,36,0.98))] p-8 text-center shadow-[0_24px_44px_rgba(0,0,0,0.44)] md:p-10">
                <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isVictory ? 'Buckets Filled!' : 'Time Up!'}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/54">Final Score</div>
                  <div className="mt-2 text-5xl font-black text-white">{score}</div>
                </div>
                <button
                  onClick={onBack}
                  className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] border border-yellow-200/60 bg-[linear-gradient(180deg,#facc15,#f59e0b)] py-4 text-lg font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_12px_22px_rgba(0,0,0,0.34)] transition-all hover:brightness-105"
                >
                  <Coins className="h-5 w-5" />
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameScreenShell>
  );
};

export default MeasurementForgeGame;
