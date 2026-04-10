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
import shareSplitterBackground from '../assets/level_backgrounds/share splitter bkground.png';
import birthdayCakeAsset from '../assets/birthdaycake.png';
import cakeSliceAsset from '../assets/cakeslice.png';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import GameRulesModal from '../components/GameRulesModal';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

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

const MAX_PLATE_COUNT = 4;
const ROUNDS_TO_WIN = 5;
const BASE_XP_PER_ROUND = 120;
const CAKE_SLICE_ASSET = cakeSliceAsset;
const BIRTHDAY_CAKE_ASSET = birthdayCakeAsset;
const PLATE_POSITIONS: Record<number, Array<{ x: number; y: number }>> = {
  2: [
    { x: 30, y: 46 },
    { x: 70, y: 46 },
  ],
  3: [
    { x: 50, y: 20 },
    { x: 26, y: 52 },
    { x: 74, y: 52 },
  ],
  4: [
    { x: 50, y: 18 },
    { x: 22, y: 50 },
    { x: 78, y: 50 },
    { x: 50, y: 82 },
  ],
};

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

const buildSharePrompt = (mode: ShareChallenge['mode'], totalSlices: number, ratioText: string) => {
  if (mode === 'direct_share') return `Share ${totalSlices} cakes from the serving plate in the ratio ${ratioText}.`;
  if (mode === 'scaled_share') return `Use all ${totalSlices} cakes to match the ratio ${ratioText}.`;
  if (mode === 'bigger_share') return `Work out the shares for the ratio ${ratioText} using ${totalSlices} cakes.`;
  return `Check each plate carefully. Share ${totalSlices} cakes in the ratio ${ratioText}.`;
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
    prompt: buildSharePrompt(mode, totalSlices, ratioText),
    mode,
    plateCount,
  };
};

