import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import placeValueBackground from '../assets/maps/place value background.png';
import { triggerHaptic } from '../haptics';

interface PlaceValuePanicGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type PlaceUnit = 'tenThousands' | 'thousands' | 'hundreds' | 'tens' | 'ones';
type TokenLocation = 'stump' | 'answer';

interface Token {
  id: string;
  value: number;
}

interface QuestionState {
  id: string;
  units: PlaceUnit[];
  prompt: string;
  expected: string;
  tokenValues: number[];
}

interface SelectedTokenRef {
  location: TokenLocation;
  index: number;
}

interface StumpPoint {
  x: number;
  y: number;
}

const GOBLIN_MAX_HEALTH = 10;

const STUMP_POINTS: StumpPoint[] = [
  { x: 13, y: 79 },
  { x: 25, y: 81 },
  { x: 37, y: 79 },
  { x: 49, y: 81 },
  { x: 61, y: 79 },
  { x: 73, y: 81 },
  { x: 85, y: 79 },
  { x: 24, y: 90 },
  { x: 38, y: 92 },
  { x: 52, y: 90 },
  { x: 66, y: 92 },
  { x: 80, y: 90 },
];

const PLACE_TEXT: Record<PlaceUnit, string> = {
  tenThousands: 'ten-thousands',
  thousands: 'thousands',
  hundreds: 'hundreds',
  tens: 'tens',
  ones: 'ones',
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const getUnitsForLevel = (level: number): PlaceUnit[] => {
  if (level <= 2) return ['hundreds', 'tens', 'ones'];
  if (level <= 6) return ['thousands', 'hundreds', 'tens', 'ones'];
  return ['tenThousands', 'thousands', 'hundreds', 'tens', 'ones'];
};

const scoreToStars = (accuracy: number): number => {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const makeQuestion = (miniGameLevel: number): QuestionState => {
  const units = getUnitsForLevel(miniGameLevel);
  const digits = units.map((unit, index) => {
    const min = index === 0 && (unit === 'tenThousands' || unit === 'thousands' || unit === 'hundreds') ? 1 : 0;
    return randomInt(min, 9);
  });

  const hasDistractor = miniGameLevel >= 5;
  const distractor = hasDistractor ? randomInt(0, 9) : null;
  const tokenValues = shuffle(hasDistractor ? [...digits, distractor as number] : [...digits]);
  const expected = digits.join('');

  const prompt = `Arrange digits to make: ${units
    .map((unit, idx) => `${digits[idx]} ${PLACE_TEXT[unit]}`)
    .join(', ')}.`;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    units,
    prompt,
    expected,
    tokenValues,
  };
};

const PlaceValuePanicGame: React.FC<PlaceValuePanicGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(resolvedLevel));
  const [stumps, setStumps] = useState<Array<Token | null>>(() => Array(STUMP_POINTS.length).fill(null));
  const [answers, setAnswers] = useState<Array<Token | null>>(() => Array(question.units.length).fill(null));
  const [selected, setSelected] = useState<SelectedTokenRef | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  const victoryDispatchedRef = useRef(false);

  const distributeTokensToStumps = useCallback((tokenValues: number[], seedId: string) => {
    const nextStumps: Array<Token | null> = Array(STUMP_POINTS.length).fill(null);
    const openIndices = shuffle(Array.from({ length: STUMP_POINTS.length }, (_, index) => index)).slice(0, tokenValues.length);

    tokenValues.forEach((value, idx) => {
      const targetIndex = openIndices[idx];
      nextStumps[targetIndex] = {
        id: `${seedId}-token-${idx}`,
        value,
      };
    });

    return nextStumps;
  }, []);

  const resetForQuestion = useCallback((nextQuestion: QuestionState) => {
    setQuestion(nextQuestion);
    setStumps(distributeTokensToStumps(nextQuestion.tokenValues, nextQuestion.id));
    setAnswers(Array(nextQuestion.units.length).fill(null));
    setSelected(null);
    setIsResolving(false);
  }, [distributeTokensToStumps]);

  useEffect(() => {
    resetForQuestion(makeQuestion(resolvedLevel));
  }, [resetForQuestion, resolvedLevel]);

  const handleMoveToken = useCallback((toLocation: TokenLocation, toIndex: number) => {
    if (!selected || isResolving) return;

    const nextStumps = [...stumps];
    const nextAnswers = [...answers];

    const getToken = (location: TokenLocation, index: number): Token | null => {
      return location === 'stump' ? nextStumps[index] : nextAnswers[index];
    };

    const setToken = (location: TokenLocation, index: number, token: Token | null) => {
      if (location === 'stump') nextStumps[index] = token;
      else nextAnswers[index] = token;
    };

    const sourceToken = getToken(selected.location, selected.index);
    if (!sourceToken) {
      setSelected(null);
      return;
    }

    const targetToken = getToken(toLocation, toIndex);
    setToken(toLocation, toIndex, sourceToken);
    setToken(selected.location, selected.index, targetToken || null);

    setStumps(nextStumps);
    setAnswers(nextAnswers);
    setSelected(null);
    triggerHaptic('selection');
  }, [answers, isResolving, selected, stumps]);

  const handleSlotPress = useCallback((location: TokenLocation, index: number) => {
    const token = location === 'stump' ? stumps[index] : answers[index];

    if (!selected) {
      if (!token || isResolving) return;
      setSelected({ location, index });
      triggerHaptic('selection');
      return;
    }

    if (selected.location === location && selected.index === index) {
      setSelected(null);
      return;
    }

    handleMoveToken(location, index);
  }, [answers, handleMoveToken, isResolving, selected, stumps]);

  const advanceRound = useCallback((newHealth: number) => {
    if (newHealth <= 0 && !victoryDispatchedRef.current) {
      victoryDispatchedRef.current = true;
      const finalAccuracy = attempts > 0 ? correctAnswers / attempts : 1;
      const stars = scoreToStars(finalAccuracy);
      window.setTimeout(() => onVictory(stars, Math.max(0, score)), 380);
      return;
    }

    const next = makeQuestion(resolvedLevel);
    window.setTimeout(() => {
      setFeedback(null);
      resetForQuestion(next);
    }, 700);
  }, [attempts, correctAnswers, onVictory, resetForQuestion, resolvedLevel, score]);

  useEffect(() => {
    if (isResolving) return;
    if (answers.length === 0 || answers.some((token) => token === null)) return;

    const formedAnswer = answers.map((token) => token?.value ?? '').join('');
    const isCorrect = formedAnswer === question.expected;
    setIsResolving(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      const gained = 120 + (resolvedLevel * 20);
      const newHealth = Math.max(0, goblinHealth - 1);
      setScore((prev) => prev + gained);
      setGoblinHealth(newHealth);
      setCorrectAnswers((prev) => prev + 1);
      setFeedback({ tone: 'success', message: `Direct hit! Goblin HP ${newHealth}/10` });
      triggerHaptic('success');
      advanceRound(newHealth);
      return;
    }

    const newHealth = Math.min(GOBLIN_MAX_HEALTH, goblinHealth + 1);
    setGoblinHealth(newHealth);
    setFeedback({ tone: 'error', message: `Wrong order. Goblin healed to ${newHealth}/10` });
    triggerHaptic('warning');
    advanceRound(newHealth);
  }, [advanceRound, answers, goblinHealth, isResolving, question.expected, resolvedLevel]);

  const answerSlotXs = useMemo(() => {
    const spacing = question.units.length <= 3 ? 13 : 11;
    const start = 50 - ((question.units.length - 1) * spacing) / 2;
    return Array.from({ length: question.units.length }, (_, idx) => start + idx * spacing);
  }, [question.units.length]);

  return (
    <div
      className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none"
      style={{ touchAction: 'manipulation' }}
    >
      <img
        src={placeValueBackground}
        alt="Place Value Panic"
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />

      <button
        type="button"
        onClick={onBack}
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]"
      >
        Back
      </button>

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]">
        Score {score}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[16.5%] z-30 w-[74%] -translate-x-1/2 text-center">
        <div className="text-[clamp(0.75rem,2.2vw,1.1rem)] font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
          {question.prompt}
        </div>
      </div>

      <div className="absolute right-[2.5%] top-[48%] z-30 w-[34%] max-w-[15rem] rounded-xl bg-slate-900/75 px-2.5 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.48)]">
        <div className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
          Goblin Health {goblinHealth}/10
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: GOBLIN_MAX_HEALTH }, (_, idx) => (
            <span
              key={`hp-${idx}`}
              className={`h-2 rounded-full ${
                idx < goblinHealth ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]' : 'bg-slate-600/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute left-1/2 top-[61%] z-30 flex w-[72%] -translate-x-1/2 items-center justify-center gap-2.5">
        {answerSlotXs.map((x, idx) => {
          const token = answers[idx];
          const isSelected = selected?.location === 'answer' && selected.index === idx;

          return (
            <button
              key={`answer-slot-${idx}`}
              type="button"
              onClick={() => handleSlotPress('answer', idx)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 transition-all ${
                token
                  ? 'border-yellow-300/95 bg-gradient-to-b from-[#27438a] to-[#172d63] shadow-[0_10px_20px_rgba(15,23,42,0.5)]'
                  : 'border-cyan-100/70 bg-[#081b45]/45'
              } ${isSelected ? 'ring-4 ring-cyan-300/65' : ''}`}
              style={{
                left: `${x}%`,
                top: '0%',
                width: 'clamp(3.2rem,8.4vw,4.8rem)',
                height: 'clamp(3.2rem,8.4vw,4.8rem)',
              }}
            >
              <span className={`text-[clamp(1.4rem,4vw,2.2rem)] font-black ${token ? 'text-white' : 'text-cyan-100/60'}`}>
                {token ? token.value : '?'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute inset-0 z-20">
        {STUMP_POINTS.map((point, idx) => {
          const token = stumps[idx];
          const isSelected = selected?.location === 'stump' && selected.index === idx;

          return (
            <button
              key={`stump-${idx}`}
              type="button"
              onClick={() => handleSlotPress('stump', idx)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                token ? 'cursor-pointer' : 'cursor-default'
              } ${isSelected ? 'ring-4 ring-cyan-300/65 rounded-2xl' : ''}`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              {token ? (
                <motion.div
                  layout
                  className="flex items-center justify-center rounded-2xl border-2 border-yellow-300/95 bg-gradient-to-b from-[#2f53a2] via-[#213f84] to-[#162a5a] px-3 py-2 shadow-[0_12px_26px_rgba(15,23,42,0.56)]"
                  style={{
                    width: 'clamp(3.1rem,8vw,4.7rem)',
                    height: 'clamp(3.1rem,8vw,4.7rem)',
                  }}
                  whileTap={{ scale: 0.94 }}
                >
                  <span className="text-[clamp(1.5rem,4.2vw,2.4rem)] font-black text-white drop-shadow-[0_2px_6px_rgba(2,6,23,0.7)]">
                    {token.value}
                  </span>
                </motion.div>
              ) : (
                <span className="block h-[clamp(2.8rem,7.8vw,4.2rem)] w-[clamp(2.8rem,7.8vw,4.2rem)] rounded-2xl border border-transparent" />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.message}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-black uppercase tracking-[0.14em] shadow-[0_12px_28px_rgba(2,6,23,0.55)] ${
              feedback.tone === 'success'
                ? 'border-emerald-200/70 bg-emerald-500/35 text-emerald-50'
                : 'border-rose-200/70 bg-rose-500/35 text-rose-50'
            }`}
          >
            {feedback.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default PlaceValuePanicGame;
