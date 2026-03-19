import React, { useCallback, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  Play,
  TrendingUp,
  Scale,
  Calculator,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  id: string;
  value: number;
}

interface LevelData {
  numbers: number[];
  mean: number;
  data: DataPoint[];
}

interface MeanMachineGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 1800) return 3;
  if (score >= 1300) return 2;
  return 1;
};

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'success' | 'complete'>('start');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    const data: DataPoint[] = numbers.map((n, i) => ({
      id: `Item ${i + 1}`,
      value: n,
    }));

    setCurrentLevelData({
      numbers,
      mean: targetMean,
      data,
    });
    setUserAnswer('');
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLevelData || gameState !== 'playing') return;

    const numAnswer = parseFloat(userAnswer);
    if (numAnswer === currentLevelData.mean) {
      setScore(prev => prev + 100 + (level * 20));
      setFeedback({ type: 'success', message: 'Perfectly Balanced!' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: 'The scale is off. Try again!' });
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
    onVictory(scoreToStars(score), score);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 select-none">
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
            <span className="text-sm font-black tabular-nums text-blue-600">{score} XP</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data Set</span>
            <span className="text-sm font-black text-slate-800">{level} / {MAX_LEVEL}</span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center p-8">
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
                      <p className="text-xs font-medium text-slate-400">Find the average value of the data set below.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {currentLevelData.numbers.map((n, i) => (
                      <div key={i} className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative h-[320px] w-full rounded-2xl border border-slate-100 bg-slate-50 p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentLevelData.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1000}>
                        {currentLevelData.data.map((entry, index) => (
                          <Cell key={entry.id} fill={COLORS[index % COLORS.length]} fillOpacity={gameState === 'success' ? 0.3 : 1} />
                        ))}
                      </Bar>
                      {gameState === 'success' && (
                        <ReferenceLine
                          y={currentLevelData.mean}
                          stroke="#2563eb"
                          strokeWidth={4}
                          strokeDasharray="8 8"
                          label={{ position: 'top', value: `Mean: ${currentLevelData.mean}`, fill: '#2563eb', fontSize: 12, fontWeight: 900 }}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-4">
                  <form onSubmit={handleSubmit} className="flex gap-4">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="number"
                        disabled={gameState === 'success'}
                        value={userAnswer}
                        onChange={(event) => setUserAnswer(event.target.value)}
                        placeholder="Enter the mean..."
                        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-100 px-6 py-4 text-xl font-black text-slate-800 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                        <Calculator className="h-6 w-6" />
                      </div>
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
                          className="flex items-center gap-2 rounded-2xl bg-slate-800 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-slate-900"
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
          {gameState === 'start' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-50/90 p-12 text-center backdrop-blur-sm"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="mb-8 flex h-20 w-20 rotate-12 items-center justify-center rounded-3xl bg-blue-600 shadow-2xl shadow-blue-200">
                  <Activity className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-4 text-4xl font-black uppercase tracking-tight text-slate-800">Mean Machine</h2>
                <p className="mb-8 font-medium leading-relaxed text-slate-500">
                  The data sets are out of balance. Calculate the mean (average) for each set to stabilize the system.
                  Master all 10 levels to become a Data Architect.
                </p>
                <button
                  onClick={startGame}
                  className="group flex items-center gap-3 rounded-full bg-blue-600 px-12 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" /> Initialize Protocol
                </button>
              </div>
            </motion.div>
          )}

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
                  <span className="text-5xl font-black text-blue-600">{score} XP</span>
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