const ShareSplitterGame: React.FC<ShareSplitterGameProps> = ({
  levelId,
  avatarId: _avatarId,
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
  const [feedback, setFeedback] = useState('Drag cakes from the serving plate onto the plates.');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [validationActive, setValidationActive] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [locked, setLocked] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);

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
    setFeedback(`Drag cakes from the serving plate onto the ${firstChallenge.plateCount} plates.`);
    setFeedbackTone('neutral');
    setValidationActive(false);
    setMoveHistory([]);
    setLocked(false);
  }, [levelId]);

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

  const rules = useMemo(() => ({
    title: 'Share Splitter',
    summary: 'Use the ratio to share the cakes across all plates.',
    bullets: [
      'Drag cakes from the serving plate onto a plate.',
      'Match each plate to the ratio shown on the board.',
      'Press Check when every plate looks correct.',
    ],
  }), []);

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
    setFeedback(`Drag cakes from the serving plate onto the ${next.plateCount} plates.`);
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
        x: clientX - 20,
        y: clientY - 20,
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
      const padding = 14;
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
      const snapRadius = 95;
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
      setHoverPlateIndex(distance <= 100 ? index : null);
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
      setHoverPlateIndex(distance <= 100 ? index : null);
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
    setFeedback('The plates are clear. Try the ratio again.');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const checkAllocation = () => {
    if (locked || !hasMoves) return;

    setAttempts((previous) => previous + 1);
    setValidationActive(true);

    if (!allSlicesUsed) {
      setFeedback('Not quite. Use all the cakes before you check.');
      setFeedbackTone('bad');
      return;
    }

    if (!allCorrect) {
      setFeedback('Not quite. Compare each plate to the ratio card.');
      setFeedbackTone('bad');
      return;
    }

    const nextSolved = roundSolved + 1;
    const roundXp = BASE_XP_PER_ROUND + (levelId * 20);
    const nextXp = xpEarned + roundXp;

    setLocked(true);
    setRoundSolved(nextSolved);
    setXpEarned(nextXp);
    setFeedback('Well done! The cakes were shared correctly.');
    setFeedbackTone('good');

    confetti({
      particleCount: 40,
      spread: 56,
      origin: { y: 0.64 },
      colors: ['#facc15', '#38bdf8', '#4ade80'],
    });

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
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
              onHelp={() => setShowRules(true)}
            />
          </div>
        )}
        main={(
          <div className="mx-auto grid h-full w-full max-w-[780px] min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2">
            <div className="relative min-h-0 overflow-hidden rounded-[1.6rem] px-2 py-3 md:px-3">
              <div
                className="absolute inset-x-3 bottom-4"
                style={{ top: 'calc(36% + 30px)' }}
              >
                <div className="relative h-full w-full">
                  {plateViews.map((plate, index) => {
                    const plateTone = validationActive
                      ? plate.isCorrect
                        ? 'border-emerald-300/70 bg-[linear-gradient(180deg,rgba(226,252,243,0.9),rgba(186,247,231,0.78))]'
                        : 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,243,205,0.9),rgba(255,232,176,0.78))]'
                      : hoverPlateIndex === index
                        ? 'border-cyan-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.92),rgba(214,241,255,0.76))]'
                        : dragSlice
                          ? 'border-cyan-200/60 bg-[linear-gradient(180deg,rgba(244,250,255,0.86),rgba(216,236,250,0.72))]'
                          : 'border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(224,233,243,0.68))]';
                    const position = platePositions[index] || { x: 50, y: 50 };

                    return (
                      <button
                        key={plate.id}
                        type="button"
                        ref={(node) => {
                          plateRefs.current[index] = node;
                        }}
                        disabled={locked}
                        className={`absolute flex h-[clamp(78px,18vw,108px)] w-[clamp(78px,18vw,108px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border p-2 text-center shadow-[0_12px_20px_rgba(2,6,23,0.24)] transition ${plateTone} ${hoverPlateIndex === index ? 'scale-[1.03]' : dragSlice && !locked ? 'scale-[1.01]' : ''}`}
                        style={{ left: `${position.x}%`, top: `${position.y}%` }}
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
                  className={`relative flex h-[76px] w-full max-w-[12rem] items-center justify-center rounded-full border border-white/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(30,41,59,0.7))] shadow-[0_12px_18px_rgba(15,23,42,0.28)] ${locked || remainingSlices <= 0 ? 'opacity-55' : ''}`}
                  aria-label={remainingSlices > 0 ? 'Drag one cake onto a plate' : 'No cakes left'}
                >
                  <img
                    src={BIRTHDAY_CAKE_ASSET}
                    alt=""
                    className="h-14 w-14 object-contain"
                    draggable={false}
                  />
                  {dragSlice ? (
                    <img
                      src={CAKE_SLICE_ASSET}
                      alt=""
                      className="absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 object-contain"
                      draggable={false}
                    />
                  ) : null}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/34 px-2 py-1 text-[11px] font-black text-white">
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${feedback}-${feedbackTone}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <FeedbackStrip
                    tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}
                  >
                    {feedback}
                  </FeedbackStrip>
                </motion.div>
              </AnimatePresence>
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
                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-amber-100/90">Target Share</div>
                <div className="mt-1 text-[clamp(1.2rem,4.8vw,1.8rem)] font-black text-white">Split the Cakes</div>
                <div className="mt-1 text-[13px] font-black text-amber-100">Ratio {challenge.ratios.join(' : ')}</div>
                <div className="mt-2 text-[12px] font-semibold text-cyan-100/90">
                  {formatFantasyPrompt(challenge.prompt) || 'Share the cakes to match the ratio.'}
                </div>
              </div>
            </div>
            <AnimatePresence>
              {dragSlice ? (
                <motion.div
                  key={dragSlice.id}
                  initial={{ scale: 0.92, opacity: 0.9 }}
                  animate={{ scale: 1, opacity: 1, x: dragSlice.x - 24, y: dragSlice.y - 24 }}
                  exit={{ opacity: 0, scale: 0.86 }}
                  transition={{ duration: 0.08, ease: 'linear' }}
                  className="pointer-events-none fixed z-[60] h-12 w-12 rounded-full border border-amber-200/70 bg-[linear-gradient(180deg,rgba(250,204,21,0.3),rgba(180,83,9,0.2))] p-1 shadow-[0_14px_24px_rgba(217,119,6,0.35)]"
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

            <GameRulesModal
              isOpen={showRules}
              onClose={() => setShowRules(false)}
              rules={rules}
            />
          </>
        )}
      />
    </GameUiShell>
  );
};

export default ShareSplitterGame;
