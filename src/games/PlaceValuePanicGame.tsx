import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import placeValueBackground from '../assets/maps/placepanicbkk.png';
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

interface ViewportState {
  width: number;
  height: number;
  scale: number;
}

interface ParallaxState {
  x: number;
  y: number;
}

interface TorchParticle {
  id: number;
  bornAt: number;
  lifeMs: number;
  driftY: number;
  driftX: number;
  size: number;
  leftPct: number;
  topPct: number;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

type GoblinEffect = 'idle' | 'hit' | 'heal';

const GOBLIN_MAX_HEALTH = 10;
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const TARGET_ROW_Y = 69.2;
const SOURCE_ROW_Y = 83.7;

const TARGET_ANCHORS: AnchorPoint[] = [{ x: 22 }, { x: 35 }, { x: 48 }, { x: 61 }, { x: 74 }];
const SOURCE_ANCHORS: AnchorPoint[] = [{ x: 16 }, { x: 32 }, { x: 48 }, { x: 64 }, { x: 80 }];
const FULL_PLACE_VALUE_HINTS = ['Th', 'Th', 'H', 'T', 'U'] as const;

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
    return rest === 0 ? `${ONES_WORDS[hundreds]} hundred` : `${ONES_WORDS[hundreds]} hundred and ${toWordsUnderHundred(rest)}`;
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

const getSlotCountForLevel = (level: number): number => {
  if (level <= 2) return 2;
  if (level <= 4) return 3;
  if (level <= 7) return 4;
  return 5;
};

const getPlaceHints = (slotCount: number): string[] => FULL_PLACE_VALUE_HINTS.slice(FULL_PLACE_VALUE_HINTS.length - slotCount);

const makeQuestion = (level: number): QuestionState => {
  const slotCount = getSlotCountForLevel(level);
  const expectedDigits = Array.from({ length: slotCount }, (_, idx) => randomInt(idx === 0 ? 1 : 0, 9));
  const tokenValues = shuffle([...expectedDigits]);
  const placeHints = getPlaceHints(slotCount);
  const promptNumber = parseInt(expectedDigits.join(''), 10);
  const prompt = toWords(promptNumber).toUpperCase();

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    expectedDigits,
    tokenValues,
    placeHints,
  };
};

