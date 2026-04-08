import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import boatsSprite from '../assets/boats.jpg';

interface DivisionDockGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface DivisionQuestion {
  kind: 'fluency' | 'reasoning';
  dividend: number;
  divisor: number;
  answer: number;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const DOCK_COUNT = 3;
const ROUNDS_TO_WIN = 5;
const BOAT_SPRITE_GRID = { columns: 2, rows: 2 } as const;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createDivisionQuestion = (levelId: number, solved: number): DivisionQuestion => {
  const divisor = DOCK_COUNT;
  const answer = randomInt(2, Math.min(12, 4 + levelId + Math.floor(solved / 3)));
  const dividend = divisor * answer;
  return { kind: 'fluency', dividend, divisor, answer };
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
  const [Combo, setStreak] = useState(0);
  const [roundSolved, setRoundSolved] = useState(0);
  const [boatLoads, setBoatLoads] = useState<number[]>(() => Array.from({ length: DOCK_COUNT }, () => 0));
  const [solvedCount, setSolvedCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [question, setQuestion] = useState<DivisionQuestion>(() => createDivisionQuestion(levelId, 0));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);

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
    setStreak(0);
    setRoundSolved(0);
    setBoatLoads(Array.from({ length: DOCK_COUNT }, () => 0));
    setSolvedCount(0);
    setAttempts(0);
    setCorrectAnswers(0);
    setQuestion(openingQuestion);
    setFeedback(null);
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

  const handleWrongAnswer = () => {
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Not Loaded',
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

    const timerId = window.setTimeout(() => {
      setQuestion(createDivisionQuestion(levelId, solvedCount));
      setBoatLoads(Array.from({ length: DOCK_COUNT }, () => 0));
      setFeedback(null);
    }, 620);
    timersRef.current.push(timerId);
  };

  const boatFramePosition = useMemo(() => (
    Array.from({ length: DOCK_COUNT }, (_, index) => {
      const frame = index % (BOAT_SPRITE_GRID.columns * BOAT_SPRITE_GRID.rows);
      const column = frame % BOAT_SPRITE_GRID.columns;
      const row = Math.floor(frame / BOAT_SPRITE_GRID.columns);
      return {
        x: `${column * 100}%`,
        y: `${row * 100}%`,
      };
    })
  ), []);

  const remainingGoods = Math.max(0, question.dividend - boatLoads.reduce((sum, count) => sum + count, 0));
  const allUsed = remainingGoods === 0;
  const allEqual = boatLoads.every((count) => count === question.answer);

  const addToBoat = (index: number) => {
    if (isFinished || remainingGoods <= 0) return;
    setBoatLoads((previous) => previous.map((count, i) => (i === index ? count + 1 : count)));
    setFeedback({
      type: 'success',
      title: 'Loaded',
      subtitle: `Boat ${index + 1} +1 crate`,
    });
    triggerHaptic('success');
  };

  const resetBoats = () => {
    setBoatLoads(Array.from({ length: DOCK_COUNT }, () => 0));
    setFeedback({
      type: 'error',
      title: 'Reset',
      subtitle: 'All crates returned to the dock.',
    });
  };

  const checkShare = () => {
    if (isFinished) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (!allUsed) {
      setFeedback({
        type: 'error',
        title: 'Keep Sharing',
        subtitle: `Use all ${question.dividend} crates before checking.`,
      });
      return;
    }

    if (!allEqual) {
      handleWrongAnswer();
      return;
    }

    const nextSolved = solvedCount + 1;
    const nextCorrect = correctAnswers + 1;
    const points = 120 + (Combo * 16) + (levelId * 10);
    const updatedScore = XP + points;

    setScore(updatedScore);
    scoreRef.current = updatedScore;
    setSolvedCount(nextSolved);
    setCorrectAnswers(nextCorrect);
    setStreak((previous) => previous + 1);
    setRoundSolved((prev) => prev + 1);
    setFeedback({
      type: 'success',
      title: 'Perfect Share',
      subtitle: `Each boat has ${question.answer} crates.`,
    });

    if (nextSolved >= ROUNDS_TO_WIN) {
      finishVictory(updatedScore, nextAttempts, nextCorrect, hearts);
      return;
    }

    const timerId = window.setTimeout(() => {
      setQuestion(createDivisionQuestion(levelId, nextSolved));
      setBoatLoads(Array.from({ length: DOCK_COUNT }, () => 0));
      setFeedback(null);
    }, 720);
    timersRef.current.push(timerId);
  };

  return (
    <GameScreenShell className="overflow-hidden bg-transparent">

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.6rem)] pt-[calc(env(safe-area-inset-top)+3.6rem)] md:px-3 md:pb-[calc(env(safe-area-inset-bottom)+3rem)] md:pt-[calc(env(safe-area-inset-top)+4rem)]">
        <PuzzleStage className="w-full max-w-5xl min-h-0 flex-1 rounded-[1.6rem] p-2 md:rounded-[2rem] md:p-2.5">
          <div className="absolute inset-0 bg-transparent" />

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-2 md:px-2.5 md:pb-2 md:pt-2.5">
            <div className="flex justify-center">
              <div className="game-question-card max-w-[96%] px-3 py-2 text-center">
                <div className="question-title">
                  Share {question.dividend} crates equally between {question.divisor} boats.
                </div>
              </div>
            </div>

