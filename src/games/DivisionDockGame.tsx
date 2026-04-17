import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../haptics';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import dockBackground from '../assets/maps/backgroundsforgames/division dock.jpg';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';

interface DivisionDockGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface DivisionQuestion {
  dividend: number;
  divisor: number;
  answer: number;
  options: number[];
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const ROUNDS_TO_WIN = 5;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildDivisionOptions = (answer: number) => {
  const pool = new Set<number>([answer]);
  const deltas = [-4, -3, -2, 2, 3, 4, 5, -5];

  for (const delta of deltas.sort(() => Math.random() - 0.5)) {
    if (pool.size >= 4) break;
    const candidate = Math.max(1, answer + delta);
    if (candidate !== answer) {
      pool.add(candidate);
    }
  }

  while (pool.size < 4) {
    const candidate = Math.max(1, answer + randomInt(-6, 6));
    if (candidate !== answer) {
      pool.add(candidate);
    }
  }

  return [...pool].sort(() => Math.random() - 0.5);
};

const createDivisionQuestion = (levelId: number, solved: number): DivisionQuestion => {
  const stage = Math.max(1, levelId + Math.floor(solved / 2));
  const divisorMin = stage <= 3 ? 2 : stage <= 6 ? 3 : 4;
  const divisorMax = stage <= 3 ? 8 : stage <= 6 ? 10 : 12;
  const answerMin = stage <= 3 ? 2 : stage <= 6 ? 4 : 6;
  const answerMax = stage <= 3 ? 9 : stage <= 6 ? 14 : 18;
  const divisor = randomInt(divisorMin, divisorMax);
  const answer = randomInt(answerMin, answerMax);
  const dividend = divisor * answer;

  return {
    dividend,
    divisor,
    answer,
    options: buildDivisionOptions(answer),
  };
};

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.65) return 2;
  return 1;
};

