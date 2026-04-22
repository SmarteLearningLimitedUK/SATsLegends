import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { getBossEncounter, resolveBossPose } from '../bossMeta';
import { BossPose } from '../assets/bosses';
import { triggerHaptic } from '../haptics';
import AnimatedAvatar from '../components/AnimatedAvatar';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { isBossEncounterGameType, SupportedBossGameType } from './bossEncounterTypes';
import { AnimationState } from '../types';

interface BossEncounterGameProps {
  gameType: SupportedBossGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
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
const HERO_HEALTH_MAX = 5;

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
  const options = shuffle(['True', 'False']);
  return {
    options,
    correctOptionIndices: [options.indexOf(isTrue ? 'True' : 'False')],
  };
};

type BattleGaugeProps = {
  label: string;
  value: number;
  max: number;
  toneClass: string;
  align?: 'left' | 'right';
};

const BattleGauge: React.FC<BattleGaugeProps> = ({ label, value, max, toneClass, align = 'left' }) => {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-white/60">
        <span>{label}</span>
        <span className="text-white/80">{value}/{max}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/35">
        <motion.div
          initial={{ width: `${percent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 95, damping: 18 }}
          className={`h-full rounded-full ${toneClass}`}
        />
      </div>
    </div>
  );
};

type BattleUnitCardProps = {
  side: 'hero' | 'boss';
  label: string;
  health: number;
  maxHealth: number;
  children: React.ReactNode;
  className?: string;
};

const BattleUnitCard: React.FC<BattleUnitCardProps> = ({
  side,
  label,
  health,
  maxHealth,
  children,
  className = '',
}) => (
  <div
    className={`relative w-[min(20rem,44vw)] rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,13,24,0.8),rgba(4,8,16,0.92))] p-3 shadow-[0_18px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl ${className}`.trim()}
  >
    <div className={`absolute inset-0 rounded-[1.5rem] opacity-70 ${side === 'boss' ? 'bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.14),transparent_46%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_46%)]'}`} />
    <div className={`relative flex items-end gap-3 ${side === 'boss' ? 'flex-row-reverse text-right' : ''}`}>
      {children}
      <div className={`min-w-0 flex-1 ${side === 'boss' ? 'items-end' : ''}`}>
        <div className="mb-2 text-[9px] font-black uppercase tracking-[0.26em] text-white/58">
          {label}
        </div>
        <BattleGauge
          label="HP"
          value={health}
          max={maxHealth}
          align={side === 'boss' ? 'right' : 'left'}
          toneClass={side === 'boss'
            ? 'bg-[linear-gradient(90deg,#ef4444_0%,#fb7185_45%,#f59e0b_100%)] shadow-[0_0_12px_rgba(248,113,113,0.38)]'
            : 'bg-[linear-gradient(90deg,#38bdf8_0%,#60a5fa_45%,#93c5fd_100%)] shadow-[0_0_12px_rgba(96,165,250,0.34)]'}
        />
      </div>
    </div>
  </div>
);

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
  crystal_core: generateFractionBossQuestion,
  mirror_gate: generateGeometryBossQuestion,
  matrix_match: generateReasoningBossQuestion,
};

const normalizeSelection = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);

const areSelectionsEqual = (left: number[], right: number[]) => {
  const normalizedLeft = normalizeSelection(left);
  const normalizedRight = normalizeSelection(right);
  return normalizedLeft.length === normalizedRight.length
    && normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const BossEncounterGame: React.FC<BossEncounterGameProps> = ({
  gameType,
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const encounter = getBossEncounter(gameType);
  const questions = useMemo(
    () => Array.from({ length: TOTAL_QUESTIONS }, () => {
      const base = QUESTION_GENERATORS[gameType]();
      const kind: QuestionKind = base.kind ?? (gameType === 'matrix_match' ? 'reasoning' : 'fluency');
      return { ...base, kind };
    }),
    [gameType, levelId],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [XP, setScore] = useState(0);
  const [bossHealth, setBossHealth] = useState(BOSS_HEALTH_MAX);
  const [heroHealth, setHeroHealth] = useState(HERO_HEALTH_MAX);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submittedIndices, setSubmittedIndices] = useState<number[] | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [heroPose, setHeroPose] = useState<AnimationState>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  if (!encounter) {
    return null;
  }

  const question = questions[currentIndex];
  const isMultiSelect = question.selectionMode === 'multi';
  const isTrueFalse = question.selectionMode === 'true_false';
  const activeSelection = submittedIndices ?? selectedIndices;
  const finishEncounter = (finalScore: number) => {
    const stars = heroHealth >= 4 ? 3 : heroHealth >= 2 ? 2 : 1;
    triggerHaptic('success');
    confetti({ particleCount: 56, spread: 62, origin: { y: 0.42 } });
    timeoutRef.current = window.setTimeout(() => {
      onVictory(stars, finalScore);
    }, 720);
  };
  const endBattle = (finalScore: number) => {
    triggerHaptic('error');
    timeoutRef.current = window.setTimeout(() => {
      onGameOver(finalScore);
    }, 720);
  };

  const advanceQuestion = (isCorrect: boolean, nextCorrect: number, nextScore: number) => {
    const nextBossHealth = isCorrect ? Math.max(0, bossHealth - 1) : bossHealth;
    const nextHeroHealth = isCorrect ? heroHealth : Math.max(0, heroHealth - 1);
    const finalQuestion = currentIndex === TOTAL_QUESTIONS - 1;

    setCorrectAnswers(nextCorrect);
    setScore(nextScore);
    setBossHealth(nextBossHealth);
    setHeroHealth(nextHeroHealth);
    setBossPose(isCorrect ? (nextBossHealth <= 0 ? 'defeat' : 'attack') : 'attack');
    setHeroPose(isCorrect ? 'victory' : 'hit');

    if (isCorrect) {
      triggerHaptic('success');
    } else {
      triggerHaptic('warning');
    }

    timeoutRef.current = window.setTimeout(() => {
      if (nextBossHealth <= 0) {
        finishEncounter(nextScore);
        return;
      }

      if (nextHeroHealth <= 0 || finalQuestion) {
        endBattle(nextScore);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSelectedIndices([]);
      setSubmittedIndices(null);
      setBossPose('neutral');
      setHeroPose('idle');
    }, 720);
  };

  const submitSelection = (selection: number[]) => {
    if (submittedIndices !== null) return;

    const normalizedSelection = normalizeSelection(selection);
    const normalizedCorrect = normalizeSelection(question.correctOptionIndices);
    const isCorrect = areSelectionsEqual(normalizedSelection, normalizedCorrect);
    const nextCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
    const nextScore = isCorrect ? XP + 120 : XP;

    setSubmittedIndices(normalizedSelection);
    advanceQuestion(isCorrect, nextCorrect, nextScore);
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

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,#152036_0%,#0a1120_48%,#030611_100%)] font-sans">

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Core of Calculation"
        body="The final boss is waiting.\nAnswer correctly to hit the boss.\nWrong answers damage your hero.\nReduce the boss HP to zero to win."
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full w-full flex-col gap-3 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] lg:gap-4 lg:px-6 lg:pb-6 lg:pt-6">
        <div className="flex shrink-0 justify-center">
          <GameQuestionCard
            title="Question"
            className="w-full max-w-[52rem] rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(10,15,28,0.88),rgba(4,8,18,0.95))] shadow-[0_18px_42px_rgba(0,0,0,0.26)]"
          >
            {formatFantasyPrompt(question.prompt)}
          </GameQuestionCard>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-4 py-1 lg:gap-6 lg:py-2">
          <div className="ml-auto flex w-full max-w-[22rem] justify-end">
            <BattleUnitCard
              side="boss"
              label="Boss"
              health={bossHealth}
              maxHealth={BOSS_HEALTH_MAX}
              className="w-full"
            >
              <div className="relative h-[5.6rem] w-[5.6rem] shrink-0 rounded-[1.15rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),rgba(255,255,255,0.02))]">
                <div className="pointer-events-none absolute inset-[10%] rounded-full bg-white/10 blur-xl" />
                <motion.img
                  key={`${encounter.assetId}-${bossPose}`}
                  src={resolveBossPose(encounter.assetId, bossPose)}
                  alt={encounter.name}
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="relative z-10 h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.38)]"
                  draggable={false}
                />
              </div>
            </BattleUnitCard>
          </div>

          <div className="mr-auto flex w-full max-w-[18rem] justify-start">
            <BattleUnitCard
              side="hero"
              label="Hero"
              health={heroHealth}
              maxHealth={HERO_HEALTH_MAX}
              className="w-full"
            >
              <AnimatedAvatar
                avatar={avatar}
                pose={heroPose}
                className="h-[5.8rem] w-[5.8rem] shrink-0"
                imageClassName="object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.32)]"
                showBackdropGlow={false}
              />
            </BattleUnitCard>
          </div>
        </div>

        <div className="answer-choice-surface grid shrink-0 grid-cols-2 gap-2 lg:gap-3">
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
                className={`relative flex min-h-[4rem] items-center justify-center rounded-[1.15rem] px-3 py-2 text-center text-sm font-black leading-tight lg:min-h-[5.2rem] lg:rounded-[1.55rem] lg:px-4 lg:text-lg ${toneClass}`}
              >
                <span className="pointer-events-none absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-black text-white/70 lg:left-3 lg:top-3 lg:h-6 lg:w-6 lg:text-xs">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="max-w-[10rem] lg:max-w-none">{option}</span>
              </button>
            );
          })}
        </div>

        {isMultiSelect ? (
          <div className="game-submit-dock mt-1 flex flex-wrap justify-end gap-2">
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
  );
};

export default BossEncounterGame;

