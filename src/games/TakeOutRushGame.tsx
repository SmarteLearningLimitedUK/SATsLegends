import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import takeOutLevelBg from '../assets/level_backgrounds/take_out.png';
import food1 from '../assets/take_out/food/1.png';
import food2 from '../assets/take_out/food/2.png';
import food3 from '../assets/take_out/food/3.png';
import food4 from '../assets/take_out/food/4.png';
import food5 from '../assets/take_out/food/5.png';
import food6 from '../assets/take_out/food/6.png';
import food7 from '../assets/take_out/food/7.png';
import food8 from '../assets/take_out/food/8.png';
import food9 from '../assets/take_out/food/9.png';
import GameActionDock from '../components/GameActionDock';
import FoodGameShell from '../components/FoodGameShell';
import { triggerHaptic } from '../haptics';

interface TakeOutRushGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface Fraction {
  n: number;
  d: number;
}

type ConstraintKind = 'ban' | 'min_items';

interface OrderConstraint {
  kind: ConstraintKind;
  itemId?: string;
  minItems?: number;
}

interface TakeOutOrder {
  id: string;
  target: Fraction;
  constraints: OrderConstraint[];
  stage: number;
  text: string;
  rushTag?: string;
}

interface FoodItem {
  id: string;
  name: string;
  image: string;
  value: Fraction;
  colorClass: string;
}

interface FeedbackState {
  tone: 'success' | 'error' | 'info';
  text: string;
}

const ROUND_DURATION_SECONDS = 90;
const AUTO_VALIDATE_DELAY_MS = 140;

const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'burger_meal',
    name: 'Burger Meal',
    image: food1,
    value: { n: 1, d: 4 },
    colorClass: 'from-amber-300 to-orange-400',
  },
  {
    id: 'ribs_plate',
    name: 'Ribs Plate',
    image: food2,
    value: { n: 1, d: 3 },
    colorClass: 'from-orange-300 to-amber-500',
  },
  {
    id: 'berry_dessert',
    name: 'Berry Dessert',
    image: food3,
    value: { n: 1, d: 8 },
    colorClass: 'from-rose-300 to-pink-400',
  },
  {
    id: 'salad_bowl',
    name: 'Salad Bowl',
    image: food4,
    value: { n: 1, d: 6 },
    colorClass: 'from-emerald-300 to-lime-400',
  },
  {
    id: 'rice_bowl',
    name: 'Rice Bowl',
    image: food5,
    value: { n: 1, d: 2 },
    colorClass: 'from-sky-300 to-cyan-400',
  },
  {
    id: 'pizza_slice',
    name: 'Pizza Slice',
    image: food6,
    value: { n: 1, d: 4 },
    colorClass: 'from-amber-300 to-orange-400',
  },
  {
    id: 'hotdog_combo',
    name: 'Hotdog Combo',
    image: food7,
    value: { n: 1, d: 6 },
    colorClass: 'from-yellow-300 to-amber-400',
  },
  {
    id: 'roast_chicken',
    name: 'Roast Chicken',
    image: food8,
    value: { n: 1, d: 6 },
    colorClass: 'from-orange-300 to-amber-500',
  },
  {
    id: 'fries',
    name: 'Fries',
    image: food9,
    value: { n: 1, d: 8 },
    colorClass: 'from-yellow-300 to-amber-400',
  },
];

const ITEM_BY_ID: Record<string, FoodItem> = FOOD_ITEMS.reduce<Record<string, FoodItem>>((map, item) => {
  map[item.id] = item;
  return map;
}, {});

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

const normalize = (fraction: Fraction): Fraction => {
  if (fraction.d === 0) return { n: 0, d: 1 };
  const sign = fraction.d < 0 ? -1 : 1;
  const n = fraction.n * sign;
  const d = Math.abs(fraction.d);
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
};

