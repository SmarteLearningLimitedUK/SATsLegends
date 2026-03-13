import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { getBossEncounter } from '../bossMeta';
import { GAME_META } from '../gameMeta';
import { triggerHaptic } from '../haptics';
import BossPortrait from './BossPortrait';
import GameActionDock from './GameActionDock';
import GameplayHUD from './GameplayHUD';
import { Star } from './GameIcons';

type SupportedChallengeGameType =
  | 'place_value_peaks'
  | 'calculation_clash'
  | 'percent_pulse'
  | 'coordinate_quest'
  | 'transform_temple'
  | 'scale_safari'
  | 'chart_chase'
  | 'mean_machine'
  | 'equation_grove'
  | 'rule_runner';

interface CurriculumChallengeGameProps {
  gameType: SupportedChallengeGameType;
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface CoordinatePoint {
  x: number;
  y: number;
  label: string;
  tone?: string;
}

interface BarDatum {
  label: string;
  value: number;
  color: string;
}

type VisualData =
  | { type: 'tokens'; items: string[]; accent?: string }
  | { type: 'equation'; lines: string[]; badge?: string }
  | { type: 'bars'; bars: BarDatum[]; caption?: string }
  | { type: 'coordinates'; points: CoordinatePoint[]; min: number; max: number; caption?: string }
  | { type: 'sequence'; values: string[]; caption?: string }
  | { type: 'ratio'; leftLabel: string; leftValue: string; rightLabel: string; rightValue: string; caption?: string };

interface ChallengeQuestion {
  prompt: string;
  sublabel: string;
  options: string[];
  answerIndex: number;
  visual: VisualData;
}

interface ChallengeTheme {
  title: string;
  surface: string;
  scene: string;
  ambient: string;
  prompt: string;
  answer: string;
  answerActive: string;
  statText: string;
  statSoftBg: string;
  statBorder: string;
  progress: string;
  badge: string;
}

const QUESTION_TIME_BONUS = 7;

const CHALLENGE_THEMES: Record<SupportedChallengeGameType, ChallengeTheme> = {
  place_value_peaks: {
    title: 'Place Value Peaks',
    surface: 'from-emerald-300/20 via-sky-200/12 to-slate-950/86',
    scene: 'from-lime-200/14 via-emerald-300/10 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.22),transparent_30%),linear-gradient(180deg,#0f3026_0%,#09131b_100%)]',
    prompt: 'from-emerald-200/20 to-cyan-100/10',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-lime-300/55 to-emerald-400/48',
    statText: 'text-emerald-950',
    statSoftBg: 'bg-emerald-100/85',
    statBorder: 'border-emerald-200/90',
    progress: 'bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-400',
    badge: 'text-lime-100',
  },
  calculation_clash: {
    title: 'Calculation Clash',
    surface: 'from-rose-300/18 via-orange-200/12 to-slate-950/86',
    scene: 'from-orange-300/16 via-yellow-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.24),transparent_28%),linear-gradient(180deg,#2e140c_0%,#0b1018_100%)]',
    prompt: 'from-orange-200/20 to-amber-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-orange-300/55 to-rose-400/48',
    statText: 'text-orange-950',
    statSoftBg: 'bg-orange-100/85',
    statBorder: 'border-orange-200/90',
    progress: 'bg-gradient-to-r from-yellow-300 via-orange-300 to-rose-400',
    badge: 'text-amber-100',
  },
  percent_pulse: {
    title: 'Percent Pulse',
    surface: 'from-fuchsia-300/18 via-violet-200/12 to-slate-950/86',
    scene: 'from-fuchsia-300/16 via-pink-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(232,121,249,0.2),transparent_28%),linear-gradient(180deg,#28113a_0%,#091018_100%)]',
    prompt: 'from-fuchsia-200/20 to-violet-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-fuchsia-300/55 to-violet-400/48',
    statText: 'text-violet-950',
    statSoftBg: 'bg-violet-100/85',
    statBorder: 'border-violet-200/90',
    progress: 'bg-gradient-to-r from-pink-300 via-fuchsia-300 to-violet-400',
    badge: 'text-fuchsia-100',
  },
  coordinate_quest: {
    title: 'Coordinate Quest',
    surface: 'from-sky-300/18 via-cyan-200/12 to-slate-950/86',
    scene: 'from-sky-300/18 via-cyan-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),transparent_28%),linear-gradient(180deg,#10283a_0%,#071018_100%)]',
    prompt: 'from-sky-200/18 to-cyan-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-cyan-300/55 to-sky-400/48',
    statText: 'text-cyan-950',
    statSoftBg: 'bg-cyan-100/85',
    statBorder: 'border-cyan-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400',
    badge: 'text-cyan-100',
  },
  transform_temple: {
    title: 'Transform Temple',
    surface: 'from-amber-300/18 via-yellow-200/12 to-slate-950/86',
    scene: 'from-yellow-200/18 via-amber-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.22),transparent_28%),linear-gradient(180deg,#33240f_0%,#091018_100%)]',
    prompt: 'from-amber-200/18 to-yellow-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-amber-300/55 to-yellow-400/48',
    statText: 'text-amber-950',
    statSoftBg: 'bg-amber-100/85',
    statBorder: 'border-amber-200/90',
    progress: 'bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400',
    badge: 'text-amber-100',
  },
  scale_safari: {
    title: 'Scale Safari',
    surface: 'from-lime-300/18 via-yellow-200/12 to-slate-950/86',
    scene: 'from-lime-300/20 via-yellow-200/10 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(163,230,53,0.2),transparent_28%),linear-gradient(180deg,#223310_0%,#091018_100%)]',
    prompt: 'from-lime-200/18 to-yellow-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-lime-300/55 to-yellow-400/48',
    statText: 'text-lime-950',
    statSoftBg: 'bg-lime-100/85',
    statBorder: 'border-lime-200/90',
    progress: 'bg-gradient-to-r from-lime-300 via-yellow-300 to-orange-400',
    badge: 'text-lime-100',
  },
  chart_chase: {
    title: 'Chart Chase',
    surface: 'from-indigo-300/18 via-blue-200/12 to-slate-950/86',
    scene: 'from-indigo-300/16 via-sky-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.2),transparent_28%),linear-gradient(180deg,#101f40_0%,#091018_100%)]',
    prompt: 'from-indigo-200/18 to-blue-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-indigo-300/55 to-sky-400/48',
    statText: 'text-indigo-950',
    statSoftBg: 'bg-indigo-100/85',
    statBorder: 'border-indigo-200/90',
    progress: 'bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-400',
    badge: 'text-sky-100',
  },
  mean_machine: {
    title: 'Mean Machine',
    surface: 'from-blue-300/18 via-slate-200/12 to-slate-950/86',
    scene: 'from-cyan-300/16 via-blue-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_28%),linear-gradient(180deg,#10243e_0%,#091018_100%)]',
    prompt: 'from-blue-200/18 to-slate-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-cyan-300/55 to-blue-400/48',
    statText: 'text-blue-950',
    statSoftBg: 'bg-blue-100/85',
    statBorder: 'border-blue-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-400',
    badge: 'text-blue-100',
  },
  equation_grove: {
    title: 'Equation Grove',
    surface: 'from-emerald-300/18 via-lime-200/12 to-slate-950/86',
    scene: 'from-emerald-300/18 via-lime-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.2),transparent_28%),linear-gradient(180deg,#133222_0%,#091018_100%)]',
    prompt: 'from-emerald-200/18 to-lime-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-emerald-300/55 to-lime-400/48',
    statText: 'text-emerald-950',
    statSoftBg: 'bg-emerald-100/85',
    statBorder: 'border-emerald-200/90',
    progress: 'bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-400',
    badge: 'text-emerald-100',
  },
  rule_runner: {
    title: 'Rule Runner',
    surface: 'from-purple-300/18 via-indigo-200/12 to-slate-950/86',
    scene: 'from-violet-300/18 via-indigo-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.2),transparent_28%),linear-gradient(180deg,#1c173b_0%,#091018_100%)]',
    prompt: 'from-violet-200/18 to-indigo-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-violet-300/55 to-indigo-400/48',
    statText: 'text-violet-950',
    statSoftBg: 'bg-violet-100/85',
    statBorder: 'border-violet-200/90',
    progress: 'bg-gradient-to-r from-fuchsia-300 via-violet-300 to-indigo-400',
    badge: 'text-violet-100',
  },
};

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatCoordinate = (point: { x: number; y: number }) => `(${point.x}, ${point.y})`;

const makeOptions = (correct: string, wrongOptions: string[]) => {
  const options = shuffle([correct, ...wrongOptions.slice(0, 3)]);
  return {
    options,
    answerIndex: options.indexOf(correct),
  };
};

const fractionToPercentSet = [
  { fraction: '1/2', decimal: '0.5', percent: '50%' },
  { fraction: '1/4', decimal: '0.25', percent: '25%' },
  { fraction: '3/4', decimal: '0.75', percent: '75%' },
  { fraction: '1/5', decimal: '0.2', percent: '20%' },
  { fraction: '3/5', decimal: '0.6', percent: '60%' },
  { fraction: '3/8', decimal: '0.375', percent: '37.5%' },
];

const generatePlaceValueQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const numbers = Array.from({ length: 4 }, () => randomInt(100000, 9999999));
    const largest = Math.max(...numbers);
    const { options, answerIndex } = makeOptions(
      largest.toLocaleString(),
      shuffle(numbers.filter((value) => value !== largest)).map((value) => value.toLocaleString()),
    );

