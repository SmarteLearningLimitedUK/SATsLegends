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
}

interface Token {
  id: string;
  value: number;
}

interface QuestionState {
  id: string;
  prompt: string;
  expectedDigits: number[];
  tokenValues: number[];
}

interface DragState {
  token: Token;
  fromLocation: TokenLocation;
  fromIndex: number;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

const GOBLIN_MAX_HEALTH = 10;

const TARGET_ANCHORS: AnchorPoint[] = [{ x: 31 }, { x: 45 }, { x: 59 }, { x: 73 }];

const SOURCE_ANCHORS: AnchorPoint[] = [
  { x: 22 },
  { x: 40 },
  { x: 58 },
  { x: 76 },
];

const PLACE_VALUE_LABELS = ['Thousands', 'Hundreds', 'Tens', 'Units'] as const;
const PLACE_VALUE_SHORT_LABELS = ['Th', 'H', 'T', 'U'] as const;

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
  const thousands = randomInt(1, 9);
  const hundreds = randomInt(0, 9);
  const tens = randomInt(0, 9);
  const units = randomInt(0, 9);

  const expectedDigits = [thousands, hundreds, tens, units];
  const tokenValues = shuffle([...expectedDigits]);
  const promptNumber = parseInt(expectedDigits.join(''), 10);
  const prompt = toWords(promptNumber).toUpperCase();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    expectedDigits,
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
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 390, height: 844 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );

  const layout = useMemo(() => {
    const ratio = viewport.height / Math.max(1, viewport.width);
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;
    const isTallPhone = !isTablet && ratio > 1.95;

    return {
      questionTop: isTablet ? 13.4 : (isTallPhone ? 13.9 : 13.6),
      questionWidth: isTablet ? 45 : 50,
      targetY: isTablet ? 58.2 : (isTallPhone ? 59.2 : 58.6),
      sourceY: isTablet ? 75.4 : (isTallPhone ? 76.8 : 76.1),
      tokenWidth: isTablet ? '10.5%' : '12%',
      targetHeight: isTablet ? '8.2%' : '9%',
      sourceHeight: isTablet ? '9.2%' : '10%',
      targetFont: isTablet ? 'clamp(2.4rem,4.8vw,4.25rem)' : 'clamp(2.1rem,5.8vw,4rem)',
      sourceFont: isTablet ? 'clamp(2.3rem,4.7vw,4.1rem)' : 'clamp(2rem,5.6vw,3.9rem)',
      healthTop: isTablet ? 40 : 44,
      healthWidth: isTablet ? 28 : 33,
    };
  }, [viewport.height, viewport.width]);

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(resolvedLevel));
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const victoryDispatchedRef = useRef(false);
  const playfieldRef = useRef<HTMLDivElement | null>(null);

  const activeTargetAnchors = useMemo(
    () => centeredAnchors(TARGET_ANCHORS, PLACE_VALUE_LABELS.length),
    [],
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
    setTargetSlots(Array(PLACE_VALUE_LABELS.length).fill(null));
    setSourceSlots(shuffle(nextSources));
    setDragState(null);
    setIsResolving(false);
  }, []);

  useEffect(() => {
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const beginDrag = useCallback((
    location: TokenLocation,
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (isResolving || dragState) return;
    const token = location === 'target' ? targetSlots[index] : sourceSlots[index];
    if (!token) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (location === 'target') {
      setTargetSlots((prev) => prev.map((item, slotIndex) => (slotIndex === index ? null : item)));
    } else {
      setSourceSlots((prev) => prev.map((item, slotIndex) => (slotIndex === index ? null : item)));
    }

    setDragState({
      token,
      fromLocation: location,
      fromIndex: index,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });

    triggerHaptic('selection');
  }, [dragState, isResolving, sourceSlots, targetSlots]);

  const findDropCandidate = useCallback((clientX: number, clientY: number): { location: TokenLocation; index: number } | null => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const targetRadius = Math.max(38, rect.width * 0.06);

    let best: { location: TokenLocation; index: number; distance: number } | null = null;

    activeTargetAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.targetY / 100) * rect.height;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!best || d < best.distance) best = { location: 'target', index, distance: d };
    });

    activeSourceAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.sourceY / 100) * rect.height;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!best || d < best.distance) best = { location: 'source', index, distance: d };
    });

    if (!best || best.distance > targetRadius) return null;
    return { location: best.location, index: best.index };
  }, [activeSourceAnchors, activeTargetAnchors, layout.sourceY, layout.targetY]);

  const placeTokenInArrays = useCallback((candidate: { location: TokenLocation; index: number } | null) => {
    if (!dragState) return;

    const nextTargets = [...targetSlots];
    const nextSources = [...sourceSlots];

    const getToken = (location: TokenLocation, index: number): Token | null => (
      location === 'target' ? nextTargets[index] : nextSources[index]
    );

    const setToken = (location: TokenLocation, index: number, token: Token | null) => {
      if (location === 'target') nextTargets[index] = token;
      else nextSources[index] = token;
    };

    if (!candidate) {
      setToken(dragState.fromLocation, dragState.fromIndex, dragState.token);
      setTargetSlots(nextTargets);
      setSourceSlots(nextSources);
      return;
    }

    const destinationToken = getToken(candidate.location, candidate.index);
    setToken(candidate.location, candidate.index, dragState.token);

    if (destinationToken) {
      setToken(dragState.fromLocation, dragState.fromIndex, destinationToken);
    }

    setTargetSlots(nextTargets);
    setSourceSlots(nextSources);
  }, [dragState, sourceSlots, targetSlots]);

  useEffect(() => {
    if (!dragState) return undefined;

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      setDragState((current) => {
        if (!current || current.pointerId !== event.pointerId) return current;
        return {
          ...current,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      });
    };

    const onFinish = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const candidate = findDropCandidate(event.clientX, event.clientY);
      placeTokenInArrays(candidate);
      setDragState(null);
      triggerHaptic('selection');
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onFinish);
    window.addEventListener('pointercancel', onFinish);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onFinish);
      window.removeEventListener('pointercancel', onFinish);
    };
  }, [dragState, findDropCandidate, placeTokenInArrays]);

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

    const isCorrect = targetSlots.every((token, index) => token?.value === question.expectedDigits[index]);
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
  }, [advanceRound, goblinHealth, isResolving, question.expectedDigits, resolvedLevel, targetSlots]);

  const numberStyle: React.CSSProperties = {
    WebkitTextStroke: '2px #050b1d',
    textShadow: '0 3px 0 rgba(5,11,29,0.95), 0 0 10px rgba(148,163,184,0.42)',
  };

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none" style={{ touchAction: 'manipulation' }}>
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

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]">
        Score {score}
      </div>

      <div
        className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-center"
        style={{ top: `${layout.questionTop}%`, width: `${layout.questionWidth}%` }}
      >
        <div
          className="text-[clamp(0.72rem,1.8vw,1.08rem)] font-black leading-tight tracking-[0.04em] text-white"
          style={{ textShadow: '0 2px 6px rgba(2,6,23,0.62)' }}
        >
          {question.prompt}
        </div>
      </div>

      <div
        className="absolute right-[2%] z-30 max-w-[15rem] rounded-xl bg-slate-900/72 px-2.5 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.48)]"
        style={{ top: `${layout.healthTop}%`, width: `${layout.healthWidth}%` }}
      >
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

      <div ref={playfieldRef} className="absolute inset-0 z-20">
        {activeTargetAnchors.map((anchor, idx) => {
          const token = targetSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'target' && dragState.fromIndex === idx;
          return (
            <button
              key={`target-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('target', idx, event)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl"
              style={{ left: `${anchor.x}%`, top: `${layout.targetY}%`, width: layout.tokenWidth, height: layout.targetHeight }}
            >
              <div className="pointer-events-none absolute bottom-[78%] left-1/2 -translate-x-1/2 rounded-full border border-white/25 bg-slate-900/75 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
                {PLACE_VALUE_LABELS[idx]}
              </div>
              <div className="pointer-events-none absolute left-1/2 top-[8%] h-[54%] w-[80%] -translate-x-1/2 rounded-xl border-2 border-dashed border-cyan-100/85 bg-[#0f2f62]/36 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
                <span className="absolute inset-0 flex items-center justify-center text-[clamp(0.72rem,1.8vw,1rem)] font-black uppercase tracking-[0.1em] text-cyan-100/45">
                  {PLACE_VALUE_SHORT_LABELS[idx]}
                </span>
              </div>
              <div className="pointer-events-none absolute bottom-[7%] left-1/2 h-[21%] w-[82%] -translate-x-1/2 rounded-[999px] border border-slate-200/35 bg-black/22 shadow-[0_8px_16px_rgba(2,6,23,0.45)]" />
              {token ? (
                <span
                  className="absolute left-1/2 top-[26%] z-10 block -translate-x-1/2 font-black text-white"
                  style={{ ...numberStyle, fontSize: layout.targetFont }}
                >
                  {token.value}
                </span>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </button>
          );
        })}
      </div>

      <div className="absolute inset-0 z-20">
        {activeSourceAnchors.map((anchor, idx) => {
          const token = sourceSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'source' && dragState.fromIndex === idx;
          return (
            <button
              key={`source-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('source', idx, event)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl"
              style={{ left: `${anchor.x}%`, top: `${layout.sourceY}%`, width: layout.tokenWidth, height: layout.sourceHeight }}
            >
              <div className="pointer-events-none absolute bottom-[7%] left-1/2 h-[22%] w-[82%] -translate-x-1/2 rounded-[999px] border border-slate-200/35 bg-black/22 shadow-[0_8px_16px_rgba(2,6,23,0.45)]" />
              {token ? (
                <motion.span
                  layout
                  className="absolute left-1/2 top-[20%] block -translate-x-1/2 font-black text-white"
                  style={{ ...numberStyle, fontSize: layout.sourceFont }}
                >
                  {token.value}
                </motion.span>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </button>
          );
        })}
      </div>

      {dragState ? (
        (() => {
          const relative = getRelativePoint(dragState.clientX, dragState.clientY);
          return (
            <motion.div
              className="pointer-events-none absolute z-[80] flex items-center justify-center rounded-xl"
              style={{
                left: relative.x - dragState.offsetX,
                top: relative.y - dragState.offsetY,
                width: dragState.width,
                height: dragState.height,
              }}
              initial={{ scale: 1 }}
              animate={{ scale: 1.03 }}
            >
              <span className="absolute left-1/2 top-[24%] -translate-x-1/2 font-black text-white" style={{ ...numberStyle, fontSize: layout.sourceFont }}>
                {dragState.token.value}
              </span>
              <span className="absolute bottom-[8%] left-1/2 h-[22%] w-[82%] -translate-x-1/2 rounded-[999px] border border-slate-200/35 bg-black/22" />
            </motion.div>
          );
        })()
      ) : null}

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
