import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw } from 'lucide-react';
import {
  GameQuestionCard,
  GameUiShell,
  PrimaryButton,
  SecondaryButton,
} from '../components/game-ui/GameUiKit';
import shareSplitterBackground from '../assets/maps/premium/share-splitter.webp';
import shareSplitterPlate from '../assets/maps/backgroundsforgames/platesharesplit.png';
import cakeSliceAsset from '../assets/cakeslice.png';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import CelebrationSplash from '../components/CelebrationSplash';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import './share-splitter.css';

interface ShareSplitterGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface ShareChallenge {
  id: string;
  totalSlices: number;
  ratios: number[];
  targetCounts: number[];
  prompt: string;
  mode: 'direct_share' | 'scaled_share' | 'bigger_share' | 'exam_share';
  plateCount: number;
}

type FeedbackTone = 'good' | 'bad' | 'neutral';

type MoveRecord = {
  plateIndex: number;
  sliceId: string;
};

type DragSlice = {
  id: string;
  x: number;
  y: number;
};

type SlicePlacement = {
  x: number;
  y: number;
};

const MAX_PLATE_COUNT = 5;
const ROUNDS_TO_WIN = 5;
const BASE_XP_PER_ROUND = 120;
const CAKE_SLICE_ASSET = cakeSliceAsset;
const DRAG_SLICE_SIZE = 48;
const SHARE_SPLITTER_BACKGROUND_SIZE = { width: 2500, height: 5000 };
const SHARE_SPLITTER_PLATE_DIAMETER_PX = 540;
const CAKE_SOURCE_POSITION = { x: 1250, y: 3750 };
const CAKE_SOURCE_SIZE_PX = 660;
const SHARE_SPLITTER_TABLE_CENTER = { x: 1250, y: 2550 };
const SHARE_SPLITTER_TABLE_PLATE_RADIUS_X = 725;
const SHARE_SPLITTER_TABLE_PLATE_RADIUS_Y = 375;
const SHARE_SPLITTER_PLATE_ICON_SCALE = 1.06;

const makeRingPoint = (center: { x: number; y: number }, angleDegrees: number) => {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: center.x + (Math.cos(angle) * SHARE_SPLITTER_TABLE_PLATE_RADIUS_X),
    y: center.y + (Math.sin(angle) * SHARE_SPLITTER_TABLE_PLATE_RADIUS_Y),
  };
};

const SHARE_SPLITTER_TABLE_PLATE_POSITIONS = [
  makeRingPoint(SHARE_SPLITTER_TABLE_CENTER, -90),
  makeRingPoint(SHARE_SPLITTER_TABLE_CENTER, -18),
  makeRingPoint(SHARE_SPLITTER_TABLE_CENTER, 54),
  makeRingPoint(SHARE_SPLITTER_TABLE_CENTER, 126),
  makeRingPoint(SHARE_SPLITTER_TABLE_CENTER, 198),
];

const RATIO_PATTERNS_BY_COUNT: Record<number, number[][]> = {
  2: [
    [1, 1],
    [2, 1],
    [3, 1],
    [3, 2],
  ],
  3: [
    [1, 1, 2],
    [2, 1, 1],
    [3, 2, 1],
    [2, 2, 1],
  ],
  4: [
    [1, 1, 2, 2],
    [1, 2, 2, 3],
    [2, 1, 2, 3],
    [1, 1, 2, 3],
  ],
  5: [
    [1, 1, 1, 1, 2],
    [1, 1, 1, 2, 2],
    [1, 1, 2, 2, 3],
    [1, 2, 2, 3, 3],
    [2, 1, 2, 3, 4],
  ],
};

const PLATE_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[3],
  ],
  3: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[0],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[3],
  ],
  4: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[0],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[2],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[4],
  ],
  5: SHARE_SPLITTER_TABLE_PLATE_POSITIONS,
};

const createEmptyPlates = (plateCount: number) => Array.from({ length: plateCount }, () => [] as string[]);

