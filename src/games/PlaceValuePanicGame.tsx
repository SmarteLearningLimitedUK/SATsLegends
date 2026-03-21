import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import placeValueBackground from '../assets/maps/placevalue2.png';
import { triggerHaptic } from '../haptics';

interface PlaceValuePanicGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type TokenLocation = 'source' | 'target';

interface AnchorPoint {
  x: number;
  y: number;
}

interface Token {
  id: string;
  value: number;
}

interface QuestionState {
  id: string;
  prompt: string;
  expected: string;
  tokenValues: number[];
  slotCount: number;
}

interface SelectionRef {
  location: TokenLocation;
  index: number;
}

const GOBLIN_MAX_HEALTH = 10;

const TARGET_ANCHORS: AnchorPoint[] = [
  { x: 26, y: 58.5 },
  { x: 38, y: 58.5 },
  { x: 50, y: 58.5 },
  { x: 62, y: 58.5 },
  { x: 74, y: 58.5 },
];

const SOURCE_ANCHORS: AnchorPoint[] = [
  { x: 18, y: 75.5 },
  { x: 30, y: 75.5 },
  { x: 42, y: 75.5 },
  { x: 54, y: 75.5 },
  { x: 66, y: 75.5 },
  { x: 78, y: 75.5 },
];

const ONES_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const toWordsUnderHundred = (n: number): string => {
  if (n < 20) return ONES_WORDS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS_WORDS[tens];
  return `${TENS_WORDS[tens]} ${ONES_WORDS[ones]}`;
};

const toWords = (n: number): string => {
  if (n < 100) return toWordsUnderHundred(n);
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0
      ? `${ONES_WORDS[hundreds]} hundred`
      : `${ONES_WORDS[hundreds]} hundred and ${toWordsUnderHundred(rest)}`;
  }
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    if (rest === 0) return `${toWords(thousands)} thousand`;
    if (rest < 100) return `${toWords(thousands)} thousand and ${toWords(rest)}`;
    return `${toWords(thousands)} thousand ${toWords(rest)}`;
  }
  return String(n);
};

const getSlotCount = (level: number): number => {
  if (level <= 2) return 3;
  if (level <= 6) return 4;
  return 5;
};

