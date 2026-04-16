import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';
import boat1 from '../assets/boats/1.png';
import boat2 from '../assets/boats/2.png';
import boat3 from '../assets/boats/3.png';
import boat4 from '../assets/boats/4.png';
import boat5 from '../assets/boats/5.png';
import boat6 from '../assets/boats/6.png';
import boat7 from '../assets/boats/7.png';
import dockBackground from '../assets/maps/backgroundsforgames/division dock.jpg';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

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
const DOCK_COUNT = 8;
const ROUNDS_TO_WIN = 5;
const BOAT_ASSETS = [boat1, boat2, boat3, boat4, boat5, boat6, boat7];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const pickBoatSet = () => {
  const pool = [...BOAT_ASSETS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const swapIndex = randomInt(0, i);
    [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
  }
  return pool.slice(0, DOCK_COUNT);
};

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
  const [boatSet, setBoatSet] = useState<string[]>(() => pickBoatSet());
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
    setBoatSet(pickBoatSet());
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
      setBoatSet(pickBoatSet());
      setFeedback(null);
    }, 620);
    timersRef.current.push(timerId);
  };

  const remainingGoods = Math.max(0, question.dividend - boatLoads.reduce((sum, count) => sum + count, 0));
  const allUsed = remainingGoods === 0;
  const allEqual = boatLoads.every((count) => count === question.answer);

  const addToBoat = (index: number) => {
    if (isFinished || remainingGoods <= 0) return;
    setBoatLoads((previous) => previous.map((count, i) => (i === index ? count + 1 : count)));
    triggerHaptic('success');
  };

  const resetBoats = () => {
    setBoatLoads(Array.from({ length: DOCK_COUNT }, () => 0));
    setFeedback({
      type: 'error',
      title: 'Reset',
      subtitle: 'All crates go back to the dock.',
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
        subtitle: 'Use every crate before checking.',
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
      setBoatSet(pickBoatSet());
      setFeedback(null);
    }, 720);
    timersRef.current.push(timerId);
  };

  return (
    <GameScreenShell className="overflow-hidden bg-transparent">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${dockBackground})` }}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.6rem)] pt-[calc(env(safe-area-inset-top)+3.6rem)] md:px-3 md:pb-[calc(env(safe-area-inset-bottom)+3rem)] md:pt-[calc(env(safe-area-inset-top)+4rem)]">
        <PuzzleStage className="w-full max-w-5xl min-h-0 flex-1 rounded-[1.6rem] p-2 md:rounded-[2rem] md:p-2.5">
          <div className="absolute inset-0 bg-transparent" />

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-2 md:px-2.5 md:pb-2 md:pt-2.5">
            <div className="flex justify-center">
              <div className="game-question-card w-full max-w-[780px] px-3 py-2 text-center">
                <div className="question-title">
                  {formatFantasyPrompt(`Share ${question.dividend} crates across ${question.divisor} boats.`)}
                </div>
              </div>
            </div>

            <div className="mt-1.5 flex min-h-0 flex-1 flex-col gap-2">
              <div className="rounded-[1.1rem] border border-white/12 bg-white/6 p-2 text-center shadow-[0_12px_20px_rgba(2,6,23,0.2)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Cargo status</div>
                <div className="mt-1 text-[clamp(1.2rem,3.4vw,1.9rem)] font-black text-white">
                  {question.dividend} ÷ {question.divisor} = ?
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/70">
                  <div className="rounded-xl bg-white/12 px-2 py-1">
                    Boats
                    <div className="mt-1 text-base font-black text-white">{roundSolved}/{ROUNDS_TO_WIN}</div>
                  </div>
                  <div className="rounded-xl bg-white/12 px-2 py-1">
                    Left
                    <div className="mt-1 text-base font-black text-amber-100">{remainingGoods}</div>
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-[1.1rem] border border-white/12 bg-white/6 p-2 shadow-[0_12px_20px_rgba(2,6,23,0.2)]">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Dockyard</div>
                <div className="grid flex-1 grid-cols-4 gap-2">
                  {boatLoads.map((count, index) => (
                    <button
                      key={`boat-${index}`}
                      type="button"
                      onClick={() => addToBoat(index)}
                      disabled={isFinished || remainingGoods <= 0}
                      className="flex flex-col items-center justify-center gap-1 rounded-[0.9rem] border border-white/12 bg-white/10 p-1.5 text-center shadow-[0_8px_14px_rgba(2,6,23,0.18)] transition active:scale-[0.98] disabled:opacity-60"
                    >
                      <div className="relative h-10 w-14 overflow-hidden rounded-md border border-white/18 bg-transparent">
                        <img
                          src={boatSet[index] ?? boat1}
                          alt={`Dock ${index + 1} boat`}
                          className="h-full w-full object-contain"
                          draggable={false}
                        />
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/80">Dock {index + 1}</div>
                      <div className="text-sm font-black text-white">{count}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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










