import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import AssetIcon from './AssetIcon';
import { Coins } from './GameIcons';
import { GameScreenShell, PuzzleStage } from './layout/ScreenPrimitives';
import buttonOrangePill from '../assets/licensed/slices/button_orange_pill.png';
import buttonCyanPill from '../assets/licensed/slices/button_cyan_pill.png';
import panelPurple from '../assets/licensed/slices/panel_purple.png';
import labelPurpleLong from '../assets/licensed/slices/label_purple_long.png';
import labelGreenLong from '../assets/licensed/slices/label_green_long.png';
import woodPlankLong from '../assets/licensed/slices/wood_plank_long_3.png';
import iconGem from '../assets/licensed/slices/icon_gem.png';
import scaleMasterScale from '../assets/measurement/scale_master_scale.svg';

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
}

interface ScaleRound {
  category: 'mass' | 'volume';
  targetValue: number;
  targetDisplay: string;
  items: ScaleItem[];
}

type ScaleVisualKind = 'ingot' | 'crystal' | 'rock' | 'crate' | 'metal';

const MASS_ITEMS: ScaleItem[] = [
  { id: 'ore-rock', name: 'Ore Rock', displayWeight: '250 g', value: 250, unit: 'g' },
  { id: 'gem-crate', name: 'Crystal Cluster', displayWeight: '500 g', value: 500, unit: 'g' },
  { id: 'gold-bar', name: 'Gold Bar', displayWeight: '1 kg', value: 1000, unit: 'g' },
  { id: 'iron-block', name: 'Iron Block', displayWeight: '1 kg', value: 1000, unit: 'g' },
];

const VOLUME_ITEMS: ScaleItem[] = [
  { id: 'ore-rock', name: 'Stone Flask', displayWeight: '250 ml', value: 250, unit: 'ml' },
  { id: 'gem-crate', name: 'Crystal Flask', displayWeight: '500 ml', value: 500, unit: 'ml' },
  { id: 'gold-bar', name: 'Golden Keg', displayWeight: '1 l', value: 1000, unit: 'ml' },
  { id: 'iron-block', name: 'Silver Tank', displayWeight: '1 l', value: 1000, unit: 'ml' },
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
  const itemCount = Math.min(3, 2 + Math.floor(roundIndex / 3));
  const chosenItems = pickItemsForRound(pool, itemCount);
  const targetValue = chosenItems.reduce((sum, item) => sum + item.value, 0);
  const unit = pool[0].unit;

  return {
    category,
    targetValue,
    targetDisplay: buildTargetDisplay(targetValue, unit),
    items: pool,
  };
};

const formatCurrent = (value: number, unit: 'g' | 'ml') => buildTargetDisplay(value, unit);

const getItemKind = (item: ScaleItem): ScaleVisualKind => {
  if (item.id.includes('gold')) return 'ingot';
  if (item.id.includes('gem')) return 'crystal';
  if (item.id.includes('ore')) return 'rock';
  if (item.id.includes('iron')) return 'metal';
  return 'crate';
};

const getItemPalette = (item: ScaleItem) => {
  switch (getItemKind(item)) {
    case 'ingot':
      return {
        shell: 'from-yellow-200 via-amber-300 to-orange-500',
        edge: 'border-amber-100/70',
        glow: 'shadow-[0_12px_20px_rgba(245,158,11,0.34)]',
      };
    case 'crystal':
      return {
        shell: 'from-cyan-200 via-sky-300 to-blue-600',
        edge: 'border-cyan-100/80',
        glow: 'shadow-[0_12px_20px_rgba(34,211,238,0.34)]',
      };
    case 'rock':
      return {
        shell: 'from-stone-200 via-stone-400 to-stone-700',
        edge: 'border-stone-100/40',
        glow: 'shadow-[0_10px_16px_rgba(68,64,60,0.28)]',
      };
    case 'metal':
      return {
        shell: 'from-slate-100 via-slate-300 to-slate-600',
        edge: 'border-slate-100/70',
        glow: 'shadow-[0_12px_20px_rgba(100,116,139,0.26)]',
      };
    case 'crate':
    default:
      return {
        shell: 'from-orange-200 via-amber-500 to-orange-700',
        edge: 'border-amber-100/55',
        glow: 'shadow-[0_12px_18px_rgba(180,83,9,0.3)]',
      };
  }
};

