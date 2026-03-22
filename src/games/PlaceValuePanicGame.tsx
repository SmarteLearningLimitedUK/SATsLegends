import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import placeValueBackground from '../assets/maps/gemini-2.5-flash-image_using_the_same_aesthetic_-_create_a_dark_and_mysterious_forest_path_with_dense_f-1.jpg';
import medDialogue from '../assets/bluedialoague/med dialogue cropped.png';
import medButton from '../assets/bluedialoague/med button cropped.png';
import blueSocket from '../assets/bluedialoague/blue socket cropped.png';
import goblinWiz from '../assets/bosses/goblinwiz.jpg';
import statusTimerIcon from '../assets/fantasy_hero/ui/status_timer.png';
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

const removeBlackMatteFromSprite = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const stack: number[] = [];

        const isNearBlack = (index: number) => {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return max <= 42 && max - min <= 14;
        };

        const pushIfBlack = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= width || y >= height) return;
          const p = y * width + x;
          if (visited[p]) return;
          const i = p * 4;
          if (!isNearBlack(i)) return;
          visited[p] = 1;
          stack.push(p);
        };

        for (let x = 0; x < width; x += 1) {
          pushIfBlack(x, 0);
          pushIfBlack(x, height - 1);
        }
        for (let y = 0; y < height; y += 1) {
          pushIfBlack(0, y);
          pushIfBlack(width - 1, y);
        }

        while (stack.length > 0) {
          const p = stack.pop() as number;
          const i = p * 4;
          data[i + 3] = 0;
          const x = p % width;
          const y = (p / width) | 0;
          pushIfBlack(x + 1, y);
          pushIfBlack(x - 1, y);
          pushIfBlack(x, y + 1);
          pushIfBlack(x, y - 1);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Failed to load goblin sprite'));
    image.src = src;
  });

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
  const [goblinSpriteSrc, setGoblinSpriteSrc] = useState<string>(goblinWiz);
  const [showHitFx, setShowHitFx] = useState(false);

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
    setShowHitFx(false);
    setRoundTimeLeft(60);
    roundTimeoutLockRef.current = false;
  }, []);

  useEffect(() => {
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  useEffect(() => {
    let mounted = true;
    removeBlackMatteFromSprite(goblinWiz)
      .then((processed) => {
        if (mounted) setGoblinSpriteSrc(processed);
      })
      .catch(() => {
        if (mounted) setGoblinSpriteSrc(goblinWiz);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isResolving) return undefined;
    const intervalId = window.setInterval(() => {
      setRoundTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isResolving, question.id]);

  useEffect(() => {
    if (goblinEffect !== 'hit') return undefined;
    setShowHitFx(true);
    const timeoutId = window.setTimeout(() => setShowHitFx(false), 520);
    return () => window.clearTimeout(timeoutId);
  }, [goblinEffect]);

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

  const findDropCandidate = useCallback((
    clientX: number,
    clientY: number,
    fromLocation: TokenLocation,
  ): { location: TokenLocation; index: number } | null => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const targetPct = Number.parseFloat(layout.targetWidth) / 100;
    const sourcePct = Number.parseFloat(layout.sourceWidth) / 100;
    const targetRadius = Math.max(56, rect.width * Math.max(0.09, targetPct * 0.95));
    const sourceRadius = Math.max(42, rect.width * Math.max(0.07, sourcePct * 0.72));

    let bestTarget: { index: number; distance: number } | null = null;
    let bestSource: { index: number; distance: number } | null = null;

    activeTargetAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.targetY / 100) * rect.height - TARGET_ROW_Y_OFFSET_PX;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!bestTarget || d < bestTarget.distance) bestTarget = { index, distance: d };
    });

    activeSourceAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.sourceY / 100) * rect.height;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (!bestSource || d < bestSource.distance) bestSource = { index, distance: d };
    });

    // Prefer target sockets when dragging answer tokens downward from the source row.
    if (fromLocation === 'source') {
      if (bestTarget && bestTarget.distance <= targetRadius * 1.45) {
        return { location: 'target', index: bestTarget.index };
      }
      if (bestSource && bestSource.distance <= sourceRadius) {
        return { location: 'source', index: bestSource.index };
      }
      if (bestTarget && clientY >= rect.top + rect.height * 0.54) {
        return { location: 'target', index: bestTarget.index };
      }
      return null;
    }

    if (bestTarget && bestTarget.distance <= targetRadius) {
      return { location: 'target', index: bestTarget.index };
    }
    if (bestSource && bestSource.distance <= sourceRadius * 1.2) {
      return { location: 'source', index: bestSource.index };
    }
    return null;
  }, [activeSourceAnchors, activeTargetAnchors, layout.sourceWidth, layout.sourceY, layout.targetWidth, layout.targetY]);

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
      const candidate = findDropCandidate(event.clientX, event.clientY, dragState.fromLocation);
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
      setFeedback(null);
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

      <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-200/25 bg-slate-900/78 px-3 py-2 shadow-[0_10px_24px_rgba(2,6,23,0.5)]">
          <img
            src={statusTimerIcon}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="h-5 w-5 object-contain"
          />
          <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {roundTimeLeft}s
          </span>
        </div>
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
          className="absolute z-30 rounded-xl border border-amber-200/35 bg-slate-900/76 p-2 shadow-[0_12px_28px_rgba(2,6,23,0.5)]"
          style={{
            top: `${layout.healthTop}%`,
            left: `min(calc(50% + ${Math.max(12, layout.enemyWidth * 0.58)}%), calc(100% - max(0.75rem, env(safe-area-inset-right)) - clamp(9rem, 32vw, 14rem)))`,
            width: 'clamp(9rem, 32vw, 14rem)',
          }}
        >
          <div className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.11em] text-amber-200 md:text-[10px]">
            Goblin Health {goblinHealth}/10
          </div>
          <div className="relative h-3 overflow-hidden rounded-full border border-slate-700/80 bg-slate-950/80">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-300 shadow-[0_0_12px_rgba(251,113,133,0.75)]"
              animate={{ width: `${(goblinHealth / GOBLIN_MAX_HEALTH) * 100}%` }}
              transition={{ type: 'spring', stiffness: 210, damping: 26 }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[length:10%_100%]" />
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
            <AnimatePresence>
              {showHitFx ? (
                <motion.div
                  key="goblin-hit-vfx"
                  className="pointer-events-none absolute inset-[-16%]"
                  initial={{ opacity: 0.95, scale: 0.62 }}
                  animate={{ opacity: 0, scale: 1.28, rotate: 130 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                >
                  <div className="absolute inset-0 rounded-full border-[6px] border-rose-400/85 blur-[1px]" />
                  <div className="absolute inset-[20%] rounded-full border-4 border-red-500/80" />
                  <motion.div
                    className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle,rgba(251,113,133,0.9)_0%,rgba(244,63,94,0.62)_40%,rgba(239,68,68,0)_75%)]"
                    initial={{ scale: 0.25, opacity: 0.95 }}
                    animate={{ scale: 1.35, opacity: 0 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <motion.img
              src={goblinSpriteSrc}
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
        {feedback && feedback.tone === 'error' ? (
          <motion.div
            key={feedback.message}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+4.6rem)] left-1/2 z-40 -translate-x-1/2 rounded-full border border-rose-200/70 bg-rose-500/35 px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-rose-50 shadow-[0_12px_28px_rgba(2,6,23,0.55)]"
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
