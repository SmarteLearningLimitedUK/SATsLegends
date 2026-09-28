import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import takeOutLevelBg from '../assets/maps/teen/restaurant-rush.webp';
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
import { triggerHaptic } from '../haptics';
import CelebrationSplash from '../components/CelebrationSplash';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './take-out-rush.css';

interface TakeOutRushGameProps extends MiniGameShellContractProps {
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
  trayItemIds: string[];
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

const MONSTER_IMAGES = takeOutMonsterImages;

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

const stageFromProgress = (baseLevel: number, _ordersServed: number, _timeLeft: number): number => Math.max(1, Math.min(5, baseLevel));

const allowedIdsByStage = (stage: number): string[] => {
  if (stage === 1) return ['rice_bowl', 'burger_meal', 'pizza_slice'];
  if (stage === 2) {
    return ['rice_bowl', 'pizza_slice', 'fries', 'burger_meal'];
  }
  if (stage === 3) {
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
    const shuffledPool = shuffle(pool);

    let bannedItemId: string | undefined;
    if (stage >= 4 && Math.random() < (stage === 5 ? 0.7 : 0.44) && pool.length >= 5) {
      bannedItemId = pick(pool);
    }

    const trayIds = shuffledPool.filter((id) => id !== bannedItemId);
    const traySize = Math.min(stage === 1 ? 3 : stage === 2 ? 4 : 5, trayIds.length);
    const trayItemIds = trayIds.slice(0, traySize);
    if (trayItemIds.length < 2) continue;

    const minItems = stage === 5 ? 3 : stage >= 3 ? 2 : 1;
    const maxItems = stage === 1 ? 2 : stage === 2 ? 4 : stage === 3 ? 4 : stage === 4 ? 5 : 6;
    const itemCount = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;

    const selectionIds = Array.from({ length: itemCount }, () => pick(trayItemIds));

    let target = normalize({ n: 0, d: 1 });
    selectionIds.forEach((id) => {
      target = addFractions(target, ITEM_BY_ID[id].value);
    });

    if (compareFractions(target, { n: 0, d: 1 }) <= 0) continue;
    if (compareFractions(target, { n: 1, d: 1 }) > 0) continue;

    const hasVariety = new Set(selectionIds).size >= (stage >= 3 ? 2 : 1);
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
      trayItemIds,
      rushTag: stage === 5 ? 'Rush Order' : undefined,
    };
  }

