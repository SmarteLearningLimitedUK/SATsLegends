import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import changeCounterBackground from '../assets/maps/teen/monster-market-shop.webp';
import ShopCheckoutScene from './ShopCheckoutScene';
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
import './change-counter-shop.css';

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

const formatMoney = (pence: number) => (pence >= 100 ? `\u00A3${(pence / 100).toFixed(2)}` : `${pence}p`);

const randomInt = (min: number, max: number) => {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
};

const pick = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)];

const titleCase = (value: string) => value.replace(/\b\w/g, (character) => character.toUpperCase());

const getDifficultyProfile = (levelId: number) => {
  if (levelId <= 1) return { lineCount: 1, minQuantity: 1, maxQuantity: 1, priceStep: 1, maxPrice: 400, changeValues: [10, 20, 30, 50] };
  if (levelId === 2) return { lineCount: 1, minQuantity: 1, maxQuantity: 1, priceStep: 1, maxPrice: 999, changeValues: [5, 10, 20, 25, 50, 75, 100] };
  if (levelId === 3) return { lineCount: 2, minQuantity: 1, maxQuantity: 2, priceStep: 5, maxPrice: 800, changeValues: [10, 15, 25, 35, 50, 75, 100] };
  if (levelId === 4) return { lineCount: 3, minQuantity: 1, maxQuantity: 3, priceStep: 1, maxPrice: 1500, changeValues: [17, 28, 46, 59, 73, 91, 112] };
  return { lineCount: 4, minQuantity: 2, maxQuantity: 4, priceStep: 1, maxPrice: 1500, changeValues: [37, 49, 68, 83, 97, 114, 137, 158] };
};

const coinOptionsForLevel = (_levelId: number) => [200, 100, 50, 20, 10, 5, 2, 1];

