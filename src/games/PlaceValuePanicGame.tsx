import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AVATARS } from '../constants';
import GameContainerView from '../components/GameContainerView';
import placeValuePanicBackground from '../assets/level_backgrounds/place_value_panicbkgrd.png';
import gemBlue from '../assets/place_value/jewels/diamond_blue.png';
import gemGreen from '../assets/place_value/jewels/diamond_green.png';
import gemPurple from '../assets/place_value/jewels/diamond_purple.png';
import gemRed from '../assets/place_value/jewels/diamond_red.png';
import gemYellow from '../assets/place_value/jewels/diamond_yellow.png';
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
const GEM_TEXTURES: string[] = [
  gemPurple,
  gemBlue,
  gemYellow,
  gemGreen,
  gemRed,
];

const getGemTexture = (digitValue: number) => GEM_TEXTURES[Math.abs(digitValue) % GEM_TEXTURES.length];

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
    round,
    roundsCleared,
    slots,
    trayTiles,
    placedBySlot,
    score,
    combo,
    timeLeft,
    progress,
    accuracy,
    feedback,
    isPaused,
    isForgingTransition,
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
  const playfieldRef = useRef<HTMLDivElement | null>(null);

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

  const getPlayfieldRelativePoint = (clientX: number, clientY: number) => {
    const rect = playfieldRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: clientX, y: clientY };
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

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
    <div className="pvp-objective flex flex-col gap-2 p-2 md:gap-2.5 md:p-3">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsPaused((previous) => !previous)}
          className="ui-button-primary min-h-[44px] rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white md:text-xs pvp-pause-button"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="pvp-target-center-card">
        <div className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-950/72">Target Number</div>
        <div className="pvp-target-value pvp-target-value-center text-2xl font-black text-amber-950 md:text-4xl">
          {round.targetNumberDisplay}
        </div>
      </div>

      <div className="text-center text-[11px] font-semibold text-cyan-100/90 md:text-xs">
        Drag each digit into the correct place.
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] md:text-xs">
        <span className="pvp-stat-chip">Solved {roundsCleared}</span>
        <span className="pvp-stat-chip">Combo x{Math.max(1, combo)}</span>
      </div>

      <div className="min-h-[2.25rem]">
        {feedback ? (
          <div className={`pvp-feedback-banner rounded-xl border px-3 py-1.5 text-center shadow-[0_10px_20px_rgba(2,6,23,0.28)] ${feedbackToneClass(feedback.tone)}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] md:text-[11px]">{feedback.title}</div>
            <div className="text-[10px] font-semibold md:text-[11px]">{feedback.detail}</div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const playFieldArea = (
    <div ref={playfieldRef} className="relative flex h-full min-h-0 w-full flex-col gap-2 p-2 md:gap-2.5 md:p-3">
      <div className="pvp-slot-grid-shell flex h-full min-h-0 flex-1 flex-col gap-2 rounded-2xl border border-white/14 bg-slate-900/35 p-2">
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
                className={`pvp-slot relative flex min-h-[108px] select-none flex-col items-center justify-center overflow-hidden rounded-[1rem] border px-2 text-center shadow-[0_12px_24px_rgba(2,6,23,0.34)] transition-all md:min-h-[136px] md:rounded-[1.2rem] ${
                  isFilled
                    ? 'pvp-slot-filled'
                    : isHovered
                      ? 'pvp-slot-hovered'
                      : isHinted
                        ? 'animate-pulse pvp-slot-hinted'
                        : 'pvp-slot-empty'
                }`}
              >
                <div className="pvp-slot-label text-[10px] font-black uppercase tracking-[0.18em] text-white/75 md:text-xs">{slot.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 md:text-xs">{SLOT_DISPLAY_VALUES[slot.key]}</div>
                <div className="pvp-slot-square-socket mt-1">
                  {isFilled && placedTile ? (
                    <div className={`pvp-slot-square-gem ${isForgingTransition ? 'pvp-forge-pulse' : ''}`}>
                      <img
                        src={getGemTexture(placedTile.digitValue)}
                        alt=""
                        className="pvp-gem-art"
                        draggable={false}
                      />
                      <span className="pvp-slot-square-gem-digit">{placedTile.digitValue}</span>
                    </div>
                  ) : (
                    <div className="pvp-slot-empty-square-glyph">?</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {dragState ? (
        (() => {
          const relativePoint = getPlayfieldRelativePoint(dragState.clientX, dragState.clientY);
          return (
            <motion.div
              className="pvp-drag-ghost pointer-events-none absolute z-[70] flex items-center justify-center rounded-xl border border-cyan-100/70 text-2xl font-black text-white shadow-[0_14px_34px_rgba(2,6,23,0.42)]"
              style={{
                width: dragState.width,
                height: dragState.height,
                left: relativePoint.x - dragState.offsetX,
                top: relativePoint.y - dragState.offsetY,
              }}
              initial={{ scale: 1 }}
              animate={{ scale: 1.04 }}
            >
              <img
                src={getGemTexture(dragState.tile.digitValue)}
                alt=""
                className="pvp-gem-art"
                draggable={false}
              />
              <span className="pvp-digit-gem-number">{dragState.tile.digitValue}</span>
            </motion.div>
          );
        })()
      ) : null}

      <AnimatePresence>
        {isForgingTransition ? (
          <motion.div
            key={`forged-${round.id}`}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pvp-forged-burst"
              initial={{ scale: 0.8, opacity: 0, y: 12 }}
              animate={{ scale: [0.88, 1.12, 1], opacity: [0, 1, 0.86, 0], y: [12, -6, -18] }}
              transition={{ duration: 0.66, ease: 'easeOut' }}
            >
              FORGED!
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );

  const interactionArea = (
    <div className="pvp-tray-shell relative flex min-h-0 flex-col gap-2 overflow-hidden p-2.5 md:gap-2.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75 md:text-xs">Digit Queue</div>
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
                className={`pvp-digit-tile flex h-full items-center justify-center rounded-xl border text-2xl font-black transition touch-none ${
                  isDragging
                    ? 'opacity-25'
                    : 'opacity-100'
                } ${
                  isRejected
                    ? 'border-rose-200/70 bg-rose-500/30'
                    : 'border-white/20 bg-slate-900/60'
                } text-white/95 ${isDragging ? 'pvp-digit-selected' : ''}`}
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
                <div className={`pvp-digit-gem-square ${isForgingTransition ? 'pvp-forge-pulse' : ''}`}>
                  <img
                    src={getGemTexture(tile.digitValue)}
                    alt=""
                    className="pvp-gem-art"
                    draggable={false}
                  />
                  <span className="pvp-digit-gem-number">{tile.digitValue}</span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <GameContainerView
      gameType="place_value_peaks"
      sceneBackgroundOverride={placeValuePanicBackground}
      sceneMinimalDecor
      title="Place Value Panic"
      avatar={avatar}
      score={Math.round(score)}
      targetScore={levelConfig.targetScore}
      timeLeft={timeLeft}
      progress={progress}
      roundLabel="Round"
      roundValue={roundsCleared + 1}
      objectiveArea={objectiveArea}
      playFieldArea={playFieldArea}
      interactionArea={interactionArea}
      isPaused={isPaused}
      onResume={() => setIsPaused(false)}
      onBack={onBack}
    />
  );
};

export default PlaceValuePanicGame;
