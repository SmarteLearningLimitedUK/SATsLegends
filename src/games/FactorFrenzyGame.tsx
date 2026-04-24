import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import {
  Trophy,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import factorFrenzyBackground from '../assets/maps/backgroundsforgames/Factor Frenzy.jpg';
import goblinWizard from '../assets/bosses/goblinwiz.jpg';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { buildPraiseMessage, shouldShowPraise } from '../utils/praiseFeedback';

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
  enemyHealth: number;
}

const FRENZY_LEVELS: FrenzyLevel[] = [
  { name: 'Rookie', threshold: 0, timeLimit: 30 },
  { name: 'Pro', threshold: 1000, timeLimit: 25 },
  { name: 'Elite', threshold: 3000, timeLimit: 20 },
  { name: 'Master', threshold: 6000, timeLimit: 15 },
  { name: 'Legend', threshold: 10000, timeLimit: 10 },
];

const ENEMY_MAX_HEALTH = 10;

const INITIAL_STATE: LocalState = {
  XP: 0,
  level: 1,
  currentProblem: null,
  status: 'playing',
  timeLeft: 30,
  enemyHealth: ENEMY_MAX_HEALTH,
};

const scoreToStars = (XP: number) => {
  if (XP >= 14000) return 3;
  if (XP >= 10000) return 2;
  return 1;
};

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const buildOptions = (correctAnswers: number[], candidatePool: number[]) => {
  const correctSet = new Set(correctAnswers);
  const uniqueCandidates = Array.from(new Set(candidatePool.filter((value) => value > 0)));
  const chosen: number[] = [];

  for (const value of shuffle(uniqueCandidates)) {
    if (correctSet.has(value) && !chosen.includes(value)) {
      chosen.push(value);
    }
  }

  for (const value of shuffle(uniqueCandidates)) {
    if (!correctSet.has(value) && !chosen.includes(value)) {
      chosen.push(value);
    }
    if (chosen.length >= 4) break;
  }

  if (chosen.length < 4) {
    const seeds = correctAnswers.length > 0 ? correctAnswers : [10, 12, 15, 18];
    const fallback = shuffle([
      ...seeds.map((value) => value + 1),
      ...seeds.map((value) => Math.max(1, value - 1)),
      ...seeds.map((value) => value + 2),
      ...seeds.map((value) => value + 3),
    ]);

    for (const value of fallback) {
      if (!chosen.includes(value)) {
        chosen.push(value);
      }
      if (chosen.length >= 4) break;
    }
  }

  return shuffle(chosen.slice(0, 4));
};

const FactorFrenzyGame: React.FC<FactorFrenzyGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [showHitFx, setShowHitFx] = useState(false);
  const [successTone, setSuccessTone] = useState<'success' | 'praise'>('success');
  const [successMessage, setSuccessMessage] = useState('Direct hit!');
  const problemStartRef = useRef<number>(Date.now());