const ScaleObjectArt: React.FC<{ item: ScaleItem; compact?: boolean }> = ({ item, compact = false }) => {
  const palette = getItemPalette(item);
  const size = compact ? 'h-9 w-9 md:h-10 md:w-10' : 'h-12 w-12 md:h-14 md:w-14';

  switch (getItemKind(item)) {
    case 'ingot':
      return (
        <div className={`relative ${size}`}>
          <div className={`absolute inset-x-[8%] inset-y-[20%] rounded-[0.8rem] border bg-gradient-to-br ${palette.shell} ${palette.edge} ${palette.glow} skew-x-[-14deg]`} />
          <div className="absolute inset-x-[18%] top-[26%] h-[20%] rounded-full bg-white/34 blur-[1px]" />
        </div>
      );
    case 'crystal':
      return (
        <div className={`relative ${size}`}>
          <div
            className={`absolute inset-[10%] border bg-gradient-to-br ${palette.shell} ${palette.edge} ${palette.glow}`}
            style={{ clipPath: 'polygon(50% 0%, 72% 18%, 92% 42%, 76% 100%, 24% 100%, 8% 42%, 28% 18%)' }}
          />
          <div className="absolute left-[40%] top-[18%] h-[50%] w-[10%] rotate-[12deg] rounded-full bg-white/36 blur-[1px]" />
        </div>
      );
    case 'rock':
      return (
        <div className={`relative ${size}`}>
          <div className={`absolute inset-[14%] rounded-[1rem] border bg-gradient-to-br ${palette.shell} ${palette.edge} ${palette.glow} rotate-[-8deg]`} />
          <div className="absolute right-[26%] top-[28%] h-[14%] w-[16%] rounded-full bg-white/12" />
        </div>
      );
    case 'metal':
      return (
        <div className={`relative ${size}`}>
          <div className={`absolute inset-[12%] rounded-[0.95rem] border bg-gradient-to-br ${palette.shell} ${palette.edge} ${palette.glow}`} />
          <div className="absolute inset-x-[25%] top-[20%] bottom-[20%] border-x border-slate-50/25" />
          <div className="absolute inset-y-[34%] left-[18%] right-[18%] border-t border-b border-slate-50/20" />
        </div>
      );
    case 'crate':
    default:
      return (
        <div className={`relative ${size}`}>
          <div className={`absolute inset-[12%] rounded-[0.95rem] border bg-gradient-to-br ${palette.shell} ${palette.edge} ${palette.glow}`} />
          <div className="absolute inset-x-[28%] top-[20%] bottom-[20%] border-x border-amber-50/45" />
          <div className="absolute inset-y-[30%] left-[18%] right-[18%] border-t border-b border-amber-50/35" />
        </div>
      );
  }
};

