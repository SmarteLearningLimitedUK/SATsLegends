import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { MiniGameType } from '../types';
import { AVATARS } from '../constants';
import { getBossEncounter } from '../bossMeta';
import { BossPose } from '../assets/bosses';
import { triggerHaptic } from '../haptics';
import AnimatedAvatar from './AnimatedAvatar';
import BossPortrait from './BossPortrait';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import AssetIcon from './AssetIcon';

export type SupportedBossGameType =
  | 'tower_of_factors'
  | 'crystal_core'
  | 'mirror_gate'
  | 'scales_of_the_sun'
  | 'observatory_overload'
  | 'matrix_match';

interface BossEncounterGameProps {
  gameType: SupportedBossGameType;
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface BossQuestion {
  prompt: string;
  clue: string;
  options: string[];
  answerIndex: number;
  dataPoints: string[];
}

const TOTAL_QUESTIONS = 10;
const PASS_MARK = 8;

export const isBossEncounterGameType = (gameType?: MiniGameType | null): gameType is SupportedBossGameType => (
  ['tower_of_factors', 'crystal_core', 'mirror_gate', 'scales_of_the_sun', 'observatory_overload', 'matrix_match'].includes(gameType || '')
);

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(items: T[]) => items[randomInt(0, items.length - 1)];

const makeOptions = (correct: string, wrongs: string[]) => {
  const options = shuffle([correct, ...wrongs.slice(0, 3)]);
  return { options, answerIndex: options.indexOf(correct) };
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
      answerIndex,
      dataPoints: [`Target number ${target}`, 'Find a number that fits exactly'],
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
      answerIndex,
      dataPoints: [`${base}, ${base * 2}, ${base * 3}, ...`, 'Choose the next exact fit'],
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
    answerIndex,
    dataPoints: [`First number ${a}`, `Second number ${b}`],
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
    const correct = [sample.fraction, sample.decimal, sample.percent].find(value => value !== source) || sample.percent;
    const wrongs = shuffle(
      fractionSets
        .filter(item => item.fraction !== sample.fraction)
        .slice(0, 4)
        .map(item => pick([item.fraction, item.decimal, item.percent])),
    );
    const { options, answerIndex } = makeOptions(correct, wrongs);
    return {
      prompt: `Which answer is equivalent to ${source}?`,
      clue: 'Link fractions, decimals and percentages.',
      options,
      answerIndex,
      dataPoints: [sample.fraction, sample.decimal, sample.percent],
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
      answerIndex,
      dataPoints: [`${percent}%`, `of ${amount}`],
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
    answerIndex,
    dataPoints: [improper, `${denominator}/${denominator} = 1 whole`],
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
      answerIndex,
      dataPoints: [`${a} deg`, `${b} deg`, 'Triangle total 180 deg'],
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
      answerIndex,
      dataPoints: [`Start (${x}, ${y})`, `${Math.abs(dx)} ${dx > 0 ? 'right' : 'left'}`, `${Math.abs(dy)} ${dy > 0 ? 'up' : 'down'}`],
    };
  }

  const correct = 'Trapezium';
  const { options, answerIndex } = makeOptions(correct, shuffle(['Triangle', 'Pentagon', 'Hexagon', 'Circle']));
  return {
    prompt: 'Which shape has exactly one pair of parallel sides?',
    clue: 'Think about polygon properties, not just the number of sides.',
    options,
    answerIndex,
    dataPoints: ['One pair of parallel sides', 'Quadrilateral family'],
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
      answerIndex,
      dataPoints: [`${litres} L`, '1 L = 1000 ml'],
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
      answerIndex,
      dataPoints: [`Original ${red}:${blue}`, `Scale by ${scale}`],
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
    answerIndex,
    dataPoints: [`${packs} packs`, `${each} ml each`],
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
      answerIndex,
      dataPoints: bars.map(item => `${item.label} ${item.value}`),
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
      answerIndex,
      dataPoints: numbers.map(String),
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
    answerIndex,
    dataPoints: [`Leaves ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`, `Journey ${duration} min`],
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
      answerIndex,
      dataPoints: [`Rule repeats each time`, `Difference ${step}`],
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
      answerIndex,
      dataPoints: ['Find the missing value', 'Use inverse operations'],
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
    answerIndex,
    dataPoints: [`Input ${input}`, `x${multiplier}`, `+${offset}`],
  };
};

const QUESTION_GENERATORS: Record<SupportedBossGameType, () => BossQuestion> = {
  tower_of_factors: generateFactorsQuestion,
  crystal_core: generateFractionBossQuestion,
  mirror_gate: generateGeometryBossQuestion,
  scales_of_the_sun: generateMeasureBossQuestion,
  observatory_overload: generateStatisticsBossQuestion,
  matrix_match: generateReasoningBossQuestion,
};

