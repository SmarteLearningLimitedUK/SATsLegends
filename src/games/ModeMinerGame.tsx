import React, { useCallback, useRef, useState } from 'react';
import {
  Pickaxe,
  Gem,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  Play,
  BarChart3,
  Database,
  Search,
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
} from 'recharts';

interface FrequencyPoint {
  value: string;
  count: number;
}

interface LevelData {
  allNumbers: number[];
  mode: number;
  frequencies: FrequencyPoint[];
}

interface ModeMinerGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 2600) return 3;
  if (score >= 2000) return 2;
  return 1;
};

const ModeMinerGame: React.FC<ModeMinerGameProps> = ({
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
    const uniqueCount = Math.min(3 + Math.floor((lvl - 1) / 3), 8);
    const totalItems = 10 + (lvl * 4);

    const uniqueValues: number[] = [];
    while (uniqueValues.length < uniqueCount) {
      const val = Math.floor(Math.random() * 50) + 1;
      if (!uniqueValues.includes(val)) uniqueValues.push(val);
    }

    const counts = uniqueValues.map(() => 1);
    let remaining = totalItems - uniqueCount;

    const modeIndex = Math.floor(Math.random() * uniqueCount);
    const modeBonus = Math.floor(remaining * 0.4) + 2;
    counts[modeIndex] += modeBonus;
    remaining -= modeBonus;

    while (remaining > 0) {
      const idx = Math.floor(Math.random() * uniqueCount);
      if (counts[idx] < counts[modeIndex] - 1) {
        counts[idx] += 1;
        remaining -= 1;
      } else {
        const canAddElsewhere = counts.some((count, i) => i !== modeIndex && count < counts[modeIndex] - 1);
        if (!canAddElsewhere) {
          counts[modeIndex] += remaining;
          remaining = 0;
        }
      }
    }

    const allNumbers: number[] = [];
    uniqueValues.forEach((val, i) => {
      for (let j = 0; j < counts[i]; j += 1) {
        allNumbers.push(val);
      }
    });

    const shuffled = [...allNumbers].sort(() => Math.random() - 0.5);

    const frequencies: FrequencyPoint[] = uniqueValues
      .map((val, i) => ({
        value: val.toString(),
        count: counts[i],
      }))
      .sort((a, b) => parseInt(a.value, 10) - parseInt(b.value, 10));

    setCurrentLevelData({
      allNumbers: shuffled,
      mode: uniqueValues[modeIndex],
      frequencies,
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

    const numAnswer = parseInt(userAnswer, 10);
    if (numAnswer === currentLevelData.mode) {
      setScore(prev => prev + 150 + (level * 30));
      setFeedback({ type: 'success', message: 'Gem Found! That is the Mode.' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: 'Not the most frequent. Dig deeper!' });
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-stone-50 font-sans text-stone-900 select-none">
      <header className="z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-stone-100 text-stone-700 transition hover:bg-stone-200"
            aria-label="Back to levels"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="rounded-lg bg-emerald-600 p-2 shadow-lg shadow-emerald-200">
            <Pickaxe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-stone-800">Mode Miner</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Frequency Analysis Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Gems Collected</span>
            <span className="text-sm font-black tabular-nums text-emerald-600">{score} XP</span>
          </div>
          <div className="h-8 w-[1px] bg-stone-200" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Mine Depth</span>
            <span className="text-sm font-black text-stone-800">Level {level} / {MAX_LEVEL}</span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentLevelData && (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex w-full max-w-5xl flex-col gap-6"
            >
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex max-h-[500px] flex-col gap-4 rounded-3xl border border-stone-100 bg-white p-6 shadow-xl shadow-stone-200/50">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2">
                      <Database className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight">Raw Data Set</h2>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Total Items: {currentLevelData.allNumbers.length}</p>
                    </div>
                  </div>

                  <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
                    <div className="flex flex-wrap gap-2">
                      {currentLevelData.allNumbers.map((n, i) => (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.01 }}
                          key={`${n}-${i}`}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xs font-black transition-all ${
                            gameState === 'success' && n === currentLevelData.mode
                              ? 'scale-110 border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                              : 'border-stone-100 bg-stone-50 text-stone-600'
                          }`}
                        >
                          {n}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-xl shadow-stone-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-100 p-2">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold tracking-tight">Frequency Distribution</h2>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Identify the value with the highest count</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-[280px] w-full rounded-2xl border border-stone-100 bg-stone-50 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentLevelData.frequencies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                        <XAxis
                          dataKey="value"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 800, fill: '#78716c' }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 800, fill: '#78716c' }}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1000}>
                          {currentLevelData.frequencies.map((entry, index) => (
                            <Cell
                              key={`${entry.value}-${index}`}
                              fill={parseInt(entry.value, 10) === currentLevelData.mode && gameState === 'success' ? '#10b981' : '#d6d3d1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <form onSubmit={handleSubmit} className="flex gap-4">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="number"
                        disabled={gameState === 'success'}
                        value={userAnswer}
                        onChange={(event) => setUserAnswer(event.target.value)}
                        placeholder="What is the Mode?"
                        className="w-full rounded-2xl border-2 border-stone-200 bg-stone-100 px-6 py-4 text-xl font-black text-stone-800 transition-all placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300">
                        <Search className="h-6 w-6" />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {gameState === 'success' ? (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={nextLevel}
                          type="button"
                          className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700"
                        >
                          Next Mine <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      ) : (
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-2xl bg-stone-800 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-stone-900"
                        >
                          Extract Mode
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-stone-50/90 p-12 text-center backdrop-blur-sm"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="-rotate-6 mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 shadow-2xl shadow-emerald-200">
                  <Gem className="h-10 w-10 text-white" />
                </div>
                <h2 className="mb-4 text-4xl font-black uppercase tracking-tight text-stone-800">Mode Miner</h2>
                <p className="mb-8 font-medium leading-relaxed text-stone-500">
                  The data cave is full of repeating numbers. Find the mode: the value that appears most frequently in each set.
                </p>
                <button
                  onClick={startGame}
                  className="group flex items-center gap-3 rounded-full bg-emerald-600 px-12 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-200 transition-all hover:bg-emerald-700"
                >
                  <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" /> Start Mining
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-stone-50/95 p-12 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8">
                  <Trophy className="h-24 w-24 text-amber-500 drop-shadow-lg" />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 -m-4 rounded-full border-4 border-dashed border-amber-200"
                  />
                </div>
                <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-stone-800">Master Miner</h2>
                <p className="mb-8 font-medium text-stone-500">
                  You have analyzed all frequency distributions and extracted every mode.
                </p>
                <div className="mb-8 w-full rounded-3xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/50">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-stone-400">Total Gems Value</span>
                  <span className="text-5xl font-black text-emerald-600">{score} XP</span>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center gap-3 rounded-full bg-stone-800 px-12 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-stone-200 transition-all hover:bg-stone-900"
                >
                  <RotateCcw className="h-4 w-4" /> New Expedition
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

      <footer className="z-20 flex h-10 items-center justify-between border-t border-stone-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Scanner: Active</span>
          </div>
          <div className="h-3 w-[1px] bg-stone-200" />
          <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Frequency Depth: {level}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">© 2026 Mode Miner Expedition</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e7e5e4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d6d3d1;
        }
      `}</style>
    </div>
  );
};

export default ModeMinerGame;
