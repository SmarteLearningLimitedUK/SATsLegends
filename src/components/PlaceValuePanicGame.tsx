import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AVATARS } from '../constants';
import GameContainerView from './GameContainerView';
import {
  DigitTile,
  PlaceValueSlotKey,
  usePlaceValuePanicViewModel,
} from './placeValuePanic/usePlaceValuePanicViewModel';

interface PlaceValuePanicGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface DragState {
  tile: DigitTile;
  pointerId: number;
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface SlotCandidate {
  key: PlaceValueSlotKey;
  distance: number;
}

const SLOT_DISPLAY_VALUES: Record<PlaceValueSlotKey, string> = {
  thousands: '1000',
  hundreds: '100',
  tens: '10',
  ones: '1',
  tenths: '0.1',
  hundredths: '0.01',
};

const MIN_TAP_TARGET = 44;

const feedbackToneClass = (tone: 'success' | 'warning' | 'error') => {
  if (tone === 'success') return 'border-emerald-200/55 bg-emerald-500/28 text-emerald-50';
  if (tone === 'error') return 'border-rose-200/55 bg-rose-500/30 text-rose-50';
  return 'border-amber-200/55 bg-amber-500/26 text-amber-50';
};

const PlaceValuePanicGame: React.FC<PlaceValuePanicGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);

  const {
    levelConfig,
    resolvedMiniGameLevel,
    round,
    roundNumber,
    slots,
    trayTiles,
    placedBySlot,
    score,
    combo,
    pressure,
    timeLeft,
    progress,
    accuracy,
    feedback,
    isPaused,
    setIsPaused,
    hintSlotKey,
    lastRejectedTileId,
    onTileGrab,
    onDropTile,
  } = usePlaceValuePanicViewModel({
    levelId,
    miniGameLevel,
    onVictory,
    onGameOver,
  });

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverSlotKey, setHoverSlotKey] = useState<PlaceValueSlotKey | null>(null);

  const slotRefs = useRef<Record<PlaceValueSlotKey, HTMLDivElement | null>>({
    thousands: null,
    hundreds: null,
    tens: null,
    ones: null,
    tenths: null,
    hundredths: null,
  });

  useEffect(() => {
    setDragState(null);
    setHoverSlotKey(null);
  }, [round.id]);

  const activeSlots = useMemo(() => slots, [slots]);

  const findSlotCandidate = (clientX: number, clientY: number): SlotCandidate | null => {
    const availableSlots = activeSlots.filter((slot) => !slot.isFilled);
    if (availableSlots.length === 0) return null;

    let best: SlotCandidate | null = null;

    for (const slot of availableSlots) {
      const element = slotRefs.current[slot.key];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);

      if (!best || distance < best.distance) {
        best = { key: slot.key, distance };
      }
    }

    if (!best) return null;

    const firstSlot = slotRefs.current[availableSlots[0].key];
    const fallbackSize = firstSlot?.getBoundingClientRect().width || 120;
    const snapRadius = Math.max(56, Math.min(110, fallbackSize * 0.58));

    return best.distance <= snapRadius ? best : null;
  };

  useEffect(() => {
    if (!dragState) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;

      setDragState((current) => {
        if (!current || current.pointerId !== event.pointerId) return current;
        return {
          ...current,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      });

      const candidate = findSlotCandidate(event.clientX, event.clientY);
      setHoverSlotKey(candidate?.key || null);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== dragState.pointerId) return;

      const candidate = findSlotCandidate(event.clientX, event.clientY);
      onDropTile(dragState.tile.id, candidate?.key || null);
      setDragState(null);
      setHoverSlotKey(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [dragState, onDropTile, activeSlots]);

  const handleTilePointerDown = (event: React.PointerEvent<HTMLButtonElement>, tile: DigitTile) => {
    if (isPaused || tile.isPlaced) return;

    const rect = event.currentTarget.getBoundingClientRect();
    onTileGrab(tile.id);
    event.currentTarget.setPointerCapture(event.pointerId);

    setDragState({
      tile,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  const objectiveArea = (
    <div className="flex flex-col gap-2 p-2 md:gap-2.5 md:p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">Target</div>
          <div className="text-lg font-black text-white md:text-2xl">{round.targetNumberDisplay}</div>
          <div className="text-[11px] font-semibold text-cyan-100/90 md:text-xs">
            Drag each digit into the correct place.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsPaused((previous) => !previous)}
          className="ui-button-primary min-h-[44px] rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] md:text-xs">
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">Level {resolvedMiniGameLevel} / 10</span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">Tier {levelConfig.difficultyTier}</span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">Round {roundNumber} / {levelConfig.promptsToClear}</span>
        <span className="licensed-slice-cyan-pill rounded-full px-2.5 py-1 text-white">Combo x{Math.max(1, combo)}</span>
      </div>

      <div className="rounded-xl border border-cyan-100/35 bg-slate-900/45 p-2">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/85">
          <span>Queue Pressure</span>
          <span>{Math.round(pressure)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full border border-white/20 bg-slate-950/70">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              pressure >= 80
                ? 'bg-rose-400'
                : pressure >= 55
                  ? 'bg-amber-300'
                  : 'bg-emerald-300'
            }`}
            style={{ width: `${Math.min(100, pressure)}%` }}
          />
        </div>
      </div>

      <div className="min-h-[2.25rem]">
        {feedback ? (
          <div className={`rounded-xl border px-3 py-1.5 text-center shadow-[0_10px_20px_rgba(2,6,23,0.28)] ${feedbackToneClass(feedback.tone)}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] md:text-[11px]">{feedback.title}</div>
            <div className="text-[10px] font-semibold md:text-[11px]">{feedback.detail}</div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const playFieldArea = (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-2 p-2 md:gap-2.5 md:p-3">
      <div className="flex min-h-0 flex-[0.62] flex-col gap-2">
        <div
          className="grid flex-1 min-h-0 gap-2 md:gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, activeSlots.length))}, minmax(0, 1fr))` }}
        >
          {activeSlots.map((slot) => {
            const placedTile = placedBySlot.get(slot.key);
            const isHovered = hoverSlotKey === slot.key;
            const isHinted = hintSlotKey === slot.key;
            const isFilled = Boolean(placedTile);

            return (
              <div
                key={slot.id}
                ref={(element) => {
                  slotRefs.current[slot.key] = element;
                }}
                className={`relative flex min-h-[108px] select-none flex-col items-center justify-center overflow-hidden rounded-[1rem] border px-2 text-center shadow-[0_12px_24px_rgba(2,6,23,0.34)] transition-all md:min-h-[136px] md:rounded-[1.2rem] ${
                  isFilled
                    ? 'border-emerald-200/60 bg-emerald-500/24'
                    : isHovered
                      ? 'border-cyan-200/70 bg-cyan-500/25'
                      : isHinted
                        ? 'border-yellow-100/80 bg-yellow-400/20 animate-pulse'
                        : 'border-white/16 bg-slate-900/55'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75 md:text-xs">{slot.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 md:text-xs">{SLOT_DISPLAY_VALUES[slot.key]}</div>
                <div className="mt-1 text-3xl font-black text-white sm:text-4xl md:text-5xl">{isFilled ? placedTile?.digitValue : '?'}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-[0.38] flex-col gap-2 overflow-hidden rounded-2xl border border-white/16 bg-slate-900/55 p-2.5 shadow-[0_10px_22px_rgba(2,6,23,0.28)] md:gap-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">Digit Tray</div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/75 md:text-xs">
            Accuracy {Math.round(accuracy * 100)}%
          </div>
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          <AnimatePresence mode="popLayout">
            {trayTiles.map((tile) => {
              const isDragging = dragState?.tile.id === tile.id;
              const isRejected = lastRejectedTileId === tile.id;

              return (
                <motion.button
                  key={tile.id}
                  type="button"
                  onPointerDown={(event) => handleTilePointerDown(event, tile)}
                  disabled={isPaused}
                  className={`flex h-full items-center justify-center rounded-xl border text-2xl font-black transition touch-none ${
                    isDragging
                      ? 'opacity-25'
                      : 'opacity-100'
                  } ${
                    isRejected
                      ? 'border-rose-200/70 bg-rose-500/30'
                      : 'border-white/20 bg-slate-900/60'
                  } text-white/95`}
                  style={{ minHeight: MIN_TAP_TARGET }}
                  initial={{ opacity: 0, y: 8, scale: 0.86 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: isRejected ? [0, -7, 7, -5, 5, 0] : 0,
                  }}
                  exit={{ opacity: 0, y: 8, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 230, damping: 18 }}
                >
                  {tile.digitValue}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {dragState ? (
        <motion.div
          className="pointer-events-none fixed z-[70] flex items-center justify-center rounded-xl border border-cyan-100/70 bg-cyan-500/88 text-2xl font-black text-white shadow-[0_14px_34px_rgba(2,6,23,0.42)]"
          style={{
            width: dragState.width,
            height: dragState.height,
            left: dragState.clientX - dragState.offsetX,
            top: dragState.clientY - dragState.offsetY,
          }}
          initial={{ scale: 1 }}
          animate={{ scale: 1.04 }}
        >
          {dragState.tile.digitValue}
        </motion.div>
      ) : null}
    </div>
  );

  return (
    <GameContainerView
      gameType="place_value_peaks"
      title="Place Value Panic"
      avatar={avatar}
      score={Math.round(score)}
      targetScore={levelConfig.targetScore}
      timeLeft={timeLeft}
      progress={progress}
      statLabel="Overload"
      statValue={`${Math.round(pressure)}%`}
      objectiveArea={objectiveArea}
      playFieldArea={playFieldArea}
      isPaused={isPaused}
      onResume={() => setIsPaused(false)}
      onBack={onBack}
    />
  );
};

export default PlaceValuePanicGame;
