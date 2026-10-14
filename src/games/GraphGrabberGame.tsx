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
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import graphGrabberBackground from '../assets/maps/premium/graph-grabber.webp';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import SceneEnvironment from '../components/SceneEnvironment';
import './graph-grabber.css';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface GraphGrabberGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  isPractice?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type GraphKind = 'bar' | 'line' | 'pie';
type AnswerMode = 'single' | 'multi' | 'trueFalse' | 'construct';

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
  construction?: { label: string; percent: number; color: string };
  options: RoundOption[];
  correctAnswers: string[];
}

const MAX_HEARTS = 4;
const ROUND_GOAL_BY_LEVEL = [0, 4, 5, 5, 6, 7];
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

const createBarRound = (levelId: number, variant: number): ChartRound => {
  const base = levelId <= 2 ? 2 + levelId + Math.floor(variant / 4) : 7 + levelId * 2 + variant;
  const values = shuffle([base, base + 4, base + 2, base - 2]);
  const bars: BarDatum[] = CARAVAN_POOL.map((caravan, index) => ({ ...caravan, value: values[index] }));
  const maxBar = bars.reduce((best, current) => (current.value > best.value ? current : best), bars[0]);
  const minBar = bars.reduce((best, current) => (current.value < best.value ? current : best), bars[0]);
  const targetBar = bars[Math.floor(variant / 4) % bars.length];
  if (variant % 4 === 0) {
    return {
      id: `bar-single-${levelId}-${variant}`,
      kind: 'bar',
      answerMode: 'single',
      title: 'Bar Chart',
      prompt: `How many crates did ${targetBar.label} deliver?`,
      support: 'Read the y-axis.',
      chartCaption: 'Supply crates by caravan',
      xLabel: 'Caravans',
      yLabel: 'Crates',
      bars,
      options: [
        { id: `${targetBar.value - 1}`, label: String(targetBar.value - 1) },
        { id: `${targetBar.value}`, label: String(targetBar.value) },
        { id: `${targetBar.value + 2}`, label: String(targetBar.value + 2) },
        { id: `${targetBar.value + 4}`, label: String(targetBar.value + 4) },
      ],
      correctAnswers: [String(targetBar.value)],
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
      prompt: `True or false: ${bars[variant % 2].label} delivered more crates than ${bars[2 + (variant % 2)].label}.`,
      support: 'Read the graph, then decide whether the statement is true.',
      chartCaption: 'Supply crates by caravan',
      xLabel: 'Caravans',
      yLabel: 'Crates',
      bars,
      options: [
        { id: 'True', label: 'True' },
        { id: 'False', label: 'False' },
      ],
      correctAnswers: [bars[variant % 2].value > bars[2 + (variant % 2)].value ? 'True' : 'False'],
    };
  }

  const truePairs = [
    {
      id: 'most',
      label: `${maxBar.label} is largest.`,
      correct: true,
    },
    {
      id: 'least',
      label: `${bars[(variant + 1) % bars.length].label} is smallest.`,
      correct: bars[(variant + 1) % bars.length].label === minBar.label,
    },
    {
      id: 'pair',
      label: `${CARAVAN_POOL[1].label} + ${CARAVAN_POOL[2].label} = ${bars[1].value + bars[2].value}.`,
      correct: true,
    },
    {
      id: 'pair-false',
      label: `${bars[0].label} + ${bars[3].label} = ${bars[0].value + bars[3].value + 1}.`,
      correct: false,
    },
  ];

  return {
    id: `bar-multi-${levelId}-${variant}`,
    kind: 'bar',
    answerMode: 'multi',
    title: 'Graph Check',
    prompt: 'Select all statements that are true.',
    support: 'Check each bar height. Add the two named amounts when a claim gives a total.',
    chartCaption: 'Supply crates by caravan',
    xLabel: 'Caravans',
    yLabel: 'Crates',
    bars,
    options: shuffle(truePairs.map((item) => ({ id: item.id, label: item.label }))),
    correctAnswers: truePairs.filter((item) => item.correct).map((item) => item.id),
  };
};

