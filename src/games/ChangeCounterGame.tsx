import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
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
  shuffleOptionsWithCorrect,
} from '../utils/questionShuffle';

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
}

type FeedbackTone = 'neutral' | 'success' | 'warning';

const MAX_LIVES = 3;
const TOTAL_ROUNDS = 6;

const formatMoney = (pence: number) => (
  pence >= 100
    ? `£${(pence / 100).toFixed(2)}`
    : `${pence}p`
);

const QUESTION_BANK: ChangeQuestion[] = [
  {
    id: 'c1',
    kind: 'reasoning',
    item: 'herb bundle',
    costPence: 275,
    paidPence: 500,
    options: ['£2.25', '£2.75', '£1.75', '£2.05'],
    correct: '£2.25',
  },
  {
    id: 'c2',
    kind: 'reasoning',
    item: 'healing tonic',
    costPence: 420,
    paidPence: 1000,
    options: ['£5.80', '£4.80', '£6.20', '£5.20'],
    correct: '£5.80',
  },
  {
    id: 'c3',
    kind: 'reasoning',
    item: 'glow lamp',
    costPence: 185,
    paidPence: 200,
    options: ['15p', '25p', '10p', '35p'],
    correct: '15p',
  },
  {
    id: 'c4',
    kind: 'reasoning',
    item: 'rope coil',
    costPence: 360,
    paidPence: 500,
    options: ['£1.40', '£1.60', '£2.40', '£0.40'],
    correct: '£1.40',
  },
  {
    id: 'c5',
    kind: 'reasoning',
    item: 'crystal shard',
    costPence: 995,
    paidPence: 1000,
    options: ['5p', '50p', '£0.50', '95p'],
    correct: '5p',
  },
  {
    id: 'c6',
    kind: 'reasoning',
    item: 'travel cloak',
    costPence: 1230,
    paidPence: 2000,
    options: ['£7.70', '£6.70', '£8.70', '£7.30'],
    correct: '£7.70',
  },
  {
    id: 'c7',
    kind: 'reasoning',
    item: 'quest map',
    costPence: 78,
    paidPence: 100,
    options: ['22p', '28p', '32p', '12p'],
    correct: '22p',
  },
  {
    id: 'c8',
    kind: 'reasoning',
    item: 'lantern oil',
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
  const twistEligible = candidate.paidPence + 100 > candidate.costPence * 2;
  const twist = levelId >= 5 && roundIndex % 2 === 1 && twistEligible;
  if (!twist) {
    return {
      ...candidate,
      options: shuffleOptionsWithCorrect(candidate.options, candidate.correct).options,
    };
  }

  const newCost = candidate.costPence * 2;
  const newPaid = candidate.paidPence + 100;
  const correct = newPaid - newCost;

  return {
    ...candidate,
    item: `two ${candidate.item}s`,
    costPence: newCost,
    paidPence: newPaid,
    correct: formatMoney(correct),
    options: buildOptions(correct, [
      newPaid - candidate.costPence,
      newPaid + 100 - newCost,
      newPaid - newCost - 100,
      newPaid - newCost + 200,
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
      setFeedbackText(`Correct. +${gained} XP`);
      triggerHaptic('success');
      sessionEvents?.onCorrectAnswer?.({ score: updatedScore, metadata: { item: question.item } });
      sessionEvents?.onPuzzleComplete?.({ score: updatedScore });
      advanceRound(nextCorrect, updatedScore, lives);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedbackTone('warning');
    setFeedbackText(`Not quite. Correct answer: ${question.correct}`);
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
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="change_counter" />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Change Counter"
        body="Find the exact change.\nUse the coins on screen to make the total match the order."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className={`relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+4.6rem)] md:pt-[calc(env(safe-area-inset-top)+4.9rem)]' : 'pt-[calc(env(safe-area-inset-top)+2.4rem)]'}`}>
        <PuzzleStage className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
          <TaskCard className="bg-black/25 text-slate-100 shadow-[0_10px_20px_rgba(2,6,23,0.18)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Change Counter</div>
                <div className="game-question-copy mt-1 text-white md:text-lg">
                  A {question.item} costs {formatMoney(question.costPence)}. You pay with {formatMoney(question.paidPence)}.
                </div>
              </div>
              <div className="rounded-full bg-amber-200/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                Round {roundIndex + 1}/{TOTAL_ROUNDS}
              </div>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-cyan-100/85 md:text-sm">
              How much change should you get back?
            </div>
          </TaskCard>

          <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-3">
            <div className="rounded-[1.2rem] border border-white/12 bg-white/90 p-3 text-center text-slate-900 shadow-[0_16px_30px_rgba(15,23,42,0.18)] md:p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">Check the values</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-black text-slate-900 md:text-lg">
                <div className="rounded-xl bg-slate-900/5 px-2 py-2">
                  Cost
                  <div className="mt-1 text-lg font-black text-amber-700 md:text-2xl">{formatMoney(question.costPence)}</div>
                </div>
                <div className="rounded-xl bg-slate-900/5 px-2 py-2">
                  Paid
                  <div className="mt-1 text-lg font-black text-emerald-700 md:text-2xl">{formatMoney(question.paidPence)}</div>
                </div>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-2 md:gap-3">
              {question.options.map((option) => (
                <motion.button
                  key={`${question.id}-${option}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(option)}
                  disabled={locked}
                  className={`flex min-h-[3.5rem] items-center justify-center rounded-[1.1rem] border text-base font-black shadow-[0_12px_20px_rgba(2,6,23,0.2)] transition md:min-h-[3.9rem] md:text-xl ${
                    selected === option
                      ? option === question.correct
                        ? 'border-emerald-200/70 bg-emerald-300/50 text-emerald-950'
                        : 'border-rose-200/70 bg-rose-300/50 text-amber-950'
                      : 'border-white/40 bg-white/88 text-slate-900 hover:bg-white'
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
