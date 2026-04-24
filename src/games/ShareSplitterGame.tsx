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
import shareSplitterBackground from '../assets/maps/backgroundsforgames/sharespitbackground.png';
import birthdayCakeAsset from '../assets/maps/backgroundsforgames/birthdaycake.png';
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

const MAX_PLATE_COUNT = 4;
const ROUNDS_TO_WIN = 5;
const BASE_XP_PER_ROUND = 120;
const BIRTHDAY_CAKE_ASSET = birthdayCakeAsset;
const CAKE_SLICE_ASSET = cakeSliceAsset;
const DRAG_SLICE_SIZE = 64;
const SHARE_SPLITTER_BACKGROUND_SIZE = { width: 2500, height: 5000 };
const SHARE_SPLITTER_PLATE_DIAMETER_PX = 600;
const CAKE_SOURCE_POSITION = { x: 1250, y: 3750 };
const CAKE_SOURCE_SIZE_PX = 660;
const SHARE_SPLITTER_PLATE_ICON_SCALE = 1.06;
const SHARE_SPLITTER_TABLE_PLATE_POSITIONS = [
  { x: 980, y: 3600 },
  { x: 1520, y: 3600 },
  { x: 760, y: 4080 },
  { x: 1250, y: 4080 },
  { x: 1740, y: 4080 },
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
    [5, 3, 3, 3, 1],
  ],
};

const PLATE_POSITIONS_BY_COUNT: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[2],
  ],
  3: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[0],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[2],
  ],
  4: [
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[0],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[1],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[2],
    SHARE_SPLITTER_TABLE_PLATE_POSITIONS[3],
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
  if (levelId <= 5) return 'bigger_share';
  return 'exam_share';
};