const DivisionDockGame: React.FC<DivisionDockGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const initialTime = 78 + (levelId * 6);
  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [combo, setCombo] = useState(0);
  const [roundSolved, setRoundSolved] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [question, setQuestion] = useState<DivisionQuestion>(() => createDivisionQuestion(levelId, 0));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    const openingQuestion = createDivisionQuestion(levelId, 0);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(initialTime);
    setHearts(HEARTS_MAX);
    setCombo(0);
    setRoundSolved(0);
    setSolvedCount(0);
    setAttempts(0);
    setCorrectAnswers(0);
    setQuestion(openingQuestion);
    questionStartRef.current = Date.now();
    setFeedback(null);
    setSelectedAnswer(null);
    setIsFinished(false);
  }, [initialTime, levelId]);

  useEffect(() => {
    if (isFinished) return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          onGameOver(scoreRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isFinished, onGameOver]);

  const finishVictory = (finalScore: number, totalAttempts: number, totalCorrect: number, heartsLeft: number) => {
    if (isFinished) return;
    setIsFinished(true);

    const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 1;
    const stars = accuracy >= 0.9 && heartsLeft >= 2 ? 3 : accuracy >= 0.65 ? 2 : 1;

    confetti({
      particleCount: 120,
      spread: 72,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#fde68a', '#67e8f9', '#ffffff'],
    });

    onVictory(stars, finalScore);
  };

  const moveToNextQuestion = (nextSolvedCount: number) => {
    const timerId = window.setTimeout(() => {
      setQuestion(createDivisionQuestion(levelId, nextSolvedCount));
      setSelectedAnswer(null);
      setFeedback(null);
      questionStartRef.current = Date.now();
    }, 620);
    timersRef.current.push(timerId);
  };

  const handleWrongAnswer = () => {
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setCombo(0);
    setFeedback({
      type: 'error',
      title: 'Not Quite',
      subtitle: `${question.dividend} ÷ ${question.divisor} = ${question.answer}`,
    });
    triggerHaptic('error');

    if (nextHearts <= 0) {
      const timerId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(scoreRef.current);
      }, 760);
      timersRef.current.push(timerId);
      return;
    }

    moveToNextQuestion(solvedCount);
  };

  const handleAnswer = (choice: number) => {
    if (isFinished || feedback) return;
    setSelectedAnswer(choice);
    const attemptNumber = attempts + 1;
    setAttempts(attemptNumber);

    if (choice !== question.answer) {
      handleWrongAnswer();
      return;
    }

    const nextSolved = solvedCount + 1;
    const nextCorrect = correctAnswers + 1;
    const points = 120 + (combo * 16) + (levelId * 10);
    const updatedScore = XP + points;

    setScore(updatedScore);
    scoreRef.current = updatedScore;
    setSolvedCount(nextSolved);
    setCorrectAnswers(nextCorrect);
    setCombo((previous) => previous + 1);
    setRoundSolved((previous) => previous + 1);
    const elapsedMs = Date.now() - questionStartRef.current;
    const isPraise = shouldShowPraise(attemptNumber, elapsedMs);
    setFeedback({
      type: isPraise ? 'praise' : 'success',
      title: isPraise ? buildPraiseMessage() : 'Perfect Share',
      subtitle: isPraise
        ? 'First try, quick share!'
        : `${question.dividend} ÷ ${question.divisor} = ${question.answer}`,
    });
    triggerHaptic('success');

    if (nextSolved >= ROUNDS_TO_WIN) {
      finishVictory(updatedScore, attempts + 1, nextCorrect, hearts);
      return;
    }

    const timerId = window.setTimeout(() => {
      setQuestion(createDivisionQuestion(levelId, nextSolved));
      setSelectedAnswer(null);
      setFeedback(null);
      questionStartRef.current = Date.now();
    }, 720);
    timersRef.current.push(timerId);
  };

  return (
    <GameScreenShell className="overflow-hidden bg-transparent">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${dockBackground})` }}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:px-3 md:pb-[calc(env(safe-area-inset-bottom)+1.25rem)] md:pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <div className="mx-auto flex h-full w-full max-w-[920px] min-h-0 flex-1 flex-col gap-3 px-1 py-1.5 md:gap-4 md:px-2 md:py-2">
          <div className="w-full max-w-[920px]">
            <GameQuestionCard
              title="Division Dock"
              bodyClassName="text-[clamp(1rem,2.7vw,1.42rem)] font-black leading-snug tracking-[0.01em] text-white md:text-[1.5rem]"
            >
              {'The cargo has been scrambled.\n'}
              {`What is ${question.dividend} ÷ ${question.divisor}?`}
            </GameQuestionCard>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-[720px] rounded-[1.25rem] border border-white/12 bg-[linear-gradient(180deg,rgba(9,16,31,0.66),rgba(6,10,20,0.82))] p-3 shadow-[0_16px_30px_rgba(2,6,23,0.18)] md:p-4">
              <div className="rounded-[1rem] border border-white/10 bg-slate-950/25 px-4 py-5 text-center shadow-[0_10px_20px_rgba(2,6,23,0.18)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/82">Solve the division</div>
                <div className="mt-2 text-[clamp(2rem,9vw,4.6rem)] font-black tracking-tight text-white">
                  {question.dividend} ÷ {question.divisor}
                </div>
                <div className="mt-2 text-[clamp(1rem,3vw,1.25rem)] font-black text-amber-100">
                  Choose the quotient
                </div>
              </div>
            </div>
          </div>

          <div className="answer-choice-surface grid grid-cols-4 gap-2">
            {question.options.map((option) => (
              <motion.button
                key={`${question.dividend}-${question.divisor}-${option}`}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={isFinished || Boolean(feedback)}
                whileTap={{ scale: 0.96 }}
                className={`min-h-[3.4rem] rounded-[1rem] px-2 py-2 text-center text-base font-black disabled:opacity-60 ${
                  selectedAnswer === option
                    ? option === question.answer
                      ? 'ui-button-success'
                      : 'ui-button-primary'
                    : 'ui-button-secondary'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>

          {feedback ? (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${
                  feedback.type === 'praise'
                    ? 'bg-[radial-gradient(circle_at_center,rgba(255,230,138,0.34),rgba(56,189,248,0.14))]'
                    : feedback.type === 'success'
                      ? 'bg-emerald-500/16'
                      : 'bg-red-500/16'
                }`}
              >
                <div className={`rounded-[2rem] border px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)] ${
                  feedback.type === 'praise'
                    ? 'border-amber-100/70 bg-[linear-gradient(180deg,rgba(255,248,214,0.98),rgba(125,211,252,0.92))]'
                    : 'border-white/14 bg-slate-950/60'
                }`}>
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${
                    feedback.type === 'success'
                      ? 'text-emerald-100'
                      : feedback.type === 'praise'
                        ? 'text-slate-950'
                        : 'text-amber-100'
                  }`}>
                    {feedback.title}
                  </div>
                  <div className={`mt-2 text-lg font-bold md:text-2xl ${
                    feedback.type === 'praise' ? 'text-slate-950/90' : 'text-white/92'
                  }`}>{feedback.subtitle}</div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </GameScreenShell>
  );
};

export default DivisionDockGame;
