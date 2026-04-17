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
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { isBossEncounterGameType, SupportedBossGameType } from './bossEncounterTypes';

interface BossEncounterGameProps {
  gameType: SupportedBossGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type QuestionKind = 'fluency' | 'reasoning';
type SelectionMode = 'single' | 'multi';

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

const TOTAL_QUESTIONS = 10;
const PASS_MARK = 8;
const PAPER_TOTAL_QUESTIONS = 10;
const PAPER_MARK_WEIGHTS = {
  crystal_core: Array.from({ length: PAPER_TOTAL_QUESTIONS }, () => 4),
  mirror_gate: [4, 4, 4, 4, 4, 3, 3, 3, 3, 3],
  matrix_match: [4, 4, 4, 4, 4, 3, 3, 3, 3, 3],
} as const;
const PAPER_PASS_MARKS = {
  crystal_core: 28,
  mirror_gate: 24,
  matrix_match: 24,
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
  const options = shuffle(Array.from(new Set([...answers, ...wrongs.filter(Boolean)]))).slice(0, 4);
  const correctOptionIndices = options
    .map((option, index) => (answers.includes(option) ? index : -1))
    .filter((index): index is number => index >= 0);

  return { options, correctOptionIndices };
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

const generateFractionBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const sample = pick(fractionSets);
    const source = pick([sample.fraction, sample.decimal, sample.percent]);
    const correctAnswers = [sample.fraction, sample.decimal, sample.percent].filter(value => value !== source);
    const wrongs = shuffle(
      fractionSets
        .filter(item => item.fraction !== sample.fraction)
        .flatMap(item => [item.fraction, item.decimal, item.percent]),
    ).filter(value => !correctAnswers.includes(value) && value !== source).slice(0, 2);
    const { options, correctOptionIndices } = makeMultiOptions(correctAnswers, wrongs);
    return {
      prompt: `Select all answers equivalent to ${source}.`,
      clue: 'More than one answer can be correct.',
      options,
      correctOptionIndices,
      dataPoints: [sample.fraction, sample.decimal, sample.percent],
      selectionMode: 'multi',
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

  const mixedWhole = randomInt(1, 3);
  const numerator = pick([1, 3, 5, 7]);
  const denominator = pick([2, 4, 8]);
  const improper = `${(mixedWhole * denominator) + numerator}/${denominator}`;
  const correct = `${mixedWhole} ${numerator}/${denominator}`;
  const wrongs = shuffle([
    `${mixedWhole + 1} ${numerator}/${denominator}`,
    `${mixedWhole} ${Math.max(1, numerator - 1)}/${denominator}`,
    `${mixedWhole} ${numerator}/${denominator * 2}`,
    `${mixedWhole + numerator}/${denominator}`,
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `Which mixed number is equal to ${improper}?`,
    clue: 'Split the improper fraction into wholes and the remainder.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [improper, `${denominator}/${denominator} = 1 whole`],
    selectionMode: 'single',
  };
};

const generateGeometryBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const a = pick([35, 40, 55, 65]);
    const b = pick([45, 60, 75, 85]);
    const correct = String(180 - a - b);
    const wrongs = shuffle([
      String(360 - a - b),
      String(180 - a),
      String(180 - b),
      String(a + b),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Two angles in a triangle are ${a} deg and ${b} deg. What is the third angle?`,
      clue: 'Angles in a triangle add up to 180 deg.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${a} deg`, `${b} deg`, 'Triangle total 180 deg'],
      selectionMode: 'single',
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

  const correct = 'Trapezium';
  const { options, answerIndex } = makeOptions(correct, shuffle(['Triangle', 'Pentagon', 'Hexagon', 'Circle']));
  return {
    prompt: 'Which shape has exactly one pair of parallel sides?',
    clue: 'Think about polygon properties, not just the number of sides.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: ['One pair of parallel sides', 'Quadrilateral family'],
    selectionMode: 'single',
  };
};

const generateMeasureBossQuestion = (): BossQuestion => {
  const mode = randomInt(0, 2);

  if (mode === 0) {
    const litres = pick([1.5, 2, 2.5, 3.25, 4]);
    const correct = String(litres * 1000);
    const wrongs = shuffle([
      String(litres * 100),
      String((litres * 1000) + 100),
      String((litres * 1000) - 250),
      String(litres * 10),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Convert ${litres} litres to millilitres.`,
      clue: 'There are 1000 millilitres in 1 litre.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`${litres} L`, '1 L = 1000 ml'],
      selectionMode: 'single',
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

  const packs = pick([4, 5, 6]);
  const each = pick([25, 40, 75]);
  const correct = String(packs * each);
  const wrongs = shuffle([
    String((packs + 1) * each),
    String((packs * each) - each),
    String(packs + each),
    String(each * 2),
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `${packs} packs each contain ${each} ml of juice. How many millilitres are there altogether?`,
    clue: 'Use multiplication to scale the measure.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`${packs} packs`, `${each} ml each`],
    selectionMode: 'single',
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
    const { options, answerIndex } = makeOptions(
      highest.label,
      shuffle(bars.filter(item => item.label !== highest.label).map(item => item.label)),
    );
    return {
      prompt: 'Which day has the highest result on the chart?',
      clue: 'Compare the values carefully.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: bars.map(item => `${item.label} ${item.value}`),
      selectionMode: 'single',
    };
  }

  if (mode === 1) {
    const numbers = Array.from({ length: 4 }, () => randomInt(4, 12));
    const total = numbers.reduce((sum, value) => sum + value, 0);
    const correct = String(total / numbers.length);
    const wrongs = shuffle([
      String(total),
      String(numbers[0]),
      String(Math.round(total / (numbers.length - 1))),
      String((total / numbers.length) + 2),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `What is the mean of ${numbers.join(', ')}?`,
      clue: 'Add the values, then divide by how many there are.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: numbers.map(String),
      selectionMode: 'single',
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
    const start = randomInt(2, 12);
    const step = pick([2, 3, 4, 5, 6]);
    const sequence = [start, start + step, start + step * 2, start + step * 3];
    const correct = String(start + step * 4);
    const wrongs = shuffle([
      String(start + step * 5),
      String(sequence[3] + 1),
      String(sequence[2] + step - 1),
      String(sequence[3] - step),
    ]);
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `What is the next number in the sequence ${sequence.join(', ')}?`,
      clue: 'Look for the rule linking one term to the next.',
      options,
      correctOptionIndices: [answerIndex],
      dataPoints: [`Rule repeats each time`, `Difference ${step}`],
      selectionMode: 'single',
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

  const input = randomInt(2, 8);
  const multiplier = pick([2, 3, 4]);
  const offset = pick([1, 2, 3, 5]);
  const output = input * multiplier + offset;
  const correct = String(output);
  const wrongs = shuffle([
    String((input + multiplier) + offset),
    String((input * multiplier) - offset),
    String(input + offset),
    String(output + multiplier),
  ]);
  const { options, answerIndex } = makeOptions(correct, wrongs);
  return {
    prompt: `A rule machine does x${multiplier} then +${offset}. What is the output for ${input}?`,
    clue: 'Apply the operations in the correct order.',
    options,
    correctOptionIndices: [answerIndex],
    dataPoints: [`Input ${input}`, `x${multiplier}`, `+${offset}`],
    selectionMode: 'single',
  };
};

const QUESTION_GENERATORS: Record<SupportedBossGameType, () => BossQuestion> = {
  crystal_core: generateFractionBossQuestion,
  mirror_gate: generateGeometryBossQuestion,
  matrix_match: generateReasoningBossQuestion,
};

const PAPER_REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. This paper is scored in marks, just like a SATs practice paper.',
  correct: 'Mark secured. Keep the paper moving.',
  wrong: 'That mark was missed. Stay focused on the next question.',
  warning: 'You are close to the target mark.',
  victory: 'Paper complete. Great work.',
  defeat: 'Paper finished. Review the paper and try again.',
};

const REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. Eight correct answers are needed to win the duel.',
  correct: 'Direct hit. The boss is furious and its health is dropping.',
  wrong: 'The boss surges with confidence. Stay sharp on the next question.',
  warning: 'The boss is dazed. One more strong push could finish it.',
  victory: 'Boss defeated. The island challenge is cleared.',
  defeat: 'The boss stands strong. Revision is needed before the next challenge.',
};

const getPaperConfig = (gameType: SupportedBossGameType) => {
  if (gameType === 'crystal_core') {
    return {
      totalMarks: 40,
      passMark: PAPER_PASS_MARKS.crystal_core,
      questionMarks: PAPER_MARK_WEIGHTS.crystal_core,
    };
  }

  if (gameType === 'mirror_gate') {
    return {
      totalMarks: 35,
      passMark: PAPER_PASS_MARKS.mirror_gate,
      questionMarks: PAPER_MARK_WEIGHTS.mirror_gate,
    };
  }

  if (gameType === 'matrix_match') {
    return {
      totalMarks: 35,
      passMark: PAPER_PASS_MARKS.matrix_match,
      questionMarks: PAPER_MARK_WEIGHTS.matrix_match,
    };
  }

  return null;
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
  const paperConfig = getPaperConfig(gameType);
  const isPaperBoss = Boolean(paperConfig);
  const reactionCopy = isPaperBoss ? PAPER_REACTION_COPY : REACTION_COPY;
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
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submittedIndices, setSubmittedIndices] = useState<number[] | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [reaction, setReaction] = useState(reactionCopy.idle);
  const [resolveState, setResolveState] = useState<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat'>('idle');
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
  const answeredCount = currentIndex + (submittedIndices !== null ? 1 : 0);
  const activeSelection = submittedIndices ?? selectedIndices;
  const misses = answeredCount - correctAnswers;
  const marksEarned = XP;
  const currentQuestionMarks = paperConfig?.questionMarks[currentIndex] ?? 180;
  const totalMarks = paperConfig?.totalMarks ?? 100;
  const passMarks = paperConfig?.passMark ?? PASS_MARK;
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const paperProgress = isPaperBoss ? Math.round((marksEarned / totalMarks) * 100) : progress;
  const accuracy = answeredCount > 0 ? Math.round((correctAnswers / answeredCount) * 100) : 100;

  const finishEncounter = (finalCorrect: number, finalScore: number) => {
    const won = isPaperBoss ? finalScore >= passMarks : finalCorrect >= PASS_MARK;

    if (won) {
      const stars = isPaperBoss
        ? (finalScore >= totalMarks * 0.9 ? 3 : finalScore >= totalMarks * 0.75 ? 2 : 1)
        : finalCorrect === 10 ? 3 : finalCorrect === 9 ? 2 : 1;
      setResolveState('victory');
      setReaction(reactionCopy.victory);
      setBossPose('defeat');
      triggerHaptic('success');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.45 } });
      timeoutRef.current = window.setTimeout(() => {
        onVictory(stars, finalScore);
      }, 980);
      return;
    }

    setResolveState('defeat');
    setReaction(reactionCopy.defeat);
    setBossPose('victory');
    triggerHaptic('error');
    timeoutRef.current = window.setTimeout(() => {
      onGameOver(finalScore);
    }, 980);
  };

  const advanceQuestion = (isCorrect: boolean, nextCorrect: number, nextScore: number) => {
    const nextMarksRemaining = isPaperBoss ? Math.max(0, passMarks - nextScore) : Math.max(0, 100 - (nextCorrect * 10));
    const finalQuestion = currentIndex === TOTAL_QUESTIONS - 1;

    setCorrectAnswers(nextCorrect);
    setScore(nextScore);

    if (isCorrect) {
      triggerHaptic('success');
      if (finalQuestion) {
        setResolveState('victory');
        setReaction(reactionCopy.victory);
        setBossPose('defeat');
      } else if (isPaperBoss ? nextMarksRemaining <= 4 : nextMarksRemaining <= 20) {
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
    }

    timeoutRef.current = window.setTimeout(() => {
      if (finalQuestion) {
        finishEncounter(nextCorrect, nextScore);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setSelectedIndices([]);
      setSubmittedIndices(null);
      setResolveState('idle');
      setReaction(reactionCopy.idle);
      setBossPose(isPaperBoss ? (passMarks - nextScore <= 4 ? 'dazed' : 'neutral') : nextMarksRemaining <= 20 ? 'dazed' : 'neutral');
    }, 1180);
  };

  const submitSelection = (selection: number[]) => {
    if (submittedIndices !== null) return;

    const normalizedSelection = normalizeSelection(selection);
    const normalizedCorrect = normalizeSelection(question.correctOptionIndices);
    const isCorrect = areSelectionsEqual(normalizedSelection, normalizedCorrect);
    const nextCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
    const nextScore = isCorrect
      ? XP + (isPaperBoss ? currentQuestionMarks : 180)
      : XP;

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
    <div className="relative flex h-full w-full overflow-hidden font-sans">
      <GameplaySceneBackdrop gameType={gameType} />

      <div className="relative z-10 flex h-full w-full flex-col gap-2 px-2 pb-2.5 pt-[calc(0.45rem+env(safe-area-inset-top))] lg:gap-3 lg:px-4 lg:pb-4 lg:pt-4">
        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[2rem] p-2 lg:gap-3 lg:rounded-[2.6rem] lg:p-3">
        <div className="grid shrink-0 grid-cols-[1.08fr_0.92fr] gap-2 lg:gap-3">
          <div className="min-w-0 rounded-[1.25rem] border border-white/16 bg-slate-950/55 p-2 shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl lg:rounded-[2rem] lg:p-3">
            <BossPortrait encounter={encounter} pose={bossPose} className="h-[7.4rem] lg:h-[10.5rem]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              isPaperBoss
                ? [
                  { label: 'Question', value: `${Math.min(currentIndex + 1, TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`, tone: 'text-cyan-100' },
                  { label: 'Marks', value: `${marksEarned}/${totalMarks}`, tone: 'text-emerald-100' },
                  { label: 'Pass', value: `${passMarks}/${totalMarks}`, tone: 'text-amber-100' },
                  { label: 'Accuracy', value: `${accuracy}%`, tone: accuracy >= 80 ? 'text-emerald-100' : 'text-amber-100' },
                ]
                : [
                  { label: 'Question', value: `${Math.min(currentIndex + 1, TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`, tone: 'text-cyan-100' },
                  { label: 'Correct', value: `${correctAnswers}/${TOTAL_QUESTIONS}`, tone: 'text-emerald-100' },
                  { label: 'Need', value: `${PASS_MARK}/10`, tone: 'text-amber-100' },
                  { label: 'Accuracy', value: `${accuracy}%`, tone: accuracy >= 80 ? 'text-emerald-100' : 'text-amber-100' },
                ]
            ).map(item => (
              <div
                key={item.label}
                className="rounded-[1.1rem] border border-white/14 bg-slate-950/52 px-2 py-2 text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:rounded-[1.25rem] lg:px-3 lg:py-2"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 lg:text-[9px]">{item.label}</div>
                <div className={`mt-1 text-sm font-black lg:text-xl ${item.tone}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

          <div className="shrink-0 rounded-[1.2rem] border border-white/14 bg-slate-950/55 px-3 py-2 text-white shadow-[0_16px_36px_rgba(2,6,23,0.22)] backdrop-blur-xl lg:rounded-[1.8rem] lg:px-4 lg:py-3">
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.22em] lg:text-[9px]">
            <span className="text-white/58">{isPaperBoss ? 'Paper progress' : 'Boss health'}</span>
            <span className="text-white/82">
              {isPaperBoss ? `${marksEarned}/${totalMarks} marks` : `${Math.max(0, 100 - (correctAnswers * 10))}% remaining`}
            </span>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full border border-white/12 bg-black/32 lg:h-5">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${paperProgress}%` }}
              transition={{ type: 'spring', stiffness: 85, damping: 18 }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#fb7185_38%,#f59e0b_78%,#fde68a_100%)] shadow-[0_0_18px_rgba(248,113,113,0.34)]"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-bold text-white/72 lg:text-[9px]">
            <span>{reaction}</span>
            <span>{isPaperBoss ? `${Math.max(0, passMarks - marksEarned)} marks to pass` : `${Math.max(0, 2 - misses)} safe misses left`}</span>
          </div>
        </div>

          <div className="grid min-h-0 flex-1 gap-2 lg:gap-3">
          <div className="rounded-[1.25rem] border border-white/16 bg-slate-950/58 p-3 text-white shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl lg:rounded-[2rem] lg:p-4">
            <div className="flex items-start gap-3">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/15 bg-white/10 lg:flex">
                <AnimatedAvatar
                  avatar={avatar}
                  pose={resolveState === 'wrong' ? 'sad' : resolveState === 'victory' ? 'victory' : 'thinking'}
                  floating={false}
                  className="h-full w-full"
                  imageClassName="object-bottom scale-[1.12]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/60 lg:text-[11px]">
                  {isPaperBoss ? 'SATs paper' : 'Boss encounter'}
                  <span className="text-white/32"> | </span>
                  <span>{isMultiSelect ? 'Select all that apply' : 'Choose one answer'}</span>
                </div>
                <div className="mt-2">
                  <GameQuestionCard
                    title="Mission"
                    subtitle={question.clue}
                    bodyClassName="leading-tight lg:text-[1.75rem]"
                    style={{ ['--question-card-width' as any]: '100%' }}
                  >
                    {formatFantasyPrompt(question.prompt)}
                  </GameQuestionCard>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 lg:mt-4">
              {question.dataPoints.map((point, index) => (
                <div
                  key={`${point}-${index}`}
                  className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[9px] font-black text-white/84 lg:px-3 lg:text-[9px]"
                >
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full border border-white/10 bg-black/30 lg:mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${paperProgress}%` }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#818cf8_55%,#f472b6_100%)]"
              />
            </div>
          </div>

          <div className="answer-choice-surface grid min-h-0 flex-1 grid-cols-2 gap-2 lg:gap-3">
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
                  className={`relative flex min-h-[4.1rem] items-center justify-center rounded-[1.2rem] px-3 py-2 text-center text-sm font-black leading-tight lg:min-h-[5.7rem] lg:rounded-[1.7rem] lg:px-4 lg:text-lg ${toneClass} ${isCorrect ? 'ui-button-success' : isSelected ? 'ui-button-primary' : 'ui-button-secondary'}`}
                >
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] font-black text-white/70 lg:left-3 lg:top-3 lg:h-6 lg:w-6 lg:text-xs">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="max-w-[10rem] lg:max-w-none">{option}</span>
                  {isRevealed && isCorrect && (
                    <AssetIcon name="check" className="absolute bottom-2 right-2 h-4 w-4 text-emerald-100 lg:h-5 lg:w-5" />
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

