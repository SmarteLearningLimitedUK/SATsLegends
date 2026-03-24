import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import GameActionDock from '../components/GameActionDock';
import { AVATARS } from '../constants';
import insideDojoBackground from '../assets/maps/inside dojo.jpg';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface NumberLineRange {
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

interface NumberLineQuestion {
  id: string;
  title: string;
  prompt: string;
  lineText: string;
  lineMin: number;
  lineMax: number;
  ticks: number[];
  tickLabels?: Record<number, string>;
  marker?: number;
  markerLabel?: string;
  range?: NumberLineRange;
  options: string[];
  answers: string[];
  multiSelect?: boolean;
}

const QUESTION_BANK: NumberLineQuestion[] = [
  {
    id: 'missing-basic',
    title: 'Missing Number',
    prompt: 'A number line goes from 0 to 20. What number is missing?',
    lineText: '0 â€” 5 â€” ? â€” 15 â€” 20',
    lineMin: 0,
    lineMax: 20,
    ticks: [0, 5, 10, 15, 20],
    tickLabels: { 10: '?' },
    options: ['8', '10', '12', '14'],
    answers: ['10'],
  },
  {
    id: 'missing-thirds',
    title: 'Equal Parts',
    prompt: 'The line from 0 to 1 is split into 3 equal parts. What are the two missing numbers?',
    lineText: '0 â€” ? â€” ? â€” 1',
    lineMin: 0,
    lineMax: 1,
    ticks: [0, 1 / 3, 2 / 3, 1],
    tickLabels: { [1 / 3]: '?', [2 / 3]: '?' },
    options: ['1/2', '1/3', '2/3', '3/4'],
    answers: ['1/3', '2/3'],
    multiSelect: true,
  },
  {
    id: 'step-size',
    title: 'Step Size',
    prompt: 'A number line shows 40 â€” 60 â€” 80 â€” 100. What is the value of each step?',
    lineText: '40 â€” 60 â€” 80 â€” 100',
    lineMin: 40,
    lineMax: 100,
    ticks: [40, 60, 80, 100],
    options: ['10', '15', '20', '25'],
    answers: ['20'],
  },
  {
    id: 'fraction-point',
    title: 'Fractions',
    prompt: 'A number line from 0 to 1 is divided into 4 equal parts. A point is on the third mark. What fraction is this?',
    lineText: '0 â€” 1/4 â€” 1/2 â€” â€¢ â€” 1',
    lineMin: 0,
    lineMax: 1,
    ticks: [0, 0.25, 0.5, 0.75, 1],
    tickLabels: { 0: '0', 0.25: '1/4', 0.5: '1/2', 0.75: '3/4', 1: '1' },
    marker: 0.75,
    options: ['1/4', '1/2', '3/4', '4/4'],
    answers: ['3/4'],
  },
  {
    id: 'decimal-mid',
    title: 'Decimals',
    prompt: 'The point is halfway between 0.2 and 0.3. What number is this?',
    lineText: '0.1 â€” 0.2 â€” â€¢ â€” 0.3 â€” 0.4',
    lineMin: 0.1,
    lineMax: 0.4,
    ticks: [0.1, 0.2, 0.3, 0.4],
    marker: 0.25,
    markerLabel: 'â€¢',
    options: ['0.2', '0.24', '0.25', '0.3'],
    answers: ['0.25'],
  },
  {
    id: 'negative-mid',
    title: 'Negative Numbers',
    prompt: 'A number line shows -10 â€” -5 â€” 0 â€” 5. What number is halfway between -10 and 0?',
    lineText: '-10 â€” -5 â€” 0 â€” 5',
    lineMin: -10,
    lineMax: 5,
    ticks: [-10, -5, 0, 5],
    marker: -5,
    options: ['-7.5', '-6', '-5', '-4'],
    answers: ['-5'],
  },
  {
    id: 'reasoning-midpoint',
    title: 'Reasoning',
    prompt: 'A point lies exactly halfway between 0.6 and 1.0. What is the value of the point?',
    lineText: '0.6 â€” â€¢ â€” 1.0',
    lineMin: 0.6,
    lineMax: 1.0,
    ticks: [0.6, 0.8, 1.0],
    marker: 0.8,
    options: ['0.7', '0.75', '0.8', '0.9'],
    answers: ['0.8'],
  },
  {
    id: 'inequality',
    title: 'Inequalities',
    prompt: 'The number line shows all values greater than 2 but less than or equal to 6. Write this as an inequality.',
    lineText: 'open at 2, closed at 6',
    lineMin: 0,
    lineMax: 8,
    ticks: [0, 2, 4, 6, 8],
    range: { gt: 2, lte: 6 },
    options: ['2 < x < 6', '2 â‰¤ x < 6', '2 < x â‰¤ 6', '2 â‰¤ x â‰¤ 6'],
    answers: ['2 < x <= 6'],
  },
];

const normalizeAnswer = (value: string) => (
  value
    .toLowerCase()
    .replace(/â‰¤/g, '<=')
    .replace(/â‰¥/g, '>=')
    .replace(/\s+/g, '')
);

const scoreToStars = (accuracy: number, livesLeft: number): number => {
  if (accuracy >= 0.875 && livesLeft >= 2) return 3;
  if (accuracy >= 0.65) return 2;
  return 1;
};

const valueToPercent = (value: number, min: number, max: number) => {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
};

const formatTick = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
};

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [lives, setLives] = useState(3);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const questions = useMemo(() => QUESTION_BANK, []);
  const current = questions[questionIndex];
  const targetScore = questions.length * 140 + levelId * 20;
  const progress = Math.min((score / Math.max(targetScore, 1)) * 100, 100);

  useEffect(() => {
    setQuestionIndex(0);
    setScore(0);
    setTimeLeft(120 + Math.min(levelId, 15) * 4);
    setLives(3);
    setSelectedAnswers([]);
    setFeedback(null);
    setLocked(false);
    setCorrectCount(0);
    setIsComplete(false);
  }, [levelId]);

  useEffect(() => {
    if (isComplete || lives <= 0) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          onGameOver(score);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isComplete, lives, onGameOver, score]);

  const moveNext = (wasCorrect: boolean, nextLives: number, nextScore: number) => {
    const atLastQuestion = questionIndex >= questions.length - 1;
    if (atLastQuestion) {
      if (wasCorrect) {
        const accuracy = (correctCount + 1) / questions.length;
        const stars = scoreToStars(accuracy, nextLives);
        setIsComplete(true);
        window.setTimeout(() => onVictory(stars, nextScore), 520);
      } else if (nextLives <= 0) {
        setIsComplete(true);
        window.setTimeout(() => onGameOver(nextScore), 420);
      } else {
        const accuracy = correctCount / questions.length;
        const stars = scoreToStars(accuracy, nextLives);
        setIsComplete(true);
        window.setTimeout(() => onVictory(stars, nextScore), 520);
      }
      return;
    }

    window.setTimeout(() => {
      if (nextLives <= 0) {
        onGameOver(nextScore);
        return;
      }
      setQuestionIndex((prev) => prev + 1);
      setSelectedAnswers([]);
      setFeedback(null);
      setLocked(false);
    }, 620);
  };

  const toggleOption = (option: string) => {
    if (locked || !current) return;
    if (current.multiSelect) {
      setSelectedAnswers((prev) => (
        prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
      ));
      return;
    }
    setSelectedAnswers([option]);
  };

  const submitAnswer = () => {
    if (!current || locked || selectedAnswers.length === 0) return;
    setLocked(true);

    const normalizedSelected = selectedAnswers.map(normalizeAnswer).sort();
    const normalizedExpected = current.answers.map(normalizeAnswer).sort();
    const isCorrect = (
      normalizedSelected.length === normalizedExpected.length
      && normalizedExpected.every((answer, index) => normalizedSelected[index] === answer)
    );

    if (isCorrect) {
      const gained = 140 + Math.max(0, Math.floor(timeLeft / 3));
      const nextScore = score + gained;
      const nextLives = lives;
      setScore(nextScore);
      setCorrectCount((prev) => prev + 1);
      setFeedback({ tone: 'success', message: 'Perfect mark!' });
      moveNext(true, nextLives, nextScore);
      return;
    }

    const nextLives = lives - 1;
    const nextScore = Math.max(0, score - 35);
    setLives(nextLives);
    setScore(nextScore);
    setFeedback({ tone: 'error', message: `Not quite. Correct answer: ${current.answers.join(' and ')}` });
    moveNext(false, nextLives, nextScore);
  };

  if (!current) return null;

  const rangeStart = current.range ? (current.range.gte ?? current.range.gt ?? current.lineMin) : null;
  const rangeEnd = current.range ? (current.range.lte ?? current.range.lt ?? current.lineMax) : null;
  const rangeStartOpen = current.range ? current.range.gt !== undefined : false;
  const rangeEndOpen = current.range ? current.range.lt !== undefined : false;

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      <img
        src={insideDojoBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col gap-3 px-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-3 md:gap-4 md:px-4 md:pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <section className="shrink-0 rounded-2xl border border-cyan-100/35 bg-black/42 p-3 text-center shadow-[0_10px_24px_rgba(2,6,23,0.5)] backdrop-blur-sm md:p-4">
          <div className="min-w-0">
            <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">
              {current.title}
            </div>
            <div className="mt-1 text-center text-sm font-bold leading-snug text-white md:text-base">
              {current.prompt}
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Progress</div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full border border-cyan-100/25 bg-slate-950/65">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.1em] text-white/90">{score}/{targetScore}</div>
            <div className="rounded-full border border-rose-200/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-rose-100">
              Lives {lives}
            </div>
          </div>
        </section>

        <section className="shrink-0 rounded-2xl border border-cyan-100/30 bg-black/40 p-3 shadow-[0_10px_20px_rgba(2,6,23,0.45)] backdrop-blur-sm md:p-4">
          <div className="relative mx-auto h-24 w-[95%] md:h-28">
            <div className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200/90 via-white/90 to-cyan-200/90" />

            {rangeStart !== null && rangeEnd !== null ? (
              <div
                className="absolute top-1/2 h-[8px] -translate-y-1/2 rounded-full bg-amber-300/70"
                style={{
                  left: `${valueToPercent(rangeStart, current.lineMin, current.lineMax)}%`,
                  width: `${valueToPercent(rangeEnd, current.lineMin, current.lineMax) - valueToPercent(rangeStart, current.lineMin, current.lineMax)}%`,
                }}
              />
            ) : null}

            {current.ticks.map((tick) => {
              const left = valueToPercent(tick, current.lineMin, current.lineMax);
              const label = current.tickLabels?.[tick] ?? formatTick(tick);
              return (
                <div key={`${current.id}-tick-${tick}`} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%` }}>
                  <div className="h-6 w-[3px] rounded-full bg-white/95" />
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-black text-white/92 md:text-xs">
                    {label}
                  </div>
                </div>
              );
            })}

            {current.marker !== undefined ? (
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${valueToPercent(current.marker, current.lineMin, current.lineMax)}%` }}
              >
                <div className="h-7 w-7 rounded-full border-2 border-cyan-200 bg-cyan-400/75 shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-black text-cyan-100">
                  {current.markerLabel ?? '•'}
                </div>
              </div>
            ) : null}

            {rangeStart !== null ? (
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${valueToPercent(rangeStart, current.lineMin, current.lineMax)}%` }}
              >
                <div className={`h-5 w-5 rounded-full border-2 border-amber-100 ${rangeStartOpen ? 'bg-slate-900' : 'bg-amber-200'}`} />
              </div>
            ) : null}

            {rangeEnd !== null ? (
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${valueToPercent(rangeEnd, current.lineMin, current.lineMax)}%` }}
              >
                <div className={`h-5 w-5 rounded-full border-2 border-amber-100 ${rangeEndOpen ? 'bg-slate-900' : 'bg-amber-200'}`} />
              </div>
            ) : null}
          </div>
        </section>

        <section className="shrink-0 flex flex-col gap-3 rounded-2xl border border-cyan-100/28 bg-black/36 p-3 text-center shadow-[0_10px_20px_rgba(2,6,23,0.42)] backdrop-blur-sm md:p-4">
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            {current.options.map((option) => {
              const active = selectedAnswers.includes(option);
              return (
                <button
                  key={`${current.id}-${option}`}
                  type="button"
                  onClick={() => toggleOption(option)}
                  disabled={locked}
                  className={`rounded-xl border px-3 py-3 text-center text-sm font-black transition md:text-base ${
                    active
                      ? 'border-cyan-200 bg-cyan-400/28 text-white shadow-[0_8px_20px_rgba(6,182,212,0.25)]'
                      : 'border-white/16 bg-slate-900/45 text-white/90 hover:border-cyan-100/40'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-col items-center justify-center gap-2">
            <div className="text-center text-xs font-bold text-cyan-100/76">
              {current.multiSelect ? 'Select all correct answers, then submit.' : 'Select one answer, then submit.'}
            </div>
            <button
              type="button"
              onClick={submitAnswer}
              disabled={locked || selectedAnswers.length === 0}
              className="rounded-full border border-cyan-100/45 bg-cyan-400/22 px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white disabled:opacity-45"
            >
              Submit
            </button>
          </div>
        </section>

        <AnimatePresence>
          {feedback ? (
            <motion.div
              key={feedback.message}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className={`absolute bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-black uppercase tracking-[0.12em] shadow-[0_16px_32px_rgba(2,6,23,0.55)] ${
                feedback.tone === 'success'
                  ? 'border-emerald-200/80 bg-emerald-500/30 text-emerald-50'
                  : 'border-rose-200/80 bg-rose-500/30 text-rose-50'
              }`}
            >
              {feedback.message}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.35rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
          <div className="pointer-events-auto">
            <GameActionDock onBack={onBack} compact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberLineNinjaGame;

