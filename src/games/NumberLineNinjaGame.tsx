import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import dojoBackground from '../assets/maps/inside dojo.jpg';
import answerButtonIdle from '../assets/casual_ui/inputs/btn_6a.png';
import answerButtonPressed from '../assets/casual_ui/inputs/btn_6b.png';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type NumberLineNinjaGameShellProps = NumberLineNinjaGameProps & MiniGameShellContractProps;

type FeedbackState = 'idle' | 'correct' | 'incorrect';

interface NumberLineQuestion {
  id: number;
  prompt: string;
  labels: string[];
  focusIndex: number;
  options: string[];
  answer: string;
}

const QUESTION_ADVANCE_MS = 620;
const QUESTION_FEEDBACK_MS = 520;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const scoreToStars = (score: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (score >= 1700 && accuracy >= 0.85) return 3;
  if (score >= 1000 && accuracy >= 0.65) return 2;
  return 1;
};

const formatNumber = (value: number) => {
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2).replace(/\.?0+$/, '');
};

const buildQuestion = (difficulty: number): NumberLineQuestion => {
  const focusIndex = randomInt(1, 3);

  if (difficulty <= 2) {
    const start = randomInt(0, 4) * 5;
    const step = [2, 5, 10][randomInt(0, 2)];
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    const answer = values[focusIndex];
    const options = uniqueStrings([
      formatNumber(answer),
      formatNumber(answer + step),
      formatNumber(Math.max(0, answer - step)),
      formatNumber(answer + (step * 2)),
    ]);

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      prompt: 'Find the missing value on the number line.',
      labels: values.map((value, index) => (index === focusIndex ? '?' : formatNumber(value))),
      focusIndex,
      options: shuffle(options).slice(0, 4),
      answer: formatNumber(answer),
    };
  }

  if (difficulty <= 5) {
    const start = randomInt(-4, 2) * 5;
    const step = [5, 10][randomInt(0, 1)];
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    const answer = values[focusIndex];
    const options = uniqueStrings([
      formatNumber(answer),
      formatNumber(answer + step),
      formatNumber(answer - step),
      formatNumber(answer + (step * 2)),
      formatNumber(answer - (step * 2)),
    ]);

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      prompt: 'Use the equal steps to solve the missing number.',
      labels: values.map((value, index) => (index === focusIndex ? '?' : formatNumber(value))),
      focusIndex,
      options: shuffle(options).slice(0, 4),
      answer: formatNumber(answer),
    };
  }

  const base = randomInt(1, 6) / 10;
  const step = [0.1, 0.2, 0.25][randomInt(0, 2)];
  const values = Array.from({ length: 5 }, (_, index) => Number((base + (step * index)).toFixed(2)));
  const answer = values[focusIndex];
  const options = uniqueStrings([
    formatNumber(answer),
    formatNumber(Number((answer + step).toFixed(2))),
    formatNumber(Number((answer - step).toFixed(2))),
    formatNumber(Number((answer + (step * 2)).toFixed(2))),
    formatNumber(Number((answer - (step * 2)).toFixed(2))),
  ]);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    prompt: 'Read the decimal pattern and pick the missing value.',
    labels: values.map((value, index) => (index === focusIndex ? '?' : formatNumber(value))),
    focusIndex,
    options: shuffle(options).slice(0, 4),
    answer: formatNumber(answer),
  };
};

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [question, setQuestion] = useState<NumberLineQuestion>(() => buildQuestion(Math.max(levelId, 1)));
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [didComplete, setDidComplete] = useState(false);
  const [didFail, setDidFail] = useState(false);

  const timeoutIdsRef = useRef<number[]>([]);

  const goalCorrect = useMemo(
    () => Math.min(14, Math.max(7, 6 + Math.floor(levelId / 2))),
    [levelId],
  );
  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const queueTimeout = (fn: () => void, delay: number) => {
    const timeoutId = window.setTimeout(fn, delay);
    timeoutIdsRef.current.push(timeoutId);
  };

  const clearQueuedTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  useEffect(() => () => clearQueuedTimeouts(), []);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;

    clearQueuedTimeouts();
    setQuestion(buildQuestion(Math.max(levelId, 1)));
    setSelectedAnswer(null);
    setFeedbackState('idle');
    setScore(0);
    setAttempts(0);
    setCorrectCount(0);
    setLocked(false);
    setDidComplete(false);
    setDidFail(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (isSessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(score);
  }, [didComplete, didFail, isSessionActive, lives, onGameOver, score, sessionEvents, sessionState]);

  const completeRun = (finalScore: number, nextCorrect: number, nextAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, nextCorrect, nextAttempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: { correctCount: nextCorrect, attempts: nextAttempts },
    });
    onVictory(stars, finalScore);
  };

  const advanceQuestion = () => {
    setQuestion(buildQuestion(Math.max(levelId + Math.floor(correctCount / 2), 1)));
    setSelectedAnswer(null);
    setFeedbackState('idle');
    setLocked(false);
  };

  const handleAnswerTap = (option: string) => {
    if (!isSessionActive || locked || didComplete || didFail) return;

    const isCorrect = option === question.answer;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedAnswer(option);
    setLocked(true);

    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      const pointGain = 130 + (nextCorrect % 4 === 0 ? 30 : 0);
      const nextScore = score + pointGain;

      setCorrectCount(nextCorrect);
      setScore(nextScore);
      setFeedbackState('correct');

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score,
        metadata: {
          scoreAfter: nextScore,
          selected: option,
          answer: question.answer,
          scoreDelta: pointGain,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          selected: option,
          answer: question.answer,
        },
      });

      queueTimeout(() => {
        if (nextCorrect >= goalCorrect) {
          completeRun(nextScore, nextCorrect, nextAttempts);
          return;
        }
        advanceQuestion();
      }, QUESTION_ADVANCE_MS);
      return;
    }

    setFeedbackState('incorrect');

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score,
      metadata: {
        selected: option,
        answer: question.answer,
      },
    });

    queueTimeout(() => {
      advanceQuestion();
    }, QUESTION_FEEDBACK_MS);
  };

  const sparkClassName = feedbackState === 'correct'
    ? 'text-emerald-200 drop-shadow-[0_0_18px_rgba(110,231,183,0.9)]'
    : 'text-white/80';

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={dojoBackground}
        alt="Number line dojo backdrop"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.2),transparent_58%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
        <div className="shrink-0 pt-1 text-center">
          <p className="mx-auto max-w-[700px] text-[clamp(16px,2.2vw,28px)] font-black leading-tight text-white/95 drop-shadow-[0_2px_6px_rgba(2,6,23,0.9)]">
            {question.prompt}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex h-[52%] min-h-[280px] w-full max-w-[900px] items-center justify-center">
            <motion.div
              animate={{ opacity: [0.34, 0.64, 0.34], scale: [0.985, 1.02, 0.985] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 rounded-[3.4rem] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.28),rgba(15,23,42,0.12)_54%,transparent_78%)]"
            />

            <div className="relative w-[95%] max-w-[860px]">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 18px rgba(34,211,238,0.55)',
                    '0 0 30px rgba(34,211,238,0.9)',
                    '0 0 18px rgba(34,211,238,0.55)',
                  ],
                  opacity: [0.92, 1, 0.92],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-[4%] right-[4%] top-1/2 h-[14px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200 via-cyan-100 to-cyan-200"
              />

              {question.labels.map((label, index) => {
                const pct = (index / (question.labels.length - 1)) * 100;
                const isMissing = index === question.focusIndex;
                const labelIsQuestion = label === '?';
                return (
                  <div
                    key={`${question.id}-${index}`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pct}%` }}
                  >
                    <div className={`h-[96px] w-[9px] rounded-full ${isMissing ? 'bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.95)]' : 'bg-white/95'}`} />
                    <div className="mt-5 flex min-h-[56px] items-center justify-center">
                      {labelIsQuestion ? (
                        <motion.div
                          animate={{ scale: [1, 1.07, 1], boxShadow: ['0 0 0px rgba(245,158,11,0.25)', '0 0 24px rgba(245,158,11,0.9)', '0 0 0px rgba(245,158,11,0.25)'] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[2.5px] border-amber-300/95 bg-slate-900/85 text-[44px] font-black text-amber-100"
                        >
                          ?
                        </motion.div>
                      ) : (
                        <span className="text-[clamp(34px,3.8vw,58px)] font-black tracking-tight text-white drop-shadow-[0_4px_8px_rgba(2,6,23,0.9)]">
                          {label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], y: [0, -6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className={`pointer-events-none absolute left-1/2 top-[4%] -translate-x-1/2 text-4xl ${sparkClassName}`}
              >
                *
              </motion.div>
            </div>
          </div>
        </div>

        <div className="shrink-0 pb-1 pt-3">
          <div className="mx-auto grid w-full max-w-[840px] grid-cols-2 gap-5 sm:gap-6">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = feedbackState === 'correct' && isSelected;
              const isWrong = feedbackState === 'incorrect' && isSelected;
              const buttonImage = isSelected ? answerButtonPressed : answerButtonIdle;

              return (
                <motion.button
                  key={`${question.id}-${option}`}
                  type="button"
                  onClick={() => handleAnswerTap(option)}
                  disabled={locked || didComplete || didFail || !isSessionActive}
                  whileTap={{ scale: 0.965 }}
                  className="group relative h-[108px] w-full"
                >
                  <img
                    src={buttonImage}
                    alt=""
                    className="absolute inset-0 h-full w-full select-none object-fill"
                    draggable={false}
                  />
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCorrect ? [1, 1.07, 1] : 1,
                      y: isWrong ? [0, -3, 3, -2, 0] : 0,
                    }}
                    transition={{ duration: isWrong ? 0.35 : 0.4 }}
                    className={`relative flex h-full items-center justify-center text-[clamp(40px,4.6vw,62px)] font-black tracking-tight drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)] ${
                      isCorrect
                        ? 'text-emerald-100'
                        : isWrong
                          ? 'text-rose-200'
                          : 'text-amber-50'
                    }`}
                  >
                    {option}
                  </motion.div>
                  {isCorrect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.7, 1.06, 1.14] }}
                      transition={{ duration: 0.5 }}
                      className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-300/25 blur-sm"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {feedbackState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
          >
            <div className={`rounded-full px-5 py-2 text-sm font-black uppercase tracking-[0.24em] ${
              feedbackState === 'correct'
                ? 'bg-emerald-400/95 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.85)]'
                : 'bg-rose-500/95 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)]'
            }`}>
              {feedbackState === 'correct' ? 'Great Hit!' : 'Try Another!'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NumberLineNinjaGame;



