import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface DivisionDockGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface DockRound {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const TOTAL_ROUNDS_BY_LEVEL: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 9,
  5: 10,
  6: 10,
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createDockRound = (levelId: number): DockRound => {
  const divisor = randomInt(2, Math.min(9, 4 + levelId));
  const quotient = randomInt(2, Math.min(12, 5 + levelId));
  const remainder = randomInt(0, divisor - 1);
  const dividend = (divisor * quotient) + remainder;
  return { dividend, divisor, quotient, remainder };
};

const DivisionDockGame: React.FC<DivisionDockGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = TOTAL_ROUNDS_BY_LEVEL[levelId] || 8;
  const initialTime = 74 + (levelId * 6);
  const targetScore = totalRounds * 200;
  const timersRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [streak, setStreak] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<DockRound>(() => createDockRound(levelId));
  const [remainingCargo, setRemainingCargo] = useState(() => round.dividend);
  const [cyclesDistributed, setCyclesDistributed] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const resetRoundState = (nextRound: DockRound) => {
    setRound(nextRound);
    setRemainingCargo(nextRound.dividend);
    setCyclesDistributed(0);
    setFeedback(null);
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    const openingRound = createDockRound(levelId);
    setScore(0);
    setTimeLeft(initialTime);
    setHearts(HEARTS_MAX);
    setStreak(0);
    setRoundNumber(1);
    setIsFinished(false);
    resetRoundState(openingRound);
  }, [levelId, initialTime]);

  useEffect(() => {
    if (isFinished) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isFinished, onGameOver, score]);

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const accuracyFactor = Math.max(0, (hearts / HEARTS_MAX));
    const stars = finalScore >= targetScore * 1.2 && accuracyFactor >= 0.66
      ? 3
      : finalScore >= targetScore * 0.9
        ? 2
        : 1;

    confetti({
      particleCount: 110,
      spread: 68,
      origin: { y: 0.64 },
      colors: ['#fcd34d', '#fde68a', '#67e8f9', '#ffffff'],
    });
    onVictory(stars, finalScore);
  };

  const resolveFailure = (title: string, subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title, subtitle });

    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(score);
      }, 820);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resetRoundState({ ...round });
    }, 760);
    timersRef.current.push(timeoutId);
  };

  const advanceRound = (newScore: number) => {
    if (roundNumber >= totalRounds) {
      finishVictory(newScore);
      return;
    }

    const nextRoundNumber = roundNumber + 1;
    const nextRound = createDockRound(levelId);
    setRoundNumber(nextRoundNumber);
    resetRoundState(nextRound);
  };

  const handleDistributeOneCycle = () => {
    if (feedback || isFinished) return;

    if (remainingCargo < round.divisor) {
      resolveFailure('Cannot Split', 'Not enough cargo for one full ship cycle.');
      return;
    }

    setRemainingCargo((previous) => previous - round.divisor);
    setCyclesDistributed((previous) => previous + 1);
  };

  const handleStoreLeftovers = () => {
    if (feedback || isFinished) return;

    if (remainingCargo >= round.divisor) {
      resolveFailure('Too Early', 'You can still distribute another full cycle.');
      return;
    }

    const quotientCorrect = cyclesDistributed === round.quotient;
    const remainderCorrect = remainingCargo === round.remainder;

    if (!quotientCorrect || !remainderCorrect) {
      resolveFailure(
        'Wrong Dock Split',
        `Expected ${round.quotient} each, remainder ${round.remainder}.`,
      );
      return;
    }

    const points = 130 + (round.quotient * 12) + (streak * 20);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({
      type: 'success',
      title: 'Shipments Cleared',
      subtitle: `Quotient ${round.quotient}, remainder ${round.remainder}  •  +${points}`,
    });

    const timeoutId = window.setTimeout(() => {
      advanceRound(updatedScore);
    }, 880);
    timersRef.current.push(timeoutId);
  };

  const handleResetRound = () => {
    if (feedback || isFinished) return;
    resetRoundState({ ...round });
    setStreak(0);
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="calculation_clash" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Division Dock"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/84"
            accentBorder="border-sky-200/88"
            progressBar="bg-gradient-to-r from-cyan-300 via-sky-300 to-yellow-300"
            statLabel="Dock"
            statValue={`${roundNumber}/${totalRounds}`}
          />
        </div>

        <PuzzleStage className="w-full max-w-6xl rounded-[2.3rem] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/32 px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:left-5 md:top-5 md:gap-2 md:px-4 md:py-2">
            {Array.from({ length: HEARTS_MAX }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 rounded-full border border-white/12 bg-slate-950/32 px-3 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:right-5 md:top-5 md:px-4 md:py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70 md:text-xs">Streak</div>
            <div className="text-lg font-black text-white md:text-2xl">{streak}</div>
          </div>

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-20 md:px-6 md:pb-6 md:pt-24">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[95%] px-5 py-3 text-center shadow-[0_16px_30px_rgba(15,23,42,0.16)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-900 md:text-[1.75rem]">
                  Split {round.dividend} crates equally into {round.divisor} ships
                </div>
                <div className="mt-1 text-xs font-bold text-amber-950/76 md:text-base">
                  Tap “Distribute” until no full cycle remains, then store leftovers.
                </div>
              </div>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 md:mt-5 md:grid-cols-[1.05fr_1fr] md:gap-4">
              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Harbour state</div>
                <div className="mt-2 grid grid-cols-2 gap-2 md:gap-3">
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Cargo Remaining</div>
                    <div className="mt-1 text-2xl font-black text-white md:text-3xl">{remainingCargo}</div>
                  </div>
                  <div className="rounded-[1rem] border border-white/12 bg-white/8 p-2 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65 md:text-[11px]">Cycles Distributed</div>
                    <div className="mt-1 text-2xl font-black text-white md:text-3xl">{cyclesDistributed}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-[1rem] border border-sky-200/20 bg-[linear-gradient(180deg,rgba(14,116,144,0.22),rgba(14,116,144,0.08))] p-2.5 md:p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Current equation</div>
                  <div className="mt-1 text-lg font-black text-white md:text-2xl">
                    {round.dividend} ÷ {round.divisor} = {cyclesDistributed} r {remainingCargo}
                  </div>
                </div>

                <div className="mt-3 flex min-h-[5.6rem] flex-wrap items-end justify-center gap-2 rounded-[1rem] border border-white/10 bg-black/16 p-2 md:min-h-[7.2rem] md:gap-3 md:p-3">
                  {Array.from({ length: round.divisor }).map((_, index) => (
                    <div
                      key={`ship-${index}`}
                      className="flex h-14 min-w-[4.5rem] flex-col items-center justify-center rounded-[0.9rem] border border-cyan-200/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.18),rgba(15,23,42,0.42))] px-2 text-center md:h-16 md:min-w-[5rem]"
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-[10px]">Ship {index + 1}</div>
                      <div className="mt-0.5 text-xl font-black text-white md:text-2xl">{cyclesDistributed}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="licensed-game-card-dark flex min-h-0 flex-col rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Dock controls</div>

                <div className="mt-3 flex flex-col gap-2.5 md:gap-3">
                  <button
                    type="button"
                    onClick={handleDistributeOneCycle}
                    disabled={Boolean(feedback) || isFinished}
                    className="ui-button-primary min-h-[3.2rem] rounded-[1.1rem] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white disabled:opacity-60 md:min-h-[3.7rem] md:text-base"
                  >
                    Distribute One Cycle ({round.divisor} crates)
                  </button>

                  <button
                    type="button"
                    onClick={handleStoreLeftovers}
                    disabled={Boolean(feedback) || isFinished}
                    className="ui-button-primary min-h-[3.2rem] rounded-[1.1rem] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white disabled:opacity-60 md:min-h-[3.7rem] md:text-base"
                  >
                    Store Leftovers
                  </button>

                  <button
                    type="button"
                    onClick={handleResetRound}
                    disabled={Boolean(feedback) || isFinished}
                    className="ui-button-secondary min-h-[2.9rem] rounded-[1rem] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-60 md:min-h-[3.2rem] md:text-sm"
                  >
                    Reset This Split
                  </button>
                </div>

                <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/16 p-2.5 text-xs font-semibold text-cyan-50/90 md:text-sm">
                  Goal: finish each dock with a valid quotient and remainder.
                  <br />
                  Correct split means: remainder is less than divisor.
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

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default DivisionDockGame;

