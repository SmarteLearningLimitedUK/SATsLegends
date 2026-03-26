import React, { useCallback, useEffect, useState } from 'react';
import {
  FlaskConical,
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Trophy,
  AlertCircle,
  Beaker,
  Microscope,
  ClipboardList,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  time: number;
  value: number;
}

interface Antidote {
  id: number;
  data: DataPoint[];
  color: string;
}

interface LineGraphLabGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 1400) return 3;
  if (score >= 950) return 2;
  return 1;
};

const LineGraphLabGame: React.FC<LineGraphLabGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [recipe, setRecipe] = useState<DataPoint[]>([]);
  const [antidotes, setAntidotes] = useState<Antidote[]>([]);
  const [correctId, setCorrectId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const generateLevel = useCallback((targetLevel: number) => {
    const numPoints = Math.min(3 + Math.floor(targetLevel / 2), 8);

    const correctData: DataPoint[] = [];
    let lastValue = 50;
    for (let i = 0; i < numPoints; i += 1) {
      const change = (Math.random() - 0.5) * 40;
      lastValue = Math.max(10, Math.min(90, lastValue + change));
      correctData.push({ time: i * 10, value: Math.round(lastValue) });
    }
    setRecipe(correctData);

    const correctIdx = Math.floor(Math.random() * 3);
    const newAntidotes = Array.from({ length: 3 }, (_, i) => {
      if (i === correctIdx) {
        return {
          id: i,
          data: correctData,
          color: COLORS[i % COLORS.length],
        };
      }

      let decoyData: DataPoint[];
      const diffThreshold = Math.max(5, 20 - targetLevel);
      do {
        decoyData = correctData.map(p => ({
          ...p,
          value: Math.max(
            10,
            Math.min(
              90,
              p.value + (Math.random() > 0.5 ? 1 : -1) * (Math.random() * diffThreshold + 5),
            ),
          ),
        }));
      } while (JSON.stringify(decoyData) === JSON.stringify(correctData));

      return {
        id: i,
        data: decoyData,
        color: COLORS[i % COLORS.length],
      };
    });

    setAntidotes(newAntidotes);
    setCorrectId(correctIdx);
    setFeedback(null);
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

  const handleAntidoteClick = (id: number) => {
    if (gameState !== 'playing') return;

    if (id === correctId) {
      setFeedback({ type: 'success', message: 'ANTIDOTE VERIFIED! Patient stabilizing.' });
      setGameState('success');
      setScore(prev => prev + 100 + (level * 10));
      return;
    }

    setFeedback({ type: 'error', message: 'CONTAMINATION DETECTED! Data mismatch.' });
    setScore(prev => Math.max(0, prev - 25));
  };

  const nextLevel = () => {
    if (level < MAX_LEVEL) {
      const upcoming = level + 1;
      setLevel(upcoming);
      setGameState('playing');
      generateLevel(upcoming);
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(score), score);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#020617] font-mono text-slate-200 select-none">
      {!useSharedTopHud && (
        <header className="z-20 flex h-16 items-center justify-between border-b border-emerald-900/30 bg-slate-900/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200 transition hover:bg-slate-700/80"
              aria-label="Back to levels"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="rounded-lg bg-emerald-500 p-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <FlaskConical className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Line Graph Lab</h1>
              <p className="text-[10px] italic uppercase tracking-tighter text-emerald-500">Antidote Synthesis Protocol</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500">Lab Credibility</span>
              <span className="text-xs font-bold text-emerald-400">{score} XP</span>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500">Antidote Batch</span>
              <span className="text-xs font-bold text-white">{level} / {MAX_LEVEL}</span>
            </div>
          </div>
        </header>
      )}

      <main className={`flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.25rem)]' : ''}`}>
        <section className="z-10 flex min-h-0 w-full flex-[0.44] flex-col gap-3 border-b border-emerald-900/20 bg-slate-900/20 p-3 sm:p-4 md:w-1/3 md:flex-1 md:gap-6 md:border-b-0 md:border-r md:p-8">
          <div className="mb-2 flex items-center gap-2 text-emerald-500">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest">Antidote Recipe</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 p-3 shadow-inner sm:p-4 md:p-6">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-[10px] font-black uppercase text-slate-500">Time (ms)</th>
                  <th className="pb-3 text-[10px] font-black uppercase text-slate-500">Potency (%)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recipe.map((point, i) => (
                  <tr key={i} className="border-b border-slate-900/50 transition-colors hover:bg-emerald-500/5">
                    <td className="py-3 font-bold text-slate-400">{point.time}</td>
                    <td className="py-3 font-black text-emerald-400">{point.value}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 text-emerald-500" />
              <p className="text-[10px] italic leading-relaxed text-slate-400">
                Match the potency readings above to the correct synthesis graph.
                Look for specific peaks and valleys in the data points.
              </p>
            </div>
          </div>
        </section>

        <section className="z-10 flex min-h-0 w-full flex-[0.56] flex-col gap-3 bg-slate-950/20 p-3 sm:p-4 md:w-2/3 md:flex-1 md:gap-6 md:p-8">
          <div className="mb-2 flex items-center gap-2 text-emerald-500">
            <Activity className="h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest">Synthesis Options</h2>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-3 gap-2 md:gap-4">
            {antidotes.map((antidote) => (
              <motion.button
                key={antidote.id}
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleAntidoteClick(antidote.id)}
                className={`group relative flex items-center rounded-2xl border-2 p-4 transition-all duration-300 ${
                  gameState === 'success' && antidote.id === correctId
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                    : 'border-slate-800 bg-slate-900/50 hover:border-emerald-500/50'
                }`}
              >
                <div className="mr-6 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 transition-colors group-hover:border-emerald-500/50">
                  <Beaker className="h-6 w-6 text-emerald-500" />
                </div>

                <div className="h-16 flex-1 md:h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={antidote.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis hide dataKey="time" />
                      <YAxis hide domain={[0, 100]} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={antidote.color}
                        strokeWidth={3}
                        dot={{ r: 4, fill: antidote.color }}
                        animationDuration={500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="ml-6 text-right">
                  <span className="mb-1 block text-[10px] uppercase text-slate-500">Batch ID</span>
                  <span className="text-xs font-black text-white">#{antidote.id + 1024}</span>
                </div>

                {gameState === 'success' && antidote.id === correctId && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              {gameState === 'success' ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={nextLevel}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-slate-900 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  Next Antidote Batch <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Select the synthesis graph that matches the recipe data
                  </span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {gameState === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-12 text-center backdrop-blur-xl"
          >
            <div className="max-w-md">
              <Trophy className="mx-auto mb-8 h-20 w-20 text-yellow-400" />
              <h2 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white italic">Legendary Scientist</h2>
              <p className="mb-8 text-sm leading-relaxed text-slate-400">
                The outbreak has been contained. Your precision in data analysis has saved thousands of lives.
              </p>
              <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="mb-1 block text-[10px] uppercase text-slate-500">Final Lab Credibility</span>
                <span className="text-4xl font-black text-emerald-500">{score} XP</span>
              </div>
              <button
                onClick={startGame}
                className="rounded-full bg-stone-100 px-12 py-4 text-sm font-black uppercase tracking-widest text-stone-900 transition-all hover:bg-white"
              >
                New Research
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
            className={`absolute bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border px-6 py-3 shadow-2xl ${
              feedback.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/50 bg-rose-500/10 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-xs font-bold uppercase tracking-wide">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="z-20 flex h-8 items-center justify-between border-t border-slate-800 bg-slate-950 px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[8px] font-bold uppercase text-slate-500">Lab Environment Stable</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">Protocol: Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-bold uppercase text-slate-500">NODE-LAB-07</span>
          <div className="h-3 w-[1px] bg-slate-800" />
          <span className="text-[8px] font-bold uppercase text-slate-500">Build 03.19.26</span>
        </div>
      </footer>
    </div>
  );
};

export default LineGraphLabGame;
