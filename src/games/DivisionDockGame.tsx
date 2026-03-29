import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

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
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const CARGO_PER_BOAT = 5;
const TOTAL_BOATS_BY_LEVEL: Record<number, number> = {
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 5,
  6: 5,
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createDivisionQuestion = (levelId: number, solved: number): DivisionQuestion => {
  const maxDivisor = Math.min(12, 4 + levelId + Math.floor(solved / 4));
  const divisor = randomInt(2, maxDivisor);
  const answer = randomInt(2, Math.min(12, 5 + levelId + Math.floor(solved / 5)));
  const dividend = divisor * answer;
  return { dividend, divisor, answer };
};

const DivisionDockGame: React.FC<DivisionDockGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const totalBoats = TOTAL_BOATS_BY_LEVEL[levelId] || 4;
  const initialTime = 78 + (levelId * 6);

  const timersRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scoreRef = useRef(0);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [Combo, setStreak] = useState(0);
  const [boatsCompleted, setBoatsCompleted] = useState(0);
  const [cargoLoaded, setCargoLoaded] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [question, setQuestion] = useState<DivisionQuestion>(() => createDivisionQuestion(levelId, 0));
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [boatDeparting, setBoatDeparting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const currentBoat = Math.min(totalBoats, boatsCompleted + 1);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const focusInputSoon = () => {
    const timerId = window.setTimeout(() => inputRef.current?.focus(), 40);
    timersRef.current.push(timerId);
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
    setBoatsCompleted(0);
    setCargoLoaded(0);
    setSolvedCount(0);
    setAttempts(0);
    setCorrectAnswers(0);
    setQuestion(openingQuestion);
    setUserAnswer('');
    setFeedback(null);
    setBoatDeparting(false);
    setIsFinished(false);
    focusInputSoon();
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
      setUserAnswer('');
      setFeedback(null);
      focusInputSoon();
    }, 620);
    timersRef.current.push(timerId);
  };

  const handleCorrectAnswer = (updatedScore: number, nextSolved: number, nextAttempts: number, nextCorrect: number) => {
    const nextCargo = cargoLoaded + 1;
    setCargoLoaded(nextCargo);
    setFeedback({
      type: 'success',
      title: 'Cargo Loaded',
      subtitle: `Correct! +1 crate (${nextCargo}/${CARGO_PER_BOAT})`,
    });
    triggerHaptic('success');

    if (nextCargo < CARGO_PER_BOAT) {
      const timerId = window.setTimeout(() => {
        setQuestion(createDivisionQuestion(levelId, nextSolved));
        setUserAnswer('');
        setFeedback(null);
        focusInputSoon();
      }, 420);
      timersRef.current.push(timerId);
      return;
    }

    setBoatDeparting(true);
    const departureId = window.setTimeout(() => {
      setFeedback({
        type: 'success',
        title: 'Boat Departed',
        subtitle: `Boat ${currentBoat} dispatched with full cargo.`,
      });
    }, 380);
    timersRef.current.push(departureId);

    const advanceId = window.setTimeout(() => {
      const nextBoatsCompleted = boatsCompleted + 1;
      setBoatsCompleted(nextBoatsCompleted);
      setCargoLoaded(0);
      setBoatDeparting(false);

      if (nextBoatsCompleted >= totalBoats) {
        finishVictory(updatedScore, nextAttempts, nextCorrect, hearts);
        return;
      }

      setQuestion(createDivisionQuestion(levelId, nextSolved));
      setUserAnswer('');
      setFeedback(null);
      focusInputSoon();
    }, 1200);
    timersRef.current.push(advanceId);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isFinished || boatDeparting) return;

    const trimmed = userAnswer.trim();
    if (!trimmed || trimmed === '-') {
      setFeedback({ type: 'error', title: 'No Answer', subtitle: 'Enter a quotient to load cargo.' });
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setFeedback({ type: 'error', title: 'Invalid Input', subtitle: 'Answer must be a number.' });
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (parsed !== question.answer) {
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

    handleCorrectAnswer(updatedScore, nextSolved, nextAttempts, nextCorrect);
  };

  return (
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="calculation_clash" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+3.4rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+3.7rem)] md:pt-[calc(env(safe-area-inset-top)+5.5rem)]">
        <PuzzleStage className="w-full max-w-6xl min-h-0 flex-1 rounded-[2rem] p-2 md:rounded-[2.4rem] md:p-4">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/32 px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:left-5 md:top-5 md:gap-2 md:px-4 md:py-2">
            {Array.from({ length: HEARTS_MAX }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 rounded-full border border-white/12 bg-slate-950/32 px-3 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:right-5 md:top-5 md:px-4 md:py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70 md:text-xs">Combo</div>
            <div className="text-lg font-black text-white md:text-2xl">{Combo}</div>
          </div>

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-16 md:px-4 md:pb-4 md:pt-20">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[95%] px-5 py-3 text-center shadow-[0_16px_30px_rgba(15,23,42,0.16)] md:px-7 md:py-4">
                <div className="text-sm font-black tracking-tight text-amber-900 md:text-[1.5rem]">
                  Solve the division equation to load cargo
                </div>
                <div className="mt-1 text-xs font-bold text-amber-950/76 md:text-base">
                  Fill {CARGO_PER_BOAT} crates to dispatch each boat.
                </div>
              </div>
            </div>

            <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-2 md:mt-4 md:grid-cols-[1.05fr_1fr] md:gap-3">
              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.3rem] border border-white/14 p-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:rounded-[1.6rem] md:p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Equation terminal</div>
                <div className="mt-2 rounded-[1rem] border border-sky-200/20 bg-[linear-gradient(180deg,rgba(14,116,144,0.22),rgba(14,116,144,0.08))] p-2.5 text-center md:mt-3 md:p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Current equation</div>
                  <div className="mt-1 text-[1.7rem] font-black text-white md:text-5xl">
                    {question.dividend} ÷ {question.divisor} = ?
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-2.5 flex gap-2 md:mt-3 md:gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={userAnswer}
                    onChange={(event) => setUserAnswer(event.target.value.replace(/[^\d-]/g, ''))}
                    disabled={Boolean(feedback) || boatDeparting || isFinished}
                    placeholder="Quotient"
                    className="h-11 flex-1 rounded-[0.95rem] border border-sky-200/25 bg-black/28 px-4 text-center text-xl font-black text-white outline-none transition placeholder:text-cyan-100/45 focus:border-sky-300/70 disabled:opacity-60 md:h-14 md:text-2xl"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(feedback) || boatDeparting || isFinished}
                    className="ui-button-primary min-w-[7.8rem] rounded-[0.95rem] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white disabled:opacity-60 md:min-w-[10rem] md:text-base"
                  >
                    Load Cargo
                  </button>
                </form>

                <div className="mt-2 rounded-[1rem] border border-white/10 bg-black/16 p-2 text-[11px] font-semibold text-cyan-50/90 md:mt-3 md:p-2.5 md:text-sm">
                  Correct answers add cargo. Fill the boat to dispatch it.
                </div>
              </div>

              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.3rem] border border-white/14 p-2.5 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:rounded-[1.6rem] md:p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Cargo boat</div>

                <div className="relative mt-2 flex min-h-[7rem] flex-1 items-end justify-center overflow-hidden rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(56,189,248,0.24),rgba(30,64,175,0.22)_42%,rgba(15,23,42,0.36)_100%)] p-2.5 md:mt-3 md:min-h-[8.3rem] md:p-3">
                  <motion.div
                    animate={boatDeparting ? { x: [0, 220, 520], y: [0, -8, -10], rotate: [0, -2, -1], opacity: [1, 1, 0.55] } : { x: 0, y: 0, rotate: [0, -1, 1, 0] }}
                    transition={boatDeparting ? { duration: 1.1, ease: 'easeInOut' } : { duration: 2.1, repeat: Infinity, repeatType: 'mirror' }}
                    className="relative w-[90%] max-w-[22rem]"
                  >
                    <div className="relative h-14 rounded-b-[1.4rem] rounded-t-[0.7rem] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.25),rgba(120,53,15,0.75))] shadow-[0_12px_20px_rgba(0,0,0,0.35)] md:h-16">
                      <div className="absolute -top-3 left-3 right-3 h-3 rounded-full border border-amber-200/35 bg-[linear-gradient(180deg,rgba(254,243,199,0.55),rgba(217,119,6,0.45))]" />
                    </div>

                    <div className="absolute inset-x-3 -top-10 flex items-end justify-center gap-1.5">
                      {Array.from({ length: CARGO_PER_BOAT }).map((_, index) => (
                        <motion.div
                          key={`crate-${index}`}
                          initial={{ scale: 0.85, opacity: 0.2 }}
                          animate={index < cargoLoaded
                            ? { scale: 1, opacity: 1, y: 0 }
                            : { scale: 0.85, opacity: 0.2, y: 8 }}
                          className="h-9 w-8 rounded-md border border-yellow-200/35 bg-[linear-gradient(180deg,rgba(250,204,21,0.7),rgba(120,53,15,0.85))] shadow-[0_7px_14px_rgba(0,0,0,0.3)]"
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 md:mt-3 md:gap-3">
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Cargo Loaded</div>
                    <div className="mt-1 text-2xl font-black text-white md:text-3xl">{cargoLoaded}/{CARGO_PER_BOAT}</div>
                  </div>
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Boats Departed</div>
                    <div className="mt-1 text-2xl font-black text-white md:text-3xl">{boatsCompleted}/{totalBoats}</div>
                  </div>
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
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
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
