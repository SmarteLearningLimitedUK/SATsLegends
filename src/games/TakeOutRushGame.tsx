import {questionMetadata} from '../systems/learning/questionMetadata';
import {isUntimedRevision,isRelaxedRevision} from '../systems/learning/sessionPolicy';
import { playMonsterSound } from '../audio/gameAudio';
import VisionCharacter from '../components/game-ui/VisionCharacter';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VisionSceneContext } from './visionScene';
import {originalHeroId} from '../assets/characters/originalHeroes';
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
import food8 from '../assets/take_out/matharia/food_chicken.png';
import food9 from '../assets/take_out/food/9.png';
import FoodGameShell from '../components/FoodGameShell';
import { triggerHaptic } from '../haptics';
import CelebrationSplash from '../components/CelebrationSplash';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import dinerServingCounter from '../assets/game-visions/instruments/diner-serving-counter-v1.png';
import './takeout-diner.css';
import {TAKEOUT_PORTIONS,addFractions,asDisplayFraction,compareFractions,evaluateTakeoutTray,fractionToNumber,generateTakeoutOrder,restrictionsFor,type Fraction,type OrderConstraint} from './takeoutRules';

interface TakeOutRushGameProps extends MiniGameShellContractProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
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

const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'burger_meal',
    name: 'Burger Meal',
    image: food1,
    value: TAKEOUT_PORTIONS.burger_meal,
    colorClass: 'from-amber-300 to-orange-400',
  },
  {
    id: 'ribs_plate',
    name: 'Ribs Plate',
    image: food2,
    value: TAKEOUT_PORTIONS.ribs_plate,
    colorClass: 'from-orange-300 to-amber-500',
  },
  {
    id: 'berry_dessert',
    name: 'Berry Dessert',
    image: food3,
    value: TAKEOUT_PORTIONS.berry_dessert,
    colorClass: 'from-rose-300 to-pink-400',
  },
  {
    id: 'salad_bowl',
    name: 'Salad Bowl',
    image: food4,
    value: TAKEOUT_PORTIONS.salad_bowl,
    colorClass: 'from-emerald-300 to-lime-400',
  },
  {
    id: 'rice_bowl',
    name: 'Rice Bowl',
    image: food5,
    value: TAKEOUT_PORTIONS.rice_bowl,
    colorClass: 'from-sky-300 to-cyan-400',
  },
  {
    id: 'pizza_slice',
    name: 'Pizza Slice',
    image: food6,
    value: TAKEOUT_PORTIONS.pizza_slice,
    colorClass: 'from-amber-300 to-orange-400',
  },
  {
    id: 'hotdog_combo',
    name: 'Hotdog Combo',
    image: food7,
    value: TAKEOUT_PORTIONS.hotdog_combo,
    colorClass: 'from-yellow-300 to-amber-400',
  },
  {
    id: 'roast_chicken',
    name: 'Roast Chicken',
    image: food8,
    value: TAKEOUT_PORTIONS.roast_chicken,
    colorClass: 'from-orange-300 to-amber-500',
  },
  {
    id: 'fries',
    name: 'Fries',
    image: food9,
    value: TAKEOUT_PORTIONS.fries,
    colorClass: 'from-yellow-300 to-amber-400',
  },
];

const CUSTOMER_CAST = ['goblin', 'slime', 'jelly', 'rhino'] as const;

const ITEM_BY_ID: Record<string, FoodItem> = FOOD_ITEMS.reduce<Record<string, FoodItem>>((map, item) => {
  map[item.id] = item;
  return map;
}, {});

const stageFromProgress = (baseLevel: number, _ordersServed: number, _timeLeft: number): number => Math.max(1, Math.min(5, baseLevel));
const generateOrder = (stage: number): TakeOutOrder => {
  const spec = generateTakeoutOrder(stage);
  return { ...spec, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: `Target fraction: ${asDisplayFraction(spec.target)}.` };
};

