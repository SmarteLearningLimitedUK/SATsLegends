import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import {
  type BarDatum,
  type ChallengeQuestion,
  getSatsInspiredChallengeQuestion,
  type CoordinatePoint,
  type SupportedChallengeGameType,
  type VisualData,
} from '../systems/content/satsInspiredQuestionBanks';
import { getBossEncounter } from '../bossMeta';
import { GAME_META } from '../gameMeta';
import { triggerHaptic } from '../haptics';
import BossPortrait from '../components/BossPortrait';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import GameplayHUD from '../components/GameplayHUD';
import { Star } from '../components/GameIcons';
import answerActionBg from '../assets/casual_ui/inputs/btn_1.png';
import answerDecorAsset from '../assets/casual_ui/dialogs_panels/dialog__tag.png';
import answerOrangeBg from '../assets/casual_ui/inputs/btn_1.png';
import answerGreenBg from '../assets/casual_ui/inputs/btn_6a.png';
import answerBlueBg from '../assets/casual_ui/inputs/btn_7.png';
import answerYellowBg from '../assets/casual_ui/inputs/btn_8.png';

interface CurriculumChallengeGameProps {
  gameType: SupportedChallengeGameType;
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
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
    surface: 'from-sky-300/18 via-cyan-200/12 to-slate-950/86',
    scene: 'from-cyan-300/18 via-blue-300/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.24),transparent_30%),linear-gradient(180deg,#0d2742_0%,#07111b_100%)]',
    prompt: 'from-sky-200/22 to-cyan-100/10',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-cyan-300/56 to-blue-400/48',
    statText: 'text-sky-950',
    statSoftBg: 'bg-sky-100/86',
    statBorder: 'border-sky-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-yellow-300',
    badge: 'text-cyan-100',
  },
  percent_pulse: {
    title: 'Percent Pulse',
    surface: 'from-cyan-300/28 via-sky-300/16 to-slate-950/88',
    scene: 'from-cyan-300/22 via-cyan-300/18 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(232,121,249,0.26),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.2),transparent_24%),linear-gradient(180deg,#1f1241_0%,#07111b_100%)]',
    prompt: 'from-cyan-200/28 to-cyan-100/12',
    answer: 'from-cyan-200/10 via-sky-200/8 to-white/4',
    answerActive: 'from-cyan-300/62 via-cyan-300/58 to-blue-400/48',
    statText: 'text-cyan-950',
    statSoftBg: 'bg-cyan-100/85',
    statBorder: 'border-cyan-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-cyan-300 to-sky-400',
    badge: 'text-cyan-100',
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
    title: 'Scale Builder',
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
    surface: 'from-blue-300/18 via-indigo-200/12 to-slate-950/86',
    scene: 'from-sky-300/18 via-indigo-200/12 to-transparent',
    ambient: 'bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.2),transparent_28%),linear-gradient(180deg,#1c173b_0%,#091018_100%)]',
    prompt: 'from-sky-200/18 to-indigo-100/8',
    answer: 'from-white/10 to-white/4',
    answerActive: 'from-sky-300/55 to-indigo-400/48',
    statText: 'text-sky-950',
    statSoftBg: 'bg-sky-100/85',
    statBorder: 'border-sky-200/90',
    progress: 'bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-400',
    badge: 'text-sky-100',
  },
};

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatCoordinate = (point: { x: number; y: number }) => `(${point.x}, ${point.y})`;
const formatChallengeNumber = (value: number) => value.toLocaleString('en-GB', { maximumFractionDigits: 2 });

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
      visual: {
        type: 'pulse',
        centerLabel: promptForm,
        orbitLabels: [...forms.filter((item) => item !== promptForm), 'Same pulse'],
        meterValue: Number.parseFloat(sample.percent),
        meterLabel: sample.percent,
        caption: 'Read the glow and find the equivalent form.',
      },
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
    visual: {
      type: 'pulse',
      centerLabel: `${percent}%`,
      orbitLabels: [`Whole ${amount}`, `1% = ${formatChallengeNumber(amount / 100)}`, 'Find the share'],
      meterValue: percent,
      meterLabel: `${percent}% target`,
      caption: 'Charge the pulse by spotting the correct portion.',
    },
  };
};