const ScaleItemToken: React.FC<{
  item: ScaleItem;
  onClick?: () => void;
  count?: number;
  compact?: boolean;
  disabled?: boolean;
}> = ({ item, onClick, count, compact = false, disabled = false }) => {
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? motion.button : 'div';

  return (
    <Wrapper
      whileTap={interactive ? { scale: 0.96 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-between overflow-hidden rounded-[1.2rem] border border-amber-100/24 bg-[linear-gradient(180deg,rgba(167,107,34,0.98),rgba(116,69,22,0.98)_32%,rgba(78,45,16,0.99))] p-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.16),0_12px_20px_rgba(0,0,0,0.22)] ${compact ? 'min-h-[4.35rem] min-w-[4.35rem] gap-1' : 'min-h-[6.55rem] gap-1.5'} ${interactive ? 'transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-45' : ''}`}
    >
      <div className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/16 blur-sm" />
      <div className="pointer-events-none absolute inset-x-1.5 inset-y-1.5 rounded-[0.95rem] border border-amber-50/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_26%,rgba(0,0,0,0.12)_100%)]" />
      <ScaleObjectArt item={item} compact={compact} />
      <div className={`licensed-slice-yellow-plank relative z-10 rounded-full px-2 py-0.5 font-black text-amber-950 ${compact ? 'text-[8px]' : 'text-[9px] md:text-[10px]'}`}>
        {item.displayWeight}
      </div>
      {typeof count === 'number' && count > 0 && (
        <div className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fde68a,#f59e0b)] px-1 text-[10px] font-black text-amber-950 shadow-[0_6px_12px_rgba(0,0,0,0.22)]">
          {count}
        </div>
      )}
    </Wrapper>
  );
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
  const balanceTilt = Math.max(-15, Math.min(15, balanceDifference / 90));
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
          subtitle: 'The weighbridge locked in perfectly.',
          tone: 'text-emerald-300 border-emerald-300/60 bg-emerald-500/16',
        }
      : {
          title: 'Off Balance!',
          subtitle: 'Reset the load and try a better mix.',
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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_16%),radial-gradient(circle_at_84%_20%,rgba(250,204,21,0.18),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(5,10,22,0.18)_34%,rgba(5,10,22,0.34)_100%)]" />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="relative inline-flex h-[2.35rem] items-center justify-center px-6 md:h-[2.55rem] md:px-7">
                <img src={labelPurpleLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                <div className="relative z-10 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white md:text-xs">
                  <AssetIcon name="star" className="h-4 w-4" />
                  Level {levelId} · Round {roundIndex + 1}
                </div>
              </div>

              <div className="relative w-full max-w-[18rem] px-4 py-3 md:max-w-[21rem] md:px-5 md:py-4">
                <img src={panelPurple} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_16px_34px_rgba(15,23,42,0.28)]" />
                <div className="pointer-events-none absolute left-1/2 top-0 h-11 w-11 -translate-x-1/2 -translate-y-[44%] rounded-full bg-[linear-gradient(180deg,#7dd3fc,#2563eb)] p-1 shadow-[0_10px_18px_rgba(37,99,235,0.28)]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(circle,#dbeafe,#3b82f6)]">
                    <img src={iconGem} alt="" draggable={false} className="h-5 w-5 object-contain" />
                  </div>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-100/82 md:text-xs">Target</div>
                  <div className="relative mt-1 inline-flex h-[3rem] min-w-[10rem] items-center justify-center px-5 md:h-[3.6rem] md:min-w-[12rem]">
                    <img src={labelGreenLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                    <div className="relative z-10 text-[1.2rem] font-black text-white md:text-[1.8rem]">
                      {round.targetDisplay}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="licensed-slice-cyan-pill rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs">
                  Current {formatCurrent(currentValue, scaleUnit)}
                </div>
                <div className={`${balanceDifference === 0 ? 'licensed-slice-green-pill' : 'licensed-slice-orange-pill'} rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs`}>
                  {balanceDifference === 0 ? 'Perfect match' : `Off by ${formatCurrent(Math.abs(balanceDifference), scaleUnit)}`}
                </div>
              </div>
            </div>

            <div className="relative min-h-[16rem] overflow-hidden rounded-[1.95rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02)_18%,rgba(8,15,30,0.18)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_34px_rgba(0,0,0,0.22)] md:min-h-[23rem] md:flex-1 md:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(56,189,248,0.18),transparent_18%),radial-gradient(circle_at_50%_92%,rgba(250,204,21,0.12),transparent_20%)]" />
              <div className="pointer-events-none absolute bottom-[12%] left-1/2 h-20 w-[72%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.24),rgba(34,211,238,0)_72%)] blur-xl" />

              <div className="relative flex h-full items-end justify-center">
                <motion.div
                  animate={{ rotate: balanceTilt }}
                  transition={{ type: 'spring', stiffness: 90, damping: 15 }}
                  className="absolute bottom-[14%] left-1/2 z-20 w-[96%] max-w-[42rem] -translate-x-1/2"
                >
                  <img src={scaleMasterScale} alt="" draggable={false} className="w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.24)]" />

                  <div className="absolute left-[6.5%] top-[33.5%] h-[21%] w-[25.5%] rounded-[1.6rem]">
                    <div className="absolute inset-x-[10%] top-[12%] bottom-[14%] flex flex-wrap content-center items-center justify-center gap-1.5 rounded-b-[1.5rem] rounded-t-[0.9rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.10),rgba(120,53,15,0.22))] px-2 py-2">
                      {groupedSelectedItems.length === 0 ? (
                        <div className="text-center text-[9px] font-black uppercase tracking-[0.16em] text-amber-50/68">Drop items</div>
                      ) : (
                        groupedSelectedItems.slice(0, 4).map(({ item, count }) => (
                          <button
                            key={item.id}
                            onClick={() => removeOneOfItem(item.id)}
                            className="relative flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.24),rgba(120,53,15,0.42))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_12px_rgba(0,0,0,0.14)]"
                          >
                            <ScaleObjectArt item={item} compact />
                            <div className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fde68a,#f59e0b)] px-1 text-[9px] font-black text-amber-950 shadow-[0_4px_10px_rgba(0,0,0,0.22)]">
                              {count}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="absolute right-[6.5%] top-[33.5%] flex h-[21%] w-[25.5%] items-center justify-center rounded-[1.6rem]">
                    <div className="flex h-[74%] w-[80%] flex-col items-center justify-center rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(120,53,15,0.1),rgba(120,53,15,0.22))] px-2 text-center">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-50/74">Target load</div>
                      <div className="mt-1 text-base font-black text-white md:text-xl">{round.targetDisplay}</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="relative shrink-0 px-3 py-3 md:px-4 md:py-3.5">
              <img src={woodPlankLong} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_16px_28px_rgba(0,0,0,0.2)]" />
              <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
                <div className="licensed-slice-yellow-plank rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-950 md:text-[10px]">
                  Weight tray
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={clearScale}
                  disabled={selectedItems.length === 0 || !!feedback}
                  className="relative inline-flex h-[2rem] min-w-[4.7rem] items-center justify-center px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-35 md:h-[2.2rem] md:min-w-[5.2rem] md:text-[10px]"
                >
                  <img src={buttonCyanPill} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill" />
                  <span className="relative z-10">Reset</span>
                </motion.button>
              </div>
              <div className="relative z-10 grid grid-cols-4 gap-2 md:gap-3">
                {round.items.map((item) => (
                  <ScaleItemToken
                    key={item.id}
                    item={item}
                    onClick={() => addItem(item)}
                    disabled={!!feedback}
                  />
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }}
                onClick={handleBalance}
                disabled={selectedItems.length === 0 || !!feedback}
                className="relative flex h-[4.35rem] w-full max-w-[22rem] items-center justify-center gap-3 px-6 text-lg font-black uppercase tracking-[0.12em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-45 md:h-[4.75rem] md:max-w-[24rem] md:text-[1.25rem]"
              >
                <img src={buttonOrangePill} alt="" draggable={false} className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_14px_24px_rgba(0,0,0,0.26)]" />
                <div className="relative z-10 flex items-center gap-3">
                  <AssetIcon name="check" className="h-5 w-5 md:h-6 md:w-6" />
                  Balance
                </div>
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
