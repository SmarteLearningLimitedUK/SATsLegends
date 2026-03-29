import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import dojoBackground from '../assets/maps/inside dojo.jpg';

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

  const focusPct = (question.focusIndex / (question.labels.length - 1)) * 100;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={dojoBackground}
        alt="Number line dojo backdrop"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.14),transparent_64%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+4.2rem)] pt-1">
        <div className="mt-[14px] shrink-0 text-center">
          <p className="mx-auto max-w-[700px] text-[clamp(15px,1.9vw,23px)] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(2,6,23,0.92)]">
            {question.prompt}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 items-start justify-center pt-1">
          <div className="relative flex h-[31%] min-h-[160px] w-full max-w-[680px] items-center justify-center">
            <motion.div
              animate={{ opacity: [0.26, 0.54, 0.26], scale: [0.985, 1.025, 0.985] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 rounded-[999px] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.28),rgba(30,41,59,0.05)_58%,transparent_80%)]"
            />

            <div className="relative w-[76%] max-w-[560px]">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(34,211,238,0.55)',
                    '0 0 36px rgba(34,211,238,0.94)',
                    '0 0 20px rgba(34,211,238,0.55)',
                  ],
                  opacity: [0.9, 1, 0.9],
                }}
                transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-0 right-0 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200 via-white to-cyan-200"
              />

              {question.labels.map((label, index) => {
                const pct = (index / (question.labels.length - 1)) * 100;
                const isMissing = index === question.focusIndex;
                const isQuestionMark = label === '?';

                return (
                  <React.Fragment key={`${question.id}-${index}`}>
                    <div
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      <div
                        className={`h-[52px] w-[5px] rounded-full ${
                          isMissing ? 'bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.98)]' : 'bg-white/95'
                        }`}
                      />
                    </div>

                    <div
                      className="absolute -translate-x-1/2"
                      style={{ left: `${pct}%`, top: 'calc(50% + 30px)' }}
                    >
                      <div className="flex h-[48px] w-[74px] items-center justify-center">
                        {isQuestionMark ? (
                          <motion.div
                            animate={{
                              scale: [1, 1.08, 1],
                              boxShadow: [
                                '0 0 0px rgba(245,158,11,0.25)',
                                '0 0 28px rgba(245,158,11,0.96)',
                                '0 0 0px rgba(245,158,11,0.25)',
                              ],
                            }}
                            transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 border-amber-300/95 bg-slate-900/82 text-[28px] font-black leading-none text-amber-100"
                          >
                            ?
                          </motion.div>
                        ) : (
                          <span className="text-[clamp(15px,1.8vw,22px)] font-black leading-none tracking-tight text-white drop-shadow-[0_4px_8px_rgba(2,6,23,0.92)]">
                            {label}
                          </span>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              <motion.div
                animate={{ y: [0, 10, 0], opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute top-[1%] -translate-x-1/2"
                style={{ left: `${focusPct}%` }}
              >
                <ChevronDown className="h-7 w-7 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.96)]" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="shrink-0 pb-1 pt-2">
          <div className="mx-auto grid w-full max-w-[560px] grid-cols-2 gap-2.5 sm:gap-3">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = feedbackState === 'correct' && isSelected;
              const isWrong = feedbackState === 'incorrect' && isSelected;

              return (
                <motion.button
                  key={`${question.id}-${option}`}
                  type="button"
                  onClick={() => handleAnswerTap(option)}
                  disabled={locked || didComplete || didFail || !isSessionActive}
                  whileTap={{ scale: 0.965 }}
                  className="group relative h-[48px] w-full"
                >
                  <div
                    className={`absolute inset-0 rounded-full border-[1.5px] transition-colors ${
                      isSelected
                        ? 'border-amber-200/90 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_8px_0_rgba(180,83,9,0.8),0_0_26px_rgba(251,191,36,0.45)]'
                        : 'border-cyan-100/75 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_8px_0_rgba(30,64,175,0.78),0_0_18px_rgba(34,211,238,0.32)]'
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-[8%] rounded-full bg-gradient-to-b from-white/30 via-transparent to-transparent" />

                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCorrect ? [1, 1.09, 1] : isSelected ? 1.03 : 1,
                      y: isWrong ? [0, -3, 3, -2, 0] : 0,
                    }}
                    transition={{ duration: isWrong ? 0.35 : 0.4 }}
                    className={`relative flex h-full items-center justify-center text-[clamp(20px,2.4vw,30px)] font-black tracking-tight drop-shadow-[0_3px_3px_rgba(0,0,0,0.42)] ${
                      isCorrect ? 'text-emerald-50' : isWrong ? 'text-rose-100' : isSelected ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {option}
                  </motion.div>

                  {isCorrect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.7, 1.08, 1.2] }}
                      transition={{ duration: 0.52 }}
                      className="pointer-events-none absolute inset-0 rounded-full bg-emerald-300/35 blur-[2px]"
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
            <div
              className={`rounded-full px-5 py-2 text-sm font-black uppercase tracking-[0.24em] ${
                feedbackState === 'correct'
                  ? 'bg-emerald-400/95 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.85)]'
                  : 'bg-rose-500/95 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)]'
              }`}
            >
              {feedbackState === 'correct' ? 'Great Hit!' : 'Try Another!'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NumberLineNinjaGame;
