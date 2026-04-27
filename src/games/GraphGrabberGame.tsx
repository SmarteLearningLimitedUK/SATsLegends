import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import graphGrabberBackground from '../assets/maps/backgroundsforgames/graph grabber.jpg';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';

interface GraphGrabberGameProps {
  levelId: number;
  avatarId: string;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type GraphKind = 'bar' | 'line' | 'pie';
type AnswerMode = 'single' | 'multi' | 'trueFalse';

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

interface LineDatum {
  label: string;
  value: number;
}

interface PieDatum {
  label: string;
  value: number;
  color: string;
}

interface RoundOption {
  id: string;
  label: string;
}

interface ChartRound {
  id: string;
  kind: GraphKind;
  answerMode: AnswerMode;
  title: string;
  prompt: string;
  support: string;
  chartCaption: string;
  xLabel: string;
  yLabel: string;
  bars?: BarDatum[];
  line?: LineDatum[];
  pie?: PieDatum[];
  options: RoundOption[];
  correctAnswers: string[];
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6];
const CARAVAN_POOL = [
  { id: 'windward', label: 'Windward', color: '#38bdf8' },
  { id: 'eden', label: 'Eden', color: '#818cf8' },
  { id: 'jerry', label: 'Jerry', color: '#34d399' },
  { id: 'ivy', label: 'Ivy', color: '#fbbf24' },
] as const;

const PIE_PALETTE = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24'];

const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const scoreToStars = (XP: number) => {
  if (XP >= 860) return 3;
  if (XP >= 640) return 2;
  return 1;
};

const buildAxisTicks = (maxValue: number) => {
  const safeMax = Math.max(4, Math.ceil(maxValue));
  return Array.from({ length: safeMax + 1 }, (_, index) => index);
};

type AxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value: number | string };
};

const GraphYAxisTick: React.FC<AxisTickProps> = ({ x = 0, y = 0, payload }) => {
  const rawValue = payload?.value;
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  const isMajor = Number.isFinite(value) && value % 5 === 0;
  const tickLength = isMajor ? 12 : 7;
  const strokeWidth = isMajor ? 2.2 : 1.2;
  const showLabel = isMajor || value === 0;

  return (
    <g transform={`translate(${x},${y})`}>
      <line
        x1={0}
        y1={0}
        x2={tickLength}
        y2={0}
        stroke="rgba(255,248,236,0.75)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {showLabel ? (
        <text
          x={-8}
          y={4}
          textAnchor="end"
          fill="#fff8ec"
          fontSize={11}
          fontWeight={900}
        >
          {value}
        </text>
      ) : null}
    </g>
  );
};

