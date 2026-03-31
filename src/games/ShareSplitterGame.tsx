import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Check, RefreshCcw, RotateCcw } from 'lucide-react';
import FoodGameShell from '../components/FoodGameShell';
import { TAKE_OUT_ASSETS } from '../assets/take_out';

interface ShareSplitterGameProps {
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

type PlateSeat = {
  left: string;
  top: string;
};

const PLATE_COUNT = 6;
const ROUNDS_TO_WIN = 5;
const BASE_XP_PER_ROUND = 120;
const PLATE_SEATS: PlateSeat[] = [
  { left: '50%', top: '16%' },
  { left: '78%', top: '31%' },
  { left: '78%', top: '69%' },
  { left: '50%', top: '84%' },
  { left: '22%', top: '69%' },
  { left: '22%', top: '31%' },
];

const RATIO_PATTERNS: number[][] = [
  [1, 1, 2, 2, 3, 3],
  [1, 1, 1, 2, 2, 3],
  [1, 2, 1, 2, 3, 3],
  [1, 1, 2, 3, 2, 3],
  [1, 1, 2, 2, 2, 4],
];

const createEmptyPlates = () => Array.from({ length: PLATE_COUNT }, () => [] as string[]);

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
  if (mode === 'direct_share') return `Share ${totalSlices} cake slices so the plates match the ratio ${ratioText}.`;
  if (mode === 'scaled_share') return `Use all ${totalSlices} cake slices and keep the plates in the ratio ${ratioText}.`;
  if (mode === 'bigger_share') return `Work out the larger share. Use ${totalSlices} cake slices in the ratio ${ratioText}.`;
  return `Check each plate carefully. Share ${totalSlices} cake slices in the ratio ${ratioText}.`;
};

const createChallenge = (levelId: number, solved: number): ShareChallenge => {
  const mode = shareModeForLevel(levelId);
  const pattern = [...randomPick(RATIO_PATTERNS)];
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
  };
};

