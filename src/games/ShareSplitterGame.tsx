import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw } from 'lucide-react';
import {
  FeedbackStrip,
  GameUiShell,
  GameTopBar,
  PrimaryButton,
  SecondaryButton,
} from '../components/game-ui/GameUiKit';
import GameScreenLayout from '../components/game-ui/GameScreenLayout';
import shareSplitterBackground from '../assets/maps/sharesplitterfinal.png';
import cakeSliceAsset from '../assets/cakeslice.png';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import CelebrationSplash from '../components/CelebrationSplash';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';

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

const MAX_PLATE_COUNT = 5;
const ROUNDS_TO_WIN = 5;
const BASE_XP_PER_ROUND = 120;
const CAKE_SLICE_ASSET = cakeSliceAsset;
const PLATE_POSITIONS: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 26.8, y: 61.0 },
    { x: 77.7, y: 61.5 },
  ],
  3: [
    { x: 51.2, y: 46.0 },
    { x: 26.8, y: 61.0 },
    { x: 77.7, y: 61.5 },
  ],
  4: [
    { x: 51.2, y: 46.0 },
    { x: 26.8, y: 61.0 },
    { x: 77.7, y: 61.5 },
    { x: 53.4, y: 71.3 },
  ],
  5: [
    { x: 50.0, y: 40.8 },
    { x: 26.2, y: 61.4 },
    { x: 73.8, y: 61.6 },
    { x: 35.0, y: 83.8 },
    { x: 65.0, y: 84.0 },
  ],
};
const DRAG_SLICE_SIZE = 48;

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
  if (levelId <= 5) return 'bigger_share';
  return 'exam_share';
};

