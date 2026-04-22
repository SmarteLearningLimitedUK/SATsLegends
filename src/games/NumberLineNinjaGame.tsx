import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import dojoBackground from '../assets/maps/backgroundsforgames/numberlineninja.jpg';
import { pickBossArt } from '../assets/bosses/library';
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

interface FlyingAnswerState {
  value: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface NumberLineQuestion {
  id: number;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  labels: string[];
  focusIndex: number;
  options: string[];
  answer: string;
}

const QUESTION_ADVANCE_MS = 620;
const QUESTION_FEEDBACK_MS = 520;
const MONSTER_HIT_REACTION_MS = 900;
const MONSTER_ESCAPE_LINE = 'The Monster Mind slips deeper into the shadows, hiding more of the path!';
const MONSTER_DAMAGE_LINES = ['Ouch!', 'Nice hit!', 'Direct hit!', 'Pow!', 'Bullseye!'] as const;

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

const createStaticEnemyFrame = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const stack: number[] = [];

        const isNearBlack = (index: number) => {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          if (a === 0) return false;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return max <= 42 && max - min <= 18;
        };

        const pushIfBlack = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const point = y * width + x;
          if (visited[point]) return;
          const pixelIndex = point * 4;
          if (!isNearBlack(pixelIndex)) return;
          visited[point] = 1;
          stack.push(point);
        };

        for (let x = 0; x < width; x += 1) {
          pushIfBlack(x, 0);
          pushIfBlack(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          pushIfBlack(0, y);
          pushIfBlack(width - 1, y);
        }

        while (stack.length > 0) {
          const point = stack.pop() as number;
          const pixelIndex = point * 4;
          data[pixelIndex + 3] = 0;
          const x = point % width;
          const y = (point / width) | 0;
          pushIfBlack(x + 1, y);
          pushIfBlack(x - 1, y);
          pushIfBlack(x, y + 1);
          pushIfBlack(x, y - 1);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Failed to load enemy frame'));
    image.src = src;
  });

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

const buildPrompt = (missingCount: number) => {
  const isSingle = missingCount === 1;
  return [
    'The Monster Minds have hidden part of the island path.',
    `${isSingle ? 'Which number is missing?' : 'What numbers are missing?'}`,
  ].join('\n');
};

const createQuestion = (
  prompt: string,
  values: number[],
  focusIndex: number,
  distractors: number[],
): NumberLineQuestion => {
  const answer = values[focusIndex];
  const options = uniqueStrings([
    formatNumber(answer),
    ...distractors.map((value) => formatNumber(value)),
  ]);

  let padCandidate = answer + 3;
  while (options.length < 4) {
    const formatted = formatNumber(padCandidate);
    if (!options.includes(formatted)) {
      options.push(formatted);
    }
    padCandidate += 1;
  }

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    kind: 'fluency',
    prompt,
    labels: values.map((value, index) => (index === focusIndex ? '?' : formatNumber(value))),
    focusIndex,
    options: shuffle(options).slice(0, 4),
    answer: formatNumber(answer),
  };
};

const difficultyBandForLevel = (levelId: number) => {
  if (levelId <= 2) return 1;
  if (levelId <= 4) return 3;
  if (levelId <= 6) return 5;
  if (levelId <= 8) return 7;
  return 9;
};

