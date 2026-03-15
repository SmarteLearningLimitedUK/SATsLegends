import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { AVATARS } from '../constants';
import { CheckCircle2, Coins, RotateCcw, Sparkles } from './GameIcons';

interface MeasurementForgeGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface ScaleItem {
  id: string;
  name: string;
  displayWeight: string;
  value: number;
  unit: 'g' | 'ml';
  tint: string;
  glow: string;
}

interface ScaleRound {
  category: 'mass' | 'volume';
  targetValue: number;
  targetDisplay: string;
  targetLabel: string;
  items: ScaleItem[];
}

const MASS_ITEMS: ScaleItem[] = [
  { id: 'ore-rock', name: 'Ore Rock', displayWeight: '250 g', value: 250, unit: 'g', tint: 'from-stone-300 via-stone-400 to-stone-700', glow: 'shadow-orange-500/25' },
  { id: 'gem-crate', name: 'Gem Crate', displayWeight: '500 g', value: 500, unit: 'g', tint: 'from-cyan-300 via-sky-400 to-blue-700', glow: 'shadow-cyan-500/25' },
  { id: 'gold-bar', name: 'Gold Bar', displayWeight: '1 kg', value: 1000, unit: 'g', tint: 'from-yellow-200 via-amber-300 to-orange-600', glow: 'shadow-amber-500/25' },
  { id: 'supply-cart', name: 'Supply Cart', displayWeight: '2 kg', value: 2000, unit: 'g', tint: 'from-orange-200 via-orange-400 to-amber-700', glow: 'shadow-orange-600/25' },
];

const VOLUME_ITEMS: ScaleItem[] = [
  { id: 'flask', name: 'Flask', displayWeight: '250 ml', value: 250, unit: 'ml', tint: 'from-cyan-200 via-sky-300 to-cyan-700', glow: 'shadow-sky-500/25' },
  { id: 'potion-jar', name: 'Potion Jar', displayWeight: '500 ml', value: 500, unit: 'ml', tint: 'from-fuchsia-200 via-violet-400 to-purple-700', glow: 'shadow-fuchsia-500/25' },
  { id: 'water-keg', name: 'Water Keg', displayWeight: '1 l', value: 1000, unit: 'ml', tint: 'from-emerald-200 via-teal-400 to-emerald-700', glow: 'shadow-emerald-500/25' },
  { id: 'brew-barrel', name: 'Brew Barrel', displayWeight: '2 l', value: 2000, unit: 'ml', tint: 'from-lime-200 via-green-400 to-emerald-700', glow: 'shadow-green-500/25' },
];

const buildTargetDisplay = (totalValue: number, unit: 'g' | 'ml') => {
  if (unit === 'g') {
    if (totalValue >= 1000) {
      return `${Number((totalValue / 1000).toFixed(totalValue % 1000 === 0 ? 0 : 2))} kg`;
    }
    return `${totalValue} g`;
  }

  if (totalValue >= 1000) {
    return `${Number((totalValue / 1000).toFixed(totalValue % 1000 === 0 ? 0 : 2))} l`;
  }
  return `${totalValue} ml`;
};

