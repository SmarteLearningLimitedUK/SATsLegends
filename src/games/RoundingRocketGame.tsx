import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import missionBackground from '../assets/maps/backgroundsforgames/roundingrocketbackground.jpg';
import roundingRocketArt from '../assets/rocktlogo.png';

interface RoundingRocketGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type RoundingRocketGameShellProps = RoundingRocketGameProps & MiniGameShellContractProps;

type RoundTarget = 10 | 100;

type RocketState =
  | 'idle'
  | 'arming'
  | 'launching'
  | 'failed';

interface RocketRound {
  id: number;
  value: number;
  target: RoundTarget;
  correctAnswer: number;
  pads: [number, number, number];
}

const CORRECT_RESET_MS = 640;
const FAILED_RESET_MS = 520;
const FINAL_LAUNCH_COMPLETE_MS = 980;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const scoreToStars = (XP: number, correct: number, attempts: number) => {
  const accuracy = attempts > 0 ? correct / attempts : 0;
  if (XP >= 1800 && accuracy >= 0.86) return 3;
  if (XP >= 1100 && accuracy >= 0.65) return 2;
  return 1;
};

const targetForLevel = (levelId: number): RoundTarget => {
  if (levelId <= 3) return 10;
  return 100;
};

const createFuelNumber = (target: RoundTarget, difficultyLevel: number) => {
  if (target === 10) {
    const upper = difficultyLevel <= 3 ? 140 : difficultyLevel <= 6 ? 350 : 980;
    let value = randomInt(12, upper);
    while (value % 10 === 0) value = randomInt(12, upper);
    return value;
  }

  const upper = difficultyLevel <= 6 ? 1200 : 9800;
  let value = randomInt(120, upper);
  while (value % 100 === 0) value = randomInt(120, upper);
  return value;
};

const buildPadOptions = (value: number, target: RoundTarget, correctAnswer: number): [number, number, number] => {
  const remainder = value % target;
  const wrongDirection = remainder >= target / 2 ? correctAnswer - target : correctAnswer + target;

  const candidatePool = [
    wrongDirection,
    correctAnswer - target,
    correctAnswer + target,
    correctAnswer - (target * 2),
    correctAnswer + (target * 2),
    correctAnswer + (target * 3),
  ].filter((candidate) => candidate >= 0 && candidate !== correctAnswer);

  const uniquePool = Array.from(new Set(candidatePool));
  const selected = shuffle(uniquePool).slice(0, 2);

  while (selected.length < 2) {
    const fallback = Math.max(0, correctAnswer + (target * (selected.length + 1)));
    if (!selected.includes(fallback) && fallback !== correctAnswer) selected.push(fallback);
    else selected.push(Math.max(0, correctAnswer - (target * (selected.length + 2))));
  }

  return shuffle([correctAnswer, selected[0], selected[1]]) as [number, number, number];
};

const generateRound = (levelId: number, magnitudeLevel: number): RocketRound => {
  const target = targetForLevel(levelId);
  const value = createFuelNumber(target, magnitudeLevel);
  const correctAnswer = Math.round(value / target) * target;
  const pads = buildPadOptions(value, target, correctAnswer);

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    value,
    target,
    correctAnswer,
    pads,
  };
};