const createBarRound = (levelId: number, variant: number): ChartRound => {
  const base = 4 + levelId + variant;
  const bars: BarDatum[] = [
    { ...CARAVAN_POOL[0], value: clamp(base, 3, 14) },
    { ...CARAVAN_POOL[1], value: clamp(base + 3, 4, 16) },
    { ...CARAVAN_POOL[2], value: clamp(base + 1, 3, 15) },
    { ...CARAVAN_POOL[3], value: clamp(base - 2, 2, 12) },
  ];
  const maxBar = bars.reduce((best, current) => (current.value > best.value ? current : best), bars[0]);
  if (variant % 4 === 0) {
    return {
      id: `bar-single-${levelId}-${variant}`,
      kind: 'bar',
      answerMode: 'single',
      title: 'Bar Graph',
      prompt: 'How many crates did Windward deliver?',
      support: 'Read the bar graph carefully from the y-axis.',
      chartCaption: 'Supply crates by caravan',
      xLabel: 'Caravans',
      yLabel: 'Crates',
      bars,
      options: [
        { id: `${bars[0].value - 1}`, label: String(Math.max(0, bars[0].value - 1)) },
        { id: `${bars[0].value}`, label: String(bars[0].value) },
        { id: `${bars[0].value + 2}`, label: String(bars[0].value + 2) },
        { id: `${bars[0].value + 4}`, label: String(bars[0].value + 4) },
      ],
      correctAnswers: [String(bars[0].value)],
    };
  }

  if (variant % 4 === 1) {
    return {
      id: `bar-compare-${levelId}-${variant}`,
      kind: 'bar',
      answerMode: 'single',
      title: 'Most Crates',
      prompt: 'Which caravan delivered the most crates?',
      support: 'Compare the heights before you answer.',
      chartCaption: 'Supply crates by caravan',
      xLabel: 'Caravans',
      yLabel: 'Crates',
      bars,
      options: shuffle(CARAVAN_POOL.map((caravan) => ({ id: caravan.label, label: caravan.label }))),
      correctAnswers: [maxBar.label],
    };
  }

  if (variant % 4 === 2) {
    return {
      id: `bar-truefalse-${levelId}-${variant}`,
      kind: 'bar',
      answerMode: 'trueFalse',
      title: 'Bar Graph Check',
      prompt: `True or false: ${CARAVAN_POOL[1].label} delivered more crates than ${CARAVAN_POOL[0].label}.`,
      support: 'Read the graph, then decide whether the statement is true.',
      chartCaption: 'Supply crates by caravan',
      xLabel: 'Caravans',
      yLabel: 'Crates',
      bars,
      options: [
        { id: 'True', label: 'True' },
        { id: 'False', label: 'False' },
      ],
      correctAnswers: [bars[1].value > bars[0].value ? 'True' : 'False'],
    };
  }

  const truePairs = [
    {
      id: 'most',
      label: `${maxBar.label} has the largest bar.`,
      correct: true,
    },
    {
      id: 'least',
      label: `${bars[3].label} has the smallest bar.`,
      correct: bars[3].value === Math.min(...bars.map((bar) => bar.value)),
    },
    {
      id: 'pair',
      label: `${CARAVAN_POOL[1].label} and ${CARAVAN_POOL[2].label} together make ${bars[1].value + bars[2].value}.`,
      correct: true,
    },
    {
      id: 'pair-false',
      label: `${CARAVAN_POOL[0].label} and ${CARAVAN_POOL[3].label} together make 20.`,
      correct: bars[0].value + bars[3].value === 20,
    },
  ];

  return {
    id: `bar-multi-${levelId}-${variant}`,
    kind: 'bar',
    answerMode: 'multi',
    title: 'Graph Check',
    prompt: 'Select all statements that are true.',
    support: 'This matches the multi-answer style in the data-handling papers.',
    chartCaption: 'Supply crates by caravan',
    xLabel: 'Caravans',
    yLabel: 'Crates',
    bars,
    options: shuffle(truePairs.map((item) => ({ id: item.id, label: item.label }))),
    correctAnswers: truePairs.filter((item) => item.correct).map((item) => item.id),
  };
};

