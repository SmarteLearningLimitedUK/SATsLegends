import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import factorFrenzyBackground from '../assets/maps/desert.jpg';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';
import questionBarSmall from '../assets/ui_frames/hudfortextplace_slices/text_bar_small.png';
import questionBarMedium from '../assets/ui_frames/hudfortextplace_slices/text_bar_medium.png';

type FactorProblemType = 'missing_factor' | 'all_factors' | 'common_factors' | 'prime_factors';

interface FactorProblem {
  id: number;
  type: FactorProblemType;
  number: number;
  number2?: number;
  options: number[];
  correctAnswers: number[];
  question: string;
}

interface FrenzyLevel {
  name: string;
  threshold: number;
  timeLimit: number;
}

interface FactorFrenzyGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface LocalState {
  XP: number;
  level: number;
  currentProblem: FactorProblem | null;
  status: 'playing' | 'correct' | 'incorrect' | 'complete';
  timeLeft: number;
}

const FRENZY_LEVELS: FrenzyLevel[] = [
  { name: 'Rookie', threshold: 0, timeLimit: 30 },
  { name: 'Pro', threshold: 1000, timeLimit: 25 },
  { name: 'Elite', threshold: 3000, timeLimit: 20 },
  { name: 'Master', threshold: 6000, timeLimit: 15 },
  { name: 'Legend', threshold: 10000, timeLimit: 10 },
];

const INITIAL_STATE: LocalState = {
  XP: 0,
  level: 1,
  currentProblem: null,
  status: 'playing',
  timeLeft: 30,
};

const scoreToStars = (XP: number) => {
  if (XP >= 14000) return 3;
  if (XP >= 10000) return 2;
  return 1;
};