const computeViewportState = (): ViewportState => {
  if (typeof window === 'undefined') {
    return { width: 390, height: 844, scale: Math.min(390 / STAGE_WIDTH, 844 / STAGE_HEIGHT) };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scale = Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
  return { width, height, scale };
};

const PlaceValuePanicGame: React.FC<PlaceValuePanicGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [viewport, setViewport] = useState<ViewportState>(computeViewportState);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [parallax, setParallax] = useState<ParallaxState>({ x: 0, y: 0 });

  const [question, setQuestion] = useState<QuestionState>(() => makeQuestion(Math.max(1, Math.min(10, miniGameLevel || levelId || 1))));
  const [targetSlots, setTargetSlots] = useState<Array<Token | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<Token | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredTargetIndex, setHoveredTargetIndex] = useState<number | null>(null);
  const [snapPulseIndex, setSnapPulseIndex] = useState<number | null>(null);
  const [goblinHealth, setGoblinHealth] = useState<number>(GOBLIN_MAX_HEALTH);
  const [score, setScore] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [goblinEffect, setGoblinEffect] = useState<GoblinEffect>('idle');
  const [torchParticles, setTorchParticles] = useState<TorchParticle[]>([]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const victoryDispatchedRef = useRef(false);
  const parallaxTargetRef = useRef<ParallaxState>({ x: 0, y: 0 });
  const particleIdRef = useRef(0);

  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );

  const recalcViewport = useCallback(() => setViewport(computeViewportState()), []);

  useEffect(() => {
    recalcViewport();
    window.addEventListener('resize', recalcViewport);
    window.addEventListener('orientationchange', recalcViewport);
    return () => {
      window.removeEventListener('resize', recalcViewport);
      window.removeEventListener('orientationchange', recalcViewport);
    };
  }, [recalcViewport]);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
      recalcViewport();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
    };
  }, [recalcViewport]);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument;
    const root = (stageRef.current || document.documentElement) as FullscreenElement;
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      }
    } catch {
      // Intentionally silent: iOS Safari and some embedded webviews can reject fullscreen requests.
    }
  }, []);

  useEffect(() => {
    let frame = 0;
    const animate = (now: number) => {
      const autoX = Math.sin(now * 0.00036) * 0.24;
      const autoY = Math.cos(now * 0.00029) * 0.2;
      const targetX = parallaxTargetRef.current.x * 0.45 + autoX;
      const targetY = parallaxTargetRef.current.y * 0.45 + autoY;

      setParallax((prev) => ({
        x: prev.x + (targetX - prev.x) * 0.08,
        y: prev.y + (targetY - prev.y) * 0.08,
      }));

      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

    setQuestion(nextQuestion);
    setTargetSlots(Array(nextQuestion.expectedDigits.length).fill(null));
    setSourceSlots(shuffle(nextSources));
    setDragState(null);
    setHoveredTargetIndex(null);
    setIsResolving(false);
    setGoblinEffect('idle');
  }, []);

  useEffect(() => {
    resetRound(makeQuestion(resolvedLevel));
  }, [resetRound, resolvedLevel]);

  useEffect(() => {
    if (goblinEffect === 'idle') return undefined;
    const timeout = window.setTimeout(() => setGoblinEffect('idle'), 460);
    return () => window.clearTimeout(timeout);
  }, [goblinEffect]);

  useEffect(() => {
    const spawn = window.setInterval(() => {
      const now = performance.now();
      setTorchParticles((prev) => {
        const next: TorchParticle[] = prev.filter((particle) => now - particle.bornAt < particle.lifeMs).slice(-28);
        next.push({
          id: particleIdRef.current + 1,
          bornAt: now,
          lifeMs: randomInt(650, 1100),
          driftY: randomInt(24, 58),
          driftX: randomInt(-18, 18),
          size: randomInt(5, 12),
          leftPct: 34 + Math.random() * 8,
          topPct: 43 + Math.random() * 7,
        });
        particleIdRef.current += 1;
        return next;
      });
    }, 110);

    const prune = window.setInterval(() => {
      const now = performance.now();
      setTorchParticles((prev) => prev.filter((particle) => now - particle.bornAt < particle.lifeMs));
    }, 180);

    return () => {
      window.clearInterval(spawn);
      window.clearInterval(prune);
    };
  }, []);

  const getRelativePoint = useCallback((clientX: number, clientY: number) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const beginDrag = useCallback(
    (location: TokenLocation, index: number, event: React.PointerEvent<HTMLButtonElement>) => {
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
    },
    [dragState, isResolving, sourceSlots, targetSlots],
  );

  const findDropCandidate = useCallback(
    (clientX: number, clientY: number): { location: TokenLocation; index: number } | null => {
      const rect = playfieldRef.current?.getBoundingClientRect();
      if (!rect) return null;

      const magnetRadius = Math.max(76, rect.width * 0.08);
      let best: { location: TokenLocation; index: number; distance: number } | null = null;

      activeTargetAnchors.forEach((anchor, index) => {
        const cx = rect.left + (anchor.x / 100) * rect.width;
        const cy = rect.top + (TARGET_ROW_Y / 100) * rect.height;
        const d = Math.hypot(clientX - cx, clientY - cy);
        if (!best || d < best.distance) best = { location: 'target', index, distance: d };
      });

      activeSourceAnchors.forEach((anchor, index) => {
        const cx = rect.left + (anchor.x / 100) * rect.width;
        const cy = rect.top + (SOURCE_ROW_Y / 100) * rect.height;
        const d = Math.hypot(clientX - cx, clientY - cy);
        if (!best || d < best.distance) best = { location: 'source', index, distance: d };
      });

      if (!best || best.distance > magnetRadius) return null;
      return { location: best.location, index: best.index };
    },
    [activeSourceAnchors, activeTargetAnchors],
  );

  const placeTokenInArrays = useCallback(
    (candidate: { location: TokenLocation; index: number } | null) => {
      if (!dragState) return;

      const nextTargets = [...targetSlots];
      const nextSources = [...sourceSlots];

      const getToken = (location: TokenLocation, index: number): Token | null => (location === 'target' ? nextTargets[index] : nextSources[index]);

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
      if (destinationToken) setToken(dragState.fromLocation, dragState.fromIndex, destinationToken);

      setTargetSlots(nextTargets);
      setSourceSlots(nextSources);

      if (candidate.location === 'target') {
        setSnapPulseIndex(candidate.index);
        window.setTimeout(() => setSnapPulseIndex(null), 280);
      }
    },
    [dragState, sourceSlots, targetSlots],
  );

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
      const candidate = findDropCandidate(event.clientX, event.clientY);
      setHoveredTargetIndex(candidate?.location === 'target' ? candidate.index : null);
    };

    const onFinish = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const candidate = findDropCandidate(event.clientX, event.clientY);
      placeTokenInArrays(candidate);
      setDragState(null);
      setHoveredTargetIndex(null);
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

  const advanceRound = useCallback(
    (newHealth: number) => {
      if (newHealth <= 0 && !victoryDispatchedRef.current) {
        victoryDispatchedRef.current = true;
        const finalAccuracy = attempts > 0 ? correctAnswers / attempts : 1;
        const stars = scoreToStars(finalAccuracy);
        window.setTimeout(() => onVictory(stars, Math.max(0, score)), 420);
        return;
      }

      const nextQuestion = makeQuestion(resolvedLevel);
      window.setTimeout(() => {
        setFeedback(null);
        resetRound(nextQuestion);
      }, 860);
    },
    [attempts, correctAnswers, onVictory, resetRound, resolvedLevel, score],
  );

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
      setGoblinEffect('hit');
      triggerHaptic('success');
      advanceRound(nextHealth);
      return;
    }

    const nextHealth = Math.min(GOBLIN_MAX_HEALTH, goblinHealth + 1);
    setGoblinHealth(nextHealth);
    setFeedback({ tone: 'error', message: `WRONG ORDER! GOBLIN HP ${nextHealth}/10` });
    setGoblinEffect('heal');
    triggerHaptic('warning');
    advanceRound(nextHealth);
  }, [advanceRound, goblinHealth, isResolving, question.expectedDigits, resolvedLevel, targetSlots]);

  const tokenTransition = { type: 'spring', stiffness: 530, damping: 26, mass: 0.64 } as const;

  const stageTransform = `translate(-50%, -50%) scale(${viewport.scale})`;

  return (
    <div
      className="fixed inset-0 z-20 overflow-hidden bg-[#020812] pvp-aaa-root"
      style={{
        touchAction: 'manipulation',
        fontFamily: '"Cinzel", "Georgia", "Times New Roman", serif',
      }}
    >
      <div className="pvp-vignette" />
      <div className="pvp-grain" />

      <div className="absolute inset-0 z-10">
        <div
          ref={stageRef}
          className="absolute left-1/2 top-1/2 h-[1080px] w-[1920px] overflow-hidden pvp-stage-frame"
          style={{ transform: stageTransform, transformOrigin: 'center center' }}
          onPointerMove={(event) => {
            const rect = stageRef.current?.getBoundingClientRect();
            if (!rect) return;
            const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
            parallaxTargetRef.current = {
              x: Math.max(-1, Math.min(1, nx)),
              y: Math.max(-1, Math.min(1, ny)),
            };
          }}
          onPointerLeave={() => {
            parallaxTargetRef.current = { x: 0, y: 0 };
          }}
        >
          <div
            className="absolute inset-0 pvp-bg-layer pvp-bg-back"
            style={{
              backgroundImage: `url(${placeValueBackground})`,
              transform: `translate3d(${parallax.x * 14}px, ${parallax.y * 10}px, 0) scale(1.08)`,
            }}
          />
          <div
            className="absolute inset-0 pvp-bg-layer pvp-bg-mid"
            style={{
              backgroundImage: `url(${placeValueBackground})`,
              transform: `translate3d(${parallax.x * 22}px, ${parallax.y * 14}px, 0) scale(1.02)`,
            }}
          />
          <div
            className="absolute left-1/2 top-[38.8%] z-[3] h-[46%] w-[56%] -translate-x-1/2 rounded-[50%] pvp-god-rays"
            style={{ transform: `translate(${-parallax.x * 9}px, ${-parallax.y * 7}px)` }}
          />
          <div
            className="absolute inset-0 z-[4] pvp-bg-foreground"
            style={{ transform: `translate3d(${parallax.x * 34}px, ${parallax.y * 20}px, 0)` }}
          />

          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-8 pt-[max(0.65rem,env(safe-area-inset-top))]">
            <button type="button" onClick={onBack} className="pvp-hud-chip">
              Back
            </button>
            <button type="button" onClick={toggleFullscreen} className="pvp-hud-chip pvp-hud-chip-alt">
              {isFullscreen ? 'Window' : 'Fullscreen'}
            </button>
            <div className="pvp-hud-chip">Score {score}</div>
          </div>

          <div
            className="pointer-events-none absolute left-1/2 top-[18%] z-30 -translate-x-1/2 pvp-rune-panel"
            style={{ width: '67%', height: '13.6%' }}
          >
            <div className="pvp-rune-text">
              {question.prompt}
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-[46.2%] z-30 -translate-x-1/2" style={{ width: '30%' }}>
            <div className="relative">
              <motion.div
                className="absolute inset-[8%] rounded-full blur-[28px]"
                animate={{
                  opacity: goblinEffect === 'idle' ? 0.22 : 0.58,
                  scale: goblinEffect === 'idle' ? [1, 1.03, 1] : [1, 1.15, 1],
                  backgroundColor:
                    goblinEffect === 'hit'
                      ? 'rgba(248,113,113,0.95)'
                      : goblinEffect === 'heal'
                        ? 'rgba(74,222,128,0.95)'
                        : 'rgba(56,189,248,0.62)',
                }}
                transition={{
                  duration: goblinEffect === 'idle' ? 2.2 : 0.36,
                  repeat: goblinEffect === 'idle' ? Infinity : 0,
                  ease: 'easeInOut',
                }}
              />

              {torchParticles.map((particle) => (
                <motion.span
                  key={particle.id}
                  className="absolute rounded-full pvp-torch-particle"
                  style={{
                    left: `${particle.leftPct}%`,
                    top: `${particle.topPct}%`,
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                  }}
                  initial={{ opacity: 0, scale: 0.35, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 0.95, 0],
                    scale: [0.35, 1, 0.15],
                    x: [0, particle.driftX * 0.5, particle.driftX],
                    y: [0, -(particle.driftY * 0.55), -particle.driftY],
                  }}
                  transition={{ duration: particle.lifeMs / 1000, ease: 'easeOut' }}
                />
              ))}

              <motion.img
                src={goblinEnemy}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="relative h-auto w-full object-contain drop-shadow-[0_24px_22px_rgba(2,6,23,0.55)]"
                animate={{
                  y: [0, -6, 0],
                  x: goblinEffect === 'hit' ? [0, -11, 11, -9, 9, -6, 6, 0] : 0,
                  rotate: goblinEffect === 'hit' ? [0, -2.6, 2.6, -2.1, 2.1, 0] : 0,
                  scale: goblinEffect === 'heal' ? [1, 1.045, 1] : 1,
                }}
                transition={{
                  y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                  x: { duration: 0.42, ease: 'easeInOut' },
                  rotate: { duration: 0.42, ease: 'easeInOut' },
                  scale: { duration: 0.4, ease: 'easeInOut' },
                }}
              />
            </div>
          </div>

          <motion.div
            className="absolute right-[6.2%] top-[44.3%] z-30 pvp-crystal-health-wrap"
            animate={goblinEffect === 'hit' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="pvp-crystal-health-title">Goblin Health</div>
            <div className="pvp-crystal-health-shards">
              {Array.from({ length: GOBLIN_MAX_HEALTH }, (_, idx) => {
                const active = idx < goblinHealth;
                return (
                  <motion.span
                    key={`hp-${idx}`}
                    className={`pvp-crystal-shard ${active ? 'is-active' : 'is-broken'}`}
                    animate={active ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.26, scale: 0.92 }}
                    transition={active ? { duration: 1.4, repeat: Infinity, delay: idx * 0.03 } : { duration: 0.2 }}
                  />
                );
              })}
            </div>
            <div className="pvp-crystal-health-value">{goblinHealth} / 10</div>
          </motion.div>

          <div ref={playfieldRef} className="absolute inset-0 z-20">
            {activeTargetAnchors.map((anchor, idx) => {
              const token = targetSlots[idx];
              const isDraggingThis = dragState?.fromLocation === 'target' && dragState.fromIndex === idx;
              const isHovered = hoveredTargetIndex === idx && Boolean(dragState);
              const isSnapping = snapPulseIndex === idx;

              return (
                <motion.button
                  key={`target-${idx}`}
                  type="button"
                  onPointerDown={(event) => beginDrag('target', idx, event)}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 pvp-stone-slot ${isHovered ? 'is-hovered' : ''} ${token ? 'is-filled' : ''}`}
                  style={{
                    left: `${anchor.x}%`,
                    top: `${TARGET_ROW_Y}%`,
                    width: '11.4%',
                    height: '11.4%',
                  }}
                  animate={isSnapping ? { scale: [1, 1.09, 1] } : { scale: 1 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                >
                  <span className="pvp-stone-slot-glyph">{question.placeHints[idx]}</span>
                  {token ? (
                    <motion.span className="pvp-number-token pvp-number-token-target" layout transition={tokenTransition}>
                      {token.value}
                    </motion.span>
                  ) : null}
                  {isDraggingThis ? <span className="sr-only">Dragging</span> : null}
                </motion.button>
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
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl"
                  style={{ left: `${anchor.x}%`, top: `${SOURCE_ROW_Y}%`, width: '11.4%', height: '9.2%' }}
                >
                  {token ? (
                    <motion.span className="pvp-number-token pvp-number-token-source" layout transition={tokenTransition}>
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
                  className="pointer-events-none absolute z-[90] flex items-center justify-center rounded-xl pvp-drag-ghost-aaa"
                  style={{
                    left: relative.x - dragState.offsetX,
                    top: relative.y - dragState.offsetY,
                    width: dragState.width,
                    height: dragState.height,
                  }}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1.05 }}
                >
                  <span className="pvp-number-token pvp-number-token-source">{dragState.token.value}</span>
                </motion.div>
              );
            })()
          ) : null}

          <AnimatePresence>
            {feedback ? (
              <motion.div
                key={feedback.message}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                className={`absolute bottom-[12.4%] left-1/2 z-40 -translate-x-1/2 rounded-full border px-7 py-2 text-sm font-black uppercase tracking-[0.14em] shadow-[0_14px_30px_rgba(2,6,23,0.6)] ${
                  feedback.tone === 'success'
                    ? 'border-emerald-200/70 bg-emerald-500/35 text-emerald-50'
                    : 'border-rose-200/70 bg-rose-500/35 text-rose-50'
                }`}
              >
                {feedback.message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="absolute inset-x-0 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
            <div>
              <GameActionDock onBack={onBack} accentClass="text-slate-100" compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceValuePanicGame;
