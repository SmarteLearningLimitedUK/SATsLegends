import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw } from 'lucide-react';
import {
  FeedbackStrip,
  GameQuestionCard,
  GameUiShell,
  PrimaryButton,
  SecondaryButton,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import shareSplitterBackground from '../assets/maps/backgroundsforgames/sharesplitterfinal.png';
import cakeSliceAsset from '../assets/cakeslice.png';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import CelebrationSplash from '../components/CelebrationSplash';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';

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
const SHARE_SPLITTER_BACKGROUND_SIZE = { width: 800, height: 1600 };
const SHARE_SPLITTER_PLATE_DIAMETER_PX = 174;
const CAKE_SOURCE_POSITION = { x: 400, y: 1376 };
const CAKE_SOURCE_SIZE_PX = 212;

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
    { x: 222.5, y: 653.8 },
    { x: 584.2, y: 662.0 },
  ],
  3: [
    { x: 403.3, y: 520.9 },
    { x: 222.5, y: 653.8 },
    { x: 584.2, y: 662.0 },
  ],
  4: [
    { x: 403.3, y: 520.9 },
    { x: 222.5, y: 653.8 },
    { x: 584.2, y: 662.0 },
    { x: 287.9, y: 877.7 },
  ],
  5: [
    // Live screenshot centers measured from the rendered Share Splitter screen.
    { x: 403.3, y: 520.9 },
    { x: 222.5, y: 653.8 },
    { x: 584.2, y: 662.0 },
    { x: 287.9, y: 877.7 },
    { x: 533.0, y: 867.7 },
  ],
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
  if (levelId <= 5) return 'bigger_share';
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
  const mode = shareModeForLevel(levelId);
  const plateCount = MAX_PLATE_COUNT;
  const patternOptions = RATIO_PATTERNS_BY_COUNT[plateCount] || RATIO_PATTERNS_BY_COUNT[2];
  const pattern = [...randomPick(patternOptions)];
  const totalUnits = pattern.reduce((sum, value) => sum + value, 0);
  const unitValue = mode === 'direct_share' ? 1 : mode === 'scaled_share' ? 2 : 3;
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
  const [hoverPlateIndex, setHoverPlateIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [validationActive, setValidationActive] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [locked, setLocked] = useState(false);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const trimmedCakeSliceAsset = useTrimmedImageSource(CAKE_SLICE_ASSET);
  const [viewportRect, setViewportRect] = useState({ width: 0, height: 0 });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const questionCardRef = useRef<HTMLDivElement | null>(null);
  const cakeSourceButtonRef = useRef<HTMLButtonElement | null>(null);
  const [questionDockBottom, setQuestionDockBottom] = useState(0);
  const sliceSeedRef = useRef(0);
  const dragActiveRef = useRef(false);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const firstChallenge = createChallenge(levelId, 0);
    setRoundSolved(0);
    setAttempts(0);
    setXpEarned(0);
    setChallenge(firstChallenge);
    setPlates(createEmptyPlates(firstChallenge.plateCount));
    setRemainingSlices(firstChallenge.totalSlices);
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
    const update = () => {
      setViewportRect({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
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
      const rect = node.getBoundingClientRect();
      setQuestionDockBottom(rect.bottom);
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
  const backgroundScale = Math.max(
    viewportRect.width / SHARE_SPLITTER_BACKGROUND_SIZE.width,
    viewportRect.height / SHARE_SPLITTER_BACKGROUND_SIZE.height,
  );
  const backgroundOffsetX = (viewportRect.width - (SHARE_SPLITTER_BACKGROUND_SIZE.width * backgroundScale)) / 2;
  const backgroundOffsetY = viewportRect.height - (SHARE_SPLITTER_BACKGROUND_SIZE.height * backgroundScale);
  const plateSizePx = SHARE_SPLITTER_PLATE_DIAMETER_PX * backgroundScale;
  const promptText = isPractice
    ? `Target ratio: ${challenge.ratios.join(':')}`
    : `There are ${challenge.totalSlices} slices of brainpower cake.\nThe Monster Mind demands it is shared in a ratio of ${challenge.ratios.join(':')}.`;

  const loadNextChallenge = useCallback((solvedCount: number) => {
    const next = createChallenge(levelId, solvedCount);
    setChallenge(next);
    setPlates(createEmptyPlates(next.plateCount));
    setRemainingSlices(next.totalSlices);
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

  const isPointInsideCakeSource = useCallback((clientX: number, clientY: number) => {
    const center = mapBackgroundPointToViewport(CAKE_SOURCE_POSITION);
    const radius = (CAKE_SOURCE_SIZE_PX * backgroundScale) / 2;
    return Math.hypot(clientX - center.x, clientY - center.y) <= radius;
  }, [backgroundScale, mapBackgroundPointToViewport]);

  useEffect(() => {
    const handleGlobalPointerDown = (event: PointerEvent) => {
      if (locked || remainingSlices <= 0) return;
      if ((event as PointerEvent & { __shareSplitterForwarded?: boolean }).__shareSplitterForwarded) return;

      const point = { x: event.clientX, y: event.clientY };
      if (!isPointInsideCakeSource(point.x, point.y)) return;

      const cakeButton = cakeSourceButtonRef.current;
      if (!cakeButton || typeof PointerEvent === 'undefined') return;

      const forwarded = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: point.x,
        clientY: point.y,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        button: event.button,
        buttons: event.buttons,
      }) as PointerEvent & { __shareSplitterForwarded?: boolean };

      forwarded.__shareSplitterForwarded = true;
      cakeButton.dispatchEvent(forwarded);
      event.preventDefault();
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown, true);
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
  }, [isPointInsideCakeSource, locked, remainingSlices]);

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
    if (locked || remainingSlices <= 0) return;

    setRemainingSlices((previous) => Math.max(0, previous - 1));
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

  const getClientPoint = (evt: PointerEvent | TouchEvent | MouseEvent | React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    const anyEvt = evt as TouchEvent;
    if ('touches' in anyEvt && anyEvt.touches.length > 0) {
      return { x: anyEvt.touches[0].clientX, y: anyEvt.touches[0].clientY };
    }
    if ('changedTouches' in anyEvt && anyEvt.changedTouches.length > 0) {
      return { x: anyEvt.changedTouches[0].clientX, y: anyEvt.changedTouches[0].clientY };
    }
    const pointerEvt = evt as PointerEvent;
    return { x: pointerEvt.clientX || 0, y: pointerEvt.clientY || 0 };
  };

  const handleSourcePointerDown = (event: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (locked || remainingSlices <= 0) return;
    if (dragActiveRef.current || dragSlice) return;
    const sliceId = `${challenge.id}-slice-${sliceSeedRef.current}`;
    sliceSeedRef.current += 1;
    const pointerId = 'pointerId' in event ? event.pointerId : 1;
    dragActiveRef.current = true;

    const updatePosition = (clientX: number, clientY: number) => {
      setDragSlice({
        id: sliceId,
        x: clientX - DRAG_SLICE_SIZE / 2,
        y: clientY - DRAG_SLICE_SIZE / 2,
      });
    };

    const getPlateCenter = (index: number) => {
      const position = platePositions[index];
      if (!position) return null;
      return mapBackgroundPointToViewport(position);
    };

    const getNearestPlate = (clientX: number, clientY: number) => {
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      platePositions.forEach((_, index) => {
        const center = getPlateCenter(index);
        if (!center) return;
        const centerX = center.x;
        const centerY = center.y;
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.hypot(dx, dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      return { index: nearestIndex, distance: nearestDistance };
    };

    const getHitPlateIndex = (clientX: number, clientY: number) => {
      let hitIndex = -1;
      platePositions.forEach((_, index) => {
        const center = getPlateCenter(index);
        if (!center) return;
        const centerX = center.x;
        const centerY = center.y;
        const radius = plateSizePx * 0.5;
        const distance = Math.hypot(clientX - centerX, clientY - centerY);
        if (distance <= radius) {
          hitIndex = index;
        }
      });
      return hitIndex;
    };

    const finishDrag = (clientX: number, clientY: number) => {
      if (!dragActiveRef.current) return;
      dragActiveRef.current = false;
      const { index, distance } = getNearestPlate(clientX, clientY);
      const snapRadius = plateSizePx * 0.56;
      const hitIndex = getHitPlateIndex(clientX, clientY);
      const targetPlateIndex = hitIndex >= 0 ? hitIndex : distance <= snapRadius ? index : -1;

      if (targetPlateIndex >= 0) {
        placeOnPlate(targetPlateIndex, sliceId);
      } else {
        setDragSlice(null);
        setHoverPlateIndex(null);
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseCancel);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const point = getClientPoint(moveEvent);
      updatePosition(point.x, point.y);
        const hitIndex = getHitPlateIndex(point.x, point.y);
        if (hitIndex >= 0) {
          setHoverPlateIndex(hitIndex);
          return;
      }
      const { index, distance } = getNearestPlate(point.x, point.y);
      setHoverPlateIndex(distance <= 62 ? index : null);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      const point = getClientPoint(upEvent);
      finishDrag(point.x, point.y);
    };

    const handleTouchMove = (touchEvent: TouchEvent) => {
      const point = getClientPoint(touchEvent);
      updatePosition(point.x, point.y);
      const hitIndex = getHitPlateIndex(point.x, point.y);
      if (hitIndex >= 0) {
        setHoverPlateIndex(hitIndex);
        return;
      }
      const { index, distance } = getNearestPlate(point.x, point.y);
      setHoverPlateIndex(distance <= 62 ? index : null);
      touchEvent.preventDefault();
    };

    const handleTouchEnd = (touchEvent: TouchEvent) => {
      const point = getClientPoint(touchEvent);
      finishDrag(point.x, point.y);
    };

    const handleMouseMove = (mouseEvent: MouseEvent) => {
      const point = getClientPoint(mouseEvent);
      updatePosition(point.x, point.y);
      const hitIndex = getHitPlateIndex(point.x, point.y);
      if (hitIndex >= 0) {
        setHoverPlateIndex(hitIndex);
        return;
      }
      const { index, distance } = getNearestPlate(point.x, point.y);
      setHoverPlateIndex(distance <= 62 ? index : null);
    };

    const handleMouseUp = (mouseEvent: MouseEvent) => {
      const point = getClientPoint(mouseEvent);
      finishDrag(point.x, point.y);
    };

    const handleMouseCancel = () => {
      dragActiveRef.current = false;
      setDragSlice(null);
      setHoverPlateIndex(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseCancel);
    };

    const handlePointerCancel = () => {
      handleMouseCancel();
    };

    const startPoint = getClientPoint(event);
    updatePosition(startPoint.x, startPoint.y);
    const currentTarget = event.currentTarget as HTMLElement & { setPointerCapture?: (pointerId: number) => void };
    if ('setPointerCapture' in currentTarget && 'pointerId' in event) {
      currentTarget.setPointerCapture?.(pointerId);
    }
    setFeedback('Drop the cake onto the correct plate.');
    setFeedbackTone('neutral');
    setValidationActive(false);
    setHoverPlateIndex(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseCancel);
  };

  const handleSourceAreaPointerDown = (event: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (locked || remainingSlices <= 0) return;
    if (dragActiveRef.current || dragSlice) return;
    const point = getClientPoint(event);
    if (!isPointInsideCakeSource(point.x, point.y)) return;
    handleSourcePointerDown(event);
  };

  const resetAllocation = () => {
    if (locked || moveHistory.length === 0) return;
    setPlates(createEmptyPlates(challenge.plateCount));
    setRemainingSlices(challenge.totalSlices);
    setMoveHistory([]);
    setDragSlice(null);
    setHoverPlateIndex(null);
    setFeedback('');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const checkAllocation = () => {
    if (locked || !hasMoves) return;

    setAttempts((previous) => previous + 1);
    setValidationActive(true);

    if (!allSlicesUsed) {
      setFeedback('😈 “Greed takes over!”');
      setFeedbackTone('bad');
      return;
    }

    if (!allCorrect) {
      setFeedback('😈 “Greed takes over!”');
      setFeedbackTone('bad');
      return;
    }

    const nextSolved = roundSolved + 1;
    const roundXp = BASE_XP_PER_ROUND + (levelId * 20);
    const nextXp = xpEarned + roundXp;

    setLocked(true);
    setRoundSolved(nextSolved);
    setXpEarned(nextXp);
    setFeedback('🍰 “Perfect split!”');
    setFeedbackTone('good');
    setShowCelebrationSplash(true);

    confetti({
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
      backgroundImage={shareSplitterBackground}
      backgroundOpacity={1}
      backgroundPosition="center bottom"
      overlayDisabled
    >
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Share Splitter"
        body="Greedy Monster Minds are having a party.\nDrag the birthday cake to each plate in the ratios shown."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative h-full w-full">
        <div
          ref={questionCardRef}
          className="pointer-events-none fixed left-0 right-0 z-[60]"
          style={{ top: 'calc(env(safe-area-inset-top) + 4px)' }}
        >
          <div className="flex justify-center px-2">
            <GameQuestionCard
              title="Target Ratio"
              className="mx-auto w-full max-w-[28rem]"
              bodyClassName="whitespace-pre-line text-[12px] font-semibold leading-tight text-white"
            >
              {promptText}
            </GameQuestionCard>
          </div>
        </div>

        <div
          className="h-full w-full"
          style={{ paddingTop: `${Math.max(0, questionDockBottom + 20)}px` }}
        >
          <GameScreenLayout
            className="px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-0 text-white"
            main={(
              <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
                <div
                  className="relative min-h-0 overflow-hidden rounded-[1.6rem] px-2 py-3 md:px-3"
                  onPointerDown={handleSourceAreaPointerDown}
                  onMouseDown={handleSourceAreaPointerDown}
                  onTouchStart={handleSourceAreaPointerDown}
                >
                  <div className="pointer-events-none fixed inset-0 z-[20]">
                    <div className="relative h-full w-full">
                      <CelebrationSplash active={showCelebrationSplash} message="Party Time!" theme="party" />
                      {plateViews.map((plate, index) => {
                        const position = platePositions[index] || { x: 0, y: 0 };
                        const center = mapBackgroundPointToViewport(position);
                        const sliceCount = plates[index].length;
                        const sliceBaseSizePx = Math.max(
                          22,
                          plateSizePx * (sliceCount <= 3 ? 0.24 : sliceCount <= 6 ? 0.2 : 0.16),
                        );

                        return (
                          <div
                            key={plate.id}
                            data-testid={`share-splitter-plate-${index + 1}`}
                            className="pointer-events-none absolute relative flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-transparent bg-transparent p-1.5 text-center transition"
                            style={{
                              left: `${center.x}px`,
                              top: `${center.y}px`,
                              width: `${plateSizePx}px`,
                              height: `${plateSizePx}px`,
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 rounded-full bg-cyan-200/18 ring-4 ring-cyan-50/45 shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_0_28px_rgba(34,211,238,0.24)]" />
                            <div className="pointer-events-none absolute inset-0">
                              {plates[index].map((sliceId, sliceIndex) => {
                                const placement = getPlateSlicePlacement(sliceIndex);
                                return (
                                  <motion.img
                                    key={sliceId}
                                    data-testid={`share-splitter-plate-${index + 1}-slice-${sliceIndex + 1}`}
                                    src={trimmedCakeSliceAsset}
                                    alt=""
                                    draggable={false}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.16, ease: 'easeOut' }}
                                    className="absolute left-1/2 top-1/2 object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.22)]"
                                    style={{
                                      width: `${sliceBaseSizePx}px`,
                                      height: `${sliceBaseSizePx}px`,
                                      transform: `translate(-50%, -50%) translate(${placement.x * plateSizePx}px, ${placement.y * plateSizePx}px)`,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    ref={cakeSourceButtonRef}
                    type="button"
                    onPointerDown={handleSourcePointerDown}
                    onMouseDown={handleSourcePointerDown}
                    onTouchStart={handleSourcePointerDown}
                    disabled={locked || remainingSlices <= 0}
                    className="pointer-events-auto fixed z-[30] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/65 bg-[linear-gradient(180deg,rgba(255,244,191,0.24),rgba(180,83,9,0.14))] p-3 shadow-[0_12px_24px_rgba(180,83,9,0.2)] touch-none"
                    style={{
                      left: `${mapBackgroundPointToViewport(CAKE_SOURCE_POSITION).x}px`,
                      top: `${mapBackgroundPointToViewport(CAKE_SOURCE_POSITION).y}px`,
                      width: `${CAKE_SOURCE_SIZE_PX * backgroundScale}px`,
                      height: `${CAKE_SOURCE_SIZE_PX * backgroundScale}px`,
                    }}
                    aria-label={remainingSlices > 0 ? 'Drag a slice from the cake' : 'No cake slices left'}
                  >
                    <img
                      src={trimmedCakeSliceAsset}
                      alt=""
                      className="pointer-events-none h-full w-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.24)]"
                      draggable={false}
                    />
                  </button>
                </div>

                <section className="shrink-0 min-h-[1px]" aria-hidden />
              </div>
            )}
            bottom={(
              <div className="flex flex-col gap-2">
                <section className="min-h-[2.6rem]">
                  {feedback.trim().length > 0 ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${feedback}-${feedbackTone}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                      >
                        <FeedbackStrip
                          tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}
                          className="whitespace-pre-line"
                        >
                          {feedback}
                        </FeedbackStrip>
                      </motion.div>
                    </AnimatePresence>
                  ) : null}
                </section>

                <section className="grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={resetAllocation} disabled={locked || moveHistory.length === 0}>
                    <RefreshCcw className="h-4 w-4" />
                    Reset
                  </SecondaryButton>
                  <PrimaryButton onClick={checkAllocation} disabled={locked || !hasMoves}>
                    <Check className="h-4 w-4" />
                    Check
                  </PrimaryButton>
                </section>
              </div>
            )}
            overlay={(
              <AnimatePresence>
                {dragSlice ? (
                  <motion.div
                    key={dragSlice.id}
                    initial={{ scale: 0.92, opacity: 0.9 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.86 }}
                    transition={{ duration: 0.08, ease: 'linear' }}
                    className="pointer-events-none fixed z-[60] h-16 w-16 rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.3),rgba(180,83,9,0.2))] p-1 shadow-[0_14px_24px_rgba(217,119,6,0.35)]"
                    style={{ left: dragSlice.x, top: dragSlice.y }}
                  >
                    <img
                      src={trimmedCakeSliceAsset}
                      alt=""
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            )}
          />
        </div>
      </div>
    </GameUiShell>
  );
};

export default ShareSplitterGame;
