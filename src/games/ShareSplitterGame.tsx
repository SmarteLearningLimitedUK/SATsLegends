import { playGameSound } from '../audio/gameAudio';
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
import shareSplitterBackground from '../assets/share-splitter/party-background-v1.webp';
import shareSplitterPlate from '../assets/maps/backgroundsforgames/platesharesplit.png';
import cakeSliceAsset from '../assets/share-splitter/strawberry-cake-v1.webp';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import CelebrationSplash from '../components/CelebrationSplash';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { useTrimmedImageSource } from '../utils/trimTransparentImage';
import './share-splitter.css';
import SharePartyTable from './SharePartyTable';

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
const SHARE_SPLITTER_PLATE_ICON_SCALE = 1;
const PARTY_PLATE_POSITIONS = [
  { x: .12, y: .43 }, { x: .31, y: .35 }, { x: .5, y: .32 },
  { x: .69, y: .35 }, { x: .88, y: .43 },
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
    [[1, 1, 1, 1, 1], [1, 1, 1, 1, 2], [1, 1, 2, 1, 1], [2, 1, 1, 1, 1], [1, 2, 1, 1, 1]],
    [[1, 1, 1, 1, 2], [1, 1, 1, 2, 2], [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [1, 2, 2, 1, 1]],
    [[1, 1, 2, 2, 3], [1, 2, 1, 2, 3], [2, 1, 3, 1, 2], [3, 2, 1, 2, 1], [1, 3, 2, 1, 2]],
    [[1, 2, 2, 3, 3], [2, 1, 2, 3, 3], [3, 2, 1, 3, 2], [2, 3, 3, 1, 2], [3, 1, 2, 2, 3]],
    [[2, 1, 2, 3, 4], [1, 2, 3, 2, 4], [4, 2, 1, 3, 2], [3, 4, 2, 1, 2], [2, 3, 4, 2, 1]],
  ];
  const patternOptions = tierPatterns[tier - 1];
  const pattern = [...patternOptions[solved % patternOptions.length]];
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
  sessionState,
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
  const isWideShareLayout = viewportRect.width >= 700;
  const narrowTable = !isWideShareLayout;
  const tableWidth = Math.min(1440, Math.max(1, viewportRect.width - (narrowTable ? 8 : 24)));
  const guestHeight = Math.min(270, tableWidth * (narrowTable ? .27 : .22));
  const roomTop = questionDockBottom + guestHeight * .82 + (narrowTable ? 12 : 10);
  const roomBottom = viewportRect.height - (narrowTable ? 124 : 118);
  const tableHeight = Math.min(tableWidth * (narrowTable ? .88 : .40), Math.max(180, roomBottom - roomTop));
  const tableLeft = (viewportRect.width - tableWidth) / 2;
  const tableTop = Math.max(roomTop, roomBottom - tableHeight);
  const tableRect = { left: tableLeft, top: tableTop, width: tableWidth, height: tableHeight };
  const plateSizePx = Math.min(230, Math.max(64, Math.min(tableWidth * (narrowTable ? .25 : .165), tableHeight * (narrowTable ? .37 : .58))));
  const platePositions = narrowTable
    ? [{ x: .2, y: .27 }, { x: .5, y: .22 }, { x: .8, y: .27 }, { x: .32, y: .55 }, { x: .68, y: .55 }]
    : PARTY_PLATE_POSITIONS;
  const cakeSourceCenter = { x: tableLeft + tableWidth * .5, y: tableTop + tableHeight * (narrowTable ? .82 : .78) };
  const cakeSourceWidth = Math.min(380, tableWidth * (narrowTable ? .66 : .32));
  const cakeSourceHeight = Math.min(100, Math.max(62, tableHeight * .24));
  const equalShares = challenge.ratios.every(value => value === challenge.ratios[0]);
  const promptText = equalShares
    ? `Share ${challenge.totalSlices} cakes equally between ${challenge.plateCount} guests.`
    : `Share ${challenge.totalSlices} cakes between ${challenge.plateCount} guests.`;

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

  const getPlateSlicePlacement = useCallback((index: number, count: number): SlicePlacement => {
    // Cakes occupy a readable grid on the ceramic surface, never a hidden stack.
    const columns = count <= 2 ? count : count <= 6 ? 3 : 4;
    const rows = Math.ceil(count / columns);
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    return {
      x: (index % columns - (inRow - 1) / 2) * (count <= 2 ? .32 : .21),
      y: (row - (rows - 1) / 2) * .19 - .03,
    };
  }, []);

  const placeOnPlate = (plateIndex: number, sliceId: string) => {
    if (locked || remainingSlicesRef.current <= 0) return;

    playGameSound('place');
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
        setFeedback('Drop the cake onto a plate.');
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
    setFeedback('Choose a plate to add a cake. Keep choosing plates to share the rest.');
    setFeedbackTone('neutral');
    if (event.detail === 0) plateRefs.current[0]?.focus();
  };

  const choosePlate = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (locked || remainingSlicesRef.current <= 0) return;
    if (event.detail > 0 && Date.now() < ignoreNativeClickUntilRef.current) return;
    if (!sourceSelected) {
      setFeedback('Choose the tray first, then a plate. You can also drag a cake.');
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
      setFeedback(!allSlicesUsed ? 'Share every cake, then check the ratio again.' : 'The parts need a different split. Reset and try again.');
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
      className={`share-splitter-shell ${sessionState?.paused ? 'share-party-paused' : ''}`}
      overlayDisabled
    >
      <div className="share-party-backdrop" aria-hidden="true"><img src={shareSplitterBackground} alt="" draggable={false} data-game-scene-image data-background-fit="cover" /></div>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Share Splitter"
        body="Share the cakes between the guests. Drag a cake to a plate, or choose the tray and then a plate. Match the ratio from left to right."
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
            title="Share Splitter"
            context=""
            style={{ position: 'relative', top: 0, transform: 'none', width: '100%', padding: '10px 12px' }}
          >
            <span className="share-party-prompt">{promptText}</span>
            <span className="share-party-ratio" data-share-ratio-prompt>Ratio {challenge.ratios.join(' : ')}</span>
          </GameQuestionCard>
        </div>

        <SharePartyTable rect={tableRect} positions={platePositions} counts={plates.map(p => p.length)} celebrating={locked} guestHeight={guestHeight} />
        <div className="share-splitter-pieces" data-share-pieces>
          <CelebrationSplash active={showCelebrationSplash && !reducedMotion} message="Party Time!" theme="party" />
          {plateViews.map((plate, index) => {
            const position = platePositions[index] || { x: 0, y: 0 };
            const center = { x: tableLeft + position.x * tableWidth, y: tableTop + position.y * tableHeight };
            const sliceCount = plates[index].length;
            const sliceBaseSizePx = Math.max(16, plateSizePx * (sliceCount <= 2 ? .38 : sliceCount <= 6 ? .27 : .215));
            return (
              <button
                key={plate.id}
                type="button"
                ref={(node) => { plateRefs.current[index] = node; }}
                data-testid={`share-splitter-plate-${index + 1}`}
                data-share-plate-index={index}
                data-share-ratio={plate.assignedRatioValue}
                data-slice-count={sliceCount}
                data-button-skin="none"
                data-selected={sourceSelected || hoverPlateIndex === index}
                onClick={(event) => choosePlate(index, event)}
                disabled={locked || remainingSlices <= 0}
                aria-label={`Plate ${index + 1}, ${plate.assignedRatioValue} ${plate.assignedRatioValue === 1 ? 'part' : 'parts'}, ${sliceCount} cakes`}
                className="share-splitter-plate"
                style={{ left: center.x, top: center.y, width: plateSizePx, height: plateSizePx * .76 }}
              >
                <img
                  src={shareSplitterPlate}
                  alt=""
                  draggable={false}
                  className="share-splitter-plate-image"
                  style={{ transform: `scale(${SHARE_SPLITTER_PLATE_ICON_SCALE})` }}
                />
                {plates[index].map((sliceId, sliceIndex) => {
                  const placement = getPlateSlicePlacement(sliceIndex, sliceCount);
                  return (
                    <motion.img
                      initial={reducedMotion ? false : { opacity: 0, scale: .4, x: placement.x * plateSizePx - sliceBaseSizePx / 2, y: placement.y * plateSizePx - sliceBaseSizePx / 2 - 20 }}
                      animate={{ opacity: 1, scale: 1, x: placement.x * plateSizePx - sliceBaseSizePx / 2, y: placement.y * plateSizePx - sliceBaseSizePx / 2, rotate: 0 }}
                      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 22 }}
                      key={sliceId}
                      src={trimmedCakeSliceAsset}
                      alt=""
                      draggable={false}
                      className="share-splitter-plated-slice"
                      style={{
                        width: sliceBaseSizePx,
                        height: sliceBaseSizePx,
                      }}
                    />
                  );
                })}
                <span className="share-splitter-plate-count" data-filled={sliceCount > 0}>{sliceCount}</span>
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
            style={{ left: cakeSourceCenter.x, top: cakeSourceCenter.y, width: cakeSourceWidth, height: cakeSourceHeight }}
            aria-label={remainingSlices > 0 ? 'Choose the cake tray, then a plate, or drag a cake' : 'No cakes left'}
            aria-pressed={sourceSelected}
          >
            <span className="share-party-tray-label">Cakes left</span>
            <strong className="share-party-tray-count" aria-live="polite">{remainingSlices}</strong>
            {remainingSlices > 0 ? <img src={trimmedCakeSliceAsset} alt="" draggable={false} /> : null}
          </button>
        </div>

        <div className="share-splitter-actions answer-choice-surface" data-share-actions>
          <p className="share-party-instruction">{sourceSelected ? 'Choose a plate to serve a cake' : 'Drag a cake, or choose the tray then a plate'}</p>
          <div className="share-splitter-feedback" data-tone={feedbackTone} role="status" aria-live="polite">
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
