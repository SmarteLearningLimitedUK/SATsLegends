import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { TAKE_OUT_ASSETS } from '../assets/take_out';
import takeOutLevelBg from '../assets/level_backgrounds/take_out.png';
import playBgAsset from '../assets/fantasy_hero/slider/play_bg.png';
import playBorderAsset from '../assets/fantasy_hero/slider/play_border.png';
import playFillBlueAsset from '../assets/fantasy_hero/slider/play_fill_blue.png';
import lineBgAsset from '../assets/fantasy_hero/title/line_bg.png';
import coinAsset from '../assets/fantasy_hero/ui/coin.png';
import { triggerHaptic } from '../haptics';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import AssetIcon from './AssetIcon';
import { Star } from './GameIcons';

interface TakeOutRushGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type CustomerMood = 'waiting' | 'happy' | 'sad';

interface IngredientType {
  name: string;
  units: number;
  asset: string;
  accent: string;
  trayTone: string;
  buttonImageClass: string;
  stackImageClass: string;
  shortLabel: string;
}

interface OrderRequest {
  id: string;
  targetUnits: number;
  requiredIngredients: string[];
  text: string;
}

interface CustomerReaction {
  mood: CustomerMood;
  text: string;
}

const ORDER_DURATION = 45;
const MAX_MISSES = 3;
const SCORE_TARGET_BASE = 900;
const SCORE_TARGET_PER_LEVEL = 250;

const INGREDIENT_TYPES: IngredientType[] = [
  {
    name: 'Protein Pack',
    units: 4,
    asset: TAKE_OUT_ASSETS.portionHalf,
    accent: 'from-amber-100 via-orange-50 to-white',
    trayTone: 'from-sky-500 via-cyan-500 to-blue-600',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-36 md:w-44',
    shortLabel: '1/2',
  },
  {
    name: 'Cheese Slice',
    units: 2,
    asset: TAKE_OUT_ASSETS.portionQuarter,
    accent: 'from-yellow-100 via-amber-50 to-white',
    trayTone: 'from-orange-400 via-amber-400 to-yellow-500',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-32 md:w-40',
    shortLabel: '1/4',
  },
  {
    name: 'Crunch Strip',
    units: 1,
    asset: TAKE_OUT_ASSETS.portionEighthA,
    accent: 'from-rose-100 via-orange-50 to-white',
    trayTone: 'from-rose-500 via-red-500 to-orange-500',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-34 md:w-42',
    shortLabel: '1/8',
  },
  {
    name: 'Leaf Mix',
    units: 1,
    asset: TAKE_OUT_ASSETS.portionEighthB,
    accent: 'from-lime-100 via-emerald-50 to-white',
    trayTone: 'from-lime-400 via-emerald-400 to-green-500',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-36 md:w-46',
    shortLabel: '1/8',
  },
  {
    name: 'Red Slice',
    units: 1,
    asset: TAKE_OUT_ASSETS.portionEighthC,
    accent: 'from-red-100 via-rose-50 to-white',
    trayTone: 'from-cyan-500 via-sky-500 to-teal-500',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-34 md:w-42',
    shortLabel: '1/8',
  },
  {
    name: 'Ring Mix',
    units: 1,
    asset: TAKE_OUT_ASSETS.portionEighthD,
    accent: 'from-cyan-100 via-sky-50 to-white',
    trayTone: 'from-cyan-500 via-blue-500 to-sky-600',
    buttonImageClass: 'w-14 md:w-18',
    stackImageClass: 'w-32 md:w-38',
    shortLabel: '1/8',
  },
  {
    name: 'Brine Bites',
    units: 1,
    asset: TAKE_OUT_ASSETS.portionEighthE,
    accent: 'from-emerald-100 via-lime-50 to-white',
    trayTone: 'from-emerald-500 via-lime-500 to-green-500',
    buttonImageClass: 'w-14 md:w-18',
    stackImageClass: 'w-30 md:w-38',
    shortLabel: '1/8',
  },
  {
    name: 'Sauce Swirl A',
    units: 1,
    asset: TAKE_OUT_ASSETS.sauceSwirlA,
    accent: 'from-red-100 via-orange-50 to-white',
    trayTone: 'from-red-500 via-rose-500 to-pink-500',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-30 md:w-36',
    shortLabel: '1/8',
  },
  {
    name: 'Sauce Swirl B',
    units: 1,
    asset: TAKE_OUT_ASSETS.sauceSwirlB,
    accent: 'from-amber-100 via-orange-50 to-white',
    trayTone: 'from-amber-500 via-orange-500 to-red-500',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-30 md:w-36',
    shortLabel: '1/8',
  },
];

