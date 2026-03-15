import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { CheckCircle2, Coins, RotateCcw, Sparkles } from './GameIcons';
import { BottomActionTray, GameScreenShell, PuzzleStage, RewardPanel } from './layout/ScreenPrimitives';

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

const getCargoBadge = (item: ScaleItem) => {
  if (item.id.includes('ore')) return 'ORE';
  if (item.id.includes('gem')) return 'GEM';
  if (item.id.includes('gold')) return 'GLD';
  if (item.id.includes('cart')) return 'CRT';
  if (item.id.includes('flask')) return 'FLK';
  if (item.id.includes('jar')) return 'JAR';
  if (item.id.includes('keg')) return 'KEG';
  return 'BRW';
};

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
  const groupedSelectedItems = useMemo(() => {
    const groups = new Map<string, { item: ScaleItem; count: number }>();
    selectedItems.forEach((item) => {
      const existing = groups.get(item.id);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(item.id, { item, count: 1 });
      }
    });
    return Array.from(groups.values());
  }, [selectedItems]);

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

  const removeOneOfItem = (itemId: string) => {
    if (feedback) return;
    setSelectedItems((previous) => {
      const itemIndex = previous.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) return previous;
      return previous.filter((_, index) => index !== itemIndex);
    });
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
    <GameScreenShell className="items-center p-2 font-sans pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)] md:p-4">
      <GameplaySceneBackdrop gameType="measurement_forge" />
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

        <PuzzleStage className="rounded-[2rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(250,204,21,0.18),transparent_22%),radial-gradient(circle_at_78%_28%,rgba(34,211,238,0.14),transparent_18%),linear-gradient(180deg,rgba(8,15,30,0.14),rgba(8,15,30,0.42))]" />

          <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr),auto] gap-3 md:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.92fr)] md:grid-rows-[auto,minmax(0,1fr)] md:gap-4">
            <div className="flex flex-col items-center gap-2 text-center md:col-span-2">
              <div className="licensed-slice-purple-banner inline-flex min-h-[2.1rem] items-center gap-2 rounded-[1rem] px-4 py-1.5 text-[10px] text-white md:px-5">
                <Sparkles className="h-4 w-4" />
                Round {roundIndex + 1} / 7
              </div>

              <RewardPanel className="w-full max-w-[22rem] md:max-w-[34rem]">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-950/60 md:text-xs">Mine Order</div>
                <div className="mt-1 text-[1.25rem] font-black leading-none text-amber-950 md:text-[1.9rem]">{round.targetLabel}</div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <div className="licensed-slice-cyan-pill flex min-h-[2.2rem] items-center rounded-[1rem] px-4 py-2 text-white md:min-h-[2.5rem] md:px-5">
                    <span className="text-base font-black md:text-2xl">{round.targetDisplay}</span>
                  </div>
                  <div className="licensed-slice-purple-banner rounded-[1rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white md:text-xs">
                    Current {formatCurrent(currentValue, scaleUnit)}
                  </div>
                  <div className={`rounded-[1rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] md:text-xs ${
                    balanceDifference === 0
                      ? 'licensed-slice-green-pill text-white'
                      : 'licensed-slice-orange-pill text-white'
                  }`}>
                    {balanceDifference === 0 ? 'Perfect balance' : `Diff ${formatCurrent(Math.abs(balanceDifference), scaleUnit)}`}
                  </div>
                </div>
              </RewardPanel>
            </div>

            <div className="licensed-game-card-dark relative flex min-h-[15.5rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-3 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/56 md:text-xs">Crystal Weighbridge</div>
                  <div className="mt-1 text-sm font-black text-white md:text-lg">Match the glowing target load.</div>
                </div>
                <div className="licensed-slice-paper-panel rounded-[0.95rem] px-3 py-2 text-right shadow-[0_10px_20px_rgba(2,6,23,0.16)]">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-950/54">Cargo</div>
                  <div className="mt-1 text-lg font-black text-amber-950 md:text-xl">{selectedItems.length}</div>
                </div>
              </div>

              <div className="relative mt-3 flex min-h-0 flex-1 items-end justify-center">
                <div className="absolute bottom-[6%] left-1/2 h-10 w-[56%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.24),rgba(56,189,248,0)_72%)] blur-xl" />
                <div className="absolute bottom-[23%] left-1/2 h-[26%] w-6 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#dbeafe,#94a3b8_30%,#334155_100%)] shadow-[0_0_0_6px_rgba(59,130,246,0.12),0_12px_24px_rgba(0,0,0,0.22)] md:w-8" />
                <motion.div
                  animate={{ rotate: balanceTilt }}
                  transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                  className="absolute bottom-[47%] left-1/2 h-4 w-[78%] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#fef3c7,#f59e0b_34%,#475569_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.28)]"
                >
                  <div className="absolute left-[5%] top-3 h-[5.25rem] w-[38%] origin-top rounded-[1.35rem] border-[3px] border-sky-100/18 bg-[linear-gradient(180deg,rgba(21,34,58,0.96),rgba(8,15,30,0.98))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_18px_rgba(0,0,0,0.18)] md:h-[5.9rem] md:w-[35%] md:p-2">
                    <div className="flex h-full flex-wrap content-start gap-1.5 overflow-hidden rounded-[0.95rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(8,15,30,0.18))] p-1.5">
                      {groupedSelectedItems.length === 0 && (
                        <div className="flex h-full w-full items-center justify-center text-center text-[9px] font-black uppercase tracking-[0.16em] text-sky-100/34">
                          Add cargo
                        </div>
                      )}
                      {groupedSelectedItems.map(({ item, count }) => (
                        <button
                          key={item.id}
                          onClick={() => removeOneOfItem(item.id)}
                          className={`flex min-h-[2rem] min-w-[4rem] flex-1 items-center justify-center gap-1 rounded-full border border-white/18 bg-gradient-to-br ${item.tint} px-2 py-1 text-[9px] font-black text-slate-950 shadow-[0_8px_14px_rgba(0,0,0,0.22)]`}
                        >
                          <span>{getCargoBadge(item)}</span>
                          <span className="rounded-full bg-white/55 px-1.5 py-0.5 text-[8px]">x{count}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="absolute right-[5%] top-3 flex h-[5.25rem] w-[38%] origin-top items-center justify-center rounded-[1.35rem] border-[3px] border-sky-100/18 bg-[linear-gradient(180deg,rgba(21,34,58,0.96),rgba(8,15,30,0.98))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_18px_rgba(0,0,0,0.18)] md:h-[5.9rem] md:w-[35%] md:p-2">
                    <div className="flex h-full w-full items-center justify-center rounded-[0.95rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(8,15,30,0.18))] p-2 text-center">
                      <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-100/60">Target</div>
                        <div className="mt-1 text-lg font-black text-yellow-100 md:text-2xl">{round.targetDisplay}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="absolute bottom-[8%] left-1/2 h-20 w-36 -translate-x-1/2 rounded-[2rem] border-4 border-sky-200/14 bg-[linear-gradient(180deg,#334155,#0f172a)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_42px_rgba(0,0,0,0.3)] md:h-24 md:w-44" />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {round.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={!!feedback}
                    className={`licensed-game-card group flex min-h-[5.8rem] flex-col items-start justify-between overflow-hidden rounded-[1.35rem] p-3 text-left text-white transition-all hover:-translate-y-1 active:scale-[0.98] ${item.glow} md:min-h-[7rem] md:rounded-[1.5rem]`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-gradient-to-br ${item.tint} text-[11px] font-black text-slate-950 shadow-[0_12px_20px_rgba(0,0,0,0.18)] md:h-12 md:w-12 md:text-lg`}>
                        {getCargoBadge(item)}
                      </div>
                      <div className="licensed-slice-yellow-plank rounded-[0.8rem] px-2.5 py-1 text-[9px] font-black text-amber-950">
                        Add
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white md:text-base">{item.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/64 md:text-xs">{item.displayWeight}</div>
                    </div>
                  </button>
                ))}
              </div>

              <BottomActionTray className="mt-auto">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/60">Forge Controls</div>
                    <div className="text-sm font-black text-white md:text-lg">Reset or lock in the load.</div>
                  </div>
                  <button
                    onClick={clearScale}
                    disabled={selectedItems.length === 0 || !!feedback}
                    className="fantasy-cta-button flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-35"
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
              </BottomActionTray>
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
        </PuzzleStage>

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
    </GameScreenShell>
  );
};

export default MeasurementForgeGame;