    return {
      prompt: 'Which number is the greatest?',
      sublabel: 'Compare the place value of each digit carefully.',
      options,
      answerIndex,
      visual: { type: 'tokens', items: numbers.map((value) => value.toLocaleString()), accent: 'amber' },
    };
  }

  if (mode === 1) {
    const number = randomInt(100000, 9999999);
    const digits = `${number}`.split('');
    const placeIndex = randomInt(0, digits.length - 1);
    const placeValue = Number(digits[placeIndex]) * 10 ** (digits.length - placeIndex - 1);
    const wrong = shuffle([
      (Number(digits[placeIndex]) * 10 ** Math.max(0, digits.length - placeIndex - 2)).toLocaleString(),
      (Number(digits[placeIndex]) * 10 ** (digits.length - placeIndex)).toLocaleString(),
      Number(digits[placeIndex]).toString(),
    ]);
    const { options, answerIndex } = makeOptions(placeValue.toLocaleString(), wrong);

    return {
      prompt: `What is the value of the digit ${digits[placeIndex]} in ${number.toLocaleString()}?`,
      sublabel: 'Think about the digit position, not just the digit itself.',
      options,
      answerIndex,
      visual: { type: 'tokens', items: digits, accent: 'emerald' },
    };
  }

  const base = randomInt(10, 900) * 1000;
  const correct = base + randomInt(0, 4999);
  const wrongs = shuffle([base - randomInt(1, 4999), base + randomInt(5001, 9999), base + randomInt(5001, 19999)]).map((value) => value.toLocaleString());
  const { options, answerIndex } = makeOptions(correct.toLocaleString(), wrongs);

  return {
    prompt: `Which number rounds to ${base.toLocaleString()} to the nearest 10,000?`,
    sublabel: 'Check the thousands digit before you round.',
    options,
    answerIndex,
    visual: { type: 'equation', lines: [correct.toLocaleString(), `${base.toLocaleString()} nearest 10,000`] },
  };
};

const generateCalculationQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const a = randomInt(12, 99);
    const b = randomInt(11, 98);
    const c = randomInt(3, 9);
    const correct = a + b * c;
    const { options, answerIndex } = makeOptions(String(correct), shuffle([String(correct + c), String(correct - b), String(a + b + c)]));
    return {
      prompt: `Calculate ${a} + ${b} × ${c}`,
      sublabel: 'Use the order of operations.',
      options,
      answerIndex,
      visual: { type: 'equation', lines: [`${a} + ${b} × ${c}`, 'Multiply first, then add.'], badge: 'BODMAS' },
    };
  }

  if (mode === 1) {
    const divisor = randomInt(4, 12);
    const quotient = randomInt(8, 18);
    const extra = randomInt(15, 45);
    const dividend = divisor * quotient;
    const correct = dividend / divisor + extra;
    const { options, answerIndex } = makeOptions(String(correct), shuffle([String(correct + divisor), String(correct - extra), String(dividend + extra)]));
    return {
      prompt: `Work out (${dividend} ÷ ${divisor}) + ${extra}`,
      sublabel: 'Solve inside the brackets first.',
      options,
      answerIndex,
      visual: { type: 'equation', lines: [`(${dividend} ÷ ${divisor}) + ${extra}`, `= ${correct}`], badge: 'Clash' },
    };
  }

  const rows = randomInt(6, 14);
  const columns = randomInt(4, 12);
  const removed = randomInt(10, 28);
  const correct = rows * columns - removed;
  const { options, answerIndex } = makeOptions(String(correct), shuffle([String(rows + columns - removed), String(rows * columns + removed), String(correct - columns)]));
  return {
    prompt: `A stadium has ${rows} rows of ${columns} seats. ${removed} are broken. How many usable seats are left?`,
    sublabel: 'This is a multi-step arithmetic problem.',
    options,
    answerIndex,
    visual: { type: 'ratio', leftLabel: 'Rows', leftValue: String(rows), rightLabel: 'Seats per row', rightValue: String(columns), caption: 'Find total seats, then subtract broken seats.' },
  };
};

const generatePercentQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 1);
  if (mode === 0) {
    const sample = pick(fractionToPercentSet);
    const forms = [sample.fraction, sample.decimal, sample.percent];
    const promptForm = pick(forms);
    const correct = forms.find((item) => item !== promptForm) || sample.percent;
    const wrong = shuffle(
      fractionToPercentSet
        .filter((item) => item.percent !== sample.percent)
        .slice(0, 3)
        .map((item) => pick([item.fraction, item.decimal, item.percent])),
    );
    const { options, answerIndex } = makeOptions(correct, wrong);
    return {
      prompt: `Which answer is equivalent to ${promptForm}?`,
      sublabel: 'Link fractions, decimals and percentages confidently.',
      options,
      answerIndex,
      visual: { type: 'tokens', items: [sample.fraction, sample.decimal, sample.percent], accent: 'violet' },
    };
  }

  const percent = pick([10, 20, 25, 50, 75]);
  const amount = pick([24, 36, 48, 60, 80, 120, 200]);
  const correct = (amount * percent) / 100;
  const { options, answerIndex } = makeOptions(String(correct), shuffle([String(correct + amount / 10), String(correct - amount / 20), String(amount - correct)]));
  return {
    prompt: `What is ${percent}% of ${amount}?`,
    sublabel: 'Use a known fraction or decimal equivalent.',
    options,
    answerIndex,
    visual: { type: 'equation', lines: [`${percent}% of ${amount}`, `${correct}`], badge: 'FDP' },
  };
};

