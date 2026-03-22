import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import placeValueBackground from '../assets/maps/gemini-2.5-flash-image_using_the_same_aesthetic_-_create_a_dark_and_mysterious_forest_path_with_dense_f-1.jpg';
import medDialogue from '../assets/bluedialoague/med dialogue cropped.png';
import medButton from '../assets/bluedialoague/med button cropped.png';
import blueSocket from '../assets/bluedialoague/blue socket cropped.png';
import goblinEnemy from '../assets/bosses/goblin.png';
import GameActionDock from '../components/GameActionDock';
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
  placeHints: string[];
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

type GoblinEffect = 'idle' | 'hit' | 'heal';

const GOBLIN_MAX_HEALTH = 10;

const TARGET_ANCHORS: AnchorPoint[] = [{ x: 12 }, { x: 31 }, { x: 50 }, { x: 69 }, { x: 88 }];
const SOURCE_ANCHORS: AnchorPoint[] = [{ x: 16 }, { x: 32 }, { x: 48 }, { x: 64 }, { x: 80 }];
const FULL_PLACE_VALUE_HINTS = ['Th', 'Th', 'H', 'T', 'U'] as const;
const TARGET_ROW_Y_OFFSET_PX = 0;

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

const slotCountForLevel = (level: number): number => {
  if (level <= 2) return 2; // T, U
  if (level <= 4) return 3; // H, T, U
  if (level <= 7) return 4; // Th, H, T, U
  return 5; // Th, Th, H, T, U
};

