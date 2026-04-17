import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
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
  highlightIndex?: number;
}

interface LineGraphLabGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const MAX_LEVEL = 10;
const X_AXIS_LABELS = ['1', '2', '3', '4', '5'];
const QUESTION_TYPES = ['basic_reading', 'reading_point', 'interpretation', 'comparison'] as const;

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
  const base = 10 + (level * 2);
  const values = [base, base + 4, base + 8, base + 12, base + 9];

  return values.map((value, index) => ({
    label: X_AXIS_LABELS[index],
    value: clamp(Math.round(value / 2) * 2, 8, 40),
  }));
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
  const targetIndex = 3;
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
    question: 'The graph shows brainpower levels over time. What is the brainpower at time = 4?',
    options,
    correctAnswer: `${target.value}`,
    helper: 'Read the point at time 4 and match it to the y-axis.',
  };
};

const buildReadingPointQuestion = (graph: DataPoint[]): RoundData => {
  const targetIndex = 2;
  const target = graph[targetIndex];
  const coordinate = `(${target.label}, ${target.value})`;
  const wrongs = shuffle([
    `(${graph[1].label}, ${target.value})`,
    `(${target.label}, ${clamp(target.value + 4, 8, 40)})`,
    `(${graph[3].label}, ${target.value})`,
    `(${target.label}, ${clamp(target.value - 4, 8, 40)})`,
  ]).filter((value) => value !== coordinate);

  return {
    graph,
    question: 'What are the coordinates of the marked point A?',
    options: shuffle([coordinate, ...wrongs.slice(0, 3)]),
    correctAnswer: coordinate,
    helper: 'Answer in the form (x, y).',
    highlightIndex: targetIndex,
  };
};

const buildInterpretationQuestion = (graph: DataPoint[]): RoundData => {
  const targetIndex = 1;
  const targetTime = graph[targetIndex].label;
  const adjustedGraph = graph.map((point, index) => (
    index === targetIndex
      ? { ...point, value: 20 }
      : point.value === 20
        ? { ...point, value: point.value + 2 }
        : point
  ));
  const wrongs = shuffle([
    `${adjustedGraph[0].label}`,
    `${adjustedGraph[2].label}`,
    `${adjustedGraph[4].label}`,
    `${adjustedGraph[3].label}`,
  ]).filter((value) => value !== targetTime);

  return {
    graph: adjustedGraph,
    question: 'At what time does the brainpower reach 20 units?',
    options: shuffle([targetTime, ...wrongs.slice(0, 3)]),
    correctAnswer: targetTime,
    helper: 'Find the point where the line crosses 20 units.',
  };
};

const buildComparisonQuestion = (graph: DataPoint[]): RoundData | null => {
  const increases = graph
    .slice(0, -1)
    .map((point, index) => ({
      fromIndex: index,
      toIndex: index + 1,
      increase: graph[index + 1].value - point.value,
    }))
    .filter((entry) => entry.increase > 0);

  if (!increases.length) return null;

  const best = increases.reduce((currentBest, entry) => (entry.increase > currentBest.increase ? entry : currentBest), increases[0]);
  const correct = `${best.fromIndex + 1} to ${best.toIndex + 1}`;
  const wrongs = shuffle(
    graph.slice(0, -1).map((_, index) => `${index + 1} to ${index + 2}`)
  ).filter((value) => value !== correct);

  return {
    graph,
    question: 'Between which two time points does brainpower increase the most?',
    options: shuffle([correct, ...wrongs.slice(0, 3)]),
    correctAnswer: correct,
    helper: 'Look for the biggest upward jump between neighbouring points.',
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
      level <= 2
        ? ['basic_reading'] as const
        : level === 3
          ? ['reading_point'] as const
          : level === 4
            ? ['interpretation'] as const
            : level <= 6
              ? ['basic_reading', 'reading_point', 'interpretation'] as const
          : QUESTION_TYPES;
    const type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

    if (type === 'basic_reading') built = buildValueQuestion(graph);
    if (type === 'reading_point') built = buildReadingPointQuestion(graph);
    if (type === 'interpretation') built = buildInterpretationQuestion(graph);
    if (type === 'comparison') built = buildComparisonQuestion(graph);
  }

  return built ?? buildValueQuestion(graph);
};

const LineGraphLabGame: React.FC<LineGraphLabGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  isPractice,
  practiceBriefing,
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
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

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

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

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
      setFeedback({ type: 'success', message: 'Data recovered!' });
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
    <>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Line Graph Lab"
        body="Read the line graph carefully.\nFind coordinates, values and changes over time to recover the data."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <GameScreenLayout
        className="relative h-full w-full min-h-0 select-none gap-0 text-slate-100"
        top={(
          <div className="flex justify-center px-2 pt-0 sm:px-3 md:px-4">
            <GameQuestionCard title="Line Graph Lab" subtitle={round?.helper || ''}>
              {round?.question ?? ''}
            </GameQuestionCard>
          </div>
        )}
        main={(
          <section className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 sm:gap-3 sm:px-3 sm:pb-3 md:px-4 md:pb-4">
            <div className="mt-0.5 min-h-0 flex-1 rounded-[1.75rem] border border-cyan-100/16 bg-transparent p-2.5 shadow-none sm:p-4 md:p-5">
              <div
                ref={chartWrapRef}
                onPointerDown={handleProbePointerDown}
                onPointerMove={handleProbePointerMove}
                className="relative w-full rounded-2xl border border-slate-700/60 bg-transparent p-2"
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
                      className={`min-h-[3.1rem] rounded-2xl px-3 py-2.5 text-center sm:min-h-[3.4rem] sm:px-4 ${
                        isCorrect
                          ? 'ui-button-success'
                          : isWrongSelected
                            ? 'ui-button-primary'
                            : isSelected
                              ? 'ui-button-primary'
                              : 'ui-button-secondary'
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
                      className="ui-button-success flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black uppercase tracking-widest"
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
                      className="ui-button-primary rounded-full px-12 py-4 text-sm font-black uppercase tracking-widest"
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
    </>
  );
};

export default LineGraphLabGame;

