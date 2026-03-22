import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, CircleDollarSign } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import ribbonAsset from '../assets/casual_ui/dialogs_panels/ribbon_1.png';
import { triggerHaptic } from '../haptics';

interface SimplifySprintGameProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface FractionPair {
  numerator: number;
  denominator: number;
}

interface RoundQuestion {
  id: string;
  prompt: FractionPair;
  answer: FractionPair;
  options: FractionPair[];
}

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return Math.max(1, x);
};

const sameFraction = (a: FractionPair, b: FractionPair) => a.numerator === b.numerator && a.denominator === b.denominator;

const simplify = (pair: FractionPair): FractionPair => {
  const d = gcd(pair.numerator, pair.denominator);
  return {
    numerator: Math.floor(pair.numerator / d),
    denominator: Math.floor(pair.denominator / d),
  };
};

const fractionKey = (pair: FractionPair) => `${pair.numerator}/${pair.denominator}`;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const makeQuestion = (level: number, round: number): RoundQuestion => {
  const maxDen = Math.min(12 + level + round, 28);
  let baseDen = randomInt(2, Math.max(4, maxDen));
  let baseNum = randomInt(1, Math.max(2, baseDen - 1));
  if (level >= 5 && Math.random() > 0.58) {
    baseNum = randomInt(baseDen + 1, Math.max(baseDen + 2, baseDen * 2));
  }

  const base = simplify({ numerator: baseNum, denominator: baseDen });
  const multiplier = randomInt(2, Math.min(9, 3 + Math.floor(level / 2)));
  const prompt = {
    numerator: base.numerator * multiplier,
    denominator: base.denominator * multiplier,
  };
  const answer = simplify(prompt);

  const distractorPool: FractionPair[] = [
    { numerator: Math.max(1, answer.numerator + 1), denominator: answer.denominator },
    { numerator: Math.max(1, answer.numerator - 1), denominator: answer.denominator },
    { numerator: answer.numerator, denominator: Math.max(2, answer.denominator + 1) },
    { numerator: answer.numerator, denominator: Math.max(2, answer.denominator - 1) },
    simplify({ numerator: Math.max(1, prompt.numerator - gcd(prompt.numerator, prompt.denominator)), denominator: prompt.denominator }),
    simplify({ numerator: prompt.numerator, denominator: Math.max(2, prompt.denominator - gcd(prompt.numerator, prompt.denominator)) }),
  ]
    .filter((option) => option.denominator !== 0 && !sameFraction(option, answer))
    .map((option) => simplify(option));

  const options = shuffle(
    [answer, ...shuffle(distractorPool).filter((option, idx, arr) => (
      arr.findIndex((candidate) => fractionKey(candidate) === fractionKey(option)) === idx
    )).slice(0, 3)],
  );

  while (options.length < 4) {
    const fallback = simplify({
      numerator: Math.max(1, answer.numerator + randomInt(-2, 2)),
      denominator: Math.max(2, answer.denominator + randomInt(-2, 2)),
    });
    if (!options.some((option) => sameFraction(option, fallback))) {
      options.push(fallback);
    }
  }

  return {
    id: `${Date.now()}-${round}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    answer,
    options: shuffle(options),
  };
};

const scoreToStars = (accuracy: number, lives: number, timeLeft: number) => {
  if (accuracy >= 0.9 && lives >= 3 && timeLeft >= 14) return 3;
  if (accuracy >= 0.65 && lives >= 2) return 2;
  return 1;
};

const FractionView: React.FC<{ pair: FractionPair; className?: string }> = ({ pair, className = '' }) => (
  <div className={`inline-flex flex-col items-center justify-center ${className}`.trim()}>
    <span className="text-[clamp(1.65rem,4vw,2.9rem)] font-black leading-none">{pair.numerator}</span>
    <span className="my-1 h-[3px] w-[72%] rounded-full bg-white/95" />
    <span className="text-[clamp(1.65rem,4vw,2.9rem)] font-black leading-none">{pair.denominator}</span>
  </div>
);

const SimplifySprintGame: React.FC<SimplifySprintGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isBoss: _isBoss = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const totalRounds = useMemo(() => Math.min(12, 6 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);
  const initialTime = useMemo(() => Math.max(36, 64 - (resolvedLevel * 2)), [resolvedLevel]);

  const [roundNumber, setRoundNumber] = useState(1);
  const [question, setQuestion] = useState<RoundQuestion>(() => makeQuestion(resolvedLevel, 1));
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  scoreRef.current = score;

  useEffect(() => {
    endedRef.current = false;
    setRoundNumber(1);
    setQuestion(makeQuestion(resolvedLevel, 1));
    setTimeLeft(initialTime);
    setScore(0);
    setLives(4);
    setAttempts(0);
    setCorrectAnswers(0);
    setLocked(false);
    setFeedback(null);
  }, [initialTime, resolvedLevel]);

  useEffect(() => {
    if (endedRef.current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!endedRef.current) {
            endedRef.current = true;
            window.setTimeout(() => onGameOver(scoreRef.current), 120);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onGameOver]);

  const finishVictory = useCallback((finalScore: number, nextAttempts: number, nextCorrect: number, nextLives: number, nextTime: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const accuracy = nextAttempts > 0 ? nextCorrect / nextAttempts : 1;
    const stars = scoreToStars(accuracy, nextLives, nextTime);
    window.setTimeout(() => onVictory(stars, finalScore), 380);
  }, [onVictory]);

  const handleOption = (option: FractionPair) => {
    if (locked || endedRef.current) return;
    setLocked(true);

    const nextAttempts = attempts + 1;
    const isCorrect = sameFraction(option, question.answer);

    setAttempts(nextAttempts);

    if (isCorrect) {
      const awarded = 100 + Math.max(0, Math.floor(timeLeft * 0.8)) + (resolvedLevel * 12);
      const nextScore = score + awarded;
      const nextCorrect = correctAnswers + 1;
      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setFeedback({ tone: 'success', text: 'Correct simplification!' });
      triggerHaptic('success');

      if (roundNumber >= totalRounds) {
        finishVictory(nextScore, nextAttempts, nextCorrect, lives, timeLeft);
        return;
      }

      window.setTimeout(() => {
        const nextRound = roundNumber + 1;
        setRoundNumber(nextRound);
        setQuestion(makeQuestion(resolvedLevel, nextRound));
        setFeedback(null);
        setLocked(false);
      }, 520);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedback({ tone: 'error', text: `Not quite. ${question.answer.numerator}/${question.answer.denominator}` });
    triggerHaptic('error');

    if (nextLives <= 0) {
      endedRef.current = true;
      window.setTimeout(() => onGameOver(score), 420);
      return;
    }

    window.setTimeout(() => {
      setQuestion(makeQuestion(resolvedLevel, roundNumber));
      setFeedback(null);
      setLocked(false);
    }, 560);
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white">
      <GameplaySceneBackdrop gameType="fraction_match" className="opacity-[0.98]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050a1bd1] via-[#07122bc4] to-[#030816eb]" />

      <div className="absolute left-0 right-0 z-30 flex items-center justify-between px-3 py-2 md:px-5" style={{ top: 'calc(env(safe-area-inset-top) + 2px)' }}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/45 bg-[#0a1f56]/88 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-cyan-100" />
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-[#0a1f56]/92 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
          <AssetIcon name="timer" className="h-4 w-4" />
          <span className="text-xs font-black tabular-nums">{timeLeft}s</span>
          <span className="h-4 w-px bg-cyan-100/35" />
          <CircleDollarSign className="h-4 w-4 text-yellow-300" />
          <span className="text-xs font-black tabular-nums">{score}</span>
        </div>
      </div>

      <div className="relative z-20 flex h-full w-full flex-col items-center justify-start px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+3.9rem)]">
        <div className="relative w-[min(92vw,720px)]">
          <img src={ribbonAsset} alt="" className="h-auto w-full object-contain" draggable={false} />
          <div className="absolute inset-0 flex items-center justify-center px-[10%] pt-[5%] text-center">
            <span className="text-[clamp(1rem,2.8vw,2rem)] font-black leading-tight text-yellow-50 drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
              Simplify this fraction
            </span>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-cyan-200/45 bg-[#0a1f56]/72 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-cyan-50">
          Round {Math.min(roundNumber, totalRounds)} / {totalRounds}
        </div>

        <div className="mt-5 rounded-[1.5rem] border-2 border-cyan-200/45 bg-gradient-to-b from-sky-500/95 to-blue-700/95 px-10 py-6 shadow-[0_18px_34px_rgba(0,0,0,0.5)]">
          <FractionView pair={question.prompt} />
        </div>

        <div className="mt-6 grid w-full max-w-[740px] grid-cols-2 gap-3 md:gap-4">
          {question.options.map((option) => (
            <motion.button
              key={`${question.id}-${fractionKey(option)}`}
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={locked}
              onClick={() => handleOption(option)}
              className="rounded-[1.1rem] border border-cyan-200/45 bg-[#0a1f56]/86 px-2 py-4 shadow-[0_14px_26px_rgba(0,0,0,0.45)] transition hover:bg-[#11307c]/90 disabled:opacity-70"
            >
              <FractionView pair={option} className="text-cyan-50" />
            </motion.button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-1.5 rounded-full border border-cyan-200/45 bg-[#0a1f56]/82 px-3 py-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <span
              key={`life-${idx}`}
              className={`h-2.5 w-2.5 rounded-full ${idx < lives ? 'bg-rose-400 shadow-[0_0_7px_rgba(251,113,133,0.8)]' : 'bg-slate-500/40'}`}
            />
          ))}
          <span className="ml-1 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-50">Lives</span>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className={`mt-3 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                feedback.tone === 'success'
                  ? 'border-emerald-300/65 bg-emerald-300/20 text-emerald-50'
                  : 'border-rose-300/65 bg-rose-300/20 text-rose-50'
              }`}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimplifySprintGame;