const createLineRound = (levelId: number, variant: number): ChartRound => {
  const base = 8 + (levelId * 2);
  const line: LineDatum[] = [
    { label: '1', value: clamp(base, 6, 18) },
    { label: '2', value: clamp(base + 3, 7, 20) },
    { label: '3', value: clamp(base + 5, 8, 22) },
    { label: '4', value: clamp(base + 2, 7, 20) },
    { label: '5', value: clamp(base + 7, 9, 24) },
  ];
  const riseAtThree = line[2].value > line[1].value;
  const highest = line.reduce((best, current) => (current.value > best.value ? current : best), line[0]);

  if (variant % 4 === 0) {
    return {
      id: `line-single-${levelId}-${variant}`,
      kind: 'line',
      answerMode: 'single',
      title: 'Line Graph',
      prompt: 'What is the brainpower at time = 4?',
      support: 'Read the point at x = 4 and match it to the y-axis.',
      chartCaption: 'Brainpower over time',
      xLabel: 'Time',
      yLabel: 'Brainpower',
      line,
      options: [
        { id: `${line[3].value - 2}`, label: String(Math.max(0, line[3].value - 2)) },
        { id: `${line[3].value}`, label: String(line[3].value) },
        { id: `${line[3].value + 2}`, label: String(line[3].value + 2) },
        { id: `${line[3].value + 4}`, label: String(line[3].value + 4) },
      ],
      correctAnswers: [String(line[3].value)],
    };
  }

  if (variant % 4 === 1) {
    return {
      id: `line-truefalse-${levelId}-${variant}`,
      kind: 'line',
      answerMode: 'trueFalse',
      title: 'Line Graph Check',
      prompt: `True or false: the graph rises between time 2 and time 3?`,
      support: 'Look at the direction of the line between the two points.',
      chartCaption: 'Brainpower over time',
      xLabel: 'Time',
      yLabel: 'Brainpower',
      line,
      options: [
        { id: 'True', label: 'True' },
        { id: 'False', label: 'False' },
      ],
      correctAnswers: [riseAtThree ? 'True' : 'False'],
    };
  }

  if (variant % 4 === 2) {
    const statements = [
      { id: 'top', label: `${highest.label} has the highest value.`, correct: true },
      { id: 'start', label: `The value at time 1 is ${line[0].value}.`, correct: true },
      { id: 'fall', label: `The line falls between time 3 and time 4.`, correct: line[3].value < line[2].value },
      { id: 'mid', label: `The value at time 2 is ${line[2].value}.`, correct: false },
    ];

    return {
      id: `line-multi-${levelId}-${variant}`,
      kind: 'line',
      answerMode: 'multi',
      title: 'Line Graph Check',
      prompt: 'Select all statements that are true.',
      support: 'Use the plotted points to judge each statement.',
      chartCaption: 'Brainpower over time',
      xLabel: 'Time',
      yLabel: 'Brainpower',
      line,
      options: shuffle(statements.map((statement) => ({ id: statement.id, label: statement.label }))),
      correctAnswers: statements.filter((statement) => statement.correct).map((statement) => statement.id),
    };
  }

  return {
    id: `line-compare-${levelId}-${variant}`,
    kind: 'line',
    answerMode: 'single',
    title: 'Line Graph',
    prompt: 'At what time does the graph reach its highest value?',
    support: 'Find the highest point and read its x-coordinate.',
    chartCaption: 'Brainpower over time',
    xLabel: 'Time',
    yLabel: 'Brainpower',
    line,
    options: line.map((point) => ({ id: point.label, label: point.label })),
    correctAnswers: [highest.label],
  };
};

const createPieRound = (levelId: number, variant: number): ChartRound => {
  const windward = 25 + (levelId % 5);
  const eden = 35 + (variant % 3);
  const jerry = 20;
  const ivy = 100 - windward - eden - jerry;
  const pie: PieDatum[] = [
    { label: 'Windward', value: windward, color: PIE_PALETTE[0] },
    { label: 'Eden', value: eden, color: PIE_PALETTE[1] },
    { label: 'Jerry', value: jerry, color: PIE_PALETTE[2] },
    { label: 'Ivy', value: ivy, color: PIE_PALETTE[3] },
  ];
  const largest = pie.reduce((best, current) => (current.value > best.value ? current : best), pie[0]);
  const windwardAndIvy = pie[0].value + pie[3].value;

  if (variant % 4 === 0) {
    return {
      id: `pie-single-${levelId}-${variant}`,
      kind: 'pie',
      answerMode: 'single',
      title: 'Pie Chart',
      prompt: 'Which slice is largest?',
      support: 'Look at the biggest sector in the pie chart.',
      chartCaption: 'Share of the cache',
      xLabel: 'Share',
      yLabel: 'Value',
      pie,
      options: shuffle(pie.map((slice) => ({ id: slice.label, label: slice.label }))),
      correctAnswers: [largest.label],
    };
  }

  if (variant % 4 === 1) {
    return {
      id: `pie-truefalse-${levelId}-${variant}`,
      kind: 'pie',
      answerMode: 'trueFalse',
      title: 'Pie Chart Check',
      prompt: `True or false: Windward and Ivy together make half of the chart?`,
      support: 'Add the two slices before you decide.',
      chartCaption: 'Share of the cache',
      xLabel: 'Share',
      yLabel: 'Value',
      pie,
      options: [
        { id: 'True', label: 'True' },
        { id: 'False', label: 'False' },
      ],
      correctAnswers: [windwardAndIvy === 50 ? 'True' : 'False'],
    };
  }

  const statements = [
    { id: 'largest', label: `${largest.label} is the largest slice.`, correct: true },
    { id: 'equal', label: `${JerryLabel(pie)} and ${IvyLabel(pie)} are equal slices.`, correct: pie[2].value === pie[3].value },
    { id: 'bigger', label: `${largest.label} is bigger than Windward.`, correct: largest.label !== 'Windward' },
    { id: 'half', label: `Windward and Ivy together make half of the chart.`, correct: windwardAndIvy === 50 },
  ];

  return {
    id: `pie-multi-${levelId}-${variant}`,
    kind: 'pie',
    answerMode: 'multi',
    title: 'Pie Chart Check',
    prompt: 'Select all statements that are true.',
    support: 'This mirrors the select-all style in the data-handling worksheet.',
    chartCaption: 'Share of the cache',
    xLabel: 'Share',
    yLabel: 'Value',
    pie,
    options: shuffle(statements.map((statement) => ({ id: statement.id, label: statement.label }))),
    correctAnswers: statements.filter((statement) => statement.correct).map((statement) => statement.id),
  };
};