const addFractions = (a: Fraction, b: Fraction): Fraction => {
  return normalize({ n: (a.n * b.d) + (b.n * a.d), d: a.d * b.d });
};

const compareFractions = (a: Fraction, b: Fraction): number => {
  return (a.n * b.d) - (b.n * a.d);
};

const equalFractions = (a: Fraction, b: Fraction): boolean => compareFractions(a, b) === 0;

const asDisplayFraction = (fraction: Fraction): string => {
  const reduced = normalize(fraction);
  if (reduced.d === 1) return `${reduced.n}`;
  const whole = Math.trunc(reduced.n / reduced.d);
  const remainder = Math.abs(reduced.n % reduced.d);
  if (whole > 0 && remainder > 0) {
    const remainderReduced = normalize({ n: remainder, d: reduced.d });
    return `${whole} ${remainderReduced.n}/${remainderReduced.d}`;
  }
  return `${reduced.n}/${reduced.d}`;
};

const fractionToNumber = (fraction: Fraction): number => {
  const reduced = normalize(fraction);
  return reduced.n / reduced.d;
};

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const stageFromProgress = (baseLevel: number, ordersServed: number, timeLeft: number): number => {
  const servedRamp = Math.floor(ordersServed / 3);
  const base = Math.max(1, Math.min(12, baseLevel + servedRamp));
  if (timeLeft <= 30) return Math.min(12, base + 1);
  return base;
};

const allowedIdsByStage = (stage: number): string[] => {
  if (stage <= 3) {
    return ['rice_bowl', 'pizza_slice', 'fries', 'burger_meal'];
  }
  if (stage <= 7) {
    return ['rice_bowl', 'pizza_slice', 'fries', 'salad_bowl', 'hotdog_combo', 'roast_chicken', 'berry_dessert'];
  }
  return FOOD_ITEMS.map((item) => item.id);
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildOrderText = (target: Fraction): string => {
  return `Pack exactly ${asDisplayFraction(target)} of a tray.`;
};

const generateOrder = (stage: number): TakeOutOrder => {
  const maxAttempts = 220;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pool = allowedIdsByStage(stage);

    let bannedItemId: string | undefined;
    if (stage >= 5 && Math.random() < 0.44 && pool.length >= 5) {
      bannedItemId = pick(pool);
    }

    const allowedIds = pool.filter((id) => id !== bannedItemId);
    if (allowedIds.length < 2) continue;

    const minItems = stage >= 8 ? 3 : stage >= 5 ? 2 : 1;
    const maxItems = stage >= 9 ? 6 : stage >= 5 ? 5 : 4;
    const itemCount = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;

    const selectionIds = Array.from({ length: itemCount }, () => pick(allowedIds));

    let target = normalize({ n: 0, d: 1 });
    selectionIds.forEach((id) => {
      target = addFractions(target, ITEM_BY_ID[id].value);
    });

    if (compareFractions(target, { n: 0, d: 1 }) <= 0) continue;
    if (compareFractions(target, { n: 1, d: 1 }) > 0) continue;

    const hasVariety = new Set(selectionIds).size >= (stage >= 6 ? 2 : 1);
    if (!hasVariety) continue;

    const constraints: OrderConstraint[] = [];
    if (bannedItemId) {
      constraints.push({ kind: 'ban', itemId: bannedItemId });
    }
    if (minItems > 1) {
      constraints.push({ kind: 'min_items', minItems });
    }

    return {
      id: makeId(),
      target,
      constraints,
      stage,
      text: buildOrderText(target),
      rushTag: stage >= 8 ? 'Rush Order' : undefined,
    };
  }

  return {
    id: makeId(),
    target: { n: 3, d: 4 },
    constraints: [{ kind: 'min_items', minItems: 2 }],
    stage,
    text: 'Pack exactly 3/4 of a tray.',
  };
};

