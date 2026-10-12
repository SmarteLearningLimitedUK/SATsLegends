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
import { GameUiShell } from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import lineGraphLabBackground from '../assets/maps/premium/line-graph-lab.webp';
import './line-graph-lab.css';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

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
  plotIndex?: number;
}

interface LineGraphLabGameProps extends MiniGameShellContractProps {
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
type QuestionType = 'basic_reading' | 'reading_point' | 'interpretation' | 'comparison' | 'change' | 'interpolation' | 'plot_point';

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

const generateGraph = (level: number, roundIndex: number): DataPoint[] => {
  const patterns = [
    [1, 3, 6, 4, 8],
    [3, 7, 5, 6, 2],
    [2, 5, 4, 9, 7],
    [4, 2, 6, 7, 3],
    [1, 5, 7, 3, 6],
  ];
  const scale = level <= 2 ? 1 : level === 3 ? 2 : level === 4 ? 3 : 4;
  const offset = level === 1 ? roundIndex % 2 : level === 2 ? roundIndex % 3 : level * 2 + (roundIndex % 4);
  return patterns[roundIndex % patterns.length].map((value, index) => ({
    label: X_AXIS_LABELS[index],
    value: offset + value * scale,
  }));
};

const numberOptions = (answer: number, step: number) => shuffle([
  answer,
  Math.max(0, answer - step),
  answer + step,
  answer + step * 2,
].map(String));

const buildValueQuestion = (graph: DataPoint[], targetIndex: number): RoundData => {
  const target = graph[targetIndex];
  return {
    graph,
    question: `What is the brainpower at time ${target.label}?`,
    options: numberOptions(target.value, target.value <= 12 ? 1 : 2),
    correctAnswer: `${target.value}`,
    helper: `Follow time ${target.label} up to the line, then across to the value axis.`,
  };
};

const buildReadingPointQuestion = (graph: DataPoint[], targetIndex: number): RoundData => {
  const target = graph[targetIndex];
  const coordinate = `(${target.label}, ${target.value})`;
  const wrongs = shuffle([
    `(${graph[(targetIndex + 1) % graph.length].label}, ${target.value})`,
    `(${target.label}, ${target.value + 2})`,
    `(${graph[(targetIndex + 2) % graph.length].label}, ${target.value})`,
    `(${target.label}, ${Math.max(0, target.value - 2)})`,
  ]).filter((value, index, values) => value !== coordinate && values.indexOf(value) === index);

  return {
    graph,
    question: `What are the coordinates of the point at time ${target.label}?`,
    options: shuffle([coordinate, ...wrongs.slice(0, 3)]),
    correctAnswer: coordinate,
    helper: 'A point is written (time, value): read across first, then up.',
    highlightIndex: targetIndex,
  };
};

const buildInterpretationQuestion = (graph: DataPoint[], targetIndex: number): RoundData => {
  const targetTime = graph[targetIndex].label;
  const otherTimes = shuffle(graph.map((point) => point.label).filter((label) => label !== targetTime));
  return {
    graph,
    question: `At what time does brainpower reach ${graph[targetIndex].value} units?`,
    options: shuffle([targetTime, ...otherTimes.slice(0, 3)]),
    correctAnswer: targetTime,
    helper: `Find ${graph[targetIndex].value} on the value axis, then read down to the time axis.`,
  };
};

const buildChangeQuestion = (graph: DataPoint[], fromIndex: number): RoundData => {
  const from = graph[fromIndex];
  const to = graph[fromIndex + 1];
  const change = Math.abs(to.value - from.value);
  return {
    graph,
    question: `How much does brainpower ${to.value > from.value ? 'rise' : 'fall'} from time ${from.label} to time ${to.label}?`,
    options: numberOptions(change, change <= 3 ? 1 : 2),
    correctAnswer: String(change),
    helper: 'Subtract the smaller plotted value from the larger.',
  };
};

const buildInterpolationQuestion = (graph: DataPoint[], fromIndex: number): RoundData => {
  const from = graph[fromIndex];
  const to = graph[fromIndex + 1];
  const midpoint = (from.value + to.value) / 2;
  return {
    graph,
    question: `What value lies halfway between times ${from.label} and ${to.label}?`,
    options: numberOptions(midpoint, 1),
    correctAnswer: String(midpoint),
    helper: `Find the value halfway between ${from.value} and ${to.value}; the line joins these points evenly.`,
  };
};

const buildPlotPointQuestion = (graph: DataPoint[], targetIndex: number, level: number): RoundData => {
  const plotted = graph.map((point) => ({ ...point }));
  const missingValue = (plotted[targetIndex - 1].value + plotted[targetIndex + 1].value) / 2;
  plotted[targetIndex].value = missingValue;
  return {
    graph: plotted,
    question: `Plot the missing point at time ${plotted[targetIndex].label}. Its value is halfway between the readings at times ${plotted[targetIndex - 1].label} and ${plotted[targetIndex + 1].label}.`,
    options: numberOptions(missingValue, level <= 3 ? 1 : 2),
    correctAnswer: String(missingValue),
    helper: `Find the halfway value between ${plotted[targetIndex - 1].value} and ${plotted[targetIndex + 1].value}, then place the point above time ${plotted[targetIndex].label}.`,
    plotIndex: targetIndex,
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
    question: 'Where does brainpower increase the most?',
    options: shuffle([correct, ...wrongs.slice(0, 3)]),
    correctAnswer: correct,
    helper: 'Find the steepest upward section of the line.',
  };
};

const generateRound = (level: number, roundIndex: number): RoundData => {
  const graph = generateGraph(level, roundIndex);
  const typesByLevel: QuestionType[][] = [
    ['basic_reading'],
    ['basic_reading', 'reading_point', 'change'],
    ['basic_reading', 'change', 'plot_point', 'interpretation', 'comparison'],
    ['change', 'plot_point', 'comparison', 'interpolation', 'interpretation'],
    ['comparison', 'plot_point', 'interpolation', 'change', 'interpretation', 'reading_point'],
  ];
  const types = typesByLevel[clamp(level, 1, 5) - 1];
  const type = types[roundIndex % types.length];
  const pointIndex = (roundIndex + Math.floor(roundIndex / types.length)) % graph.length;
  const segmentIndex = roundIndex % (graph.length - 1);

  if (type === 'reading_point') return buildReadingPointQuestion(graph, pointIndex);
  if (type === 'interpretation') return buildInterpretationQuestion(graph, pointIndex);
  if (type === 'change') return buildChangeQuestion(graph, segmentIndex);
  if (type === 'plot_point') return buildPlotPointQuestion(graph, 1 + (roundIndex % 3), level);
  if (type === 'interpolation') return buildInterpolationQuestion(graph, segmentIndex);
  if (type === 'comparison') return buildComparisonQuestion(graph) ?? buildValueQuestion(graph, pointIndex);
  return buildValueQuestion(graph, pointIndex);
};

const LineGraphLabGame: React.FC<LineGraphLabGameProps> = ({
  levelId,
  avatarId: _avatarId,
  useSharedTopHud: _useSharedTopHud = false,
  isPractice,
  practiceBriefing,
  sessionEvents,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const difficulty = clamp(levelId, 1, 5);
  const [XP, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [round, setRound] = useState<RoundData | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const loadLevel = useCallback((targetLevel: number) => {
    setRound(generateRound(difficulty, targetLevel - 1));
    setWrongAttempts(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setGameState('playing');
  }, [difficulty]);

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
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { round: level, question: round.question } });
      setFeedback({ type: 'success', message: `Data recovered! ${round.helper}` });
      setXP(prev => prev + Math.max(20, 100 - wrongAttempts * 30) + level * 10);
      setGameState('success');
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { round: level, question: round.question } });
    setWrongAttempts((count) => count + 1);
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
    if (!round) return [0, 1, 2, 3, 4, 5];
    const plotChoices = round.plotIndex === undefined ? [] : round.options.map(Number).filter(Number.isFinite);
    const maxValue = Math.max(...round.graph.map(point => point.value), ...plotChoices);
    const step = difficulty <= 2 ? 1 : difficulty === 5 ? 10 : 5;
    const top = Math.ceil(maxValue / step) * step;
    return Array.from({ length: top / step + 1 }, (_, index) => index * step);
  }, [difficulty, round]);

  const displayedGraph = useMemo(() => round?.graph.map((point, index) => ({
    ...point,
    value: index === round.plotIndex && selectedAnswer === null ? null :
      index === round.plotIndex ? Number(selectedAnswer) : point.value,
  })) ?? [], [round, selectedAnswer]);

  const chooseOption = (option: string) => {
    if (round?.plotIndex === undefined) {
      handleAnswer(option);
      return;
    }
    setSelectedAnswer(option);
    setFeedback(null);
  };

  return (
    <GameUiShell backgroundImage={lineGraphLabBackground} overlayDisabled className="bg-transparent">
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Line Graph Lab"
        body="The Monster Minds have scrambled the data points.\nRead the graph, or plot its missing point when asked.\nFollow the numbered axes and the trend."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <GameScreenLayout
        className="relative h-full w-full min-h-0 select-none gap-0 text-slate-100"
        main={(
          <section className={`line-graph-main flex min-h-0 flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 sm:px-3 md:px-4 ${gameState === 'success' ? 'line-graph-main--success' : ''}`}>
            <div className="line-graph-spacer flex flex-1" />

            <div className="line-graph-board mx-auto flex w-full max-w-[780px] flex-col gap-2 sm:gap-2.5">
              <GameQuestionCard className="w-full" title="Line Graph Lab" subtitle={feedback?.message || round?.helper || ''}>
                {round?.question ?? ''}
              </GameQuestionCard>

              <div className="line-graph-plot rounded-[1.2rem] border border-cyan-100/12 bg-[linear-gradient(180deg,rgba(8,24,54,0.5),rgba(4,12,28,0.32))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_28px_rgba(2,6,23,0.16)] backdrop-blur-[2px] sm:p-3">
                <div
                  ref={chartWrapRef}
                  className="line-graph-chart relative w-full overflow-hidden rounded-[1rem] border border-slate-200/10 bg-[linear-gradient(180deg,rgba(7,18,38,0.66),rgba(4,10,24,0.4))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  style={{ height: 'clamp(9.75rem, 24vh, 15.5rem)' }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_58%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(255,255,255,0.02))]" />
                  {round && chartSize.width > 0 && chartSize.height > 0 && (
                    <div className="relative z-10 h-full w-full">
                      <LineChart
                        width={chartSize.width}
                        height={chartSize.height}
                        data={displayedGraph}
                        margin={{ top: 18, right: 16, left: 0, bottom: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                        <XAxis
                          dataKey="label"
                          interval={0}
                          tick={{ fill: '#e8f3ff', fontSize: 14, fontWeight: 700 }}
                          axisLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                          tickLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                          label={{ value: 'Time', position: 'insideBottom', offset: -6, fill: '#c0e2ff', fontSize: 14, fontWeight: 800 }}
                        />
                        <YAxis
                          ticks={yTicks}
                          domain={[0, yTicks[yTicks.length - 1]]}
                          interval={0}
                          tick={{ fill: '#e8f3ff', fontSize: 14, fontWeight: 700 }}
                          axisLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                          tickLine={{ stroke: 'rgba(191,219,254,0.45)' }}
                          label={{ value: 'Units', angle: -90, position: 'insideLeft', fill: '#c0e2ff', fontSize: 14, fontWeight: 800 }}
                          width={42}
                        />
                        <Line
                          type="linear"
                          dataKey="value"
                          stroke="#34d399"
                          strokeWidth={4}
                          dot={(props) => {
                            const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: DataPoint; index?: number };
                            if (cx == null || cy == null || !payload) return null;
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#34d399"
                                stroke="#ecfeff"
                                strokeWidth={2}
                              />
                            );
                          }}
                          activeDot={{ r: 7, fill: '#6ee7b7', stroke: '#f0fdfa', strokeWidth: 2 }}
                          animationDuration={350}
                        />
                      </LineChart>
                    </div>
                  )}
                </div>
              </div>

              <div className="line-graph-side">
              <div className="answer-choice-surface grid grid-cols-2 gap-2">
                {round?.options.map(option => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = gameState === 'success' && option === round.correctAnswer;
                  const isWrongSelected = selectedAnswer === option && feedback?.type === 'error';

                  return (
                    <motion.button
                      key={option}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => chooseOption(option)}
                      disabled={gameState === 'success'}
                      aria-pressed={round?.plotIndex !== undefined ? isSelected : undefined}
                      className={`min-h-[3rem] rounded-2xl px-3 py-2.25 text-center sm:min-h-[3.2rem] sm:px-4 ${
                        isCorrect
                          ? 'ui-button-success'
                          : isWrongSelected
                            ? 'ui-button-primary'
                            : isSelected
                              ? 'ui-button-primary'
                              : 'ui-button-secondary'
                      } ${isWrongSelected ? 'line-graph-answer--wrong' : ''} ${gameState === 'success' ? 'cursor-default' : ''}`}
                    >
                      <span className="text-[0.88rem] font-black leading-tight sm:text-base">{option}</span>
                    </motion.button>
                  );
                })}
              </div>

              {round?.plotIndex !== undefined && gameState === 'playing' ? (
                <button
                  type="button"
                  className="ui-button-primary mt-2 w-full rounded-2xl py-2.5 text-sm font-black"
                  disabled={selectedAnswer === null}
                  onClick={() => selectedAnswer !== null && handleAnswer(selectedAnswer)}
                >Plot point at time {round.graph[round.plotIndex].label}</button>
              ) : null}

              <div className={`line-graph-next min-h-[3rem] ${gameState === 'success' ? 'line-graph-next--visible' : ''}`}>
                <AnimatePresence mode="wait">
                  {gameState === 'success' ? (
                    <motion.button
                      key="next"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={nextLevel}
                      className="ui-button-success flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-widest"
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
    </GameUiShell>
  );
};

export default LineGraphLabGame;