const createLineRound = (levelId: number, variant: number): ChartRound => {
  const base = [0, 2, 3, 8, 12, 20][clamp(levelId, 1, 5)];
  const line: LineDatum[] = [
    { label: '1', value: base },
    { label: '2', value: base + 3 },
    { label: '3', value: base + 5 },
    { label: '4', value: base + 2 },
    { label: '5', value: base + 7 },
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
  const distributions = [
    [40, 30, 20, 10],
    [25, 35, 15, 25],
    [20, 25, 30, 25],
    [15, 20, 25, 40],
    [30, 20, 35, 15],
  ];
  const values = distributions[variant % distributions.length];
  const shuffledValues = shuffle(values);
  const pie: PieDatum[] = CARAVAN_POOL.map((caravan, index) => ({
    label: caravan.label,
    value: shuffledValues[index],
    color: PIE_PALETTE[index],
  }));
  const largest = pie.reduce((best, current) => (current.value > best.value ? current : best), pie[0]);
  const firstPair = pie[0].value + pie[3].value;

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
      prompt: 'True or false: Windward and Ivy together make half of the chart?',
      support: 'Add the two slices before you decide.',
      chartCaption: 'Share of the cache',
      xLabel: 'Share',
      yLabel: 'Value',
      pie,
      options: [
        { id: 'True', label: 'True' },
        { id: 'False', label: 'False' },
      ],
      correctAnswers: [firstPair === 50 ? 'True' : 'False'],
    };
  }

  if (variant % 4 === 3 && levelId >= 4) {
    const target = pie[Math.floor(variant / 4) % pie.length];
    const total = levelId === 4 ? 200 : 360;
    const answer = levelId === 4 ? target.value * 2 : target.value * 360 / 100;
    const options = shuffle([answer, answer + (levelId === 4 ? 10 : 18), answer - (levelId === 4 ? 10 : 18), answer + (levelId === 4 ? 20 : 36)]);
    return {
      id: `pie-quantity-${levelId}-${variant}`,
      kind: 'pie',
      answerMode: levelId === 4 ? 'single' : 'construct',
      title: levelId === 4 ? 'Supply Share' : 'Build the Sector',
      prompt: levelId === 4
        ? `There are ${total} crates altogether. How many belong to ${target.label}?`
        : `Build a ${target.value}% sector for ${target.label}.`,
      support: levelId === 4
        ? `Use ${target.label}'s share of ${total} crates.`
        : `Find ${target.value}% of 360°. Choose, preview, then lock.`,
      chartCaption: levelId === 4 ? 'Share of the cache' : 'Sector workshop',
      xLabel: 'Share',
      yLabel: 'Value',
      pie,
      construction: levelId === 5 ? { label: target.label, percent: target.value, color: target.color } : undefined,
      options: options.map((value) => ({ id: String(value), label: levelId === 4 ? String(value) : `${value}°` })),
      correctAnswers: [String(answer)],
    };
  }

  const statements = [
    { id: 'largest', label: `${largest.label} is largest.`, correct: true },
    { id: 'equal', label: `${pie[2].label} = ${pie[3].label}.`, correct: pie[2].value === pie[3].value },
    { id: 'bigger', label: `${largest.label} > Windward.`, correct: largest.label !== 'Windward' },
    { id: 'half', label: `Windward + Ivy = 50%.`, correct: firstPair === 50 },
  ];

  return {
    id: `pie-multi-${levelId}-${variant}`,
    kind: 'pie',
    answerMode: 'multi',
    title: 'Pie Chart Check',
    prompt: 'Select all statements that are true.',
    support: 'Compare each sector. For two named shares, add their percentages before deciding.',
    chartCaption: 'Share of the cache',
    xLabel: 'Share',
    yLabel: 'Value',
    pie,
    options: shuffle(statements.map((statement) => ({ id: statement.id, label: statement.label }))),
    correctAnswers: statements.filter((statement) => statement.correct).map((statement) => statement.id),
  };
};