let challengeSeed = 0;
const nextChallengeId = () => {
  challengeSeed += 1;
  return `share-splitter-${challengeSeed}`;
};

const randomPick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const starsForAccuracy = (correct: number, attempts: number) => {
  if (correct === 0) return 0;
  const accuracy = correct / Math.max(1, attempts);
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.72) return 2;
  if (accuracy >= 0.55) return 1;
  return 0;
};

const shareModeForLevel = (levelId: number): ShareChallenge['mode'] => {
  if (levelId <= 1) return 'direct_share';
  if (levelId <= 3) return 'scaled_share';
  if (levelId === 4) return 'bigger_share';
  return 'exam_share';
};

const buildSharePrompt = () => {
  return [
    "Welcome to the Monster Mind's party.",
    'They are fighting over a Brainpower cake.',
    'Drag the slices from the cake to each plate to match the target ratio.',
    'Keep the ratio balanced to stop their greed.',
  ].join('\n');
};

const createChallenge = (levelId: number, solved: number): ShareChallenge => {
  const tier = Math.max(1, Math.min(5, levelId));
  const mode = shareModeForLevel(levelId);
  const plateCount = MAX_PLATE_COUNT;
  const tierPatterns: number[][][] = [
    [[1, 1, 1, 1, 1]],
    [[1, 1, 1, 1, 2], [1, 1, 1, 2, 2]],
    [[1, 1, 2, 2, 3], [1, 2, 1, 2, 3]],
    [[1, 2, 2, 3, 3], [2, 1, 2, 3, 3]],
    [[2, 1, 2, 3, 4], [1, 2, 3, 2, 4]],
  ];
  const patternOptions = tierPatterns[tier - 1];
  const pattern = [...randomPick(patternOptions)];
  const totalUnits = pattern.reduce((sum, value) => sum + value, 0);
  const unitValue = [1, 1, 2, 2, 3][tier - 1];
  const totalSlices = totalUnits * unitValue;
  const targetCounts = pattern.map((value) => value * unitValue);
  const ratioText = pattern.join(':');

  return {
    id: nextChallengeId(),
    totalSlices,
    ratios: pattern,
    targetCounts,
    prompt: buildSharePrompt(),
    mode,
    plateCount,
  };
};