const generateCoordinateQuestion = (): ChallengeQuestion => {
  const points = shuffle(['A', 'B', 'C', 'D']).slice(0, 4).map((label) => ({
    label,
    x: randomInt(-4, 4),
    y: randomInt(-4, 4),
    tone: label === 'A' ? 'bg-cyan-300' : label === 'B' ? 'bg-emerald-300' : 'bg-sky-300',
  }));
  const target = pick(points);
  const correct = formatCoordinate(target);
  const wrong = shuffle(points.filter((point) => point.label !== target.label).map((point) => formatCoordinate(point)));
  while (wrong.length < 3) {
    wrong.push(formatCoordinate({ x: clamp(target.x + randomInt(-2, 2), -4, 4), y: clamp(target.y + randomInt(-2, 2), -4, 4) }));
  }
  const { options, answerIndex } = makeOptions(correct, wrong);
  return {
    prompt: `Guide the scout to beacon ${target.label}. Which coordinates lock in the route?`,
    sublabel: 'Start from the centre, move along x first, then y.',
    options,
    answerIndex,
    visual: { type: 'coordinates', points, min: -4, max: 4, caption: 'Plot the beacon and claim the route.', targetLabel: target.label },
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
    visual: { type: 'transform', start, image, min: -4, max: 4, caption: 'Trace the glowing rune route from the original point to its image.' },
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
  const originLeft = 4 + (((0 - visual.min) / (span - 1)) * 92);
  const originTop = 4 + (100 - (((0 - visual.min) / (span - 1)) * 100)) * 0.92;
  const points = visual.points.map((point) => ({
    ...point,
    left: 4 + (((point.x - visual.min) / (span - 1)) * 92),
    top: 4 + (100 - (((point.y - visual.min) / (span - 1)) * 100)) * 0.92,
    isTarget: point.label === visual.targetLabel,
  }));
  const targetPoint = points.find((point) => point.isTarget);
  const dx = targetPoint ? targetPoint.left - originLeft : 0;
  const dy = targetPoint ? targetPoint.top - originTop : 0;
  const routeLength = Math.sqrt((dx ** 2) + (dy ** 2));
  const routeAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div className="relative aspect-square w-full max-w-[17rem] overflow-hidden rounded-[1.5rem] border border-[#f2d182]/35 bg-[linear-gradient(180deg,rgba(14,34,48,0.88),rgba(8,18,30,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_50px_rgba(2,6,23,0.28)] md:max-w-[22rem] md:rounded-[1.8rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.18),rgba(186,230,253,0)_30%),radial-gradient(circle_at_bottom,rgba(34,197,94,0.16),rgba(34,197,94,0)_26%)]" />
      <div className="absolute inset-[0.85rem] rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] md:inset-4 md:rounded-[1.4rem]" />
      <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-[#f2d182]/35 bg-black/24 px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#fff1c2] shadow-[0_12px_24px_rgba(0,0,0,0.22)] md:top-4 md:text-[10px]">
        Quest Grid
      </div>
      <div
        className="absolute inset-4 grid"
        style={{
          gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${span}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: span * span }).map((_, index) => (
          <div key={index} className="border border-white/6" />
        ))}
      </div>
      <div className="absolute inset-y-4 left-1/2 w-px bg-white/18" />
      <div className="absolute inset-x-4 top-1/2 h-px bg-white/18" />
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/45 md:text-[10px]">W</div>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/45 md:text-[10px]">E</div>
      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/45 md:text-[10px]">N</div>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-white/45 md:text-[10px]">S</div>
      {targetPoint && (
        <div
          className="absolute left-0 top-0 h-[2px] origin-left rounded-full bg-[linear-gradient(90deg,rgba(125,211,252,0.16),rgba(255,226,128,0.95))] shadow-[0_0_14px_rgba(125,211,252,0.32)]"
          style={{
            left: `${originLeft}%`,
            top: `${originTop}%`,
            width: `${routeLength}%`,
            transform: `rotate(${routeAngle}deg)`,
          }}
        />
      )}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${originLeft}%`, top: `${originTop}%` }}
      >
        <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/50 bg-[linear-gradient(180deg,#f8fafc,#bfdbfe)] text-[9px] font-black uppercase text-slate-950 shadow-[0_10px_20px_rgba(0,0,0,0.28)] md:h-8 md:w-8">
          S
          <div className="absolute inset-[-5px] rounded-full border border-cyan-200/28" />
        </div>
      </div>
      {points.map((point) => (
        <div
          key={point.label}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${point.left}%`, top: `${point.top}%` }}
        >
          <div className="relative">
            {point.isTarget && (
              <>
                <motion.div
                  animate={{ scale: [0.94, 1.18, 0.94], opacity: [0.24, 0.62, 0.24] }}
                  transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-[-8px] rounded-full border border-yellow-300/55"
                />
                <motion.div
                  animate={{ scale: [1, 1.32, 1], opacity: [0.16, 0.38, 0.16] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-[-16px] rounded-full border border-cyan-200/28"
                />
              </>
            )}
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 ${point.isTarget ? 'border-yellow-100/90 ring-2 ring-yellow-300/40' : 'border-white/40'} ${point.tone || 'bg-cyan-300'} text-[11px] font-black text-slate-950 shadow-[0_8px_18px_rgba(0,0,0,0.3)] md:h-9 md:w-9`}>
              {point.label}
            </div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/26 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/78 shadow-[0_12px_24px_rgba(0,0,0,0.18)] md:bottom-4 md:text-[10px]">
        <span className="inline-flex h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.55)]" />
        Beacon {visual.targetLabel}
      </div>
    </div>
  );
};

const renderPercentPulse = (visual: Extract<VisualData, { type: 'pulse' }>) => {
  const orbitPositions = [
    'left-3 top-3 md:left-5 md:top-5',
    'right-3 top-6 md:right-6 md:top-8',
    'left-1/2 bottom-12 -translate-x-1/2 md:bottom-14',
  ];

  return (
    <div className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.5rem] border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(32,14,66,0.96),rgba(7,18,32,0.98))] p-3 shadow-[0_24px_50px_rgba(0,0,0,0.3)] md:max-w-[24rem] md:rounded-[1.8rem] md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,121,249,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />
      <div className="absolute left-4 top-4 h-16 w-16 rounded-full bg-cyan-300/18 blur-2xl md:h-24 md:w-24" />
      <div className="absolute bottom-3 right-4 h-16 w-16 rounded-full bg-cyan-300/16 blur-2xl md:h-24 md:w-24" />

      <div className="relative flex flex-col items-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/18 bg-white/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100 md:mb-3 md:px-3 md:text-[10px]">
          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.7)]" />
          Pulse Lane
        </div>

        <div className="relative flex h-44 w-full items-center justify-center md:h-56">
          <motion.div
            animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.2, 0.42, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-28 w-28 rounded-full border border-cyan-200/28 md:h-36 md:w-36"
          />
          <motion.div
            animate={{ scale: [1, 1.22, 1], opacity: [0.16, 0.34, 0.16] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-36 w-36 rounded-full border border-cyan-200/18 md:h-48 md:w-48"
          />
          <motion.div
            animate={{ y: [0, -4, 0], boxShadow: ['0 18px 36px rgba(34,211,238,0.16)', '0 26px 48px rgba(232,121,249,0.24)', '0 18px 36px rgba(34,211,238,0.16)'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/18 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.34),rgba(34,211,238,0.26)_34%,rgba(232,121,249,0.42)_70%,rgba(30,41,59,0.92)_100%)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] md:h-32 md:w-32"
          >
            <div className="absolute inset-[10%] rounded-full border border-white/12 bg-slate-950/28" />
            <span className="relative px-2 text-[1.05rem] font-black leading-none text-white drop-shadow-[0_6px_14px_rgba(15,23,42,0.48)] md:text-[1.55rem]">
              {visual.centerLabel}
            </span>
          </motion.div>

          {visual.orbitLabels.slice(0, 3).map((label, index) => (
            <motion.div
              key={`${label}-${index}`}
              animate={{ y: [0, index === 1 ? -5 : -3, 0], x: [0, index === 2 ? 2 : -1, 0] }}
              transition={{ duration: 2.2 + (index * 0.35), repeat: Infinity, ease: 'easeInOut' }}
              className={`absolute ${orbitPositions[index]} rounded-full border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-2.5 py-1.5 text-[10px] font-black text-white shadow-[0_12px_22px_rgba(0,0,0,0.22)] md:px-3 md:py-2 md:text-xs`}
            >
              {label}
            </motion.div>
          ))}
        </div>

        <div className="mt-1 w-full rounded-[1rem] border border-white/10 bg-slate-950/30 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:mt-2 md:rounded-[1.2rem] md:p-3">
          <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.18em] text-white/60 md:text-[10px]">
            <span>Pulse Meter</span>
            <span>{visual.meterLabel}</span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full border border-white/10 bg-white/6 md:h-5">
            <motion.div
              initial={false}
              animate={{ width: `${clamp(visual.meterValue, 8, 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                      className="relative h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#38bdf8_50%,#4ade80_100%)] shadow-[0_0_18px_rgba(56,189,248,0.38)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.16),rgba(255,255,255,0.52),rgba(255,255,255,0.16))] bg-[length:180%_100%] animate-[hud-shine_2.2s_linear_infinite]" />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderTransformTemple = (visual: Extract<VisualData, { type: 'transform' }>) => {
  const size = visual.max - visual.min + 1;
  const toPercent = (value: number) => ((value - visual.min) / (size - 1)) * 100;
  const startLeft = toPercent(visual.start.x);
  const startTop = 100 - toPercent(visual.start.y);
  const endLeft = toPercent(visual.image.x);
  const endTop = 100 - toPercent(visual.image.y);
  const midLeft = endLeft;
  const midTop = startTop;
  const dx = visual.image.x - visual.start.x;
  const dy = visual.image.y - visual.start.y;

  return (
    <div className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.5rem] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(57,39,17,0.96),rgba(15,15,18,0.98))] p-3 shadow-[0_24px_50px_rgba(0,0,0,0.32)] md:max-w-[24rem] md:rounded-[1.8rem] md:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_24%)]" />
      <div className="absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />

      <div className="relative flex flex-col items-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200/18 bg-white/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-amber-100 md:mb-3 md:px-3 md:text-[10px]">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]" />
          Temple Route
        </div>

        <div className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-[1.3rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.88),rgba(15,23,42,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:max-w-[19rem]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" style={{ backgroundSize: `${100 / size}% ${100 / size}%` }} />
          <div className="absolute inset-x-[8%] top-[8%] bottom-[8%] rounded-[1.1rem] border border-amber-200/12" />

          <motion.div
            animate={{ opacity: [0.45, 0.95, 0.45] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute h-[2px] origin-left bg-[linear-gradient(90deg,rgba(251,191,36,0.16),rgba(251,191,36,0.88),rgba(56,189,248,0.6))] shadow-[0_0_14px_rgba(251,191,36,0.4)]"
            style={{
              left: `${Math.min(startLeft, midLeft)}%`,
              top: `${startTop}%`,
              width: `${Math.abs(midLeft - startLeft)}%`,
            }}
          />
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute w-[2px] origin-top bg-[linear-gradient(180deg,rgba(56,189,248,0.2),rgba(56,189,248,0.9),rgba(250,204,21,0.42))] shadow-[0_0_14px_rgba(56,189,248,0.38)]"
            style={{
              left: `${endLeft}%`,
              top: `${Math.min(startTop, endTop)}%`,
              height: `${Math.abs(endTop - startTop)}%`,
            }}
          />

          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${startLeft}%`, top: `${startTop}%` }}>
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-11 w-11 items-center justify-center rounded-[1rem] border border-amber-100/70 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.42),rgba(252,211,77,0.86)_38%,rgba(146,64,14,0.92)_100%)] text-sm font-black text-amber-950 shadow-[0_14px_24px_rgba(0,0,0,0.34)]"
            >
              {visual.start.label}
            </motion.div>
          </div>

          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${endLeft}%`, top: `${endTop}%` }}>
            <motion.div
              animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 0 rgba(56,189,248,0.2)', '0 0 24px rgba(56,189,248,0.42)', '0 0 0 rgba(56,189,248,0.2)'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-11 w-11 items-center justify-center rounded-[1rem] border border-sky-100/70 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.42),rgba(125,211,252,0.9)_36%,rgba(29,78,216,0.96)_100%)] text-sm font-black text-sky-950 shadow-[0_14px_24px_rgba(0,0,0,0.34)]"
            >
              {visual.image.label}
            </motion.div>
          </div>

          <div className="absolute bottom-3 left-3 flex gap-1.5 md:bottom-4 md:left-4">
            <div className="rounded-full border border-amber-200/16 bg-black/24 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/80">
              Horizontal move {Math.abs(dx)}
            </div>
            <div className="rounded-full border border-sky-200/16 bg-black/24 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100/80">
              Vertical move {Math.abs(dy)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderVisual = (visual: VisualData) => {
  switch (visual.type) {
    case 'tokens':
      if (visual.accent === 'amber' || visual.accent === 'emerald') {
        return (
          <div className="w-full max-w-[24rem] rounded-[1.4rem] border border-amber-200/12 bg-[linear-gradient(180deg,rgba(48,22,12,0.72),rgba(24,18,14,0.92))] p-3 shadow-[0_20px_44px_rgba(0,0,0,0.28)] md:max-w-[30rem] md:rounded-[1.8rem] md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-[1rem] border border-orange-200/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-3 py-2 md:mb-4 md:rounded-[1.2rem] md:px-4">
              <div className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-orange-100/72 md:text-[0.72rem]">Number Dash</div>
              <div className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-amber-100/72 md:text-[0.72rem]">Pick Fast</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              {visual.items.map((item, index) => (
                <motion.div
                  key={item}
                  animate={{ y: [0, index % 2 === 0 ? -2 : 2, 0] }}
                  transition={{ duration: 2.4 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-[1rem] border border-stone-400/30 bg-[linear-gradient(180deg,rgba(132,94,64,0.88),rgba(84,58,40,0.96))] px-2 py-3 text-center text-[1.1rem] font-black text-amber-50 shadow-[inset_0_2px_0_rgba(255,255,255,0.12),0_10px_0_rgba(41,24,14,0.72),0_18px_26px_rgba(0,0,0,0.24)] md:rounded-[1.25rem] md:px-3 md:py-4 md:text-[1.8rem]"
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="grid w-full max-w-[22rem] grid-cols-2 gap-2 md:max-w-[24rem] md:gap-3">
          {visual.items.map((item) => (
          <div key={item} className="rounded-[1rem] border border-white/12 bg-white/8 px-2.5 py-2 text-center text-[11px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:rounded-[1.2rem] md:px-3 md:py-3 md:text-lg">
              {item}
            </div>
          ))}
        </div>
      );
    case 'equation':
      if (visual.badge === 'BODMAS' || visual.badge === 'Clash') {
        return (
          <div className="relative w-full max-w-[22rem] overflow-hidden rounded-[1.3rem] border border-sky-200/24 bg-[linear-gradient(180deg,rgba(8,33,58,0.92),rgba(10,19,35,0.98))] p-3 text-center shadow-[0_24px_48px_rgba(0,0,0,0.28)] md:max-w-[24rem] md:rounded-[1.6rem] md:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.22),rgba(56,189,248,0)_34%),radial-gradient(circle_at_bottom,rgba(250,204,21,0.14),rgba(250,204,21,0)_30%)]" />
            <div className="absolute left-3 top-3 h-14 w-14 rounded-full bg-sky-300/16 blur-2xl md:h-20 md:w-20" />
            <div className="absolute bottom-3 right-3 h-14 w-14 rounded-full bg-cyan-300/16 blur-2xl md:h-20 md:w-20" />
            <div className="relative">
              {visual.badge && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-sky-200/28 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-sky-100 md:mb-3 md:px-3 md:text-[10px] md:tracking-[0.22em]">
                  <span className="inline-flex h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.55)]" />
                  {visual.badge}
                </div>
              )}
              <div className="mb-2 flex items-center justify-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.2em] text-cyan-100/72 md:mb-3 md:text-[0.78rem]">
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1">Strike</span>
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1">Solve</span>
                <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1">Score</span>
              </div>
              <div className="space-y-2">
                {visual.lines.map((line, index) => (
                  <motion.div
                    key={line}
                    animate={index === 0 ? { y: [0, -2, 0], scale: [1, 1.02, 1] } : undefined}
                    transition={index === 0 ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
                    className={`${index === 0 ? 'rounded-[1.1rem] border border-sky-200/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05))] px-3 py-3 text-[1.3rem] md:text-[2.15rem]' : 'text-[0.95rem] md:text-[1.2rem]'} font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`}
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="w-full max-w-[22rem] rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-3 text-center shadow-[0_18px_44px_rgba(0,0,0,0.22)] md:max-w-[24rem] md:rounded-[1.5rem] md:p-5">
          {visual.badge && (
            <div className="mb-2 inline-flex rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/70 md:mb-3 md:px-3 md:text-[10px] md:tracking-[0.22em]">
              {visual.badge}
            </div>
          )}
          <div className="space-y-1.5 md:space-y-2">
            {visual.lines.map((line) => (
              <div key={line} className="text-[1.1rem] font-black text-white md:text-3xl">
                {line}
              </div>
            ))}
          </div>
        </div>
      );
    case 'bars':
      return (
        <div className="flex w-full max-w-[22rem] items-end justify-between gap-1.5 rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-2.5 pb-2.5 pt-4 shadow-[0_18px_44px_rgba(0,0,0,0.22)] md:max-w-[24rem] md:gap-3 md:rounded-[1.5rem] md:px-4 md:pb-4 md:pt-8">
          {visual.bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5 md:gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/55 md:text-[10px] md:tracking-[0.18em]">{bar.value}</div>
              <div className="flex h-20 md:h-40 w-full items-end rounded-t-[0.8rem] border border-white/10 bg-white/6 p-1 md:rounded-t-[1rem]">
                <div className={`w-full rounded-[0.8rem] bg-gradient-to-t ${bar.color}`} style={{ height: `${Math.max(18, bar.value * 10)}%` }} />
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/80 md:text-[11px] md:tracking-[0.16em]">{bar.label}</div>
            </div>
          ))}
        </div>
      );
    case 'coordinates':
      return renderCoordinates(visual);
    case 'transform':
      return renderTransformTemple(visual);
    case 'sequence':
      return (
        <div className="flex w-full max-w-[22rem] flex-wrap items-center justify-center gap-1.5 rounded-[1.3rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-2.5 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.22)] md:max-w-[26rem] md:gap-2 md:rounded-[1.6rem] md:px-4 md:py-5">
          {visual.values.map((value, index) => (
            <React.Fragment key={`${value}-${index}`}>
              <div className="flex h-10 min-w-[2.7rem] items-center justify-center rounded-[0.9rem] border border-white/12 bg-white/10 px-2 text-sm font-black text-white md:h-16 md:min-w-[4.5rem] md:rounded-[1rem] md:px-3 md:text-2xl">
                {value}
              </div>
              {index < visual.values.length - 1 && <div className="text-sm font-black text-white/55 md:text-base">-&gt;</div>}
            </React.Fragment>
          ))}
        </div>
      );
    case 'ratio':
      return (
        <div className="grid w-full max-w-[22rem] grid-cols-2 gap-2 md:max-w-[24rem] md:gap-3">
          <div className="rounded-[1.1rem] border border-white/12 bg-white/10 p-2.5 text-center shadow-[0_16px_34px_rgba(0,0,0,0.2)] md:rounded-[1.3rem] md:p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">{visual.leftLabel}</div>
            <div className="mt-1 text-lg font-black text-white md:mt-2 md:text-3xl">{visual.leftValue}</div>
          </div>
          <div className="rounded-[1.1rem] border border-white/12 bg-white/10 p-2.5 text-center shadow-[0_16px_34px_rgba(0,0,0,0.2)] md:rounded-[1.3rem] md:p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">{visual.rightLabel}</div>
            <div className="mt-1 text-lg font-black text-white md:mt-2 md:text-3xl">{visual.rightValue}</div>
          </div>
        </div>
      );
    case 'pulse':
      return renderPercentPulse(visual);
    default:
      return null;
  }
};

const generateQuestion = (gameType: SupportedChallengeGameType, levelId: number): ChallengeQuestion => {
  const satsInspiredQuestion = Math.random() < 0.7
    ? getSatsInspiredChallengeQuestion(gameType, levelId)
    : null;

  if (satsInspiredQuestion) {
    return satsInspiredQuestion;
  }

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
  const [question, setQuestion] = useState<ChallengeQuestion>(() => generateQuestion(gameType, levelId));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [statusMessage, setStatusMessage] = useState('Keep your streak alive and stay accurate.');
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const scoreRef = useRef(0);

  const theme = CHALLENGE_THEMES[gameType];
  const isCalculationClash = gameType === 'calculation_clash';
  const isPercentPulse = gameType === 'percent_pulse';
  const isPlaceValuePeaks = gameType === 'place_value_peaks';
  const isScaleBuilder = gameType === 'scale_safari';
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
    setQuestion(generateQuestion(gameType, levelId));
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
      setQuestion(generateQuestion(gameType, levelId));
      setSelectedIndex(null);
      setFeedback(null);
    }, 650);
  };

  const resultStars = useMemo(() => (
    score >= targetScore * 1.9 ? 3 : score >= targetScore * 1.35 ? 2 : 1
  ), [score, targetScore]);

  return (
    <div className={`relative flex h-full w-full flex-col overflow-hidden ${theme.ambient} px-1.5 pb-1.5 pt-1 md:px-4 md:pb-4`}>
      <GameplaySceneBackdrop gameType={gameType} />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.scene}`} />
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-1 md:gap-4">
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
          compact
        />

            <div className={`licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.8rem] border border-white/10 ${isCalculationClash ? 'bg-[linear-gradient(180deg,rgba(9,34,58,0.86),rgba(7,17,31,0.62))]' : isPercentPulse ? 'bg-[linear-gradient(180deg,rgba(30,12,58,0.82),rgba(7,18,32,0.42))]' : isPlaceValuePeaks ? 'bg-[linear-gradient(180deg,rgba(52,28,10,0.76),rgba(16,16,22,0.54))]' : 'bg-[linear-gradient(180deg,rgba(9,16,28,0.68),rgba(9,16,28,0.34))]'} shadow-[0_24px_64px_rgba(0,0,0,0.28)] md:rounded-[2.6rem]`}>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5 md:gap-3 md:p-4">
            {bossEncounter && (
              <BossPortrait encounter={bossEncounter} pose={bossPose} compact className="shrink-0" />
            )}

            <div className={`casual-panel-strong relative shrink-0 overflow-hidden ${isPlaceValuePeaks ? 'rounded-[1.25rem] border border-amber-200/18 bg-[linear-gradient(180deg,rgba(124,45,18,0.88),rgba(83,33,13,0.92))]' : 'rounded-[1.35rem]'} px-3 py-3 text-center md:rounded-[2rem] md:px-5 md:py-5`}>
              <div className={`absolute inset-x-5 top-0 h-20 rounded-full bg-gradient-to-br ${isPlaceValuePeaks ? 'from-yellow-200/18 via-orange-300/12 to-transparent' : theme.prompt} blur-3xl`} />
              <div className="relative z-10 flex flex-col items-center">
                <div className={`${isPlaceValuePeaks ? 'mb-2 rounded-[0.9rem] border border-amber-200/24 bg-[linear-gradient(180deg,rgba(251,146,60,0.3),rgba(194,65,12,0.18))] px-3 py-1.5 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : `casual-ribbon-chip mb-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] md:mb-3 md:px-4 md:py-1.5 md:text-[10px] ${theme.badge}`}`}>
                  {isPlaceValuePeaks ? 'Highest Number Dash' : meta.focus}
                </div>
                <div className={`${isCalculationClash ? 'text-[1.15rem]' : isPlaceValuePeaks ? 'text-[1.18rem]' : 'text-[1.28rem]'} max-w-[18rem] font-black leading-[0.95] text-white md:max-w-[30rem] md:text-[2.25rem]`}>
                  {question.prompt}
                </div>
                <div className="mt-1 max-w-[18rem] text-[9px] font-semibold leading-snug text-white/70 md:mt-2 md:max-w-[30rem] md:text-sm">
                  {question.sublabel}
                </div>
              </div>
            </div>

            <div className={`casual-panel-surface relative flex min-h-0 shrink overflow-hidden ${isPlaceValuePeaks ? 'rounded-[1.35rem] border border-amber-200/12 bg-[linear-gradient(180deg,rgba(32,18,11,0.72),rgba(12,12,16,0.82))]' : 'rounded-[1.25rem]'} px-2 py-2 md:rounded-[1.8rem] md:px-4 md:py-4`}>
              <div className="relative z-10 flex min-h-0 w-full flex-col items-center justify-center gap-2">
                <motion.div
                  key={`${question.prompt}-${question.sublabel}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex min-h-0 w-full items-center justify-center overflow-hidden"
                >
                  <div className="max-h-[10.5rem] w-full overflow-hidden md:max-h-[15rem]">
                    <div className="flex h-full w-full items-center justify-center">
                      {renderVisual(question.visual)}
                    </div>
                  </div>
                </motion.div>
                <div className="w-full rounded-[1rem] bg-black/22 px-3 py-2 text-center text-[9px] font-bold text-white/84 shadow-[0_12px_24px_rgba(0,0,0,0.18)] md:rounded-[1.15rem] md:px-4 md:py-2.5 md:text-sm">
                  {visualCaption || statusMessage}
                </div>
              </div>
            </div>

            <div className={`flex min-h-0 flex-1 flex-col ${isPlaceValuePeaks ? 'gap-2 md:gap-3' : 'gap-1.5 md:gap-2.5'}`}>
              {question.options.map((option, index) => {
                const isSelected = index === selectedIndex;
                const isCorrect = feedback === 'correct' && index === question.answerIndex;
                const isWrongSelected = feedback === 'incorrect' && isSelected;

                const answerBackground = isCorrect
                  ? answerGreenBg
                  : isWrongSelected
                    ? (isScaleBuilder || isCalculationClash ? answerYellowBg : answerOrangeBg)
                    : (isScaleBuilder || isCalculationClash ? answerBlueBg : answerActionBg);

                return (
                  <motion.button
                    key={`${question.prompt}-${option}`}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => handleAnswer(index)}
                    disabled={Boolean(feedback) || isVictory || isGameOver}
                    className={`relative flex min-h-[3.55rem] w-full shrink-0 items-center justify-center overflow-hidden px-3 py-2 text-center shadow-[0_16px_26px_rgba(0,0,0,0.24)] transition-transform md:min-h-[4.7rem] md:px-5 md:py-3 ${
                      isPlaceValuePeaks
                        ? 'rounded-[1.1rem] border border-stone-400/24 bg-[linear-gradient(180deg,rgba(132,94,64,0.92),rgba(84,58,40,0.98))] shadow-[inset_0_2px_0_rgba(255,255,255,0.12),0_10px_0_rgba(41,24,14,0.72),0_18px_26px_rgba(0,0,0,0.24)] md:rounded-[1.35rem]'
                        : isScaleBuilder
                          ? 'rounded-[1.05rem] border border-sky-100/26 shadow-[0_16px_26px_rgba(0,0,0,0.24)] md:rounded-[1.2rem]'
                          : isCalculationClash
                            ? 'rounded-[1.05rem] border border-sky-100/24 shadow-[0_16px_26px_rgba(0,0,0,0.24)] md:rounded-[1.2rem]'
                          : 'rounded-[999px]'
                    }`}
                  >
                    {!isPlaceValuePeaks && <img src={answerBackground} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />}
                    {!isPlaceValuePeaks && !isScaleBuilder && !isCalculationClash && !isCorrect && !isWrongSelected && (
                      <img src={answerDecorAsset} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" draggable={false} />
                    )}
                    {isPlaceValuePeaks && (
                      <div className={`absolute inset-0 ${
                        isCorrect
                          ? 'bg-[linear-gradient(180deg,rgba(34,197,94,0.52),rgba(22,163,74,0.28))]'
                          : isWrongSelected
                            ? 'bg-[linear-gradient(180deg,rgba(251,146,60,0.48),rgba(220,38,38,0.24))]'
                            : 'bg-transparent'
                      }`} />
                    )}
                    {isSelected && !isCorrect && !isWrongSelected && (
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.answerActive} opacity-40`} />
                    )}
                    <div className={`absolute inset-x-[8%] top-[10%] h-[34%] ${isPlaceValuePeaks ? 'rounded-[0.9rem]' : 'rounded-full'} bg-white/18 blur-md`} />
                    <div className="relative z-10 flex w-full items-center gap-2.5 md:gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center border text-[9px] font-black uppercase md:h-8 md:w-8 md:text-[11px] ${isPlaceValuePeaks ? 'rounded-[0.7rem] border-amber-100/14 bg-black/14 text-amber-50' : isScaleBuilder || isCalculationClash ? `rounded-[0.65rem] ${isCorrect || isWrongSelected || isSelected ? 'border-black/10 bg-white/45 text-slate-900' : 'border-white/16 bg-white/12 text-white'}` : `rounded-full ${isCorrect || isWrongSelected || isSelected ? 'border-black/10 bg-white/35 text-slate-900' : 'border-white/14 bg-white/10 text-white'}`}`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className={`flex-1 text-center ${isPlaceValuePeaks ? 'text-[1.1rem] md:text-[1.7rem] text-amber-50' : isScaleBuilder || isCalculationClash ? 'text-[1rem] md:text-[1.35rem] text-white' : 'text-[1.02rem] md:text-[1.45rem] text-white'} font-black leading-none tracking-[-0.02em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.42)]`}>
                        {option}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
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

                <button onClick={onBack} className="ui-button-primary licensed-submit-button w-full py-3.5 text-base font-black text-white">
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
