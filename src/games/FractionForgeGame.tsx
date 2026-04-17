import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AssetIcon from '../components/AssetIcon';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import fractionForgeBackground from '../assets/maps/backgroundsforgames/fraction forge map.jpg';
import { triggerHaptic } from '../haptics';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface FractionForgeGameProps extends MiniGameShellContractProps {
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
  compact?: boolean;
}> = ({ card, onPointerDown, disabled = false, size }) => (
  <motion.button
    type="button"
    onPointerDown={onPointerDown}
    disabled={disabled}
    whileTap={disabled ? undefined : { scale: 0.97 }}
    className="relative flex cursor-grab flex-col items-center justify-center rounded-[0.85rem] border border-cyan-200/70 bg-gradient-to-b from-sky-500 to-blue-700 text-white shadow-[0_10px_20px_rgba(8,47,111,0.5)] active:cursor-grabbing disabled:cursor-default touch-none"
    style={{ width: size.width, height: size.height }}
  >
    <div className="pointer-events-none absolute inset-0 rounded-[0.85rem] bg-gradient-to-br from-white/24 via-transparent to-transparent" />
    <span className="relative text-[clamp(1.15rem,3.8vw,2rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
      {card.numerator}
    </span>
    <span className="relative my-[0.2rem] h-[1.5px] w-[54%] rounded-full bg-white/88 shadow-[0_0_5px_rgba(255,255,255,0.58)]" />
    <span className="relative text-[clamp(1.15rem,3.8vw,2rem)] font-black leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
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
  isPractice,
  onVictory,
  onGameOver,
  onBack: _onBack,
  practiceBriefing: _practiceBriefing,
  gameTitle,
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
  const [forgeGlow, setForgeGlow] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const forgeGlowTimeoutRef = useRef<number | null>(null);
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
    const sidePadding = isTablet ? 48 : 12;
    const cardGap = isTablet ? 12 : 6;

    const baseCardWidth = isTablet ? 98 : 76;
    const minCardWidth = isTablet ? 68 : 50;
    const maxCardWidthByViewport = Math.floor(
      (viewport.width - (sidePadding * 2) - (cardGap * Math.max(0, cardCount - 1))) / Math.max(1, cardCount),
    );
    const cardWidth = clamp(Math.min(baseCardWidth, maxCardWidthByViewport), minCardWidth, baseCardWidth);
    const cardHeight = Math.round(cardWidth * 1.24);

    const slotWidth = Math.round(cardWidth * 0.88);
    const slotHeight = Math.round(cardHeight * 0.78);

    const hudTopReserve = useSharedTopHud
      ? (isTablet ? 132 : 116)
      : (isTablet ? 92 : 78);
    const hudBottomReserve = useSharedTopHud
      ? (isTablet ? 126 : 112)
      : (isTablet ? 92 : 84);
    const usableTop = hudTopReserve;
    const usableBottom = Math.max(usableTop + 340, viewport.height - hudBottomReserve);
    const usableHeight = Math.max(340, usableBottom - usableTop);

    const targetTop = usableTop + (usableHeight * (isTablet ? 0.41 : 0.39));
    const sourceTop = targetTop - cardHeight - (isTablet ? 10 : 8);
    const pedestalTop = targetTop + (slotHeight * 0.5);

    const goblinWidth = Math.round(
      clamp(isTablet ? viewport.width * 0.26 : viewport.width * 0.3, isTablet ? 224 : 188, isTablet ? 346 : 244),
    );
    const goblinHeightEstimate = goblinWidth * 1.28;
    const suggestedGoblinTop = sourceTop + (cardHeight * 0.52);
    const maxGoblinTop = targetTop - (slotHeight * 1.04) - (goblinHeightEstimate * 0.76);
    const goblinTop = Math.max(usableTop + 118, Math.min(suggestedGoblinTop, maxGoblinTop));

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
    const updateViewport = () => {
      const rect = playfieldRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setViewport({ width: rect.width, height: rect.height });
        return;
      }
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
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

  useEffect(() => () => {
    if (forgeGlowTimeoutRef.current !== null) {
      window.clearTimeout(forgeGlowTimeoutRef.current);
    }
  }, []);

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

    const threshold = Math.max(50, rect.width * 0.09);
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
      setForgeGlow(true);
      triggerHaptic('success');

      if (forgeGlowTimeoutRef.current !== null) {
        window.clearTimeout(forgeGlowTimeoutRef.current);
      }
      forgeGlowTimeoutRef.current = window.setTimeout(() => {
        setForgeGlow(false);
      }, 900);

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

  const showSmoke = feedback?.tone === 'error';

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

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
      <GameplaySceneBackdrop
        gameType="take_out_rush"
        backgroundOverride={fractionForgeBackground}
      />

      <PracticeIntroPopup
        open={showPracticeIntro}
        title={gameTitle || 'Fraction Forge'}
        body="We need to construct a cage strong enough to protect the brainpower from the Monster Minds. Solve the order of fractions to forge the Elitium needed to construct the cage."
        briefing={null}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div ref={playfieldRef} className="relative h-full w-full">
        <AnimatePresence>
          {forgeGlow && (
            <motion.div
              key="forge-glow"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-x-0 bottom-0 top-[30%] z-[1]"
              style={{
                background:
                  'radial-gradient(circle at 50% 70%, rgba(74,222,128,0.72) 0%, rgba(34,197,94,0.44) 14%, rgba(16,185,129,0.18) 28%, transparent 58%)',
                filter: 'blur(16px)',
                mixBlendMode: 'screen',
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSmoke && (
            <motion.div
              key="forge-smoke"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  'radial-gradient(circle at 50% 70%, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.48) 22%, rgba(2,6,23,0.68) 50%, rgba(2,6,23,0.86) 82%)',
              }}
            >
              <motion.div
                animate={{ y: [12, -10, 8], x: [0, 14, -10, 0], opacity: [0.24, 0.6, 0.36, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-x-0 bottom-[18%] h-[28%] bg-[radial-gradient(circle_at_25%_80%,rgba(148,163,184,0.4),transparent_45%),radial-gradient(circle_at_55%_65%,rgba(15,23,42,0.62),transparent_46%),radial-gradient(circle_at_78%_82%,rgba(100,116,139,0.34),transparent_42%)] blur-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="pointer-events-none fixed left-0 right-0 z-[60]"
          style={{ top: useSharedTopHud ? '4px' : '8px' }}
        >
          <div className="mx-auto w-full max-w-[760px] rounded-[1rem] bg-slate-950/72 px-[15px] py-[11px] text-center backdrop-blur-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/90">Fraction Forge</div>
            <div className="mt-0.5 text-[clamp(1rem,3.8vw,1.35rem)] font-black text-white">
              {round.prompt}
            </div>
            <div className="mt-1 text-[10px] font-semibold text-cyan-100/90">
              Place the fractions in order.
            </div>
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
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-[0.85rem] border border-dashed border-cyan-200/45 bg-cyan-200/12"
                style={{
                  left: `${anchor.x}%`,
                  top: layout.targetTop,
                  width: layout.slotSize.width,
                  height: layout.slotSize.height,
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

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`pointer-events-none absolute left-1/2 top-[56%] z-40 -translate-x-1/2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                feedback.tone === 'success'
                  ? 'border-emerald-300/65 bg-emerald-300/20 text-emerald-50'
                  : 'border-rose-300/65 bg-rose-300/20 text-amber-50'
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
              left: dragState.clientX - (dragState.width / 2),
              top: dragState.clientY - (dragState.height / 2),
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
