import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { BURGER_ASSETS } from '../assets/burger';
import { triggerHaptic } from '../haptics';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import GameplayHUD from './GameplayHUD';
import AssetIcon from './AssetIcon';
import { Star } from './GameIcons';

interface BurgerBuilderGameProps {
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
    name: 'Patty',
    units: 4,
    asset: BURGER_ASSETS.patty,
    accent: 'from-amber-100 via-orange-50 to-white',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-36 md:w-44',
    shortLabel: '1/2',
  },
  {
    name: 'Cheese',
    units: 2,
    asset: BURGER_ASSETS.cheese,
    accent: 'from-yellow-100 via-amber-50 to-white',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-32 md:w-40',
    shortLabel: '1/4',
  },
  {
    name: 'Bacon',
    units: 1,
    asset: BURGER_ASSETS.bacon,
    accent: 'from-rose-100 via-orange-50 to-white',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-34 md:w-42',
    shortLabel: '1/8',
  },
  {
    name: 'Lettuce',
    units: 1,
    asset: BURGER_ASSETS.lettuce,
    accent: 'from-lime-100 via-emerald-50 to-white',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-36 md:w-46',
    shortLabel: '1/8',
  },
  {
    name: 'Tomato',
    units: 1,
    asset: BURGER_ASSETS.tomato,
    accent: 'from-red-100 via-rose-50 to-white',
    buttonImageClass: 'w-16 md:w-20',
    stackImageClass: 'w-34 md:w-42',
    shortLabel: '1/8',
  },
  {
    name: 'Onion',
    units: 1,
    asset: BURGER_ASSETS.onion,
    accent: 'from-fuchsia-100 via-violet-50 to-white',
    buttonImageClass: 'w-14 md:w-18',
    stackImageClass: 'w-32 md:w-38',
    shortLabel: '1/8',
  },
  {
    name: 'Pickles',
    units: 1,
    asset: BURGER_ASSETS.pickles,
    accent: 'from-emerald-100 via-lime-50 to-white',
    buttonImageClass: 'w-14 md:w-18',
    stackImageClass: 'w-30 md:w-38',
    shortLabel: '1/8',
  },
  {
    name: 'Ketchup',
    units: 1,
    asset: BURGER_ASSETS.ketchup,
    accent: 'from-red-100 via-orange-50 to-white',
    buttonImageClass: 'w-14 md:w-16',
    stackImageClass: 'w-30 md:w-36',
    shortLabel: '1/8',
  },
  {
    name: 'BBQ',
    units: 1,
    asset: BURGER_ASSETS.bbq,
    accent: 'from-amber-100 via-orange-50 to-white',
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
    <div className={`relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${faceTone} shadow-[inset_0_2px_10px_rgba(255,255,255,0.6),0_12px_24px_rgba(15,23,42,0.18)] md:h-20 md:w-20`}>
      <div className="absolute left-[22px] top-[24px] h-2.5 w-2.5 rounded-full bg-slate-800 md:left-[28px] md:top-[29px]" />
      <div className="absolute right-[22px] top-[24px] h-2.5 w-2.5 rounded-full bg-slate-800 md:right-[28px] md:top-[29px]" />
      <div className={`absolute bottom-[18px] md:bottom-[22px] ${mouthClasses}`} />
    </div>
  );
};