const generateCoordinateQuestion = (): ChallengeQuestion => {
  const points = shuffle(['A', 'B', 'C', 'D']).slice(0, 3).map((label) => ({
    label,
    x: randomInt(-4, 4),
    y: randomInt(-4, 4),
    tone: label === 'A' ? 'bg-cyan-300' : label === 'B' ? 'bg-emerald-300' : 'bg-violet-300',
  }));
  const target = pick(points);
  const correct = formatCoordinate(target);
  const wrong = shuffle(points.filter((point) => point.label !== target.label).map((point) => formatCoordinate(point)));
  while (wrong.length < 3) {
    wrong.push(formatCoordinate({ x: clamp(target.x + randomInt(-2, 2), -4, 4), y: clamp(target.y + randomInt(-2, 2), -4, 4) }));
  }
  const { options, answerIndex } = makeOptions(correct, wrong);
  return {
    prompt: `What are the coordinates of point ${target.label}?`,
    sublabel: 'Remember: x-coordinate first, then y-coordinate.',
    options,
    answerIndex,
    visual: { type: 'coordinates', points, min: -4, max: 4, caption: 'Read the grid precisely.' },
  };
};

const generateTransformQuestion = (): ChallengeQuestion => {
  const start = { x: randomInt(-3, 1), y: randomInt(-2, 3), label: 'A', tone: 'bg-amber-300' };
  const dx = pick([-3, -2, -1, 1, 2, 3]);
  const dy = pick([-3, -2, -1, 1, 2, 3]);
  const image = { x: clamp(start.x + dx, -4, 4), y: clamp(start.y + dy, -4, 4), label: "A'", tone: 'bg-sky-300' };
  const correct = `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`;
  const wrongCandidates = shuffle([
    `${Math.abs(dx)} ${dx > 0 ? 'left' : 'right'}, ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`,
    `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}, ${Math.abs(dy)} ${dy > 0 ? 'down' : 'up'}`,
    `${Math.abs(dy)} ${dy > 0 ? 'right' : 'left'}, ${Math.abs(dx)} ${dx > 0 ? 'up' : 'down'}`,
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongCandidates);
  return {
    prompt: `Which translation moves ${start.label} to ${image.label}?`,
    sublabel: 'Track horizontal movement first, then vertical.',
    options,
    answerIndex,
    visual: { type: 'coordinates', points: [start, image], min: -4, max: 4, caption: 'Original point and translated image' },
  };
};

const generateScaleQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 1);
  if (mode === 0) {
    const base = pick([150, 200, 250, 300]);
    const factor = pick([2, 3, 4]);
    const correct = base * factor;
    const { options, answerIndex } = makeOptions(`${correct} g`, shuffle([`${correct + base} g`, `${correct - base / 2} g`, `${factor * 100} g`]));
    return {
      prompt: `A recipe uses ${base} g of flour for 3 portions. How much is needed for ${3 * factor} portions?`,
      sublabel: 'Scale every ingredient by the same factor.',
      options,
      answerIndex,
      visual: { type: 'ratio', leftLabel: '3 portions', leftValue: `${base} g`, rightLabel: `${3 * factor} portions`, rightValue: '?', caption: 'Use proportional scaling.' },
    };
  }

  const conversions = pick([
    { from: 'm', to: 'cm', multiplier: 100 },
    { from: 'kg', to: 'g', multiplier: 1000 },
    { from: 'l', to: 'ml', multiplier: 1000 },
  ]);
  const value = conversions.from === 'm' ? randomInt(2, 9) : randomInt(1, 7);
  const correct = value * conversions.multiplier;
  const { options, answerIndex } = makeOptions(`${correct} ${conversions.to}`, shuffle([
    `${correct / 10} ${conversions.to}`,
    `${correct + conversions.multiplier} ${conversions.to}`,
    `${value * 10} ${conversions.to}`,
  ]));
  return {
    prompt: `Convert ${value} ${conversions.from} into ${conversions.to}.`,
    sublabel: 'Pick the correct scale factor for the units.',
    options,
    answerIndex,
    visual: { type: 'equation', lines: [`${value} ${conversions.from}`, `${conversions.multiplier} ${conversions.to} in 1 ${conversions.from}`], badge: 'Scale' },
  };
};

const generateChartQuestion = (): ChallengeQuestion => {
  const bars = shuffle([
    { label: 'Red', value: randomInt(2, 9), color: 'from-rose-400 to-orange-300' },
    { label: 'Blue', value: randomInt(2, 9), color: 'from-sky-400 to-cyan-300' },
    { label: 'Green', value: randomInt(2, 9), color: 'from-emerald-400 to-lime-300' },
    { label: 'Gold', value: randomInt(2, 9), color: 'from-amber-300 to-yellow-300' },
  ]);

  const mode = randomInt(0, 1);
  if (mode === 0) {
    const target = pick(bars);
    const { options, answerIndex } = makeOptions(String(target.value), shuffle(bars.filter((bar) => bar.label !== target.label).map((bar) => String(bar.value))));
    return {
      prompt: `How many were recorded in the ${target.label.toLowerCase()} bar?`,
      sublabel: 'Read the exact bar height.',
      options,
      answerIndex,
      visual: { type: 'bars', bars, caption: 'Bar chart reading' },
    };
  }

  const sorted = [...bars].sort((a, b) => b.value - a.value);
  const correct = sorted[0].label;
  const { options, answerIndex } = makeOptions(correct, shuffle(sorted.slice(1).map((bar) => bar.label)));
  return {
    prompt: 'Which bar shows the greatest value?',
    sublabel: 'Compare the heights, not just the colours.',
    options,
    answerIndex,
    visual: { type: 'bars', bars, caption: 'Find the tallest bar.' },
  };
};

const generateMeanQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 1);
  if (mode === 0) {
    const values = Array.from({ length: 4 }, () => randomInt(4, 18));
    const total = values.reduce((sum, value) => sum + value, 0);
    const mean = total / values.length;
    const { options, answerIndex } = makeOptions(String(mean), shuffle([String(mean + 1), String(mean - 1), String(total)]));
    return {
      prompt: `What is the mean of ${values.join(', ')}?`,
      sublabel: 'Add all the values, then divide by how many there are.',
      options,
      answerIndex,
      visual: { type: 'tokens', items: values.map(String), accent: 'blue' },
    };
  }

  const known = [randomInt(4, 9), randomInt(6, 12), randomInt(8, 15)];
  const targetMean = randomInt(8, 14);
  const targetTotal = targetMean * 4;
  const missing = targetTotal - known.reduce((sum, value) => sum + value, 0);
  const { options, answerIndex } = makeOptions(String(missing), shuffle([String(missing + 2), String(missing - 2), String(targetMean)]));
  return {
    prompt: `The mean of ${known[0]}, ${known[1]}, ${known[2]} and □ is ${targetMean}. What is □?`,
    sublabel: 'Work out the total needed, then find the missing part.',
    options,
    answerIndex,
    visual: { type: 'equation', lines: [`Mean = ${targetMean}`, `${known.join(' + ')} + □ = ${targetTotal}`], badge: 'Mean' },
  };
};

const generateEquationQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 2);
  if (mode === 0) {
    const x = randomInt(4, 15);
    const add = randomInt(5, 18);
    const total = x + add;
    const { options, answerIndex } = makeOptions(String(x), shuffle([String(x + 2), String(x - 1), String(total)]));
    return {
      prompt: `Solve x + ${add} = ${total}`,
      sublabel: 'Find the number that balances the equation.',
      options,
      answerIndex,
      visual: { type: 'equation', lines: [`x + ${add} = ${total}`, 'Balance both sides.'], badge: 'Equation' },
    };
  }

  if (mode === 1) {
    const x = randomInt(3, 12);
    const multiplier = pick([2, 3, 4, 5]);
    const total = x * multiplier;
    const { options, answerIndex } = makeOptions(String(x), shuffle([String(x + 1), String(total), String(multiplier)]));
    return {
      prompt: `Solve ${multiplier}x = ${total}`,
      sublabel: 'Undo the multiplication.',
      options,
      answerIndex,
      visual: { type: 'equation', lines: [`${multiplier}x = ${total}`, `x = ${x}`], badge: 'Grove' },
    };
  }

  const n = randomInt(2, 8);
  const correct = (3 * n) + 2;
  const { options, answerIndex } = makeOptions(String(correct), shuffle([String(correct + 3), String(correct - 2), String(n + 2)]));
  return {
    prompt: `If y = 3n + 2, what is y when n = ${n}?`,
    sublabel: 'Substitute the value first, then calculate.',
    options,
    answerIndex,
    visual: { type: 'equation', lines: ['y = 3n + 2', `n = ${n}`], badge: 'Formula' },
  };
};

const generateRuleRunnerQuestion = (): ChallengeQuestion => {
  const mode = randomInt(0, 1);
  if (mode === 0) {
    const start = randomInt(4, 18);
    const step = pick([2, 3, 4, 5, 10]);
    const values = [start, start + step, start + step * 2, '?', start + step * 4].map(String);
    const correct = String(start + step * 3);
    const { options, answerIndex } = makeOptions(correct, shuffle([String(start + step * 5), String(start + step * 2 + 1), String(start + step * 3 - 2)]));
    return {
      prompt: 'What number completes the sequence?',
      sublabel: 'Look for the constant step between terms.',
      options,
      answerIndex,
      visual: { type: 'sequence', values, caption: `Rule: +${step}` },
    };
  }

  const input = randomInt(2, 9);
  const multiplier = pick([2, 3, 4]);
  const addition = pick([1, 2, 3, 5]);
  const correct = String((input * multiplier) + addition);
  const { options, answerIndex } = makeOptions(correct, shuffle([String((input + addition) * multiplier), String((input * multiplier) - addition), String(input + multiplier + addition)]));
  return {
    prompt: `A function machine does ×${multiplier}, then +${addition}. What is the output for ${input}?`,
    sublabel: 'Apply the operations in the correct order.',
    options,
    answerIndex,
    visual: { type: 'ratio', leftLabel: 'Input', leftValue: String(input), rightLabel: 'Output', rightValue: '?', caption: `×${multiplier} then +${addition}` },
  };
};