const plateCountForMode = (mode: ShareChallenge['mode']) => {
  void mode;
  return MAX_PLATE_COUNT;
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
  const plateCount = plateCountForMode(mode);
  const patternOptions = RATIO_PATTERNS_BY_COUNT[plateCount] || RATIO_PATTERNS_BY_COUNT[2];
  const pattern = [...randomPick(patternOptions)];
  const totalUnits = pattern.reduce((sum, value) => sum + value, 0);
  const unitValue = mode === 'direct_share' ? 1 : mode === 'scaled_share' ? 2 : 3;
  const totalSlices = totalUnits * unitValue;
  const targetCounts = pattern.map((value) => value * unitValue);

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
  const [viewportRect, setViewportRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [dockTop, setDockTop] = useState<number | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const playfieldRootRef = useRef<HTMLDivElement | null>(null);
  const cakeSourceButtonRef = useRef<HTMLButtonElement | null>(null);
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
    const getMeasurementNode = () => (
      playfieldRootRef.current
      ?? document.querySelector<HTMLElement>('[data-gameplay-content-viewport="true"]')
      ?? document.documentElement
    );

    const update = () => {
      const measurementNode = getMeasurementNode();
      const rect = measurementNode.getBoundingClientRect();
      const localWidth = measurementNode.clientWidth || rect.width;
      const localHeight = measurementNode.clientHeight || rect.height;
      const scaleY = localHeight > 0 ? rect.height / localHeight : 1;
      setViewportRect(rect
        ? {
          left: 0,
          top: 0,
          width: localWidth,
          height: localHeight,
        }
        : {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      const dockRects = Array.from(document.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="Back"], button[aria-label="Mute audio"], button[aria-label="Unmute audio"]',
      ))
        .map((button) => button.getBoundingClientRect())
        .filter((dockRect) => dockRect.width > 0 && dockRect.height > 0);
      setDockTop(dockRects.length > 0
        ? (Math.min(...dockRects.map((dockRect) => dockRect.top)) - rect.top) / Math.max(0.001, scaleY)
        : null);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(getMeasurementNode());
    const settleFrame = window.requestAnimationFrame(update);
    const settleTimeout = window.setTimeout(update, 250);
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(settleFrame);
      window.clearTimeout(settleTimeout);
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
  const isCompactViewport = viewportRect.width < 520;
  const plateLayoutScale = isCompactViewport ? 0.68 : 1;
  const cakeSourceLayoutScale = isCompactViewport ? 0.76 : 1;
  const backgroundScale = Math.min(
    viewportRect.width / SHARE_SPLITTER_BACKGROUND_SIZE.width,
    viewportRect.height / SHARE_SPLITTER_BACKGROUND_SIZE.height,
  );
  const backgroundOffsetX = (viewportRect.width - (SHARE_SPLITTER_BACKGROUND_SIZE.width * backgroundScale)) / 2;
  const backgroundOffsetY = viewportRect.height - (SHARE_SPLITTER_BACKGROUND_SIZE.height * backgroundScale);
  const plateSizePx = Math.max(
    isCompactViewport ? 68 : 78,
    Math.min(
      isCompactViewport ? 78 : 104,
      ((viewportRect.width - (isCompactViewport ? 44 : 64)) / MAX_PLATE_COUNT) * plateLayoutScale,
    ),
  );
  const platePositions = useMemo(() => {
    const sidePadding = isCompactViewport ? 54 : 42;
    const usableWidth = Math.max(1, viewportRect.width - sidePadding * 2);
    const y = Math.max(
      isCompactViewport ? 158 : plateSizePx * 0.5,
      (viewportRect.height * (isCompactViewport ? 0.17 : 0.28)) - 30,
    ) + 20;

    return Array.from({ length: MAX_PLATE_COUNT }, (_, index) => ({
      x: sidePadding + (usableWidth * (index / Math.max(1, MAX_PLATE_COUNT - 1))),
      y,
    }));
  }, [isCompactViewport, plateSizePx, viewportRect.height, viewportRect.width]);
  const promptText = isPractice
    ? `Quick! share the cake to avoid a riot!\nTarget ratio: ${challenge.ratios.join(':')}`
    : `Quick! share the cake to avoid a riot!\nThere are ${challenge.totalSlices} slices of brainpower cake.\nThe Monster Mind demands it is shared in a ratio of ${challenge.ratios.join(':')}.`;

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
    x: viewportRect.left + backgroundOffsetX + (point.x * backgroundScale),
    y: viewportRect.top + backgroundOffsetY + (point.y * backgroundScale),
  }), [backgroundOffsetX, backgroundOffsetY, backgroundScale, viewportRect.left, viewportRect.top]);
  const cakeSourceCenter = mapBackgroundPointToViewport(CAKE_SOURCE_POSITION);
  const cakeSourceButtonSizePx = CAKE_SOURCE_SIZE_PX * backgroundScale * cakeSourceLayoutScale;
  const fallbackDockSafeBottom = typeof window !== 'undefined'
    ? window.innerHeight - Math.max(96, window.innerHeight * 0.12)
    : viewportRect.top + viewportRect.height - 8;
  const cakeSourceSafeBottom = Math.min(
    viewportRect.top + viewportRect.height - 8,
    dockTop !== null ? dockTop - 8 : fallbackDockSafeBottom,
  );
  const cakeSourceY = Math.min(
    cakeSourceCenter.y,
    cakeSourceSafeBottom - (cakeSourceButtonSizePx / 2),
  );
  const cakeVisualScale = isCompactViewport ? 1.9 : 1.55;
  const cakeVisualSizePx = cakeSourceButtonSizePx * cakeVisualScale;
  const cakeVisualY = cakeSourceY - (isCompactViewport ? 71 : 57);

  const getCakeSourceHitRect = useCallback(() => {
    const cakeButton = cakeSourceButtonRef.current;
    if (!cakeButton) return null;
    return cakeButton.getBoundingClientRect();
  }, []);

  const isPointInsideCakeSource = useCallback((clientX: number, clientY: number) => {
    const rect = getCakeSourceHitRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, [getCakeSourceHitRect]);

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
    const dragRevealThresholdPx = 6;
    let dragOriginX = 0;
    let dragOriginY = 0;
    let dragHasBeenRevealed = false;

    const updatePosition = (clientX: number, clientY: number) => {
      const layerRect = playfieldRootRef.current?.getBoundingClientRect();
      setDragSlice({
        id: sliceId,
        x: clientX - (layerRect?.left ?? 0) - DRAG_SLICE_SIZE / 2,
        y: clientY - (layerRect?.top ?? 0) - DRAG_SLICE_SIZE / 2,
      });
    };

    const revealDragSlice = (clientX: number, clientY: number) => {
      if (dragHasBeenRevealed) return;
      dragHasBeenRevealed = true;
      updatePosition(clientX, clientY);
      setFeedbackTone('neutral');
      setValidationActive(false);
      setHoverPlateIndex(null);
    };

    const getPlateCenter = (index: number) => {
      const position = platePositions[index];
      if (!position) return null;
      return position;
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
      if (!dragHasBeenRevealed) {
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
        return;
      }
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
      if (!dragHasBeenRevealed) {
        const distanceFromOrigin = Math.hypot(point.x - dragOriginX, point.y - dragOriginY);
        if (distanceFromOrigin >= dragRevealThresholdPx) {
          revealDragSlice(point.x, point.y);
        } else {
          return;
        }
      }
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
      if (!dragHasBeenRevealed) {
        const distanceFromOrigin = Math.hypot(point.x - dragOriginX, point.y - dragOriginY);
        if (distanceFromOrigin >= dragRevealThresholdPx) {
          revealDragSlice(point.x, point.y);
        } else {
          return;
        }
      }
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
      if (!dragHasBeenRevealed) {
        const distanceFromOrigin = Math.hypot(point.x - dragOriginX, point.y - dragOriginY);
        if (distanceFromOrigin >= dragRevealThresholdPx) {
          revealDragSlice(point.x, point.y);
        } else {
          return;
        }
      }
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
    dragOriginX = startPoint.x;
    dragOriginY = startPoint.y;
    const currentTarget = event.currentTarget as HTMLElement & { setPointerCapture?: (pointerId: number) => void };
    if ('setPointerCapture' in currentTarget && 'pointerId' in event) {
      currentTarget.setPointerCapture?.(pointerId);
    }

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
        body="The Monster Minds have started a greedy cake party.\nDrag the cake to each plate in the ratios shown.\nKeep the parts in the correct proportion."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />

      <div ref={playfieldRootRef} className="relative h-full w-full" data-share-splitter-root="true">
        <div
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
          style={{ paddingTop: isCompactViewport ? '8.8rem' : '9.8rem' }}
        >
          <GameScreenLayout
            className={`px-3 pb-[calc(env(safe-area-inset-bottom)+${isCompactViewport ? '0.35rem' : '0.6rem'})] pt-0 text-white`}
            main={(
              <div className={`mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] ${isCompactViewport ? 'gap-1' : 'gap-2'}`}>
                <div
                  className={`relative min-h-0 overflow-hidden rounded-[1.6rem] ${isCompactViewport ? 'px-2 py-2' : 'px-2 py-3 md:px-3'}`}
                  onPointerDown={handleSourceAreaPointerDown}
                  onMouseDown={handleSourceAreaPointerDown}
                  onTouchStart={handleSourceAreaPointerDown}
                >
                  <div className="pointer-events-none fixed inset-0 z-[80]">
                    <div className="relative h-full w-full">
                      <CelebrationSplash active={showCelebrationSplash} message="Party Time!" theme="party" />
                      {plateViews.map((plate, index) => {
                        const position = platePositions[index] || { x: 0, y: 0 };
                        const center = position;
                        const sliceCount = plates[index].length;
                        const sliceBaseSizePx = Math.max(
                          22,
                          plateSizePx * (sliceCount <= 3 ? 0.24 : sliceCount <= 6 ? 0.2 : 0.16),
                        );

                        return (
                          <div
                            key={plate.id}
                            data-testid={`share-splitter-plate-${index + 1}`}
                            className="pointer-events-none fixed z-[90] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center p-0 text-center transition"
                            style={{
                              left: `${center.x}px`,
                              top: `${center.y}px`,
                              width: `${plateSizePx}px`,
                              height: `${plateSizePx}px`,
                            }}
                          >
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-[4%] rounded-full border border-white/90 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,1),rgba(255,255,255,0.98)_34%,rgba(248,250,252,0.96)_58%,rgba(226,232,240,0.92)_100%)] shadow-[0_14px_26px_rgba(15,23,42,0.22),inset_0_2px_4px_rgba(255,255,255,0.98),inset_0_-8px_16px_rgba(148,163,184,0.28)]"
                            />
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-[9%] rounded-full border border-slate-200/90 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
                            />
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

                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none fixed z-[24] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    initial={{ opacity: 0.46, scale: 0.96 }}
                    animate={{ opacity: [0.5, 0.96, 0.5], scale: [0.96, 1.18, 0.96] }}
                    transition={{ duration: 1.45, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                    style={{
                      left: `${cakeSourceCenter.x}px`,
                      top: `${cakeVisualY}px`,
                      width: `${cakeVisualSizePx * 1.26}px`,
                      height: `${cakeVisualSizePx * 1.26}px`,
                      background: 'radial-gradient(circle, rgba(255,255,222,0.68) 0%, rgba(255,218,86,0.44) 34%, rgba(251,146,60,0.24) 58%, rgba(0,0,0,0) 78%)',
                      boxShadow: '0 0 38px rgba(255,244,168,0.66), 0 0 86px rgba(250,204,21,0.5), 0 0 128px rgba(251,146,60,0.34)',
                      filter: 'blur(1.5px)',
                      mixBlendMode: 'screen',
                    }}
                  />

                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none fixed z-[27] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-200/80"
                    initial={{ opacity: 0.72, scale: 0.92 }}
                    animate={{ opacity: [0.78, 0.18, 0.78], scale: [0.9, 1.12, 0.9] }}
                    transition={{ duration: 1.45, repeat: Number.POSITIVE_INFINITY, ease: 'easeOut' }}
                    style={{
                      left: `${cakeSourceCenter.x}px`,
                      top: `${cakeVisualY}px`,
                      width: `${cakeVisualSizePx * 0.84}px`,
                      height: `${cakeVisualSizePx * 0.84}px`,
                      boxShadow: '0 0 18px rgba(255,255,210,0.9), 0 0 36px rgba(250,204,21,0.72), inset 0 0 18px rgba(255,255,210,0.36)',
                    }}
                  />

                  <motion.img
                    aria-hidden="true"
                    src={BIRTHDAY_CAKE_ASSET}
                    alt=""
                    draggable={false}
                    className="pointer-events-none fixed z-[28] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_18px_24px_rgba(29,16,8,0.32)]"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{
                      left: `${cakeSourceCenter.x}px`,
                      top: `${cakeVisualY}px`,
                      width: `${cakeVisualSizePx}px`,
                      height: `${cakeVisualSizePx}px`,
                    }}
                  />

                  <motion.div
                    aria-live="polite"
                    className="pointer-events-none fixed z-[29] -translate-y-1/2 rounded-xl border border-amber-100/80 bg-slate-950/82 px-3 py-2 text-center shadow-[0_10px_18px_rgba(15,23,42,0.32)] backdrop-blur-sm"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{
                      left: `${cakeSourceCenter.x + (cakeVisualSizePx * 0.34)}px`,
                      top: `${cakeVisualY - (cakeVisualSizePx * 0.25)}px`,
                      width: `${Math.max(72, cakeVisualSizePx * 0.46)}px`,
                    }}
                  >
                    <div className="text-[9px] font-black uppercase leading-none tracking-[0.08em] text-amber-200">
                      Slices
                    </div>
                    <div className="mt-1 text-lg font-black leading-none text-white">
                      {remainingSlices}/{challenge.totalSlices}
                    </div>
                  </motion.div>

                  <button
                    ref={cakeSourceButtonRef}
                    type="button"
                    onPointerDown={handleSourcePointerDown}
                    onMouseDown={handleSourcePointerDown}
                    onTouchStart={handleSourcePointerDown}
                    disabled={locked || remainingSlices <= 0}
                    className="pointer-events-auto fixed z-[30] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent p-0 touch-none"
                    style={{
                      left: `${cakeSourceCenter.x}px`,
                      top: `${cakeVisualY}px`,
                      width: `${cakeVisualSizePx}px`,
                      height: `${cakeVisualSizePx}px`,
                    }}
                    aria-label={remainingSlices > 0 ? 'Drag a slice from the cake' : 'No cake slices left'}
                  />
                </div>

                <section className="shrink-0 min-h-[1px]" aria-hidden />
              </div>
            )}
            bottom={(
              <div className={`flex flex-col ${isCompactViewport ? 'gap-1.5' : 'gap-2'}`}>
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

                <section className={`grid grid-cols-2 ${isCompactViewport ? 'gap-1.5' : 'gap-2'}`}>
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