const RoundingRocketGame: React.FC<RoundingRocketGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [round, setRound] = useState<RocketRound>(() => generateRound(Math.max(1, levelId), Math.max(1, levelId)));
  const [rocketState, setRocketState] = useState<RocketState>('idle');
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [padFeedback, setPadFeedback] = useState<{ value: number; type: 'success' | 'error' } | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [XP, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [inputLocked, setInputLocked] = useState(false);
  const [hasSignalledFailure, setHasSignalledFailure] = useState(false);
  const [didComplete, setDidComplete] = useState(false);

  const timeoutIdsRef = useRef<number[]>([]);
  const inputLockedRef = useRef(false);

  const goalCorrect = useMemo(() => Math.min(14, Math.max(7, 6 + Math.floor(levelId / 2))), [levelId]);
  const timeLeft = sessionState?.timeLeft ?? 1;
  const lives = sessionState?.lives ?? 3;
  const isSessionActive = sessionState ? timeLeft > 0 && lives > 0 : true;

  const queueTimeout = (fn: () => void, delayMs: number) => {
    const timeoutId = window.setTimeout(fn, delayMs);
    timeoutIdsRef.current.push(timeoutId);
  };

  const clearQueuedTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  const resetRocketToIdle = () => {
    inputLockedRef.current = false;
    setRocketState('idle');
    setSelectedPad(null);
    setPadFeedback(null);
    setFeedbackText(null);
    setInputLocked(false);
  };

  useEffect(() => () => clearQueuedTimeouts(), []);

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    clearQueuedTimeouts();
    setRound(generateRound(Math.max(1, levelId), Math.max(1, levelId)));
    setRocketState('idle');
    setSelectedPad(null);
    setPadFeedback(null);
    setFeedbackText(null);
    setScore(0);
    setAttempts(0);
    setCorrectAnswers(0);
    inputLockedRef.current = false;
    setInputLocked(false);
    setHasSignalledFailure(false);
    setDidComplete(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (!sessionState) return;
    if (didComplete || hasSignalledFailure) return;
    if (isSessionActive) return;

    setHasSignalledFailure(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score: XP,
      reason: lives <= 0 ? 'lives' : 'time',
    });
  }, [didComplete, hasSignalledFailure, isSessionActive, lives, XP, sessionEvents, sessionState]);

  const completeRun = (finalScore: number, totalCorrect: number, totalAttempts: number) => {
    if (didComplete) return;
    setDidComplete(true);
    const stars = scoreToStars(finalScore, totalCorrect, totalAttempts);
    emitMiniGameSessionEvent(sessionEvents, 'game_complete', {
      score: finalScore,
      stars,
      metadata: {
        correctAnswers: totalCorrect,
        attempts: totalAttempts,
      },
    });
    onVictory(stars, finalScore);
  };

  const loadNextRound = (difficultyOffset: number) => {
    const magnitudeLevel = Math.max(1, levelId + difficultyOffset);
    setRound(generateRound(Math.max(1, levelId), magnitudeLevel));
    resetRocketToIdle();
  };

  const handlePadTap = (padValue: number) => {
    if (!isSessionActive || inputLockedRef.current || inputLocked || didComplete) return;

    inputLockedRef.current = true;

    const isCorrect = padValue === round.correctAnswer;
    const nextAttempts = attempts + 1;

    setAttempts(nextAttempts);
    setSelectedPad(padValue);
    setInputLocked(true);

    if (isCorrect) {
      const pointGain = round.target === 100 ? 170 : 130;
      const streakBonus = correctAnswers > 0 && (correctAnswers + 1) % 4 === 0 ? 40 : 0;
      const nextScore = XP + pointGain + streakBonus;
      const nextCorrect = correctAnswers + 1;

      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setRocketState('arming');
      setPadFeedback({ value: padValue, type: 'success' });
      setFeedbackText(Math.random() < 0.65 ? 'Nice!' : null);

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score: XP,
        metadata: {
          scoreAfter: nextScore,
          scoreDelta: pointGain + streakBonus,
          roundedTo: round.target,
          selected: padValue,
          expected: round.correctAnswer,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          roundedTo: round.target,
          selected: padValue,
          expected: round.correctAnswer,
        },
      });

      if (nextCorrect >= goalCorrect) {
        queueTimeout(() => setRocketState('launching'), 180);
        queueTimeout(() => {
          completeRun(nextScore, nextCorrect, nextAttempts);
        }, FINAL_LAUNCH_COMPLETE_MS);
        return;
      }

      queueTimeout(() => {
        loadNextRound(Math.floor(nextCorrect / 3));
      }, CORRECT_RESET_MS);
      return;
    }

    setRocketState('failed');
    setPadFeedback({ value: padValue, type: 'error' });
    setFeedbackText('Try Again');

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score: XP,
      metadata: {
        roundedTo: round.target,
        selected: padValue,
        expected: round.correctAnswer,
        livesBefore: lives,
        livesLost: 1,
      },
    });

    queueTimeout(() => {
      if (!didComplete) resetRocketToIdle();
    }, FAILED_RESET_MS);
  };

  const rocketAnimation = useMemo(() => {
    if (rocketState === 'arming') {
      return {
        x: [0, -3, 3, -2, 2, 0],
        y: [0, -2, 0],
        scale: [1, 1.02, 1],
      };
    }
    if (rocketState === 'launching') {
      return {
        x: [0, 2, -2, 0],
        y: [0, -40, -120, -260],
        scale: [1, 1.04, 1.08],
      };
    }
    if (rocketState === 'failed') {
      return {
        x: [0, -9, 9, -6, 6, 0],
        y: [0, 8, 0],
        scale: [1, 0.98, 1],
      };
    }
    return {
      y: [0, -8, 0],
    };
  }, [rocketState]);

  const rocketVerticalOffset = 100;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={missionBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="pointer-events-none fixed left-0 right-0 z-[60]" style={{ top: '4px' }}>
        <div className="mx-auto w-full max-w-[780px] rounded-[1.05rem] bg-slate-950/70 px-[12px] py-[10px] text-center backdrop-blur-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/90">
            Round to the nearest {round.target}
          </div>
          <div className="game-question-copy mt-0.5 whitespace-pre-line text-white">
            Quick! we've managed to locate a cache of brainpower, but we need to keep it safe from the Monster Minds.
            {'\n'}
            Help fuel the rocket to blast it into space for safe keeping.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {rocketState === 'launching' ? (
          <motion.div
            key={`launch-trail-${round.id}`}
            initial={{ opacity: 0, scaleY: 0.3 }}
            animate={{ opacity: [0, 0.9, 0.55, 0], scaleY: [0.3, 1.1, 0.9, 0.55] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.64, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 z-20 h-[42%] w-[8.75rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_top,rgba(250,204,21,0.85),rgba(249,115,22,0.48)_38%,rgba(14,116,144,0.08)_82%,transparent_100%)] blur-md"
            style={{ top: `calc(44% + ${rocketVerticalOffset}px)` }}
          />
        ) : null}
      </AnimatePresence>

      <div className="relative z-30 flex h-full w-full min-h-0 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+5.1rem)] pt-1">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center pt-1">
          <div className="relative flex justify-center" style={{ transform: `translateY(${rocketVerticalOffset}px)` }}>
            <motion.div
              animate={rocketState === 'idle'
                ? { y: [0, -8, 0] }
                : rocketAnimation}
              transition={rocketState === 'idle'
                ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: rocketState === 'launching' ? 0.58 : 0.35, ease: 'easeOut' }}
              className="relative h-[clamp(16rem,36vh,21rem)] w-[clamp(12rem,50vw,18rem)] overflow-visible"
            >
              <div className="absolute inset-x-[18%] bottom-[10%] h-10 rounded-full bg-cyan-300/22 blur-xl" />
              <div className="absolute inset-x-[2%] top-0 bottom-[9%] overflow-hidden">
                <img
                  src={roundingRocketArt}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute left-1/2 top-[-6%] h-[118%] w-[118%] -translate-x-1/2 object-contain object-center drop-shadow-[0_18px_24px_rgba(2,6,23,0.45)]"
                />
              </div>

              <AnimatePresence>
                {rocketState === 'arming' || rocketState === 'launching' ? (
                  <>
                    <motion.div
                      key={`rocket-flame-${round.id}`}
                      initial={{ opacity: 0, scaleY: 0.5 }}
                      animate={{
                        opacity: [0.38, 0.86, 0.62],
                        scaleY: [0.48, 0.92, 0.72],
                        scaleX: [0.84, 1.02, 0.9],
                      }}
                      exit={{ opacity: 0, scaleY: 0.2 }}
                      transition={{ duration: 0.24, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                      className="absolute left-1/2 top-[82.6%] z-10 h-[3.6rem] w-[2.45rem] -translate-x-1/2 rounded-b-[1.7rem] rounded-t-[0.35rem] bg-[radial-gradient(ellipse_at_top,#fde68a_0%,#fb923c_42%,rgba(239,68,68,0.08)_100%)] shadow-[0_0_24px_rgba(249,115,22,0.58)]"
                    />
                    {[0, 1, 2, 3].map((index) => (
                      <motion.span
                        key={`rocket-smoke-${round.id}-${index}`}
                        className="absolute left-1/2 top-[87.2%] z-0 rounded-full bg-white/38 blur-md"
                        initial={{ opacity: 0, x: '-50%', y: 0, scale: 0.36 }}
                        animate={{
                          opacity: [0, 0.36, 0],
                          x: ['-50%', `${-50 + (index - 1.5) * 8}%`, `${-50 + (index - 1.5) * 15}%`],
                          y: [0, 10 + index * 3, 24 + index * 6],
                          scale: [0.36, 0.82, 1.18],
                        }}
                        transition={{
                          duration: 0.98 + index * 0.1,
                          repeat: Infinity,
                          ease: 'easeOut',
                          delay: index * 0.12,
                        }}
                        style={{
                          width: `${1.2 + index * 0.28}rem`,
                          height: `${0.72 + index * 0.18}rem`,
                        }}
                      />
                    ))}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.18, 0.3, 0.18], scale: [0.96, 1.04, 0.98] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-1/2 top-[86.8%] z-0 h-[2.6rem] w-[5.3rem] -translate-x-1/2 rounded-full bg-white/18 blur-xl"
                    />
                  </>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {feedbackText ? (
              <motion.div
                key={`${feedbackText}-${round.id}-${rocketState}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-2 rounded-full border px-4 py-1 text-sm font-black uppercase tracking-[0.08em] ${
                  rocketState === 'failed'
                    ? 'border-rose-200/55 bg-rose-500/25 text-amber-100'
                    : 'border-amber-200/70 bg-amber-300/22 text-amber-100'
                }`}
              >
                {feedbackText}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <section className="mx-auto w-full max-w-[21rem] shrink-0">
          <div className="grid grid-cols-3 gap-2.5">
            {round.pads.map((padValue) => {
              const isSelected = selectedPad === padValue;
              const successFlash = padFeedback?.value === padValue && padFeedback.type === 'success';
              const errorFlash = padFeedback?.value === padValue && padFeedback.type === 'error';

              return (
                <motion.button
                  key={`${round.id}-${padValue}`}
                  type="button"
                  onClick={() => handlePadTap(padValue)}
                  whileTap={(!inputLocked && isSessionActive) ? { scale: 0.96 } : undefined}
                  disabled={inputLocked || !isSessionActive || didComplete}
                  className={[
                    'relative h-[clamp(2.55rem,7vh,3rem)] rounded-[0.9rem] border px-1.5 text-center text-[clamp(0.86rem,3.8vw,1.12rem)] font-black tabular-nums text-white transition',
                    'shadow-[0_14px_24px_rgba(2,6,23,0.35)]',
                    successFlash
                      ? 'border-emerald-200/90 bg-[linear-gradient(180deg,#34d399_0%,#10b981_100%)] text-emerald-50'
                      : errorFlash
                        ? 'border-rose-100/90 bg-[linear-gradient(180deg,#fb7185_0%,#e11d48_100%)] text-amber-50'
                        : isSelected
                          ? 'border-amber-100/90 bg-[linear-gradient(180deg,#fbbf24_0%,#f59e0b_100%)] text-amber-950'
                          : 'border-cyan-100/45 bg-[linear-gradient(180deg,#0ea5e9_0%,#2563eb_58%,#1d4ed8_100%)]',
                    inputLocked ? 'cursor-not-allowed' : 'hover:brightness-110',
                  ].join(' ')}
                  aria-label={`Landing pad ${padValue}`}
                >
                  <span className="relative z-10">{padValue}</span>
                  <span className="pointer-events-none absolute inset-x-3 bottom-2 h-3 rounded-full bg-slate-900/30 blur-sm" />
                </motion.button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RoundingRocketGame;
