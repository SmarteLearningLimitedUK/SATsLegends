import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import changeCounterBackground from '../assets/maps/teen/monster-market-shop.webp';
import SceneEnvironment from '../components/SceneEnvironment';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { triggerHaptic } from '../haptics';
import {
  GameplaySessionEventHandlers,
  GameplaySessionState,
  MiniGameShellContractProps,
  emitMiniGameSessionEvent,
} from '../app/gameplaySessionContract';
import {
  reshuffleAvoidingRepeat,
  shuffle,
} from '../utils/questionShuffle';
import item1 from '../assets/change counter/itemsforsale/1.png';
import item2 from '../assets/change counter/itemsforsale/2.png';
import item3 from '../assets/change counter/itemsforsale/3.png';
import item4 from '../assets/change counter/itemsforsale/4.png';
import item5 from '../assets/change counter/itemsforsale/5.png';
import item6 from '../assets/change counter/itemsforsale/6.png';
import item7 from '../assets/change counter/itemsforsale/7.png';
import item8 from '../assets/change counter/itemsforsale/8.png';
import item9 from '../assets/change counter/itemsforsale/9.png';
import item10 from '../assets/change counter/itemsforsale/10.png';
import './monster-market.css';

interface ChangeCounterGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

interface ChangeQuestion {
  id: string;
  kind: 'fluency' | 'reasoning';
  item: string;
  costPence: number;
  paidPence: number;
  correct: string;
  lines: ReceiptLine[];
  changePence: number;
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

interface ReceiptLine {
  id: string;
  item: string;
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
  image: string;
}

interface MarketItem {
  id: string;
  item: string;
  costPence: number;
  image: string;
}

const MAX_LIVES = 3;
const TOTAL_ROUNDS = 6;
const COIN_VALUES = [100, 50, 20, 10, 5, 2, 1] as const;
type SelectedCoin = { id: number; value: number };

const formatMoney = (pence: number) => (pence >= 100 ? `\u00A3${(pence / 100).toFixed(2)}` : `${pence}p`);

const randomInt = (min: number, max: number) => {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const pick = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)];

const titleCase = (value: string) => value.replace(/\b\w/g, (character) => character.toUpperCase());

const getDifficultyProfile = (levelId: number) => {
  if (levelId <= 1) return { lineCount: 1, minQuantity: 1, maxQuantity: 1, priceStep: 10, maxPrice: 100, changeValues: [10, 20, 30, 50] };
  if (levelId === 2) return { lineCount: 1, minQuantity: 1, maxQuantity: 1, priceStep: 5, maxPrice: 500, changeValues: [5, 10, 20, 25, 50, 75, 100] };
  if (levelId === 3) return { lineCount: 2, minQuantity: 1, maxQuantity: 2, priceStep: 5, maxPrice: 800, changeValues: [10, 15, 25, 35, 50, 75, 100] };
  if (levelId === 4) return { lineCount: 3, minQuantity: 1, maxQuantity: 3, priceStep: 1, maxPrice: 1500, changeValues: [15, 25, 35, 45, 55, 65, 90, 110] };
  return { lineCount: 4, minQuantity: 2, maxQuantity: 4, priceStep: 1, maxPrice: 1500, changeValues: [25, 35, 45, 55, 65, 75, 90, 110, 130, 150] };
};

const buildReceiptQuestion = (levelId: number, roundIndex: number, order: MarketItem[]): ChangeQuestion => {
  const profile = getDifficultyProfile(levelId);
  const shuffled = shuffle(order);
  const lineCount = Math.min(profile.lineCount, shuffled.length);
  const seeds = shuffled.slice(0, lineCount);

  const lines: ReceiptLine[] = seeds.map((seed, index) => {
    const quantity = profile.lineCount === 1
      ? 1
      : randomInt(profile.minQuantity, profile.maxQuantity);
    const unitPricePence = levelId <= 1
      ? Math.max(20, ((Math.round(seed.costPence / 10) % 9) + 1) * 10)
      : Math.min(profile.maxPrice, Math.max(profile.priceStep, Math.round(seed.costPence / profile.priceStep) * profile.priceStep));
    return {
      id: `${seed.id}-${index}`,
      item: seed.item,
      quantity,
      unitPricePence,
      lineTotalPence: unitPricePence * quantity,
      image: seed.image,
    };
  });

  const totalCostPence = lines.reduce((sum, line) => sum + line.lineTotalPence, 0);
  const changePence = pick(profile.changeValues);
  const paidPence = totalCostPence + changePence;
  const itemLabel = lineCount === 1
    ? titleCase(lines[0].item)
    : `${titleCase(lines[0].item)} + ${lineCount - 1} more`;

  return {
    id: seeds[0].id,
    kind: 'reasoning',
    item: itemLabel,
    costPence: totalCostPence,
    paidPence,
    correct: formatMoney(changePence),
    lines,
    changePence,
  };
};

