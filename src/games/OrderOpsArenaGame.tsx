import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface OrderOpsArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface OpsRound {
  expression: string;
  answer: number;
  options: number[];
  hint: string;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const ROUNDS_BY_LEVEL: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 9,
  5: 10,
  6: 10,
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const makeOptions = (correct: number) => {
  const pool = new Set<number>([correct]);
  const offsets = [-8, -5, -3, -2, 2, 3, 5, 8];
  for (const offset of shuffle(offsets)) {
    if (pool.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= 0) pool.add(candidate);
  }
  while (pool.size < 4) {
    pool.add(Math.max(0, correct + randomInt(-9, 9)));
  }
  return shuffle(Array.from(pool).slice(0, 4));
};

const createOpsRound = (levelId: number): OpsRound => {
  const modes = ['mixed', 'brackets', 'doubleMultiply'] as const;
  const mode = modes[randomInt(0, Math.min(modes.length - 1, 1 + Math.floor(levelId / 2)))];

  if (mode === 'brackets') {
    const a = randomInt(2, 12);
    const b = randomInt(2, 10);
    const c = randomInt(2, 6);
    const answer = (a + b) * c;
    return {
      expression: `(${a} + ${b}) × ${c}`,
      answer,
      options: makeOptions(answer),
      hint: 'Brackets first, then multiplication.',
    };
  }

  if (mode === 'doubleMultiply') {
    const a = randomInt(2, 9);
    const b = randomInt(2, 6);
    const c = randomInt(2, 8);
    const d = randomInt(2, 5);
    const answer = (a * b) + (c * d);
    return {
      expression: `${a} × ${b} + ${c} × ${d}`,
      answer,
      options: makeOptions(answer),
      hint: 'Do each multiplication before adding.',
    };
  }

  const a = randomInt(10, 40);
  const b = randomInt(2, 9);
  const c = randomInt(2, 6);
  const d = randomInt(1, 12);
  const answer = a + (b * c) - d;
  return {
    expression: `${a} + ${b} × ${c} - ${d}`,
    answer,
    options: makeOptions(answer),
    hint: 'Multiply first, then complete + and - in order.',
  };
};

const OrderOpsArenaGame: React.FC<OrderOpsArenaGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const totalRounds = ROUNDS_BY_LEVEL[levelId] || 8;
  const initialTime = 72 + (levelId * 7);
  const targetScore = totalRounds * 210;
  const timersRef = useRef<number[]>([]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [streak, setStreak] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<OpsRound>(() => createOpsRound(levelId));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);

  const progress = Math.min((score / targetScore) * 100, 100);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    setTimeLeft(initialTime);
    setHearts(HEARTS_MAX);
    setStreak(0);
    setRoundNumber(1);
    setRound(createOpsRound(levelId));
    setFeedback(null);
    setIsFinished(false);
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
    const stars = finalScore >= targetScore * 1.2 && hearts >= 2
      ? 3
      : finalScore >= targetScore * 0.9
        ? 2
        : 1;

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.64 },
      colors: ['#fcd34d', '#67e8f9', '#ffffff'],
    });

    onVictory(stars, finalScore);
  };

  const moveNextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      finishVictory(updatedScore);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRoundNumber((previous) => previous + 1);
      setRound(createOpsRound(levelId));
      setFeedback(null);
    }, 750);
    timersRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Wrong Order',
      subtitle,
    });

    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(score);
      }, 860);
      timersRef.current.push(timeoutId);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRound(createOpsRound(levelId));
      setFeedback(null);
    }, 780);
    timersRef.current.push(timeoutId);
  };

  const handleAnswer = (choice: number) => {
    if (feedback || isFinished) return;
    if (choice !== round.answer) {
      loseHeart(`Correct value was ${round.answer}.`);
      return;
    }

    const points = 140 + (streak * 24);
    const updatedScore = score + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({
      type: 'success',
      title: 'Sequence Locked',
      subtitle: `+${points} score`,
    });
    moveNextRound(updatedScore);
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="equation_grove" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Order Ops Arena"
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
            statLabel="Puzzle"
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
                  Solve using order of operations
                </div>
                <div className="mt-1 text-xs font-bold text-amber-950/76 md:text-base">
                  Brackets first, then × and ÷, then + and -
                </div>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto md:mt-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.05fr_1fr] md:gap-4">
                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Expression</div>
                  <div className="mt-3 rounded-[1.1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-3 text-center shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:p-4">
                    <div className="text-2xl font-black tracking-tight text-white md:text-4xl">{round.expression}</div>
                  </div>
                  <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/18 p-2.5 text-xs font-semibold text-cyan-50/90 md:text-sm">
                    {round.hint}
                  </div>
                </div>

                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Choose answer</div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5 md:gap-3">
                    {round.options.map((option) => (
                      <button
                        key={`${round.expression}-${option}`}
                        type="button"
                        onClick={() => handleAnswer(option)}
                        disabled={Boolean(feedback) || isFinished}
                        className="ui-button-primary min-h-[3.3rem] rounded-[1.05rem] px-3 py-2 text-lg font-black text-white shadow-[0_12px_22px_rgba(2,6,23,0.18)] disabled:opacity-60 md:min-h-[4rem] md:text-2xl"
                      >
                        {option}
                      </button>
                    ))}
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

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default OrderOpsArenaGame;