const starsForPerformance = (XP: number, correct: number, incorrect: number): number => {
  const total = Math.max(1, correct + incorrect);
  const accuracy = correct / total;

  if (correct >= 5 && accuracy >= 0.8) return 3;
  if (correct >= 3 && accuracy >= 0.6) return 2;
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
  const scene = useContext(VisionSceneContext);
  const customerScene = useMemo(() => ({ key: scene.key, paused: scene.paused, cue: 'idle' as const, sequence: 0 }), [scene.key, scene.paused]);
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const baseLevel = Math.max(1, Math.min(5, miniGameLevel || levelId || 1));

  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [XP, setScore] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [ordersServed, setOrdersServed] = useState(0);
  const shiftElapsed = ROUND_DURATION_SECONDS - timeLeft;
  const arrivals = isUntimedRevision(sessionState)?Math.max(5,ordersServed+1):3 + Math.floor(shiftElapsed / 20);
  const queuedCustomers = Math.max(0, arrivals - ordersServed);
  const [wrongOrders, setWrongOrders] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preparation, setPreparation] = useState<{ itemId: string; sequence: number } | null>(null);
  const [isResolvingOrder, setIsResolvingOrder] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [orderStartMs, setOrderStartMs] = useState<number>(() => Date.now());
  const [roundFinished, setRoundFinished] = useState(false);

  const [order, setOrder] = useState<TakeOutOrder>(() => generateOrder(stageFromProgress(baseLevel, 0, ROUND_DURATION_SECONDS)));

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
  }, [isPresent, roundFinished, sessionState?.paused, sessionState?.untimed]);

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
    if (!isPresent || roundFinished || sessionState?.paused || isUntimedRevision(sessionState)) return undefined;
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
  }, [isPresent, roundFinished, sessionState?.paused, sessionState?.untimed]);

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
    if (!presentRef.current || (isUntimedRevision(sessionState)?ordersServed<5:timeLeft>0) || roundFinishedRef.current || sessionState?.paused) return;

    roundFinishedRef.current = true;
    clearTimers();
    setRoundFinished(true);
    const result = performanceRef.current;
    const stars = starsForPerformance(result.XP, result.served, result.wrong);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: result.XP, stars });
    onVictoryRef.current(stars, result.XP);
  }, [isPresent, sessionEvents, sessionState?.paused, timeLeft,ordersServed]);

  const activeConstraints = useMemo(() => restrictionsFor(order.constraints), [order.constraints]);

  const selectedItems = useMemo(() => selectedIds.map((id) => ITEM_BY_ID[id]).filter(Boolean), [selectedIds]);

  const runningTotal = useMemo(() => {
    return selectedItems.reduce<Fraction>((sum, item) => addFractions(sum, item.value), { n: 0, d: 1 });
  }, [selectedItems]);

  const trayAssessment = useMemo(() => evaluateTakeoutTray(order, selectedIds), [order, selectedIds]);
  const {exact:isExact,constraintsMet,counts:selectedCounts} = trayAssessment;
  const paused = Boolean(sessionState?.paused || scene.paused);
  const canSubmit = queuedCustomers > 0 && isPresent && selectedIds.length > 0 && !isResolvingOrder && !roundFinished && !sharedLivesBlocked && !paused;

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
    if (!presentRef.current || roundFinishedRef.current || sessionState?.paused) return;
    playMonsterSound('monster_laugh');
    const now = Date.now();
    const pausedOrderMs = Math.max(0, pausedDurationAt(now) - orderPauseBaselineRef.current);
    const orderSolveMs = Math.max(350, now - orderStartMs - pausedOrderMs);
    const stageBonus = order.stage * 16;
    const itemBonus = selectedIdsRef.current.length * 14;
    const speedBonus = isUntimedRevision(sessionState)?220:Math.max(30, Math.round(220 - (orderSolveMs / 70)));
    const streakBonus = performanceRef.current.combo * 22;
    const serviceStamp = (performanceRef.current.combo + 1) % 3 === 0;
    const points = 120 + stageBonus + itemBonus + speedBonus + streakBonus + (serviceStamp ? 60 : 0);
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
    setFeedback({ tone: 'success', text: `${serviceStamp ? 'Service stamp! +60 bonus XP.' : 'Perfect order!'} +${points} XP. Streak ${nextPerformance.combo}!` });
    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: nextPerformance.XP, metadata: { order: order.id ,...questionMetadata("take_out_rush","fractions.constrained-composition",order,"construction",["6F4"],false)} });
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
  }, [nextOrder, order.id, order.stage, orderStartMs, pausedDurationAt, timeLeft, reducedMotion, sessionEvents, sessionState?.paused, sessionState?.untimed]);

  const resolveIncorrectOrder = useCallback((reason?:string) => {
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
    setFeedback({ tone: 'error', text: reason || `Order needs adjusting. Make exactly ${asDisplayFraction(order.target)}.` });
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score: nextPerformance.XP, metadata: { order: order.id, attempt: nextPerformance.wrong ,...questionMetadata("take_out_rush","fractions.constrained-composition",order,"construction",["6F4"],false)} });

    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      if (!presentRef.current || roundFinishedRef.current) return;
      setFeedback(null);
    }, 520);
  }, [order.id, order.target, sessionEvents]);

  const submitOrder = useCallback(() => {
    if (paused || queuedCustomers === 0 || !selectedIdsRef.current.length || !presentRef.current || sharedLivesBlocked || resolvingOrderRef.current || roundFinishedRef.current || isResolvingOrder || roundFinished) return;
    resolvingOrderRef.current = true;
    setIsResolvingOrder(true);

    const selected = selectedIdsRef.current;
    const assessment = evaluateTakeoutTray(order, selected);
    if (assessment.valid) {
      resolveCorrectOrder();
      return;
    } else {
      // Keep the current selection and customer so the learner can correct it.
      resolveIncorrectOrder(assessment.restrictionError);
    }

    unlockTimeoutRef.current = window.setTimeout(() => {
      unlockTimeoutRef.current = null;
      if (!presentRef.current || roundFinishedRef.current) return;
      setIsResolvingOrder(false);
      resolvingOrderRef.current = false;
    }, 170);
  }, [paused, isResolvingOrder, order, queuedCustomers, resolveCorrectOrder, resolveIncorrectOrder, roundFinished, sharedLivesBlocked]);

  const clearEditingFeedback = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFeedback(null);
  };

  const addItem = (itemId: string) => {
    if (paused || !order.trayItemIds.includes(itemId) || !presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;

    if (activeConstraints.bannedIds.has(itemId)) {
      triggerHaptic('warning');
      setFeedback({ tone: 'error', text: 'That item is blocked for this order.' });
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = window.setTimeout(() => {
        if (presentRef.current && !roundFinishedRef.current) setFeedback(null);
      }, 520);
      return;
    }

    const used = selectedIdsRef.current.filter(id => id === itemId).length;
    if (used >= (activeConstraints.limits[itemId] ?? Infinity)) {
      triggerHaptic('warning');
      setFeedback({ tone: 'info', text: 'Item limit reached. Remove a portion to use it again.' });
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = window.setTimeout(() => { if (presentRef.current && !roundFinishedRef.current) setFeedback(null); }, 520);
      return;
    }

    triggerHaptic('selection');
    clearEditingFeedback();
    selectedIdsRef.current = [...selectedIdsRef.current, itemId];
    setSelectedIds(selectedIdsRef.current);
    setPreparation(previous => ({ itemId, sequence: (previous?.sequence ?? 0) + 1 }));
  };

  const removeSelectedItem = (itemId: string) => {
    if (paused || !presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;
    const index = selectedIdsRef.current.indexOf(itemId);
    if (index < 0) return;
    triggerHaptic('light');
    clearEditingFeedback();
    selectedIdsRef.current = selectedIdsRef.current.filter((_, i) => i !== index);
    setSelectedIds(selectedIdsRef.current);
  };

  const clearTray = () => {
    if (paused || !presentRef.current || sharedLivesBlocked || roundFinishedRef.current || resolvingOrderRef.current || roundFinished || isResolvingOrder) return;
    triggerHaptic('light');
    clearEditingFeedback();
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
  const nextCustomerIn = 20 - shiftElapsed % 20;
  const submitLabel = isResolvingOrder ? feedback?.tone === 'success' ? 'Serving…' : 'Checking…'
    : queuedCustomers === 0 ? `Waiting ${nextCustomerIn}s` : 'Send order';
  const trayHint = queuedCustomers === 0 ? `${isExact && constraintsMet ? 'Tray ready. ' : ''}Next customer in ${nextCustomerIn}s.`
    : overTarget ? 'Too much! Remove a portion.'
      : isExact ? constraintsMet ? 'Exact. Tap Send order.' : trayAssessment.restrictionError
        : selectedIds.length ? `Add portions to make ${asDisplayFraction(order.target)}.`
          : isPractice ? 'Choose portions to fill the tray.' : 'Wrong order: lose a heart. Build your tray.';
  const rushPressure = timeLeft <= 30 ? 'last-orders' : Combo >= 3 ? 'combo' : 'steady';
  const customerLine = feedback?.tone === 'success' ? 'Slime-free. Mostly.'
    : feedback?.tone === 'error' ? "Could you check my order?"
      : ['My stomach just growled back.', 'The sauce is watching.', 'Hungry. Very hungry.', 'One heroic order, please.'][ordersServed % 4];

  return (
    <FoodGameShell gameType="take_out_rush" backgroundImage={takeOutLevelBg} overlayDisabled
      backgroundOpacity={1} backgroundPosition="50% 61%" className="restaurant-rush cafe-hero">
      <div className={`rush-layout${useSharedTopHud ? ' has-shared-hud' : ''}`}
        data-takeout-game data-takeout-state={roundFinished ? 'finished' : feedback?.tone || 'idle'}
        data-takeout-time={timeLeft} data-takeout-paused={sessionState?.paused || false} data-takeout-present={isPresent}
        data-takeout-served={ordersServed} data-takeout-combo={Combo} data-takeout-pressure={rushPressure}
        data-takeout-selected-count={selectedIds.length} data-takeout-wrong={wrongOrders} data-takeout-score={XP}
        data-takeout-min-items={activeConstraints.minItems} data-takeout-min-values={activeConstraints.minValues} data-takeout-constraints-met={constraintsMet}>
        {!useSharedTopHud && <div className="rush-local-clock" aria-label="Existing restaurant round timer">
          <span>Kitchen closes in {timeLeft}s</span><span>{XP} XP</span>
          <div style={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }} />
        </div>}
        <GameQuestionCard title="Order ticket" context=""
          subtitle={`${activeConstraints.minItems}+ portions · ${activeConstraints.minValues} fraction sizes · ${isPractice ? 'Practice' : 'Wrong order: lose a heart'}`}
          className="rush-mission" style={{ position: 'relative', top: 0, width: '100%', transform: 'none' }}>
          Choose portions that add up to <strong>{asDisplayFraction(order.target)}</strong> of a whole meal.
        </GameQuestionCard>

        <section data-takeout-playfield className={`rush-kitchen${overTarget ? ' is-overfilled' : ''}`}
          data-takeout-target={`${order.target.n}/${order.target.d}`} data-takeout-total={`${runningTotal.n}/${runningTotal.d}`}>
          <div className="rush-order-rail">
            <span>Ticket #{ordersServed + 1}</span>
            <strong>{rushPressure === 'last-orders' ? 'Last orders!' : Combo > 0 ? `Perfect service ×${Combo}` : 'Customer counter'}</strong>
            {useSharedTopHud && <span className="rush-shift-clock" data-takeout-clock data-urgent={timeLeft <= 30} aria-label={`${timeLeft} seconds left`}>{timeLeft}s</span>}
          </div>
          <div className="rush-customer-quip" role="status">{queuedCustomers ? customerLine : 'Your next customer is on the way.'}</div>
          <div className="rush-queue" data-customer-queue={queuedCustomers} aria-label="Monster customer queue">
            <VisionSceneContext.Provider value={customerScene}>
            <AnimatePresence initial={false} mode="popLayout">
            {Array.from({length:Math.min(5,queuedCustomers)},(_,index)=>{
              const customerId=ordersServed+index;
              const wait=Math.max(0,shiftElapsed-customerId*20);
              return <motion.div key={customerId} layout={!reducedMotion && !scene.paused}
                initial={reducedMotion ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 35 }} transition={{ duration: reducedMotion ? 0 : .45, ease: 'easeOut' }}
                className="rush-queued-customer" data-queue-position={index} data-customer-id={customerId} data-impatience={wait>=40?'urgent':wait>=20?'restless':'calm'}>
                <VisionCharacter steady identity={CUSTOMER_CAST[customerId%CUSTOMER_CAST.length]} alt={index===0?'Monster ordering at the counter':'Monster waiting in the queue'}/>
                <span className="rush-customer-position">{index === 0 ? 'Your order, please!' : 'Waiting'}</span>
              </motion.div>;
            })}
            </AnimatePresence>
            </VisionSceneContext.Provider>
          </div>
          <span className="rush-queue-status" role="status">{queuedCustomers} waiting · {ordersServed} served · Next: {20 - shiftElapsed % 20}s</span>
        </section>

        <section className="rush-server-bay" aria-label="Server behind the diner counter"
          data-chef-preparation={preparation?.sequence ?? 0} data-chef-cooking={selectedIds.length > 0 && !isResolvingOrder}>
          <span className="rush-chef-sign">Order · plate · serve</span>
          <VisionSceneContext.Provider value={customerScene}>
            <VisionCharacter steady activity={selectedIds.length?'cook':'idle'} identity={originalHeroId(scene.heroIdentity)} alt="Your hero chef"
              reaction={preparation && selectedIds.length ? 'taunt' : 'idle'} reactionKey={preparation?.sequence} />
          </VisionSceneContext.Provider>
          <img className="rush-serving-counter" src={dinerServingCounter} alt="" aria-hidden="true" draggable={false} />
        </section>

        <div className="rush-responses" data-takeout-responses>
          <motion.div className={`rush-counter${overTarget ? ' is-overfilled' : ''}`} data-takeout-tray
            animate={{ x: 0, y: 0 }}>
            <div className="rush-tray-label"><span>Your tray <strong>{asDisplayFraction(runningTotal)}</strong> / {asDisplayFraction(order.target)}</span>
              <span>{trayHint}</span>
            </div>
            <div className="rush-tray-items" style={{ gridTemplateColumns: `repeat(${Math.max(1, trayGroups.length)}, minmax(0, 1fr))` }}>
              <AnimatePresence initial={false} mode="popLayout">
                {trayGroups.map(({ item, count }) => <motion.button key={item.id} type="button"
                  data-takeout-remove={item.id} aria-label={`Remove one ${asDisplayFraction(item.value)} portion`}
                  disabled={!isPresent || isResolvingOrder || roundFinished || sharedLivesBlocked} onClick={() => removeSelectedItem(item.id)}
                  initial={reducedMotion ? false : { y: -10, scale: .85, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={reducedMotion ? { opacity: 0 } : { y: 8, scale: .9, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
                  <FoodSprite item={item} /><span>{asDisplayFraction(item.value)} <b>×{count}</b></span><small aria-hidden="true">−</small>
                </motion.button>)}
              </AnimatePresence>
              {!trayGroups.length && <div className="rush-empty-tray">Choose portions below to fill the tray.</div>}
            </div>
          </motion.div>
          <div className="rush-food-shelf" style={{ gridTemplateColumns: `repeat(${availableItems.length}, minmax(0, 1fr))` }}>
            {availableItems.map((item) => <button key={item.id} type="button" data-button-skin="none"
              data-takeout-food={item.id} data-food-fraction={`${item.value.n}/${item.value.d}`}
              data-food-limit={activeConstraints.limits[item.id]} data-food-remaining={activeConstraints.limits[item.id] === undefined ? undefined : Math.max(0, activeConstraints.limits[item.id] - (selectedCounts[item.id] || 0))} data-food-blocked={activeConstraints.bannedIds.has(item.id)}
              aria-label={`Add ${asDisplayFraction(item.value)} portion`} onClick={() => addItem(item.id)}
              disabled={paused || !isPresent || isResolvingOrder || roundFinished || sharedLivesBlocked || activeConstraints.bannedIds.has(item.id) || (selectedCounts[item.id] || 0) >= (activeConstraints.limits[item.id] ?? Infinity)}>
              {activeConstraints.bannedIds.has(item.id) ? <small>Blocked</small> : activeConstraints.limits[item.id] !== undefined ? <small>{Math.max(0, activeConstraints.limits[item.id] - (selectedCounts[item.id] || 0))} left</small> : null}
              <FoodSprite item={item} /><strong>{asDisplayFraction(item.value)}</strong>
            </button>)}
          </div>
          <div className={`rush-feedback${feedback?.tone === 'error' ? ' is-error' : ''}`} data-feedback-active={Boolean(feedback)} role="status" aria-live="polite">
            {feedback?.text || trayHint}
          </div>
          <div className="rush-actions">
            <button type="button" onClick={clearTray} disabled={!isPresent || !selectedIds.length || isResolvingOrder || roundFinished || sharedLivesBlocked} className="ui-button-secondary">Reset tray</button>
            <button type="button" data-takeout-submit onClick={submitOrder} disabled={!canSubmit} className="ui-button-primary">{submitLabel}</button>
          </div>
        </div>
        <CelebrationSplash active={showCelebrationSplash && !reducedMotion} message="Order Up!" theme="takeout" sweepDuration={1.35} />
      </div>
    </FoodGameShell>
  );
};

export default TakeOutRushGame;