const JerryLabel = (pie: PieDatum[]) => pie.find((slice) => slice.label === 'Jerry')?.label ?? 'Jerry';
const IvyLabel = (pie: PieDatum[]) => pie.find((slice) => slice.label === 'Ivy')?.label ?? 'Ivy';

const buildRound = (levelId: number, roundIndex: number): ChartRound => {
  const variant = roundIndex % 6;
  if (variant === 0 || variant === 3) return createBarRound(levelId, roundIndex);
  if (variant === 1 || variant === 4) return createLineRound(levelId, roundIndex);
  return createPieRound(levelId, roundIndex);
};

const normalize = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const matchesAnswer = (selected: string[], expected: string[]) => {
  const left = normalize(selected);
  const right = normalize(expected);
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const GraphBoard: React.FC<{ round: ChartRound }> = ({ round }) => {
  if (round.kind === 'bar' && round.bars) {
    const yTicks = buildAxisTicks(Math.max(...round.bars.map((bar) => bar.value)));
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,19,42,0.58),rgba(7,14,32,0.74))] p-2 shadow-[0_18px_30px_rgba(2,6,23,0.18)]">
        <div className="px-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
          {round.chartCaption}
        </div>
        <div className="mt-1.5 h-[clamp(13.5rem,32vh,19.5rem)] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={round.bars!} margin={{ top: 18, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#fff8ec', fontSize: 11, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={{ stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1 } as never}
                label={{ value: 'X Axis', position: 'insideBottom', offset: -6, fill: '#93c5fd', fontSize: 12, fontWeight: 800 } as never}
              />
              <YAxis
                domain={[0, Math.max(...round.bars.map((bar) => bar.value))]}
                ticks={yTicks}
                tick={GraphYAxisTick as never}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                label={{ value: 'Y Axis', angle: -90, position: 'insideLeft', fill: '#93c5fd', fontSize: 12, fontWeight: 800 } as never}
                width={42}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
              />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {round.bars!.map((bar) => (
                  <Cell key={bar.label} fill={bar.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (round.kind === 'line' && round.line) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,19,42,0.58),rgba(7,14,32,0.74))] p-2 shadow-[0_18px_30px_rgba(2,6,23,0.18)]">
        <div className="px-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
          {round.chartCaption}
        </div>
        <div className="mt-1.5 h-[clamp(13.5rem,32vh,19.5rem)] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={round.line!} margin={{ top: 18, right: 16, left: 0, bottom: 16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#fff8ec', fontSize: 11, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={{ stroke: 'rgba(255,255,255,0.55)', strokeWidth: 1 } as never}
                label={{ value: 'X Axis', position: 'insideBottom', offset: -6, fill: '#93c5fd', fontSize: 12, fontWeight: 800 } as never}
              />
              <YAxis
                tick={GraphYAxisTick as never}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickCount={6}
                label={{ value: 'Y Axis', angle: -90, position: 'insideLeft', fill: '#93c5fd', fontSize: 12, fontWeight: 800 } as never}
                width={42}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
              />
              <Line type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, stroke: '#fff8ec', fill: '#60a5fa' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const total = round.pie?.reduce((sum, slice) => sum + slice.value, 0) || 1;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,19,42,0.58),rgba(7,14,32,0.74))] p-2 shadow-[0_18px_30px_rgba(2,6,23,0.18)]">
      <div className="px-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
        {round.chartCaption}
      </div>
      <div className="mt-1.5 grid min-h-0 flex-1 gap-2.5 md:grid-cols-[1.08fr_0.92fr]">
        <div className="h-[clamp(13.5rem,32vh,19.5rem)]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
              />
              <Pie data={round.pie!} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={90} paddingAngle={3}>
                {round.pie!.map((slice) => (
                  <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col justify-center gap-2 rounded-[1rem] border border-white/8 bg-white/4 p-2.5">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/70">Slice labels</div>
          <div className="grid gap-2">
            {round.pie!.map((slice) => (
              <div key={slice.label} className="flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-slate-950/35 px-3 py-2">
                <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ backgroundColor: slice.color }} />
                <div className="flex-1 text-left text-sm font-black text-white">{slice.label}</div>
                <div className="text-xs font-black text-cyan-200">{slice.value}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1.5 text-center text-[11px] font-bold text-white/68">
        Total: {total}%
      </div>
    </div>
  );
};

const GraphGrabberGame: React.FC<GraphGrabberGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = 860 + (levelId * 220);
  const timeoutsRef = useRef<number[]>([]);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(84 + (levelId * 8));
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [roundNumber, setRoundNumber] = useState(1);
  const [Combo, setStreak] = useState(0);
  const [round, setRound] = useState<ChartRound>(() => buildRound(levelId, 0));
  const [feedback, setFeedback] = useState<null | { type: 'success' | 'error'; title: string; subtitle: string }>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  const progress = Math.min((XP / targetScore) * 100, 100);

  const clearTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    setTimeLeft(84 + (levelId * 8));
    setHearts(MAX_HEARTS);
    setRoundNumber(1);
    setStreak(0);
    setRound(buildRound(levelId, 0));
    setFeedback(null);
    setIsFinished(false);
    setShowPracticeIntro(Boolean(isPractice));
    setSelectedIds([]);
    setIsLocked(false);
  }, [isPractice, levelId]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useEffect(() => {
    if (isPractice || isFinished) return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timerId);
          setIsFinished(true);
          onGameOver(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [XP, isFinished, isPractice, onGameOver]);

  const finishVictory = (finalScore: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * 1.45 && hearts >= 3
      ? 3
      : finalScore >= targetScore && hearts >= 2
        ? 2
        : 1;
    confetti({
      particleCount: 165,
      spread: 70,
      origin: { y: 0.62 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa', '#34d399'],
    });
    onVictory(stars, finalScore);
  };

  const nextRound = (updatedScore: number) => {
    if (roundNumber >= totalRounds) {
      finishVictory(updatedScore);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      const nextRoundNumber = roundNumber + 1;
      setRoundNumber(nextRoundNumber);
      setRound(buildRound(levelId, nextRoundNumber - 1));
      setFeedback(null);
      setSelectedIds([]);
      setIsLocked(false);
    }, 1150);
    timeoutsRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title: 'Not quite', subtitle });
    setIsLocked(true);
    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(XP);
      }, 950);
      timeoutsRef.current.push(timeoutId);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setSelectedIds([]);
      setIsLocked(false);
    }, 950);
    timeoutsRef.current.push(timeoutId);
  };

  const submitAnswer = (selection: string[]) => {
    if (feedback || isFinished || isLocked) return;
    setIsLocked(true);

    const normalizedSelected = normalize(selection);
    const normalizedExpected = normalize(round.correctAnswers);
    const isCorrect = matchesAnswer(normalizedSelected, normalizedExpected);

    if (!isCorrect) {
      loseHeart('Read the graph again and match the data carefully.');
      return;
    }

    const points = 155 + (Combo * 24);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: 'Graph secured', subtitle: `+${points} XP` });
    confetti({
      particleCount: 42,
      spread: 48,
      origin: { y: 0.72 },
      colors: ['#fcd34d', '#ffffff', '#60a5fa'],
    });
    nextRound(updatedScore);
  };

  const handleOptionClick = (choice: RoundOption) => {
    if (isLocked || feedback || isFinished) return;
    if (round.answerMode === 'multi') {
      setSelectedIds((previous) => (
        previous.includes(choice.id)
          ? previous.filter((id) => id !== choice.id)
          : [...previous, choice.id]
      ));
      return;
    }
    submitAnswer([choice.id]);
  };

  const handleMultiSubmit = () => {
    if (isLocked || feedback || isFinished || round.answerMode !== 'multi') return;
    if (!selectedIds.length) {
      loseHeart('Select one or more statements before you submit.');
      return;
    }
    submitAnswer(selectedIds);
  };

  const optionGridClass = round.answerMode === 'trueFalse'
    ? 'grid-cols-2'
    : round.answerMode === 'multi'
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-2';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-transparent select-none text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: `url(${graphGrabberBackground})` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,32,0.14),rgba(8,15,32,0.24))]" aria-hidden="true" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Graph Grabber"
        body="The Monster Minds have hijacked the supply graph.\nRead the graph and grab the correct answer.\nCheck the axes and labels carefully."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+5.25rem)] pt-2 md:gap-3 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+5.6rem)] md:pt-3">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 md:gap-3">
          <div className="flex justify-center">
            <GameQuestionCard title={round.title}>
              <span>The Monster Minds have corrupted the manifest.</span>
              <span className="mt-1 block">{round.prompt}</span>
            </GameQuestionCard>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 md:gap-3">
            <div className="min-h-0 overflow-hidden pt-2">
              <GraphBoard round={round} />
            </div>

            <section className="rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(10,17,37,0.84))] p-2.5 shadow-[0_18px_30px_rgba(2,6,23,0.18)] md:p-3">
              <div className={`grid gap-2 ${optionGridClass}`}>
                {round.options.map((choice) => {
                  const selected = selectedIds.includes(choice.id);
                  const isCorrect = feedback?.type === 'success' && round.correctAnswers.includes(choice.id);
                  return (
                    <motion.button
                      key={choice.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleOptionClick(choice)}
                      disabled={feedback !== null || isFinished}
                      className={[
                        'rounded-[1rem] px-3 py-3 text-center text-[clamp(0.92rem,3vw,1.25rem)] font-black transition disabled:opacity-45',
                        isCorrect
                          ? 'ui-button-success'
                          : selected
                            ? 'ui-button-primary'
                            : 'ui-button-secondary',
                      ].join(' ')}
                    >
                      {choice.label}
                    </motion.button>
                  );
                })}
              </div>
              {round.answerMode === 'multi' ? (
                <div className="mt-3 flex justify-center">
                  <button
                    type="button"
                    onClick={handleMultiSubmit}
                    disabled={feedback !== null || isFinished}
                    className="ui-button-primary min-w-[11rem] rounded-[1rem] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] disabled:opacity-45"
                  >
                    Submit Answers
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key={`${feedback.type}-${feedback.title}-${feedback.subtitle}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-none flex justify-center text-center ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}
            >
              <div className="rounded-full border border-white/12 bg-slate-950/40 px-4 py-1.5 text-sm font-black uppercase tracking-[0.14em] shadow-[0_10px_18px_rgba(0,0,0,0.2)]">
                <div>{feedback.title}</div>
                <div className="mt-0.5 text-[11px] font-semibold normal-case tracking-normal text-white/92">
                  {feedback.subtitle}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default GraphGrabberGame;
