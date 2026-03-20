import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Rocket,
  Target,
  Zap,
  RotateCcw,
  Play,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Star,
  Globe,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RoundingTarget =
  | 'nearest 10'
  | 'nearest 100'
  | 'nearest 1,000'
  | 'nearest 10,000'
  | 'nearest 100,000'
  | 'nearest 1,000,000'
  | 'nearest whole number'
  | 'nearest 1 decimal place'
  | 'nearest 2 decimal places';

interface RoundingProblem {
  id: number;
  number: number;
  target: RoundingTarget;
  answer: string;
}

interface RoundingRocketGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const PLANETS = [
  { name: 'Moon', distance: 1000 },
  { name: 'Mars', distance: 3000 },
  { name: 'Jupiter', distance: 6000 },
  { name: 'Saturn', distance: 10000 },
  { name: 'Neptune', distance: 15000 },
  { name: 'Pluto', distance: 21000 },
];

const MAX_DISTANCE = 21000;

const scoreToStars = (score: number) => {
  if (score >= 5200) return 3;
  if (score >= 4000) return 2;
  return 1;
};

const generateProblem = (level: number): RoundingProblem => {
  let num: number;
  let target: RoundingTarget;
  let answer: string;

  if (level <= 2) {
    num = Math.floor(Math.random() * 9000) + 100;
    const targets: RoundingTarget[] = ['nearest 10', 'nearest 100', 'nearest 1,000'];
    target = targets[Math.floor(Math.random() * targets.length)];
    const factor = target === 'nearest 10' ? 10 : target === 'nearest 100' ? 100 : 1000;
    answer = (Math.round(num / factor) * factor).toString();
  } else if (level <= 5) {
    num = Math.floor(Math.random() * 900000) + 10000;
    const targets: RoundingTarget[] = ['nearest 1,000', 'nearest 10,000', 'nearest 100,000'];
    target = targets[Math.floor(Math.random() * targets.length)];
    const factor = target === 'nearest 1,000' ? 1000 : target === 'nearest 10,000' ? 10000 : 100000;
    answer = (Math.round(num / factor) * factor).toString();
  } else if (level <= 7) {
    num = Math.floor(Math.random() * 9000000) + 1000000;
    target = 'nearest 1,000,000';
    answer = (Math.round(num / 1000000) * 1000000).toString();
  } else {
    num = parseFloat((Math.random() * 100).toFixed(3));
    const targets: RoundingTarget[] = ['nearest whole number', 'nearest 1 decimal place', 'nearest 2 decimal places'];
    target = targets[Math.floor(Math.random() * targets.length)];

    if (target === 'nearest whole number') {
      answer = Math.round(num).toString();
    } else if (target === 'nearest 1 decimal place') {
      answer = (Math.round(num * 10) / 10).toFixed(1);
    } else {
      answer = (Math.round(num * 100) / 100).toFixed(2);
    }
  }

  return { id: Date.now() + Math.floor(Math.random() * 1000), number: num, target, answer };
};

