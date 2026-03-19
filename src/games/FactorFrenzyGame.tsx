import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Trophy,
  RotateCcw,
  ChevronRight,
  AlertCircle,
  Timer,
  Flame,
  Star,
  Target,
  Activity,
  Award,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

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
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface LocalState {
  score: number;
  level: number;
  currentProblem: FactorProblem | null;
  status: 'start' | 'playing' | 'correct' | 'incorrect' | 'complete' | 'gameover';
  timeLeft: number;
  streak: number;
  mistakes: number;
}

const FRENZY_LEVELS: FrenzyLevel[] = [
  { name: 'Rookie', threshold: 0, timeLimit: 30 },
  { name: 'Pro', threshold: 1000, timeLimit: 25 },
  { name: 'Elite', threshold: 3000, timeLimit: 20 },
  { name: 'Master', threshold: 6000, timeLimit: 15 },
  { name: 'Legend', threshold: 10000, timeLimit: 10 },
];

const INITIAL_STATE: LocalState = {
  score: 0,
  level: 1,
  currentProblem: null,
  status: 'start',
  timeLeft: 30,
  streak: 0,
  mistakes: 0,
};

const MAX_MISTAKES = 3;

const scoreToStars = (score: number) => {
  if (score >= 14000) return 3;
  if (score >= 10000) return 2;
  return 1;
};

