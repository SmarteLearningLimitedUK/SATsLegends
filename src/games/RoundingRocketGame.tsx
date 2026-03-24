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
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GameActionDock from '../components/GameActionDock';
import rocket2Background from '../assets/maps/rocket2.jpg';

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
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 390, height: 844 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });
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

  useEffect(() => {
    const onResize = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      setViewport({ width, height });
    };

    const vv = window.visualViewport;
    window.addEventListener('resize', onResize);
    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
    };
  }, []);

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
  const isCompactViewport = viewport.height < 780 || viewport.width < 390;
  const isUltraCompactViewport = viewport.height < 700;

  return (
    <div className="fixed inset-0 z-20 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#08162c] font-sans text-white select-none">
      <img
        src={rocket2Background}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(125,211,252,0.22),transparent_38%),linear-gradient(180deg,rgba(7,22,48,0.24)_0%,rgba(7,20,45,0.46)_58%,rgba(4,12,28,0.72)_100%)]" />

      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden ${isCompactViewport ? 'p-2' : 'p-2 sm:p-3 md:p-4'}`}
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + ${isCompactViewport ? '3.15rem' : '3.5rem'})`,
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${isCompactViewport ? '4.15rem' : '4.8rem'})`,
        }}
      >
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentProblem && (
            <motion.div
              key={currentProblem.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className={`grid h-full w-full min-h-0 grid-cols-1 ${isUltraCompactViewport ? 'grid-rows-[0.42fr_0.58fr] gap-1.5' : 'grid-rows-[0.44fr_0.56fr] gap-2'} xl:grid-cols-2 xl:grid-rows-1 ${isCompactViewport ? 'xl:gap-3' : 'xl:gap-4'}`}
            >
              <section className={`relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(20,53,116,0.82),rgba(12,33,76,0.9))] shadow-[0_18px_36px_rgba(2,6,23,0.52)] ${isCompactViewport ? 'gap-2.5 p-3.5' : 'gap-3 p-4 sm:gap-4 sm:p-5'}`}>
                <div className="absolute right-0 top-0 p-8 opacity-5">
                  <Cpu className="h-48 w-48" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.14),transparent_52%)]" />

                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="rounded-xl bg-amber-300/18 p-2 sm:rounded-2xl sm:p-3">
                    <Target className="h-5 w-5 text-amber-300 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-white uppercase italic sm:text-xl">Mission Objective</h2>
                    <p className="text-[10px] font-bold tracking-widest text-cyan-100/70 uppercase sm:text-xs">Data Processing Unit</p>
                  </div>
                </div>

                <div className={isCompactViewport ? 'space-y-2.5' : 'space-y-3 sm:space-y-4'}>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-cyan-100/24 bg-slate-950/34 p-3 sm:gap-3 sm:rounded-3xl sm:p-5">
                    <span className="text-[10px] font-black tracking-[0.22em] text-amber-200 uppercase sm:text-xs sm:tracking-[0.3em]">Input Value</span>
                    <span className={`${isCompactViewport ? 'text-[clamp(1.45rem,6.3vw,2.25rem)]' : 'text-3xl sm:text-4xl md:text-5xl'} font-black tabular-nums tracking-tighter text-white`}>
                      {currentProblem.number.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
                      <span className="text-[10px] font-black tracking-[0.14em] text-cyan-100/72 uppercase sm:text-xs">Rounding Instruction</span>
                    </div>
                    <p className={`${isCompactViewport ? 'text-base sm:text-lg' : 'text-lg sm:text-xl md:text-2xl'} leading-tight font-bold text-white`}>
                      Round this number to the{' '}
                      <span className="text-amber-200 underline decoration-amber-300/70 underline-offset-8">{currentProblem.target}</span>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black tracking-widest text-cyan-100/70 uppercase">
                      <span>Earth</span>
                      <span>{currentPlanet.name}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full border border-cyan-100/24 bg-slate-950/42">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(distance / MAX_DISTANCE) * 100}%` }}
                        className="h-full bg-[linear-gradient(90deg,#22d3ee,#facc15)] shadow-[0_0_16px_rgba(250,204,21,0.38)]"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="min-h-0">
                <div className={`flex h-full min-h-0 flex-col rounded-2xl border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(15,47,108,0.84),rgba(10,28,68,0.92))] shadow-[0_18px_36px_rgba(2,6,23,0.52)] ${isCompactViewport ? 'gap-2.5 p-3.5' : 'gap-3 p-4 sm:gap-4 sm:p-5'}`}>
                  <div className="flex items-center justify-between rounded-xl border border-cyan-100/24 bg-slate-950/36 p-3 sm:rounded-2xl sm:p-4">
                    <span className="text-[10px] font-black tracking-[0.14em] text-cyan-100/72 uppercase sm:text-xs">Output Buffer</span>
                    <span className={`${isCompactViewport ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'} min-h-[1em] font-black tabular-nums text-amber-200`}>
                      {userInput || '0'}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="ml-1 inline-block h-6 w-1 align-middle bg-amber-200 sm:h-7"
                      />
                    </span>
                  </div>

                  <div className={`grid grid-cols-3 ${isCompactViewport ? 'gap-1.5 sm:gap-2' : 'gap-2 sm:gap-3'}`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'DEL'].map((val) => (
                      <button
                        key={val}
                        onClick={() => handleKeypad(val.toString())}
                        disabled={gameState === 'success'}
                        className={`flex items-center justify-center rounded-lg border border-cyan-100/22 bg-slate-900/45 font-black text-cyan-50 transition-all hover:bg-sky-600/28 active:bg-cyan-500/25 disabled:opacity-50 ${isCompactViewport ? 'h-10 text-base sm:h-11 sm:text-lg' : 'h-12 text-lg sm:h-14 sm:rounded-xl sm:text-xl'}`}
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
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#fcd34d,#f59e0b)] py-3 text-[11px] font-black tracking-[0.16em] text-slate-900 uppercase shadow-xl shadow-amber-500/30 transition-all hover:brightness-105 sm:gap-3 sm:rounded-2xl sm:py-4 sm:text-sm sm:tracking-[0.2em]"
                      >
                        Initiate Next Jump <ChevronRight className="h-5 w-5" />
                      </motion.button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={!userInput}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#38bdf8,#2563eb)] py-3 text-[11px] font-black tracking-[0.16em] text-white uppercase shadow-xl shadow-cyan-500/25 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-3 sm:rounded-2xl sm:py-4 sm:text-sm sm:tracking-[0.2em]"
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-8 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-[linear-gradient(180deg,#38bdf8,#1d4ed8)] shadow-2xl shadow-cyan-500/40">
                  <Rocket className="h-12 w-12 text-white" />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-[2.5rem] border-4 border-amber-300/65"
                  />
                </div>
                <h2 className="mb-6 text-4xl font-black tracking-tighter text-white uppercase italic">Rounding Rocket</h2>
                <button
                  onClick={startGame}
                  className="group flex items-center gap-3 rounded-full bg-[linear-gradient(180deg,#fcd34d,#f59e0b)] px-12 py-5 text-sm font-black tracking-[0.2em] text-slate-900 uppercase shadow-2xl shadow-amber-500/35 transition-all hover:brightness-105"
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
                    className="flex items-center justify-center gap-3 rounded-full bg-[linear-gradient(180deg,#38bdf8,#2563eb)] px-12 py-5 text-sm font-black tracking-[0.2em] text-white uppercase shadow-2xl shadow-cyan-500/25 transition-all hover:brightness-105"
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
              className={`absolute bottom-3 left-1/2 z-40 flex w-[min(94vw,36rem)] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-center shadow-2xl sm:bottom-6 sm:w-auto sm:gap-3 sm:rounded-2xl sm:px-8 sm:py-4 ${
                feedback.type === 'success'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-[10px] font-black tracking-wide uppercase sm:text-sm">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {(gameState === 'playing' || gameState === 'success') && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <div className={`pvp-hud-chip ${fuel < 30 ? 'text-rose-200' : 'text-emerald-100'}`}>
              Fuel {fuel}%
            </div>
            <GameActionDock onBack={onBack} compact accentClass="text-slate-100" />
          </div>
        </div>
      )}

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