const ShareSplitterGame: React.FC<ShareSplitterGameProps> = ({
  levelId,
  avatarId: _avatarId,
  isPractice,
  practiceBriefing,
  sessionEvents,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const [roundSolved, setRoundSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [challenge, setChallenge] = useState<ShareChallenge>(() => createChallenge(levelId, 0));
  const [plates, setPlates] = useState<string[][]>(() => createEmptyPlates(challenge.plateCount));
  const [remainingSlices, setRemainingSlices] = useState(challenge.totalSlices);
  const [dragSlice, setDragSlice] = useState<DragSlice | null>(null);
  const [sourceSelected, setSourceSelected] = useState(false);
  const [hoverPlateIndex, setHoverPlateIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [validationActive, setValidationActive] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [locked, setLocked] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const trimmedCakeSliceAsset = useTrimmedImageSource(CAKE_SLICE_ASSET);
  const reducedMotion = useReducedMotion();
  const [viewportRect, setViewportRect] = useState({ width: 0, height: 0 });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const plateRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const cakeSourceButtonRef = useRef<HTMLButtonElement | null>(null);
  const [questionDockBottom, setQuestionDockBottom] = useState(0);
  const sliceSeedRef = useRef(0);
  const dragActiveRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const remainingSlicesRef = useRef(challenge.totalSlices);
  const lastCheckedAllocationRef = useRef<string | null>(null);
  const ignoreNativeClickUntilRef = useRef(0);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dragCleanupRef.current?.();
  }, []);

  useEffect(() => {
    endedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dragCleanupRef.current?.();
    const firstChallenge = createChallenge(levelId, 0);
    setRoundSolved(0);
    setAttempts(0);
    setXpEarned(0);
    setChallenge(firstChallenge);
    setPlates(createEmptyPlates(firstChallenge.plateCount));
    setRemainingSlices(firstChallenge.totalSlices);
    remainingSlicesRef.current = firstChallenge.totalSlices;
    lastCheckedAllocationRef.current = null;
    setSourceSelected(false);
    setDragSlice(null);
    setHoverPlateIndex(null);
    setFeedback('');
    setFeedbackTone('neutral');
    setValidationActive(false);
    setMoveHistory([]);
    setLocked(false);
    setShowCelebrationSplash(false);
  }, [levelId]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const update = () => {
      setViewportRect({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [challenge.id]);

  useLayoutEffect(() => {
    const node = questionCardRef.current;
    if (!node) return undefined;

    const update = () => {
      const root = stageRef.current;
      if (!root) return;
      const rect = node.getBoundingClientRect();
      const stage = root.getBoundingClientRect();
      const scale = stage.height / Math.max(1, root.clientHeight);
      setQuestionDockBottom((rect.bottom - stage.top) / scale);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [challenge.id]);

  const plateViews = useMemo(() => challenge.ratios.map((ratio, index) => {
    const currentCakeCount = plates[index]?.length ?? 0;
    const targetCakeCount = challenge.targetCounts[index] ?? 0;
    return {
      id: `plate-${index + 1}`,
      assignedRatioValue: ratio,
      currentCakeCount,
      targetCakeCount,
      isCorrect: currentCakeCount === targetCakeCount,
    };
  }), [challenge.ratios, challenge.targetCounts, plates]);

  const hasMoves = moveHistory.length > 0;
  const allSlicesUsed = remainingSlices === 0;
  const allCorrect = plateViews.every((plate) => plate.isCorrect);
  const platePositions = PLATE_POSITIONS_BY_COUNT[challenge.plateCount] || PLATE_POSITIONS_BY_COUNT[5];
  const isCompactViewport = viewportRect.width < 520;
  const isWideShareLayout = viewportRect.width >= 700;
  const plateLayoutScale = isCompactViewport ? 0.68 : 1;
  const cakeSourceLayoutScale = isCompactViewport ? 0.76 : 1;
  const backgroundWidthScale = viewportRect.width / SHARE_SPLITTER_BACKGROUND_SIZE.width;
  const backgroundHeightScale = viewportRect.height / SHARE_SPLITTER_BACKGROUND_SIZE.height;
  // Keep the portrait artwork coordinates on narrow screens. Desktop uses a
  // separate full-width playfield, so the targets remain large and spaced out.
  const backgroundScale = isWideShareLayout
    ? Math.min(backgroundWidthScale, backgroundHeightScale)
    : Math.max(backgroundWidthScale, backgroundHeightScale);
  const backgroundOffsetX = (viewportRect.width - (SHARE_SPLITTER_BACKGROUND_SIZE.width * backgroundScale)) / 2;
  const sideRailWidth = Math.min(340, Math.max(260, viewportRect.width * 0.28));
  const playfieldLeft = sideRailWidth + 36;
  const playfieldWidth = Math.max(300, viewportRect.width - playfieldLeft - 20);
  const plateSizePx = isWideShareLayout
    ? Math.min(132, Math.max(68, Math.min((playfieldWidth / 5) * 0.68, viewportRect.height * 0.2)))
    : SHARE_SPLITTER_PLATE_DIAMETER_PX * backgroundScale * plateLayoutScale;
  const artHeight = SHARE_SPLITTER_BACKGROUND_SIZE.height * backgroundScale;
  const bottomArtOffset = viewportRect.height - artHeight;
  const minTableCenter = questionDockBottom + SHARE_SPLITTER_TABLE_PLATE_RADIUS_Y * backgroundScale + plateSizePx / 2 + 12;
  const backgroundOffsetY = Math.min(0, Math.max(bottomArtOffset, minTableCenter - SHARE_SPLITTER_TABLE_CENTER.y * backgroundScale));
  const backgroundPositionY = Math.abs(bottomArtOffset) < .01 ? 50 : (backgroundOffsetY / bottomArtOffset) * 100;
  const cakeSourceSize = isWideShareLayout
    ? Math.min(124, Math.max(84, viewportRect.height * 0.18))
    : CAKE_SOURCE_SIZE_PX * backgroundScale * cakeSourceLayoutScale;
  const cakeSourceCenter = isWideShareLayout
    ? { x: playfieldLeft + playfieldWidth * 0.5, y: viewportRect.height * 0.74 }
    : {
    x: backgroundOffsetX + CAKE_SOURCE_POSITION.x * backgroundScale,
    y: Math.min(backgroundOffsetY + CAKE_SOURCE_POSITION.y * backgroundScale, viewportRect.height - 124 - cakeSourceSize / 2 - 10),
  };
  const promptText = isPractice
    ? `Target ratio: ${challenge.ratios.join(':')}`
    : `There are ${challenge.totalSlices} slices of brainpower cake.\nThe Monster Mind demands it is shared in a ratio of ${challenge.ratios.join(':')}.`;

  const loadNextChallenge = useCallback((solvedCount: number) => {
    dragCleanupRef.current?.();
    const next = createChallenge(levelId, solvedCount);
    setChallenge(next);
    setPlates(createEmptyPlates(next.plateCount));
    setRemainingSlices(next.totalSlices);
    remainingSlicesRef.current = next.totalSlices;
    lastCheckedAllocationRef.current = null;
    setSourceSelected(false);
    setDragSlice(null);
    setHoverPlateIndex(null);
    setValidationActive(false);
    setMoveHistory([]);
    setLocked(false);
    setFeedback('');
    setFeedbackTone('neutral');
  }, [levelId]);

  const mapBackgroundPointToViewport = useCallback((point: { x: number; y: number }) => ({
    x: backgroundOffsetX + (point.x * backgroundScale),
    y: backgroundOffsetY + (point.y * backgroundScale),
  }), [backgroundOffsetX, backgroundOffsetY, backgroundScale]);

  const getPlateSlicePlacement = useCallback((index: number) => {
    // Stack slices in a compact spiral so they read as sitting on the plate.
    const angleDegrees = index * 137.50776405;
    const angle = (angleDegrees * Math.PI) / 180;
    const radius = Math.min(0.18, 0.04 + (index * 0.022));
    const stretchX = index % 2 === 0 ? 1 : 0.9;
    const stretchY = index % 3 === 0 ? 0.82 : 0.72;

    return {
      x: Math.cos(angle) * radius * stretchX,
      y: Math.sin(angle) * radius * stretchY,
    };
  }, []);

  const placeOnPlate = (plateIndex: number, sliceId: string) => {
    if (locked || remainingSlicesRef.current <= 0) return;

    remainingSlicesRef.current -= 1;
    setRemainingSlices(remainingSlicesRef.current);
    lastCheckedAllocationRef.current = null;
    if (remainingSlicesRef.current === 0) setSourceSelected(false);
    setPlates((previous) => previous.map((plate, index) => (
      index === plateIndex ? [...plate, sliceId] : plate
    )));
    setMoveHistory((previous) => [...previous, { plateIndex, sliceId }]);
    setDragSlice(null);
    setHoverPlateIndex(null);
    setFeedback('Nice sharing. Keep matching the ratio card.');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const handleSourcePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || remainingSlicesRef.current <= 0 || dragActiveRef.current) return;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;

    const pointerId = event.pointerId;
    const source = event.currentTarget;
    const origin = { x: event.clientX, y: event.clientY };
    const sliceId = `${challenge.id}-slice-${sliceSeedRef.current++}`;
    let revealed = false;
    dragActiveRef.current = true;

    const getHitPlate = (clientX: number, clientY: number) => {
      let closest = -1;
      let distance = Infinity;
      plateRefs.current.forEach((plate, index) => {
        if (!plate) return;
        const bounds = plate.getBoundingClientRect();
        const currentDistance = Math.hypot(clientX - bounds.left - bounds.width / 2, clientY - bounds.top - bounds.height / 2);
        if (currentDistance <= bounds.width * .56 && currentDistance < distance) {
          closest = index;
          distance = currentDistance;
        }
      });
      return closest;
    };

    const updateDrag = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      if (!revealed) {
        if (Math.hypot(move.clientX - origin.x, move.clientY - origin.y) < 6) return;
        revealed = true;
        setSourceSelected(false);
        setFeedback('Drop the slice onto a plate.');
        setFeedbackTone('neutral');
      }
      const stage = stageRef.current;
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      const scaleX = bounds.width / Math.max(1, stage.clientWidth);
      const scaleY = bounds.height / Math.max(1, stage.clientHeight);
      setDragSlice({
        id: sliceId,
        x: (move.clientX - bounds.left) / scaleX - DRAG_SLICE_SIZE / 2,
        y: (move.clientY - bounds.top) / scaleY - DRAG_SLICE_SIZE / 2,
      });
      const hit = getHitPlate(move.clientX, move.clientY);
      setHoverPlateIndex(hit >= 0 ? hit : null);
    };

    const cleanup = () => {
      dragActiveRef.current = false;
      window.removeEventListener('pointermove', updateDrag);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', cancelPointer);
      window.removeEventListener('touchcancel', cancelDrag);
      window.removeEventListener('blur', cancelDrag);
      if (source.hasPointerCapture?.(pointerId)) source.releasePointerCapture(pointerId);
      if (dragCleanupRef.current === cleanup) dragCleanupRef.current = null;
    };

    const finishDrag = (end: PointerEvent) => {
      if (end.pointerId !== pointerId || !dragActiveRef.current) return;
      cleanup();
      setDragSlice(null);
      setHoverPlateIndex(null);
      if (!revealed) return;
      // A captured pointer can generate a click on the source after the drop.
      ignoreNativeClickUntilRef.current = Date.now() + 150;
      const hit = getHitPlate(end.clientX, end.clientY);
      if (hit >= 0) placeOnPlate(hit, sliceId);
    };

    const cancelDrag = () => {
      cleanup();
      setDragSlice(null);
      setHoverPlateIndex(null);
      ignoreNativeClickUntilRef.current = Date.now() + 150;
    };
    const cancelPointer = (cancel: PointerEvent) => {
      if (cancel.pointerId === pointerId) cancelDrag();
    };

    dragCleanupRef.current = cleanup;
    source.setPointerCapture?.(pointerId);
    window.addEventListener('pointermove', updateDrag);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelPointer);
    window.addEventListener('touchcancel', cancelDrag);
    window.addEventListener('blur', cancelDrag);
  };

  const selectCakeSource = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (locked || remainingSlicesRef.current <= 0) return;
    if (event.detail > 0 && Date.now() < ignoreNativeClickUntilRef.current) return;
    setSourceSelected(true);
    setFeedback('Choose a plate to add one slice. Keep choosing plates to share the rest.');
    setFeedbackTone('neutral');
    if (event.detail === 0) plateRefs.current[0]?.focus();
  };

  const choosePlate = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (locked || remainingSlicesRef.current <= 0) return;
    if (event.detail > 0 && Date.now() < ignoreNativeClickUntilRef.current) return;
    if (!sourceSelected) {
      setFeedback('Choose the cake first, then choose a plate. You can also drag a slice.');
      setFeedbackTone('neutral');
      cakeSourceButtonRef.current?.focus();
      return;
    }
    placeOnPlate(index, `${challenge.id}-slice-${sliceSeedRef.current++}`);
  };

  const resetAllocation = () => {
    if (locked || moveHistory.length === 0) return;
    dragCleanupRef.current?.();
    setPlates(createEmptyPlates(challenge.plateCount));
    setRemainingSlices(challenge.totalSlices);
    remainingSlicesRef.current = challenge.totalSlices;
    lastCheckedAllocationRef.current = null;
    setSourceSelected(false);
    setMoveHistory([]);
    setDragSlice(null);
    setHoverPlateIndex(null);
    setFeedback('');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const checkAllocation = () => {
    if (locked || !hasMoves || validationActive) return;
    const allocation = `${challenge.id}:${plates.map((plate) => plate.length).join(':')}:${remainingSlices}`;
    if (lastCheckedAllocationRef.current === allocation) return;
    lastCheckedAllocationRef.current = allocation;
    dragCleanupRef.current?.();
    setDragSlice(null);
    setHoverPlateIndex(null);

    setAttempts((previous) => previous + 1);
    setValidationActive(true);

    if (!allSlicesUsed || !allCorrect) {
      emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { reason: 'sharing_ratio', metadata: { challengeId: challenge.id } });
      setFeedback(!allSlicesUsed ? 'Share every slice, then check the ratio again.' : 'The parts need a different split. Reset and try again.');
      setFeedbackTone('bad');
      return;
    }

    emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { challengeId: challenge.id } });

    const nextSolved = roundSolved + 1;
    const roundXp = BASE_XP_PER_ROUND + (levelId * 20);
    const nextXp = xpEarned + roundXp;

    setLocked(true);
    setRoundSolved(nextSolved);
    setXpEarned(nextXp);
    setFeedback('🍰 “Perfect split!”');
    setFeedbackTone('good');
    setShowCelebrationSplash(true);

    if (!reducedMotion) confetti({
      particleCount: 40,
      spread: 56,
      origin: { y: 0.64 },
      colors: ['#facc15', '#38bdf8', '#4ade80'],
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowCelebrationSplash(false);
      if (endedRef.current) return;
      if (nextSolved >= ROUNDS_TO_WIN) {
        endedRef.current = true;
        onVictory(starsForAccuracy(nextSolved, attempts + 1), nextXp);
        return;
      }
      loadNextChallenge(nextSolved);
    }, 760);
  };

  return (
    <GameUiShell
      className="share-splitter-shell"
      backgroundImage={shareSplitterBackground}
      backgroundOpacity={1}
      backgroundPosition={isWideShareLayout ? 'center 50%' : `center ${backgroundPositionY}%`}
      backgroundFit={isWideShareLayout ? 'cover' : 'contain'}
      overlayDisabled
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Share Splitter"
        body="Share the cake to match each plate’s ratio. Drag a slice to a plate, or choose the cake and then choose a plate. Keep the parts in the correct proportion."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div
        ref={stageRef}
        className="share-splitter-stage relative h-full w-full"
        data-share-stage
        data-layout={isWideShareLayout ? 'desktop' : 'portrait'}
      >
        <div ref={questionCardRef} className="share-splitter-mission">
          <GameQuestionCard
            title="Target Ratio"
            subtitle="Choose the cake, then a plate. Or drag slices onto the plates."
            style={{ position: 'relative', top: 0, transform: 'none', width: '100%', padding: '10px 12px' }}
          >
            {promptText}
          </GameQuestionCard>
        </div>

        <div className="share-splitter-pieces" data-share-pieces>
          <CelebrationSplash active={showCelebrationSplash && !reducedMotion} message="Party Time!" theme="party" />
          {plateViews.map((plate, index) => {
            const position = platePositions[index] || { x: 0, y: 0 };
            const center = isWideShareLayout
              ? {
                x: playfieldLeft + playfieldWidth * (0.1 + index * 0.2),
                y: viewportRect.height * (0.43 + [0.04, -0.01, -0.03, -0.01, 0.04][index]),
              }
              : mapBackgroundPointToViewport(position);
            const sliceCount = plates[index].length;
            const sliceBaseSizePx = Math.max(22, plateSizePx * (sliceCount <= 3 ? .24 : sliceCount <= 6 ? .2 : .16));
            return (
              <button
                key={plate.id}
                type="button"
                ref={(node) => { plateRefs.current[index] = node; }}
                data-testid={`share-splitter-plate-${index + 1}`}
                data-share-ratio={plate.assignedRatioValue}
                data-slice-count={sliceCount}
                data-button-skin="none"
                data-selected={sourceSelected || hoverPlateIndex === index}
                onClick={(event) => choosePlate(index, event)}
                disabled={locked || remainingSlices <= 0}
                aria-label={`Plate ${index + 1}, ${plate.assignedRatioValue} ${plate.assignedRatioValue === 1 ? 'part' : 'parts'}, ${sliceCount} slices`}
                className="share-splitter-plate"
                style={{ left: center.x, top: center.y, width: plateSizePx, height: plateSizePx }}
              >
                <img
                  src={shareSplitterPlate}
                  alt=""
                  draggable={false}
                  className="share-splitter-plate-image"
                  style={{ transform: `scale(${SHARE_SPLITTER_PLATE_ICON_SCALE})` }}
                />
                {plates[index].map((sliceId, sliceIndex) => {
                  const placement = getPlateSlicePlacement(sliceIndex);
                  return (
                    <img
                      key={sliceId}
                      src={trimmedCakeSliceAsset}
                      alt=""
                      draggable={false}
                      className="share-splitter-plated-slice"
                      style={{
                        width: sliceBaseSizePx,
                        height: sliceBaseSizePx,
                        transform: `translate(calc(-50% + ${placement.x * plateSizePx}px), calc(-50% + ${placement.y * plateSizePx}px)) rotate(${sliceIndex % 2 ? 5 : -5}deg)`,
                      }}
                    />
                  );
                })}
                <span className="share-splitter-plate-ratio">{plate.assignedRatioValue} {plate.assignedRatioValue === 1 ? 'part' : 'parts'}</span>
                <span className="share-splitter-plate-count">{sliceCount}</span>
              </button>
            );
          })}

          <button
            ref={cakeSourceButtonRef}
            type="button"
            data-share-source
            data-remaining-slices={remainingSlices}
            data-button-skin="none"
            onPointerDown={handleSourcePointerDown}
            onClick={selectCakeSource}
            disabled={locked || remainingSlices <= 0}
            className="share-splitter-source"
            style={{ left: cakeSourceCenter.x, top: cakeSourceCenter.y, width: cakeSourceSize, height: cakeSourceSize }}
            aria-label={remainingSlices > 0 ? 'Choose the cake, then choose a plate, or drag a slice' : 'No cake slices left'}
            aria-pressed={sourceSelected}
          >
            <img src={trimmedCakeSliceAsset} alt="" draggable={false} />
            <span>{remainingSlices} slices</span>
          </button>
        </div>

        <div className="share-splitter-actions answer-choice-surface" data-share-actions>
          <div className="share-splitter-feedback" role="status" aria-live="polite">
            {feedback}
          </div>
          <div className="share-splitter-action-buttons">
            <SecondaryButton onClick={resetAllocation} disabled={locked || moveHistory.length === 0}>
              <RefreshCcw className="h-4 w-4" /> Reset
            </SecondaryButton>
            <PrimaryButton onClick={checkAllocation} disabled={locked || !hasMoves || validationActive}>
              <Check className="h-4 w-4" /> Check
            </PrimaryButton>
          </div>
        </div>

        <AnimatePresence>
          {dragSlice ? (
            <motion.div
              key={dragSlice.id}
              initial={{ scale: reducedMotion ? 1 : .92, opacity: .9 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: reducedMotion ? 1 : .86 }}
              transition={{ duration: .08 }}
              className="share-splitter-drag"
              style={{ left: dragSlice.x, top: dragSlice.y, width: DRAG_SLICE_SIZE, height: DRAG_SLICE_SIZE }}
            >
              <img src={trimmedCakeSliceAsset} alt="" draggable={false} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </GameUiShell>
  );
};

export default ShareSplitterGame;