const buildSharePrompt = () => {
  return [
    'The Monster Minds are fighting over a brainpower cake.',
    '',
    'Only the correct ratio will stop them from turning on each other and you.',
    '',
    'Example Question',
    '',
    'There are 12 slices of brainpower cake.',
    'The Monster Minds demand it is shared in a ratio of 2:1.',
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
  onVictory,
  onGameOver: _onGameOver,
  onBack,
  sessionState,
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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showCelebrationSplash, setShowCelebrationSplash] = useState(false);
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const plateRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
  const platePositions = PLATE_POSITIONS[challenge.plateCount] || PLATE_POSITIONS[4];
  const plateSize = 'calc(var(--game-stage-width, 390px) * 0.19)';
  const promptText = isPractice
    ? challenge.prompt
    : `There are ${challenge.totalSlices} slices of brainpower cake.\nThe Monster Minds demand it is shared in a ratio of ${challenge.ratios.join(':')}.`;

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

  const getClientPoint = (evt: PointerEvent | TouchEvent | React.PointerEvent) => {
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

  const handleSourcePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || remainingSlices <= 0) return;
    if (dragActiveRef.current || dragSlice) return;
    const sliceId = `${challenge.id}-slice-${sliceSeedRef.current}`;
    sliceSeedRef.current += 1;
    const pointerId = event.pointerId;
    dragActiveRef.current = true;

    const updatePosition = (clientX: number, clientY: number) => {
      setDragSlice({
        id: sliceId,
        x: clientX - DRAG_SLICE_SIZE / 2,
        y: clientY - DRAG_SLICE_SIZE / 2,
      });
    };

    const getNearestPlate = (clientX: number, clientY: number) => {
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      plateRefs.current.forEach((plate, index) => {
        if (!plate) return;
        const rect = plate.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
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
      const padding = 16;
      let hitIndex = -1;
      plateRefs.current.forEach((plate, index) => {
        if (!plate) return;
        const rect = plate.getBoundingClientRect();
        const withinX = clientX >= rect.left - padding && clientX <= rect.right + padding;
        const withinY = clientY >= rect.top - padding && clientY <= rect.bottom + padding;
        if (withinX && withinY) {
          hitIndex = index;
        }
      });
      return hitIndex;
    };

    const finishDrag = (clientX: number, clientY: number) => {
      if (!dragActiveRef.current) return;
      dragActiveRef.current = false;
      const { index, distance } = getNearestPlate(clientX, clientY);
      const snapRadius = 64;
      const hitIndex = getHitPlateIndex(clientX, clientY);
      const targetPlateIndex = hitIndex >= 0 ? hitIndex : distance <= snapRadius ? index : -1;

      if (targetPlateIndex >= 0) {
        placeOnPlate(targetPlateIndex, sliceId);
      } else {
        setDragSlice(null);
        setHoverPlateIndex(null);
        setFeedback('Drag the cake onto one of the plates.');
        setFeedbackTone('neutral');
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
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
      setHoverPlateIndex(distance <= 84 ? index : null);
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
      setHoverPlateIndex(distance <= 84 ? index : null);
      touchEvent.preventDefault();
    };

    const handleTouchEnd = (touchEvent: TouchEvent) => {
      const point = getClientPoint(touchEvent);
      finishDrag(point.x, point.y);
    };

    const handlePointerCancel = () => {
      dragActiveRef.current = false;
      setDragSlice(null);
      setHoverPlateIndex(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };

    const startPoint = getClientPoint(event);
    updatePosition(startPoint.x, startPoint.y);
    event.currentTarget.setPointerCapture(pointerId);
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
    <GameUiShell backgroundImage={shareSplitterBackground} backgroundOpacity={1} overlayDisabled>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Share Splitter"
        body="Share the cake to match the ratio.\nDrag slices to the plates until the split is correct."
        onAction={() => setShowPracticeIntro(false)}
      />

      <div className="relative h-full w-full">
        <GameScreenLayout
          className="px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] pt-2 text-white"
          top={(
            <div className="flex flex-col gap-2">
              <GameTopBar
                onBack={onBack}
                progressLabel={`Round ${roundSolved + 1} / ${ROUNDS_TO_WIN}`}
                lives={sessionState?.lives}
                className="mx-auto w-full"
                audioEnabled={audioEnabled}
                onToggleAudio={() => setAudioEnabled((previous) => !previous)}
              />
            </div>
          )}
          main={(
            <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
              <div className="relative min-h-0 overflow-hidden rounded-[1.6rem] px-2 py-3 md:px-3">
                <div className="pointer-events-none absolute inset-0 z-[20]">
          <div className="relative h-full w-full">
            <CelebrationSplash active={showCelebrationSplash} message="Party Time!" theme="party" />
            {plateViews.map((plate, index) => {
              const plateTone = validationActive
                ? plate.isCorrect
                          ? 'border-emerald-300/35 bg-[linear-gradient(180deg,rgba(226,252,243,0.16),rgba(186,247,231,0.08))]'
                          : 'border-amber-200/35 bg-[linear-gradient(180deg,rgba(255,243,205,0.16),rgba(255,232,176,0.08))]'
                        : hoverPlateIndex === index
                          ? 'border-cyan-200/55 bg-[linear-gradient(180deg,rgba(240,249,255,0.12),rgba(214,241,255,0.06))]'
                          : dragSlice
                            ? 'border-cyan-200/35 bg-[linear-gradient(180deg,rgba(244,250,255,0.08),rgba(216,236,250,0.04))]'
                            : 'border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(224,233,243,0.03))]';
                      const position = platePositions[index] || { x: 50, y: 50 };

                      return (
                        <button
                          key={plate.id}
                          type="button"
                          ref={(node) => {
                            plateRefs.current[index] = node;
                          }}
                          disabled={locked}
                          className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border p-2 text-center shadow-[0_8px_14px_rgba(2,6,23,0.14)] transition ${plateTone} ${hoverPlateIndex === index ? 'scale-[1.03]' : dragSlice && !locked ? 'scale-[1.01]' : ''}`}
                          style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,
                            width: plateSize,
                            height: plateSize,
                          }}
                          aria-label={`Plate ${index + 1}. ${plate.currentCakeCount} of ${plate.targetCakeCount} cakes placed.`}
                        >
                          <div className="grid h-full w-full grid-cols-3 place-items-center gap-0.5">
                            {plates[index].slice(0, 6).map((sliceId) => (
                              <img
                                key={sliceId}
                                src={CAKE_SLICE_ASSET}
                                alt=""
                                className="h-10 w-10 object-contain"
                                draggable={false}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            <section className="shrink-0 rounded-[1.4rem] border border-white/14 bg-black/22 px-3 py-3 shadow-[0_10px_18px_rgba(15,23,42,0.22)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">Serving plate</p>
                <p className="text-[11px] font-black text-white">{remainingSlices} cakes left</p>
              </div>
              <div className="flex items-center justify-center">
                <motion.button
                  type="button"
                  whileTap={remainingSlices > 0 && !locked ? { scale: 0.96 } : undefined}
                  onPointerDown={handleSourcePointerDown}
                  disabled={locked || remainingSlices <= 0}
                  className={`relative flex h-[104px] w-full max-w-[17rem] items-center justify-center rounded-[1.8rem] border border-transparent bg-transparent shadow-none ${locked || remainingSlices <= 0 ? 'opacity-55' : ''}`}
                  aria-label={remainingSlices > 0 ? 'Drag one cake onto a plate' : 'No cakes left'}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] bg-transparent" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/34 px-2 py-1 text-[11px] font-black text-white">
                    {remainingSlices}
                  </div>
                </motion.button>
              </div>
            </section>
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
          <>
            <div
              className="pointer-events-none fixed left-0 right-0 z-[60]"
              style={{ top: '4px' }}
            >
              <div className="mx-auto w-full max-w-[780px] rounded-[1.05rem] bg-slate-950/70 px-[17px] py-[13px] text-center backdrop-blur-sm">
                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-amber-100/90">Share Splitter</div>
                <div className="mt-1 text-[clamp(1.2rem,4.8vw,1.8rem)] font-black text-white">Match the Ratio</div>
                <div className="mt-2 whitespace-pre-line text-[12px] font-semibold leading-tight text-cyan-100/90">
                  {promptText}
                </div>
              </div>
            </div>
            <AnimatePresence>
              {dragSlice ? (
                <motion.div
                  key={dragSlice.id}
                  initial={{ scale: 0.92, opacity: 0.9 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.86 }}
                  transition={{ duration: 0.08, ease: 'linear' }}
                  className="pointer-events-none fixed z-[60] h-12 w-12 rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.3),rgba(180,83,9,0.2))] p-1 shadow-[0_14px_24px_rgba(217,119,6,0.35)]"
                  style={{ left: dragSlice.x, top: dragSlice.y }}
                >
                  <img
                    src={CAKE_SLICE_ASSET}
                    alt=""
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

          </>
        )}
        />
      </div>
    </GameUiShell>
  );
};

export default ShareSplitterGame;
