import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import changeCounterBackground from '../assets/maps/backgroundsforgames/changecounter.jpg';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import { FeedbackStrip } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { triggerHaptic } from '../haptics';
import {
  GameplaySessionEventHandlers,
  GameplaySessionState,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import {
  reshuffleAvoidingRepeat,
  shuffle,
  shuffleOptionsWithCorrect,
} from '../utils/questionShuffle';
import item1 from '../assets/change counter/itemsforsale/1.png';
import item2 from '../assets/change counter/itemsforsale/2.png';
import item3 from '../assets/change counter/itemsforsale/3.png';
import item4 from '../assets/change counter/itemsforsale/4.png';
import item5 from '../assets/change counter/itemsforsale/5.png';
import item6 from '../assets/change counter/itemsforsale/6.png';
import item7 from '../assets/change counter/itemsforsale/7.png';
import item8 from '../assets/change counter/itemsforsale/8.png';

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
  options: string[];
  correct: string;
  quantity?: number;
  customer?: string;
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

const MAX_LIVES = 3;
const TOTAL_ROUNDS = 6;
const SALE_ITEMS = [
  { label: 'sword', src: item1 },
  { label: 'shield', src: item2 },
  { label: 'potion', src: item3 },
  { label: 'boots', src: item4 },
  { label: 'snack pack', src: item5 },
  { label: 'helmet', src: item6 },
  { label: 'wizard hat', src: item7 },
  { label: 'mirror', src: item8 },
] as const;
const MARKET_CUSTOMERS = ['Grok', 'Vex', 'Bran', 'Mochi', 'Rook', 'Zuri'];

const formatMoney = (pence: number) => (
  pence >= 100
    ? `£${(pence / 100).toFixed(2)}`
    : `${pence}p`
);

const QUESTION_BANK: ChangeQuestion[] = [
  {
    id: 'c1',
    kind: 'reasoning',
    item: 'sword',
    costPence: 275,
    paidPence: 500,
    options: ['£2.25', '£2.75', '£1.75', '£2.05'],
    correct: '£2.25',
  },
  {
    id: 'c2',
    kind: 'reasoning',
    item: 'shield',
    costPence: 420,
    paidPence: 1000,
    options: ['£5.80', '£4.80', '£6.20', '£5.20'],
    correct: '£5.80',
  },
  {
    id: 'c3',
    kind: 'reasoning',
    item: 'potion',
    costPence: 185,
    paidPence: 200,
    options: ['15p', '25p', '10p', '35p'],
    correct: '15p',
  },
  {
    id: 'c4',
    kind: 'reasoning',
    item: 'boots',
    costPence: 360,
    paidPence: 500,
    options: ['£1.40', '£1.60', '£2.40', '£0.40'],
    correct: '£1.40',
  },
  {
    id: 'c5',
    kind: 'reasoning',
    item: 'snack pack',
    costPence: 995,
    paidPence: 1000,
    options: ['5p', '50p', '£0.50', '95p'],
    correct: '5p',
  },
  {
    id: 'c6',
    kind: 'reasoning',
    item: 'helmet',
    costPence: 1230,
    paidPence: 2000,
    options: ['£7.70', '£6.70', '£8.70', '£7.30'],
    correct: '£7.70',
  },
  {
    id: 'c7',
    kind: 'reasoning',
    item: 'wizard hat',
    costPence: 78,
    paidPence: 100,
    options: ['22p', '28p', '32p', '12p'],
    correct: '22p',
  },
  {
    id: 'c8',
    kind: 'reasoning',
    item: 'mirror',
    costPence: 648,
    paidPence: 1000,
    options: ['£3.52', '£2.52', '£4.52', '£3.42'],
    correct: '£3.52',
  },
];

const buildOptions = (correctPence: number, candidates: number[]) => {
  const unique = new Set<number>([correctPence]);
  candidates.forEach((candidate) => {
    if (candidate > 0 && unique.size < 4) unique.add(candidate);
  });
  while (unique.size < 4) {
    unique.add(Math.max(5, correctPence + (unique.size % 2 === 0 ? 50 : -50)));
  }
  return shuffle(Array.from(unique)).map(formatMoney);
};

const buildQuestionDeck = (previousLast: ChangeQuestion | null) => (
  reshuffleAvoidingRepeat(QUESTION_BANK, previousLast, (question) => question.id)
);

const resolveQuestion = (
  levelId: number,
  roundIndex: number,
  order: ChangeQuestion[],
): ChangeQuestion => {
  const candidate = order[roundIndex % order.length];
  const showOrderPrompt = levelId >= 5;

  if (!showOrderPrompt) {
    return {
      ...candidate,
      options: shuffleOptionsWithCorrect(candidate.options, candidate.correct).options,
    };
  }

  const quantity = 2 + ((roundIndex + levelId) % 3);
  const customer = MARKET_CUSTOMERS[roundIndex % MARKET_CUSTOMERS.length];
  const totalCost = candidate.costPence * quantity;
  const paidPence = Math.ceil((totalCost + 300) / 100) * 100;
  const correct = paidPence - totalCost;

  return {
    ...candidate,
    quantity,
    customer,
    costPence: totalCost,
    paidPence,
    correct: formatMoney(correct),
    options: buildOptions(correct, [
      paidPence - (totalCost - candidate.costPence),
      paidPence - totalCost - 100,
      paidPence - totalCost + 200,
      paidPence - totalCost + candidate.costPence,
    ]),
  };
};

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
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(8, levelId || 1)), [levelId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<ChangeQuestion[]>(() => buildQuestionDeck(null));
  const [question, setQuestion] = useState<ChangeQuestion>(() => resolveQuestion(resolvedLevel, 0, questionOrder));
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [feedbackText, setFeedbackText] = useState('');
  const [locked, setLocked] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const questionGallery = useMemo(() => {
    const currentIndex = QUESTION_BANK.findIndex((entry) => entry.id === question.id);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    return Array.from({ length: 5 }, (_, index) => {
      const bankItem = QUESTION_BANK[(startIndex + index) % QUESTION_BANK.length];
      const saleItem = SALE_ITEMS[(startIndex + index) % SALE_ITEMS.length];
      return {
        id: `${question.id}-${index}`,
        label: bankItem.item,
        src: saleItem.src,
        price: formatMoney(bankItem.costPence),
      };
    });
  }, [question.id]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    const nextOrder = buildQuestionDeck(null);
    setQuestionOrder(nextOrder);
    setRoundIndex(0);
    setQuestion(resolveQuestion(resolvedLevel, 0, nextOrder));
    setLives(MAX_LIVES);
    setScore(0);
    setCorrectCount(0);
    setSelected(null);
    setFeedbackTone('neutral');
    setFeedbackText('');
    setLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const advanceRound = useCallback((nextCorrect: number, nextScore: number, nextLives: number) => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const stars = starsForRun(nextCorrect, TOTAL_ROUNDS, nextLives);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#f97316', '#38bdf8', '#facc15'],
      });
      sessionEvents?.onGameComplete?.({ score: nextScore, stars });
      onVictory(stars, nextScore);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextRound = roundIndex + 1;
      const lastQuestion = questionOrder.length ? questionOrder[questionOrder.length - 1] : null;
      const nextOrder = (questionOrder.length && nextRound % questionOrder.length === 0)
        ? buildQuestionDeck(lastQuestion)
        : questionOrder;
      if (nextOrder !== questionOrder) setQuestionOrder(nextOrder);
      setRoundIndex(nextRound);
      setQuestion(resolveQuestion(resolvedLevel, nextRound, nextOrder));
      setSelected(null);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
    }, 520);
    timersRef.current.push(timeoutId);
  }, [onVictory, questionOrder, roundIndex, resolvedLevel, sessionEvents]);

  const handleAnswer = (option: string) => {
    if (locked) return;
    setSelected(option);
    setLocked(true);

    if (option === question.correct) {
      const gained = 150 + resolvedLevel * 14;
      const updatedScore = score + gained;
      const nextCorrect = correctCount + 1;
      setScore(updatedScore);
      setCorrectCount(nextCorrect);
      setFeedbackTone('success');
      setFeedbackText(`Trade restored. +${gained} XP`);
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { item: question.item } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound(nextCorrect, updatedScore, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedbackTone('warning');
    setFeedbackText(`Trade still scrambled. Correct answer: ${question.correct}`);
    triggerHaptic('error');
    sessionEvents?.onIncorrectAnswer?.({ score, metadata: { correctAnswer: question.correct } });

    if (nextLives <= 0) {
      const timeoutId = window.setTimeout(() => {
        sessionEvents?.onGameFailed?.({ score, reason: 'lives' });
        onGameOver(score);
      }, 620);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSelected(null);
      setFeedbackTone('neutral');
      setFeedbackText('');
      setLocked(false);
    }, 520);
    timersRef.current.push(timeoutId);
  };

  return (
    <GameScreenShell className="overflow-hidden" backgroundImage={changeCounterBackground} backgroundOpacity={1}>

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Change Counter"
        body="The Monster Minds have caused chaos in the market.\nWork out the exact change to restore the trade.\nSubtract the cost from the amount paid."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <PuzzleStage className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
          <div className="mx-auto w-full max-w-[44rem] px-1 text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/90 md:text-[12px]">
              {resolvedLevel >= 5 ? 'Market Order' : 'Change Counter'}
            </div>
            <div className="mt-1 text-[clamp(1rem,2.9vw,1.5rem)] font-black leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] md:text-[clamp(1.1rem,2.2vw,1.85rem)]">
              {resolvedLevel >= 5 ? (
                <>
                  {question.customer} wants {question.quantity}x {question.item}.
                  {' '}
                  {question.customer} has {formatMoney(question.paidPence)}.
                </>
              ) : (
                <>
                  The Monster Minds have disrupted this market order.
                  {' '}
                  A {question.item} costs {formatMoney(question.costPence)} and you pay with {formatMoney(question.paidPence)}.
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-cyan-100/88 md:text-sm">
              {resolvedLevel >= 5
                ? `How much change should ${question.customer} receive?`
                : 'How much change restores the trade?'}
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[44rem] grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {questionGallery.map((entry) => (
              <div
                key={entry.id}
                className="casual-panel-surface flex min-h-0 flex-col items-center gap-1.5 overflow-hidden rounded-[1.15rem] border border-white/10 px-2 py-2 text-center shadow-[0_12px_24px_rgba(0,0,0,0.16)] md:rounded-[1.35rem] md:px-3 md:py-3"
              >
                <div className="flex h-18 w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-black/18 md:h-24">
                  <img
                    src={entry.src}
                    alt={entry.label}
                    className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)]"
                    draggable={false}
                  />
                </div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/76 md:text-[10px]">
                  {entry.label}
                </div>
                {resolvedLevel >= 5 ? (
                  <div className="rounded-full border border-amber-100/25 bg-amber-200/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-50 md:text-[10px]">
                    {entry.price} each
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex min-h-0 flex-col gap-2 md:gap-3">
            <div className="answer-choice-surface mx-auto grid w-full max-w-[32rem] grid-cols-2 gap-1.5 md:gap-2">
              {question.options.map((option) => (
                <motion.button
                  key={`${question.id}-${option}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(option)}
                  disabled={locked}
                  className={`flex min-h-[2.8rem] items-center justify-center rounded-[0.95rem] px-2 py-1.5 text-sm font-black md:min-h-[3.15rem] md:text-lg ${
                    selected === option
                      ? option === question.correct
                        ? 'ui-button-success'
                        : 'ui-button-primary'
                      : 'ui-button-secondary'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </div>

          <FeedbackStrip tone={feedbackTone}>
            {feedbackText}
          </FeedbackStrip>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default ChangeCounterGame;
