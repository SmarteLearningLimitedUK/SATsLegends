import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Info,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number;
}

interface RoundData {
  graph: DataPoint[];
  question: string;
  options: string[];
  correctAnswer: string;
  helper: string;
}

interface LineGraphLabGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const MAX_LEVEL = 10;
const X_AXIS_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const QUESTION_TYPES = ['value_at_point', 'highest_day', 'lowest_day', 'difference'] as const;

const scoreToStars = (XP: number) => {
  if (XP >= 1400) return 3;
  if (XP >= 950) return 2;
  return 1;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const generateGraph = (level: number): DataPoint[] => {
  const points: DataPoint[] = [];
  let current = 20 + Math.floor(Math.random() * 18);

  for (let i = 0; i < X_AXIS_LABELS.length; i += 1) {
    const stepSize = level <= 3 ? 8 : level <= 6 ? 12 : 16;
    current = clamp(current + Math.floor((Math.random() - 0.5) * stepSize), 8, 92);
    points.push({
      label: X_AXIS_LABELS[i],
      value: Math.round(current / 2) * 2,
    });
  }

  return points.map((point, index, arr) => {
    let adjusted = point.value;
    if (index > 0 && adjusted === arr[index - 1].value) {
      adjusted = clamp(adjusted + 4, 8, 96);
    }
    return { ...point, value: adjusted };
  });
};

const uniqueHighestIndex = (graph: DataPoint[]) => {
  const values = graph.map(point => point.value);
  const max = Math.max(...values);
  return values.indexOf(max) === values.lastIndexOf(max) ? values.indexOf(max) : -1;
};

const uniqueLowestIndex = (graph: DataPoint[]) => {
  const values = graph.map(point => point.value);
  const min = Math.min(...values);
  return values.indexOf(min) === values.lastIndexOf(min) ? values.indexOf(min) : -1;
};

const buildValueQuestion = (graph: DataPoint[]): RoundData => {
  const targetIndex = Math.floor(Math.random() * graph.length);
  const target = graph[targetIndex];
  const wrongs = shuffle([
    `${clamp(target.value - 10, 0, 100)}`,
    `${clamp(target.value + 10, 0, 100)}`,
    `${clamp(target.value + 20, 0, 100)}`,
    `${clamp(target.value - 20, 0, 100)}`,
  ]).filter(value => Number(value) !== target.value);

  const options = shuffle([`${target.value}`, ...wrongs.slice(0, 3)]);
  return {
    graph,
    question: `What is the value on ${target.label}?`,
    options,
    correctAnswer: `${target.value}`,
    helper: 'Read the plotted point and match it to the y-axis.',
  };
};

const buildHighestDayQuestion = (graph: DataPoint[]): RoundData | null => {
  const highestIndex = uniqueHighestIndex(graph);
  if (highestIndex === -1) return null;

  return {
    graph,
    question: 'Which day has the highest value?',
    options: shuffle(graph.map(point => point.label)).slice(0, 4).includes(graph[highestIndex].label)
      ? shuffle(graph.map(point => point.label).slice(0, 4))
      : shuffle([graph[highestIndex].label, ...shuffle(graph.filter((_, i) => i !== highestIndex).map(point => point.label)).slice(0, 3)]),
    correctAnswer: graph[highestIndex].label,
    helper: 'Look for the highest point on the line.',
  };
};

const buildLowestDayQuestion = (graph: DataPoint[]): RoundData | null => {
  const lowestIndex = uniqueLowestIndex(graph);
  if (lowestIndex === -1) return null;

  return {
    graph,
    question: 'Which day has the lowest value?',
    options: shuffle([graph[lowestIndex].label, ...shuffle(graph.filter((_, i) => i !== lowestIndex).map(point => point.label)).slice(0, 3)]),
    correctAnswer: graph[lowestIndex].label,
    helper: 'Find the point closest to the bottom of the graph.',
  };
};

const buildDifferenceQuestion = (graph: DataPoint[]): RoundData => {
  const startIndex = Math.floor(Math.random() * (graph.length - 1));
  const endIndex = startIndex + 1 + Math.floor(Math.random() * (graph.length - startIndex - 1));
  const difference = Math.abs(graph[endIndex].value - graph[startIndex].value);
  const wrongs = shuffle([
    `${difference + 4}`,
    `${Math.max(0, difference - 4)}`,
    `${difference + 8}`,
    `${Math.max(0, difference - 8)}`,
  ]).filter(value => Number(value) !== difference);

  return {
    graph,
    question: `What is the difference between ${graph[startIndex].label} and ${graph[endIndex].label}?`,
    options: shuffle([`${difference}`, ...wrongs.slice(0, 3)]),
    correctAnswer: `${difference}`,
    helper: 'Compare the two y-axis values, then subtract.',
  };
};

const generateRound = (level: number): RoundData => {
  let graph = generateGraph(level);
  let built: RoundData | null = null;
  let attempts = 0;

  while (!built && attempts < 20) {
    attempts += 1;
    graph = generateGraph(level);
    const allowedTypes =
      level <= 3
        ? ['value_at_point', 'highest_day'] as const
        : level <= 6
          ? ['value_at_point', 'highest_day', 'lowest_day'] as const
          : QUESTION_TYPES;
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

    if (type === 'value_at_point') built = buildValueQuestion(graph);
    if (type === 'highest_day') built = buildHighestDayQuestion(graph);
    if (type === 'lowest_day') built = buildLowestDayQuestion(graph);
    if (type === 'difference') built = buildDifferenceQuestion(graph);
  }

  return built ?? buildValueQuestion(graph);
};

const LineGraphLabGame: React.FC<LineGraphLabGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [XP, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [round, setRound] = useState<RoundData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadLevel = useCallback((targetLevel: number) => {
    setRound(generateRound(targetLevel));
    setSelectedAnswer(null);
    setFeedback(null);
    setGameState('playing');
  }, []);

  useEffect(() => {
    loadLevel(1);
  }, [loadLevel]);

  const startGame = () => {
    setXP(0);
    setLevel(1);
    loadLevel(1);
  };

  const handleAnswer = (answer: string) => {
    if (!round || gameState !== 'playing') return;

    setSelectedAnswer(answer);

    if (answer === round.correctAnswer) {
      setFeedback({ type: 'success', message: 'Correct. The graph matches your reading.' });
      setXP(prev => prev + 100 + level * 10);
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: `Not quite. ${round.helper}` });
  };

  const nextLevel = () => {
    if (level < MAX_LEVEL) {
      const next = level + 1;
      setLevel(next);
      loadLevel(next);
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  };

  const yTicks = useMemo(() => {
    if (!round) return [0, 20, 40, 60, 80, 100];
    const maxValue = Math.max(...round.graph.map(point => point.value));
    const ceiling = Math.ceil((maxValue + 8) / 10) * 10;
    const top = clamp(ceiling, 40, 100);
    return Array.from({ length: 6 }, (_, index) => Math.round((top / 5) * index));
  }, [round]);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden select-none text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,18,44,0.34),rgba(4,18,44,0.48)_55%,rgba(2,8,24,0.62)_100%)]" />

      {!useSharedTopHud && (
        <header className="z-20 flex h-16 items-center justify-between border-b border-emerald-900/30 bg-slate-900/50 px-4 backdrop-blur-md sm:px-6">
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
              <Activity className="h-5 w-5 text-slate-900" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">Line Graph Lab</h1>
              <p className="text-[10px] uppercase tracking-tighter text-emerald-400">Read one graph. Answer one question.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500">XP</span>
              <span className="text-xs font-bold text-emerald-400">{XP}</span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500">Round</span>
              <span className="text-xs font-bold text-white">{level} / {MAX_LEVEL}</span>
            </div>
          </div>
        </header>
      )}

      <main className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+5.25rem)]' : ''}`}>
        <section className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 text-emerald-400">
            <ClipboardList className="h-5 w-5" />
            <h2 className="text-xs font-black uppercase tracking-widest">Question</h2>
          </div>

          <div className="rounded-2xl border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(9,24,58,0.86),rgba(5,14,36,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <p className="text-base font-black leading-snug text-white sm:text-lg">
              {round?.question}
            </p>
            <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-300 sm:text-xs">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p>{round?.helper}</p>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 sm:gap-4 sm:px-4 sm:pb-4 md:px-6 md:pb-6">
          <div className="min-h-0 flex-[1.15] rounded-[1.75rem] border border-cyan-100/16 bg-[linear-gradient(180deg,rgba(8,24,61,0.88),rgba(4,12,30,0.95))] p-3 shadow-[0_16px_40px_rgba(3,12,30,0.28)] sm:p-4 md:p-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Live Graph</h3>
                <p className="text-[11px] text-slate-400">One graph at a time with full axes.</p>
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                Values
              </div>
            </div>

            <div className="h-full min-h-[15rem] w-full rounded-2xl border border-slate-700/60 bg-slate-950/35 p-2 sm:min-h-[17rem] md:min-h-[18rem]">
              {round && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={round.graph}
                    margin={{ top: 18, right: 16, left: 0, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#dbeafe', fontSize: 12, fontWeight: 700 }}
                      axisLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                      tickLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                      label={{ value: 'Day', position: 'insideBottom', offset: -6, fill: '#93c5fd', fontSize: 12 }}
                    />
                    <YAxis
                      ticks={yTicks}
                      domain={[0, yTicks[yTicks.length - 1]]}
                      tick={{ fill: '#dbeafe', fontSize: 12, fontWeight: 700 }}
                      axisLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                      tickLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                      label={{ value: 'Value', angle: -90, position: 'insideLeft', fill: '#93c5fd', fontSize: 12 }}
                      width={42}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#34d399"
                      strokeWidth={4}
                      dot={{ r: 5, strokeWidth: 2, fill: '#34d399', stroke: '#ecfeff' }}
                      activeDot={{ r: 6, fill: '#6ee7b7', stroke: '#f0fdfa', strokeWidth: 2 }}
                      animationDuration={350}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {round?.options.map(option => {
              const isSelected = selectedAnswer === option;
              const isCorrect = gameState === 'success' && option === round.correctAnswer;
              const isWrongSelected = selectedAnswer === option && feedback?.type === 'error';

              return (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(option)}
                  disabled={gameState === 'success'}
                  className={`min-h-[4.5rem] rounded-2xl border px-3 py-4 text-center transition-all sm:min-h-[5rem] sm:px-4 ${
                    isCorrect
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.18)]'
                      : isWrongSelected
                        ? 'border-rose-400 bg-rose-500/12 text-rose-100'
                        : isSelected
                          ? 'border-cyan-300 bg-cyan-400/10 text-white'
                          : 'border-slate-700 bg-slate-900/55 text-slate-100 hover:border-emerald-400/60 hover:bg-slate-800/70'
                  } ${gameState === 'success' ? 'cursor-default' : ''}`}
                >
                  <span className="text-base font-black leading-tight sm:text-lg">{option}</span>
                </motion.button>
              );
            })}
          </div>

          <div className="min-h-[4rem]">
            <AnimatePresence mode="wait">
              {gameState === 'success' ? (
                <motion.button
                  key="next"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={nextLevel}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-sm font-black uppercase tracking-widest text-slate-900 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
                >
                  Next Graph <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <motion.div
                  key="instruction"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-slate-800 bg-slate-950/35 px-4 py-3 text-center"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                    Choose one of the four answers from the graph.
                  </span>
                </motion.div>
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
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-8 text-center backdrop-blur-xl"
          >
            <div className="max-w-md">
              <Trophy className="mx-auto mb-8 h-20 w-20 text-yellow-400" />
              <h2 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white">Graph Mastery</h2>
              <p className="mb-8 text-sm leading-relaxed text-slate-400">
                You read every line graph carefully and answered with precision.
              </p>
              <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="mb-1 block text-[10px] uppercase text-slate-500">Final XP</span>
                <span className="text-4xl font-black text-emerald-500">{XP}</span>
              </div>
              <button
                onClick={startGame}
                className="rounded-full bg-stone-100 px-12 py-4 text-sm font-black uppercase tracking-widest text-stone-900 transition-all hover:bg-white"
              >
                Play Again
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
            className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.85rem)] left-1/2 z-40 flex w-[min(92%,32rem)] -translate-x-1/2 items-center justify-center gap-3 rounded-full border px-5 py-3 text-center shadow-2xl ${
              feedback.type === 'success'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/50 bg-rose-500/10 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="text-[11px] font-bold uppercase tracking-wide sm:text-xs">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LineGraphLabGame;
