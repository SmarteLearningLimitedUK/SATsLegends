import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { getBossEncounter } from '../bossMeta';
import { BossPose } from '../assets/bosses';
import { triggerHaptic } from '../haptics';
import AnimatedAvatar from '../components/AnimatedAvatar';
import BossPortrait from '../components/BossPortrait';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';
import { isBossEncounterGameType, SupportedBossGameType } from './bossEncounterTypes';
import type { AnimationState } from '../types';
import type { GameplaySessionEventHandlers, GameplaySessionState } from '../app/gameplaySessionContract';
import { emitMiniGameSessionEvent } from '../app/gameplaySessionContract';
import { generateArithmeticBossPaper, markArithmeticPaper } from './arithmeticBossPaper';
import type { ArithmeticPaperResult } from './arithmeticBossPaper';

interface BossEncounterGameProps {
  gameType: SupportedBossGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  sessionState?: GameplaySessionState;
  sessionEvents?: GameplaySessionEventHandlers;
}

type QuestionKind = 'fluency' | 'reasoning';
type SelectionMode = 'single' | 'multi' | 'true_false';

interface BossQuestion {
  prompt: string;
  clue: string;
  options: string[];
  correctOptionIndices: number[];
  dataPoints: string[];
  kind?: QuestionKind;
  marks?: number;
  selectionMode?: SelectionMode;
}

const TOTAL_QUESTIONS = 30;
const BOSS_HEALTH_MAX = 20;
const HERO_HEALTH_MAX = 3;
const HIGH_SCORE_STARS = {
  bronze: 1800,
  silver: 3000,
  gold: 4500,
} as const;

export { isBossEncounterGameType };

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const makeOptions = (correct: string, wrongs: string[]) => {
  const unique = Array.from(new Set([correct, ...wrongs]));
  const options: string[] = unique.filter(Boolean);
  if (!options.includes(correct)) {
    options.unshift(correct);
  }

  let pad = 1;
  while (options.length < 4) {
    const numeric = Number(correct);
    const candidate = Number.isFinite(numeric) ? String(numeric + pad) : `${correct} ${pad}`;
    if (!options.includes(candidate)) {
      options.push(candidate);
    }
    pad += 1;
  }

  const shuffled = shuffle(options).slice(0, 4);
  return { options: shuffled, answerIndex: shuffled.indexOf(correct) };
};

const makeMultiOptions = (correctAnswers: string[], wrongs: string[]) => {
  const answers = Array.from(new Set(correctAnswers.filter(Boolean)));
  const wrongPool = Array.from(new Set(wrongs.filter(Boolean))).filter((option) => !answers.includes(option));
  const filler = shuffle(wrongPool).slice(0, Math.max(0, 4 - answers.length));
  const options = shuffle([...answers, ...filler]);
  const correctOptionIndices = options
    .map((option, index) => (answers.includes(option) ? index : -1))
    .filter((index): index is number => index >= 0);

  return { options, correctOptionIndices };
};

const makeTrueFalseOptions = (isTrue: boolean) => {
  const options = shuffle(['True', 'False', 'Cannot tell', 'Both']);
  return {
    options,
    correctOptionIndices: [options.indexOf(isTrue ? 'True' : 'False')],
  };
};

const generateFactorsQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const factor = randomInt(2, 12);
    const other = randomInt(2, 12);
    const target = factor * other;
    const wrongs = shuffle([
      String(target - 1),
      String(target + 1),
      String(factor + other),
      String((factor * other) + factor),
    ]);
    const { options, answerIndex } = makeOptions(String(factor), wrongs);
    return {
      prompt: `Which number is a factor of ${target}?`,
      clue: 'A factor divides exactly with no remainder.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Target number ${target}`, 'Find a number that fits exactly'],
      selectionMode: 'single',
    };
  }

  if (mode === 1) {
    const base = randomInt(3, 12);
    const correct = base * pick([4, 5, 6, 7]);
    const wrongs = shuffle([
      String(correct - 1),
      String(correct + 2),
      String(base + 9),
      String((base * 3) + 1),
    ]);
    const { options, answerIndex } = makeOptions(String(correct), wrongs);
    return {
      prompt: `Which number is a multiple of ${base}?`,
      clue: `Multiples land exactly in the ${base} times table.`,
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${base}, ${base * 2}, ${base * 3}, ...`, 'Choose the next exact fit'],
      selectionMode: 'single',
    };
  }

  const a = pick([12, 18, 24, 30, 36]);
  const b = pick([18, 24, 30, 42, 48]);
  const commonFactors = [1, 2, 3, 6, 12].filter(value => a % value === 0 && b % value === 0);
  const correct = String(pick(commonFactors));
  const wrongs = shuffle(['4', '5', '7', '9', '10'].filter(value => !commonFactors.includes(Number(value))));
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `Which number is a common factor of ${a} and ${b}?`,
    clue: 'It must divide both numbers exactly.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`First number ${a}`, `Second number ${b}`],
    selectionMode: 'single',
  };
};

const fractionSets = [
  { fraction: '1/2', decimal: '0.5', percent: '50%' },
  { fraction: '1/4', decimal: '0.25', percent: '25%' },
  { fraction: '3/4', decimal: '0.75', percent: '75%' },
  { fraction: '1/5', decimal: '0.2', percent: '20%' },
  { fraction: '3/5', decimal: '0.6', percent: '60%' },
  { fraction: '3/8', decimal: '0.375', percent: '37.5%' },
];

const generateSatsArithmeticQuestion = (): BossQuestion => {
  const mode = randomInt(0, 5);

  if (mode === 0) {
    const a = randomInt(28, 96);
    const b = randomInt(12, 78);
    const correct = a + b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 10),
      String(correct - 10),
      String(correct + randomInt(1, 4)),
      String(correct - randomInt(1, 4)),
    ]);
    return {
      prompt: `${a} + ${b} =`,
      clue: 'Add carefully.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 1) {
    const a = randomInt(72, 180);
    const b = randomInt(18, 68);
    const correct = a - b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 10),
      String(correct - 10),
      String(correct + randomInt(1, 5)),
      String(correct - randomInt(1, 5)),
    ]);
    return {
      prompt: `${a} - ${b} =`,
      clue: 'Subtract carefully.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 2) {
    const a = randomInt(6, 12);
    const b = randomInt(4, 12);
    const correct = a * b;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + a),
      String(correct - a),
      String(correct + b),
      String(Math.max(1, correct - b)),
    ]);
    return {
      prompt: `${a} x ${b} =`,
      clue: 'Use multiplication facts.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 3) {
    const divisor = randomInt(3, 12);
    const quotient = randomInt(4, 15);
    const dividend = divisor * quotient;
    const { options, answerIndex } = makeOptions(String(quotient), [
      String(quotient + 1),
      String(Math.max(1, quotient - 1)),
      String(quotient + divisor),
      String(divisor),
    ]);
    return {
      prompt: `${dividend} ÷ ${divisor} =`,
      clue: 'Use inverse multiplication.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  if (mode === 4) {
    const percent = pick([10, 20, 25, 50, 75]);
    const amount = pick([40, 60, 80, 100, 120, 160, 200]);
    const correct = (percent * amount) / 100;
    const { options, answerIndex } = makeOptions(String(correct), [
      String(correct + 5),
      String(Math.max(1, correct - 5)),
      String(amount / 10),
      String(amount / 2),
    ]);
    return {
      prompt: `${percent}% of ${amount} =`,
      clue: 'Use the common percentage fact.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [],
      selectionMode: 'single',
    };
  }

  const denominator = pick([2, 3, 4, 5, 8, 10]);
  const whole = denominator * randomInt(3, 12);
  const possibleNumerators = [1, Math.floor(denominator / 2)].filter((value, index, arr) => value > 0 && arr.indexOf(value) === index);
  const numerator = pick(possibleNumerators);
  const correct = (whole / denominator) * numerator;
  const { options, answerIndex } = makeOptions(String(correct), [
    String(correct + numerator),
    String(Math.max(1, correct - numerator)),
    String(whole / denominator),
    String(whole - correct),
  ]);
  return {
    prompt: `${numerator}/${denominator} of ${whole} =`,
    clue: 'Divide by the denominator, then multiply by the numerator.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [],
    selectionMode: 'single',
  };
};

const generateFractionBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const sample = pick(fractionSets);
    const isTrue = Math.random() > 0.5;
    const falseSample = pick(fractionSets.filter((item) => item.fraction !== sample.fraction));
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${sample.fraction} = ${isTrue ? sample.decimal : falseSample.decimal}.`,
      clue: 'Read the equivalence carefully before you choose.',
      options,
      correctOptionIndices,
      dataPoints: [sample.fraction, sample.decimal, sample.percent],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const percent = pick([10, 20, 25, 50, 75]);
    const amount = pick([24, 36, 48, 60, 80, 120, 200]);
    const correct = String((amount * percent) / 100);
    const wrongs = shuffle([
      String(amount - Number(correct)),
      String(Number(correct) + (amount / 10)),
      String(Number(correct) - Math.max(1, amount / 20)),
      String(amount / 2),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `What is ${percent}% of ${amount}?`,
      clue: 'Use a known fraction or decimal equivalent.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${percent}%`, `of ${amount}`],
      selectionMode: 'single',
    };
  }

  const sample = pick(fractionSets);
  const wrongSample = pick(fractionSets.filter((item) => item.fraction !== sample.fraction));
  const { options, correctOptionIndices } = makeMultiOptions(
    [sample.fraction, sample.decimal, sample.percent],
    [wrongSample.fraction, wrongSample.decimal, wrongSample.percent],
  );
  return {
    prompt: `Which of these are equivalent to ${sample.fraction}?`,
    clue: 'Check the fraction, decimal and percent forms carefully.',
    options,
    correctOptionIndices,
    dataPoints: [sample.fraction, sample.decimal, sample.percent],
    selectionMode: 'multi',
  };
};

const generateGeometryBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const statement = isTrue
      ? 'A triangle has 3 sides.'
      : 'A triangle has 4 sides.';
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Use the shape definition, not a guess.',
      options,
      correctOptionIndices,
      dataPoints: ['Shape property', 'True or false'],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const x = randomInt(-3, 3);
    const y = randomInt(-3, 3);
    const dx = pick([-3, -2, -1, 1, 2, 3]);
    const dy = pick([-3, -2, -1, 1, 2, 3]);
    const correct = `(${x + dx}, ${y + dy})`;
    const wrongs = shuffle([
      `(${x - dx}, ${y + dy})`,
      `(${x + dx}, ${y - dy})`,
      `(${x + dy}, ${y + dx})`,
      `(${x}, ${y})`,
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Point A is at (${x}, ${y}). It is translated ${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'} and ${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}. Where is A'?`,
      clue: 'Apply the horizontal move first, then the vertical move.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Start (${x}, ${y})`, `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`, `${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`],
      selectionMode: 'single',
    };
  }

  const { options, correctOptionIndices } = makeMultiOptions(['Square', 'Rectangle', 'Trapezium'], ['Triangle', 'Pentagon', 'Hexagon', 'Circle']);
  return {
    prompt: 'Which of these shapes have 4 sides?',
    clue: 'Choose every quadrilateral.',
    options,
    correctOptionIndices,
    dataPoints: ['Four sides', 'Quadrilateral family'],
    selectionMode: 'multi',
  };
};

const generateMeasureBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const litres = pick([1.5, 2, 2.5, 3.25, 4]);
    const falseValue = pick([litres * 100, litres * 10, (litres * 1000) + 100]);
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${litres} litres = ${isTrue ? litres * 1000 : falseValue} millilitres.`,
      clue: 'Check the conversion factor first.',
      options,
      correctOptionIndices,
      dataPoints: [`${litres} L`, '1 L = 1000 ml'],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const red = pick([2, 3, 4]);
    const blue = pick([3, 5, 6]);
    const scale = pick([2, 3, 4]);
    const correct = `${red * scale}:${blue * scale}`;
    const wrongs = shuffle([
      `${red + scale}:${blue + scale}`,
      `${red * scale}:${blue + scale}`,
      `${red + blue}:${scale}`,
      `${red}:${blue * scale}`,
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `A mix uses a ratio of ${red}:${blue}. What is the ratio if the recipe is made ${scale} times larger?`,
      clue: 'Scale both sides by the same amount.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Original ${red}:${blue}`, `Scale by ${scale}`],
      selectionMode: 'single',
    };
  }

  const { options, correctOptionIndices } = makeMultiOptions(['1000 g', '1 kg'], ['500 g', '250 g', '1500 g', '2 kg']);
  return {
    prompt: 'Which of these are equal to 1 kilogram?',
    clue: 'Look for every value that matches the same mass.',
    options,
    correctOptionIndices,
    dataPoints: ['1 kg', '1000 g'],
    selectionMode: 'multi',
  };
};

const generateStatisticsBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const bars = shuffle([
      { label: 'Mon', value: randomInt(8, 15) },
      { label: 'Tue', value: randomInt(8, 15) },
      { label: 'Wed', value: randomInt(8, 15) },
      { label: 'Thu', value: randomInt(8, 15) },
    ]);
    const highest = [...bars].sort((a, b) => b.value - a.value)[0];
    const falseDay = bars.find((item) => item.label !== highest.label) ?? bars[0];
    const isTrue = Math.random() > 0.5;
    const statement = isTrue
      ? `${highest.label} has the highest value on the chart.`
      : `${falseDay.label} has the highest value on the chart.`;
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Compare the bars carefully before you decide.',
      options,
      correctOptionIndices,
      dataPoints: bars.map(item => `${item.label} ${item.value}`),
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const numbers = [4, 7, 9, 10];
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    const { options, correctOptionIndices } = makeMultiOptions(
      numbers.filter((value) => value > mean).map(String),
      [String(mean), String(numbers[0]), String(numbers[1] - 1), String(numbers[2] - 2)],
    );
    return {
      prompt: `Which numbers are above the mean of ${numbers.join(', ')}?`,
      clue: 'Find the mean first, then choose every number greater than it.',
      options,
      correctOptionIndices,
      dataPoints: numbers.map(String),
      selectionMode: 'multi',
    };
  }

  const startHour = pick([8, 9, 10, 11, 13, 14]);
  const startMinute = pick([0, 15, 30, 45]);
  const duration = pick([35, 50, 75, 90]);
  const endTotal = startHour * 60 + startMinute + duration;
  const correct = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;
  const wrongs = shuffle([
    `${String(startHour).padStart(2, '0')}:${String((startMinute + duration) % 60).padStart(2, '0')}`,
    `${String(Math.floor((endTotal + 15) / 60)).padStart(2, '0')}:${String((endTotal + 15) % 60).padStart(2, '0')}`,
    `${String(Math.floor((endTotal - 10) / 60)).padStart(2, '0')}:${String((endTotal - 10) % 60).padStart(2, '0')}`,
    `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`,
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `A train leaves at ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} and takes ${duration} minutes. What time does it arrive?`,
    clue: 'Use 24-hour time carefully.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`Leaves ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`, `Journey ${duration} min`],
    selectionMode: 'single',
  };
};

const generateReasoningBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const isTrue = Math.random() > 0.5;
    const start = randomInt(2, 12);
    const step = pick([2, 3, 4, 5, 6]);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const statement = isTrue
      ? `The sequence ${sequence.join(', ')} goes up by ${step} each time.`
      : `The sequence ${sequence.join(', ')} goes up by ${step + 1} each time.`;
    const { options, correctOptionIndices } = makeTrueFalseOptions(isTrue);
    return {
      prompt: `True or false: ${statement}`,
      clue: 'Look for the rule linking one term to the next.',
      options,
      correctOptionIndices,
      dataPoints: [`Rule repeats each time`, `Difference ${step}`],
      selectionMode: 'true_false',
    };
  }

  if (mode === 1) {
    const x = randomInt(3, 18);
    const add = randomInt(4, 12);
    const correct = String(x);
    const wrongs = shuffle([
      String(x + add),
      String((x + add) - 1),
      String(add),
      String(x - 1),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Solve x + ${add} = ${x + add}`,
      clue: 'Undo the addition to find x.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: ['Find the missing value', 'Use inverse operations'],
      selectionMode: 'single',
    };
  }

  const start = randomInt(2, 9);
  const step = pick([2, 3, 4]);
  const second = start + step;
  const third = second + step;
  const { options, correctOptionIndices } = makeMultiOptions(
    [String(third + step), String(third + (step * 2))],
    [String(second + 1), String(third - 1), String(third + 1), String(start + 1)],
  );
  return {
    prompt: `Which numbers come next in the sequence ${start}, ${second}, ${third}?`,
    clue: 'The rule stays the same each step.',
    options,
    correctOptionIndices,
    dataPoints: [`Start ${start}`, `Step ${step}`],
    selectionMode: 'multi',
  };
};

const QUESTION_GENERATORS: Record<SupportedBossGameType, () => BossQuestion> = {
  crystal_core: generateSatsArithmeticQuestion,
  mirror_gate: generateGeometryBossQuestion,
  matrix_match: generateReasoningBossQuestion,
};

const REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. The battle is underway.',
  correct: 'Direct hit. The boss is taking damage.',
  wrong: 'The boss holds firm. Keep your focus on the next question.',
  warning: 'The boss is close to breaking.',
  victory: 'Boss defeated. The island challenge is cleared.',
  defeat: 'The hero has fallen. The boss wins this round.',
};

const normalizeSelection = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);

const areSelectionsEqual = (left: number[], right: number[]) => {
  const normalizedLeft = normalizeSelection(left);
  const normalizedRight = normalizeSelection(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

type BattleHealthBarProps = {
  label: string;
  current: number;
  max: number;
  toneClass?: string;
};

const BattleHealthBar: React.FC<BattleHealthBarProps> = ({ label, current, max, toneClass }) => {
  const segments = Array.from({ length: max }, (_, index) => index < current);

  return (
    <div className="rounded-[1rem] border border-white/14 bg-slate-950/60 px-3 py-2 text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/65">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
        {segments.map((filled, index) => (
          <span
            key={`${label}-${index}`}
            className={`h-2 rounded-full border ${filled
              ? toneClass || 'border-emerald-200/45 bg-[linear-gradient(90deg,#22c55e_0%,#86efac_100%)]'
              : 'border-white/10 bg-black/30'}`}
          />
        ))}
      </div>
    </div>
  );
};

const BossEncounterGame: React.FC<BossEncounterGameProps> = ({
  gameType,
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
  sessionState,
  sessionEvents,
}) => {
  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const encounter = getBossEncounter(gameType);
  const isArithmeticPaper = gameType === 'crystal_core';
  const reactionCopy = REACTION_COPY;
  const [paperSeed, setPaperSeed] = useState<string | number>(() => `arithmetic-${Date.now()}-${Math.random()}`);
  const arithmeticPaper = useMemo(
    () => (isArithmeticPaper ? generateArithmeticBossPaper(paperSeed) : null),
    [isArithmeticPaper, paperSeed],
  );
  const [arithmeticAnswers, setArithmeticAnswers] = useState<Record<number, string>>({});
  const [arithmeticResult, setArithmeticResult] = useState<ArithmeticPaperResult | null>(null);
  const [isReviewingArithmetic, setIsReviewingArithmetic] = useState(false);
  const questions = useMemo(
    () => (isArithmeticPaper ? [] : Array.from({ length: TOTAL_QUESTIONS }, () => {
      const base = QUESTION_GENERATORS[gameType]();
      const kind: QuestionKind = base.kind ?? (gameType === 'matrix_match' ? 'reasoning' : 'fluency');
      return { ...base, kind };
    })),
    [gameType, isArithmeticPaper, levelId],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [XP, setScore] = useState(0);
  const [bossHealth, setBossHealth] = useState(BOSS_HEALTH_MAX);
  const [heroHealth, setHeroHealth] = useState(HERO_HEALTH_MAX);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submittedIndices, setSubmittedIndices] = useState<number[] | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [reaction, setReaction] = useState(reactionCopy.idle);
  const [resolveState, setResolveState] = useState<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat'>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(!isArithmeticPaper);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  if (!encounter) {
    return null;
  }

  const question = isArithmeticPaper ? null : questions[currentIndex % questions.length];
  const arithmeticQuestion = arithmeticPaper?.questions[currentIndex] ?? null;
  const isMultiSelect = question?.selectionMode === 'multi';
  const activeSelection = submittedIndices ?? selectedIndices;
  const bossHealthRemaining = bossHealth;
  const heroPose: AnimationState = resolveState === 'defeat'
    ? 'sad'
    : resolveState === 'victory'
      ? 'victory'
      : resolveState === 'wrong'
        ? 'hit'
        : resolveState === 'correct'
          ? 'special'
          : 'idle';

  const finishEncounter = (finalScore: number) => {
    const stars = finalScore >= HIGH_SCORE_STARS.gold
      ? 3
      : finalScore >= HIGH_SCORE_STARS.silver
        ? 2
        : 1;
    setResolveState('victory');
    setReaction(reactionCopy.victory);
    setBossPose('defeat');
    triggerHaptic('success');
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.45 } });
    timeoutRef.current = window.setTimeout(() => {
      onVictory(stars, finalScore);
    }, 980);
  };

  const advanceQuestion = (isCorrect: boolean, nextScore: number, nextBossHealth: number, nextHeroHealth: number) => {
    const bossDefeated = nextBossHealth <= 0;
    const heroDefeated = nextHeroHealth <= 0;

    setScore(nextScore);
    setBossHealth(nextBossHealth);
    setHeroHealth(nextHeroHealth);

    if (isCorrect) {
      triggerHaptic('success');
      if (bossDefeated) {
        setResolveState('victory');
        setReaction(reactionCopy.victory);
        setBossPose('defeat');
      } else if (nextBossHealth <= 4) {
        setResolveState('warning');
        setReaction(reactionCopy.warning);
        setBossPose('dazed');
      } else {
        setResolveState('correct');
        setReaction(reactionCopy.correct);
        setBossPose('attack');
      }
    } else {
      triggerHaptic('warning');
      setResolveState('wrong');
      setReaction(reactionCopy.wrong);
      setBossPose(encounter.assetId === 'jelly' ? 'victory' : 'happy');
      if (heroDefeated) {
        setResolveState('defeat');
      }
    }

    timeoutRef.current = window.setTimeout(() => {
      if (bossDefeated) {
        finishEncounter(nextScore);
        return;
      }

      if (heroDefeated) {
        setReaction(reactionCopy.defeat);
        setBossPose('victory');
        onGameOver(nextScore);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSelectedIndices([]);
      setSubmittedIndices(null);
      setResolveState('idle');
      setReaction(reactionCopy.idle);
      setBossPose(nextBossHealth <= 4 ? 'dazed' : 'neutral');
    }, 1180);
  };

  const submitSelection = (selection: number[]) => {
    if (submittedIndices !== null || !question) return;

    const normalizedSelection = normalizeSelection(selection);
    const normalizedCorrect = normalizeSelection(question.correctOptionIndices);
    const isCorrect = areSelectionsEqual(normalizedSelection, normalizedCorrect);
    const nextScore = isCorrect
      ? XP + 120
      : XP;

    const nextBossHealth = isCorrect ? Math.max(0, bossHealth - 1) : bossHealth;
    const currentHeroHealth = sessionState?.lives ?? heroHealth;
    const nextHeroHealth = isCorrect ? currentHeroHealth : Math.max(0, currentHeroHealth - 1);

    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      score: nextScore,
      metadata: {
        gameType,
        levelId,
        boss: encounter.name,
        questionIndex: currentIndex,
        selected: normalizedSelection,
        expected: normalizedCorrect,
        livesBefore: currentHeroHealth,
        livesLost: isCorrect ? 0 : 1,
      },
    });

    setSubmittedIndices(normalizedSelection);
    advanceQuestion(isCorrect, nextScore, nextBossHealth, nextHeroHealth);
  };

  const handleOptionClick = (index: number) => {
    if (submittedIndices !== null) return;
    if (isMultiSelect) {
      setSelectedIndices((previous) => (
        previous.includes(index)
          ? previous.filter((item) => item !== index)
          : [...previous, index]
      ));
      return;
    }

    submitSelection([index]);
  };

  const clearSelection = () => {
    if (submittedIndices !== null) return;
    setSelectedIndices([]);
  };

  const submitArithmeticPaper = (completedBeforeTimer: boolean) => {
    if (!arithmeticPaper || arithmeticResult) return;
    const result = markArithmeticPaper(arithmeticPaper, arithmeticAnswers, completedBeforeTimer);
    setArithmeticResult(result);
    setScore(result.xpAwarded);
    sessionEvents?.onEvent?.({
      type: 'game_complete',
      score: result.xpAwarded,
      stars: result.stars,
      metadata: {
        paperId: arithmeticPaper.paperId,
        rawScore: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        correctCount: result.correctCount,
      },
    });
    triggerHaptic(result.passed ? 'success' : 'warning');
  };

  useEffect(() => {
    if (!isArithmeticPaper || arithmeticResult || !arithmeticPaper) return;
    if ((sessionState?.timeLeft ?? arithmeticPaper.timeLimitSeconds) <= 0) {
      submitArithmeticPaper(false);
    }
  }, [arithmeticPaper, arithmeticResult, isArithmeticPaper, sessionState?.timeLeft]);

  const retryArithmeticPaper = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setPaperSeed(`arithmetic-${Date.now()}-${Math.random()}`);
    setArithmeticAnswers({});
    setArithmeticResult(null);
    setIsReviewingArithmetic(false);
    setCurrentIndex(0);
    setScore(0);
    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
  };

  const handleArithmeticChoice = (value: string | number) => {
    if (!arithmeticQuestion || arithmeticResult) return;
    setArithmeticAnswers((previous) => ({
      ...previous,
      [arithmeticQuestion.id]: String(value),
    }));
  };

  const arithmeticAnsweredCount = arithmeticPaper
    ? arithmeticPaper.questions.filter((item) => arithmeticAnswers[item.id]?.trim()).length
    : 0;
  const arithmeticTimeTakenSeconds = arithmeticPaper
    ? Math.max(0, arithmeticPaper.timeLimitSeconds - (sessionState?.timeLeft ?? arithmeticPaper.timeLimitSeconds))
    : 0;
  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  };

  if (isArithmeticPaper) {
    if (!arithmeticPaper || !arithmeticQuestion) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#f7f4ea] text-slate-900">
          Loading arithmetic paper...
        </div>
      );
    }

    if (arithmeticResult && !isReviewingArithmetic) {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="border-b border-slate-300 bg-white px-5 py-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">SATs Paper 1: Arithmetic</div>
              <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-4xl">Paper Complete</h2>
            </div>
            <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 md:grid-cols-[1fr_1fr] md:p-6">
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Final score</div>
                <div className="mt-2 text-5xl font-black text-slate-950">{arithmeticResult.score}/40</div>
                <div className="mt-2 text-lg font-black text-slate-700">{arithmeticResult.percentage}%</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
                  <div className="rounded-lg bg-slate-100 p-3">Stars<br /><span className="text-xl text-slate-950">{arithmeticResult.stars}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">XP<br /><span className="text-xl text-slate-950">{arithmeticResult.xpAwarded}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Time<br /><span className="text-xl text-slate-950">{formatTime(arithmeticTimeTakenSeconds)}</span></div>
                  <div className="rounded-lg bg-slate-100 p-3">Correct<br /><span className="text-xl text-slate-950">{arithmeticResult.correctCount}/40</span></div>
                </div>
              </div>
              <div className="rounded-[0.9rem] border border-slate-300 bg-white p-4">
                <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Breakdown</div>
                <div className="mt-3 space-y-2 text-sm font-bold text-slate-700">
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Correct</span><span>{arithmeticResult.correctCount}</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Incorrect or blank</span><span>{40 - arithmeticResult.correctCount}</span></div>
                  <div className="flex justify-between border-b border-slate-200 py-2"><span>Pass threshold</span><span>24 marks</span></div>
                  <div className="flex justify-between py-2"><span>Paper seed</span><span className="max-w-[12rem] truncate text-right">{String(arithmeticPaper.seed)}</span></div>
                </div>
              </div>
            </div>
            <div className="grid shrink-0 gap-2 border-t border-slate-300 bg-white p-3 md:grid-cols-3 md:p-4">
              <button type="button" onClick={retryArithmeticPaper} className="rounded-xl border-2 border-slate-300 bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white">
                Retry with new paper
              </button>
              <button type="button" onClick={() => setIsReviewingArithmetic(true)} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Review answers
              </button>
              <button type="button" onClick={onBack} className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950">
                Return to Boss Island
              </button>
            </div>
          </section>
        </div>
      );
    }

    if (arithmeticResult && isReviewingArithmetic) {
      return (
        <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] px-3 py-3 font-sans text-slate-950 md:px-6 md:py-5">
          <section className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 py-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Review answers</div>
                <h2 className="text-xl font-black text-slate-950">Score {arithmeticResult.score}/40</h2>
              </div>
              <button type="button" onClick={() => setIsReviewingArithmetic(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black uppercase tracking-[0.12em]">
                Results
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 md:grid-cols-2">
                {arithmeticPaper.questions.map((item) => {
                  const result = arithmeticResult.results.find((entry) => entry.questionId === item.id);
                  return (
                    <div key={item.id} className={`rounded-xl border p-3 ${result?.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-black">Q{item.id}. {item.question}</div>
                        <div className="text-sm font-black">{result?.marksAwarded}/{item.marks}</div>
                      </div>
                      <div className="mt-2 text-sm font-bold text-slate-700">Your answer: {result?.userAnswer || 'blank'}</div>
                      <div className="text-sm font-bold text-slate-700">Correct answer: {item.answer}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      );
    }

    const selectedAnswer = arithmeticAnswers[arithmeticQuestion.id];
    return (
      <div className="relative flex h-full w-full overflow-hidden bg-[#f7f4ea] font-sans text-slate-950">
        <div className="relative z-10 flex h-full w-full flex-col gap-3 px-3 pb-3 pt-3 md:px-6 md:pb-5 md:pt-5">
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.1rem] border border-slate-300 bg-[#fffdf6] shadow-[0_12px_28px_rgba(15,23,42,0.16)]">
            <div className="shrink-0 border-b border-slate-300 bg-white px-4 py-3 md:px-6 md:py-4">
              <div className="flex items-center justify-between gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500 md:text-sm">
                <span>SATs Paper 1: Arithmetic</span>
                <span>Question {currentIndex + 1} of 40</span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-5 md:px-10 md:py-8">
              <div className="mx-auto w-full max-w-3xl">
                <div className="mb-4 text-sm font-bold text-slate-600 md:text-base">
                  Choose the correct answer. {arithmeticQuestion.marks} mark
                </div>
                <div className="rounded-[0.75rem] border border-slate-300 bg-white px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] md:px-8 md:py-10">
                  <div className="text-[clamp(2.3rem,10vw,5rem)] font-black leading-none tracking-normal text-slate-950">
                    {arithmeticQuestion.question}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {arithmeticQuestion.choices.map((option, index) => {
              const isSelected = String(option) === selectedAnswer;
              const toneClass = isSelected
                ? 'border-sky-700 bg-sky-100 text-slate-950'
                : 'border-slate-300 bg-white text-slate-950 hover:border-sky-500 hover:bg-sky-50';

              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => handleArithmeticChoice(option)}
                  className={`relative flex h-[clamp(4.25rem,10vh,5.6rem)] min-w-0 items-center justify-center rounded-[0.85rem] border-2 px-3 text-center text-[clamp(1.35rem,5vw,2.1rem)] font-black shadow-[0_6px_14px_rgba(15,23,42,0.12)] transition disabled:cursor-default md:h-[6.25rem] ${toneClass}`}
                >
                  <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-black text-slate-600 md:left-3 md:top-3 md:h-7 md:w-7 md:text-sm">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="max-w-full break-words px-5">{option}</span>
                </button>
              );
            })}
          </div>
          <div className="grid shrink-0 grid-cols-[auto_1fr_auto_auto] items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 disabled:opacity-40"
            >
              Previous
            </button>
            <div className="text-center text-xs font-black uppercase tracking-[0.12em] text-slate-600">
              {arithmeticAnsweredCount}/40 answered
            </div>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(39, prev + 1))}
              disabled={currentIndex === 39}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => submitArithmeticPaper((sessionState?.timeLeft ?? 0) > 0)}
              className="rounded-lg border border-slate-950 bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
            >
              Submit paper
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden font-sans">
      <GameplaySceneBackdrop gameType={gameType} />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Core of Calculation"
        body={isArithmeticPaper
          ? "Work through the arithmetic paper.\nChoose the answer that matches the calculation.\nThere is no combat here, just questions and answers."
          : "The Monster Minds have fortified the final boss.\nAnswer correctly to damage the enemy.\nKeep the hero standing until the boss falls."
        }
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full w-full flex-col px-2 pb-2 pt-2 lg:px-4 lg:pb-3 lg:pt-3">
        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[1.65rem] p-2 lg:gap-3 lg:rounded-[2.2rem] lg:p-3">
          <div className="pointer-events-none relative z-20 shrink-0">
            <GameQuestionCard>
              {formatFantasyPrompt(question.prompt)}
            </GameQuestionCard>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
            <div className="battle-arena-panel relative flex min-h-0 flex-1 overflow-hidden rounded-[1.1rem] border border-white/14 bg-slate-950/58 px-2 py-2 text-white shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl lg:rounded-[1.6rem] lg:px-4 lg:py-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_40%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_44%)]" />
              {isArithmeticPaper ? (
                <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between gap-2 rounded-[0.95rem] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.34),rgba(8,15,30,0.06))] p-2 lg:rounded-[1.8rem] lg:p-4">
                  <div className="flex w-full items-start justify-between gap-2">
                    <div className="inline-flex rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-rose-50">
                      Enemy
                    </div>
                    <div className="inline-flex rounded-full border border-amber-100/20 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-50">
                      {reaction}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                    <BossPortrait encounter={encounter} pose={bossPose} className="h-[clamp(10.5rem,34vh,17.5rem)] w-full max-w-[21rem] lg:h-[22rem] lg:max-w-[27rem]" />
                    <div className="w-full max-w-[20rem] rounded-[1rem] border border-white/12 bg-black/24 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white/72 lg:max-w-[24rem]">
                      {isMultiSelect ? 'Select all that apply' : 'Choose one answer'}
                    </div>
                  </div>
                  <BattleHealthBar
                    label={`${encounter.name} HP`}
                    current={bossHealthRemaining}
                    max={BOSS_HEALTH_MAX}
                    toneClass="w-full max-w-[24rem] border-rose-200/30 bg-rose-300/16 text-rose-50"
                  />
                </div>
              ) : (
                <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] gap-2 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.1fr)] lg:gap-4">
                  <div className="flex min-h-0 flex-col justify-end gap-1 rounded-[0.95rem] border border-cyan-200/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.28),rgba(8,15,30,0.05))] p-2 lg:rounded-[1.8rem] lg:p-4">
                    <div className="inline-flex w-fit rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-50">
                      Hero
                    </div>
                    <div className="flex min-h-0 flex-1 items-end justify-center">
                      <AnimatedAvatar
                        avatar={avatar}
                        pose={heroPose}
                        className="h-[clamp(6.5rem,20vh,9.5rem)] w-[clamp(6.5rem,20vh,9.5rem)] lg:h-[12.5rem] lg:w-[12.5rem]"
                        floating={false}
                        showBackdropGlow={true}
                      />
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col justify-between gap-2 rounded-[0.95rem] border border-rose-200/12 bg-[linear-gradient(180deg,rgba(8,15,30,0.38),rgba(8,15,30,0.08))] p-2 lg:rounded-[1.8rem] lg:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="inline-flex rounded-full border border-rose-200/20 bg-rose-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-rose-50">
                      Enemy
                    </div>
                    <div className="inline-flex rounded-full border border-amber-100/20 bg-amber-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-50">
                      {reaction}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
                    <BossPortrait encounter={encounter} pose={bossPose} className="h-[clamp(7.2rem,22vh,10.25rem)] w-full max-w-[18rem] lg:h-[13.5rem] lg:max-w-[21rem]" />
                    <div className="w-full max-w-[19rem] rounded-[1rem] border border-white/12 bg-black/22 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white/72 lg:max-w-[22rem]">
                      {isMultiSelect ? 'Select all that apply' : 'Choose one answer'}
                    </div>
                  </div>
                  <BattleHealthBar
                    label={`${encounter.name} HP`}
                    current={bossHealthRemaining}
                    max={BOSS_HEALTH_MAX}
                    toneClass="border-rose-200/30 bg-rose-300/16 text-rose-50"
                  />
                </div>
              </div>
              )}
            </div>

            <div className="answer-choice-surface grid min-h-0 shrink-0 grid-cols-4 gap-1.5 lg:gap-3">
              {question.options.map((option, index) => {
                const isCorrect = question.correctOptionIndices.includes(index);
                const isSelected = activeSelection.includes(index);
                const isRevealed = submittedIndices !== null;

                const toneClass = !isRevealed
                  ? isSelected
                    ? 'border-cyan-200/55 bg-cyan-300/18 text-cyan-50 shadow-[0_0_0_1px_rgba(165,243,252,0.28)]'
                    : 'border-white/14 bg-slate-950/52 text-white hover:border-cyan-200/35 hover:bg-cyan-300/10'
                  : isCorrect
                    ? 'border-emerald-300/45 bg-emerald-300/16 text-emerald-50'
                    : isSelected
                      ? 'border-rose-300/45 bg-rose-300/16 text-amber-50'
                      : 'border-white/10 bg-slate-950/36 text-white/42';

                return (
                  <button
                    key={`${option}-${index}`}
                    onClick={() => handleOptionClick(index)}
                    disabled={submittedIndices !== null}
                    aria-pressed={isSelected}
                    className={`relative flex h-[clamp(3.2rem,8.2vh,4.5rem)] min-w-0 items-center justify-center rounded-[0.85rem] px-1.5 py-2 text-center text-[clamp(0.62rem,2.6vw,0.95rem)] font-black leading-tight lg:h-[5.7rem] lg:rounded-[1.35rem] lg:px-4 lg:text-lg ${toneClass} ${isCorrect ? 'ui-button-success' : isSelected ? 'ui-button-primary' : 'ui-button-secondary'}`}
                  >
                    <span className="pointer-events-none absolute left-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[8px] font-black text-white/70 lg:left-3 lg:top-3 lg:h-6 lg:w-6 lg:text-xs">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="max-w-full break-words px-0.5 lg:px-0">{option}</span>
                    {isRevealed && isCorrect && (
                      <AssetIcon name="check" className="absolute bottom-1 right-1 h-3.5 w-3.5 text-emerald-100 lg:bottom-2 lg:right-2 lg:h-5 lg:w-5" />
                    )}
                  </button>
                );
              })}
            </div>

            {isMultiSelect ? (
              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={submittedIndices !== null || selectedIndices.length === 0}
                  className="ui-button-secondary rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => submitSelection(selectedIndices)}
                  disabled={submittedIndices !== null || selectedIndices.length === 0}
                  className="ui-button-success rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Check answers
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossEncounterGame;