const scoreToStars = (accuracy: number): number => {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const centeredAnchors = (anchors: AnchorPoint[], count: number): AnchorPoint[] => {
  if (count >= anchors.length) return anchors;
  const start = Math.floor((anchors.length - count) / 2);
  return anchors.slice(start, start + count);
};

const makeQuestion = (level: number): QuestionState => {
  const slotCount = getSlotCount(level);
  const digits = Array.from({ length: slotCount }, (_, idx) => {
    const min = idx === 0 ? 1 : 0;
    return randomInt(min, 9);
  });

  const hasDistractor = level >= 5;
  const distractor = hasDistractor ? randomInt(0, 9) : null;
  const tokenValues = shuffle(hasDistractor ? [...digits, distractor as number] : [...digits]);
  const expected = digits.join('');
  const prompt = toWords(parseInt(expected, 10)).toUpperCase();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    expected,
    tokenValues,
    slotCount,
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
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [selected, setSelected] = useState<SelectionRef | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const victoryDispatchedRef = useRef(false);

  const activeTargetAnchors = useMemo(
    () => centeredAnchors(TARGET_ANCHORS, question.slotCount),
    [question.slotCount],
  );

  const activeSourceAnchors = useMemo(
    () => centeredAnchors(SOURCE_ANCHORS, question.tokenValues.length),
    [question.tokenValues.length],
  );

  const resetRound = useCallback((nextQuestion: QuestionState) => {
    const nextSources: Array<Token | null> = nextQuestion.tokenValues.map((value, idx) => ({
      id: `${nextQuestion.id}-token-${idx}`,
      value,
    }));

    setQuestion(nextQuestion);
    setTargetSlots(Array(nextQuestion.slotCount).fill(null));
    setSourceSlots(shuffle(nextSources));
    setSelected(null);
    setIsResolving(false);
  }, []);

  useEffect(() => {
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  const moveToken = useCallback((toLocation: TokenLocation, toIndex: number) => {
    if (!selected || isResolving) return;

    const nextTargets = [...targetSlots];
    const nextSources = [...sourceSlots];

    const getToken = (location: TokenLocation, index: number): Token | null => (
      location === 'target' ? nextTargets[index] : nextSources[index]
    );

    const setToken = (location: TokenLocation, index: number, token: Token | null) => {
      if (location === 'target') nextTargets[index] = token;
      else nextSources[index] = token;
    };

    const sourceToken = getToken(selected.location, selected.index);
    if (!sourceToken) {
      setSelected(null);
      return;
    }

    const destinationToken = getToken(toLocation, toIndex);
    setToken(toLocation, toIndex, sourceToken);
    setToken(selected.location, selected.index, destinationToken || null);

    setTargetSlots(nextTargets);
    setSourceSlots(nextSources);
    setSelected(null);
    triggerHaptic('selection');
  }, [isResolving, selected, sourceSlots, targetSlots]);

  const handlePress = useCallback((location: TokenLocation, index: number) => {
    const token = location === 'target' ? targetSlots[index] : sourceSlots[index];

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

    moveToken(location, index);
  }, [isResolving, moveToken, selected, sourceSlots, targetSlots]);

  const advanceRound = useCallback((newHealth: number) => {
    if (newHealth <= 0 && !victoryDispatchedRef.current) {
      victoryDispatchedRef.current = true;
      const finalAccuracy = attempts > 0 ? correctAnswers / attempts : 1;
      const stars = scoreToStars(finalAccuracy);
      window.setTimeout(() => onVictory(stars, Math.max(0, score)), 380);
      return;
    }

    const nextQuestion = makeQuestion(resolvedLevel);
    window.setTimeout(() => {
      setFeedback(null);
      resetRound(nextQuestion);
    }, 760);
  }, [attempts, correctAnswers, onVictory, resetRound, resolvedLevel, score]);

  useEffect(() => {
    if (isResolving) return;
    if (targetSlots.length === 0 || targetSlots.some((token) => token === null)) return;

    const formed = targetSlots.map((token) => token?.value ?? '').join('');
    const isCorrect = formed === question.expected;
    setIsResolving(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      const nextHealth = Math.max(0, goblinHealth - 1);
      setGoblinHealth(nextHealth);
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => prev + (140 + resolvedLevel * 22));
      setFeedback({ tone: 'success', message: `DIRECT HIT! GOBLIN HP ${nextHealth}/10` });
      triggerHaptic('success');
      advanceRound(nextHealth);
      return;
    }

    const nextHealth = Math.min(GOBLIN_MAX_HEALTH, goblinHealth + 1);
    setGoblinHealth(nextHealth);
    setFeedback({ tone: 'error', message: `WRONG ORDER! GOBLIN HP ${nextHealth}/10` });
    triggerHaptic('warning');
    advanceRound(nextHealth);
  }, [advanceRound, goblinHealth, isResolving, question.expected, resolvedLevel, targetSlots]);

  const numberStyle: React.CSSProperties = {
    WebkitTextStroke: '2px #050b1d',
    textShadow: '0 3px 0 rgba(5,11,29,0.95), 0 0 10px rgba(148,163,184,0.42)',
  };

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none" style={{ touchAction: 'manipulation' }}>
      <img
        src={placeValueBackground}
        alt="Place Value Panic"
        className="absolute inset-0 h-full w-full object-fill object-center"
        draggable={false}
      />

      <button
        type="button"
        onClick={onBack}
        className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]"
      >
        Back
      </button>

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]">
        Score {score}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[12.5%] z-30 w-[56%] -translate-x-1/2 text-center">
        <div
          className="text-[clamp(0.74rem,2vw,1.15rem)] font-black leading-tight tracking-[0.04em] text-white"
          style={{ textShadow: '0 2px 6px rgba(2,6,23,0.62)' }}
        >
          {question.prompt}
        </div>
      </div>

      <div className="absolute right-[2%] top-[44%] z-30 w-[33%] max-w-[15rem] rounded-xl bg-slate-900/72 px-2.5 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.48)]">
        <div className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.14em] text-amber-200">
          Goblin Health {goblinHealth}/10
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: GOBLIN_MAX_HEALTH }, (_, idx) => (
            <span
              key={`hp-${idx}`}
              className={`h-2 rounded-full ${
                idx < goblinHealth ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.75)]' : 'bg-slate-600/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 z-20">
        {activeTargetAnchors.map((anchor, idx) => {
          const token = targetSlots[idx];
          const isSelected = selected?.location === 'target' && selected.index === idx;
          return (
            <button
              key={`target-${idx}`}
              type="button"
              onClick={() => handlePress('target', idx)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl ${isSelected ? 'ring-4 ring-cyan-300/70' : ''}`}
              style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, width: '12%', height: '9%' }}
            >
              <div className="mx-auto h-[22%] w-[80%] rounded-[999px] border border-slate-200/30 bg-black/18 shadow-[0_8px_16px_rgba(2,6,23,0.45)]" />
              {token ? (
                <span
                  className="mt-1 block text-[clamp(2.1rem,5.8vw,4rem)] font-black text-white"
                  style={numberStyle}
                >
                  {token.value}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="absolute inset-0 z-20">
        {activeSourceAnchors.map((anchor, idx) => {
          const token = sourceSlots[idx];
          const isSelected = selected?.location === 'source' && selected.index === idx;
          return (
            <button
              key={`source-${idx}`}
              type="button"
              onClick={() => handlePress('source', idx)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl ${isSelected ? 'ring-4 ring-cyan-300/70' : ''}`}
              style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, width: '12%', height: '10%' }}
            >
              <div className="mx-auto h-[22%] w-[80%] rounded-[999px] border border-slate-200/30 bg-black/18 shadow-[0_8px_16px_rgba(2,6,23,0.45)]" />
              {token ? (
                <motion.span
                  layout
                  className="mt-1 block text-[clamp(2rem,5.6vw,3.9rem)] font-black text-white"
                  style={numberStyle}
                >
                  {token.value}
                </motion.span>
              ) : null}
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