const QUESTION_BANK: MarketItem[] = [
  { id: 'c1', item: 'herb bundle', costPence: 275, image: item1 },
  { id: 'c2', item: 'healing tonic', costPence: 420, image: item2 },
  { id: 'c3', item: 'glow lamp', costPence: 185, image: item3 },
  { id: 'c4', item: 'rope coil', costPence: 360, image: item4 },
  { id: 'c5', item: 'crystal shard', costPence: 995, image: item5 },
  { id: 'c6', item: 'travel cloak', costPence: 1230, image: item6 },
  { id: 'c7', item: 'quest map', costPence: 78, image: item7 },
  { id: 'c8', item: 'lantern oil', costPence: 648, image: item8 },
];

const buildQuestionDeck = (previousLast: MarketItem | null) => (
  reshuffleAvoidingRepeat(QUESTION_BANK, previousLast, (question) => question.id)
);

const resolveQuestion = (
  levelId: number,
  roundIndex: number,
  order: MarketItem[],
): ChangeQuestion => buildReceiptQuestion(levelId, roundIndex, order);

const starsForRun = (correct: number, rounds: number, lives: number) => {
  const accuracy = rounds > 0 ? correct / rounds : 1;
  if (accuracy >= 0.9 && lives >= 2) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const ChangeCounterGame: React.FC<ChangeCounterGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud = true,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(5, levelId || 1)), [levelId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<MarketItem[]>(() => buildQuestionDeck(null));
  const [question, setQuestion] = useState<ChangeQuestion>(() => resolveQuestion(resolvedLevel, 0, questionOrder));
  const [localLives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedCoins, setSelectedCoins] = useState<SelectedCoin[]>([]);
  const nextCoinId = useRef(0);
  const coinTotal = selectedCoins.reduce((total, coin) => total + coin.value, 0);
  const availableCoins = resolvedLevel === 1 ? COIN_VALUES.slice(1, 4) : resolvedLevel === 2 ? COIN_VALUES.slice(0, 5) : COIN_VALUES;
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [feedbackText, setFeedbackText] = useState('');
  const [locked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef(new Set<number>());
  const answerLockRef = useRef(false);
  const runEndedRef = useRef(false);
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const fallbackFailurePendingRef = useRef(false);
  const usesSharedLives = Boolean(sessionState && !isPractice);
  const lives = usesSharedLives ? sessionState!.lives : localLives;
  const observedPositiveLifeRef = useRef(usesSharedLives && lives > 0);
  const sharedLivesBlocked = usesSharedLives && lives <= 0;
  const sharedLivesBlockedRef = useRef(sharedLivesBlocked);
  sharedLivesBlockedRef.current = sharedLivesBlocked;

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
  };

  const queueTimeout = (callback: () => void, delay: number) => {
    if (!presentRef.current || runEndedRef.current || sharedLivesBlockedRef.current) return;
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      if (presentRef.current && !runEndedRef.current && !sharedLivesBlockedRef.current) callback();
    }, delay);
    timersRef.current.add(timerId);
  };

  // Cancel results as soon as exit starts, before the retained screen unmounts.
  useLayoutEffect(() => {
    if (isPresent) return;
    runEndedRef.current = true;
    answerLockRef.current = true;
    fallbackFailurePendingRef.current = false;
    clearTimers();
  }, [isPresent]);

  useEffect(() => {
    runEndedRef.current = !presentRef.current;
    return () => {
      runEndedRef.current = true;
      answerLockRef.current = true;
      fallbackFailurePendingRef.current = false;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!presentRef.current) return;
    clearTimers();
    runEndedRef.current = false;
    answerLockRef.current = false;
    fallbackFailurePendingRef.current = false;
    observedPositiveLifeRef.current = usesSharedLives && lives > 0;
    const nextOrder = buildQuestionDeck(null);
    setQuestionOrder(nextOrder);
    setRoundIndex(0);
    setQuestion(resolveQuestion(resolvedLevel, 0, nextOrder));
    setLives(MAX_LIVES);
    setScore(0);
    setCorrectCount(0);
    setSelectedCoins([]);
    setFeedbackTone('neutral');
    setFeedbackText('');
    setLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const endFailedRun = useCallback((finalScore: number) => {
    if (!presentRef.current || runEndedRef.current) return;
    runEndedRef.current = true;
    answerLockRef.current = true;
    setLocked(true);
    clearTimers();
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: finalScore, reason: 'lives' });
    if (usesSharedLives) return;

    // Practice and standalone play retain their local result after feedback.
    fallbackFailurePendingRef.current = true;
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      if (!presentRef.current || !fallbackFailurePendingRef.current) return;
      fallbackFailurePendingRef.current = false;
      onGameOverRef.current(finalScore);
    }, 620);
    timersRef.current.add(timerId);
  }, [sessionEvents, usesSharedLives]);

  useEffect(() => {
    if (!presentRef.current || !usesSharedLives) return;
    if (lives > 0) {
      observedPositiveLifeRef.current = true;
      return;
    }
    // Retry briefly carries the previous run's zero before the shell resets.
    if (observedPositiveLifeRef.current) endFailedRun(score);
  }, [endFailedRun, isPresent, lives, score, usesSharedLives]);

  const advanceRound = useCallback((nextCorrect: number, nextScore: number, nextLives: number) => {
    if (!presentRef.current || runEndedRef.current) return;
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const stars = starsForRun(nextCorrect, TOTAL_ROUNDS, nextLives);
      clearTimers();
      queueTimeout(() => {
        runEndedRef.current = true;
        clearTimers();
        if (!reducedMotion) confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#f97316', '#38bdf8', '#facc15'],
        });
        emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: nextScore, stars });
        onVictoryRef.current(stars, nextScore);
      }, 520);
      return;
    }

    queueTimeout(() => {
      const nextRound = roundIndex + 1;
      const lastQuestion = questionOrder.length ? questionOrder[questionOrder.length - 1] : null;
      const nextOrder = (questionOrder.length && nextRound % questionOrder.length === 0)
        ? buildQuestionDeck(lastQuestion)
        : questionOrder;
      if (nextOrder !== questionOrder) setQuestionOrder(nextOrder);
      setRoundIndex(nextRound);
      setQuestion(resolveQuestion(resolvedLevel, nextRound, nextOrder));
      setSelectedCoins([]);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
      answerLockRef.current = false;
    }, 520);
  }, [questionOrder, roundIndex, resolvedLevel, sessionEvents, reducedMotion]);

  const handleAnswer = () => {
    if (!presentRef.current || locked || answerLockRef.current || runEndedRef.current || sharedLivesBlockedRef.current) return;
    answerLockRef.current = true;
    setLocked(true);

    if (coinTotal === question.changePence) {
      const gained = 150 + resolvedLevel * 14;
      const updatedScore = score + gained;
      const nextCorrect = correctCount + 1;
      setScore(updatedScore);
      setCorrectCount(nextCorrect);
      setFeedbackTone('success');
      setFeedbackText(`Cha-ching! +${gained} XP. The slime stays in its jar.`);
      triggerHaptic('success');
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { score: updatedScore, metadata: { item: question.item } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', { score: updatedScore });
      advanceRound(nextCorrect, updatedScore, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedbackTone('warning');
    setFeedbackText(`The till is ${formatMoney(Math.abs(question.changePence - coinTotal))} ${coinTotal < question.changePence ? 'short' : 'over'}. Adjust the coins and try again.`);
    triggerHaptic('error');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score, metadata: { correctAnswer: question.correct } });

    if (nextLives <= 0) {
      endFailedRun(score);
      return;
    }

    queueTimeout(() => {
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
      answerLockRef.current = false;
    }, 520);
  };

  const marketState = feedbackTone === 'success' ? 'correct' : feedbackTone === 'warning' ? 'incorrect' : 'idle';
  const merchantLine = marketState === 'correct' ? 'Lovely. Suspiciously lovely.'
    : marketState === 'incorrect' ? 'Oi! That till bites.'
      : lives <= 1 ? 'Last chance. Keep the slime bottled.' : 'Exact change. No funny business.';

  return (
    <GameScreenShell className="market-game overflow-hidden" backgroundImage={changeCounterBackground} backgroundOpacity={.5}>
      <PracticeIntroPopup open={showPracticeIntro} title="Monster Market"
        body="The till has been slimed. Check every item and quantity.
Work out the exact change to keep the trade moving."
        briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />
      <div className={`market-layout${useSharedTopHud ? ' has-shared-hud' : ''}`}
        data-market-game data-market-state={marketState} data-market-round={roundIndex + 1} data-market-present={isPresent}
        data-market-lives={lives} data-market-correct={correctCount} data-market-score={score}>
        <PuzzleStage className="market-stack">
          <GameQuestionCard title="Till check" subtitle="Check every quantity on the receipt."
            style={{ position: 'relative', top: 0, transform: 'none', width: '100%' }}>
            The customer paid <strong>{formatMoney(question.paidPence)}</strong>. How much change is due?
          </GameQuestionCard>

          <section className={`market-scene${lives <= 1 ? ' is-last-chance' : ''}`} data-market-playfield>
            <SceneEnvironment src={changeCounterBackground} className="market-shop-art" />
            <div className="market-customer-quip" role="status">{merchantLine}</div>
            <div className="market-slime" data-market-slime aria-hidden="true"><span /><i data-market-bubble /><i data-market-bubble /></div>
            <motion.div className="market-receipt" data-market-receipt key={`${question.id}-${roundIndex}`}
              style={{ '--receipt-count': question.lines.length, '--receipt-short-rows': Math.ceil(question.lines.length / 2) } as React.CSSProperties}
              initial={reducedMotion ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : .18 }}>
              <div className="market-receipt-heading"><span>Trade receipt</span><strong>{String(roundIndex + 1).padStart(2, '0')} / {TOTAL_ROUNDS}</strong></div>
              <div className="market-receipt-lines" style={{ gridTemplateRows: `repeat(${question.lines.length}, minmax(0, 1fr))` }}>
                {question.lines.map((line) => <div key={line.id} className="market-receipt-line" data-market-line>
                  <img src={line.image} alt={titleCase(line.item)} draggable={false} />
                  <div><strong>{line.quantity}× {titleCase(line.item)}</strong><small>{formatMoney(line.unitPricePence)} each</small></div>
                  <b>{formatMoney(line.lineTotalPence)}</b>
                </div>)}
              </div>
              <div className="market-receipt-totals">
                <div><span>Total cost</span><strong data-market-cost>{formatMoney(question.costPence)}</strong></div>
                <div><span>Customer paid</span><strong data-market-paid>{formatMoney(question.paidPence)}</strong></div>
              </div>
              <div className={`market-receipt-stamp${marketState === 'correct' ? ' is-paid' : ''}`} aria-hidden="true">
                {marketState === 'correct' ? 'PAID. MOSTLY SLIME-FREE.' : `${TOTAL_ROUNDS - roundIndex} trades to finish`}
              </div>
            </motion.div>
          </section>

          <section className="market-till" aria-label="Coin till">
            <div className="market-till-top"><strong>Build the change</strong><span aria-live="polite">In tray: {formatMoney(coinTotal)}</span></div>
            <div className="market-answers market-coin-bank" role="group" aria-label="Add coins">
              {availableCoins.map(value => <motion.button key={value} type="button" data-market-coin={value}
                whileTap={reducedMotion ? undefined : { scale: .9 }}
                onClick={() => { nextCoinId.current += 1; setSelectedCoins(coins => [...coins, { id: nextCoinId.current, value }]); triggerHaptic('selection'); }}
                disabled={!isPresent || locked || sharedLivesBlocked || coinTotal + value > Math.max(250, question.changePence + 100)}
                aria-label={`Add ${formatMoney(value)} coin`}>
                {formatMoney(value)}
              </motion.button>)}
            </div>
            <div className="market-till-bottom"><div className="market-selected-coins" aria-label="Coins in tray">
              <AnimatePresence initial={false}>{selectedCoins.map(coin => <motion.button key={coin.id} type="button"
                initial={reducedMotion ? false : { y: -14, opacity: 0, scale: .7 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 12, opacity: 0, scale: .7 }}
                onClick={() => setSelectedCoins(coins => coins.filter(item => item.id !== coin.id))}
                disabled={locked || sharedLivesBlocked} aria-label={`Remove ${formatMoney(coin.value)} coin`}>{formatMoney(coin.value)}</motion.button>)}</AnimatePresence>
              {!selectedCoins.length && <span>Tap coins to fill the tray</span>}
            </div><button type="button" className="market-clear" onClick={() => setSelectedCoins([])} disabled={locked || !selectedCoins.length}>Clear</button></div>
            <button type="button" className="market-submit ui-button-primary" data-market-submit onClick={handleAnswer}
              disabled={!isPresent || locked || sharedLivesBlocked || !selectedCoins.length}>Hand over change</button>
          </section>
          <div className={`market-feedback${marketState === 'incorrect' ? ' is-error' : ''}`} role="status" aria-live="polite">
            {feedbackText || (lives <= 1 ? 'One chance left. Read the receipt, then pay the exact change.' : 'Keep the queue moving. Pay the exact change.')}
          </div>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default ChangeCounterGame;