const buildRound = (levelId: number, roundIndex: number): ChartRound => {
  const sequences: { kind: 'bar' | 'pie'; variant: number }[][] = [
    [{ kind: 'bar', variant: 0 }, { kind: 'bar', variant: 4 }, { kind: 'bar', variant: 8 }, { kind: 'bar', variant: 12 }],
    [{ kind: 'bar', variant: 0 }, { kind: 'bar', variant: 1 }, { kind: 'bar', variant: 2 }, { kind: 'bar', variant: 4 }, { kind: 'bar', variant: 5 }],
    [{ kind: 'bar', variant: 2 }, { kind: 'pie', variant: 0 }, { kind: 'bar', variant: 3 }, { kind: 'pie', variant: 5 }, { kind: 'bar', variant: 1 }],
    [{ kind: 'bar', variant: 3 }, { kind: 'pie', variant: 0 }, { kind: 'bar', variant: 0 }, { kind: 'pie', variant: 2 }, { kind: 'bar', variant: 2 }, { kind: 'pie', variant: 3 }],
    [{ kind: 'pie', variant: 3 }, { kind: 'bar', variant: 3 }, { kind: 'pie', variant: 2 }, { kind: 'bar', variant: 4 }, { kind: 'pie', variant: 0 }, { kind: 'bar', variant: 2 }, { kind: 'pie', variant: 7 }],
  ];
  const sequence = sequences[clamp(levelId, 1, 5) - 1];
  const mission = sequence[roundIndex % sequence.length];
  return mission.kind === 'pie'
    ? createPieRound(levelId, mission.variant)
    : createBarRound(levelId, mission.variant);
};