const pickItemsForRound = (pool: ScaleItem[], count: number) => {
  const chosen: ScaleItem[] = [];
  for (let index = 0; index < count; index += 1) {
    chosen.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return chosen;
};

const generateRound = (roundIndex: number): ScaleRound => {
  const category = Math.random() > 0.45 ? 'mass' : 'volume';
  const pool = category === 'mass' ? MASS_ITEMS : VOLUME_ITEMS;
  const itemCount = Math.min(4, 2 + Math.floor(roundIndex / 2));
  const chosenItems = pickItemsForRound(pool, itemCount);
  const targetValue = chosenItems.reduce((sum, item) => sum + item.value, 0);
  const unit = pool[0].unit;

  return {
    category,
    targetValue,
    targetDisplay: buildTargetDisplay(targetValue, unit),
    targetLabel: category === 'mass' ? 'Balance The Weight' : 'Match The Volume',
    items: [...pool].sort(() => Math.random() - 0.5),
  };
};

const formatCurrent = (value: number, unit: 'g' | 'ml') => buildTargetDisplay(value, unit);

const MeasurementForgeGame: React.FC<MeasurementForgeGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(105);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<ScaleRound>(() => generateRound(0));
  const [selectedItems, setSelectedItems] = useState<ScaleItem[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 1050 + levelId * 90;
  const currentValue = selectedItems.reduce((sum, item) => sum + item.value, 0);
  const scaleUnit = round.items[0]?.unit || 'g';
  const progress = Math.min((score / targetScore) * 100, 100);
  const balanceDifference = currentValue - round.targetValue;
  const balanceTilt = Math.max(-16, Math.min(16, balanceDifference / 90));

  useEffect(() => {
    setScore(0);
    setTimeLeft(105 + levelId * 6);
    setRoundIndex(0);
    setRound(generateRound(0));
    setSelectedItems([]);
    setFeedback(null);
    setStreak(0);
    setIsGameOver(false);
    setIsVictory(false);
  }, [levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
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

    return () => clearInterval(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore]);

  const addItem = (item: ScaleItem) => {
    if (feedback) return;
    setSelectedItems((previous) => [...previous, item]);
  };

  const removeItem = (index: number) => {
    if (feedback) return;
    setSelectedItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const clearScale = () => {
    if (feedback) return;
    setSelectedItems([]);
  };

  const loadNextRound = (nextRoundIndex: number, nextScore: number) => {
    if (nextRoundIndex >= 7 || nextScore >= targetScore) {
      const stars = nextScore >= targetScore * 1.7 ? 3 : nextScore >= targetScore * 1.25 ? 2 : 1;
      setIsVictory(true);
      onVictory(stars, nextScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(generateRound(nextRoundIndex));
    setSelectedItems([]);
    setFeedback(null);
  };

  const handleBalance = () => {
    if (feedback) return;

    if (currentValue === round.targetValue) {
      const nextScore = score + 140 + streak * 25 + Math.max(0, timeLeft);
      const nextRoundIndex = roundIndex + 1;

      setFeedback('correct');
      setScore(nextScore);
      setStreak((previous) => previous + 1);

      confetti({
        particleCount: 70,
        spread: 58,
        origin: { y: 0.58 },
        colors: ['#fde047', '#22c55e', '#38bdf8'],
      });

      window.setTimeout(() => loadNextRound(nextRoundIndex, nextScore), 1200);
      return;
    }

    setFeedback('incorrect');
    setStreak(0);
    setScore((previous) => Math.max(0, previous - 45));
    window.setTimeout(() => {
      setSelectedItems([]);
      setFeedback(null);
    }, 900);
  };

  const outcomeLabel = useMemo(() => {
    if (!feedback) return null;
    return feedback === 'correct'
      ? {
          title: 'Balanced!',
          subtitle: 'The mine scale is perfectly level.',
          tone: 'text-emerald-300 border-emerald-300/60 bg-emerald-500/16',
        }
      : {
          title: 'Off Balance!',
          subtitle: 'Reset the load and try a better combination.',
          tone: 'text-rose-300 border-rose-300/60 bg-rose-500/16',
        };
  }, [feedback]);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-[linear-gradient(180deg,#291308_0%,#3d1906_30%,#140d0c_100%)] p-2 font-sans pt-[env(safe-area-inset-top)] md:p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(250,204,21,0.22),transparent_32%),radial-gradient(circle_at_18%_78%,rgba(34,197,94,0.12),transparent_26%),radial-gradient(circle_at_85%_28%,rgba(56,189,248,0.14),transparent_24%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,transparent,rgba(17,8,7,0.9))]" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Scale Master"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-amber-900"
          accentSoftBg="bg-amber-100/80"
          accentBorder="border-amber-200/80"
          progressBar="bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-400"
          statLabel="Streak"
          statValue={streak}
          compact
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border-4 border-amber-200/15 bg-[linear-gradient(180deg,rgba(55,28,12,0.94),rgba(22,12,9,0.98))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_25px_60px_rgba(0,0,0,0.35)] md:p-5">
          <div className="mb-3 flex flex-col gap-2 rounded-[1.5rem] border border-amber-200/12 bg-black/20 p-3 md:flex-row md:items-center md:justify-between md:gap-4 md:p-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/70">Round {roundIndex + 1} / 7</div>
              <div className="mt-1 text-2xl font-black text-white md:text-3xl">{round.targetLabel}</div>
            </div>
            <div className="flex items-center gap-2 rounded-[1.25rem] border border-amber-200/18 bg-amber-300/10 px-4 py-3">
              <Sparkles className="h-5 w-5 text-yellow-300" />
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/72">Target</div>
                <div className="text-xl font-black text-amber-200 md:text-2xl">{round.targetDisplay}</div>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
            <div className="relative flex min-h-[20rem] flex-[1.3] flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.42),rgba(25,10,7,0.72))] p-4">
              <div className="absolute left-1/2 top-[21%] h-24 w-24 -translate-x-1/2 rounded-full bg-yellow-300/18 blur-2xl" />
              <div className="absolute inset-x-[12%] top-[64%] h-10 rounded-full bg-black/35 blur-xl" />

              <div className="text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/68">Mining Camp Scale</div>
                <div className="mt-2 text-sm font-bold text-white/72 md:text-base">
                  Match the target by loading the correct cargo onto the left pan.
                </div>
              </div>

              <div className="relative mx-auto mt-4 flex w-full max-w-3xl flex-1 items-end justify-center">
                <div className="absolute bottom-[8.2rem] left-1/2 h-28 w-6 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#eab308,#92400e)] shadow-[0_0_0_5px_rgba(120,53,15,0.32)]" />
                <motion.div
                  animate={{ rotate: balanceTilt }}
                  transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                  className="absolute bottom-[10.25rem] left-1/2 h-4 w-[72%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#fbbf24,#78350f)] shadow-[0_12px_22px_rgba(0,0,0,0.32)]"
                >
                  <div className="absolute left-[10%] top-3 h-[5.8rem] w-[32%] origin-top rounded-[1.6rem] border-4 border-amber-200/16 bg-[linear-gradient(180deg,#3b1d0b,#1b120f)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex h-full flex-wrap content-start gap-2 overflow-hidden rounded-[1rem] border border-white/8 bg-black/24 p-2">
                      {selectedItems.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center text-center text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/36">
                          Load cargo
                        </div>
                      )}
                      {selectedItems.map((item, index) => (
                        <button
                          key={`${item.id}-${index}`}
                          onClick={() => removeItem(index)}
                          className={`flex min-w-[4.25rem] flex-1 items-center justify-center rounded-full border border-white/12 bg-gradient-to-br ${item.tint} px-3 py-2 text-[10px] font-black text-slate-950 shadow-[0_12px_22px_rgba(0,0,0,0.24)]`}
                        >
                          {item.displayWeight}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="absolute right-[10%] top-3 h-[5.8rem] w-[32%] origin-top rounded-[1.6rem] border-4 border-amber-200/16 bg-[linear-gradient(180deg,#3b1d0b,#1b120f)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="flex h-full items-center justify-center rounded-[1rem] border border-white/8 bg-black/24 p-2 text-center">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/60">Target Load</div>
                        <div className="mt-1 text-2xl font-black text-white">{round.targetDisplay}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="absolute bottom-[2.2rem] left-1/2 h-28 w-44 -translate-x-1/2 rounded-[2rem] border-4 border-amber-200/14 bg-[linear-gradient(180deg,#4a2815,#22120d)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_26px_48px_rgba(0,0,0,0.34)]" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-black/24 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/60">Current Load</div>
                  <div className="mt-1 text-xl font-black text-white md:text-2xl">{formatCurrent(currentValue, scaleUnit)}</div>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-black/24 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/60">Difference</div>
                  <div className={`mt-1 text-xl font-black md:text-2xl ${balanceDifference === 0 ? 'text-emerald-300' : balanceDifference > 0 ? 'text-rose-300' : 'text-sky-300'}`}>
                    {balanceDifference === 0 ? 'Perfect' : formatCurrent(Math.abs(balanceDifference), scaleUnit)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                {round.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={!!feedback}
                    className={`group flex min-h-[7rem] flex-col items-start justify-between overflow-hidden rounded-[1.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-3 text-left shadow-[0_18px_32px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-1 hover:border-amber-200/26 active:scale-[0.98] ${item.glow}`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br ${item.tint} text-lg font-black text-slate-950 shadow-[0_12px_20px_rgba(0,0,0,0.18)]`}>
                      {item.displayWeight.split(' ')[0]}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white md:text-base">{item.name}</div>
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-amber-100/64">{item.displayWeight}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-auto rounded-[1.75rem] border border-white/10 bg-black/24 p-3 md:p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/60">Selected Cargo</div>
                    <div className="text-lg font-black text-white">{selectedItems.length} piece{selectedItems.length === 1 ? '' : 's'}</div>
                  </div>
                  <button
                    onClick={clearScale}
                    disabled={selectedItems.length === 0 || !!feedback}
                    className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>

                <button
                  onClick={handleBalance}
                  disabled={selectedItems.length === 0 || !!feedback}
                  className="licensed-submit-button flex w-full items-center justify-center gap-2 rounded-[1.3rem] py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-45 md:text-base"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Balance Scale
                </button>
              </div>
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

        <GameActionDock onBack={onBack} accentClass="text-white" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md"
            >
              <div className="licensed-overlay-card flex w-full max-w-md flex-col items-center gap-6 p-8 text-center md:p-10">
                <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isVictory ? 'Mine Cleared!' : 'Shift Over!'}
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/54">Final Score</div>
                  <div className="mt-2 text-5xl font-black text-white">{score}</div>
                </div>
                <button
                  onClick={onBack}
                  className="licensed-submit-button flex w-full items-center justify-center gap-2 rounded-[1.35rem] py-4 text-lg font-black uppercase tracking-[0.14em] text-white"
                >
                  <Coins className="h-5 w-5" />
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MeasurementForgeGame;
