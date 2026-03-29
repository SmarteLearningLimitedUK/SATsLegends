import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import ribbonAsset from '../assets/casual_ui/dialogs_panels/ribbon_1.png';
import { triggerHaptic } from '../haptics';

interface FractionFlowGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type SlotLocation = 'source' | 'target';
type SortDirection = 'asc' | 'desc';

interface FractionCard {
  id: string;
  numerator: number;
  denominator: number;
  value: number;
}

interface RoundState {
  id: string;
  direction: SortDirection;
  cards: FractionCard[];
  sortedIds: string[];
}

interface DragState {
  token: FractionCard;
  fromLocation: SlotLocation;
  fromIndex: number;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface AnchorPoint {
  x: number;
}

const SOURCE_ANCHORS: AnchorPoint[] = [{ x: 14 }, { x: 32 }, { x: 50 }, { x: 68 }, { x: 86 }];
const TARGET_ANCHORS: AnchorPoint[] = [{ x: 14 }, { x: 32 }, { x: 50 }, { x: 68 }, { x: 86 }];

const FRACTION_POOL: ReadonlyArray<readonly [number, number]> = [
  [1, 10],
  [1, 8],
  [1, 6],
  [1, 5],
  [1, 4],
  [1, 3],
  [3, 8],
  [2, 5],
  [1, 2],
  [3, 5],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [7, 8],
  [9, 10],
];

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const centeredAnchors = (anchors: AnchorPoint[], count: number): AnchorPoint[] => {
  if (count >= anchors.length) return anchors;
  const start = Math.floor((anchors.length - count) / 2);
  return anchors.slice(start, start + count);
};

const scoreToStars = (accuracy: number, lives: number, timeLeft: number) => {
  if (accuracy >= 0.88 && lives >= 3 && timeLeft >= 14) return 3;
  if (accuracy >= 0.62 && lives >= 2) return 2;
  return 1;
};

const makeRound = (level: number, roundIndex: number): RoundState => {
  const cardCount = Math.min(5, 3 + Math.floor((level + roundIndex) / 4));
  const direction: SortDirection = roundIndex % 2 === 1 ? 'desc' : 'asc';

  const selected: FractionCard[] = [];
  const usedValues = new Set<number>();
  for (const [numerator, denominator] of shuffle([...FRACTION_POOL])) {
    const value = numerator / denominator;
    const key = Number(value.toFixed(6));
    if (usedValues.has(key)) continue;
    usedValues.add(key);
    selected.push({
      id: `flow-${roundIndex}-${numerator}-${denominator}-${selected.length}`,
      numerator,
      denominator,
      value,
    });
    if (selected.length >= cardCount) break;
  }

  const sortedIds = [...selected]
    .sort((a, b) => (direction === 'asc' ? a.value - b.value : b.value - a.value))
    .map((card) => card.id);

  return {
    id: `fraction-flow-${roundIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    direction,
    cards: shuffle(selected),
    sortedIds,
  };
};

const FractionCardTile: React.FC<{
  card: FractionCard;
  size: { width: number; height: number };
  disabled?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}> = ({ card, size, disabled = false, onPointerDown }) => (
  <motion.button
    type="button"
    onPointerDown={onPointerDown}
    whileTap={disabled ? undefined : { scale: 0.97 }}
    disabled={disabled}
    className="relative flex cursor-grab flex-col items-center justify-center rounded-[1rem] border-2 border-cyan-200/80 bg-gradient-to-b from-sky-500 to-blue-700 text-white shadow-[0_12px_26px_rgba(8,47,111,0.6)] active:cursor-grabbing disabled:cursor-default"
    style={{ width: size.width, height: size.height }}
  >
    <div className="pointer-events-none absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/28 via-transparent to-transparent" />
    <span className="relative text-[clamp(1.4rem,4.3vw,2.45rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
      {card.numerator}
    </span>
    <span className="relative my-1 h-[2px] w-[56%] rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.65)]" />
    <span className="relative text-[clamp(1.4rem,4.3vw,2.45rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
      {card.denominator}
    </span>
  </motion.button>
);

const FractionFlowGame: React.FC<FractionFlowGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  useSharedTopHud = false,
  isBoss: _isBoss = false,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 390 : window.innerWidth,
    height: typeof window === 'undefined' ? 844 : window.innerHeight,
  }));
  const [roundIndex, setRoundIndex] = useState(1);
  const [round, setRound] = useState<RoundState>(() => makeRound(Math.max(1, levelId), 1));
  const [targetSlots, setTargetSlots] = useState<Array<FractionCard | null>>([]);
  const [sourceSlots, setSourceSlots] = useState<Array<FractionCard | null>>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(38, 62 - (Math.max(1, levelId) * 2)));
  const [lives, setLives] = useState(4);
  const [XP, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const endedRef = useRef(false);
  const scoreRef = useRef(0);
  scoreRef.current = XP;

  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );
  const totalRounds = useMemo(() => Math.min(10, 6 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);
  const bubbles = useMemo(
    () => Array.from({ length: 14 }, (_, index) => ({
      id: `bubble-${index}`,
      left: 8 + (index * 6.1),
      size: 8 + ((index * 3) % 12),
      delay: (index * 0.4) % 3,
      duration: 5.4 + ((index * 0.73) % 2.8),
      drift: ((index % 2 === 0 ? 1 : -1) * (4 + (index % 5))),
    })),
    [],
  );

  const layout = useMemo(() => {
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;
    const isTallPhone = !isTablet && (viewport.height / Math.max(1, viewport.width) > 1.9);
    return {
      targetY: isTablet ? 53.5 : (isTallPhone ? 55.5 : 54.5),
      sourceY: isTablet ? 73.5 : (isTallPhone ? 75 : 74),
      cardSize: {
        width: isTablet ? 120 : 92,
        height: isTablet ? 154 : 118,
      },
      slotSize: {
        width: isTablet ? 114 : 86,
        height: isTablet ? 132 : 102,
      },
      ribbonWidth: isTablet ? 58 : 88,
      ribbonTop: isTablet ? 7.2 : 8.2,
    };
  }, [viewport.height, viewport.width]);

  const directionText = round.direction === 'desc' ? 'Highest to Lowest' : 'Lowest to Highest';
  const activeTargetAnchors = useMemo(
    () => centeredAnchors(TARGET_ANCHORS, round.cards.length),
    [round.cards.length],
  );
  const activeSourceAnchors = useMemo(
    () => centeredAnchors(SOURCE_ANCHORS, round.cards.length),
    [round.cards.length],
  );

  const resetRound = useCallback((nextRound: RoundState) => {
    setRound(nextRound);
    setTargetSlots(Array(nextRound.cards.length).fill(null));
    setSourceSlots(shuffle(nextRound.cards));
    setDragState(null);
    setIsResolving(false);
    setFeedback(null);
  }, []);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    setRoundIndex(1);
    setTimeLeft(Math.max(38, 62 - (resolvedLevel * 2)));
    setLives(4);
    setScore(0);
    setAttempts(0);
    setCorrectAnswers(0);
    resetRound(makeRound(resolvedLevel, 1));
  }, [resolvedLevel, resetRound]);

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
    window.setTimeout(() => onVictory(stars, finalScore), 420);
  }, [onVictory]);

  const beginDrag = useCallback((
    location: SlotLocation,
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (isResolving || dragState || endedRef.current) return;
    const token = location === 'target' ? targetSlots[index] : sourceSlots[index];
    if (!token) return;

    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (location === 'target') {
      setTargetSlots((prev) => prev.map((card, i) => (i === index ? null : card)));
    } else {
      setSourceSlots((prev) => prev.map((card, i) => (i === index ? null : card)));
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

  const findDropCandidate = useCallback((clientX: number, clientY: number): { location: SlotLocation; index: number } | null => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const threshold = Math.max(42, rect.width * 0.075);
    let best: { location: SlotLocation; index: number; distance: number } | null = null;

    activeTargetAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.targetY / 100) * rect.height;
      const distance = Math.hypot(clientX - cx, clientY - cy);
      if (!best || distance < best.distance) best = { location: 'target', index, distance };
    });

    activeSourceAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + (layout.sourceY / 100) * rect.height;
      const distance = Math.hypot(clientX - cx, clientY - cy);
      if (!best || distance < best.distance) best = { location: 'source', index, distance };
    });

    if (!best || best.distance > threshold) return null;
    return { location: best.location, index: best.index };
  }, [activeSourceAnchors, activeTargetAnchors, layout.sourceY, layout.targetY]);

  const placeTokenInArrays = useCallback((candidate: { location: SlotLocation; index: number } | null) => {
    if (!dragState) return;

    const nextTargets = [...targetSlots];
    const nextSources = [...sourceSlots];

    const getToken = (location: SlotLocation, index: number): FractionCard | null => (
      location === 'target' ? nextTargets[index] : nextSources[index]
    );
    const setToken = (location: SlotLocation, index: number, token: FractionCard | null) => {
      if (location === 'target') nextTargets[index] = token;
      else nextSources[index] = token;
    };

    if (!candidate) {
      if (dragState.fromLocation === 'target') {
        const firstOpen = nextSources.findIndex((card) => card === null);
        if (firstOpen >= 0) {
          nextSources[firstOpen] = dragState.token;
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

    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;
      const candidate = findDropCandidate(event.clientX, event.clientY);
      placeTokenInArrays(candidate);
      setDragState(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragState, findDropCandidate, placeTokenInArrays]);

  useEffect(() => {
    if (isResolving || endedRef.current || targetSlots.length === 0) return;
    if (!targetSlots.every(Boolean)) return;

    setIsResolving(true);

    const placedIds = targetSlots.map((card) => card!.id);
    const isCorrect = placedIds.every((id, idx) => id === round.sortedIds[idx]);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (isCorrect) {
      const awarded = 140 + Math.max(0, Math.floor(timeLeft * 0.7)) + (resolvedLevel * 12);
      const nextScore = XP + awarded;
      const nextCorrect = correctAnswers + 1;
      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setFeedback({ tone: 'success', text: 'Perfect ordering!' });
      triggerHaptic('success');

      if (roundIndex >= totalRounds) {
        finishVictory(nextScore, nextAttempts, nextCorrect, lives, timeLeft);
        return;
      }

      window.setTimeout(() => {
        const nextRound = roundIndex + 1;
        setRoundIndex(nextRound);
        resetRound(makeRound(resolvedLevel, nextRound));
      }, 520);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setFeedback({ tone: 'error', text: 'Order is not correct. Try again!' });
    triggerHaptic('error');

    if (nextLives <= 0) {
      endedRef.current = true;
      window.setTimeout(() => onGameOver(XP), 440);
      return;
    }

    window.setTimeout(() => {
      resetRound(makeRound(resolvedLevel, roundIndex));
    }, 560);
  }, [
    attempts,
    correctAnswers,
    finishVictory,
    isResolving,
    lives,
    onGameOver,
    resetRound,
    resolvedLevel,
    round.sortedIds,
    roundIndex,
    XP,
    targetSlots,
    timeLeft,
    totalRounds,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white">
      <GameplaySceneBackdrop gameType="fraction_match" className="opacity-[0.98]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050a1bd1] via-[#07122bc4] to-[#030816eb]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute left-[-12%] top-[47%] h-14 w-[124%] rounded-[999px] border-t-2 border-cyan-200/40 bg-gradient-to-b from-cyan-300/22 via-cyan-300/8 to-transparent"
          animate={{ x: [-20, 18, -20], opacity: [0.36, 0.62, 0.36] }}
          transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-[-10%] top-[51%] h-12 w-[120%] rounded-[999px] border-t-2 border-blue-200/35 bg-gradient-to-b from-cyan-200/18 via-blue-300/8 to-transparent"
          animate={{ x: [18, -14, 18], opacity: [0.28, 0.48, 0.28] }}
          transition={{ duration: 5.3, repeat: Infinity, ease: 'easeInOut' }}
        />
        {bubbles.map((bubble) => (
          <motion.span
            key={bubble.id}
            className="absolute rounded-full border border-cyan-100/35 bg-cyan-200/12 shadow-[0_0_8px_rgba(34,211,238,0.35)]"
            style={{
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              bottom: '-8%',
            }}
            animate={{
              y: ['0%', '-122%'],
              x: [0, bubble.drift, 0],
              opacity: [0, 0.55, 0],
              scale: [0.8, 1, 0.9],
            }}
            transition={{
              duration: bubble.duration,
              delay: bubble.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      <div
        ref={playfieldRef}
        className={`relative z-20 flex h-full w-full flex-col items-center justify-start px-4 pb-[calc(env(safe-area-inset-bottom)+5.2rem)] ${
          useSharedTopHud
            ? 'pt-[calc(env(safe-area-inset-top)+5.5rem)]'
            : 'pt-[calc(env(safe-area-inset-top)+2.5rem)]'
        }`}
      >
        <div className="relative w-[min(92vw,720px)]" style={{ marginTop: `${layout.ribbonTop}%`, maxWidth: `${layout.ribbonWidth}%` }}>
          <img src={ribbonAsset} alt="" className="h-auto w-full object-contain" draggable={false} />
          <div className="absolute inset-0 flex items-center justify-center px-[9%] pt-[5%] text-center">
            <span className="text-[clamp(0.95rem,2.8vw,1.95rem)] font-black leading-tight text-yellow-50 drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
              Arrange Fractions: {directionText}
            </span>
          </div>
        </div>

        <div className="mt-2 rounded-2xl border border-cyan-200/45 bg-[#0a1f56]/72 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-cyan-50">
          Round {Math.min(roundIndex, totalRounds)} / {totalRounds}
        </div>

        <div className="absolute left-0 right-0" style={{ top: `${layout.targetY}%` }}>
          <div className="relative mx-auto w-full max-w-[760px]">
            {activeTargetAnchors.map((anchor, idx) => {
              const card = targetSlots[idx];
              return (
                <div
                  key={`target-slot-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[1rem] border-2 border-dashed border-cyan-100/55 bg-cyan-200/12"
                  style={{
                    left: `${anchor.x}%`,
                    width: layout.slotSize.width,
                    height: layout.slotSize.height,
                  }}
                >
                  {card && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FractionCardTile
                        card={card}
                        size={layout.cardSize}
                        disabled={isResolving}
                        onPointerDown={(event) => beginDrag('target', idx, event)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute left-0 right-0" style={{ top: `${layout.sourceY}%` }}>
          <div className="relative mx-auto w-full max-w-[760px]">
            {activeSourceAnchors.map((anchor, idx) => {
              const card = sourceSlots[idx];
              return (
                <div
                  key={`source-slot-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${anchor.x}%`, width: layout.cardSize.width, height: layout.cardSize.height }}
                >
                  {card && (
                    <FractionCardTile
                      card={card}
                      size={layout.cardSize}
                      disabled={isResolving}
                      onPointerDown={(event) => beginDrag('source', idx, event)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-1.5 rounded-full border border-cyan-200/45 bg-[#0a1f56]/82 px-3 py-2">
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

      <AnimatePresence>
        {dragState && (
          <motion.div
            key={`drag-${dragState.token.id}`}
            className="pointer-events-none absolute z-[120]"
            style={{
              left: dragState.clientX - dragState.offsetX,
              top: dragState.clientY - dragState.offsetY,
              width: dragState.width,
              height: dragState.height,
            }}
          >
            <FractionCardTile card={dragState.token} size={{ width: dragState.width, height: dragState.height }} disabled />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FractionFlowGame;