const factorFrenzyEnemy = useMemo(() => goblinWizard, []);

  const timerRef = useRef<number | null>(null);
  const advanceRef = useRef<number | null>(null);
  const endedRef = useRef(false);

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

  const getFactors = (number: number): number[] => {
    const factors: number[] = [];
    for (let factor = 1; factor <= number; factor += 1) {
      if (number % factor === 0) factors.push(factor);
    }
    return factors;
  };

  const getPrimeFactors = (number: number): number[] => {
    const factors: number[] = [];
    let divisor = 2;
    let remaining = number;

    while (remaining > 1) {
      while (remaining % divisor === 0) {
        factors.push(divisor);
        remaining /= divisor;
      }
      divisor += 1;
    }

    return [...new Set(factors)];
  };

  const generateProblem = useCallback((level: number): FactorProblem => {
    const problemTypes: FactorProblemType[] = ['missing_factor', 'all_factors', 'common_factors', 'prime_factors'];
    const type = problemTypes[Math.min(level - 1, problemTypes.length - 1)];
    const id = Date.now() + Math.floor(Math.random() * 1000);

    if (type === 'missing_factor') {
      const number = Math.floor(Math.random() * 50) + 10;
      const factors = getFactors(number);
      const factor = factors[Math.floor(Math.random() * factors.length)];
      const answer = number / factor;
      const distractors = [answer + 2, answer - 1, answer + 5, answer - 3, answer + 7, answer - 4].filter((value) => value > 0);
      const options = buildOptions([answer], distractors);

      return {
        id,
        type,
        number,
        question: `The Monster Minds broke the factor chain. Find the missing factor: ${factor} x ? = ${number}`,
        options,
        correctAnswers: [answer],
      };
    }

    if (type === 'all_factors') {
      const number = [14, 15, 21, 22, 26, 33, 34, 35, 39, 46, 51, 55][Math.floor(Math.random() * 12)];
      const correctAnswers = getFactors(number);
      const extras = [number + 1, number - 2, 7, 9, 11, 13, 17, 19].filter((value) => value > 0 && !correctAnswers.includes(value));
      const options = buildOptions(correctAnswers, [...correctAnswers, ...extras]);

      return {
        id,
        type,
        number,
        question: `Strike all factors of ${number} to clear the swarm.`,
        options,
        correctAnswers,
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
      const [number, number2] = pairs[Math.floor(Math.random() * pairs.length)];
      const factorsOne = getFactors(number);
      const factorsTwo = getFactors(number2);
      const commonAnswers = factorsOne.filter((value) => factorsTwo.includes(value));
      const extras = [5, 7, 9, 11, 13, 14, 15, 16].filter((value) => !commonAnswers.includes(value));
      const options = buildOptions(commonAnswers, [...commonAnswers, ...extras]);

      return {
        id,
        type,
        number,
        number2,
        question: `Find all common factors of ${number} and ${number2} to break the Monster Minds' defence.`,
        options,
        correctAnswers: commonAnswers,
      };
    }

    const number = [12, 20, 30, 42, 60, 72, 84][Math.floor(Math.random() * 7)];
    const correctAnswers = getPrimeFactors(number);
    const options = buildOptions(correctAnswers, shuffle([2, 3, 4, 5, 6, 7, 8, 9, 11, 13]));

    return {
      id,
      type,
      number,
      question: `Find all prime factors of ${number} to disrupt the Monster Minds.`,
      options,
      correctAnswers,
    };
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
    const firstProblem = generateProblem(1);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState({
      ...INITIAL_STATE,
      currentProblem: firstProblem,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
    });
    setSelectedOptions([]);
  };

  useEffect(() => {
    if (state.currentProblem) return;
    const firstProblem = generateProblem(1);
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');
    setState((previous) => ({
      ...previous,
      currentProblem: firstProblem,
      status: 'playing',
      timeLeft: FRENZY_LEVELS[0].timeLimit,
      enemyHealth: ENEMY_MAX_HEALTH,
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
        ? previous.filter((item) => item !== value)
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
      const remainingHealth = Math.max(0, state.enemyHealth - 1);
      const finished = remainingHealth <= 0;
      const elapsedMs = Date.now() - problemStartRef.current;
      const isPraise = shouldShowPraise(1, elapsedMs);

      setState((previous) => ({
        ...previous,
        XP: newScore,
        enemyHealth: remainingHealth,
        status: finished ? 'complete' : 'correct',
      }));
      setSuccessTone(isPraise ? 'praise' : 'success');
      setSuccessMessage(isPraise ? buildPraiseMessage() : 'Direct hit!');

      setShowHitFx(true);
      confetti({
        particleCount: finished ? 160 : 120,
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
    problemStartRef.current = Date.now();
    setSuccessTone('success');
    setSuccessMessage('Direct hit!');

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
    if (!showHitFx) return;
    const timeout = window.setTimeout(() => setShowHitFx(false), 520);
    return () => window.clearTimeout(timeout);
  }, [showHitFx]);

  const submitRun = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.XP), state.XP);
  };

  const enemyHealthPercent = (state.enemyHealth / ENEMY_MAX_HEALTH) * 100;
  const playingState = state.status === 'playing' || state.status === 'correct' || state.status === 'incorrect';

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${factorFrenzyBackground})` }}
    >
      <div className="pointer-events-none fixed left-0 right-0 top-[max(0.5rem,env(safe-area-inset-top))] z-50 flex justify-center px-3">
        <div className="w-full max-w-[780px]">
          <GameQuestionCard
            title="Factor Frenzy"
            subtitle={`Level ${state.level}`}
            className="mx-auto w-full"
            bodyClassName="text-[clamp(0.95rem,2.9vw,1.3rem)] font-black leading-snug tracking-[0.01em] text-white md:text-[1.4rem]"
          >
            {state.currentProblem?.question}
          </GameQuestionCard>
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+11rem)] pt-[calc(env(safe-area-inset-top)+7.4rem)] sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom)+11.5rem)] sm:pt-[calc(env(safe-area-inset-top)+7.8rem)] md:px-5 md:pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pt-[calc(env(safe-area-inset-top)+8.1rem)]">
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
                <h2 className="mt-3 text-3xl font-black uppercase text-amber-50 sm:text-4xl">Monster Mind Defeated</h2>
                <p className="mt-2 text-sm font-semibold text-cyan-50/85">The Monster Minds have been pushed back.</p>
                <div className="mt-4 rounded-2xl border border-cyan-100/30 bg-[#0d2a5a]/80 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">Final XP</p>
                  <p className="mt-1 text-4xl font-black text-amber-100">{state.XP.toLocaleString()}</p>
                </div>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    onClick={submitRun}
                    className="ui-button-success inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em]"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Claim Victory
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                      startGame();
                    }}
                    className="ui-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em]"
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
                <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-cyan-100/16 bg-transparent p-3 sm:p-4">
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80 sm:text-xs">
                        Strike every correct factor
                      </div>
                      <div className="rounded-full border border-cyan-100/25 bg-slate-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/90">
                        {state.timeLeft}s left
                      </div>
                    </div>

                    <div className="relative mt-3 flex min-h-0 flex-1 flex-col items-center justify-center">
                      <div className="w-full max-w-[17rem] rounded-2xl border border-amber-200/24 bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.1))] px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.18)]">
                        <div className="mb-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-amber-200">
                          Monster Mind
                        </div>
                        <div className="h-2 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/70">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
                            animate={{ width: `${enemyHealthPercent}%` }}
                            transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex w-full justify-center">
                        <motion.div
                          className="relative w-[min(46vw,13.5rem)] max-w-full"
                          animate={
                            showHitFx
                              ? { x: [0, -8, 8, -6, 6, 0], rotate: [0, -2, 2, -1, 1, 0] }
                              : { x: 0, rotate: 0 }
                          }
                          transition={{ duration: 0.42, ease: 'easeInOut' }}
                        >
                          <motion.img
                            src={factorFrenzyEnemy}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="relative h-auto w-full object-contain drop-shadow-[0_18px_26px_rgba(2,6,23,0.38)]"
                            animate={{ opacity: showHitFx ? 0.92 : 1, scale: showHitFx ? [1, 1.03, 1] : 1 }}
                            transition={{ duration: 0.42, ease: 'easeInOut' }}
                          />
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {state.status === 'correct' || state.status === 'incorrect' ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.06 }}
                            className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black uppercase tracking-tight sm:text-7xl ${
                              state.status === 'correct'
                                ? successTone === 'praise'
                                  ? 'text-amber-100 drop-shadow-[0_0_24px_rgba(251,191,36,0.75)]'
                                  : 'text-emerald-200/35'
                                : 'text-amber-200/35'
                            }`}
                          >
                            {state.status === 'correct' ? successMessage : 'Miss'}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <div className="mt-auto flex items-center justify-center">
                      {state.status === 'playing' ? (
                        <button
                          onClick={checkAnswer}
                          disabled={selectedOptions.length === 0}
                          className="ui-button-primary inline-flex w-full max-w-sm items-center justify-center rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.14em] disabled:opacity-45"
                        >
                          Strike
                        </button>
                      ) : (
                        <div className="inline-flex w-full max-w-sm items-center justify-center rounded-2xl border border-cyan-100/45 bg-[#0d2a5a]/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/95">
                          {state.status === 'correct' ? 'Direct hit • loading next challenge' : 'The swarm is still active • loading next challenge'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {state.status !== 'complete' && (
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 px-3">
            <div className="answer-choice-surface mx-auto grid w-full max-w-[780px] grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
              {state.currentProblem?.options.map((option, idx) => (
                <motion.button
                  type="button"
                  key={`${state.currentProblem?.id}-${option}-${idx}`}
                  initial={{ opacity: 0, y: 6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => toggleOption(option)}
                  className={`relative flex h-[clamp(54px,7.4vh,72px)] items-center justify-center rounded-xl border text-[clamp(0.95rem,3.1vw,1.55rem)] font-black transition ${
                    state.status === 'correct' && selectedOptions.includes(option)
                      ? 'ui-button-success'
                      : selectedOptions.includes(option)
                        ? 'ui-button-primary'
                        : 'ui-button-secondary'
                  }`}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FactorFrenzyGame;