const makeQuestion = (level: number): QuestionState => {
  const slotCount = slotCountForLevel(level);
  let promptNumber: number;
  if (slotCount === 2) {
    promptNumber = randomInt(10, 99);
  } else if (slotCount === 3) {
    promptNumber = randomInt(100, 999);
  } else if (slotCount === 4) {
    promptNumber = randomInt(1000, 9999);
  } else {
    promptNumber = randomInt(10000, 99999);
  }

  const expectedDigits = String(promptNumber)
    .padStart(slotCount, '0')
    .split('')
    .map((digit) => Number(digit));
  const tokenValues = shuffle([...expectedDigits]);
  const placeHints = FULL_PLACE_VALUE_HINTS.slice(FULL_PLACE_VALUE_HINTS.length - slotCount);
  const prompt = toWords(promptNumber).toUpperCase();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    expectedDigits,
    tokenValues,
    placeHints,
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
    const onResize = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      setViewport({ width, height });
    };
    const visualViewport = window.visualViewport;
    window.addEventListener('resize', onResize);
    visualViewport?.addEventListener('resize', onResize);
    visualViewport?.addEventListener('scroll', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('scroll', onResize);
    };
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
      questionTop: isTablet ? 16.4 : (isTallPhone ? 17.0 : 16.8),
      questionWidth: isTablet ? 48 : 58,
      questionHeight: isTablet ? 11.2 : 12.0,
      submitY: isTablet ? 78.6 : (isTallPhone ? 79.2 : 78.9),
      submitWidth: isTablet ? 28 : 44,
      submitHeight: isTablet ? 7.8 : 8.8,
      targetY: isTablet ? 74.8 : (isTallPhone ? 75.2 : 75.0),
      sourceY: isTablet ? 36.8 : (isTallPhone ? 37.4 : 37.1),
      targetWidth: isTablet ? '11.6%' : '13.8%',
      sourceWidth: isTablet ? '8.9%' : '9.8%',
      targetHeight: isTablet ? '10.6%' : '12.4%',
      sourceHeight: isTablet ? '7.6%' : '8.2%',
      targetFont: isTablet ? 'clamp(2.15rem,4.7vw,3.65rem)' : 'clamp(1.95rem,5.1vw,3.25rem)',
      sourceFont: isTablet ? 'clamp(2.15rem,4.7vw,3.65rem)' : 'clamp(1.95rem,5.1vw,3.25rem)',
      healthTop: isTablet ? 57.8 : (isTallPhone ? 59.1 : 58.7),
      healthWidth: isTablet ? 28 : 40,
      healthLeft: isTablet ? 66.7 : 69.4,
      enemyTop: isTablet ? 45.9 : (isTallPhone ? 48.6 : 48.1),
      enemyWidth: isTablet ? 27 : 31,
    };
  }, [viewport.height, viewport.width]);

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(resolvedLevel));
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [initialSourceSlots, setInitialSourceSlots] = useState<Array<Token | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(60);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [goblinEffect, setGoblinEffect] = useState<GoblinEffect>('idle');

  const victoryDispatchedRef = useRef(false);
  const roundTimeoutLockRef = useRef(false);
  const playfieldRef = useRef<HTMLDivElement | null>(null);

  const activeTargetAnchors = useMemo(
    () => centeredAnchors(TARGET_ANCHORS, question.expectedDigits.length),
    [question.expectedDigits.length],
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
    const shuffledSources = shuffle(nextSources);

    setQuestion(nextQuestion);
    setTargetSlots(Array(nextQuestion.expectedDigits.length).fill(null));
    setSourceSlots(shuffledSources);
    setInitialSourceSlots(shuffledSources.map((token) => (token ? { ...token } : null)));
    setDragState(null);
    setIsResolving(false);
    setGoblinEffect('idle');
    setRoundTimeLeft(60);
    roundTimeoutLockRef.current = false;
  }, []);

  useEffect(() => {
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  useEffect(() => {
    if (isResolving) return undefined;
    const intervalId = window.setInterval(() => {
      setRoundTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isResolving, question.id]);

  useEffect(() => {
    if (roundTimeLeft > 0 || isResolving || roundTimeoutLockRef.current) return;
    roundTimeoutLockRef.current = true;
    setIsResolving(true);
    setAttempts((prev) => prev + 1);
    setFeedback({ tone: 'error', message: 'TIME UP! TRY AGAIN.' });
    setGoblinEffect('heal');
    triggerHaptic('warning');
    setTargetSlots(Array(question.expectedDigits.length).fill(null));
    setSourceSlots(initialSourceSlots.map((token) => (token ? { ...token } : null)));

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setIsResolving(false);
      setGoblinEffect('idle');
      setRoundTimeLeft(60);
      roundTimeoutLockRef.current = false;
    }, 620);

    return () => window.clearTimeout(timeoutId);
  }, [initialSourceSlots, isResolving, question.expectedDigits.length, roundTimeLeft]);

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
      const cy = rect.top + (layout.targetY / 100) * rect.height - TARGET_ROW_Y_OFFSET_PX;
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
      if (dragState.fromLocation === 'target') {
        const firstOpenSource = nextSources.findIndex((item) => item === null);
        if (firstOpenSource >= 0) {
          nextSources[firstOpenSource] = dragState.token;
        } else {
          setToken(dragState.fromLocation, dragState.fromIndex, dragState.token);
        }
      } else {
        setToken(dragState.fromLocation, dragState.fromIndex, dragState.token);
      }
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

  const canSubmit = useMemo(
    () => !isResolving && !dragState && targetSlots.length > 0 && targetSlots.every((token) => token !== null),
    [dragState, isResolving, targetSlots],
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    const isCorrect = targetSlots.every((token, index) => token?.value === question.expectedDigits[index]);
    setIsResolving(true);
    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      const nextHealth = Math.max(0, goblinHealth - 1);
      setGoblinHealth(nextHealth);
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => prev + (140 + resolvedLevel * 22));
      setFeedback({ tone: 'success', message: `DIRECT HIT! GOBLIN HP ${nextHealth}/10` });
      setGoblinEffect('hit');
      triggerHaptic('success');
      advanceRound(nextHealth);
      return;
    }

    setFeedback({ tone: 'error', message: 'WRONG ORDER! TRY AGAIN.' });
    setGoblinEffect('heal');
    triggerHaptic('warning');
    setTargetSlots(Array(question.expectedDigits.length).fill(null));
    setSourceSlots(initialSourceSlots.map((token) => (token ? { ...token } : null)));

    window.setTimeout(() => {
      setFeedback(null);
      setIsResolving(false);
      setGoblinEffect('idle');
    }, 520);
  }, [advanceRound, canSubmit, goblinHealth, initialSourceSlots, question.expectedDigits, resolvedLevel, targetSlots]);

  const numberStyle: React.CSSProperties = {
    fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", "Avenir Next", "Nunito", sans-serif',
    letterSpacing: '0.01em',
    textShadow: '0 2px 0 rgba(5,11,29,0.9), 0 0 8px rgba(148,163,184,0.35)',
  };

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden select-none bg-[#08162c]" style={{ touchAction: 'manipulation' }}>
      <img
        src={placeValueBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-full bg-slate-900/70 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_20px_rgba(2,6,23,0.45)]">
        Time {roundTimeLeft}s
      </div>

      <div className="absolute inset-0 z-20" ref={playfieldRef}>
        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 overflow-hidden"
          style={{ top: `${layout.questionTop}%`, width: `${layout.questionWidth}%`, height: `${layout.questionHeight}%` }}
        >
          <img src={medDialogue} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
          <div
            className="absolute inset-x-[9%] top-[24%] bottom-[24%] mx-auto flex items-center justify-center overflow-hidden text-center text-[clamp(0.84rem,2.1vw,1.22rem)] font-black uppercase leading-[1.06] tracking-[0.01em] text-white"
            style={{
              textShadow: '0 2px 6px rgba(2,6,23,0.62)',
            }}
          >
            <span
              className="block max-w-full overflow-hidden text-center"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                wordBreak: 'break-word',
              }}
            >
              {question.prompt}
            </span>
          </div>
        </div>

        <div
          className="absolute z-30 rounded-md bg-slate-900/72 px-1.5 py-1 shadow-[0_10px_24px_rgba(2,6,23,0.48)]"
          style={{ top: `${layout.healthTop}%`, left: `${layout.healthLeft}%`, width: `${layout.healthWidth}%` }}
        >
          <div className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.1em] text-amber-200 md:text-[10px]">
            Goblin Health {goblinHealth}/10
          </div>
          <div className="grid grid-cols-10 gap-0.5">
            {Array.from({ length: GOBLIN_MAX_HEALTH }, (_, idx) => (
              <span
                key={`hp-${idx}`}
                className={`h-1 rounded-full ${
                  idx < goblinHealth ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.75)]' : 'bg-slate-600/50'
                }`}
                style={{ height: '0.4rem' }}
              />
            ))}
          </div>
        </div>

        {activeTargetAnchors.map((anchor, idx) => {
          const token = targetSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'target' && dragState.fromIndex === idx;
          return (
            <button
              key={`target-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('target', idx, event)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl"
              style={{
                left: `${anchor.x}%`,
                top: `calc(${layout.targetY}% - ${TARGET_ROW_Y_OFFSET_PX}px)`,
                width: layout.targetWidth,
                height: layout.targetHeight,
              }}
            >
              <img
                src={blueSocket}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
              <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(0.92rem,2.2vw,1.25rem)] font-black uppercase tracking-[0.08em] text-cyan-100/58">
                {question.placeHints[idx]}
              </span>
              {token ? (
                <>
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/28 blur-[10px]" />
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 560, damping: 27, mass: 0.62 }}
                    className="absolute left-1/2 top-1/2 z-10 block -translate-x-1/2 -translate-y-1/2 font-black text-white"
                    style={{ ...numberStyle, fontSize: layout.targetFont }}
                  >
                    {token.value}
                  </motion.span>
                </>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </button>
          );
        })}

        {activeSourceAnchors.map((anchor, idx) => {
          const token = sourceSlots[idx];
          const isDraggingThis = dragState?.fromLocation === 'source' && dragState.fromIndex === idx;
          return (
            <button
              key={`source-${idx}`}
              type="button"
              onPointerDown={(event) => beginDrag('source', idx, event)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl"
              style={{ left: `${anchor.x}%`, top: `${layout.sourceY}%`, width: layout.sourceWidth, height: layout.sourceHeight }}
            >
              {token ? (
                <>
                  <span className="pointer-events-none absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/24 blur-[11px]" />
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 560, damping: 27, mass: 0.62 }}
                    className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 font-black text-white"
                    style={{ ...numberStyle, fontSize: layout.sourceFont }}
                  >
                    {token.value}
                  </motion.span>
                </>
              ) : null}
              {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="absolute left-1/2 z-40 -translate-x-1/2 overflow-hidden transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ top: `${layout.submitY}%`, width: `${layout.submitWidth}%`, height: `${layout.submitHeight}%` }}
        >
          <img src={medButton} alt="" aria-hidden="true" draggable={false} className="absolute inset-0 h-full w-full object-contain" />
          <span
            className="pointer-events-none absolute inset-x-[16%] top-1/2 -translate-y-1/2 text-center text-[clamp(0.82rem,2.2vw,1.06rem)] font-black uppercase tracking-[0.08em] text-white"
            style={{ textShadow: '0 2px 4px rgba(2,6,23,0.7)' }}
          >
            Submit
          </span>
        </button>

        <div
          className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2"
          style={{ top: `${layout.enemyTop}%`, width: `${layout.enemyWidth}%` }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-[10%] rounded-full blur-2xl"
              animate={{
                opacity: goblinEffect === 'idle' ? 0.22 : 0.52,
                scale: goblinEffect === 'idle' ? 1 : [1, 1.12, 1],
                backgroundColor:
                  goblinEffect === 'hit'
                    ? 'rgba(248,113,113,0.92)'
                    : goblinEffect === 'heal'
                      ? 'rgba(74,222,128,0.9)'
                      : 'rgba(56,189,248,0.55)',
              }}
              transition={{
                duration: goblinEffect === 'hit' ? 0.32 : 0.45,
                ease: 'easeInOut',
                repeat: goblinEffect === 'idle' ? Infinity : 0,
                repeatDelay: 1.1,
              }}
            />
            <motion.img
              src={goblinEnemy}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="relative h-auto w-full object-contain drop-shadow-[0_16px_22px_rgba(2,6,23,0.5)]"
              animate={{
                y: [0, -5, 0],
                x: goblinEffect === 'hit' ? [0, -9, 9, -8, 8, -5, 5, 0] : 0,
                rotate: goblinEffect === 'hit' ? [0, -2.2, 2.2, -1.8, 1.8, 0] : 0,
                scale: goblinEffect === 'heal' ? [1, 1.03, 1] : 1,
              }}
              transition={{
                y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                x: { duration: 0.35, ease: 'easeInOut' },
                rotate: { duration: 0.35, ease: 'easeInOut' },
                scale: { duration: 0.35, ease: 'easeInOut' },
              }}
            />
          </div>
        </div>
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
              <span className="absolute left-1/2 top-1/2 z-[8] h-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/24 blur-[11px]" />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-white"
                style={{ ...numberStyle, fontSize: layout.sourceFont }}
              >
                {dragState.token.value}
              </span>
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
            className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-1/2 z-40 -translate-x-1/2 rounded-full border px-5 py-2 text-xs font-black uppercase tracking-[0.14em] shadow-[0_12px_28px_rgba(2,6,23,0.55)] ${
              feedback.tone === 'success'
                ? 'border-emerald-200/70 bg-emerald-500/35 text-emerald-50'
                : 'border-rose-200/70 bg-rose-500/35 text-rose-50'
            }`}
          >
            {feedback.message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} accentClass="text-slate-100" compact />
        </div>
      </div>
    </div>
  );
};

export default PlaceValuePanicGame;