            <div className="mt-1.5 grid min-h-0 flex-1 grid-cols-1 gap-2 lg:mt-2 lg:grid-cols-[1.05fr_0.95fr] lg:gap-2.5">
              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.15rem] border border-white/14 p-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:rounded-[1.4rem] md:p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Cargo brief</div>
                <div className="mt-2 rounded-[0.95rem] border border-sky-200/20 bg-[linear-gradient(180deg,rgba(14,116,144,0.22),rgba(14,116,144,0.08))] p-2.5 text-center md:mt-2.5 md:p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Current equation</div>
                  <div className="mt-1 text-[clamp(1.4rem,4vw,2.3rem)] font-black text-white">
                    {question.dividend} ÷ {question.divisor} = ?
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 md:mt-2">
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Cargo</div>
                    <div className="mt-1 text-xl font-black text-white md:text-2xl">{question.dividend - remainingGoods}/{question.dividend}</div>
                  </div>
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Boats</div>
                    <div className="mt-1 text-xl font-black text-white md:text-2xl">{roundSolved}/{ROUNDS_TO_WIN}</div>
                  </div>
                </div>

                <div className="mt-2 rounded-[0.95rem] border border-white/12 bg-white/8 p-2 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Crates left</div>
                  <div className="mt-1 text-2xl font-black text-amber-100 md:text-3xl">{remainingGoods}</div>
                </div>
              </div>

              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.15rem] border border-white/14 p-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:rounded-[1.4rem] md:p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Dockyard</div>

                <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-1.5 md:mt-2.5 md:gap-2.5">
                  {boatLoads.map((count, index) => (
                    <button
                      key={`boat-${index}`}
                      type="button"
                      onClick={() => addToBoat(index)}
                      disabled={isFinished || remainingGoods <= 0}
                      className="flex items-center gap-3 rounded-[1rem] border border-white/12 bg-[linear-gradient(180deg,rgba(56,189,248,0.18),rgba(15,23,42,0.7))] px-3 py-1.5 text-left shadow-[0_10px_18px_rgba(2,6,23,0.2)] transition active:scale-[0.98] disabled:opacity-60"
                    >
                      <div className="relative h-14 w-16 overflow-hidden rounded-lg border border-white/18 bg-transparent">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `url(${boatsSprite})`,
                            backgroundSize: `${BOAT_SPRITE_GRID.columns * 100}% ${BOAT_SPRITE_GRID.rows * 100}%`,
                            backgroundPosition: `${boatFramePosition[index].x} ${boatFramePosition[index].y}`,
                            backgroundRepeat: 'no-repeat',
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100/80">Dock {index + 1}</div>
                        <div className="mt-0.5 text-base font-black text-white">{count} crates</div>
                      </div>
                      <div className="rounded-full border border-amber-200/35 bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100">
                        +1
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={resetBoats}
                    disabled={isFinished}
                    className="ui-button-secondary rounded-[0.95rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-60"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={checkShare}
                    disabled={isFinished}
                    className="ui-button-primary rounded-[0.95rem] px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-60"
                  >
                    Check
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>

      </div>
    </GameScreenShell>
  );
};

export default DivisionDockGame;