const coinName = (pence: number) => pence === 200 ? 'two pounds' : pence === 100 ? 'one pound' : `${pence} pence`;

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
      ? [72, 85, 135, 149, 225, 375][roundIndex % 6]
      : levelId === 2 ? [739, 425, 875, 649, 389, 912][roundIndex % 6]
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
  const paidPence = levelId <= 1 ? 500 : Math.ceil((totalCostPence + 1) / 500) * 500 + (levelId >= 3 ? pick([0, 500, 1000]) : 0);
  const changePence = paidPence - totalCostPence;
  const itemLabel = lineCount === 1
    ? titleCase(lines[0].item)
    : `${titleCase(lines[0].item)} + ${lineCount - 1} more`;

  return {
    id: seeds[0].id,
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
  avatarId,
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
  const [selectedCoins, setSelectedCoins] = useState<number[]>([]);
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
  const selectedTotal = selectedCoins.reduce((sum, coin) => sum + coin, 0);
  const coinOptions = coinOptionsForLevel(resolvedLevel);

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

  const canEditTill = isPresent && !locked && !answerLockRef.current && !runEndedRef.current && !sharedLivesBlocked;

  const addCoin = (coin: number) => {
    if (!canEditTill) return;
    setSelectedCoins((current) => [...current, coin]);
    setFeedbackTone('neutral');
    setFeedbackText('');
    triggerHaptic('tap');
  };

  const undoCoin = () => {
    if (!canEditTill || selectedCoins.length === 0) return;
    setSelectedCoins((current) => current.slice(0, -1));
    triggerHaptic('selection');
  };

  const removeCoin = (coinIndex: number) => {
    if (!canEditTill) return;
    setSelectedCoins((current) => current.filter((_, index) => index !== coinIndex));
    triggerHaptic('selection');
  };

  const resetCoins = () => {
    if (!canEditTill || selectedCoins.length === 0) return;
    setSelectedCoins([]);
    triggerHaptic('selection');
  };

  const handOverChange = () => {
    if (!presentRef.current || locked || answerLockRef.current || runEndedRef.current || sharedLivesBlockedRef.current) return;
    if (selectedCoins.length === 0) return;
    answerLockRef.current = true;
    setLocked(true);

    if (selectedTotal === question.changePence) {
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
    const difference = Math.abs(question.changePence - selectedTotal);
    setFeedbackText(`The till rattles: ${formatMoney(difference)} ${selectedTotal > question.changePence ? 'too much' : 'short'}. Adjust the coins and try again.`);
    triggerHaptic('error');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { score, metadata: { correctAnswer: question.correct } });

    if (nextLives <= 0) {
      endFailedRun(score);
      return;
    }

    queueTimeout(() => {
      setFeedbackTone('neutral');
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
      <ShopCheckoutScene avatarId={avatarId} />
      <PracticeIntroPopup open={showPracticeIntro} title="Monster Market"
        body="The till has been slimed. Check every item and quantity.
Tap coins to make the change. Use Undo or Clear if you need to, then hand it over."
        briefing={practiceBriefing} onAction={() => setShowPracticeIntro(false)} />
      <div className={`market-layout${useSharedTopHud ? ' has-shared-hud' : ''}`}
        data-market-game data-market-state={marketState} data-market-round={roundIndex + 1} data-market-present={isPresent}
        data-market-lives={lives} data-market-correct={correctCount} data-market-score={score}>
        <PuzzleStage className="market-stack">
          <GameQuestionCard context="" title="Till check" subtitle="Read the receipt. Select coins for the change, then submit."
            style={{ position: 'relative', top: 0, transform: 'none', width: '100%' }}>
            A customer paid <strong>{formatMoney(question.paidPence)}</strong>. Give the exact change.
          </GameQuestionCard>

          <section className={`market-scene${lives <= 1 ? ' is-last-chance' : ''}`} data-market-playfield>
            <div className="market-customer-quip" role="status">{merchantLine}</div>
            <motion.div className="market-receipt" data-market-receipt key={`${question.id}-${roundIndex}`}
              style={{ '--receipt-count': question.lines.length, '--receipt-short-rows': Math.ceil(question.lines.length / 2) } as React.CSSProperties}
              initial={reducedMotion ? false : { y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : .18 }}>
              <div className="market-receipt-heading"><span><span className="market-receipt-trade">Trade </span>receipt</span><strong>{String(roundIndex + 1).padStart(2, '0')} / {TOTAL_ROUNDS}</strong></div>
              <div className="market-receipt-lines">
                {question.lines.map((line) => <div key={line.id} className="market-receipt-line" data-market-line>
                  <img src={line.image} alt={titleCase(line.item)} draggable={false} />
                  <div><strong>{line.quantity}× {titleCase(line.item)}</strong><small>{formatMoney(line.unitPricePence)} <span>each</span></small></div>
                  <b>{formatMoney(line.lineTotalPence)}</b>
                </div>)}
              </div>
              <div className="market-receipt-totals">
                <div><span>Total</span><strong data-market-cost>{formatMoney(question.costPence)}</strong></div>
                <div><span>Paid</span><strong data-market-paid>{formatMoney(question.paidPence)}</strong></div>
              </div>
              <div className={`market-receipt-stamp${marketState === 'correct' ? ' is-paid' : ''}`} aria-hidden="true">
                {marketState === 'correct' ? 'PAID. MOSTLY SLIME-FREE.' : `${TOTAL_ROUNDS - roundIndex} trades to finish`}
              </div>
            </motion.div>
            <div className="market-till" data-market-till>
              <div className="market-till-header"><span>Change tray</span><strong data-market-till-total aria-live="polite" aria-atomic="true">{formatMoney(selectedTotal)}</strong></div>
              <div className="market-coin-tray" aria-label="Coins in change tray">
                {selectedCoins.length === 0 ? <span className="market-empty-tray">Tap coins below</span> : <>
                  {selectedCoins.length > 5 && <span className="market-more-coins">+{selectedCoins.length - 5} coins</span>}
                  {selectedCoins.slice(-5).map((coin, index) => {
                    const coinIndex = selectedCoins.length - Math.min(5, selectedCoins.length) + index;
                    return <motion.button type="button" data-button-skin="none" className="market-tray-coin" key={`${roundIndex}-${coinIndex}-${coin}`}
                      data-market-selected-coin={coin} aria-label={`Remove ${coinName(coin)} coin from tray`}
                      onClick={() => removeCoin(coinIndex)} disabled={!canEditTill}
                      initial={reducedMotion ? false : { y: -15, opacity: 0, rotate: -16 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: .2 }}>{formatMoney(coin)}</motion.button>;
                  })}
                </>}
              </div>
              <div className="market-coin-buttons" role="group" aria-label="Add coins to the change tray">
                {coinOptions.map((coin) => <motion.button key={coin} type="button" data-button-skin="none" data-market-coin={coin}
                  aria-label={`Add ${coinName(coin)} coin`} whileTap={reducedMotion ? undefined : { scale: .9 }}
                  onClick={() => addCoin(coin)} disabled={!canEditTill} className="market-coin-button">
                  {formatMoney(coin)}
                </motion.button>)}
              </div>
              <div className="market-till-actions">
                <button type="button" data-button-skin="none" data-market-undo aria-label="Undo last coin" onClick={undoCoin} disabled={!canEditTill || selectedCoins.length === 0}>Undo</button>
                <button type="button" data-button-skin="none" data-market-clear onClick={resetCoins} disabled={!canEditTill || selectedCoins.length === 0}>Clear</button>
                <button type="button" data-button-skin="none" data-market-submit aria-label="Hand over exact change" onClick={handOverChange} disabled={!canEditTill || selectedCoins.length === 0}>Give change</button>
              </div>
            </div>
          </section>
          <div className={`market-feedback${marketState === 'incorrect' ? ' is-error' : ''}`} role="status" aria-live="polite">
            {feedbackText || (lives <= 1 ? 'One chance left. Check the receipt and adjust the coins.' : 'Tap coins, then Give the change.')}
          </div>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default ChangeCounterGame;
