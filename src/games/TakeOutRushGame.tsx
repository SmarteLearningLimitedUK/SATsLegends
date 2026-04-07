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
import FoodGameShell from '../components/FoodGameShell';
import targetOrderBoard from '../assets/Target Order.png';
import defaultMonster from '../assets/bosses/goblin.png';
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

const loadSortedImages = (record: Record<string, string>) => (
  Object.entries(record)
    .sort(([a], [b]) => {
      const anum = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const bnum = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return anum - bnum;
    })
    .map(([, value]) => value)
);

const takeOutMonsterImages = loadSortedImages(
  import.meta.glob('../assets/take_out/monsters/*.png', { eager: true, import: 'default' }) as Record<string, string>,
);

const MONSTER_IMAGES = [defaultMonster, ...takeOutMonsterImages];

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
  return `Target fraction: ${asDisplayFraction(target)}.`;
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
    text: 'Target fraction: 3/4.',
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

  const topOffsetClass = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.45rem)]'
    : 'pt-[max(0.2rem,env(safe-area-inset-top))]';

  const availableItems = useMemo(
    () => allowedIdsByStage(order.stage).map((id) => ITEM_BY_ID[id]).filter(Boolean),
    [order.stage],
  );
  const orderMonster = useMemo(() => pick(MONSTER_IMAGES), [order.id]);

  return (
    <FoodGameShell
      gameType="take_out_rush"
      backgroundImage={takeOutLevelBg}
      overlayDisabled
      backgroundOpacity={0.88}
    >
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

            </div>
          </header>
        ) : null}

        <main className="relative mt-1.5 flex min-h-0 flex-1 flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+3.9rem)]">
          <section className="relative flex min-h-[16rem] flex-1 items-start justify-center">
            <div className="absolute left-1/2 top-[6%] w-[min(88vw,20rem)] -translate-x-1/2">
              <div className="relative">
                <img
                  src={targetOrderBoard}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none h-auto w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-x-[12%] top-[9%] h-[26%] rounded-[0.75rem] bg-black/85" />
                <div className="absolute inset-x-[16%] top-[14%] text-center text-white">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90 drop-shadow-[0_2px_6px_rgba(2,6,23,0.6)]">
                    Target Order
                  </div>
                  <div className="mt-1 text-[clamp(1.2rem,5vw,1.7rem)] font-black text-amber-100 drop-shadow-[0_2px_8px_rgba(2,6,23,0.7)]">
                    {asDisplayFraction(order.target)}
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute left-1/2 bottom-[6%] w-[min(58vw,15rem)] -translate-x-1/2">
              <img
                src={orderMonster}
                alt=""
                draggable={false}
                className="h-auto w-full object-contain drop-shadow-[0_12px_22px_rgba(2,6,23,0.45)]"
              />
            </div>
          </section>

          <div className="h-2" />

          <div className="flex flex-col gap-2">
            <section className="rounded-[1.25rem] p-2 -mt-6">
              <div className="mt-1 grid grid-cols-5 items-center justify-center gap-2">
                {availableItems.map((item) => {
                  const isBanned = activeConstraints.bannedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addItem(item.id)}
                      disabled={isResolvingOrder || roundFinished || isBanned}
                      className={`group flex flex-col items-center justify-center rounded-[0.9rem] border border-white/12 px-2.5 py-2 text-[10px] font-semibold text-white shadow-[0_10px_18px_rgba(0,0,0,0.28)] transition hover:border-white/30 disabled:opacity-50 ${isBanned ? 'bg-slate-900/40 grayscale' : 'bg-slate-950/70'}`}
                    >
                      <FoodSprite item={item} className="h-10 w-10 object-contain" />
                      <div className="mt-1 text-[10px] font-black text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                        {asDisplayFraction(item.value)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[1.25rem] border border-cyan-100/20 bg-slate-950/55 px-3 py-2 shadow-[0_12px_22px_rgba(2,6,23,0.46)]">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] font-semibold text-cyan-100/70">
                  {feedback?.text ?? (isExact && constraintsMet ? 'Ready to send!' : '')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearTray}
                    disabled={selectedIds.length === 0 || isResolvingOrder}
                    className="rounded-full border border-white/18 bg-slate-900/54 px-3 py-2 text-[10px] font-black uppercase text-cyan-100/80 transition disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => submitOrder(false)}
                    disabled={!canSubmit}
                    className="rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_10px_18px_rgba(251,146,60,0.4)] transition disabled:opacity-50"
                  >
                    Send Order
                  </button>
                </div>
              </div>
            </section>
          </div>

          <AnimatePresence>
            {showSuccessBurst ? (
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-[2rem] border border-amber-200/40 bg-amber-100/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            ) : null}
          </AnimatePresence>
        </main>
      </div>
    </FoodGameShell>
  );
};

export default TakeOutRushGame;