const RoundingRocketGame: React.FC<RoundingRocketGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'success' | 'complete'>('start');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentProblem, setCurrentProblem] = useState<RoundingProblem | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [distance, setDistance] = useState(0);
  const [fuel, setFuel] = useState(100);

  const endedRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const startNewProblem = useCallback((lvl: number) => {
    setCurrentProblem(generateProblem(lvl));
    setUserInput('');
    setFeedback(null);
  }, []);

  const startGame = () => {
    clearTimers();
    endedRef.current = false;
    setScore(0);
    setLevel(1);
    setDistance(0);
    setFuel(100);
    setGameState('playing');
    startNewProblem(1);
  };

  const handleKeypad = (val: string) => {
    if (gameState !== 'playing') return;

    if (val === 'DEL') {
      setUserInput((previous) => previous.slice(0, -1));
      return;
    }

    if (val === '.') {
      if (!userInput.includes('.')) {
        setUserInput((previous) => (previous.length ? `${previous}.` : '0.'));
      }
      return;
    }

    if (userInput.length < 12) {
      setUserInput((previous) => `${previous}${val}`);
    }
  };

  const handleSubmit = () => {
    if (!currentProblem || gameState !== 'playing' || endedRef.current) return;

    const normalizedInput = userInput.trim();
    if (!normalizedInput) return;

    const numericMatch = parseFloat(normalizedInput) === parseFloat(currentProblem.answer);
    const requiresExactDecimals = currentProblem.target.includes('decimal');
    const exactFormatMatch = !requiresExactDecimals || normalizedInput === currentProblem.answer;
    const isCorrect = numericMatch && exactFormatMatch;

    if (isCorrect) {
      const nextDistance = Math.min(MAX_DISTANCE, distance + 2100);
      setScore((previous) => previous + 500);
      setDistance(nextDistance);
      setFuel((previous) => Math.min(100, previous + 15));
      setFeedback({ type: 'success', message: 'Fuel injection successful! Boosting...' });
      setGameState('success');
      return;
    }

    const nextFuel = Math.max(0, fuel - 20);
    setFuel(nextFuel);
    setFeedback({ type: 'error', message: `Incorrect. Target was ${currentProblem.answer}.` });

    const timeoutId = window.setTimeout(() => {
      if (nextFuel <= 0) {
        if (!endedRef.current) {
          endedRef.current = true;
          onGameOver(score);
        }
        return;
      }

      setFeedback(null);
      startNewProblem(level);
    }, 1600);

    timeoutsRef.current.push(timeoutId);
  };

  const nextLevel = () => {
    if (distance >= MAX_DISTANCE) {
      setGameState('complete');
      return;
    }

    const nextLvl = Math.floor(distance / 2100) + 1;
    setLevel(nextLvl);
    setGameState('playing');
    startNewProblem(nextLvl);
  };

  const submitMission = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onVictory(scoreToStars(score), score);
  };

  const currentPlanet = useMemo(
    () => PLANETS.find((planet) => distance < planet.distance) || PLANETS[PLANETS.length - 1],
    [distance],
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#050505] font-sans text-white select-none">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.1 }}
      />

      <header className="z-20 flex h-16 items-center justify-between border-b border-white/10 bg-black/40 px-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/40 bg-slate-900 text-indigo-300 transition hover:bg-slate-800"
            aria-label="Back to levels"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="rounded-lg bg-indigo-600 p-2 shadow-lg shadow-indigo-500/20">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">Rounding Rocket</h1>
            <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Navigation Control</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Total XP</span>
            <span className="text-sm font-black tabular-nums text-indigo-400">{score}</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Target Planet</span>
            <span className="text-sm font-black text-white uppercase">{currentPlanet.name}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentProblem && (
            <motion.div
              key={currentProblem.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="grid w-full max-w-6xl grid-cols-1 items-stretch gap-12 lg:grid-cols-2"
            >
              <section className="relative flex flex-col gap-8 overflow-hidden rounded-3xl border border-white/10 bg-[#141414] p-10 shadow-2xl">
                <div className="absolute right-0 top-0 p-8 opacity-5">
                  <Cpu className="h-48 w-48" />
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-indigo-500/20 p-3">
                    <Target className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">Mission Objective</h2>
                    <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">Data Processing Unit</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/5 bg-black/40 p-8">
                    <span className="text-xs font-black tracking-[0.3em] text-indigo-400 uppercase">Input Value</span>
                    <span className="text-6xl font-black tabular-nums tracking-tighter text-white">
                      {currentProblem.number.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <span className="text-sm font-black tracking-widest text-slate-400 uppercase">Rounding Instruction</span>
                    </div>
                    <p className="text-3xl leading-tight font-bold text-white">
                      Round this number to the{' '}
                      <span className="text-indigo-400 underline decoration-indigo-500/50 underline-offset-8">{currentProblem.target}</span>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black tracking-widest text-slate-500 uppercase">
                      <span>Earth</span>
                      <span>{currentPlanet.name}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(distance / MAX_DISTANCE) * 100}%` }}
                        className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-8">
                <div className="flex flex-1 flex-col gap-8 rounded-3xl border border-white/10 bg-[#141414] p-10 shadow-2xl">
                  <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/40 p-6">
                    <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Output Buffer</span>
                    <span className="min-h-[1em] text-4xl font-black tabular-nums text-indigo-400">
                      {userInput || '0'}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="ml-1 inline-block h-8 w-1 align-middle bg-indigo-400"
                      />
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleKeypad(val.toString())}
                        disabled={gameState === 'success'}
                        className="flex h-16 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-xl font-black transition-all hover:bg-white/10 active:bg-indigo-500/20 disabled:opacity-50"
                      >
                        {val}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {gameState === 'success' ? (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={nextLevel}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-6 text-sm font-black tracking-[0.2em] text-white uppercase shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                      >
                        Initiate Next Jump <ChevronRight className="h-5 w-5" />
                      </motion.button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!userInput}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-6 text-sm font-black tracking-[0.2em] text-black uppercase shadow-xl transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Confirm Calculation <ChevronRight className="h-5 w-5" />
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-12 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-indigo-600 shadow-2xl shadow-indigo-500/40">
                  <Rocket className="h-12 w-12 text-white" />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-[2.5rem] border-4 border-indigo-400"
                  />
                </div>
                <h2 className="mb-4 text-4xl font-black tracking-tighter text-white uppercase italic">Rounding Rocket</h2>
                <p className="mb-8 leading-relaxed font-medium text-slate-400">
                  The fleet needs precise navigation data. Round each value to the required accuracy,
                  fuel your rocket, and reach the edge of the solar system.
                </p>
                <button
                  onClick={startGame}
                  className="group flex items-center gap-3 rounded-full bg-indigo-600 px-12 py-5 text-sm font-black tracking-[0.2em] text-white uppercase shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                >
                  <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" /> Launch Mission
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 p-12 text-center backdrop-blur-xl"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8">
                  <Globe className="h-24 w-24 text-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute -inset-4 rounded-full border-2 border-dashed border-indigo-400/30"
                  />
                </div>
                <h2 className="mb-2 text-4xl font-black tracking-tighter text-white uppercase italic">Mission Accomplished</h2>
                <p className="mb-8 font-medium text-slate-400">
                  You&apos;ve reached Pluto. Rounding precision across every system is mission-ready.
                </p>
                <div className="mb-8 w-full rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl">
                  <span className="mb-1 block text-[10px] font-black tracking-widest text-slate-500 uppercase">Final Mission XP</span>
                  <span className="text-5xl font-black tabular-nums text-indigo-400">{score}</span>
                </div>
                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={submitMission}
                    className="flex items-center justify-center gap-3 rounded-full bg-white px-12 py-5 text-sm font-black tracking-[0.2em] text-black uppercase shadow-2xl transition-all hover:bg-slate-200"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Submit Mission
                  </button>
                  <button
                    onClick={startGame}
                    className="flex items-center justify-center gap-3 rounded-full bg-indigo-600 px-12 py-5 text-sm font-black tracking-[0.2em] text-white uppercase shadow-2xl shadow-indigo-500/20 transition-all hover:bg-indigo-700"
                  >
                    <RotateCcw className="h-4 w-4" /> New Expedition
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute bottom-12 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-8 py-4 shadow-2xl ${
                feedback.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-black tracking-wide uppercase">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="z-20 flex h-10 items-center justify-between border-t border-white/10 bg-black/40 px-8 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Star className="h-3 w-3 text-indigo-400" />
            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase">Sector: Year 6 SATs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 animate-pulse rounded-full ${fuel < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase">Fuel: {fuel}%</span>
          </div>
        </div>
        <span className="text-[8px] font-black tracking-widest text-slate-600 uppercase">(c) 2026 Rounding Rocket Navigation</span>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default RoundingRocketGame;
