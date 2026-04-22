import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import changeCounterBackground from '../assets/maps/backgroundsforgames/Monster Market.png';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import { FeedbackStrip, TaskCard } from '../components/game-ui/GameUiKit';
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
  if (levelId <= 2) {
    return { lineCount: 1, minQuantity: 1, maxQuantity: 1, changeValues: [5, 10, 20, 50, 75] };
  }

  if (levelId <= 4) {
    return { lineCount: 2, minQuantity: 1, maxQuantity: 2, changeValues: [10, 15, 20, 25, 35, 50, 75, 100] };
  }

  if (levelId <= 6) {
    return { lineCount: 3, minQuantity: 1, maxQuantity: 3, changeValues: [15, 20, 25, 35, 45, 55, 65, 75, 90, 110] };
  }

  return { lineCount: 4, minQuantity: 2, maxQuantity: 4, changeValues: [20, 25, 35, 45, 55, 65, 75, 90, 110, 130, 150] };
};

const buildAnswerOptions = (correctPence: number, levelId: number) => {
  const profile = getDifficultyProfile(levelId);
  const offsets = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
  const candidates = new Set<number>([correctPence]);

  profile.changeValues.forEach((value) => {
    if (candidates.size < 4) {
      candidates.add(value);
    }
  });

  for (const offset of offsets) {
    if (candidates.size >= 4) break;
    if (correctPence - offset > 0) candidates.add(correctPence - offset);
    if (candidates.size >= 4) break;
    candidates.add(correctPence + offset);
  }

  while (candidates.size < 4) {
    candidates.add(correctPence + (candidates.size * 10));
  }

  return shuffle(Array.from(candidates)).map(formatMoney);
};

const buildReceiptQuestion = (levelId: number, roundIndex: number, order: MarketItem[]): ChangeQuestion => {
  const profile = getDifficultyProfile(levelId);
  const shuffled = shuffle(order);
  const lineCount = Math.min(profile.lineCount, shuffled.length);
  const seeds = shuffled.slice(0, lineCount);

  const lines: ReceiptLine[] = seeds.map((seed, index) => {
    const quantity = profile.lineCount === 1
      ? 1
      : randomInt(profile.minQuantity, profile.maxQuantity + (index === 0 ? 0 : 1));
    const unitPricePence = seed.costPence;
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
    options: buildAnswerOptions(changePence, levelId),
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
  sessionState: _sessionState,
  sessionEvents,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(8, levelId || 1)), [levelId]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionOrder, setQuestionOrder] = useState<MarketItem[]>(() => buildQuestionDeck(null));
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
        title="Monster Market"
        body="The Monster Minds have caused chaos in the market.\nSome orders now bundle several items and quantities.\nWork out the exact change to restore the trade."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <PuzzleStage className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
          <TaskCard className="mx-auto w-full max-w-[44rem]">
            <div className="question-title">Monster Market</div>
            <div className="game-question-copy mt-1 text-white md:text-lg">
              {`Order Received! ${question.lines.map((line) => `${line.quantity}x ${titleCase(line.item)}`).join(', ')}. Funds Deposited = ${formatMoney(question.paidPence)}`}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-cyan-100/85 md:text-sm">
              Calculate the change due from this receipt.
            </div>
          </TaskCard>

          <div className="mx-auto flex w-full max-w-[44rem] justify-center">
            <div className="casual-panel-surface flex w-full max-w-[28rem] flex-col gap-3 overflow-hidden rounded-[1.25rem] border border-white/10 px-3 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.16)] md:max-w-[32rem] md:rounded-[1.45rem] md:px-4 md:py-4">
              <div className="grid gap-2">
                {question.lines.map((line) => (
                  <div key={line.id} className="flex items-center gap-3 rounded-[1rem] border border-white/8 bg-black/18 px-3 py-2 md:px-4 md:py-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.9rem] bg-black/20 md:h-14 md:w-14">
                      <img
                        src={line.image}
                        alt={titleCase(line.item)}
                        className="h-10 w-10 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)] md:h-12 md:w-12"
                        draggable={false}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white md:text-base">
                        {line.quantity}x {titleCase(line.item)}
                      </div>
                      <div className="text-[10px] font-semibold text-cyan-100/75 md:text-[11px]">
                        {formatMoney(line.unitPricePence)} each
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100 md:text-[12px]">
                      {formatMoney(line.lineTotalPence)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-white/8 bg-slate-950/28 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/82 md:text-[12px]">
                <span>Total cost: {formatMoney(question.costPence)}</span>
                <span>Funds deposited: {formatMoney(question.paidPence)}</span>
              </div>
            </div>
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