const BurgerBuilderGame: React.FC<BurgerBuilderGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [orderTimeLeft, setOrderTimeLeft] = useState(ORDER_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRequest | null>(null);
  const [burgerStack, setBurgerStack] = useState<IngredientType[]>([]);
  const [ordersServed, setOrdersServed] = useState(0);
  const [missedCustomers, setMissedCustomers] = useState(0);
  const [streak, setStreak] = useState(0);
  const [customerMood, setCustomerMood] = useState<CustomerMood>('waiting');
  const [reaction, setReaction] = useState<CustomerReaction | null>(null);
  const [feedback, setFeedback] = useState('Build the burger to match the order exactly.');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const targetScore = SCORE_TARGET_BASE + (levelId * SCORE_TARGET_PER_LEVEL);
  const progress = Math.min((score / targetScore) * 100, 100);

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
      text: `I want a ${formatFractionSentence(targetUnits)} burger with ${ingredientText}.`,
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
      setBurgerStack([]);
      setOrderTimeLeft(ORDER_DURATION);
      setCustomerMood('waiting');
      setFeedback('Build the burger to match the order exactly.');
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
    setFeedback('Build the burger to match the order exactly.');
    setIsTransitioning(false);
    setBurgerStack([]);
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
    () => burgerStack.reduce((sum, ingredient) => sum + ingredient.units, 0),
    [burgerStack],
  );

  const usedIngredientCounts = useMemo(() => {
    const counts = new Map<string, number>();
    burgerStack.forEach(ingredient => {
      counts.set(ingredient.name, (counts.get(ingredient.name) || 0) + 1);
    });
    return counts;
  }, [burgerStack]);

  const requiredMissing = useMemo(() => {
    if (!currentOrder) return [];
    return currentOrder.requiredIngredients.filter(name => !usedIngredientCounts.has(name));
  }, [currentOrder, usedIngredientCounts]);

  const buildEquation = useMemo(() => {
    if (!burgerStack.length) return 'Tap ingredients to start your fraction stack.';
    return `${burgerStack.map(item => item.shortLabel).join(' + ')} = ${formatFractionUnits(totalUnits)}`;
  }, [burgerStack, totalUnits]);

  const orderSummary = useMemo(() => {
    if (!currentOrder) return '';
    return `${formatFractionUnits(currentOrder.targetUnits)} burger • ${currentOrder.requiredIngredients.join(' + ')}`;
  }, [currentOrder]);

  const handleIngredientAdd = (ingredient: IngredientType) => {
    if (isGameOver || isVictory || isTransitioning) return;
    if (burgerStack.length >= 14) {
      triggerHaptic('warning');
      setFeedback('That burger is towering already. Serve it or clear and rebuild.');
      return;
    }

    triggerHaptic('selection');
    setBurgerStack(prev => [...prev, ingredient]);
    setFeedback(`Added ${ingredient.name.toLowerCase()} for ${ingredient.shortLabel}.`);
  };

  const clearBurger = () => {
    if (isGameOver || isVictory || isTransitioning) return;
    triggerHaptic('light');
    setBurgerStack([]);
    setFeedback('Burger cleared. Start the order again.');
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
      setFeedback('That burger is too large. Clear it and rebuild this order.');
      return;
    }

    const uniqueIngredients = usedIngredientCounts.size;
    const layerBonus = burgerStack.length * 18;
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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffedd5_42%,#fed7aa_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <GameplaySceneBackdrop gameType="burger_builder" className="opacity-95" />
      <div className="pointer-events-none absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(rgba(251,146,60,0.55) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <img src={BURGER_ASSETS.ketchup} alt="" className="pointer-events-none absolute left-[-2%] top-[18%] w-28 opacity-20 blur-[1px] md:w-40" />
      <img src={BURGER_ASSETS.bbq} alt="" className="pointer-events-none absolute right-[-1%] bottom-[18%] w-28 opacity-18 blur-[1px] md:w-40" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Burger Bar"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={orderTimeLeft}
          progress={progress}
          accentText="text-amber-950"
          accentSoftBg="bg-orange-100/80"
          accentBorder="border-amber-200/90"
          progressBar="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300"
          statLabel="Served"
          statValue={ordersServed}
        />

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1.15fr)_minmax(0,0.88fr)] gap-2 md:gap-3 lg:grid-cols-[1.15fr_0.85fr] lg:grid-rows-1 lg:gap-4">
          <section className="relative overflow-hidden rounded-[1.7rem] border border-white/70 bg-[linear-gradient(180deg,rgba(120,53,15,0.98),rgba(146,64,14,0.92))] p-3 text-white shadow-[0_18px_42px_rgba(120,53,15,0.22)] lg:hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_46%)]" />
            <div className="relative flex items-start gap-3">
              <CustomerFace mood={customerMood} />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200/80">Burger Order</div>
                <div className="mt-1 text-base font-black text-white">{orderSummary}</div>
                <div className="mt-1 text-xs font-semibold text-amber-100/80">{feedback}</div>
              </div>
            </div>
            <div className="relative mt-3 flex items-center justify-between gap-2 rounded-[1.1rem] bg-white/12 px-3 py-2 backdrop-blur-sm">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/80">Needs</div>
                <div className="mt-1 text-xs font-black text-white">{currentOrder ? currentOrder.requiredIngredients.join(' + ') : ''}</div>
              </div>
              <div className="rounded-[0.9rem] bg-white/12 px-3 py-1.5 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/80">Patience</div>
                <div className={`mt-0.5 text-xl font-black ${orderTimeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>{orderTimeLeft}s</div>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: MAX_MISSES }).map((_, index) => (
                  <div key={index} className={`flex h-7 w-7 items-center justify-center rounded-full ${index < MAX_MISSES - missedCustomers ? 'bg-white/16' : 'bg-red-500/30'} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}>
                    <AssetIcon name="heart" className={`h-3.5 w-3.5 ${index < MAX_MISSES - missedCustomers ? '' : 'opacity-35 grayscale'}`} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="order-1 row-start-2 flex min-h-0 flex-[1.08] flex-col overflow-hidden rounded-[1.8rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,247,237,0.98))] p-2 shadow-[0_22px_52px_rgba(120,53,15,0.16)] md:rounded-[2.5rem] md:p-4 lg:order-1 lg:row-start-auto">
            <div className="mb-1.5 flex items-center justify-between gap-3 md:mb-2">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700/70 md:text-xs">Build Zone</div>
                <div className="text-sm font-black text-amber-950 md:text-xl">Stack To The Exact Fraction</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-[1.2rem] border border-amber-100 bg-white/80 p-1.5 md:gap-2 md:rounded-[1.8rem] md:p-3">
              <div className="rounded-[1.1rem] bg-amber-50 px-3 py-2 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/70">Target</div>
                <div className="mt-1 text-base font-black text-amber-950 md:text-2xl">{currentOrder ? formatFractionUnits(currentOrder.targetUnits) : '0'}</div>
              </div>
              <div className="rounded-[1.1rem] bg-orange-50 px-3 py-2 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/70">Built</div>
                <div className={`mt-1 text-base font-black md:text-2xl ${currentOrder && totalUnits > currentOrder.targetUnits ? 'text-red-500' : 'text-amber-950'}`}>{formatFractionUnits(totalUnits)}</div>
              </div>
              <div className="rounded-[1.1rem] bg-yellow-50 px-3 py-2 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/70">Layers</div>
                <div className="mt-1 text-base font-black text-amber-950 md:text-2xl">{burgerStack.length}</div>
              </div>
            </div>

            <div className="relative mt-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,237,213,0.92))] px-2 pb-2 pt-2.5 shadow-[inset_0_2px_18px_rgba(255,255,255,0.9),inset_0_-10px_20px_rgba(251,146,60,0.12)] md:mt-2 md:rounded-[2.4rem] md:px-4 md:pb-4 md:pt-3 lg:px-5">
              <div className="absolute inset-x-6 top-4 h-16 rounded-full bg-white/55 blur-2xl" />
              <div className="absolute inset-x-4 bottom-4 h-20 rounded-full bg-amber-900/8 blur-2xl" />

              <div className="rounded-[1.1rem] border border-white/70 bg-white/70 px-2.5 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/70 md:text-xs">Fraction Equation</div>
                <div className="mt-1 text-[11px] font-bold text-amber-950 md:text-base">{buildEquation}</div>
              </div>

              <div className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden pt-1.5 md:pt-4">
                <div className="absolute bottom-0 h-10 w-[72%] rounded-full bg-amber-900/15 blur-xl" />
                <div className="relative flex h-full w-full max-w-[260px] md:max-w-[420px] flex-col items-center justify-end">
                  <img src={BURGER_ASSETS.topBun} alt="Top bun" className="z-20 w-24 object-contain drop-shadow-[0_12px_18px_rgba(120,53,15,0.24)] md:w-52" draggable={false} />
                  <div className="relative -mt-1.5 flex w-full flex-1 flex-col-reverse items-center justify-start overflow-visible px-1 pb-1 pt-1 md:-mt-5">
                    <AnimatePresence initial={false}>
                      {burgerStack.map((ingredient, index) => (
                        <motion.div
                          key={`${ingredient.name}-${index}-${burgerStack.length}`}
                          initial={{ y: -18, opacity: 0, scale: 1.06 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, y: 18 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                          className={`${index === 0 ? '' : '-mt-1.5 md:-mt-5'} relative flex items-center justify-center`}
                          style={{ zIndex: index + 1 }}
                        >
                          <img
                            src={ingredient.asset}
                            alt={ingredient.name}
                            className={`${ingredient.stackImageClass} max-w-[7.25rem] md:max-w-none object-contain drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)]`}
                            draggable={false}
                          />
                          <span className="absolute -right-2 top-1 rounded-full bg-slate-950/78 px-2 py-0.5 text-[10px] font-black text-white shadow-lg md:text-xs">
                            {ingredient.shortLabel}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <img src={BURGER_ASSETS.bottomBun} alt="Bottom bun" className="relative z-30 -mt-0.5 w-24 object-contain drop-shadow-[0_14px_20px_rgba(120,53,15,0.24)] md:-mt-2 md:w-52" draggable={false} />
                </div>
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-2 md:mt-2 md:gap-3">
                <button
                  onClick={clearBurger}
                  className="flex items-center justify-center gap-2 rounded-[1rem] border border-amber-200 bg-white/90 px-3 py-2.5 text-xs font-black text-amber-950 shadow-[0_10px_18px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 md:text-base"
                  disabled={!burgerStack.length || isTransitioning}
                >
                  <AssetIcon name="refresh" className="h-4 w-4 md:h-5 md:w-5" />
                  Clear Burger
                </button>
                <button
                  onClick={handleServe}
                  className="rounded-[1rem] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-3 py-2.5 text-xs font-black text-white shadow-[0_10px_0_#166534,0_14px_26px_rgba(21,128,61,0.28)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-[0_8px_0_#166534] md:text-base"
                  disabled={!burgerStack.length || isTransitioning}
                >
                  Let&apos;s Serve
                </button>
              </div>
            </div>
          </section>

          <aside className="order-2 row-start-3 flex min-h-0 flex-[0.92] flex-col gap-2 lg:order-2 lg:row-start-auto">
            <section className="relative hidden overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(120,53,15,0.98),rgba(146,64,14,0.92))] p-3 text-white shadow-[0_22px_52px_rgba(120,53,15,0.22)] md:rounded-[2.4rem] md:p-4 lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_46%)]" />
              <div className="relative flex items-start gap-3">
                <CustomerFace mood={customerMood} />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/80 md:text-xs">Customer Order</div>
                  <div className="mt-1 text-lg font-black tracking-tight text-white md:text-2xl">Build This Burger</div>
                  <p className="mt-2 text-sm leading-5 text-amber-50/92 md:text-base">
                    {currentOrder?.text}
                  </p>
                </div>
              </div>

              <div className="relative mt-3 grid grid-cols-[1fr_auto] gap-2 rounded-[1.3rem] bg-white/12 p-3 backdrop-blur-sm">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/80">Required Ingredients</div>
                  <div className="mt-1 text-sm font-black text-white md:text-base">
                    {currentOrder ? currentOrder.requiredIngredients.join(' + ') : ''}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-amber-100/80 md:text-sm">
                    {feedback}
                  </div>
                </div>
                <div className="rounded-[1rem] bg-white/12 px-3 py-2 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/80">Patience</div>
                  <div className={`mt-1 text-2xl font-black ${orderTimeLeft <= 10 ? 'text-red-300' : 'text-white'}`}>{orderTimeLeft}s</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: MAX_MISSES }).map((_, index) => (
                    <div key={index} className={`flex h-8 w-8 items-center justify-center rounded-full ${index < MAX_MISSES - missedCustomers ? 'bg-white/16' : 'bg-red-500/30'} shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`}>
                      <AssetIcon name="heart" className={`h-4 w-4 ${index < MAX_MISSES - missedCustomers ? '' : 'opacity-35 grayscale'}`} />
                    </div>
                  ))}
                </div>
                <div className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-amber-100 md:text-sm">
                  Streak {streak}
                </div>
              </div>

              <AnimatePresence>
                {reaction && (
                  <motion.div
                    key={`${reaction.mood}-${reaction.text}`}
                    initial={{ opacity: 0, y: -12, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.96 }}
                    className={`absolute right-3 top-3 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] shadow-lg ${
                      reaction.mood === 'happy' ? 'bg-lime-300 text-emerald-950' : 'bg-rose-300 text-rose-950'
                    }`}
                  >
                    {reaction.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.7rem] border border-white/70 bg-white/80 p-2 shadow-[0_22px_52px_rgba(15,23,42,0.12)] backdrop-blur-md md:rounded-[2.4rem] md:p-4">
              <div className="mb-2 flex items-center justify-between gap-3 md:mb-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-700/70 md:text-xs">Ingredients</div>
                  <div className="text-sm font-black text-amber-950 md:text-xl">Tap To Build</div>
                </div>
                <div className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 md:block">
                  Higher layers = higher score
                </div>
              </div>

              <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-5 gap-1.5 md:grid-cols-3 md:gap-3 xl:grid-cols-3">
                {INGREDIENT_TYPES.map(ingredient => (
                  <motion.button
                    key={ingredient.name}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleIngredientAdd(ingredient)}
                    className={`flex min-h-[58px] flex-col items-center justify-center rounded-[0.95rem] border border-white/70 bg-gradient-to-br ${ingredient.accent} px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_18px_rgba(15,23,42,0.08)] md:min-h-[110px] md:rounded-[1.6rem] md:px-2 md:py-2`}
                  >
                    <img src={ingredient.asset} alt={ingredient.name} className={`${ingredient.buttonImageClass} max-w-[2.75rem] md:max-w-none object-contain drop-shadow-[0_8px_10px_rgba(15,23,42,0.16)]`} draggable={false} />
                    <div className="mt-1 text-center">
                      <div className="text-[8px] font-black leading-none text-amber-950 md:text-sm">{ingredient.name}</div>
                      <div className="mt-0.5 rounded-full bg-white/88 px-1.5 py-0.5 text-[8px] font-black text-amber-900 shadow-sm md:mt-1 md:px-2 md:text-xs">
                        {ingredient.shortLabel}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-amber-950" />

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
                    {isVictory ? 'You hit the score target and kept the orders moving.' : 'Too many customers left before their burger was ready.'}
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

                <button onClick={onBack} className="licensed-submit-button w-full rounded-2xl py-4 text-xl font-black text-white transition-all">
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

export default BurgerBuilderGame;