const REACTION_COPY: Record<'idle' | 'correct' | 'wrong' | 'warning' | 'victory' | 'defeat', string> = {
  idle: 'Answer carefully. Eight correct answers are needed to win the duel.',
  correct: 'Direct hit. The boss is furious and its health is dropping.',
  wrong: 'The boss surges with confidence. Stay sharp on the next question.',
  warning: 'The boss is dazed. One more strong push could finish it.',
  victory: 'Boss defeated. The island challenge is cleared.',
  defeat: 'The boss stands strong. Revision is needed before the next challenge.',
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
    () => Array.from({ length: TOTAL_QUESTIONS }, () => QUESTION_GENERATORS[gameType]()),
    [gameType, levelId],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [bossPose, setBossPose] = useState<BossPose>('neutral');
  const [reaction, setReaction] = useState(REACTION_COPY.idle);
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
  const answeredCount = currentIndex + (selectedIndex !== null ? 1 : 0);
  const misses = answeredCount - correctAnswers;
  const bossHealth = Math.max(0, 100 - (correctAnswers * 10));
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const accuracy = answeredCount > 0 ? Math.round((correctAnswers / answeredCount) * 100) : 100;

  const finishEncounter = (finalCorrect: number, finalScore: number) => {
    const won = finalCorrect >= PASS_MARK;

    if (won) {
      const stars = finalCorrect === 10 ? 3 : finalCorrect === 9 ? 2 : 1;
      setResolveState('victory');
      setReaction(REACTION_COPY.victory);
      setBossPose('defeat');
      triggerHaptic('success');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.45 } });
      timeoutRef.current = window.setTimeout(() => {
        onVictory(stars, finalScore);
      }, 980);
      return;
    }

    setResolveState('defeat');
    setReaction(REACTION_COPY.defeat);
    setBossPose('victory');
    triggerHaptic('error');
    timeoutRef.current = window.setTimeout(() => {
      onGameOver(finalScore);
    }, 980);
  };

  const handleAnswer = (index: number) => {
    if (selectedIndex !== null) return;

    const isCorrect = index === question.answerIndex;
    const nextCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
    const nextScore = isCorrect ? score + 180 : score;
    const nextHealth = Math.max(0, 100 - (nextCorrect * 10));
    const finalQuestion = currentIndex === TOTAL_QUESTIONS - 1;

    setSelectedIndex(index);
    setCorrectAnswers(nextCorrect);
    setScore(nextScore);

    if (isCorrect) {
      triggerHaptic('success');
      if (finalQuestion) {
        setResolveState('victory');
        setReaction(REACTION_COPY.victory);
        setBossPose('defeat');
      } else if (nextHealth <= 20) {
        setResolveState('warning');
        setReaction(REACTION_COPY.warning);
        setBossPose('dazed');
      } else {
        setResolveState('correct');
        setReaction(REACTION_COPY.correct);
        setBossPose('attack');
      }
    } else {
      triggerHaptic('warning');
      setResolveState('wrong');
      setReaction(REACTION_COPY.wrong);
      setBossPose(encounter.assetId === 'jelly' ? 'victory' : 'happy');
    }

    timeoutRef.current = window.setTimeout(() => {
      if (finalQuestion) {
        finishEncounter(nextCorrect, nextScore);
        return;
      }

      setCurrentIndex(prev => prev + 1);
      setSelectedIndex(null);
      setResolveState('idle');
      setReaction(REACTION_COPY.idle);
      setBossPose(nextHealth <= 20 ? 'dazed' : 'neutral');
    }, 1180);
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden font-sans">
      <GameplaySceneBackdrop gameType={gameType} />

      <div className="relative z-10 flex h-full w-full flex-col gap-2.5 px-2.5 pb-2.5 pt-[calc(0.55rem+env(safe-area-inset-top))] md:gap-3 md:px-4 md:pb-4 md:pt-4">
        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-[2rem] p-2 md:gap-3 md:rounded-[2.6rem] md:p-3">
          <div className="grid shrink-0 grid-cols-[1.08fr_0.92fr] gap-2.5 md:gap-3">
          <div className="min-w-0 rounded-[1.45rem] border border-white/16 bg-slate-950/55 p-2.5 shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl md:rounded-[2rem] md:p-3">
            <BossPortrait encounter={encounter} pose={bossPose} className="h-[8.6rem] md:h-[10.5rem]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Question', value: `${Math.min(currentIndex + 1, TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`, tone: 'text-cyan-100' },
              { label: 'Correct', value: `${correctAnswers}/${TOTAL_QUESTIONS}`, tone: 'text-emerald-100' },
              { label: 'Need', value: `${PASS_MARK}/10`, tone: 'text-amber-100' },
              { label: 'Accuracy', value: `${accuracy}%`, tone: accuracy >= 80 ? 'text-emerald-100' : 'text-rose-100' },
            ].map(item => (
              <div
                key={item.label}
                className="rounded-[1.1rem] border border-white/14 bg-slate-950/52 px-2.5 py-2 text-white shadow-[0_12px_26px_rgba(2,6,23,0.18)] backdrop-blur-xl md:rounded-[1.45rem] md:px-3 md:py-2.5"
              >
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 md:text-[9px]">{item.label}</div>
                <div className={`mt-1 text-sm font-black md:text-xl ${item.tone}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

          <div className="shrink-0 rounded-[1.35rem] border border-white/14 bg-slate-950/55 px-3 py-2.5 text-white shadow-[0_16px_36px_rgba(2,6,23,0.22)] backdrop-blur-xl md:rounded-[1.8rem] md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.22em] md:text-[10px]">
            <span className="text-white/58">Boss health</span>
            <span className="text-white/82">{bossHealth}% remaining</span>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full border border-white/12 bg-black/32 md:h-5">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${bossHealth}%` }}
              transition={{ type: 'spring', stiffness: 85, damping: 18 }}
              className="h-full rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#fb7185_38%,#f59e0b_78%,#fde68a_100%)] shadow-[0_0_18px_rgba(248,113,113,0.34)]"
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-bold text-white/72 md:text-[10px]">
            <span>{reaction}</span>
            <span>{Math.max(0, 2 - misses)} safe misses left</span>
          </div>
        </div>

          <div className="grid min-h-0 flex-1 gap-2.5 md:gap-3">
          <div className="rounded-[1.45rem] border border-white/16 bg-slate-950/58 p-3 text-white shadow-[0_18px_48px_rgba(2,6,23,0.24)] backdrop-blur-xl md:rounded-[2rem] md:p-4">
            <div className="flex items-start gap-3">
              <div className="hidden h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-white/15 bg-white/10 md:flex">
                <AnimatedAvatar
                  avatar={avatar}
                  pose={resolveState === 'wrong' ? 'sad' : resolveState === 'victory' ? 'victory' : 'thinking'}
                  floating={false}
                  className="h-full w-full"
                  imageClassName="object-bottom scale-[1.12]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/60 md:text-[11px]">
                  Boss encounter
                </div>
                <h1 className="mt-1 text-base font-black leading-tight text-white md:text-[1.75rem]">
                  {question.prompt}
                </h1>
                <p className="mt-1.5 text-[10px] leading-snug text-white/74 md:text-sm">
                  {question.clue}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 md:mt-4">
              {question.dataPoints.map(point => (
                <div
                  key={point}
                  className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[9px] font-black text-white/84 md:px-3 md:text-[10px]"
                >
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/10 bg-black/30 md:mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-[linear-gradient(90deg,#38bdf8_0%,#818cf8_55%,#f472b6_100%)]"
              />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 md:gap-3">
            {question.options.map((option, index) => {
              const isCorrect = index === question.answerIndex;
              const isSelected = selectedIndex === index;
              const isRevealed = selectedIndex !== null;

              const toneClass = !isRevealed
                ? 'border-white/14 bg-slate-950/52 text-white hover:border-cyan-200/35 hover:bg-cyan-300/10'
                : isCorrect
                  ? 'border-emerald-300/45 bg-emerald-300/16 text-emerald-50'
                  : isSelected
                    ? 'border-rose-300/45 bg-rose-300/16 text-rose-50'
                    : 'border-white/10 bg-slate-950/36 text-white/42';

              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedIndex !== null}
                  className={`relative flex min-h-[4.8rem] items-center justify-center rounded-[1.35rem] border px-3 py-2 text-center text-sm font-black leading-tight shadow-[0_14px_30px_rgba(2,6,23,0.18)] backdrop-blur-xl transition-all md:min-h-[5.7rem] md:rounded-[1.7rem] md:px-4 md:text-lg ${toneClass}`}
                >
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70 md:left-3 md:top-3 md:h-6 md:w-6 md:text-xs">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="max-w-[10rem] md:max-w-none">{option}</span>
                  {isRevealed && isCorrect && (
                    <AssetIcon name="check" className="absolute bottom-2 right-2 h-4 w-4 text-emerald-100 md:h-5 md:w-5" />
                  )}
                </button>
              );
            })}
          </div>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-white" />
      </div>
    </div>
  );
};

export default BossEncounterGame;