  return {
    id: makeId(),
    target: { n: 3, d: 4 },
    constraints: [{ kind: 'min_items', minItems: 2 }],
    stage,
    text: 'Target fraction: 3/4.',
    trayItemIds: ['rice_bowl', 'pizza_slice', 'fries', 'burger_meal'],
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
  sessionEvents,
  sessionState,
  isPractice,
}) => {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const baseLevel = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));

  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [ordersServed, setOrdersServed] = useState(0);
  const [wrongOrders, setWrongOrders] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [orderStartMs, setOrderStartMs] = useState<number>(() => Date.now());
  const [roundFinished, setRoundFinished] = useState(false);

  const [order, setOrder] = useState<TakeOutOrder>(() => generateOrder(stageFromProgress(baseLevel, 0, ROUND_DURATION_SECONDS)));

  const autoValidateTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const shiftTimerRef = useRef<number | null>(null);
  const roundFinishedRef = useRef(false);
  const resolvingOrderRef = useRef(false);
  const unlockTimeoutRef = useRef<number | null>(null);
  const selectedIdsRef = useRef<string[]>([]);
  const performanceRef = useRef({ XP: 0, served: 0, wrong: 0, combo: 0 });
  const pausedSinceRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const orderPauseBaselineRef = useRef(0);
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;
  const observedPositiveLifeRef = useRef(Boolean(sessionState && sessionState.lives > 0));
  const sharedLivesBlocked = Boolean(sessionState && !isPractice && sessionState.lives <= 0);

  const pausedDurationAt = useCallback((now: number) => pausedDurationRef.current
    + (pausedSinceRef.current === null ? 0 : Math.max(0, now - pausedSinceRef.current)), []);

  const clearTimers = () => {
    if (shiftTimerRef.current !== null) {
      window.clearInterval(shiftTimerRef.current);
      shiftTimerRef.current = null;
    }
    if (unlockTimeoutRef.current !== null) {
      window.clearTimeout(unlockTimeoutRef.current);
      unlockTimeoutRef.current = null;
    }
    if (autoValidateTimeoutRef.current !== null) {
      window.clearTimeout(autoValidateTimeoutRef.current);
      autoValidateTimeoutRef.current = null;
    }
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  // The outgoing screen remains mounted while AnimatePresence finishes its exit.
  useLayoutEffect(() => {
    if (isPresent) return;
    roundFinishedRef.current = true;
    resolvingOrderRef.current = true;
    clearTimers();
  }, [isPresent]);

  useLayoutEffect(() => {
    const now = Date.now();
    if (isPresent && !roundFinished && sessionState?.paused) {
      if (pausedSinceRef.current === null) pausedSinceRef.current = now;
      return;
    }
    if (pausedSinceRef.current !== null) {
      pausedDurationRef.current += Math.max(0, now - pausedSinceRef.current);
      pausedSinceRef.current = null;
    }
  }, [isPresent, roundFinished, sessionState?.paused]);

  useEffect(() => {
    roundFinishedRef.current = !presentRef.current;
    resolvingOrderRef.current = !presentRef.current;
    return () => {
      roundFinishedRef.current = true;
      resolvingOrderRef.current = true;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!isPresent || roundFinished || sessionState?.paused) return undefined;
    const timerId = window.setInterval(() => {
      if (!presentRef.current || roundFinishedRef.current) return;
      setTimeLeft((prev) => {
        if (!presentRef.current || roundFinishedRef.current) return prev;
        if (prev <= 1) {
          window.clearInterval(timerId);
          if (shiftTimerRef.current === timerId) shiftTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    shiftTimerRef.current = timerId;

    return () => {
      window.clearInterval(timerId);
      if (shiftTimerRef.current === timerId) shiftTimerRef.current = null;
    };
  }, [isPresent, roundFinished, sessionState?.paused]);

  useEffect(() => {
    if (!presentRef.current) return;
    if (sessionState && sessionState.lives > 0) {
      observedPositiveLifeRef.current = true;
      return;
    }
    if (!sessionState || isPractice || !observedPositiveLifeRef.current || roundFinishedRef.current) return;
    roundFinishedRef.current = true;
    resolvingOrderRef.current = true;
    clearTimers();
    setRoundFinished(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: performanceRef.current.XP, reason: 'lives' });
  }, [isPractice, isPresent, sessionEvents, sessionState?.lives]);

  useEffect(() => {
    if (!presentRef.current || timeLeft > 0 || roundFinishedRef.current || sessionState?.paused) return;

    roundFinishedRef.current = true;
    clearTimers();
    setRoundFinished(true);
    const result = performanceRef.current;
    const stars = starsForPerformance(result.XP, result.served, result.wrong);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: result.XP, stars });
    onVictoryRef.current(stars, result.XP);
  }, [isPresent, sessionEvents, sessionState?.paused, timeLeft]);

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

  const canSubmit = isPresent && selectedIds.length > 0 && !isResolvingOrder && !roundFinished && !sharedLivesBlocked;

  const nextOrder = useCallback((servedCount: number, nextTimeLeft: number) => {
    if (!presentRef.current || roundFinishedRef.current) return;
    const now = Date.now();
    // If the next ticket arrives during Help, count only its own pause overlap.
    orderPauseBaselineRef.current = pausedDurationAt(now);
    const stage = stageFromProgress(baseLevel, servedCount, nextTimeLeft);
    setOrder(generateOrder(stage));
    selectedIdsRef.current = [];
    setSelectedIds([]);
    setOrderStartMs(now);
  }, [baseLevel, pausedDurationAt]);

  const resolveCorrectOrder = useCallback(() => {
    if (!presentRef.current || roundFinishedRef.current) return;
    const now = Date.now();
    const pausedOrderMs = Math.max(0, pausedDurationAt(now) - orderPauseBaselineRef.current);
    const orderSolveMs = Math.max(350, now - orderStartMs - pausedOrderMs);
    const stageBonus = order.stage * 16;
    const itemBonus = selectedIdsRef.current.length * 14;
    const speedBonus = Math.max(30, Math.round(220 - (orderSolveMs / 70)));
    const streakBonus = performanceRef.current.combo * 22;
    const points = 120 + stageBonus + itemBonus + speedBonus + streakBonus;
    const nextPerformance = {
      ...performanceRef.current,
      XP: performanceRef.current.XP + points,
      served: performanceRef.current.served + 1,
      combo: performanceRef.current.combo + 1,
    };
    performanceRef.current = nextPerformance;

    triggerHaptic('success');
    setShowCelebrationSplash(!reducedMotion);
    setScore(nextPerformance.XP);
    setOrdersServed(nextPerformance.served);
    setStreak(nextPerformance.combo);
    setFeedback({ tone: 'success', text: `Chef's kiss! +${points} XP. Combo ${nextPerformance.combo}!` });
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: nextPerformance.XP, metadata: { order: order.id } });
    emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: nextPerformance.XP, metadata: { order: order.id } });

    if (!reducedMotion) confetti({
      particleCount: 64,
      spread: 46,
      origin: { y: 0.72 },
      colors: ['#fde68a', '#fb923c', '#ffffff', '#60a5fa'],
    });

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      if (!presentRef.current || roundFinishedRef.current) return;
      setFeedback(null);
      setShowCelebrationSplash(false);
      nextOrder(nextPerformance.served, timeLeft);
      setIsResolvingOrder(false);
      resolvingOrderRef.current = false;
    }, 1280);
  }, [nextOrder, order.id, order.stage, orderStartMs, pausedDurationAt, timeLeft, reducedMotion, sessionEvents]);

  const resolveIncorrectOrder = useCallback(() => {
    if (!presentRef.current || roundFinishedRef.current) return;
    const nextPerformance = {
      ...performanceRef.current,
      XP: Math.max(0, performanceRef.current.XP - 24),
      wrong: performanceRef.current.wrong + 1,
      combo: 0,
    };
    performanceRef.current = nextPerformance;
    triggerHaptic('warning');
    setWrongOrders(nextPerformance.wrong);
    setStreak(0);
    setScore(nextPerformance.XP);
    setFeedback({ tone: 'error', text: `The chef says nope! Make exactly ${asDisplayFraction(order.target)}.` });
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: nextPerformance.XP, metadata: { order: order.id, attempt: nextPerformance.wrong } });

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      if (!presentRef.current || roundFinishedRef.current) return;
      setFeedback(null);
    }, 520);
  }, [order.id, order.target, sessionEvents]);

  const submitOrder = useCallback((fromAuto = false) => {
    if (!presentRef.current || sharedLivesBlocked || resolvingOrderRef.current || roundFinishedRef.current || isResolvingOrder || roundFinished) return;
    resolvingOrderRef.current = true;
    setIsResolvingOrder(true);

    const selected = selectedIdsRef.current;
    const total = selected.reduce<Fraction>((sum, id) => addFractions(sum, ITEM_BY_ID[id].value), { n: 0, d: 1 });
    const valid = equalFractions(total, order.target)
      && selected.length >= activeConstraints.minItems
      && !selected.some((id) => activeConstraints.bannedIds.has(id));
    if (valid) {
      resolveCorrectOrder();
      return;
    } else {
      resolveIncorrectOrder();
      if (!fromAuto) {
        // Keep current selection so the learner can fix quickly.
      }
    }

    unlockTimeoutRef.current = window.setTimeout(() => {
      unlockTimeoutRef.current = null;
      if (!presentRef.current || roundFinishedRef.current) return;
      setIsResolvingOrder(false);
      resolvingOrderRef.current = false;
    }, 170);
  }, [activeConstraints.bannedIds, activeConstraints.minItems, isResolvingOrder, order.target, resolveCorrectOrder, resolveIncorrectOrder, roundFinished, sharedLivesBlocked]);

  useEffect(() => {
    if (!presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;
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
  }, [constraintsMet, isExact, isPresent, isResolvingOrder, roundFinished, sharedLivesBlocked, submitOrder]);

  const addItem = (itemId: string) => {
    if (!presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;

    if (activeConstraints.bannedIds.has(itemId)) {
      triggerHaptic('warning');
      setFeedback({ tone: 'error', text: `${ITEM_BY_ID[itemId].name} is blocked for this order.` });
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = window.setTimeout(() => {
        if (presentRef.current && !roundFinishedRef.current) setFeedback(null);
      }, 520);
      return;
    }

    triggerHaptic('selection');
    selectedIdsRef.current = [...selectedIdsRef.current, itemId];
    setSelectedIds(selectedIdsRef.current);
  };

  const removeSelectedItem = (itemId: string) => {
    if (!presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;
    const index = selectedIdsRef.current.indexOf(itemId);
    if (index < 0) return;
    triggerHaptic('light');
    selectedIdsRef.current = selectedIdsRef.current.filter((_, i) => i !== index);
    setSelectedIds(selectedIdsRef.current);
  };

  const clearTray = () => {
    if (!presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;
    triggerHaptic('light');
    selectedIdsRef.current = [];
    setSelectedIds([]);
  };

  const timerProgress = Math.max(0, Math.min(1, timeLeft / ROUND_DURATION_SECONDS));

  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  const availableItems = useMemo(
    () => order.trayItemIds.map((id) => ITEM_BY_ID[id]).filter(Boolean),
    [order.trayItemIds],
  );
  const orderMonster = useMemo(() => pick(MONSTER_IMAGES), [order.id]);
  const trayGroups = useMemo(() => {
    const groups = new Map<string, { item: FoodItem; count: number }>();
    selectedIds.forEach((id) => {
      const group = groups.get(id);
      if (group) group.count += 1;
      else groups.set(id, { item: ITEM_BY_ID[id], count: 1 });
    });
    return [...groups.values()];
  }, [selectedIds]);
  const overTarget = compareFractions(runningTotal, order.target) > 0;
  const rushPressure = timeLeft <= 30 ? 'last-orders' : Combo >= 3 ? 'combo' : 'steady';
  const customerLine = feedback?.tone === 'success' ? 'Slime-free. Mostly.'
    : feedback?.tone === 'error' ? "That is not my order, chef!"
      : ['My stomach just growled back.', 'The sauce is watching.', 'Hungry. Very hungry.', 'Make it snappy, chef.'][ordersServed % 4];

  return (
    <FoodGameShell gameType="take_out_rush" backgroundImage={takeOutLevelBg} overlayDisabled
      backgroundOpacity={1} backgroundPosition="50% 61%" className="restaurant-rush">
      <div className={`rush-layout${useSharedTopHud ? ' has-shared-hud' : ''}`}
        data-takeout-game data-takeout-state={roundFinished ? 'finished' : feedback?.tone || 'idle'}
        data-takeout-time={timeLeft} data-takeout-paused={sessionState?.paused || false} data-takeout-present={isPresent}
        data-takeout-served={ordersServed} data-takeout-combo={Combo} data-takeout-pressure={rushPressure}
        data-takeout-selected-count={selectedIds.length} data-takeout-wrong={wrongOrders} data-takeout-score={XP}>
        {!useSharedTopHud && <div className="rush-local-clock" aria-label="Existing restaurant round timer">
          <span>Kitchen closes in {timeLeft}s</span><span>{XP} XP</span>
          <div style={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }} />
        </div>}
        <GameQuestionCard title="Order ticket"
          subtitle={`90s kitchen shift. ${isPractice ? 'Practice exact orders.' : 'Wrong orders cost a life.'}${activeConstraints.minItems > 1 ? ` Use at least ${activeConstraints.minItems} portions.` : ''}`}
          className="rush-mission" style={{ position: 'relative', top: 0, width: '100%', transform: 'none' }}>
          Build an order worth <strong>{asDisplayFraction(order.target)}</strong>.
        </GameQuestionCard>

        <section data-takeout-playfield className={`rush-kitchen${overTarget ? ' is-overfilled' : ''}`}
          data-takeout-target={`${order.target.n}/${order.target.d}`} data-takeout-total={`${runningTotal.n}/${runningTotal.d}`}>
          <img src={takeOutLevelBg} alt="Fantasy kitchen with a serving counter, diners and bubbling sauce"
            className="rush-kitchen-art" data-takeout-background draggable={false} />
          <div className="rush-order-rail">
            <span>Ticket #{ordersServed + 1}</span>
            <strong>{rushPressure === 'last-orders' ? 'Last orders! Closing soon.' : Combo > 0 ? `On a roll ×${Combo}` : 'Keep the kitchen moving'}</strong>
          </div>
          <div className="rush-steam" aria-hidden="true"><i /><i /><i /></div>
          <div className="rush-customer">
            <div className="rush-customer-quip">{customerLine}</div>
            <motion.img key={order.id} src={orderMonster} alt="Your hungry customer" draggable={false}
              initial={reducedMotion ? false : { opacity: 0, x: 12 }}
              animate={reducedMotion ? { x: 0, y: 0, opacity: 1, rotate: 0 } : { opacity: 1, x: 0,
                y: feedback?.tone === 'success' ? [0, -8, 0] : [0, -2, 0], rotate: feedback?.tone === 'error' ? [0, -3, 3, 0] : 0 }}
              transition={{ duration: feedback ? .35 : 2.4, repeat: feedback || reducedMotion ? 0 : Infinity, ease: 'easeInOut' }} />
          </div>
          <div className="rush-counter" data-takeout-tray>
            <div className="rush-tray-label"><span>Your tray <strong>{asDisplayFraction(runningTotal)}</strong> / {asDisplayFraction(order.target)}</span>
              <span>{overTarget ? 'Too much! Remove a portion.' : isExact && !constraintsMet ? `Need ${activeConstraints.minItems} portions.` : isExact ? 'Exact. Order up!' : 'Build the exact total.'}</span>
            </div>
            <div className="rush-tray-items" style={{ gridTemplateColumns: `repeat(${Math.max(1, trayGroups.length)}, minmax(0, 1fr))` }}>
              <AnimatePresence initial={false}>
                {trayGroups.map(({ item, count }) => <motion.button key={item.id} type="button"
                  data-takeout-remove={item.id} aria-label={`Remove one ${asDisplayFraction(item.value)} portion`}
                  disabled={!isPresent || isResolvingOrder || roundFinished || sharedLivesBlocked} onClick={() => removeSelectedItem(item.id)}
                  initial={reducedMotion ? false : { y: -10, scale: .85, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { y: 8, scale: .9, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
                  <FoodSprite item={item} /><span>{asDisplayFraction(item.value)} <b>×{count}</b></span><small aria-hidden="true">−</small>
                </motion.button>)}
              </AnimatePresence>
              {!trayGroups.length && <div className="rush-empty-tray">Empty tray. The chef is judging you.</div>}
            </div>
          </div>
        </section>

        <div className="rush-responses" data-takeout-responses>
          <div className="rush-food-shelf" style={{ gridTemplateColumns: `repeat(${availableItems.length}, minmax(0, 1fr))` }}>
            {availableItems.map((item) => <button key={item.id} type="button" data-button-skin="none"
              data-takeout-food={item.id} data-food-fraction={`${item.value.n}/${item.value.d}`}
              aria-label={`Add ${asDisplayFraction(item.value)} portion`} onClick={() => addItem(item.id)}
              disabled={!isPresent || isResolvingOrder || roundFinished || sharedLivesBlocked || activeConstraints.bannedIds.has(item.id)}>
              <FoodSprite item={item} /><strong>{asDisplayFraction(item.value)}</strong>
            </button>)}
          </div>
          <div className={`rush-feedback${feedback?.tone === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
            {feedback?.text || (Combo > 0 ? 'Keep the combo alive. Exact portions only.' : 'Tap portions to match the target. Suspicious sauce awaits.')}
          </div>
          <div className="rush-actions">
            <button type="button" onClick={clearTray} disabled={!isPresent || !selectedIds.length || isResolvingOrder || roundFinished || sharedLivesBlocked} className="ui-button-secondary">Reset tray</button>
            <button type="button" data-takeout-submit onClick={() => submitOrder(false)} disabled={!canSubmit} className="ui-button-primary">Send order</button>
          </div>
        </div>
        <CelebrationSplash active={showCelebrationSplash && !reducedMotion} message="Order Up!" theme="takeout" sweepDuration={1.35} />
      </div>
    </FoodGameShell>
  );
};

export default TakeOutRushGame;