const FactorFrenzyGame: React.FC<FactorFrenzyGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showChestBurst, setShowChestBurst] = useState(false);

  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const getFactors = (n: number): number[] => {
    const factors: number[] = [];
    for (let i = 1; i <= n; i += 1) {
      if (n % i === 0) factors.push(i);
    }
    return factors;
  };

  const getPrimeFactors = (n: number): number[] => {
    const factors: number[] = [];
    let divisor = 2;
    let temp = n;

    while (temp > 1) {
      while (temp % divisor === 0) {
        factors.push(divisor);
        temp /= divisor;
      }
      divisor += 1;
    }

    return [...new Set(factors)];
  };

  const generateProblem = useCallback((level: number): FactorProblem => {
    const types: FactorProblemType[] = ['missing_factor', 'all_factors', 'common_factors', 'prime_factors'];
    const type = types[Math.min(level - 1, types.length - 1)];
    const id = Date.now() + Math.floor(Math.random() * 1000);

    if (type === 'missing_factor') {
      const n = Math.floor(Math.random() * 50) + 10;
      const factors = getFactors(n);
      const f1 = factors[Math.floor(Math.random() * factors.length)];
      const answer = n / f1;
      const distractors = [answer + 2, answer - 1, answer + 5, answer - 3].filter((x) => x > 0);
      const options = [...new Set([answer, ...distractors])].sort(() => Math.random() - 0.5).slice(0, 4);

      return {
        id,
        type,
        number: n,
        question: `Find the missing factor: ${f1} x ? = ${n}`,
        options,
        correctAnswers: [answer],
      };
    }

    if (type === 'all_factors') {
      const n = [12, 16, 20, 24, 30, 36, 48][Math.floor(Math.random() * 7)];
      const correct = getFactors(n);
      const extras = [n + 1, n - 2, 7, 9, 11, 13, 14, 15].filter((x) => x > 0 && !correct.includes(x));
      const optionPool = [...correct, ...extras].sort(() => Math.random() - 0.5);
      const options = [...new Set(optionPool)].slice(0, Math.max(8, correct.length)).sort((a, b) => a - b);

      return {
        id,
        type,
        number: n,
        question: `Select ALL factors of ${n}`,
        options,
        correctAnswers: correct,
      };
    }

    if (type === 'common_factors') {
      const pairs: Array<[number, number]> = [
        [12, 18],
        [18, 24],
        [24, 36],
        [20, 30],
        [30, 45],
      ];
      const [n1, n2] = pairs[Math.floor(Math.random() * pairs.length)];
      const f1 = getFactors(n1);
      const f2 = getFactors(n2);
      const common = f1.filter((x) => f2.includes(x));
      const extras = [5, 7, 9, 11, 13, 14, 15].filter((x) => !common.includes(x));
      const options = [...new Set([...common, ...extras])].sort((a, b) => a - b).slice(0, Math.max(8, common.length));

      return {
        id,
        type,
        number: n1,
        number2: n2,
        question: `Select ALL common factors of ${n1} and ${n2}`,
        options,
        correctAnswers: common,
      };
    }

    const n = [12, 20, 30, 42, 60, 72, 84][Math.floor(Math.random() * 7)];
    const correct = getPrimeFactors(n);
    const options = [2, 3, 5, 7, 11, 13, 4, 6, 8, 9].sort(() => Math.random() - 0.5).slice(0, 8).sort((a, b) => a - b);

    return {
      id,
      type,
      number: n,
      question: `Select ALL prime factors of ${n}`,
      options,
      correctAnswers: correct,
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearAdvanceTimer = () => {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  };

  useEffect(() => () => {
    clearTimer();
    clearAdvanceTimer();
  }, []);

  const getLevelFromScore = useCallback((XP: number) => {
    const currentLevel = [...FRENZY_LEVELS].reverse().find((level) => XP >= level.threshold) || FRENZY_LEVELS[0];
    return {
      levelConfig: currentLevel,
      levelIndex: FRENZY_LEVELS.indexOf(currentLevel) + 1,
    };
  }, []);

  const startGame = () => {
    endedRef.current = false;
    const first = generateProblem(1);
    setState({
      ...INITIAL_STATE,
      currentProblem: first,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
    });
    setSelectedOptions([]);
  };

  useEffect(() => {
    if (state.currentProblem) return;
    const first = generateProblem(1);
    setState((previous) => ({
      ...previous,
      currentProblem: first,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
    }));
  }, [state.currentProblem, generateProblem]);

  useEffect(() => {
    clearTimer();

    if (state.status !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setState((previous) => {
        if (previous.timeLeft <= 1) {
          return {
            ...previous,
            status: 'incorrect',
            timeLeft: 0,
          };
        }

        return {
          ...previous,
          timeLeft: previous.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearTimer();
  }, [state.status]);

  const toggleOption = (value: number) => {
    if (state.status !== 'playing') return;

    setSelectedOptions((previous) => (
      previous.includes(value)
        ? previous.filter((x) => x !== value)
        : [...previous, value]
    ));
  };

  const checkAnswer = () => {
    if (!state.currentProblem || state.status !== 'playing') return;

    const correct = [...state.currentProblem.correctAnswers].sort((a, b) => a - b);
    const selected = [...selectedOptions].sort((a, b) => a - b);
    const isCorrect = correct.length === selected.length && correct.every((value, index) => value === selected[index]);

    if (isCorrect) {
      const timeBonus = state.timeLeft * 10;
      const points = 500 + timeBonus;

      const newScore = state.XP + points;
      const masteryReached = newScore >= 14000;

      setState((previous) => ({
        ...previous,
        XP: newScore,
        status: masteryReached ? 'complete' : 'correct',
      }));
      setShowChestBurst(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.62 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
      });
      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'incorrect',
    }));
  };

  const nextProblem = () => {
    const { levelConfig, levelIndex } = getLevelFromScore(state.XP);
    const problem = generateProblem(levelIndex);

    setState((previous) => ({
      ...previous,
      level: levelIndex,
      currentProblem: problem,
      status: 'playing',
      timeLeft: levelConfig.timeLimit,
    }));
    setSelectedOptions([]);
  };

  useEffect(() => {
    clearAdvanceTimer();
    if (state.status !== 'correct' && state.status !== 'incorrect') return;

    const delay = state.status === 'correct' ? 620 : 880;
    advanceRef.current = window.setTimeout(() => {
      nextProblem();
    }, delay);

    return () => clearAdvanceTimer();
  }, [state.status]);

  useEffect(() => {
    if (!showChestBurst) return;
    const timeout = window.setTimeout(() => setShowChestBurst(false), 700);
    return () => window.clearTimeout(timeout);
  }, [showChestBurst]);

  const submitRun = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.XP), state.XP);
  };

  const questionFrame = useMemo(() => {
    const length = state.currentProblem?.question.length || 0;
    return length > 34 ? questionBarMedium : questionBarSmall;
  }, [state.currentProblem?.question]);

  const playingState = state.status === 'playing' || state.status === 'correct' || state.status === 'incorrect';

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${factorFrenzyBackground})` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.22)_0%,rgba(2,6,23,0.38)_60%,rgba(2,6,23,0.5)_100%)]" />

      <div className="relative z-10 flex h-full flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+2.8rem)] pt-[calc(env(safe-area-inset-top)+3.45rem)] sm:px-4 sm:pt-[calc(env(safe-area-inset-top)+3.65rem)] md:px-5 md:pt-[calc(env(safe-area-inset-top)+3.9rem)]">
        <main className="relative flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            {state.status === 'complete' ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto mx-auto w-full max-w-xl rounded-3xl border border-amber-200/40 bg-[#16356f]/88 p-6 text-center shadow-[0_20px_40px_rgba(2,6,23,0.5)]"
              >
                <Trophy className="mx-auto h-14 w-14 text-amber-200" />
                <h2 className="mt-3 text-3xl font-black uppercase text-amber-50 sm:text-4xl">Legend Achieved</h2>
                <p className="mt-2 text-sm font-semibold text-cyan-50/85">You cleared the full factor run.</p>
                <div className="mt-4 rounded-2xl border border-cyan-100/30 bg-[#0d2a5a]/80 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">Final XP</p>
                  <p className="mt-1 text-4xl font-black text-amber-100">{state.XP.toLocaleString()}</p>
                </div>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    onClick={submitRun}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100/60 bg-emerald-500/28 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-emerald-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Submit Run
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                      startGame();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-100/70 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-900"
                  >
                    <RotateCcw className="h-4 w-4" /> Restart
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={state.currentProblem?.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="relative mx-auto mb-3 h-[clamp(86px,13vh,118px)] w-[min(92%,760px)] overflow-hidden">
                  <img
                    src={questionFrame}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-fill"
                  />
                  <div className="absolute inset-x-[9%] inset-y-[22%] flex items-center justify-center overflow-hidden text-center">
                    <span
                      className="block max-w-full overflow-hidden text-[clamp(0.88rem,2.55vw,1.22rem)] font-black uppercase tracking-[0.02em] text-white"
                      style={{ textShadow: '0 2px 6px rgba(2,6,23,0.75)' }}
                    >
                      {state.currentProblem?.question}
                    </span>
                  </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-cyan-100/25 bg-[#123062]/58 p-3 shadow-[0_10px_22px_rgba(2,6,23,0.32)] sm:p-4">
                  <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80 sm:mb-3 sm:text-xs">
                    Select the correct answer set
                  </div>
                  <div className="flex min-h-0 flex-1 items-center justify-center">
                    <div className="text-center text-[clamp(1.2rem,4.4vw,1.7rem)] font-black text-white/90">
                      Select from the answers below
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center sm:mt-4">
                    {state.status === 'playing' ? (
                      <button
                        onClick={checkAnswer}
                        disabled={selectedOptions.length === 0}
                        className="inline-flex w-full max-w-sm items-center justify-center rounded-2xl border border-amber-100/70 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900 shadow-[0_10px_20px_rgba(2,6,23,0.35)] disabled:opacity-45"
                      >
                        Submit Data
                      </button>
                    ) : (
                      <div className="inline-flex w-full max-w-sm items-center justify-center rounded-2xl border border-cyan-100/45 bg-[#0d2a5a]/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/95">
                        {state.status === 'correct' ? 'Great answer • loading next challenge' : 'Not quite • loading next challenge'}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {state.status === 'correct' || state.status === 'incorrect' ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.06 }}
                        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black uppercase tracking-tight sm:text-7xl ${
                          state.status === 'correct' ? 'text-emerald-200/35' : 'text-amber-200/35'
                        }`}
                      >
                        {state.status === 'correct' ? 'Perfect' : 'Miss'}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {showChestBurst ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <img
                      src={MAIN_PNG_SKIN.treasureChest}
                      alt=""
                      className="h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
                      draggable={false}
                    />
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {state.status !== 'complete' && (
          <div className="mt-2 grid grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
            {state.currentProblem?.options.map((option, idx) => (
              <motion.button
                type="button"
                key={`${state.currentProblem?.id}-${option}-${idx}`}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => toggleOption(option)}
                className={`relative flex h-[clamp(62px,9vh,94px)] items-center justify-center rounded-2xl border text-[clamp(1.1rem,3.8vw,2rem)] font-black transition ${
                  selectedOptions.includes(option)
                    ? 'border-cyan-100 bg-[linear-gradient(180deg,#39c4f4_0%,#1278bb_100%)] text-white shadow-[0_0_0_3px_rgba(125,211,252,0.45),0_10px_22px_rgba(2,6,23,0.45)]'
                    : 'border-amber-100/70 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] text-slate-900 shadow-[0_8px_18px_rgba(2,6,23,0.3)]'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {playingState && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
          <div className="pointer-events-auto">
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorFrenzyGame;

