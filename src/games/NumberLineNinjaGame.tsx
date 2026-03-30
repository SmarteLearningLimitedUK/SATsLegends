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
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
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

interface DragAnswerState {
  option: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

const QUESTION_ADVANCE_MS = 620;
const QUESTION_FEEDBACK_MS = 520;
const SNAP_DISTANCE_PX = 86;

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

const scoreToStars = (XP: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (XP >= 1700 && accuracy >= 0.85) return 3;
  if (XP >= 1000 && accuracy >= 0.65) return 2;
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
  const [XP, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [didComplete, setDidComplete] = useState(false);
  const [didFail, setDidFail] = useState(false);
  const [dragAnswer, setDragAnswer] = useState<DragAnswerState | null>(null);
  const [lineShake, setLineShake] = useState(false);
  const [snapReady, setSnapReady] = useState(false);

  const timeoutIdsRef = useRef<number[]>([]);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

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
    setDragAnswer(null);
    setLineShake(false);
    setSnapReady(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (isSessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [didComplete, didFail, isSessionActive, lives, onGameOver, XP, sessionEvents, sessionState]);

  const completeRun = (finalScore: number, nextCorrect: number, nextAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, nextCorrect, nextAttempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      XP: finalScore,
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
    setDragAnswer(null);
    setLineShake(false);
    setSnapReady(false);
  };

  const getDropMetrics = () => {
    const dropRect = dropZoneRef.current?.getBoundingClientRect();
    if (!dropRect) return null;
    return {
      rect: dropRect,
      centerX: dropRect.left + (dropRect.width / 2),
      centerY: dropRect.top + (dropRect.height / 2),
      threshold: Math.max(SNAP_DISTANCE_PX, Math.max(dropRect.width, dropRect.height) * 1.35),
    };
  };

  const isNearDropZone = (clientX: number, clientY: number) => {
    const metrics = getDropMetrics();
    if (!metrics) return false;
    return Math.hypot(clientX - metrics.centerX, clientY - metrics.centerY) <= metrics.threshold;
  };

  const handleAnswerDrop = (option: string) => {
    if (!isSessionActive || locked || didComplete || didFail) return;

    const isCorrect = option === question.answer;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedAnswer(option);
    setLocked(true);

    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      const pointGain = 130 + (nextCorrect % 4 === 0 ? 30 : 0);
      const nextScore = XP + pointGain;

      setCorrectCount(nextCorrect);
      setScore(nextScore);
      setFeedbackState('correct');

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        XP,
        metadata: {
          scoreAfter: nextScore,
          selected: option,
          answer: question.answer,
          scoreDelta: pointGain,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        XP: nextScore,
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
    setLineShake(true);

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      XP,
      metadata: {
        selected: option,
        answer: question.answer,
      },
    });

    queueTimeout(() => {
      setLineShake(false);
      advanceQuestion();
    }, QUESTION_FEEDBACK_MS);
  };

  useEffect(() => {
    if (!dragAnswer) return undefined;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== dragAnswer.pointerId) return;
      const isNear = isNearDropZone(event.clientX, event.clientY);
      setSnapReady(isNear);
      setDragAnswer((current) => (current && current.pointerId === event.pointerId
        ? { ...current, clientX: event.clientX, clientY: event.clientY }
        : current));
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== dragAnswer.pointerId) return;
      const withinDrop = isNearDropZone(event.clientX, event.clientY);
      const option = dragAnswer.option;
      setDragAnswer(null);
      setSnapReady(false);
      if (withinDrop) {
        handleAnswerDrop(option);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setSnapReady(false);
    };
  }, [dragAnswer, handleAnswerDrop]);

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
          <motion.div
            animate={lineShake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.34, ease: 'easeInOut' }}
            className="relative flex h-[31%] min-h-[160px] w-full max-w-[680px] items-center justify-center"
          >
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
                            ref={dropZoneRef}
                            animate={{
                              scale: snapReady ? [1.08, 1.18, 1.08] : [1, 1.08, 1],
                              boxShadow: [
                                snapReady ? '0 0 10px rgba(245,158,11,0.48)' : '0 0 0px rgba(245,158,11,0.25)',
                                snapReady ? '0 0 34px rgba(245,158,11,1)' : '0 0 28px rgba(245,158,11,0.96)',
                                snapReady ? '0 0 10px rgba(245,158,11,0.48)' : '0 0 0px rgba(245,158,11,0.25)',
                              ],
                            }}
                            transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                            className={`flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 text-[28px] font-black leading-none ${
                              snapReady
                                ? 'border-amber-100 bg-amber-400/40 text-white'
                                : 'border-amber-300/95 bg-slate-900/82 text-amber-100'
                            }`}
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
          </motion.div>
        </div>

        <div className="shrink-0 pb-1 pt-2">
          <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/88">
            Drag a number into the missing slot
          </div>
          <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center justify-center gap-3 sm:gap-4">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = feedbackState === 'correct' && isSelected;
              const isWrong = feedbackState === 'incorrect' && isSelected;
              const isDragging = dragAnswer?.option === option;

              return (
                <motion.button
                  key={`${question.id}-${option}`}
                  type="button"
                  onPointerDown={(event) => {
                    if (locked || didComplete || didFail || !isSessionActive) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragAnswer({
                      option,
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      offsetX: event.clientX - rect.left,
                      offsetY: event.clientY - rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  disabled={locked || didComplete || didFail || !isSessionActive}
                  whileTap={{ scale: 0.985 }}
                  className="group relative h-[72px] w-[72px] touch-none sm:h-[78px] sm:w-[78px]"
                >
                  <div
                    className={`absolute inset-0 rounded-full border-[2px] transition-colors ${
                      isSelected
                        ? 'border-amber-200/90 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_10px_0_rgba(180,83,9,0.8),0_0_26px_rgba(251,191,36,0.45)]'
                        : 'border-cyan-100/75 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_10px_0_rgba(30,64,175,0.78),0_0_18px_rgba(34,211,238,0.32)]'
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-[9%] rounded-full bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute inset-[16%] rounded-full border border-white/12" />

                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isDragging ? 0.2 : 1,
                      scale: isCorrect ? [1, 1.09, 1] : isSelected ? 1.03 : 1,
                      y: isWrong ? [0, -3, 3, -2, 0] : 0,
                    }}
                    transition={{ duration: isWrong ? 0.35 : 0.4 }}
                    className={`relative flex h-full items-center justify-center px-1 text-center text-[clamp(16px,1.95vw,24px)] font-black leading-none tracking-tight drop-shadow-[0_3px_3px_rgba(0,0,0,0.42)] ${
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
        {dragAnswer && (
          (() => {
            const metrics = getDropMetrics();
            const snappedLeft = metrics ? metrics.centerX - (dragAnswer.width / 2) : dragAnswer.clientX - dragAnswer.offsetX;
            const snappedTop = metrics ? metrics.centerY - (dragAnswer.height / 2) : dragAnswer.clientY - dragAnswer.offsetY;
            return (
              <motion.div
                key={`drag-answer-${dragAnswer.option}`}
                initial={{ scale: 0.96, opacity: 0.95 }}
                animate={{
                  scale: snapReady ? 1.08 : 1.03,
                  opacity: 1,
                  left: snapReady ? snappedLeft : dragAnswer.clientX - dragAnswer.offsetX,
                  top: snapReady ? snappedTop : dragAnswer.clientY - dragAnswer.offsetY,
                }}
                exit={{ scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="pointer-events-none absolute z-30"
                style={{
                  width: dragAnswer.width,
                  height: dragAnswer.height,
                }}
              >
                <div className="relative h-full w-full">
                  <div className={`absolute inset-0 rounded-full border-[2px] shadow-[0_10px_0_rgba(30,64,175,0.78),0_0_18px_rgba(34,211,238,0.42)] ${
                    snapReady
                      ? 'border-amber-100 bg-gradient-to-b from-amber-300 to-amber-500'
                      : 'border-cyan-100/75 bg-gradient-to-b from-cyan-400 to-blue-600'
                  }`} />
                  <div className="pointer-events-none absolute inset-[9%] rounded-full bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute inset-[16%] rounded-full border border-white/12" />
                  <div className="relative flex h-full items-center justify-center px-1 text-center text-[clamp(16px,1.95vw,24px)] font-black leading-none tracking-tight text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.42)]">
                    {dragAnswer.option}
                  </div>
                </div>
              </motion.div>
            );
          })()
        )}
      </AnimatePresence>

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
