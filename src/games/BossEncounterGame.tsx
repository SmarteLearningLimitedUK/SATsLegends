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
const RUN_TIME_SECONDS = 15 * 60;
const BOSS_HEALTH_MAX = 30;
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
  const options = shuffle(['True', 'False']);
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

const REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. Thirty questions stand between you and the boss.',
  correct: 'Direct hit. The boss is taking damage.',
  wrong: 'The boss holds firm. Keep your focus on the next question.',
  warning: 'The boss is close to breaking.',
  victory: 'Boss defeated. The island challenge is cleared.',
  defeat: 'Time ran out. The boss survives this attempt.',
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
  const reactionCopy = REACTION_COPY;
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
  const [timeLeft, setTimeLeft] = useState(RUN_TIME_SECONDS);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [submittedIndices, setSubmittedIndices] = useState<number[] | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [reaction, setReaction] = useState(reactionCopy.idle);
  const [resolveState, setResolveState] = useState<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat'>('idle');
  const [showPracticeIntro, setShowPracticeIntro] = useState(true);
  const timeoutRef = useRef<number | null>(null);
  const timeLimitRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (timeLimitRef.current) {
      window.clearInterval(timeLimitRef.current);
    }
  }, []);

  if (!encounter) {
    return null;
  }

  const question = questions[currentIndex];
  const isMultiSelect = question.selectionMode === 'multi';
  const isTrueFalse = question.selectionMode === 'true_false';
  const answeredCount = currentIndex + (submittedIndices !== null ? 1 : 0);
  const activeSelection = submittedIndices ?? selectedIndices;
  const misses = answeredCount - correctAnswers;
  const bossHealthRemaining = Math.max(0, BOSS_HEALTH_MAX - correctAnswers);
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const healthProgress = Math.round((bossHealthRemaining / BOSS_HEALTH_MAX) * 100);
  const accuracy = answeredCount > 0 ? Math.round((correctAnswers / answeredCount) * 100) : 100;
  const elapsedSeconds = RUN_TIME_SECONDS - timeLeft;
  const score = XP;

  const finishEncounter = (finalCorrect: number, finalScore: number) => {
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

  useEffect(() => {
    if (resolveState === 'victory' || resolveState === 'defeat') return undefined;

    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timeLimitRef.current = timerId;
    return () => window.clearInterval(timerId);
  }, [resolveState]);

  useEffect(() => {
    if (timeLeft > 0 || resolveState !== 'idle') return;
    setResolveState('defeat');
    setReaction(reactionCopy.defeat);
    setBossPose('victory');
    triggerHaptic('error');
    timeoutRef.current = window.setTimeout(() => {
      onGameOver(XP);
    }, 980);
  }, [XP, reactionCopy.defeat, resolveState, timeLeft, onGameOver]);

  const advanceQuestion = (isCorrect: boolean, nextCorrect: number, nextScore: number) => {
    const nextBossHealth = Math.max(0, BOSS_HEALTH_MAX - nextCorrect);
    const finalQuestion = currentIndex === TOTAL_QUESTIONS - 1;

    setCorrectAnswers(nextCorrect);
    setScore(nextScore);

    if (isCorrect) {
      triggerHaptic('success');
      if (finalQuestion) {
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
      setBossPose(nextBossHealth <= 4 ? 'dazed' : 'neutral');
    }, 1180);
  };

  const submitSelection = (selection: number[]) => {
    if (submittedIndices !== null) return;

    const normalizedSelection = normalizeSelection(selection);
    const normalizedCorrect = normalizeSelection(question.correctOptionIndices);
    const isCorrect = areSelectionsEqual(normalizedSelection, normalizedCorrect);
    const nextCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
    const nextScore = isCorrect
      ? XP + 120 + Math.max(0, Math.floor(timeLeft / 12))
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

      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Core of Calculation"
        body="Answer 30 questions before the timer runs out.\nCorrect answers damage the boss health bar."
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative z-10 flex h-full w-full flex-col gap-2 px-2 pb-2.5 pt-[calc(0.45rem+env(safe-area-inset-top))] lg:gap-3 lg:px-4 lg:pb-4 lg:pt-4">
        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-[2rem] p-2 lg:gap-3 lg:rounded-[2.6rem] lg:p-3">
          <div className="pointer-events-none fixed left-0 right-0 z-[60]" style={{ top: '4px' }}>
            <GameQuestionCard title="Question">
              {formatFantasyPrompt(question.prompt)}
            </GameQuestionCard>
          </div>

          <div className="mt-[clamp(5.25rem,13vh,7rem)] grid shrink-0 grid-cols-3 gap-2 lg:gap-3">
            <div className="rounded-[1.1rem] border border-white/14 bg-slate-950/55 px-3 py-2 text-center text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:rounded-[1.5rem] lg:px-4 lg:py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 lg:text-[9px]">Question</div>
              <div className="mt-1 text-sm font-black text-cyan-100 lg:text-xl">{Math.min(currentIndex + 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}</div>
            </div>
            <div className="rounded-[1.1rem] border border-white/14 bg-slate-950/55 px-3 py-2 text-center text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:rounded-[1.5rem] lg:px-4 lg:py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 lg:text-[9px]">Timer</div>
              <div className="mt-1 text-sm font-black text-amber-100 lg:text-xl">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
            </div>
            <div className="rounded-[1.1rem] border border-white/14 bg-slate-950/55 px-3 py-2 text-center text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl lg:rounded-[1.5rem] lg:px-4 lg:py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 lg:text-[9px]">Score</div>
              <div className="mt-1 text-sm font-black text-emerald-100 lg:text-xl">{score}</div>
            </div>
          </div>

          <div className="shrink-0 rounded-[1.2rem] border border-white/14 bg-slate-950/55 px-3 py-2 text-white shadow-[0_16px_36px_rgba(2,6,23,0.22)] backdrop-blur-xl lg:rounded-[1.8rem] lg:px-4 lg:py-3">
            <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.22em] lg:text-[9px]">
              <span className="text-white/58">Boss health</span>
              <span className="text-white/82">{bossHealthRemaining}/30</span>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full border border-white/12 bg-black/32 lg:h-5">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${healthProgress}%` }}
                transition={{ type: 'spring', stiffness: 85, damping: 18 }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#fb7185_38%,#f59e0b_78%,#fde68a_100%)] shadow-[0_0_18px_rgba(248,113,113,0.34)]"
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-bold text-white/72 lg:text-[9px]">
              <span>{reaction}</span>
              <span>{Math.max(0, 2 - misses)} safe misses left</span>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-2 lg:gap-3">
            <div className="relative flex min-h-[15rem] items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/16 bg-slate-950/58 p-3 text-white shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl lg:min-h-[18rem] lg:rounded-[2rem] lg:p-4">
              <div className="absolute inset-x-6 bottom-4 h-4 rounded-full bg-black/35 blur-[10px]" />
              <div className="relative flex flex-col items-center gap-2">
                <BossPortrait encounter={encounter} pose={bossPose} className="h-[8.2rem] lg:h-[11.5rem]" />
                <div className="w-full max-w-[26rem] rounded-full border border-amber-200/28 bg-black/25 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-white/78">
                  {isMultiSelect ? 'Select all that apply' : isTrueFalse ? 'Choose true or false' : 'Choose one answer'}
                </div>
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