const renderCoordinates = (visual: Extract<VisualData, { type: 'coordinates' }>) => {
  const span = visual.max - visual.min + 1;
  const points = visual.points.map((point) => ({
    ...point,
    left: 4 + (((point.x - visual.min) / (span - 1)) * 92),
    top: 4 + (100 - (((point.y - visual.min) / (span - 1)) * 100)) * 0.92,
  }));

  return (
    <div className="relative aspect-square w-full max-w-[16rem] md:max-w-[22rem] rounded-[1.4rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0.16))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div
        className="absolute inset-4 grid"
        style={{
          gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${span}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: span * span }).map((_, index) => (
          <div key={index} className="border border-white/8" />
        ))}
      </div>
      <div className="absolute inset-y-4 left-1/2 w-px bg-white/18" />
      <div className="absolute inset-x-4 top-1/2 h-px bg-white/18" />
      {points.map((point) => (
        <div
          key={point.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${point.left}%`, top: `${point.top}%` }}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/40 ${point.tone || 'bg-cyan-300'} text-[11px] font-black text-slate-950 shadow-[0_8px_18px_rgba(0,0,0,0.3)]`}>
            {point.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderVisual = (visual: VisualData) => {
  switch (visual.type) {
    case 'tokens':
      return (
        <div className="grid w-full max-w-[24rem] grid-cols-2 gap-3">
          {visual.items.map((item) => (
          <div key={item} className="rounded-[1.2rem] border border-white/12 bg-white/8 px-3 py-2.5 text-center text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:py-3 md:text-lg">
              {item}
            </div>
          ))}
        </div>
      );
    case 'equation':
      return (
        <div className="w-full max-w-[24rem] rounded-[1.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 md:p-5 text-center shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          {visual.badge && (
            <div className="mb-3 inline-flex rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
              {visual.badge}
            </div>
          )}
          <div className="space-y-2">
            {visual.lines.map((line) => (
              <div key={line} className="text-base font-black text-white md:text-3xl">
                {line}
              </div>
            ))}
          </div>
        </div>
      );
    case 'bars':
      return (
        <div className="flex w-full max-w-[24rem] items-end justify-between gap-2 md:gap-3 rounded-[1.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-3 md:px-4 pb-3 md:pb-4 pt-6 md:pt-8 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          {visual.bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">{bar.value}</div>
              <div className="flex h-28 md:h-40 w-full items-end rounded-t-[1rem] border border-white/10 bg-white/6 p-1">
                <div className={`w-full rounded-[0.8rem] bg-gradient-to-t ${bar.color}`} style={{ height: `${Math.max(18, bar.value * 10)}%` }} />
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/80">{bar.label}</div>
            </div>
          ))}
        </div>
      );
    case 'coordinates':
      return renderCoordinates(visual);
    case 'sequence':
      return (
        <div className="flex w-full max-w-[26rem] flex-wrap items-center justify-center gap-2 rounded-[1.6rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-3 md:px-4 py-4 md:py-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
          {visual.values.map((value, index) => (
            <React.Fragment key={`${value}-${index}`}>
                <div className="flex h-12 min-w-[3rem] items-center justify-center rounded-[1rem] border border-white/12 bg-white/10 px-2.5 text-base font-black text-white md:h-16 md:min-w-[4.5rem] md:px-3 md:text-2xl">
                {value}
              </div>
              {index < visual.values.length - 1 && <div className="text-white/55">→</div>}
            </React.Fragment>
          ))}
        </div>
      );
    case 'ratio':
      return (
        <div className="grid w-full max-w-[24rem] grid-cols-2 gap-3">
            <div className="rounded-[1.3rem] border border-white/12 bg-white/10 p-3 md:p-4 text-center shadow-[0_16px_34px_rgba(0,0,0,0.2)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">{visual.leftLabel}</div>
              <div className="mt-1.5 md:mt-2 text-xl font-black text-white md:text-3xl">{visual.leftValue}</div>
          </div>
            <div className="rounded-[1.3rem] border border-white/12 bg-white/10 p-3 md:p-4 text-center shadow-[0_16px_34px_rgba(0,0,0,0.2)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">{visual.rightLabel}</div>
              <div className="mt-1.5 md:mt-2 text-xl font-black text-white md:text-3xl">{visual.rightValue}</div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const generateQuestion = (gameType: SupportedChallengeGameType): ChallengeQuestion => {
  switch (gameType) {
    case 'place_value_peaks':
      return generatePlaceValueQuestion();
    case 'calculation_clash':
      return generateCalculationQuestion();
    case 'percent_pulse':
      return generatePercentQuestion();
    case 'coordinate_quest':
      return generateCoordinateQuestion();
    case 'transform_temple':
      return generateTransformQuestion();
    case 'scale_safari':
      return generateScaleQuestion();
    case 'chart_chase':
      return generateChartQuestion();
    case 'mean_machine':
      return generateMeanQuestion();
    case 'equation_grove':
      return generateEquationQuestion();
    case 'rule_runner':
    default:
      return generateRuleRunnerQuestion();
  }
};

const CurriculumChallengeGame: React.FC<CurriculumChallengeGameProps> = ({
  gameType,
  levelId,
  avatarId,
  isBoss = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(95 + (levelId * QUESTION_TIME_BONUS));
  const [streak, setStreak] = useState(0);
  const [question, setQuestion] = useState<ChallengeQuestion>(() => generateQuestion(gameType));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Keep your streak alive and stay accurate.');
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const scoreRef = useRef(0);

  const theme = CHALLENGE_THEMES[gameType];
  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 780 + (levelId * 180);
  const progress = Math.min((score / targetScore) * 100, 100);
  const meta = GAME_META[gameType];
  const visualCaption = 'caption' in question.visual ? question.visual.caption : undefined;
  const bossEncounter = isBoss ? getBossEncounter(gameType) : undefined;
  const bossPose = !bossEncounter
    ? 'neutral'
    : isVictory
      ? 'defeat'
      : isGameOver
        ? 'victory'
        : feedback === 'correct'
          ? 'dazed'
          : feedback === 'incorrect'
            ? 'attack'
            : streak >= 2
              ? 'happy'
              : 'neutral';

  const resetRound = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(95 + (levelId * QUESTION_TIME_BONUS));
    setStreak(0);
    setSelectedIndex(null);
    setFeedback(null);
    setQuestion(generateQuestion(gameType));
    setStatusMessage('Keep your streak alive and stay accurate.');
    setIsVictory(false);
    setIsGameOver(false);
  }, [gameType, levelId]);

  useEffect(() => {
    resetRound();
  }, [resetRound]);

  useEffect(() => {
    if (isVictory || isGameOver) return undefined;
    if (timeLeft <= 0) {
      if (scoreRef.current >= targetScore) {
        const stars = scoreRef.current >= targetScore * 1.9 ? 3 : scoreRef.current >= targetScore * 1.35 ? 2 : 1;
        setIsVictory(true);
        confetti({
          particleCount: 180,
          spread: 70,
          origin: { y: 0.58 },
          colors: ['#fde68a', '#fef3c7', '#ffffff'],
        });
        onVictory(stars, scoreRef.current);
      } else {
        setIsGameOver(true);
        onGameOver(scoreRef.current);
      }
      return undefined;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isGameOver, isVictory, onGameOver, onVictory, targetScore, timeLeft]);

  const handleAnswer = (index: number) => {
    if (feedback || isVictory || isGameOver) return;

    const isCorrect = index === question.answerIndex;
    setSelectedIndex(index);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      const points = 110 + (streak * 20);
      const newScore = scoreRef.current + points;
      triggerHaptic('success');
      scoreRef.current = newScore;
      setScore(newScore);
      setStreak((prev) => prev + 1);
      setStatusMessage(`Correct. +${points} and your streak grows.`);

      if (newScore >= targetScore) {
        const stars = newScore >= targetScore * 1.9 ? 3 : newScore >= targetScore * 1.35 ? 2 : 1;
        setTimeout(() => {
          setIsVictory(true);
          confetti({
            particleCount: 180,
            spread: 70,
            origin: { y: 0.58 },
            colors: ['#fde68a', '#fef3c7', '#ffffff'],
          });
          onVictory(stars, newScore);
        }, 550);
        return;
      }
    } else {
      triggerHaptic('warning');
      setStreak(0);
      setTimeLeft((prev) => Math.max(0, prev - 3));
      setStatusMessage('Not this time. Reset and read the clue again.');
    }

    setTimeout(() => {
      setQuestion(generateQuestion(gameType));
      setSelectedIndex(null);
      setFeedback(null);
    }, 650);
  };

  const resultStars = useMemo(() => (
    score >= targetScore * 1.9 ? 3 : score >= targetScore * 1.35 ? 2 : 1
  ), [score, targetScore]);

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden ${theme.ambient} px-1.5 pb-1.5 pt-1 md:px-4 md:pb-4`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.scene}`} />
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-1.5 md:gap-4">
        <GameplayHUD
          title={theme.title}
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText={theme.statText}
          accentSoftBg={theme.statSoftBg}
          accentBorder={theme.statBorder}
          progressBar={theme.progress}
          statLabel="Streak"
          statValue={streak}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_24px_64px_rgba(0,0,0,0.28)] md:rounded-[2.6rem]">
          <div className="absolute inset-x-4 top-2.5 z-20 flex justify-center md:top-4">
            <div className={`rounded-full border border-white/12 bg-black/28 px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.18em] shadow-[0_12px_24px_rgba(0,0,0,0.3)] backdrop-blur-md md:px-4 md:py-2 md:text-xs ${theme.badge}`}>
              {meta.focus}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[0.98fr_1.02fr] gap-1.5 p-2.5 pt-14 md:gap-3 md:p-4 md:pt-18 lg:grid-cols-[1.04fr_0.96fr] lg:grid-rows-1 lg:pt-16">
            <div className={`relative min-h-0 overflow-hidden rounded-[1.4rem] border border-white/12 bg-gradient-to-br ${theme.surface} p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[2rem] md:p-5`}>
              <div className={`absolute inset-x-5 top-0 h-28 rounded-full bg-gradient-to-br ${theme.prompt} blur-3xl`} />
              <div className="relative flex h-full min-h-0 flex-col">
                <div className="shrink-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/55 md:text-[11px]">Challenge Prompt</div>
                  <div className="mt-1.5 text-lg font-black leading-tight text-white md:mt-2 md:text-3xl">{question.prompt}</div>
                  <div className="mt-1.5 max-w-xl text-[11px] font-semibold text-white/72 md:mt-2 md:text-sm">{question.sublabel}</div>
                </div>

                <motion.div
                  key={`${question.prompt}-${question.sublabel}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex min-h-0 flex-1 items-center justify-center py-2 md:py-4"
                >
                  {renderVisual(question.visual)}
                </motion.div>

                <div className="shrink-0 rounded-[1.1rem] border border-white/10 bg-black/22 px-3 py-2.5 text-center text-[10px] font-bold text-white/84 shadow-[0_12px_24px_rgba(0,0,0,0.18)] md:rounded-[1.2rem] md:px-4 md:py-3 md:text-sm">
                  {visualCaption || statusMessage}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-1.5 md:gap-3">
              {bossEncounter && (
                <BossPortrait encounter={bossEncounter} pose={bossPose} compact className="shrink-0" />
              )}
              <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-3 lg:grid-cols-1 xl:grid-cols-2">
                {question.options.map((option, index) => {
                  const isSelected = index === selectedIndex;
                  const isCorrect = feedback === 'correct' && index === question.answerIndex;
                  const isWrongSelected = feedback === 'incorrect' && isSelected;

                  return (
                    <motion.button
                      key={`${question.prompt}-${option}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswer(index)}
                      disabled={Boolean(feedback) || isVictory || isGameOver}
                      className={`min-h-[4rem] rounded-[1.2rem] border px-3 py-3 text-left shadow-[0_14px_30px_rgba(0,0,0,0.16)] transition-all md:min-h-[5.25rem] md:rounded-[1.4rem] md:px-4 md:py-4 ${isCorrect
                        ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-300/55 to-lime-300/45 text-emerald-950'
                        : isWrongSelected
                          ? 'border-rose-200/80 bg-gradient-to-br from-rose-300/55 to-orange-300/45 text-rose-950'
                          : isSelected
                            ? `border-white/20 bg-gradient-to-br ${theme.answerActive} text-slate-950`
                            : `border-white/12 bg-gradient-to-br ${theme.answer} text-white hover:bg-white/14`}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full border text-[10px] md:text-[11px] font-black uppercase ${isCorrect || isWrongSelected || isSelected ? 'border-black/10 bg-white/35' : 'border-white/12 bg-white/8'}`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <div className="text-[13px] font-black leading-tight md:text-lg">{option}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="grid flex-1 min-h-0 grid-cols-2 gap-1.5 md:gap-3">
                <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.16)] md:rounded-[1.6rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50 md:text-[10px] md:tracking-[0.22em]">Status</div>
                  <div className="mt-1.5 text-[11px] font-black leading-tight text-white md:mt-2 md:text-lg">{statusMessage}</div>
                </div>
                <div className="rounded-[1.1rem] border border-white/10 bg-black/20 p-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.16)] md:rounded-[1.6rem] md:p-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50 md:text-[10px] md:tracking-[0.22em]">Target</div>
                  <div className="mt-1.5 text-xl font-black text-white md:mt-2 md:text-4xl">{targetScore}</div>
                  <div className="mt-1 text-[10px] font-semibold text-white/60 md:text-[11px]">Hit the target before time ends.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />

        <AnimatePresence>
          {(isVictory || isGameOver) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(255,247,228,0.98),rgba(245,232,202,0.96))] p-6 text-slate-900 shadow-[0_24px_70px_rgba(0,0,0,0.32)] md:gap-6 md:p-8">
                <div className={`text-center text-4xl font-black ${isVictory ? 'text-emerald-600' : 'text-rose-600'} md:text-5xl`}>
                  {isVictory ? 'Challenge Cleared' : 'Round Over'}
                </div>
                <div className="text-center text-sm font-semibold text-slate-600 md:text-base">
                  {isVictory ? 'You hit the SATs target with a premium run.' : 'You ran out of time before reaching the target score.'}
                </div>

                <div className="flex gap-2">
                  {[1, 2, 3].map((index) => (
                    <Star key={index} className={`h-14 w-14 ${index <= resultStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                  ))}
                </div>

                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] bg-white/80 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Score</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{score}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/80 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Best Streak</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{streak}</div>
                  </div>
                </div>

                <button onClick={onBack} className="licensed-submit-button w-full rounded-[1.2rem] py-3.5 text-base font-black text-white">
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CurriculumChallengeGame;