const normalize = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const matchesAnswer = (selected: string[], expected: string[]) => {
  const left = normalize(selected);
  const right = normalize(expected);
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const GraphBoard: React.FC<{ round: ChartRound; difficulty: number; previewAngle?: number | null }> = ({ round, difficulty, previewAngle }) => {
  const [inspected, setInspected] = useState<string | null>(null);
  const [compactChart,setCompactChart]=useState(()=>window.matchMedia('(max-height:650px)').matches);
  useEffect(()=>{const query=window.matchMedia('(max-height:650px)');const sync=()=>setCompactChart(query.matches);query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);
  useEffect(()=>setInspected(null),[round.id]);
  const values = round.bars?.map((point) => point.value) || round.line?.map((point) => point.value) || [1];
  const tickStep = difficulty <= 2 ? 1 : 2;
  const axisMax = Math.ceil(Math.max(...values) / tickStep) * tickStep;
  const axisTicks = Array.from({ length: axisMax / tickStep + 1 }, (_, index) => index * tickStep);
  if (round.kind === 'bar' && round.bars) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(9,19,42,0.5),rgba(7,14,32,0.66))] p-1.5 shadow-[0_14px_24px_rgba(2,6,23,0.16)]">
        <div className="graph-grabber-chart-caption flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
          <span>X</span>
          {round.chartCaption}
          <span>Y</span>
        </div>
        <div className="graph-grabber-cartesian-chart mt-1.5 h-[clamp(11rem,26vh,15.5rem)] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={round.bars!} layout={compactChart?'vertical':'horizontal'} margin={{ top: 18, right: 16, left: 10, bottom: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" vertical={compactChart} horizontal={!compactChart} />
              <XAxis
                dataKey={compactChart?undefined:'label'}
                type={compactChart?'number':'category'}
                domain={compactChart?[0,axisMax]:undefined}
                ticks={compactChart?axisTicks:undefined}
                interval={0}
                tick={{ fill: '#fff8ec', fontSize: 14, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={false}
                label={{ value: compactChart?round.yLabel:round.xLabel, position: 'insideBottom', offset: -2, fill: '#fff8ec', fontSize: 14, fontWeight: 800 } as never}
              />
              <YAxis
                type={compactChart?'category':'number'}
                dataKey={compactChart?'label':undefined}
                domain={compactChart?undefined:[0, axisMax]}
                ticks={compactChart?undefined:axisTicks}
                width={compactChart?88:60}
                interval={0}
                tick={{ fill: '#fff8ec', fontSize: 14, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={false}
                label={compactChart?undefined:{ value: round.yLabel, angle: -90, position: 'insideLeft', fill: '#fff8ec', fontSize: 14, fontWeight: 800 } as never}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
              />
              {inspected&&<ReferenceLine {...(compactChart?{x:round.bars.find(bar=>bar.label===inspected)?.value}:{y:round.bars.find(bar=>bar.label===inspected)?.value})} stroke="#fff3ae" strokeWidth={2} strokeDasharray="6 4" />}
              <Bar dataKey="value" radius={[12, 12, 0, 0]} onClick={(_,index)=>{const bar=round.bars?.[index];if(bar)setInspected(inspected===bar.label?null:bar.label);}}>
                {round.bars!.map((bar) => (
                  <Cell key={bar.label} fill={bar.color} opacity={!inspected||inspected===bar.label?1:.45} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="graph-shipment-tabs" aria-label="Trace a shipment on the chart">{round.bars.map(bar=><button key={bar.label} type="button" aria-pressed={inspected===bar.label} onClick={()=>setInspected(inspected===bar.label?null:bar.label)}><span aria-hidden="true">▣</span>{bar.label}</button>)}</div>
      </div>
    );
  }

  if (round.kind === 'line' && round.line) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(9,19,42,0.5),rgba(7,14,32,0.66))] p-1.5 shadow-[0_14px_24px_rgba(2,6,23,0.16)]">
        <div className="graph-grabber-chart-caption flex items-center justify-between px-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
          <span>X</span>
          {round.chartCaption}
          <span>Y</span>
        </div>
        <div className="graph-grabber-cartesian-chart mt-1.5 h-[clamp(11rem,26vh,15.5rem)] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={round.line!} margin={{ top: 18, right: 16, left: 10, bottom: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: '#fff8ec', fontSize: 14, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={false}
                label={{ value: round.xLabel, position: 'insideBottom', offset: -2, fill: '#fff8ec', fontSize: 11, fontWeight: 800 } as never}
              />
              <YAxis
                domain={[0, axisMax]}
                ticks={axisTicks}
                interval={0}
                tick={{ fill: '#fff8ec', fontSize: 14, fontWeight: 800 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.35)' } as never}
                tickLine={false}
                label={{ value: round.yLabel, angle: -90, position: 'insideLeft', fill: '#fff8ec', fontSize: 11, fontWeight: 800 } as never}
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

  if (round.construction) {
    const angle = previewAngle == null ? 0 : clamp(previewAngle, 0, 360);
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(9,19,42,0.5),rgba(7,14,32,0.66))] p-1.5 shadow-[0_14px_24px_rgba(2,6,23,0.16)]" data-sector-workshop>
        <div className="graph-grabber-chart-caption px-1 text-center text-xs font-black uppercase tracking-[0.12em] text-amber-100">{round.chartCaption}</div>
        <div className="graph-grabber-pie-layout mt-1.5 grid min-h-0 flex-1 items-center gap-2 md:grid-cols-[1.08fr_0.92fr]">
          <div className="graph-grabber-pie-chart flex h-[clamp(11rem,26vh,15.5rem)] items-center justify-center max-[420px]:!max-h-[88px]" style={{ maxHeight: 'clamp(100px, 20vh, 160px)' }}>
            <div
              className="relative aspect-square h-full max-h-[13rem] rounded-full border-4 border-white/45 shadow-[0_0_0_5px_rgba(125,211,252,0.13),0_16px_28px_rgba(0,0,0,0.35)] transition-[background] duration-300"
              role="img"
              aria-label={previewAngle == null ? 'Empty pie chart, choose an angle to preview a sector' : `Previewed sector: ${angle} degrees`}
              style={{ background: `conic-gradient(from -90deg, ${round.construction.color} 0deg ${angle}deg, #14243e ${angle}deg 360deg)` }}
            >
              <div className="absolute inset-[34%] flex items-center justify-center rounded-full border border-white/25 bg-slate-950 text-sm font-black text-white shadow-lg">
                {previewAngle == null ? '?' : `${angle}°`}
              </div>
            </div>
          </div>
          <div className="graph-grabber-pie-labels flex flex-col justify-center gap-2 rounded-[0.95rem] border border-white/12 bg-slate-950/60 p-3 text-center">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-amber-100">Target share</div>
            <div className="text-xl font-black text-white">{round.construction.label}: {round.construction.percent}%</div>
            <div className="text-sm font-bold text-cyan-100">Full circle = 360°</div>
            <div className="text-xs font-semibold text-white">{previewAngle == null ? 'Choose an angle below to start building.' : 'Preview your sector, then lock it in.'}</div>
          </div>
        </div>
      </div>
    );
  }

  const total = round.pie?.reduce((sum, slice) => sum + slice.value, 0) || 1;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(9,19,42,0.5),rgba(7,14,32,0.66))] p-1.5 shadow-[0_14px_24px_rgba(2,6,23,0.16)]">
      <div className="flex items-center justify-center px-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">
        {round.chartCaption}
      </div>
      <div className="graph-grabber-pie-layout mt-1.5 grid min-h-0 flex-1 gap-2 md:grid-cols-[1.08fr_0.92fr]">
        <div className="graph-grabber-pie-chart h-[clamp(11rem,26vh,15.5rem)]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ background: 'rgba(8,15,32,0.95)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#fff8ec' }}
              />
              <Pie data={round.pie!} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="38%" outerRadius="78%" paddingAngle={3}>
                {round.pie!.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="graph-grabber-pie-labels flex flex-col justify-center gap-2 rounded-[0.95rem] border border-white/8 bg-white/3 p-2">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/70">Slice labels</div>
          <div className="grid gap-2">
            {round.pie!.map((slice) => (
              <div key={slice.label} className="graph-grabber-slice-row flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-slate-950/35 px-3 py-2">
                <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ backgroundColor: slice.color }} />
                <div className="flex-1 text-left text-sm font-black text-white">{slice.label}</div>
                <div className="text-xs font-black text-cyan-200">{slice.value}%</div>
              </div>
            ))}
          </div>
          <div className="graph-grabber-pie-note mt-1 text-[10px] font-bold leading-relaxed text-white/72">
            Pie charts are labelled clearly here so the learner can match the slice to the statement.
          </div>
        </div>
      </div>
      <div className="graph-grabber-total mt-1.5 text-center text-[11px] font-bold text-white/68">
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
  sessionEvents,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const totalRounds = ROUND_GOAL_BY_LEVEL[levelId] || 5;
  const targetScore = totalRounds * 155 + 12 * totalRounds * (totalRounds - 1);
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
    const stars = finalScore >= targetScore * .9 && hearts >= 3
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
    const nextHearts = isPractice ? hearts : hearts - 1;
    if (!isPractice) setHearts(nextHearts);
    setStreak(0);
    setFeedback({ type: 'error', title: isPractice ? 'Try that again' : 'Not quite', subtitle });
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
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { round: roundNumber, chart: round.kind } });
      loseHeart(round.support);
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { round: roundNumber, chart: round.kind } });

    const points = 155 + (Combo * 24);
    const updatedScore = XP + points;
    setScore(updatedScore);
    setStreak((previous) => previous + 1);
    setFeedback({ type: 'success', title: round.answerMode === 'construct' ? 'Sector locked' : 'Graph secured', subtitle: `+${points} XP` });
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
    if (round.answerMode === 'construct') {
      setSelectedIds([choice.id]);
      return;
    }
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
      setFeedback({ type: 'error', title: 'Choose a statement', subtitle: 'Select one or more statements, then submit.' });
      const timeoutId = window.setTimeout(() => setFeedback(null), 950);
      timeoutsRef.current.push(timeoutId);
      return;
    }
    submitAnswer(selectedIds);
  };

  const handleSectorLock = () => {
    if (isLocked || feedback || isFinished || round.answerMode !== 'construct') return;
    if (!selectedIds.length) {
      setFeedback({ type: 'error', title: 'Choose an angle', subtitle: 'Preview a sector, then lock it.' });
      const timeoutId = window.setTimeout(() => setFeedback(null), 950);
      timeoutsRef.current.push(timeoutId);
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
    <div className="graph-grabber-game relative flex h-full w-full flex-col overflow-hidden bg-transparent select-none text-slate-100">
      <SceneEnvironment src={graphGrabberBackground} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,32,0.14),rgba(8,15,32,0.24))]" aria-hidden="true" />
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Graph Grabber"
        body="The Monster Minds have hijacked the supply graph.\nRead the graph and grab the correct answer.\nCheck the axes and labels carefully."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="graph-grabber-content relative z-10 flex h-full min-h-0 w-full flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.65rem)] md:pt-3">
        <div className="graph-grabber-spacer flex flex-1" />

        <div className="graph-grabber-stack mx-auto flex w-full max-w-[56rem] flex-col gap-1.5 md:gap-2">
          <GameQuestionCard
            title={round.title}
            className="w-full !mb-0"
            style={{
              ['--question-card-width' as any]: 'min(100%, 56rem)',
              ['--question-card-padding' as any]: '8px 10px',
              position: 'relative',
              top: 'auto',
              left: 'auto',
              right: 'auto',
              transform: 'none',
              width: '100%',
            }}
          >
            {formatFantasyPrompt(round.prompt)}
          </GameQuestionCard>

          <div className="graph-grabber-board min-h-0">
            <GraphBoard round={round} difficulty={levelId} previewAngle={round.answerMode === 'construct' && selectedIds.length ? Number(selectedIds[0]) : null} />
          </div>

          <section className="graph-grabber-answers rounded-[1rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.62),rgba(10,17,37,0.76))] p-2 shadow-[0_14px_24px_rgba(2,6,23,0.16)] md:p-2.5" data-answer-mode={round.answerMode}>
            <div className="graph-grabber-hint mb-1.5 flex items-center justify-start gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">
              <span>{round.answerMode === 'multi' ? 'Select every true statement, then submit.' : round.kind==='bar'?round.support.replace(/y-axis/ig,'numbered axis'):round.support}</span>
            </div>
            <div className={`grid gap-2 ${optionGridClass}`}>
              {round.options.map((choice) => {
                const selected = selectedIds.includes(choice.id);
                const isCorrect = feedback?.type === 'success' && round.correctAnswers.includes(choice.id);
                return (
                  <motion.button
                    key={choice.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleOptionClick(choice)}
                    disabled={feedback !== null || isFinished}
                    aria-pressed={round.answerMode === 'construct' ? selected : undefined}
                    className={[
                      round.answerMode === 'construct'
                        ? 'min-h-11 rounded-[0.95rem] px-3 py-1.5 text-center text-base font-black transition disabled:opacity-45'
                        : 'rounded-[0.95rem] px-3 py-2.5 text-center text-base md:text-lg font-black transition disabled:opacity-45',
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
              <div className="mt-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={handleMultiSubmit}
                  disabled={feedback !== null || isFinished}
                  className="ui-button-primary min-w-[10rem] rounded-[0.95rem] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-45"
                >
                  Submit Answers
                </button>
              </div>
            ) : null}
            {round.answerMode === 'construct' ? (
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleSectorLock}
                  disabled={feedback !== null || isFinished || isLocked}
                  className="ui-button-primary h-11 min-w-[10rem] rounded-[0.95rem] px-4 py-0 text-sm font-black uppercase tracking-[0.1em] disabled:opacity-45"
                >
                  Lock Sector
                </button>
              </div>
            ) : null}
          </section>
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
