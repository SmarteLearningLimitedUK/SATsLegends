import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from '../components/AssetIcon';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import ribbonAsset from '../assets/casual_ui/dialogs_panels/ribbon_1.png';
import { triggerHaptic } from '../haptics';

interface FractionForgeGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type TokenLocation = 'source' | 'target';

interface AnchorPoint {
  x: number;
}

interface FractionCard {
  id: string;
  numerator: number;
  denominator: number;
  value: number;
}

interface RoundState {
  id: string;
  prompt: string;
  cards: FractionCard[];
  sortedIds: string[];
}

interface DragState {
  token: FractionCard;
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

const FRACTION_POOL: ReadonlyArray<readonly [number, number]> = [
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
  [5, 4],
  [4, 3],
  [3, 2],
];

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const clamp = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

const createRowAnchors = (
  count: number,
  viewportWidth: number,
  itemWidth: number,
  minGap: number,
  sidePadding: number,
): AnchorPoint[] => {
  if (count <= 0 || viewportWidth <= 0) return [];
  if (count === 1) return [{ x: 50 }];

  const usableWidth = Math.max(0, viewportWidth - (sidePadding * 2));
  const totalItemWidth = itemWidth * count;
  const rawGap = (usableWidth - totalItemWidth) / (count - 1);
  const gap = Math.max(0, rawGap < minGap ? rawGap : minGap + ((rawGap - minGap) * 0.45));
  const totalWidth = totalItemWidth + (gap * (count - 1));
  const start = ((viewportWidth - totalWidth) / 2) + (itemWidth / 2);

  return Array.from({ length: count }, (_, index) => ({
    x: ((start + (index * (itemWidth + gap))) / viewportWidth) * 100,
  }));
};

const makeRound = (level: number, roundIndex: number): RoundState => {
  const maxCards = Math.min(5, 3 + Math.floor((level + roundIndex - 1) / 4));
  const allowImproper = level >= 6 || roundIndex >= 5;
  const pool = allowImproper ? FRACTION_POOL : FRACTION_POOL.filter(([n, d]) => n < d);
  const picked = shuffle([...pool]).slice(0, maxCards);

  const cards: FractionCard[] = picked.map(([numerator, denominator], idx) => ({
    id: `ff-${roundIndex}-${numerator}-${denominator}-${idx}`,
    numerator,
    denominator,
    value: numerator / denominator,
  }));

  const sortedIds = [...cards]
    .sort((a, b) => a.value - b.value)
    .map((card) => card.id);

  return {
    id: `round-${roundIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt: 'Sort the fractions from smallest to largest!',
    cards,
    sortedIds,
  };
};

const scoreToStars = (accuracy: number, lives: number) => {
  if (accuracy >= 0.9 && lives >= 8) return 3;
  if (accuracy >= 0.65 && lives >= 4) return 2;
  return 1;
};

const FractionCardTile: React.FC<{
  card: FractionCard;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  size: { width: number; height: number };
}> = ({ card, onPointerDown, disabled = false, size }) => (
  <motion.button
    type="button"
    onPointerDown={onPointerDown}
    disabled={disabled}
    whileTap={disabled ? undefined : { scale: 0.97 }}
    className="relative flex cursor-grab flex-col items-center justify-center rounded-[1rem] border-2 border-cyan-200/80 bg-gradient-to-b from-sky-500 to-blue-700 text-white shadow-[0_12px_26px_rgba(8,47,111,0.6)] active:cursor-grabbing disabled:cursor-default"
    style={{ width: size.width, height: size.height }}
  >
    <div className="pointer-events-none absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/28 via-transparent to-transparent" />
    <span className="relative text-[clamp(1.55rem,4.7vw,2.65rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
      {card.numerator}
    </span>
    <span className="relative my-1 h-[2px] w-[56%] rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.65)]" />
    <span className="relative text-[clamp(1.55rem,4.7vw,2.65rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
      {card.denominator}
    </span>
  </motion.button>
);

const FractionForgeGame: React.FC<FractionForgeGameProps> = ({
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
  const [timeLeft, setTimeLeft] = useState(() => Math.max(40, 58 - (Math.max(1, levelId) * 2)));
  const [lives, setLives] = useState(10);
  const [XP, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const endedRef = useRef(false);
  const scoreRef = useRef(0);
  scoreRef.current = XP;

  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );
  const totalRounds = useMemo(() => Math.min(9, 5 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);

  const layout = useMemo(() => {
    const cardCount = round.cards.length;
    const isTablet = Math.min(viewport.width, viewport.height) >= 760;
    const sidePadding = isTablet ? 56 : 16;
    const cardGap = isTablet ? 16 : 8;

    const baseCardWidth = isTablet ? 118 : 92;
    const minCardWidth = isTablet ? 80 : 58;
    const maxCardWidthByViewport = Math.floor(
      (viewport.width - (sidePadding * 2) - (cardGap * Math.max(0, cardCount - 1))) / Math.max(1, cardCount),
    );
    const cardWidth = clamp(Math.min(baseCardWidth, maxCardWidthByViewport), minCardWidth, baseCardWidth);
    const cardHeight = Math.round(cardWidth * 1.24);

    const slotWidth = Math.round(cardWidth * 0.94);
    const slotHeight = Math.round(cardHeight * 0.86);

    const hudTopReserve = useSharedTopHud
      ? (isTablet ? 138 : 122)
      : (isTablet ? 98 : 84);
    const hudBottomReserve = useSharedTopHud
      ? (isTablet ? 126 : 112)
      : (isTablet ? 92 : 84);
    const usableTop = hudTopReserve;
    const usableBottom = Math.max(usableTop + 340, viewport.height - hudBottomReserve);
    const usableHeight = Math.max(340, usableBottom - usableTop);

    const ribbonTop = usableTop + (isTablet ? 4 : 2);
    const sourceTop = usableTop + (usableHeight * (isTablet ? 0.24 : 0.245));
    const targetTop = usableTop + (usableHeight * (isTablet ? 0.69 : 0.705));
    const pedestalTop = targetTop + (slotHeight * 0.58);

    const goblinWidth = Math.round(
      clamp(isTablet ? viewport.width * 0.26 : viewport.width * 0.3, isTablet ? 224 : 188, isTablet ? 346 : 244),
    );
    const goblinHeightEstimate = goblinWidth * 1.28;
    const suggestedGoblinTop = sourceTop + (cardHeight * 0.52);
    const maxGoblinTop = targetTop - (slotHeight * 1.02) - (goblinHeightEstimate * 0.86);
    const goblinTop = Math.max(usableTop + 138, Math.min(suggestedGoblinTop, maxGoblinTop));

    const sourceAnchors = createRowAnchors(cardCount, viewport.width, cardWidth, cardGap, sidePadding);
    const targetAnchors = createRowAnchors(cardCount, viewport.width, slotWidth, cardGap, sidePadding);

    return {
      sourceTop,
      targetTop,
      pedestalTop,
      cardSize: {
        width: cardWidth,
        height: cardHeight,
      },
      slotSize: {
        width: slotWidth,
        height: slotHeight,
      },
      goblinTop,
      goblinWidth,
      sourceAnchors,
      targetAnchors,
      ribbonTop,
      ribbonWidth: isTablet ? 72 : 92,
    };
  }, [round.cards.length, useSharedTopHud, viewport.height, viewport.width]);

  const activeTargetAnchors = layout.targetAnchors;
  const activeSourceAnchors = layout.sourceAnchors;

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
    setTimeLeft(Math.max(40, 58 - (resolvedLevel * 2)));
    setLives(10);
    setScore(0);
    setAttempts(0);
    setCorrectAnswers(0);
    resetRound(makeRound(resolvedLevel, 1));
  }, [resolvedLevel, resetRound]);

  const beginDrag = useCallback((
    location: TokenLocation,
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

  const findDropCandidate = useCallback((clientX: number, clientY: number): { location: TokenLocation; index: number } | null => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const threshold = Math.max(42, rect.width * 0.075);
    let best: { location: TokenLocation; index: number; distance: number } | null = null;

    activeTargetAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + layout.targetTop;
      const distance = Math.hypot(clientX - cx, clientY - cy);
      if (!best || distance < best.distance) best = { location: 'target', index, distance };
    });

    activeSourceAnchors.forEach((anchor, index) => {
      const cx = rect.left + (anchor.x / 100) * rect.width;
      const cy = rect.top + layout.sourceTop;
      const distance = Math.hypot(clientX - cx, clientY - cy);
      if (!best || distance < best.distance) best = { location: 'source', index, distance };
    });

    if (!best || best.distance > threshold) return null;
    return { location: best.location, index: best.index };
  }, [activeSourceAnchors, activeTargetAnchors, layout.sourceTop, layout.targetTop]);

  const placeTokenInArrays = useCallback((candidate: { location: TokenLocation; index: number } | null) => {
    if (!dragState) return;

    const nextTargets = [...targetSlots];
    const nextSources = [...sourceSlots];

    const getToken = (location: TokenLocation, index: number): FractionCard | null => (
      location === 'target' ? nextTargets[index] : nextSources[index]
    );
    const setToken = (location: TokenLocation, index: number, token: FractionCard | null) => {
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
        return { ...current, clientX: event.clientX, clientY: event.clientY };
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

  useEffect(() => {
    if (endedRef.current || isResolving) return;
    if (targetSlots.length === 0 || targetSlots.some((card) => card === null)) return;

    setIsResolving(true);
    const ordered = targetSlots.map((card) => card?.id);
    const isCorrect = ordered.every((id, index) => id === round.sortedIds[index]);

    setAttempts((prev) => prev + 1);

    if (isCorrect) {
      const awarded = 120 + Math.max(0, Math.floor(timeLeft * 1.25));
      const nextScore = XP + awarded;
      const nextCorrect = correctAnswers + 1;
      setScore(nextScore);
      setCorrectAnswers(nextCorrect);
      setFeedback({ tone: 'success', message: 'Perfect order forged!' });
      triggerHaptic('success');

      if (roundIndex >= totalRounds) {
        endedRef.current = true;
        const accuracy = (attempts + 1) > 0 ? (nextCorrect / (attempts + 1)) : 1;
        const stars = scoreToStars(accuracy, lives);
        window.setTimeout(() => onVictory(stars, nextScore), 460);
        return;
      }

      const nextRoundIndex = roundIndex + 1;
      window.setTimeout(() => {
        setRoundIndex(nextRoundIndex);
        resetRound(makeRound(resolvedLevel, nextRoundIndex));
      }, 720);
      return;
    }

    const nextLives = lives - 1;
    setLives(nextLives);
    setTimeLeft((prev) => Math.max(0, prev - 4));
    setFeedback({ tone: 'error', message: 'Not quite. Reforge the order.' });
    triggerHaptic('error');

    if (nextLives <= 0) {
      endedRef.current = true;
      window.setTimeout(() => onGameOver(XP), 460);
      return;
    }

    window.setTimeout(() => {
      resetRound(makeRound(resolvedLevel, roundIndex));
    }, 760);
  }, [
    attempts,
    correctAnswers,
    isResolving,
    lives,
    onGameOver,
    onVictory,
    resetRound,
    resolvedLevel,
    round.sortedIds,
    roundIndex,
    XP,
    targetSlots,
    timeLeft,
    totalRounds,
  ]);

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

  return (
    <div className="relative h-full w-full select-none overflow-hidden">
      <GameplaySceneBackdrop gameType="take_out_rush" className="opacity-[0.92]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#060f2ccc] via-[#0b1a4694] to-[#050b1acc]" />

      <div ref={playfieldRef} className="relative h-full w-full">
        <div
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
          style={{ top: layout.ribbonTop, width: `${layout.ribbonWidth}%` }}
        >
          <img src={ribbonAsset} alt="" className="h-auto w-full object-contain" draggable={false} />
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-[10%] pt-[5%] text-center">
            <span
              className="max-w-[94%] text-[clamp(0.72rem,2.1vw,1.45rem)] font-black leading-tight text-yellow-50 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {round.prompt}
            </span>
          </div>
        </div>

        {activeSourceAnchors.map((anchor, index) => {
          const token = sourceSlots[index];
          const hidden = dragState?.token.id === token?.id;
          return (
            <div
              key={`source-${round.id}-${index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${anchor.x}%`, top: layout.sourceTop }}
            >
              {token && !hidden && (
                <FractionCardTile
                  card={token}
                  size={layout.cardSize}
                  onPointerDown={(event) => beginDrag('source', index, event)}
                />
              )}
            </div>
          );
        })}

        {activeTargetAnchors.map((anchor, index) => {
          const token = targetSlots[index];
          const hidden = dragState?.token.id === token?.id;
          return (
            <React.Fragment key={`target-${round.id}-${index}`}>
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-[1rem] border-2 border-dashed border-cyan-200/60 bg-cyan-200/20"
                style={{
                  left: `${anchor.x}%`,
                  top: layout.targetTop,
                  width: layout.slotSize.width,
                  height: layout.slotSize.height,
                }}
              />
              <div
                className="pointer-events-none absolute z-[9] -translate-x-1/2 -translate-y-1/2 rounded-[0.8rem] border border-yellow-100/22 bg-gradient-to-b from-[#9a6f45] to-[#6a4728] shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${anchor.x}%`,
                  top: layout.pedestalTop,
                  width: layout.slotSize.width + 8,
                  height: Math.max(26, layout.slotSize.height * 0.24),
                }}
              />

              <div
                className="absolute z-[11] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${anchor.x}%`, top: layout.targetTop }}
              >
                {token && !hidden && (
                  <FractionCardTile
                    card={token}
                    size={layout.cardSize}
                    onPointerDown={(event) => beginDrag('target', index, event)}
                  />
                )}
              </div>

              {index < activeTargetAnchors.length - 1 && (
                <div
                  className="pointer-events-none absolute z-[12] -translate-x-1/2 -translate-y-1/2 text-cyan-200/85"
                  style={{ left: `${(anchor.x + activeTargetAnchors[index + 1].x) / 2}%`, top: layout.pedestalTop }}
                >
                  <span className="text-[clamp(1.15rem,2.8vw,1.8rem)] font-black">&gt;</span>
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="pointer-events-none absolute bottom-[calc(0.8rem+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2 rounded-full border border-cyan-100/40 bg-[#0a1f56]/82 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100 md:text-xs">
          Round {Math.min(roundIndex, totalRounds)} / {totalRounds}
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`pointer-events-none absolute left-1/2 top-[56%] z-40 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                feedback.tone === 'success'
                  ? 'border-emerald-300/65 bg-emerald-300/20 text-emerald-50'
                  : 'border-rose-300/65 bg-rose-300/20 text-rose-50'
              }`}
            >
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        {dragState && (
          <div
            className="pointer-events-none absolute z-50"
            style={{
              left: dragState.clientX - dragState.offsetX,
              top: dragState.clientY - dragState.offsetY,
              width: dragState.width,
              height: dragState.height,
            }}
          >
            <FractionCardTile card={dragState.token} size={{ width: dragState.width, height: dragState.height }} disabled />
          </div>
        )}
      </div>
    </div>
  );
};

export default FractionForgeGame;