const FactorFrenzyGame: React.FC<FactorFrenzyGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [state, setState] = useState<LocalState>(INITIAL_STATE);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  const timerRef = useRef<number | null>(null);
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
        question: `Find the missing factor: ${f1} × ? = ${n}`,
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

  useEffect(() => () => clearTimer(), []);

  const getLevelFromScore = useCallback((score: number) => {
    const currentLevel = [...FRENZY_LEVELS].reverse().find((level) => score >= level.threshold) || FRENZY_LEVELS[0];
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
    clearTimer();

    if (state.status !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setState((previous) => {
        if (previous.timeLeft <= 1) {
          return {
            ...previous,
            status: 'incorrect',
            streak: 0,
            mistakes: previous.mistakes + 1,
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

  useEffect(() => {
    if (state.mistakes < MAX_MISTAKES || endedRef.current) return;
    endedRef.current = true;
    setState((previous) => ({ ...previous, status: 'gameover' }));
  }, [state.mistakes]);

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
      const streakBonus = state.streak * 50;
      const points = 500 + timeBonus + streakBonus;

      const newScore = state.score + points;
      const masteryReached = newScore >= 14000;

      setState((previous) => ({
        ...previous,
        score: newScore,
        status: masteryReached ? 'complete' : 'correct',
        streak: previous.streak + 1,
      }));

      return;
    }

    setState((previous) => ({
      ...previous,
      status: 'incorrect',
      streak: 0,
      mistakes: previous.mistakes + 1,
    }));
  };

  const nextProblem = () => {
    if (state.status === 'gameover') {
      if (!endedRef.current) {
        endedRef.current = true;
      }
      onGameOver(state.score);
      return;
    }

    const { levelConfig, levelIndex } = getLevelFromScore(state.score);
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

  const submitRun = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(state.score), state.score);
  };

  const currentLevel = useMemo(
    () => [...FRENZY_LEVELS].reverse().find((level) => state.score >= level.threshold) || FRENZY_LEVELS[0],
    [state.score],
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0f] text-white selection:bg-cyan-500/30">
      <div className="scanline" />

      <div className="relative z-10 flex h-full flex-col p-6">
        <header className="frenzy-card neon-border-cyan mb-6 flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              aria-label="Back to levels"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(0,242,255,0.3)]">
              <Zap className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="neon-text-cyan text-2xl font-black tracking-tighter italic">FACTOR FRENZY</h1>
              <div className="flex items-center gap-2">
                <Award className="h-3 w-3 text-pink-500" />
                <p className="text-[10px] font-bold tracking-[0.3em] text-pink-500 uppercase">{currentLevel.name} RANK</p>
              </div>
            </div>
          </div>

          <div className="flex gap-12">
            <div className="text-center">
              <p className="mb-1 text-[10px] font-black tracking-widest text-zinc-500 uppercase">Streak</p>
              <div className="flex items-center justify-center gap-2">
                <Flame className={`h-5 w-5 ${state.streak > 0 ? 'animate-pulse text-orange-500' : 'text-zinc-800'}`} />
                <p className="font-mono text-3xl font-black text-white">{state.streak}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="mb-1 text-[10px] font-black tracking-widest text-zinc-500 uppercase">Time Left</p>
              <div className="flex items-center justify-center gap-2">
                <Timer className={`h-5 w-5 ${state.timeLeft < 5 ? 'animate-bounce text-red-500' : 'text-cyan-400'}`} />
                <p className={`font-mono text-3xl font-black ${state.timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{state.timeLeft}s</p>
              </div>
            </div>
            <div className="min-w-[120px] text-right">
              <p className="mb-1 text-[10px] font-black tracking-widest text-zinc-500 uppercase">Total Score</p>
              <p className="neon-text-cyan font-mono text-3xl font-black">{state.score.toLocaleString()}</p>
            </div>
          </div>
        </header>

        <main className="relative flex flex-1 flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {state.status === 'start' ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="frenzy-card neon-border-pink max-w-2xl p-12 text-center"
              >
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    <Activity className="h-24 w-24 text-pink-500" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-4 border-pink-500"
                    />
                  </div>
                </div>
                <h2 className="neon-text-pink mb-6 text-5xl font-black tracking-tighter italic uppercase">Enter the Frenzy</h2>
                <p className="mb-10 text-lg leading-relaxed font-medium text-zinc-400">
                  Identify factors, common factors, and prime factors at lightning speed.
                  Year 6 SATs curriculum challenges await.
                </p>
                <button
                  onClick={startGame}
                  className="frenzy-button border-pink-500/50 bg-pink-500/10 px-12 py-5 text-lg text-pink-500 hover:bg-pink-500/20 hover:shadow-[0_0_30px_rgba(255,0,255,0.4)]"
                >
                  START MISSION
                </button>
              </motion.div>
            ) : state.status === 'complete' ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="frenzy-card neon-border-cyan max-w-2xl p-12 text-center"
              >
                <div className="mb-8 flex justify-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/40">
                    <Trophy className="h-16 w-16 text-cyan-300" />
                  </div>
                </div>
                <h2 className="neon-text-cyan mb-3 text-4xl font-black tracking-tighter italic uppercase">Legend Achieved</h2>
                <p className="mb-8 font-medium text-zinc-400">You have cleared the full SATs factor gauntlet.</p>
                <div className="mb-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
                  <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Final Score</p>
                  <p className="neon-text-cyan mt-1 font-mono text-5xl font-black">{state.score.toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={submitRun}
                    className="frenzy-button border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                  >
                    <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> SUBMIT RUN</span>
                  </button>
                  <button
                    onClick={startGame}
                    className="frenzy-button border-pink-500/40 bg-pink-500/10 text-pink-400"
                  >
                    <span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" /> RESTART</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={state.currentProblem?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex w-full max-w-4xl flex-col items-center"
              >
                <div className="frenzy-card neon-border-cyan relative mb-8 w-full overflow-hidden p-10 text-center">
                  <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <Target className="h-5 w-5 text-cyan-400" />
                    <span className="text-xs font-black tracking-[0.4em] text-zinc-500 uppercase">Objective</span>
                  </div>
                  <h3 className="mb-2 text-4xl font-black tracking-tight text-white">
                    {state.currentProblem?.question}
                  </h3>
                  <p className="text-xs font-black tracking-[0.24em] text-zinc-500 uppercase">Mistakes {state.mistakes}/{MAX_MISTAKES}</p>
                </div>

                <div className="mb-12 grid grid-cols-4 gap-6">
                  {state.currentProblem?.options.map((option, idx) => (
                    <motion.button
                      type="button"
                      key={`${state.currentProblem?.id}-${option}-${idx}`}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => toggleOption(option)}
                      className={`option-bubble ${selectedOptions.includes(option) ? 'selected' : ''}`}
                    >
                      {option}
                    </motion.button>
                  ))}
                </div>

                <div className="w-full max-w-md">
                  {state.status === 'playing' ? (
                    <button
                      onClick={checkAnswer}
                      disabled={selectedOptions.length === 0}
                      className="frenzy-button w-full border-cyan-500/50 bg-cyan-500/10 py-5 text-cyan-400 disabled:opacity-30"
                    >
                      SUBMIT DATA
                    </button>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={nextProblem}
                      className={`frenzy-button flex w-full items-center justify-center gap-3 py-5 ${
                        state.status === 'correct'
                          ? 'border-green-500/50 bg-green-500/10 text-green-400'
                          : 'border-red-500/50 bg-red-500/10 text-red-400'
                      }`}
                    >
                      {state.status === 'correct' ? 'NEXT CHALLENGE' : state.status === 'gameover' ? 'SUBMIT LOSS' : 'TRY AGAIN'}
                      <ChevronRight className="h-5 w-5" />
                    </motion.button>
                  )}
                </div>

                <AnimatePresence>
                  {state.status !== 'playing' && state.status !== 'complete' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.2 }}
                      className={`pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-8xl font-black tracking-tighter italic uppercase ${
                        state.status === 'correct' ? 'text-green-500/40' : 'text-red-500/40'
                      }`}
                    >
                      {state.status === 'correct' ? 'PERFECT' : 'FAILED'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-auto flex items-center justify-between text-[10px] font-black tracking-[0.3em] text-zinc-600 uppercase">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="h-3 w-3 text-cyan-500" />
              <span>Year 6 Curriculum Aligned</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-pink-500" />
              <span>Live Data Feed: Active</span>
            </div>
          </div>
          <div>NEON-CORE ENGINE // BUILD 2.4.0</div>
        </footer>
      </div>

      <div className="pointer-events-none fixed top-0 left-0 z-0 h-full w-full overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-pink-500/10 blur-[120px]" />
      </div>

      <style>{`
        .frenzy-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }

        .neon-border-cyan {
          border: 2px solid #00f2ff;
          box-shadow: 0 0 15px #00f2ff, inset 0 0 5px #00f2ff;
        }

        .neon-border-pink {
          border: 2px solid #ff00ff;
          box-shadow: 0 0 15px #ff00ff, inset 0 0 5px #ff00ff;
        }

        .neon-text-cyan {
          color: #00f2ff;
          text-shadow: 0 0 10px #00f2ff;
        }

        .neon-text-pink {
          color: #ff00ff;
          text-shadow: 0 0 10px #ff00ff;
        }

        .frenzy-button {
          position: relative;
          overflow: hidden;
          border-radius: 0.75rem;
          padding: 0.75rem 1.5rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: all 0.2s ease;
          transform: translateZ(0);
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
        }

        .frenzy-button:active {
          transform: scale(0.95);
        }

        .frenzy-button:hover {
          border-color: #00f2ff;
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.3);
        }

        .option-bubble {
          display: flex;
          height: 5rem;
          width: 5rem;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          font-size: 1.5rem;
          font-weight: 900;
          transition: all 0.2s ease;
        }

        .option-bubble:hover {
          transform: scale(1.1);
          border-color: #9d00ff;
          box-shadow: 0 0 20px rgba(157, 0, 255, 0.5);
        }

        .option-bubble.selected {
          background: #9d00ff;
          border-color: #00f2ff;
          box-shadow: 0 0 30px #9d00ff;
          color: white;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(0, 242, 255, 0.1);
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default FactorFrenzyGame;