const buildQuestion = (levelId: number): NumberLineQuestion => {
  const difficulty = difficultyBandForLevel(levelId);
  const focusIndex = randomInt(1, 3);

  if (difficulty <= 2) {
    const start = randomInt(0, 6);
    const step = 1;
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    return createQuestion(buildPrompt(1), values, focusIndex, [
      values[focusIndex] + 1,
      Math.max(0, values[focusIndex] - 1),
      values[focusIndex] + 2,
    ]);
  }

  if (difficulty <= 4) {
    const start = randomInt(0, 5) * 2;
    const step = [2, 5][randomInt(0, 1)];
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    return createQuestion(buildPrompt(1), values, focusIndex, [
      values[focusIndex] + step,
      Math.max(0, values[focusIndex] - step),
      values[focusIndex] + (step * 2),
    ]);
  }

  if (difficulty <= 6) {
    const start = randomInt(1, 6) * 10;
    const step = 10;
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    return createQuestion(buildPrompt(1), values, focusIndex, [
      values[focusIndex] + 10,
      values[focusIndex] - 10,
      values[focusIndex] + 20,
    ]);
  }

  if (difficulty <= 8) {
    const start = randomInt(-6, -2) * 5;
    const step = 5;
    const values = Array.from({ length: 5 }, (_, index) => start + (step * index));
    return createQuestion(buildPrompt(1), values, focusIndex, [
      values[focusIndex] + 5,
      values[focusIndex] - 5,
      values[focusIndex] + 10,
    ]);
  }

  const base = randomInt(1, 6) / 10;
  const step = [0.1, 0.2, 0.25][randomInt(0, 2)];
  const values = Array.from({ length: 5 }, (_, index) => Number((base + (step * index)).toFixed(2)));
  return createQuestion(buildPrompt(1), values, focusIndex, [
    Number((values[focusIndex] + step).toFixed(2)),
    Number((values[focusIndex] - step).toFixed(2)),
    Number((values[focusIndex] + (step * 2)).toFixed(2)),
  ]);
};

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  isPractice,
  practiceBriefing,
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
  const [lineShake, setLineShake] = useState(false);
  const [flyingAnswer, setFlyingAnswer] = useState<FlyingAnswerState | null>(null);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [monsterEffect, setMonsterEffect] = useState<'idle' | 'hit'>('idle');
  const [monsterHitFx, setMonsterHitFx] = useState(false);
  const [monsterSmokeFx, setMonsterSmokeFx] = useState(false);
  const [monsterSpeech, setMonsterSpeech] = useState<string | null>(null);
  const [monsterHitAnimationIndex, setMonsterHitAnimationIndex] = useState(0);
  const monsterHitA = useMemo(() => pickBossArt(`number-line-ninja-${levelId}-a`), [levelId]);
  const monsterHitB = useMemo(() => pickBossArt(`number-line-ninja-${levelId}-b`), [levelId]);
  const [idleMonsterSrc, setIdleMonsterSrc] = useState<string>(monsterHitA);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const timeoutIdsRef = useRef<number[]>([]);
  const answerLockRef = useRef(false);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const missingSlotRef = useRef<HTMLDivElement | null>(null);
  const optionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const monsterSpeechTimeoutRef = useRef<number | null>(null);

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
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

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
    answerLockRef.current = false;
    setDidComplete(false);
    setDidFail(false);
    setLineShake(false);
    setFlyingAnswer(null);
    setConfettiBurstKey(0);
    setMonsterEffect('idle');
    setMonsterHitFx(false);
    setMonsterSmokeFx(false);
    setMonsterSpeech(null);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    let mounted = true;
    createStaticEnemyFrame(monsterHitA)
      .then((frame) => {
        if (mounted) setIdleMonsterSrc(frame);
      })
      .catch(() => {
        if (mounted) setIdleMonsterSrc(monsterHitA);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (monsterEffect !== 'hit') return undefined;
    setMonsterHitFx(true);
    const timeoutId = window.setTimeout(() => setMonsterHitFx(false), MONSTER_HIT_REACTION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [monsterEffect]);

  useEffect(() => () => {
    if (monsterSpeechTimeoutRef.current !== null) {
      window.clearTimeout(monsterSpeechTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!sessionState || didComplete || didFail) return;
    if (isSessionActive) return;

    setDidFail(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
    onGameOver(XP);
  }, [didComplete, didFail, isSessionActive, lives, onGameOver, XP, sessionEvents, sessionState]);

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
    setQuestion(buildQuestion(Math.max(levelId, 1)));
    setSelectedAnswer(null);
    setFeedbackState('idle');
    setLocked(false);
    answerLockRef.current = false;
    setLineShake(false);
    setFlyingAnswer(null);
    setMonsterEffect('idle');
    setMonsterHitFx(false);
    setMonsterSmokeFx(false);
    setMonsterSpeech(null);
  };

  const triggerMonsterHit = () => {
    setMonsterEffect('hit');
    setMonsterSpeech(MONSTER_DAMAGE_LINES[Math.floor(Math.random() * MONSTER_DAMAGE_LINES.length)]);
    setMonsterHitAnimationIndex((current) => (current === 0 ? 1 : 0));

    if (monsterSpeechTimeoutRef.current !== null) {
      window.clearTimeout(monsterSpeechTimeoutRef.current);
    }

    monsterSpeechTimeoutRef.current = window.setTimeout(() => {
      setMonsterSpeech(null);
    }, MONSTER_HIT_REACTION_MS - 120);

    queueTimeout(() => {
      setMonsterEffect('idle');
    }, MONSTER_HIT_REACTION_MS);
  };

  const getTravelAnimation = (option: string): FlyingAnswerState | null => {
    const rootRect = playfieldRef.current?.getBoundingClientRect();
    const optionRect = optionButtonRefs.current[option]?.getBoundingClientRect();
    const slotRect = missingSlotRef.current?.getBoundingClientRect();

    if (!rootRect || !optionRect || !slotRect) return null;

    return {
      value: option,
      startX: optionRect.left - rootRect.left + (optionRect.width / 2),
      startY: optionRect.top - rootRect.top + (optionRect.height / 2),
      endX: slotRect.left - rootRect.left + (slotRect.width / 2),
      endY: slotRect.top - rootRect.top + (slotRect.height / 2),
    };
  };

  const handleAnswerDrop = (option: string) => {
    if (!isSessionActive || locked || answerLockRef.current || didComplete || didFail) return;

    answerLockRef.current = true;

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
      setMonsterSmokeFx(false);
      setFlyingAnswer(getTravelAnimation(option));
      setConfettiBurstKey((current) => current + 1);
      triggerMonsterHit();

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: XP,
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
      }, Math.max(QUESTION_ADVANCE_MS, 760));
      return;
    }

    setFeedbackState('incorrect');
    setLineShake(true);
    setMonsterSmokeFx(true);
    setMonsterSpeech(MONSTER_ESCAPE_LINE);

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
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

  const focusPct = (question.focusIndex / (question.labels.length - 1)) * 100;
  const monsterRemainingHealth = Math.max(0, goalCorrect - correctCount);
  const monsterHealthPct = (monsterRemainingHealth / goalCorrect) * 100;
  const activeMonsterHitSrc = monsterHitAnimationIndex === 0 ? monsterHitA : monsterHitB;

  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const [questionDockBottom, setQuestionDockBottom] = useState<number>(0);

  useLayoutEffect(() => {
    const node = questionCardRef.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const playfieldTop = playfieldRef.current?.getBoundingClientRect().top ?? 0;
      setQuestionDockBottom(rect.bottom - playfieldTop);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [question.id]);

  return (
    <div ref={playfieldRef} className="relative h-full w-full overflow-hidden">
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Number Line Ninja"
        body="The Monster Minds have hidden the path markers.\nUse the number line to find the missing value.\nFollow the steps carefully along the line."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <img
        src={dojoBackground}
        alt="Number line dojo backdrop"
        className="absolute inset-0 h-full w-full object-contain object-center"
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(56,189,248,0.14),transparent_64%)]" />

      {/* Standard shared question banner. */}
      <div
        ref={questionCardRef}
        className="qa-question-card pointer-events-none fixed left-0 right-0 z-[60]"
        style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
      >
      <GameQuestionCard
          title="Number Line Ninja"
          className="mx-auto w-[min(88vw,38rem)] rounded-[0.95rem] px-3.5 py-2.5 text-center"
          titleClassName="text-[9px] tracking-[0.28em] md:text-[10px]"
          bodyClassName="mt-1 text-[clamp(0.84rem,1.7vw,0.98rem)] leading-snug md:text-[clamp(0.92rem,1.8vw,1rem)]"
        >
          {question.prompt}
        </GameQuestionCard>
      </div>

      <div
        className="relative z-10 flex h-full min-h-0 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+5.2rem)]"
        style={{
          // Keep the number line docked below the fixed question card (even when the text wraps).
          // Requirement: number line should be below the question card without touching it.
          paddingTop: `${Math.max(0, questionDockBottom + 14)}px`,
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start pt-0">
          <motion.div
            animate={lineShake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.34, ease: 'easeInOut' }}
            className="qa-number-line relative mt-0 flex h-[24%] min-h-[156px] w-full max-w-[760px] items-center justify-center"
            style={{ marginTop: 12 }}
          >
            <div className="relative w-full rounded-[1.3rem] border border-cyan-100/18 bg-slate-950/30 px-3.5 py-3.5 shadow-[0_16px_34px_rgba(2,6,23,0.28)] backdrop-blur-[8px] md:px-4 md:py-4">
              <div className="mb-2 flex items-center justify-center gap-3 px-2 text-[clamp(0.6rem,1.25vw,0.72rem)] font-black uppercase tracking-[0.28em] text-amber-200/92">
                <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent via-amber-200/65 to-transparent" />
                <span>Find the missing number</span>
                <span className="h-px flex-1 max-w-12 bg-gradient-to-r from-transparent via-amber-200/65 to-transparent" />
              </div>

              <motion.div
                animate={{ opacity: [0.28, 0.58, 0.28], scale: [0.985, 1.02, 0.985] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 rounded-[1.4rem] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.2),rgba(30,41,59,0.08)_58%,transparent_80%)]"
              />

              <div className="relative mx-auto w-[88%] max-w-[610px] pt-1">
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 18px rgba(34,211,238,0.45)',
                      '0 0 32px rgba(34,211,238,0.84)',
                      '0 0 18px rgba(34,211,238,0.45)',
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
                          className={`h-[58px] w-[5px] rounded-full ${
                            isMissing ? 'bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.98)]' : 'bg-white/95'
                          }`}
                        />
                      </div>

                      <div
                        className="absolute -translate-x-1/2"
                        style={{ left: `${pct}%`, top: 'calc(50% + 34px)' }}
                      >
                        <div className="flex h-[48px] w-[74px] items-center justify-center">
                          {isQuestionMark ? (
                            <motion.div
                              ref={missingSlotRef}
                              animate={{
                                scale: [1, 1.08, 1],
                                boxShadow: [
                                  '0 0 0px rgba(245,158,11,0.25)',
                                  '0 0 28px rgba(245,158,11,0.96)',
                                  '0 0 0px rgba(245,158,11,0.25)',
                                ],
                              }}
                              transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                              className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-amber-300/95 bg-slate-900/82 text-[30px] font-black leading-none text-amber-100"
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
                  className="pointer-events-none absolute top-[-10px] -translate-x-1/2"
                  style={{ left: `${focusPct}%` }}
                >
                  <ChevronDown className="h-7 w-7 text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.96)]" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="relative mt-2 flex h-[31%] min-h-[220px] w-full max-w-[560px] shrink-0 translate-y-[2px] items-end justify-center">
            <div className="qa-enemy-cluster pointer-events-none relative mx-auto flex w-full max-w-[560px] flex-col items-center justify-end gap-4">
              <div className="w-[144px] self-center translate-y-[122px] rounded-2xl border border-amber-200/35 bg-slate-900/76 p-1.5 shadow-[0_10px_20px_rgba(2,6,23,0.46)] sm:w-[162px]">
                <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.12em] text-amber-200 md:text-[9px]">
                  Monster Mind
                </div>
                <div className="relative h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/80">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                    animate={{ width: `${monsterHealthPct}%` }}
                    transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:10%_100%]" />
                </div>
              </div>

              <div className="relative flex w-full min-w-0 max-w-[280px] justify-center">
                <AnimatePresence>
                  {monsterSpeech ? (
                    <motion.div
                      key={`monster-speech-${monsterSpeech}`}
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: [1, 1.04, 1] }}
                      exit={{ opacity: 0, y: -8, scale: 0.9 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="absolute left-1/2 top-[-18%] z-40 -translate-x-1/2"
                    >
                      <div className="relative">
                        <motion.div
                          className="absolute inset-[-8px] rounded-full bg-amber-300/35 blur-md"
                          animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.04, 0.96] }}
                          transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <div className="relative max-w-[220px] rounded-full border border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(254,243,199,0.94)_42%,rgba(254,215,170,0.92)_100%)] px-3.5 py-1.5 text-center text-[clamp(0.62rem,1.8vw,0.9rem)] font-black leading-tight tracking-normal text-slate-800 shadow-[0_10px_18px_rgba(2,6,23,0.45)] sm:max-w-[240px]">
                          {monsterSpeech}
                        </div>
                        <div className="absolute left-1/2 top-[100%] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-amber-200/70 bg-amber-100/95" />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.div
                  className="absolute left-1/2 top-[62%] h-[38%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                  animate={{
                    opacity: monsterSmokeFx ? 0.6 : monsterEffect === 'idle' ? 0.22 : 0.52,
                    scale: monsterSmokeFx ? [1, 1.08, 0.98, 1.04, 1] : monsterEffect === 'idle' ? 1 : [1, 1.12, 1],
                    backgroundColor:
                      monsterSmokeFx
                        ? 'rgba(88,28,135,0.78)'
                        : monsterEffect === 'hit'
                        ? 'rgba(248,113,113,0.92)'
                        : 'rgba(56,189,248,0.55)',
                  }}
                  transition={{
                    duration: monsterSmokeFx ? 0.82 : monsterEffect === 'hit' ? 0.32 : 0.45,
                    ease: 'easeInOut',
                    repeat: monsterSmokeFx || monsterEffect !== 'idle' ? 0 : Infinity,
                    repeatDelay: 1.1,
                  }}
                />

                <AnimatePresence>
                  {monsterSmokeFx ? (
                    <motion.div
                      key={`monster-smoke-${question.id}-${feedbackState}`}
                      className="pointer-events-none absolute inset-[-24%] z-10"
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <motion.div
                        className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0.28),rgba(88,28,135,0.6)_40%,rgba(15,23,42,0.08)_64%,transparent_78%)] blur-2xl"
                        animate={{ rotate: [0, 120, 240, 360] }}
                        transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
                      />
                      <motion.div
                        className="absolute left-[14%] top-[28%] h-[34%] w-[34%] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.74),rgba(17,24,39,0.1)_62%,transparent_80%)] blur-xl"
                        animate={{
                          x: [0, 16, 0, -12, 0],
                          y: [0, -10, 6, -4, 0],
                          rotate: [0, 90, 180, 270, 360],
                          scale: [0.86, 1.08, 0.94, 1.02, 0.9],
                        }}
                        transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div
                        className="absolute right-[16%] top-[18%] h-[30%] w-[30%] rounded-full bg-[radial-gradient(circle_at_65%_35%,rgba(31,41,55,0.9),rgba(168,85,247,0.58)_45%,rgba(17,24,39,0.06)_74%,transparent_84%)] blur-xl"
                        animate={{
                          x: [0, -12, 0, 10, 0],
                          y: [0, 8, -6, 4, 0],
                          rotate: [0, -90, -180, -270, -360],
                          scale: [0.9, 1.12, 0.96, 1.04, 0.9],
                        }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div
                        className="absolute inset-[26%] rounded-full border border-fuchsia-400/20 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.2),rgba(88,28,135,0.25)_56%,transparent_82%)] blur-lg"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.div>
                  ) : null}

                  {monsterHitFx ? (
                    <motion.div
                      key={`monster-hit-fx-${question.id}-${confettiBurstKey}`}
                      className="pointer-events-none absolute inset-[-16%]"
                      initial={{ opacity: 0.98, scale: 0.54 }}
                      animate={{ opacity: 0, scale: 1.46, rotate: 160 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.56, ease: 'easeOut' }}
                    >
                      <div className="absolute inset-0 rounded-full border-[8px] border-rose-400/90 blur-[1px]" />
                      <div className="absolute inset-[18%] rounded-full border-[5px] border-red-500/85" />
                      <div className="absolute inset-[38%] rounded-full border-[4px] border-orange-300/85" />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.div
                  className="relative w-[84%] max-w-[300px] translate-y-[110px] scale-[0.94] sm:w-full sm:max-w-[330px] sm:scale-100"
                  animate={{
                    y: [0, -5, 0],
                    x: monsterEffect === 'hit' ? [0, -9, 9, -8, 8, -5, 5, 0] : 0,
                    rotate: monsterEffect === 'hit' ? [0, -2.2, 2.2, -1.8, 1.8, 0] : 0,
                    scale: monsterEffect === 'hit' ? [1.04, 1.08, 1.04] : 1,
                  }}
                  transition={{
                    y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                    x: { duration: 0.9, ease: 'easeInOut' },
                    rotate: { duration: 0.9, ease: 'easeInOut' },
                    scale: { duration: 0.9, ease: 'easeInOut' },
                  }}
                >
                  <motion.img
                    src={idleMonsterSrc}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="relative h-auto w-full object-contain drop-shadow-[0_16px_22px_rgba(2,6,23,0.5)]"
                    animate={{ opacity: monsterEffect === 'hit' ? 0 : 1 }}
                    transition={{ duration: 0.14, ease: 'easeOut' }}
                  />
                  <AnimatePresence>
                    {monsterEffect === 'hit' ? (
                      <motion.img
                        key={`monster-hit-${question.id}-${monsterHitAnimationIndex}`}
                        src={activeMonsterHitSrc}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-contain"
                        initial={{ opacity: 0.98 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 pb-1 pt-2">
          <div className="mb-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/88">
            Reveal the missing marker
          </div>
          <div className="mx-auto flex w-full max-w-[620px] flex-wrap items-center justify-center gap-3.5 sm:gap-4">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = feedbackState === 'correct' && isSelected;
              const isWrong = feedbackState === 'incorrect' && isSelected;

              return (
                <motion.button
                  key={`${question.id}-${option}-${index}`}
                  type="button"
                  data-button-skin="none"
                  ref={(node) => {
                    optionButtonRefs.current[option] = node;
                  }}
                  onClick={() => handleAnswerDrop(option)}
                  disabled={locked || didComplete || didFail || !isSessionActive}
                  whileTap={{ scale: 0.985 }}
                  animate={{
                    scale: isCorrect ? [1, 1.16, 0.98, 1.08, 1] : 1,
                    rotateX: isCorrect ? [0, 90, 180, 270, 360, 540, 720] : 0,
                  }}
                  transition={{ duration: isCorrect ? 0.72 : 0.4, ease: 'easeInOut' }}
                  className="group relative h-[66px] w-[66px] sm:h-[74px] sm:w-[74px]"
                  style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
                >
                  <div
                    className={`absolute inset-0 rounded-full border-[2px] transition-colors ${
                      isSelected
                        ? isCorrect
                          ? 'border-emerald-100/95 bg-gradient-to-b from-emerald-300 to-green-600 shadow-[0_10px_0_rgba(20,83,45,0.82),0_0_30px_rgba(74,222,128,0.72)]'
                          : 'border-amber-200/90 bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_10px_0_rgba(180,83,9,0.8),0_0_26px_rgba(251,191,36,0.45)]'
                        : 'border-cyan-100/75 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-[0_10px_0_rgba(30,64,175,0.78),0_0_18px_rgba(34,211,238,0.32)]'
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-[9%] rounded-full bg-gradient-to-b from-white/30 via-transparent to-transparent" />
                  <div className="pointer-events-none absolute inset-[16%] rounded-full border border-white/12" />

                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCorrect ? 1 : isSelected ? 1.03 : 1,
                      y: isWrong ? [0, -3, 3, -2, 0] : 0,
                    }}
                    transition={{ duration: isWrong ? 0.35 : 0.4 }}
                    className={`relative flex h-full items-center justify-center px-1 text-center text-[clamp(14px,1.7vw,20px)] font-black leading-none tracking-tight drop-shadow-[0_3px_3px_rgba(0,0,0,0.42)] ${
                      isCorrect ? 'text-emerald-50' : isWrong ? 'text-amber-100' : isSelected ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {option}
                  </motion.div>

                  {isCorrect && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: [0, 1, 0.45, 0], scale: [0.7, 1.16, 1.28, 1.38] }}
                      transition={{ duration: 0.72 }}
                      className="pointer-events-none absolute inset-0 rounded-full bg-emerald-300/40 blur-[2px]"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      <AnimatePresence>
        {flyingAnswer && feedbackState === 'correct' && (
          <motion.div
            key={`${question.id}-${flyingAnswer.value}-${confettiBurstKey}`}
            initial={{
              x: flyingAnswer.startX - 36,
              y: flyingAnswer.startY - 36,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: flyingAnswer.endX - 23,
              y: flyingAnswer.endY - 23,
              scale: 0.64,
              opacity: 1,
              rotateX: [0, 180, 360, 540],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: [0.2, 0.85, 0.24, 1] }}
            className="pointer-events-none absolute z-30 h-[60px] w-[60px]"
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          >
            <div className="absolute inset-0 rounded-full border-[2px] border-emerald-100/95 bg-gradient-to-b from-emerald-300 to-green-600 shadow-[0_10px_0_rgba(20,83,45,0.82),0_0_28px_rgba(74,222,128,0.78)]" />
            <div className="pointer-events-none absolute inset-[9%] rounded-full bg-gradient-to-b from-white/30 via-transparent to-transparent" />
            <div className="relative flex h-full items-center justify-center px-1 text-center text-[clamp(14px,1.7vw,20px)] font-black leading-none tracking-tight text-emerald-50 drop-shadow-[0_3px_3px_rgba(0,0,0,0.42)]">
              {flyingAnswer.value}
            </div>
          </motion.div>
        )}

        {feedbackState === 'correct' && confettiBurstKey > 0 && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
            {[
              { left: '43%', top: '23%', color: 'bg-amber-300', delay: 0 },
              { left: '47%', top: '20%', color: 'bg-cyan-300', delay: 0.04 },
              { left: '51%', top: '24%', color: 'bg-emerald-300', delay: 0.08 },
              { left: '54%', top: '21%', color: 'bg-fuchsia-300', delay: 0.02 },
              { left: '58%', top: '25%', color: 'bg-rose-300', delay: 0.12 },
              { left: '46%', top: '28%', color: 'bg-white', delay: 0.06 },
              { left: '56%', top: '28%', color: 'bg-yellow-200', delay: 0.14 },
              { left: '50%', top: '18%', color: 'bg-sky-200', delay: 0.1 },
            ].map((piece, index) => (
              <motion.div
                key={`${confettiBurstKey}-${index}`}
                initial={{ opacity: 0, scale: 0.4, x: 0, y: 0, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  scale: [0.4, 1, 0.9],
                  x: [0, (index % 2 === 0 ? -1 : 1) * (18 + (index * 3))],
                  y: [0, 20 + (index * 6), 42 + (index * 7)],
                  rotate: [0, index % 2 === 0 ? -120 : 120],
                }}
                transition={{
                  duration: 0.74,
                  delay: piece.delay,
                  ease: 'easeOut',
                }}
                className={`absolute h-3 w-2 rounded-full ${piece.color}`}
                style={{ left: piece.left, top: piece.top }}
              />
            ))}
          </div>
        )}

                {feedbackState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2"
          >
            <div
              className={`rounded-full px-5 py-2 text-sm font-black tracking-[0.08em] ${
                feedbackState === 'correct'
                  ? 'bg-emerald-400/95 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.85)]'
                  : 'bg-rose-500/95 text-white shadow-[0_0_20px_rgba(244,63,94,0.7)]'
              }`}
            >
              {feedbackState === 'correct' ? 'Path restored!' : 'The path is still hidden…'}
            </div>
          </motion.div>
        )}

        {feedbackState === 'incorrect' && (
          <motion.div
            key={`${question.id}-wrong-x`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 1, 0.95, 1, 0],
              scale: [0.4, 1.18, 0.92, 1.15, 0.86],
            }}
            transition={{ duration: 0.64, times: [0, 0.2, 0.42, 0.68, 1], ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="text-[clamp(86px,18vw,150px)] font-black leading-none text-amber-300 drop-shadow-[0_0_28px_rgba(244,63,94,0.85)]">
              X
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      </div>
  );
};

export default NumberLineNinjaGame;

