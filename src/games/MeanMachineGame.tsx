import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  TrendingUp,
  Scale,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface DataPoint {
  id: string;
  value: number;
}

interface LevelData {
  numbers: number[];
  mean: number;
  total: number;
  options: number[];
}

interface MeanMachineGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const MAX_LEVEL = 10;

const scoreToStars = (XP: number) => {
  if (XP >= 1800) return 3;
  if (XP >= 1300) return 2;
  return 1;
};

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [XP, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  const generateLevel = useCallback((lvl: number) => {
    const numCount = Math.min(3 + Math.floor((lvl - 1) / 2), 7);
    const targetMean = Math.floor(Math.random() * 20) + 10 + (lvl * 2);

    const totalSum = targetMean * numCount;
    let numbers: number[] = [];
    let currentSum = 0;

    for (let i = 0; i < numCount - 1; i += 1) {
      const maxVal = Math.min(targetMean * 2, totalSum - currentSum - (numCount - i - 1));
      const minVal = 1;
      const num = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
      numbers.push(num);
      currentSum += num;
    }
    numbers.push(totalSum - currentSum);
    numbers = numbers.sort(() => Math.random() - 0.5);

    const optionPool = new Set<number>([targetMean]);
    while (optionPool.size < 4) {
      const candidate = targetMean + Math.floor(Math.random() * 11) - 5;
      if (candidate > 0) optionPool.add(candidate);
    }
    const options = Array.from(optionPool).sort(() => Math.random() - 0.5);

    setCurrentLevelData({
      numbers,
      mean: targetMean,
      total: totalSum,
      options,
    });
    setSelectedAnswer(null);
    setFeedback(null);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const startGame = () => {
    const openingLevel = 1;
    setScore(0);
    setLevel(openingLevel);
    setGameState('playing');
    generateLevel(openingLevel);
  };

  useEffect(() => {
    generateLevel(1);
  }, [generateLevel]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLevelData || gameState !== 'playing') return;

    if (selectedAnswer === null) {
      setFeedback({ type: 'error', message: 'Pick one answer first.' });
      setTimeout(() => setFeedback(null), 1400);
      return;
    }

    if (selectedAnswer === currentLevelData.mean) {
      setScore(prev => prev + 100 + (level * 20));
      setFeedback({ type: 'success', message: 'Perfectly Balanced!' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: 'Not quite. Mean = total ÷ how many numbers.' });
    setTimeout(() => setFeedback(null), 1500);
  };

  const nextLevel = () => {
    if (level < MAX_LEVEL) {
      const nextLvl = level + 1;
      setLevel(nextLvl);
      setGameState('playing');
      generateLevel(nextLvl);
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 select-none">
      {!useSharedTopHud && (
        <header className="z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="Back to levels"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="rounded-lg bg-blue-600 p-2 shadow-lg shadow-blue-200">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight text-slate-800">Mean Machine</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Central Tendency Protocol</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Efficiency</span>
              <span className="text-sm font-black tabular-nums text-blue-600">{XP} XP</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data Set</span>
              <span className="text-sm font-black text-slate-800">{level} / {MAX_LEVEL}</span>
            </div>
          </div>
        </header>
      )}

      <main className={`relative flex flex-1 flex-col items-center justify-center p-8 ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.25rem)]' : ''}`}>
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentLevelData && (
            <motion.div
              key={level}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex w-full max-w-4xl flex-col gap-8"
            >
              <div className="flex flex-col gap-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">Calculate the Mean</h2>
                      <p className="text-xs font-medium text-slate-400">Step 1: Add all numbers. Step 2: Divide by how many numbers.</p>
                    </div>
                  </div>
                </div>

                <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <p className="mb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Data Set</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {currentLevelData.numbers.map((n, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xl font-black text-slate-700 shadow-sm"
                      >
                        {n}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">How many numbers?</p>
                      <p className="text-lg font-black text-blue-700">{currentLevelData.numbers.length}</p>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Add all numbers</p>
                      <p className="text-lg font-black text-amber-700">{currentLevelData.total}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      {currentLevelData.options.map((option, idx) => (
                        <button
                          key={`${option}-${idx}`}
                          type="button"
                          ref={idx === 0 ? inputRef : undefined}
                          onClick={() => setSelectedAnswer(option)}
                          disabled={gameState === 'success'}
                          className={`rounded-xl border-2 px-4 py-3 text-xl font-black transition-all ${
                            selectedAnswer === option
                              ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {gameState === 'success' ? (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={nextLevel}
                          type="button"
                          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
                        >
                          Next Level <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      ) : (
                        <button
                          type="submit"
                          className="mx-auto flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-md transition-all hover:bg-slate-900"
                        >
                          Verify Mean
                        </button>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/95 p-12 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8">
                  <Trophy className="h-24 w-24 text-yellow-500 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 -m-4 rounded-full border-4 border-dashed border-yellow-200"
                  />
                </div>
                <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-slate-800">System Stabilized</h2>
                <p className="mb-8 font-medium text-slate-500">
                  Incredible work. You have successfully calculated the mean for all complex data sets.
                </p>
                <div className="mb-8 w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Final Credibility</span>
                  <span className="text-5xl font-black text-blue-600">{XP} XP</span>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center gap-3 rounded-full bg-slate-800 px-12 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-900"
                >
                  <RotateCcw className="h-4 w-4" /> Restart Protocol
                </button>
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
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-rose-200 bg-rose-50 text-rose-600'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-black uppercase tracking-wide">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="z-20 flex h-10 items-center justify-between border-t border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Core Logic: Online</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-200" />
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Difficulty: Level {level}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">© 2026 Mean Machine Labs</span>
        </div>
      </footer>
    </div>
  );
};

export default MeanMachineGame;
