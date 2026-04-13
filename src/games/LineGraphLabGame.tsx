import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import {
  CartesianGrid,
  Line,
  LineChart,
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
  const [probeIndex, setProbeIndex] = useState<number | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  const loadLevel = useCallback((targetLevel: number) => {
    setRound(generateRound(targetLevel));
    setSelectedAnswer(null);
    setFeedback(null);
    setGameState('playing');
    setProbeIndex(null);
  }, []);

  useEffect(() => {
    loadLevel(1);
  }, [loadLevel]);

  useLayoutEffect(() => {
    if (!chartWrapRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextWidth = Math.floor(entry.contentRect.width);
      const nextHeight = Math.floor(entry.contentRect.height);
      if (nextWidth > 0 && nextHeight > 0) {
        setChartSize({ width: nextWidth, height: nextHeight });
      }
    });
    observer.observe(chartWrapRef.current);
    return () => observer.disconnect();
  }, []);

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

  const updateProbe = useCallback((clientX: number) => {
    if (!round || !chartWrapRef.current) return;
    const rect = chartWrapRef.current.getBoundingClientRect();
    const clamped = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = rect.width <= 0 ? 0 : clamped / rect.width;
    const index = Math.round(ratio * (round.graph.length - 1));
    setProbeIndex(clamp(index, 0, round.graph.length - 1));
  }, [round]);

  const handleProbePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    updateProbe(event.clientX);
  };

  const handleProbePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    updateProbe(event.clientX);
  };

  const probePoint = useMemo(() => (
    round && probeIndex !== null ? round.graph[probeIndex] : null
  ), [probeIndex, round]);

  return (
    <GameScreenLayout
      className="relative h-full w-full min-h-0 select-none text-slate-100"
      top={(
        <div className={`flex flex-col gap-2 ${useSharedTopHud ? 'pt-[calc(env(safe-area-inset-top)+0.15rem)]' : ''}`}>
          {!useSharedTopHud ? (
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
          ) : null}
          <div className="px-2 sm:px-3 md:px-4">
            <div className="game-question-card">
              <div className="question-title text-center text-[clamp(1.1rem,4vw,1.5rem)]">{round?.question}</div>
              <div className="question-subtitle text-center">{round?.helper}</div>
            </div>
          </div>
        </div>
      )}
      main={(
        <section className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 sm:gap-3 sm:px-3 sm:pb-3 md:px-4 md:pb-4">
          <div className="mt-0.5 min-h-0 flex-1 rounded-[1.75rem] border border-cyan-100/16 bg-[linear-gradient(180deg,rgba(8,24,61,0.85),rgba(4,12,30,0.92))] p-2.5 shadow-[0_16px_40px_rgba(3,12,30,0.26)] sm:p-4 md:p-5">

            <div
              ref={chartWrapRef}
              onPointerDown={handleProbePointerDown}
              onPointerMove={handleProbePointerMove}
              className="relative w-full rounded-2xl border border-slate-700/60 bg-slate-950/35 p-2"
              style={{ height: 'clamp(12rem, 32vh, 18.5rem)' }}
            >
              {round && chartSize.width > 0 && chartSize.height > 0 && (
                <LineChart
                  width={chartSize.width}
                  height={chartSize.height}
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
                    dot={(props) => {
                      const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload?: DataPoint; index?: number };
                      if (cx == null || cy == null || !payload) return null;
                      const isProbe = index === probeIndex;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isProbe ? 8 : 5}
                          fill={isProbe ? '#facc15' : '#34d399'}
                          stroke={isProbe ? '#fef3c7' : '#ecfeff'}
                          strokeWidth={isProbe ? 3 : 2}
                        />
                      );
                    }}
                    activeDot={{ r: 7, fill: '#6ee7b7', stroke: '#f0fdfa', strokeWidth: 2 }}
                    animationDuration={350}
                  />
                </LineChart>
              )}
              {probePoint && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/50 bg-amber-200/20 px-3 py-1 text-[11px] font-black text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                >
                  {probePoint.label}: {probePoint.value}
                </motion.div>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
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
                    className={`min-h-[3.1rem] rounded-2xl border px-3 py-2.5 text-center transition-all sm:min-h-[3.4rem] sm:px-4 ${
                      isCorrect
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.18)]'
                        : isWrongSelected
                          ? 'border-rose-400 bg-rose-500/12 text-amber-100'
                          : isSelected
                            ? 'border-cyan-300 bg-cyan-400/10 text-white'
                            : 'border-slate-700 bg-slate-900/55 text-slate-100 hover:border-emerald-400/60 hover:bg-slate-800/70'
                    } ${gameState === 'success' ? 'cursor-default' : ''}`}
                  >
                    <span className="text-[0.92rem] font-black leading-tight sm:text-base">{option}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="min-h-[3.2rem]">
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
                ) : null}
              </AnimatePresence>
            </div>

            {feedback && (
              <div
                className={`flex w-full items-center justify-center gap-3 rounded-full border px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide shadow-2xl sm:text-xs ${
                  feedback.type === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/50 bg-rose-500/10 text-amber-300'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>
        </section>
      )}
      bottom={null}
      overlay={(
        <>
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
        </>
      )}
    />
  );
};

export default LineGraphLabGame;