const TARGET_UNIT_OPTIONS = [7, 8, 9, 10, 11, 12, 13, 14];

const createId = () => Math.random().toString(36).slice(2, 11);

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

const formatFractionUnits = (units: number) => {
  if (units === 0) return '0';

  const whole = Math.floor(units / 8);
  const remainder = units % 8;

  if (!remainder) return `${whole}`;

  const divisor = gcd(remainder, 8);
  const numerator = remainder / divisor;
  const denominator = 8 / divisor;

  if (!whole) return `${numerator}/${denominator}`;
  return `${whole} ${numerator}/${denominator}`;
};

const formatFractionSentence = (units: number) => {
  const whole = Math.floor(units / 8);
  const remainder = units % 8;

  if (!remainder) return `${whole}`;
  if (!whole) return formatFractionUnits(units);

  const divisor = gcd(remainder, 8);
  const numerator = remainder / divisor;
  const denominator = 8 / divisor;
  return `${whole} and ${numerator}/${denominator}`;
};

const joinWithAnd = (items: string[]) => {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

const CustomerFace: React.FC<{ mood: CustomerMood }> = ({ mood }) => {
  const faceTone = mood === 'happy' ? 'from-emerald-300 to-lime-200' : mood === 'sad' ? 'from-rose-300 to-orange-200' : 'from-sky-200 to-cyan-100';
  const mouthClasses = mood === 'sad'
    ? 'h-5 w-12 rounded-t-full border-x-4 border-t-4 border-x-slate-800 border-t-slate-800'
    : mood === 'happy'
      ? 'h-5 w-12 rounded-b-full border-b-4 border-x-4 border-b-slate-800 border-x-slate-800'
      : 'h-1.5 w-10 rounded-full bg-slate-800';

  return (
    <div className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${faceTone} shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_12px_24px_rgba(15,23,42,0.18)] md:h-20 md:w-20`}>
      <div className="absolute left-[18px] top-[21px] h-2.5 w-2.5 rounded-full bg-slate-800 md:left-[28px] md:top-[29px]" />
      <div className="absolute right-[18px] top-[21px] h-2.5 w-2.5 rounded-full bg-slate-800 md:right-[28px] md:top-[29px]" />
      <div className={`absolute bottom-[15px] md:bottom-[22px] ${mouthClasses}`} />
    </div>
  );
};

const TakeOutRushGame: React.FC<TakeOutRushGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [orderTimeLeft, setOrderTimeLeft] = useState(ORDER_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRequest | null>(null);
  const [orderStack, setOrderStack] = useState<IngredientType[]>([]);
  const [ordersServed, setOrdersServed] = useState(0);
  const [missedCustomers, setMissedCustomers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [customerMood, setCustomerMood] = useState<CustomerMood>('waiting');
  const [reaction, setReaction] = useState<CustomerReaction | null>(null);
  const [feedback, setFeedback] = useState('Fill the take-out tray to match the order exactly.');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetScore = SCORE_TARGET_BASE + (levelId * SCORE_TARGET_PER_LEVEL);

  const createOrder = useCallback((): OrderRequest => {
    const targetUnits = TARGET_UNIT_OPTIONS[Math.floor(Math.random() * TARGET_UNIT_OPTIONS.length)];
    const requiredCount = levelId >= 5 ? 2 : 1;
    const requiredIngredients = [...INGREDIENT_TYPES]
      .sort(() => Math.random() - 0.5)
      .slice(0, requiredCount)
      .map(item => item.name);

    const ingredientText = joinWithAnd(requiredIngredients.map(item => item.toLowerCase()));

    return {
      id: createId(),
      targetUnits,
      requiredIngredients,
      text: `I want a ${formatFractionSentence(targetUnits)} take-out tray with ${ingredientText}.`,
    };
  }, [levelId]);

  const clearTransitionTimers = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
      reactionTimeoutRef.current = null;
    }
  };

  useEffect(() => clearTransitionTimers, []);

  const beginNextOrder = useCallback((nextMood: CustomerMood, nextReaction: string) => {
    setIsTransitioning(true);
    setCustomerMood(nextMood);
    setReaction({ mood: nextMood, text: nextReaction });

    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReaction(null), 1100);

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentOrder(createOrder());
      setOrderStack([]);
      setOrderTimeLeft(ORDER_DURATION);
      setCustomerMood('waiting');
      setFeedback('Fill the take-out tray to match the order exactly.');
      setIsTransitioning(false);
    }, 1100);
  }, [createOrder]);

  const finishLevel = useCallback((finalScore: number) => {
    const stars = finalScore >= targetScore * 1.9 ? 3 : finalScore >= targetScore * 1.35 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 180,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#ffd166', '#f97316', '#ffffff'],
    });
    onVictory(stars, finalScore);
  }, [onVictory, targetScore]);

  useEffect(() => {
    setScore(0);
    setOrderTimeLeft(ORDER_DURATION);
    setIsGameOver(false);
    setIsVictory(false);
    setOrdersServed(0);
    setMissedCustomers(0);
    setStreak(0);
    setCustomerMood('waiting');
    setReaction(null);
    setFeedback('Fill the take-out tray to match the order exactly.');
    setIsTransitioning(false);
    setOrderStack([]);
    setCurrentOrder(createOrder());
  }, [createOrder, levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || isTransitioning || !currentOrder) return undefined;
    if (orderTimeLeft <= 0) {
      const nextMisses = missedCustomers + 1;
      setMissedCustomers(nextMisses);
      setStreak(0);
      if (nextMisses >= MAX_MISSES) {
        setCustomerMood('sad');
        setReaction({ mood: 'sad', text: 'The last customer walked away.' });
        setIsGameOver(true);
        onGameOver(score);
      } else {
        beginNextOrder('sad', 'Customer left unhappy.');
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      setOrderTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [beginNextOrder, currentOrder, isGameOver, isTransitioning, isVictory, missedCustomers, onGameOver, orderTimeLeft, score]);

  const totalUnits = useMemo(
    () => orderStack.reduce((sum, ingredient) => sum + ingredient.units, 0),
    [orderStack],
  );

  const usedIngredientCounts = useMemo(() => {
    const counts = new Map<string, number>();
    orderStack.forEach(ingredient => {
      counts.set(ingredient.name, (counts.get(ingredient.name) || 0) + 1);
    });
    return counts;
  }, [orderStack]);

  const requiredMissing = useMemo(() => {
    if (!currentOrder) return [];
    return currentOrder.requiredIngredients.filter(name => !usedIngredientCounts.has(name));
  }, [currentOrder, usedIngredientCounts]);

  const buildEquation = useMemo(() => {
    if (!orderStack.length) return 'Tap ingredients to start your fraction stack.';
    return `${orderStack.map(item => item.shortLabel).join(' + ')} = ${formatFractionUnits(totalUnits)}`;
  }, [orderStack, totalUnits]);

  const orderSummary = useMemo(() => {
    if (!currentOrder) return '';
    return `${formatFractionUnits(currentOrder.targetUnits)} tray | ${currentOrder.requiredIngredients.join(' + ')}`;
  }, [currentOrder]);

  const requiredIngredientVisuals = useMemo(() => {
    if (!currentOrder) return [];
    return currentOrder.requiredIngredients
      .map(name => INGREDIENT_TYPES.find(item => item.name === name))
      .filter((item): item is IngredientType => Boolean(item));
  }, [currentOrder]);

  const orderChecklist = useMemo(() => {
    if (!currentOrder) return [];

    const rows = requiredIngredientVisuals.map((ingredient) => ({
      id: ingredient.name,
      label: ingredient.name,
      asset: ingredient.asset,
      current: usedIngredientCounts.get(ingredient.name) || 0,
      target: 1,
      tone: ingredient.trayTone,
    }));

    rows.unshift({
      id: 'size',
      label: 'Tray Total',
      asset: TAKE_OUT_ASSETS.trayLid,
      current: totalUnits,
      target: currentOrder.targetUnits,
      tone: 'from-sky-500 via-blue-500 to-indigo-600',
    });

    return rows;
  }, [currentOrder, requiredIngredientVisuals, totalUnits, usedIngredientCounts]);

  const orderProgress = useMemo(() => {
    if (!currentOrder) return 0;
    const sizeProgress = Math.min(totalUnits / currentOrder.targetUnits, 1) * 0.6;
    const ingredientProgress = currentOrder.requiredIngredients.length
      ? ((currentOrder.requiredIngredients.length - requiredMissing.length) / currentOrder.requiredIngredients.length) * 0.4
      : 0.4;
    return Math.round((sizeProgress + ingredientProgress) * 100);
  }, [currentOrder, requiredMissing.length, totalUnits]);

  const handleIngredientAdd = (ingredient: IngredientType) => {
    if (isGameOver || isVictory || isTransitioning) return;
    if (orderStack.length >= 14) {
      triggerHaptic('warning');
      setFeedback('The tray is already full. Serve it or clear and rebuild.');
      return;
    }

    triggerHaptic('selection');
    setOrderStack(prev => [...prev, ingredient]);
    setFeedback(`Added ${ingredient.name.toLowerCase()} for ${ingredient.shortLabel}.`);
  };

  const clearOrderStack = () => {
    if (isGameOver || isVictory || isTransitioning) return;
    triggerHaptic('light');
    setOrderStack([]);
    setFeedback('Tray cleared. Start the order again.');
  };

  const handleServe = () => {
    if (!currentOrder || isGameOver || isVictory || isTransitioning) return;

    if (requiredMissing.length) {
      triggerHaptic('warning');
      setFeedback(`Still needs ${joinWithAnd(requiredMissing.map(item => item.toLowerCase()))}.`);
      return;
    }

    if (totalUnits < currentOrder.targetUnits) {
      const shortBy = currentOrder.targetUnits - totalUnits;
      triggerHaptic('warning');
      setFeedback(`You are short by ${formatFractionUnits(shortBy)}.`);
      return;
    }

    if (totalUnits > currentOrder.targetUnits) {
      triggerHaptic('warning');
      setFeedback('That order is too large. Clear it and rebuild this tray.');
      return;
    }

    const uniqueIngredients = usedIngredientCounts.size;
    const layerBonus = orderStack.length * 18;
    const varietyBonus = uniqueIngredients * 14;
    const speedBonus = orderTimeLeft * 3;
    const streakBonus = streak * 25;
    const earnedScore = 140 + layerBonus + varietyBonus + speedBonus + streakBonus;
    const newScore = score + earnedScore;

    setScore(newScore);
    setOrdersServed(prev => prev + 1);
    setStreak(prev => prev + 1);
    setCustomerMood('happy');
    triggerHaptic('success');
    setFeedback(`Perfect order. +${earnedScore} points.`);
    confetti({
      particleCount: 60,
      spread: 54,
      origin: { y: 0.74 },
      colors: ['#facc15', '#fb923c', '#ffffff'],
    });

    if (newScore >= targetScore) {
      finishLevel(newScore);
      return;
    }

    beginNextOrder('happy', `Order served. +${earnedScore}`);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#6e2f1f_0%,#3f170d_42%,#12070a_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.92]"
        style={{ backgroundImage: `url(${takeOutLevelBg})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(126,46,24,0.44),rgba(90,36,19,0.2)_28%,rgba(18,14,8,0.5)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(255,243,199,0)_26%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.24),rgba(120,53,15,0)_38%)]" />
      <GameplaySceneBackdrop gameType="take_out_rush" className="opacity-8" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-3">
        <header className="ui-panel-unified flex items-center justify-between gap-2 rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(45,18,12,0.92),rgba(77,34,20,0.88))] px-3 py-2 text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] md:rounded-[1.45rem] md:px-4">
          <button className="flex items-center gap-2 rounded-full bg-black/22 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] md:px-3 md:text-xs">
            <span>How do I fill trays?</span>
            <AssetIcon name="question" className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:px-3">
              <img src={coinAsset} alt="" className="h-4 w-4 md:h-5 md:w-5" draggable={false} />
              <span className="text-xs font-black md:text-sm">{score}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:px-3">
              <AssetIcon name="timer" className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs font-black md:text-sm">{orderTimeLeft}s</span>
            </div>
            <div className="hidden items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:flex md:px-3">
              <AssetIcon name="trophy" className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs font-black md:text-sm">{ordersServed}</span>
            </div>
          </div>
        </header>

        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] p-2 md:rounded-[2.6rem] md:p-3">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.92fr)] xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:gap-3">
          <section className="order-3 xl:order-3 relative overflow-hidden rounded-[1.6rem] border border-white/18 bg-[linear-gradient(180deg,rgba(16,60,130,0.96),rgba(7,31,78,0.98))] p-2 shadow-[0_20px_42px_rgba(0,0,0,0.34)] md:rounded-[2rem] md:p-3">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,241,201,0.28),rgba(255,241,201,0)_24%)]" />
            <div className="relative flex h-full min-h-0 flex-col rounded-[1.2rem] border border-amber-200/55 bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(253,230,138,0.88))] p-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.6)] md:rounded-[1.6rem] md:p-3">
              <div className="pointer-events-none absolute inset-x-3 top-1 h-6 bg-contain bg-center bg-no-repeat opacity-75 md:top-2 md:h-8" style={{ backgroundImage: `url(${lineBgAsset})` }} />
              <div className="relative mb-1.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-800/70 md:text-[9px]">Order Ticket</div>
                  <div className="truncate text-[10px] font-black text-amber-950 md:text-sm">{currentOrder?.text}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {[0, 1, 2].map(pin => (
                    <div key={pin} className="h-3 w-3 rounded-full bg-[linear-gradient(180deg,#ef4444,#991b1b)] shadow-[0_2px_0_rgba(69,10,10,0.6)] md:h-4 md:w-4" />
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 flex-1 auto-rows-fr gap-1.5 md:gap-2">
                {orderChecklist.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-1.5 md:grid-cols-[2.6rem_minmax(0,1fr)] md:gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] md:h-10 md:w-10 md:rounded-[0.95rem]">
                      <img
                        src={row.asset}
                        alt={row.label}
                        className={`${index === 0 ? 'h-5 w-7 md:h-7 md:w-10' : 'h-4 w-6 md:h-6 md:w-9'} object-contain`}
                        draggable={false}
                      />
                    </div>
                    <div className={`rounded-[0.85rem] bg-gradient-to-r ${row.tone} px-2 py-1.5 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] md:rounded-[1rem] md:px-3 md:py-2`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[8px] font-black uppercase tracking-[0.12em] md:text-[10px]">{row.label}</span>
                        <span className="shrink-0 text-sm font-black md:text-xl">
                          {index === 0 ? `${formatFractionUnits(row.current)} / ${formatFractionUnits(row.target)}` : `${row.current}/${row.target}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-1.5 rounded-[0.95rem] border border-amber-300/45 bg-white/58 px-2 py-1.5 text-[9px] font-black text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] md:rounded-[1.15rem] md:px-3 md:py-2 md:text-[10px]">
                {feedback}
              </div>
            </div>
          </section>

          <section className="order-1 xl:order-1 xl:col-span-2 relative overflow-hidden rounded-[1.5rem] border border-white/16 bg-[linear-gradient(180deg,rgba(14,48,115,0.96),rgba(8,25,58,0.98))] p-2 text-white shadow-[0_18px_42px_rgba(0,0,0,0.32)] md:rounded-[2.1rem] md:p-3">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_36%)]" />
            <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-2 md:gap-3">
              <CustomerFace mood={customerMood} />
              <div className="min-w-0">
                <div className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-200/80 md:text-[10px]">Kitchen Rush</div>
                <div className="mt-0.5 truncate text-sm font-black text-white md:text-lg">{orderSummary}</div>
                <div className="mt-1 flex items-center gap-1.5 md:gap-2">
                  {requiredIngredientVisuals.map(ingredient => (
                    <div key={ingredient.name} className={`rounded-full bg-gradient-to-r ${ingredient.trayTone} px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]`}>
                      <img src={ingredient.asset} alt={ingredient.name} className="h-4 w-7 object-contain md:h-5 md:w-9" draggable={false} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="rounded-[0.95rem] bg-white/12 px-2 py-1.5 text-center md:px-3">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/80 md:text-[10px]">Served</div>
                  <div className="mt-0.5 text-lg font-black text-yellow-200 md:text-2xl">{ordersServed}</div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: MAX_MISSES }).map((_, index) => (
                    <div key={index} className={`flex h-5 w-5 items-center justify-center rounded-full ${index < MAX_MISSES - missedCustomers ? 'bg-white/16' : 'bg-red-500/30'} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] md:h-7 md:w-7`}>
                      <AssetIcon name="heart" className={`h-2.5 w-2.5 md:h-3.5 md:w-3.5 ${index < MAX_MISSES - missedCustomers ? '' : 'opacity-35 grayscale'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {reaction && (
                <motion.div
                  key={`${reaction.mood}-${reaction.text}`}
                  initial={{ opacity: 0, y: -10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] shadow-lg md:right-3 md:top-3 md:px-3 md:py-1.5 md:text-xs ${
                    reaction.mood === 'happy' ? 'bg-lime-300 text-emerald-950' : 'bg-rose-300 text-rose-950'
                  }`}
                >
                  {reaction.text}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="order-2 xl:order-2 relative flex min-h-[14rem] flex-col overflow-hidden rounded-[1.9rem] border border-white/16 bg-[linear-gradient(180deg,rgba(27,14,47,0.56),rgba(24,14,38,0.76))] p-2 shadow-[0_22px_52px_rgba(0,0,0,0.28)] md:min-h-[18rem] md:rounded-[2.6rem] md:p-3">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(125,211,252,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.18) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
            <div className="absolute bottom-0 left-0 right-0 h-[28%] bg-[linear-gradient(180deg,rgba(255,224,178,0),rgba(251,146,60,0.28))]" />
            <div className="absolute inset-x-[8%] top-[6%] h-10 rounded-full bg-amber-100/20 blur-3xl md:h-16" />

            <div className="relative z-10 min-w-0 overflow-hidden rounded-[1.2rem] border border-amber-200/55 bg-[linear-gradient(180deg,rgba(255,248,231,0.98),rgba(253,230,138,0.9))] px-3 py-2.5 text-amber-950 shadow-[0_12px_26px_rgba(0,0,0,0.22)] md:rounded-[1.6rem] md:px-4 md:py-3">
              <div className="pointer-events-none absolute inset-x-3 top-1 h-6 bg-contain bg-center bg-no-repeat opacity-75 md:top-2 md:h-8" style={{ backgroundImage: `url(${lineBgAsset})` }} />
              <div className="relative flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] bg-white/70 shadow-[inset_0_2px_0_rgba(255,255,255,0.75)] md:h-16 md:w-16">
                  <img src={TAKE_OUT_ASSETS.trayLid} alt="" className="h-8 w-10 object-contain md:h-10 md:w-12" draggable={false} />
                </div>
                <div className="min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-800/72 md:text-[10px]">Take-Out Order</div>
                  <div className="mt-0.5 text-lg font-black leading-none md:text-[1.75rem]">
                    {currentOrder ? `${formatFractionUnits(currentOrder.targetUnits)} Tray` : 'Waiting...'}
                  </div>
                  <div className="mt-1 truncate text-[10px] font-bold text-amber-900/80 md:text-sm">{currentOrder?.text}</div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-2 grid grid-cols-3 gap-1.5 rounded-[1.2rem] border border-white/12 bg-slate-950/34 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.12)] md:gap-2 md:rounded-[1.6rem] md:p-2.5">
              <div className="rounded-[1rem] bg-white/10 px-2 py-1.5 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Target</div>
                <div className="mt-0.5 text-sm font-black text-white md:text-xl">{currentOrder ? formatFractionUnits(currentOrder.targetUnits) : '0'}</div>
              </div>
              <div className="rounded-[1rem] bg-white/10 px-2 py-1.5 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Built</div>
                <div className={`mt-0.5 text-sm font-black md:text-xl ${currentOrder && totalUnits > currentOrder.targetUnits ? 'text-red-300' : 'text-yellow-200'}`}>{formatFractionUnits(totalUnits)}</div>
              </div>
              <div className="rounded-[1rem] bg-white/10 px-2 py-1.5 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-white/56 md:text-[10px]">Layers</div>
                <div className="mt-0.5 text-sm font-black text-lime-200 md:text-xl">{orderStack.length}</div>
              </div>
            </div>

            <div className="relative z-10 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(251,191,36,0.14),rgba(251,191,36,0.04)_30%,rgba(255,255,255,0)_30%)] p-2 md:mt-3 md:rounded-[2rem] md:p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[0.9rem] border border-white/14 bg-black/22 p-2 text-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/60">Prep</div>
                  <img src={requiredIngredientVisuals[0]?.asset || TAKE_OUT_ASSETS.sauceSwirlA} alt="" className="mx-auto mt-1 h-8 w-12 object-contain" draggable={false} />
                </div>
                <div className="rounded-[0.9rem] border border-white/14 bg-black/22 p-2 text-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/60">Plate</div>
                  <img src={TAKE_OUT_ASSETS.trayLid} alt="" className="mx-auto mt-1 h-8 w-12 object-contain" draggable={false} />
                </div>
                <div className="rounded-[0.9rem] border border-white/14 bg-black/22 p-2 text-center">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-white/60">Cook</div>
                  <img src={requiredIngredientVisuals[1]?.asset || TAKE_OUT_ASSETS.sauceSwirlB} alt="" className="mx-auto mt-1 h-8 w-12 object-contain" draggable={false} />
                </div>
              </div>

              <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center justify-end overflow-hidden rounded-[1.2rem] border border-amber-100/18 bg-[linear-gradient(180deg,rgba(180,83,9,0.34),rgba(120,53,15,0.64))]">
                {reaction?.mood === 'happy' && (
                  <motion.div
                    initial={{ scale: 0.82, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 top-[10%] z-40 -translate-x-1/2 text-center"
                  >
                    <div className="text-[1.65rem] font-black uppercase tracking-[-0.04em] text-yellow-200 drop-shadow-[0_5px_0_rgba(12,74,146,0.72)] md:text-[2.4rem]">
                      Perfect!
                    </div>
                  </motion.div>
                )}
                <div className="absolute bottom-2 h-10 w-[76%] rounded-full bg-amber-900/30 blur-xl md:bottom-4 md:h-14" />
                <div className="relative flex h-full w-full max-w-[290px] flex-col items-center justify-end md:max-w-[400px]">
                  <img src={TAKE_OUT_ASSETS.trayLid} alt="Tray lid" className="z-20 w-28 object-contain drop-shadow-[0_12px_18px_rgba(120,53,15,0.24)] md:w-48" draggable={false} />
                  <div className="relative -mt-2 flex w-full flex-1 flex-col-reverse items-center justify-start overflow-visible px-1 pb-3 pt-2 md:-mt-4 md:px-2 md:pb-6">
                    <AnimatePresence initial={false}>
                      {orderStack.map((ingredient, index) => (
                        <motion.div
                          key={`${ingredient.name}-${index}-${orderStack.length}`}
                          initial={{ y: -18, opacity: 0, scale: 1.08 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, y: 18 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                          className={`${index === 0 ? '' : '-mt-2 md:-mt-4'} relative flex items-center justify-center`}
                          style={{ zIndex: index + 1 }}
                        >
                          <img src={ingredient.asset} alt={ingredient.name} className={`${ingredient.stackImageClass} max-w-[8.8rem] md:max-w-none object-contain drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)]`} draggable={false} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <img src={TAKE_OUT_ASSETS.trayBase} alt="Tray base" className="relative z-30 -mt-1 w-28 object-contain drop-shadow-[0_14px_20px_rgba(120,53,15,0.24)] md:-mt-2 md:w-48" draggable={false} />
                </div>
              </div>
            </div>
          </section>

          <section className="order-4 xl:order-4 xl:col-span-2 rounded-[1.4rem] border border-white/16 bg-[linear-gradient(180deg,rgba(20,15,40,0.96),rgba(36,18,52,0.98))] p-2 shadow-[0_16px_30px_rgba(15,23,42,0.22)] md:rounded-[1.8rem] md:p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/70 md:text-[10px]">Ingredient Rail</div>
                <div className="mt-0.5 text-sm font-black text-white md:text-lg">Tap pieces to build the order</div>
              </div>
              <div className="hidden rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/78 md:block">
                Max 14 layers
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5 pb-1 sm:grid-cols-4 md:grid-cols-5 md:gap-2 lg:grid-cols-6 xl:grid-cols-9">
              {INGREDIENT_TYPES.map(ingredient => {
                const currentCount = usedIngredientCounts.get(ingredient.name) || 0;
                const targetCount = Math.max(1, currentOrder?.requiredIngredients.includes(ingredient.name) ? 1 : Math.ceil((currentOrder?.targetUnits || 8) / ingredient.units));
                return (
                  <motion.button
                    key={ingredient.name}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleIngredientAdd(ingredient)}
                    className="group relative flex min-h-[5.4rem] flex-col items-center justify-end overflow-hidden rounded-[1.15rem] border border-white/12 p-1.5 shadow-[0_12px_22px_rgba(0,0,0,0.24)] md:min-h-[6rem] md:rounded-[1.4rem] md:p-2"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-b ${ingredient.trayTone}`} />
                    <div className="absolute inset-x-[12%] top-[8%] h-[30%] rounded-full bg-white/28 blur-lg" />
                    <div className="relative z-10 flex h-full w-full flex-col items-center justify-between">
                      <div className="rounded-full bg-black/18 px-2 py-0.5 text-[9px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] md:text-[11px]">
                        {currentCount}/{targetCount}
                      </div>
                      <img
                        src={ingredient.asset}
                        alt={ingredient.name}
                        className={`${ingredient.buttonImageClass} max-h-[2rem] max-w-[2.4rem] md:max-h-[2.75rem] md:max-w-[3.2rem] object-contain drop-shadow-[0_8px_10px_rgba(15,23,42,0.22)]`}
                        draggable={false}
                      />
                      <div className="text-center leading-none text-white">
                        <div className="text-[8px] font-black md:text-[10px]">{ingredient.name}</div>
                        <div className="mt-0.5 text-[8px] font-black text-white/80 md:text-[10px]">{ingredient.shortLabel}</div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-2 grid gap-2 md:mt-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="relative h-4 overflow-hidden rounded-full md:h-5">
                  <img src={playBgAsset} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" draggable={false} />
                  <img src={playBorderAsset} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" draggable={false} />
                  <div className="absolute inset-[10%] overflow-hidden rounded-full">
                    <motion.div
                      className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${orderProgress}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                    >
                      <img src={playFillBlueAsset} alt="" className="h-full w-full object-fill saturate-[1.35]" draggable={false} />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.45),rgba(251,191,36,0.45),rgba(74,222,128,0.45))]" />
                    </motion.div>
                  </div>
                </div>
                <div className="mt-1 truncate text-[10px] font-black text-white/88 md:text-xs">{buildEquation}</div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={clearOrderStack}
                  className="ui-button-secondary px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-60 md:px-4 md:text-sm"
                  disabled={!orderStack.length || isTransitioning}
                >
                  Clear Stack
                </button>
                <button
                  onClick={handleServe}
                  className="ui-button-primary px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-60 md:px-5 md:text-sm"
                  disabled={!orderStack.length || isTransitioning}
                >
                  Serve Order
                </button>
              </div>
            </div>
          </section>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-amber-300 bg-white p-6 shadow-2xl md:gap-7 md:p-10">
                <CustomerFace mood={isVictory ? 'happy' : 'sad'} />
                <div className="text-center">
                  <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isVictory ? 'Service Mastered' : 'Shift Over'}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-500 md:text-base">
                    {isVictory ? 'You hit the score target and kept the orders moving.' : 'Too many customers left before their order was ready.'}
                  </div>
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(index => {
                      const earnedStars = score >= targetScore * 1.9 ? 3 : score >= targetScore * 1.35 ? 2 : 1;
                      return (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.16, type: 'spring' }}
                        >
                          <Star className={`h-14 w-14 ${index <= earnedStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="grid w-full grid-cols-3 gap-3">
                  <div className="rounded-[1.2rem] bg-amber-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700/70">Score</div>
                    <div className="mt-1 text-2xl font-black text-amber-950">{score}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-orange-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700/70">Served</div>
                    <div className="mt-1 text-2xl font-black text-amber-950">{ordersServed}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-rose-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700/70">Missed</div>
                    <div className="mt-1 text-2xl font-black text-amber-950">{missedCustomers}</div>
                  </div>
                </div>

                <button onClick={onBack} className="ui-button-primary licensed-submit-button w-full py-4 text-xl font-black text-white transition-all">
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

export default TakeOutRushGame;