const starsForPerformance = (XP: number, correct: number, incorrect: number): number => {
  const total = Math.max(1, correct + incorrect);
  const accuracy = correct / total;

  if (XP >= 2600 && correct >= 10 && accuracy >= 0.8) return 3;
  if (XP >= 1500 && correct >= 6 && accuracy >= 0.6) return 2;
  return 1;
};

const FoodSprite: React.FC<{
  item: FoodItem;
  className?: string;
}> = ({ item, className }) => (
  <img
    src={item.image}
    alt=""
    aria-hidden="true"
    className={className}
    draggable={false}
  />
);

const TakeOutRushGame: React.FC<TakeOutRushGameProps> = ({
  levelId,
  miniGameLevel,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const baseLevel = Math.max(1, Math.min(12, miniGameLevel || levelId || 1));

  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [ordersServed, setOrdersServed] = useState(0);
  const [wrongOrders, setWrongOrders] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const [orderStartMs, setOrderStartMs] = useState<number>(() => Date.now());
  const [roundFinished, setRoundFinished] = useState(false);

  const [order, setOrder] = useState<TakeOutOrder>(() => generateOrder(stageFromProgress(baseLevel, 0, ROUND_DURATION_SECONDS)));

  const autoValidateTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const roundFinishedRef = useRef(false);

  const clearTimers = () => {
    if (autoValidateTimeoutRef.current !== null) {
      window.clearTimeout(autoValidateTimeoutRef.current);
      autoValidateTimeoutRef.current = null;
    }
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (roundFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [roundFinished]);

  useEffect(() => {
    if (timeLeft > 0 || roundFinishedRef.current) return;

    roundFinishedRef.current = true;
    setRoundFinished(true);
    const stars = starsForPerformance(XP, ordersServed, wrongOrders);
    onVictory(stars, XP);
  }, [onVictory, ordersServed, XP, timeLeft, wrongOrders]);

  const activeConstraints = useMemo(() => {
    const bannedIds = new Set(
      order.constraints
        .filter((constraint) => constraint.kind === 'ban' && constraint.itemId)
        .map((constraint) => constraint.itemId as string),
    );

    const minItems = order.constraints
      .filter((constraint) => constraint.kind === 'min_items')
      .reduce((max, constraint) => Math.max(max, constraint.minItems || 0), 0);

    return {
      bannedIds,
      minItems,
    };
  }, [order.constraints]);

  const selectedItems = useMemo(() => selectedIds.map((id) => ITEM_BY_ID[id]).filter(Boolean), [selectedIds]);

  const runningTotal = useMemo(() => {
    return selectedItems.reduce<Fraction>((sum, item) => addFractions(sum, item.value), { n: 0, d: 1 });
  }, [selectedItems]);

  const runningRatio = useMemo(() => {
    const target = fractionToNumber(order.target);
    const total = fractionToNumber(runningTotal);
    if (target <= 0) return 0;
    return total / target;
  }, [order.target, runningTotal]);

  const isExact = useMemo(() => equalFractions(runningTotal, order.target), [order.target, runningTotal]);

  const constraintsMet = useMemo(() => {
    if (activeConstraints.minItems > 0 && selectedIds.length < activeConstraints.minItems) {
      return false;
    }
    const hasBanned = selectedIds.some((id) => activeConstraints.bannedIds.has(id));
    if (hasBanned) return false;
    return true;
  }, [activeConstraints.bannedIds, activeConstraints.minItems, selectedIds]);

  const canSubmit = selectedIds.length > 0 && !isResolvingOrder && !roundFinished;

  const nextOrder = useCallback((servedCount: number, nextTimeLeft: number) => {
    const stage = stageFromProgress(baseLevel, servedCount, nextTimeLeft);
    setOrder(generateOrder(stage));
    setSelectedIds([]);
    setOrderStartMs(Date.now());
  }, [baseLevel]);

  const resolveCorrectOrder = useCallback(() => {
    const now = Date.now();
    const orderSolveMs = Math.max(350, now - orderStartMs);
    const stageBonus = order.stage * 16;
    const itemBonus = selectedIds.length * 14;
    const speedBonus = Math.max(30, Math.round(220 - (orderSolveMs / 70)));
    const streakBonus = Combo * 22;
    const points = 120 + stageBonus + itemBonus + speedBonus + streakBonus;

    triggerHaptic('success');
    setShowSuccessBurst(true);
    setScore((prev) => prev + points);
    setOrdersServed((prev) => prev + 1);
    setStreak((prev) => prev + 1);
    setFeedback({ tone: 'success', text: `Order perfect! +${points}` });

    confetti({
      particleCount: 64,
      spread: 46,
      origin: { y: 0.72 },
      colors: ['#fde68a', '#fb923c', '#ffffff', '#60a5fa'],
    });

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      setShowSuccessBurst(false);
      nextOrder(ordersServed + 1, timeLeft);
      setIsResolvingOrder(false);
    }, 320);
  }, [nextOrder, order.stage, orderStartMs, ordersServed, selectedIds.length, Combo, timeLeft]);

  const resolveIncorrectOrder = useCallback(() => {
    triggerHaptic('warning');
    setWrongOrders((prev) => prev + 1);
    setStreak(0);
    setScore((prev) => Math.max(0, prev - 24));
    setFeedback({ tone: 'error', text: `Try again. Target is ${asDisplayFraction(order.target)}.` });

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 520);
  }, [order.target]);

  const submitOrder = useCallback((fromAuto = false) => {
    if (isResolvingOrder || roundFinished) return;
    setIsResolvingOrder(true);

    const valid = isExact && constraintsMet;
    if (valid) {
      resolveCorrectOrder();
      return;
    } else {
      resolveIncorrectOrder();
      if (!fromAuto) {
        // Keep current selection so the learner can fix quickly.
      }
    }

    window.setTimeout(() => {
      setIsResolvingOrder(false);
    }, 170);
  }, [constraintsMet, isExact, isResolvingOrder, resolveCorrectOrder, resolveIncorrectOrder, roundFinished]);

  useEffect(() => {
    if (roundFinished || isResolvingOrder) return;
    if (!isExact || !constraintsMet) return;

    if (autoValidateTimeoutRef.current !== null) {
      window.clearTimeout(autoValidateTimeoutRef.current);
    }

    autoValidateTimeoutRef.current = window.setTimeout(() => {
      submitOrder(true);
    }, AUTO_VALIDATE_DELAY_MS);

    return () => {
      if (autoValidateTimeoutRef.current !== null) {
        window.clearTimeout(autoValidateTimeoutRef.current);
        autoValidateTimeoutRef.current = null;
      }
    };
  }, [constraintsMet, isExact, isResolvingOrder, roundFinished, submitOrder]);

  const addItem = (itemId: string) => {
    if (roundFinished || isResolvingOrder) return;

    if (activeConstraints.bannedIds.has(itemId)) {
      triggerHaptic('warning');
      setFeedback({ tone: 'error', text: `${ITEM_BY_ID[itemId].name} is blocked for this order.` });
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = window.setTimeout(() => setFeedback(null), 520);
      return;
    }

    triggerHaptic('selection');
    setSelectedIds((prev) => [...prev, itemId]);
  };

  const removeSelectedItem = (index: number) => {
    if (roundFinished || isResolvingOrder) return;
    triggerHaptic('light');
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
  };

  const clearTray = () => {
    if (roundFinished || isResolvingOrder) return;
    triggerHaptic('light');
    setSelectedIds([]);
  };

  const timerProgress = Math.max(0, Math.min(1, timeLeft / ROUND_DURATION_SECONDS));

  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const customerVisuals = useMemo(() => {
    const seeded = [...FOOD_ITEMS].sort((a, b) => `${order.id}-${a.id}`.localeCompare(`${order.id}-${b.id}`));
    return shuffle(seeded).slice(0, 3);
  }, [order.id]);

  const topOffsetClass = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.45rem)]'
    : 'pt-[max(0.2rem,env(safe-area-inset-top))]';

  return (
    <FoodGameShell gameType="take_out_rush" backgroundImage={takeOutLevelBg}>
      <div className={`relative z-20 flex min-h-0 flex-1 flex-col ${topOffsetClass}`}>
        {!useSharedTopHud ? (
          <header className="rounded-[1.25rem] border border-cyan-100/20 bg-slate-950/58 px-3 py-2.5 shadow-[0_12px_22px_rgba(2,6,23,0.46)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/75">Rush Timer</div>
                <div className="relative mt-1 h-3.5 overflow-hidden rounded-full border border-cyan-100/26 bg-blue-950/58">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{ boxShadow: '0 0 12px rgba(34,197,94,0.45)' }}
                  />
                  <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                </div>
              </div>

              <div className="rounded-full border border-white/18 bg-slate-900/54 px-3 py-1 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/65">XP</div>
                <div className="text-sm font-black text-white">{XP}</div>
              </div>

              <div className="rounded-full border border-white/18 bg-slate-900/54 px-3 py-1 text-center">
                <div className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/65">Combo</div>
                <div className="text-sm font-black text-amber-200">x{Combo}</div>
              </div>
            </div>
          </header>
        ) : null}

        <main className="relative mt-1.5 flex min-h-0 flex-1 flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+3.9rem)]">
          <section className="shrink-0 rounded-[1.25rem] border border-cyan-100/22 bg-slate-950/58 p-2.5 shadow-[0_10px_22px_rgba(2,6,23,0.42)]">
            <div className="grid grid-cols-3 gap-2">
              {customerVisuals.map((item, idx) => (
                <div key={`${order.id}-${item.id}-${idx}`} className="rounded-[0.95rem] border border-amber-100/28 bg-slate-900/58 p-1.5 text-center">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/72">Order {idx + 1}</div>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <FoodSprite item={item} className="h-10 w-10 rounded-full bg-slate-800/45 ring-1 ring-white/20" />
                    <span className="text-sm font-black text-amber-200">↑</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/76">Current Order</div>
                <div className="mt-0.5 text-[clamp(0.95rem,3.9vw,1.2rem)] font-black text-white">
                  Target: {asDisplayFraction(order.target)}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-100/86">{order.text}</div>
              </div>
              {order.rushTag ? (
                <div className="shrink-0 rounded-full border border-amber-100/45 bg-amber-300/24 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                  {order.rushTag}
                </div>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {order.constraints.length === 0 ? (
                <span className="rounded-full border border-emerald-100/45 bg-emerald-400/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                  No restrictions
                </span>
              ) : (
                order.constraints.map((constraint, idx) => {
                  if (constraint.kind === 'ban' && constraint.itemId) {
                    const blocked = ITEM_BY_ID[constraint.itemId];
                    return (
                      <span key={`ban-${constraint.itemId}-${idx}`} className="rounded-full border border-rose-100/45 bg-rose-400/24 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                        No {blocked.name}
                      </span>
                    );
                  }

                  return (
                    <span key={`min-${idx}`} className="rounded-full border border-cyan-100/40 bg-cyan-400/22 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                      Use at least {constraint.minItems} items
                    </span>
                  );
                })
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-[0.95rem] border border-cyan-100/20 bg-blue-950/46 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">Running Total</div>
                <div className="mt-1 text-xl font-black text-amber-100">{asDisplayFraction(runningTotal)}</div>
              </div>
              <div className="rounded-[0.95rem] border border-cyan-100/20 bg-blue-950/46 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/72">Orders Served</div>
                <div className="mt-1 text-xl font-black text-white">{ordersServed}</div>
              </div>
            </div>

            <div className="mt-2.5 h-3.5 overflow-hidden rounded-full border border-white/18 bg-blue-950/52">
              <div
                className={`h-full transition-all ${runningRatio > 1 ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, runningRatio * 100))}%` }}
              />
            </div>
          </section>

          <section className="shrink-0 rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/54 p-2">
            <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/75">Order Tray</span>
                <button
                  type="button"
                  onClick={clearTray}
                  className="rounded-full border border-white/20 bg-slate-900/56 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white"
                >
                  Clear
                </button>
              </div>

            <div className="flex min-h-[3.25rem] flex-wrap items-center gap-1.5 rounded-[0.9rem] border border-amber-100/20 bg-amber-100/10 p-1.5">
                {selectedItems.length === 0 ? (
                  <span className="px-2 text-xs font-semibold text-slate-200/78">Tap foods below to pack the order.</span>
                ) : (
                  selectedItems.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.id}-${index}`}
                      onClick={() => removeSelectedItem(index)}
                      className={`flex items-center gap-1 rounded-full border border-white/20 bg-gradient-to-r ${item.colorClass} px-2 py-1 text-[10px] font-black text-slate-950 shadow-[0_6px_12px_rgba(2,6,23,0.26)]`}
                    >
                      <FoodSprite item={item} className="h-4 w-4 rounded-full ring-1 ring-white/35" />
                      <span>{asDisplayFraction(item.value)}</span>
                    </button>
                  ))
                )}
            </div>

            <button
              type="button"
              onClick={() => submitOrder(false)}
              disabled={!canSubmit}
              className="mt-2 h-11 w-full rounded-[1rem] border border-amber-100/65 bg-[linear-gradient(180deg,#f8d877_0%,#f5b429_100%)] text-sm font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_10px_18px_rgba(2,6,23,0.34)] transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Submit Order
            </button>
          </section>

          <section className="min-h-0 flex-1 rounded-[1.2rem] border border-cyan-100/20 bg-slate-950/54 p-2">
              <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/76">Food Station</div>
              <div className="grid grid-cols-4 gap-1.5">
                {FOOD_ITEMS.map((item) => {
                  const blocked = activeConstraints.bannedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      disabled={blocked || roundFinished}
                      className={`relative overflow-hidden rounded-[1rem] border p-2 transition ${
                        blocked
                          ? 'border-rose-200/45 bg-rose-500/22 opacity-60'
                          : 'border-cyan-100/25 bg-blue-950/42 hover:brightness-110'
                      }`}
                    >
                      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/14">
                        <FoodSprite item={item} className="h-7 w-7 rounded-full ring-1 ring-white/35" />
                      </div>
                      <div className="line-clamp-1 text-[9px] font-black leading-tight text-white">{item.name}</div>
                      <div className="mt-0.5 text-[10px] font-black text-amber-200">{asDisplayFraction(item.value)}</div>
                      {blocked ? (
                        <div className="absolute right-1 top-1 rounded-full bg-rose-300/85 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-rose-950">
                          Ban
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
          </section>
        </main>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.11em] shadow-[0_12px_22px_rgba(2,6,23,0.45)] ${
              feedback.tone === 'success'
                ? 'border-emerald-100/65 bg-emerald-500/28 text-emerald-50'
                : feedback.tone === 'error'
                  ? 'border-rose-100/65 bg-rose-500/30 text-rose-50'
                  : 'border-cyan-100/65 bg-cyan-500/25 text-cyan-50'
            }`}
          >
            {feedback.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessBurst ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30"
          >
            <motion.div
              initial={{ opacity: 0.2, scale: 0.9 }}
              animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.9, 1.04, 0.94] }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.24),rgba(14,116,144,0.06)_45%,transparent_72%)]"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact accentClass="text-slate-100" />
        </div>
      </div>
    </FoodGameShell>
  );
};

export default TakeOutRushGame;