const ShareSplitterGame: React.FC<ShareSplitterGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const [roundSolved, setRoundSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [challenge, setChallenge] = useState<ShareChallenge>(() => createChallenge(levelId, 0));
  const [plates, setPlates] = useState<string[][]>(() => createEmptyPlates());
  const [remainingSlices, setRemainingSlices] = useState(challenge.totalSlices);
  const [dragSlice, setDragSlice] = useState<DragSlice | null>(null);
  const [feedback, setFeedback] = useState('Drag one cake slice onto a plate.');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [validationActive, setValidationActive] = useState(false);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [locked, setLocked] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  const plateRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sliceSeedRef = useRef(0);

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
    setPlates(createEmptyPlates());
    setRemainingSlices(firstChallenge.totalSlices);
    setDragSlice(null);
    setFeedback('Drag one cake slice onto a plate.');
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

  const loadNextChallenge = useCallback((solvedCount: number) => {
    const next = createChallenge(levelId, solvedCount);
    setChallenge(next);
    setPlates(createEmptyPlates());
    setRemainingSlices(next.totalSlices);
    setDragSlice(null);
    setValidationActive(false);
    setMoveHistory([]);
    setLocked(false);
    setFeedback('Drag one cake slice onto a plate.');
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
    setFeedback('Nice sharing. Keep matching the ratio card.');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const handleSourcePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || remainingSlices <= 0) return;
    const sliceId = `${challenge.id}-slice-${sliceSeedRef.current}`;
    sliceSeedRef.current += 1;
    const pointerId = event.pointerId;

    const updatePosition = (clientX: number, clientY: number) => {
      setDragSlice({
        id: sliceId,
        x: clientX,
        y: clientY,
      });
    };

    const finishDrag = (clientX: number, clientY: number) => {
      const targetPlateIndex = plateRefs.current.findIndex((plate) => {
        if (!plate) return false;
        const rect = plate.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      });

      if (targetPlateIndex >= 0) {
        placeOnPlate(targetPlateIndex, sliceId);
      } else {
        setDragSlice(null);
        setFeedback('Drag the cake slice onto one of the plates.');
        setFeedbackTone('neutral');
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      finishDrag(upEvent.clientX, upEvent.clientY);
    };

    const handlePointerCancel = () => {
      setDragSlice(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };

    updatePosition(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(pointerId);
    setFeedback('Drop the cake slice onto the correct plate.');
    setFeedbackTone('neutral');
    setValidationActive(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  const undoLastMove = () => {
    if (locked || moveHistory.length === 0) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    setMoveHistory((previous) => previous.slice(0, -1));
    setPlates((previous) => previous.map((plate, index) => (
      index === lastMove.plateIndex ? plate.filter((sliceId) => sliceId !== lastMove.sliceId) : plate
    )));
    setRemainingSlices((previous) => previous + 1);
    setDragSlice(null);
    setFeedback('One cake slice was moved back to the tray.');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const resetAllocation = () => {
    if (locked || moveHistory.length === 0) return;
    setPlates(createEmptyPlates());
    setRemainingSlices(challenge.totalSlices);
    setMoveHistory([]);
    setDragSlice(null);
    setFeedback('The plates are clear. Try the ratio again.');
    setFeedbackTone('neutral');
    setValidationActive(false);
  };

  const checkAllocation = () => {
    if (locked || !hasMoves) return;

    setAttempts((previous) => previous + 1);
    setValidationActive(true);

    if (!allSlicesUsed) {
      setFeedback('Not quite. Use all the cake slices before you check.');
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
    <FoodGameShell gameType="take_out_rush">
      <div className="flex h-full min-h-0 flex-col gap-2">
        <section className="shrink-0 rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(250,204,21,0.9),rgba(245,158,11,0.86))] px-3 py-3 text-center text-slate-900 shadow-[0_14px_22px_rgba(15,23,42,0.22)]">
          <p className="text-[clamp(14px,2vh,20px)] font-black leading-tight">{challenge.prompt}</p>
        </section>

        <section className="shrink-0 rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(30,64,175,0.84),rgba(15,23,42,0.88))] px-3 py-3 text-white shadow-[0_12px_22px_rgba(15,23,42,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/90">Ratio Card</p>
              <p className="mt-1 text-sm font-black text-white md:text-base">Total cakes: {challenge.totalSlices}</p>
            </div>
            <div className="rounded-full bg-black/24 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
              Round {roundSolved + 1} of {ROUNDS_TO_WIN}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {challenge.ratios.map((ratio, index) => (
              <div key={`ratio-${index + 1}`} className="rounded-[0.95rem] border border-white/10 bg-black/18 px-2 py-2 text-center">
                <div className="mx-auto mb-1 h-8 w-8 rounded-full border border-white/15 bg-[radial-gradient(circle,rgba(255,255,255,0.18),rgba(15,23,42,0.18))]" />
                <p className="text-[9px] font-black uppercase tracking-[0.08em] text-cyan-100">Plate {index + 1}</p>
                <p className="mt-0.5 text-lg font-black text-white">{ratio}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative min-h-0 flex-1 overflow-hidden rounded-[1.4rem] border border-white/14 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12),rgba(15,23,42,0.52)_64%)] p-2 shadow-[0_16px_30px_rgba(15,23,42,0.28)] md:p-3">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[56%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.22),rgba(30,41,59,0.18))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[44%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.12),rgba(15,23,42,0.04)_72%)]" />

          {PLATE_SEATS.map((seat, index) => {
            const plate = plateViews[index];
            const plateTone = validationActive
              ? plate.isCorrect
                ? 'border-emerald-300/70 bg-[linear-gradient(180deg,rgba(16,185,129,0.24),rgba(15,23,42,0.4))]'
                : 'border-amber-200/60 bg-[linear-gradient(180deg,rgba(251,191,36,0.2),rgba(15,23,42,0.42))]'
              : dragSlice
                ? 'border-cyan-200/55 bg-[linear-gradient(180deg,rgba(56,189,248,0.16),rgba(15,23,42,0.42))]'
                : 'border-white/18 bg-[linear-gradient(180deg,rgba(30,41,59,0.7),rgba(15,23,42,0.7))]';

            return (
              <button
                key={plate.id}
                type="button"
                ref={(node) => {
                  plateRefs.current[index] = node;
                }}
                disabled={locked}
                className={`absolute flex h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border p-2 text-center shadow-[0_12px_20px_rgba(2,6,23,0.24)] transition ${plateTone} ${dragSlice && !locked ? 'scale-[1.01]' : ''}`}
                style={{ left: seat.left, top: seat.top }}
                aria-label={`Plate ${index + 1}. ${plate.currentCakeCount} of ${plate.targetCakeCount} cakes placed.`}
              >
                <div className="absolute right-1 top-1 rounded-full bg-black/36 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {plate.currentCakeCount}/{plate.targetCakeCount}
                </div>
                <div className="grid h-full w-full grid-cols-3 place-items-center gap-0.5">
                  {plates[index].slice(0, 6).map((sliceId) => (
                    <img
                      key={sliceId}
                      src={TAKE_OUT_ASSETS.portionQuarter}
                      alt=""
                      className="h-4 w-4 object-contain"
                      draggable={false}
                    />
                  ))}
                </div>
              </button>
            );
          })}

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
                  src={TAKE_OUT_ASSETS.portionQuarter}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="shrink-0 rounded-[1.2rem] border border-white/14 bg-black/22 px-3 py-2 shadow-[0_10px_18px_rgba(15,23,42,0.22)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">Cake Supply</p>
            <p className="text-[11px] font-black text-white">{remainingSlices} left</p>
          </div>
          <div className="flex items-center justify-center">
            <motion.button
              type="button"
              whileTap={remainingSlices > 0 && !locked ? { scale: 0.96 } : undefined}
              onPointerDown={handleSourcePointerDown}
              disabled={locked || remainingSlices <= 0}
              className={`relative flex h-16 w-full max-w-[11rem] items-center justify-center rounded-[1.15rem] border border-white/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(30,41,59,0.7))] shadow-[0_12px_18px_rgba(15,23,42,0.28)] ${locked || remainingSlices <= 0 ? 'opacity-55' : ''}`}
              aria-label={remainingSlices > 0 ? 'Drag one cake slice onto a plate' : 'No cake slices left'}
            >
              <div className="absolute inset-y-2 left-3 flex items-center">
                <img
                  src={TAKE_OUT_ASSETS.portionQuarter}
                  alt=""
                  className="h-10 w-10 object-contain"
                  draggable={false}
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">Drag A Slice</p>
                <p className="mt-0.5 text-sm font-black text-white">From the cake stand</p>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/34 px-2 py-1 text-[11px] font-black text-white">
                {remainingSlices}
              </div>
            </motion.button>
          </div>
        </section>

        <section className="min-h-[2.8rem] shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${feedback}-${feedbackTone}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`rounded-[1rem] border px-3 py-2 text-center text-sm font-black shadow-[0_10px_18px_rgba(15,23,42,0.22)] ${
                feedbackTone === 'good'
                  ? 'border-emerald-200/50 bg-[linear-gradient(180deg,rgba(16,185,129,0.26),rgba(5,150,105,0.18))] text-emerald-100'
                  : feedbackTone === 'bad'
                    ? 'border-amber-200/50 bg-[linear-gradient(180deg,rgba(251,191,36,0.22),rgba(180,83,9,0.16))] text-amber-100'
                    : 'border-white/14 bg-black/22 text-cyan-100'
              }`}
            >
              {feedback}
            </motion.div>
          </AnimatePresence>
        </section>

        <section className="shrink-0 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={undoLastMove}
            disabled={locked || moveHistory.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/18 bg-[linear-gradient(180deg,#1e3a8a,#172554)] px-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_14px_rgba(15,23,42,0.35)] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Undo
          </button>
          <button
            type="button"
            onClick={resetAllocation}
            disabled={locked || moveHistory.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/18 bg-[linear-gradient(180deg,#1e3a8a,#172554)] px-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_14px_rgba(15,23,42,0.35)] disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={checkAllocation}
            disabled={locked || !hasMoves}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200/45 bg-[linear-gradient(180deg,#34d399,#10b981)] px-3 text-xs font-black uppercase tracking-[0.12em] text-emerald-950 shadow-[0_8px_14px_rgba(5,150,105,0.35)] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Check
          </button>
        </section>
      </div>
    </FoodGameShell>
  );
};

export default ShareSplitterGame;
