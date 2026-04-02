import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import scaleSheet from '../assets/measurement/weighscaleanimsheet.png';

interface MeasurementForgeGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface WeightToken {
  id: string;
  grams: number;
}

interface RoundData {
  targetGrams: number;
  tokens: WeightToken[];
}

const TOTAL_ROUNDS = 5;
const SCALE_FRAME_SIZE = {
  columns: 2,
  rows: 3,
} as const;

const STAGE_DENOMS: number[][] = [
  [50, 100, 150, 200, 250, 300],
  [100, 150, 200, 250, 300, 400],
  [100, 250, 500, 750, 1000, 1250],
  [250, 500, 750, 1000, 1500, 2000],
  [500, 750, 1000, 1500, 2000, 2500],
  [500, 1000, 2000, 3000, 4000, 5000],
];

const toKgLabel = (grams: number) => `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
const toGramLabel = (grams: number) => `${grams.toLocaleString()} g`;

const getMeasurementDisplay = (grams: number) => {
  if (grams >= 1000) {
    return {
      primary: toKgLabel(grams),
      secondary: toGramLabel(grams),
    };
  }

  return {
    primary: toGramLabel(grams),
    secondary: toKgLabel(grams),
  };
};

const clampStage = (levelId: number, roundIndex: number) => Math.min(STAGE_DENOMS.length - 1, Math.max(0, levelId - 1 + roundIndex));

const randomFrom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildRound = (levelId: number, roundIndex: number): RoundData => {
  const stage = clampStage(levelId, roundIndex);
  const denoms = STAGE_DENOMS[stage];
  const minimumDistinctChoices = 5;
  const distinctChoices = shuffle(denoms).slice(0, Math.max(minimumDistinctChoices, Math.min(denoms.length, 6)));
  const requiredCount = Math.min(4, Math.max(2, 2 + Math.floor(stage / 2)));

  const required = shuffle(distinctChoices).slice(0, requiredCount);
  const targetGrams = required.reduce((sum, grams) => sum + grams, 0);

  const distractorPool = distinctChoices.filter((value) => !required.includes(value));
  const extraCopiesCount = Math.min(3, 1 + Math.floor(stage / 2));
  const extraCopies = Array.from({ length: extraCopiesCount }, () => randomFrom(required));

  const all = shuffle([...required, ...distractorPool, ...extraCopies]);
  const tokens: WeightToken[] = all.map((grams, index) => ({
    id: `${roundIndex}-${index}-${grams}-${Math.random().toString(36).slice(2, 7)}`,
    grams,
  }));

  return { targetGrams, tokens };
};

const scoreToStars = (XP: number) => {
  if (XP >= 2200) return 3;
  if (XP >= 1400) return 2;
  return 1;
};

type ScaleFrameKey =
  | 'right_light'
  | 'left_light'
  | 'left_heavy'
  | 'right_heavy'
  | 'left_mid'
  | 'balanced';

const SCALE_FRAME_POSITION: Record<ScaleFrameKey, { x: number; y: number }> = {
  right_light: { x: 0, y: 0 },
  left_light: { x: 100, y: 0 },
  left_heavy: { x: 0, y: 50 },
  right_heavy: { x: 100, y: 50 },
  left_mid: { x: 0, y: 100 },
  balanced: { x: 100, y: 100 },
};

const MeasurementForgeGame: React.FC<MeasurementForgeGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<RoundData>(() => buildRound(levelId, 0));
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [XP, setScore] = useState(0);
  const [successPulse, setSuccessPulse] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRoundIndex(0);
    setRound(buildRound(levelId, 0));
    setPlacedIds([]);
    setScore(0);
    setSuccessPulse(false);
  }, [levelId]);

  const tokenMap = useMemo(() => new Map(round.tokens.map((token) => [token.id, token])), [round.tokens]);

  const placedTokens = placedIds
    .map((id) => tokenMap.get(id))
    .filter((token): token is WeightToken => !!token);

  const currentGrams = placedTokens.reduce((sum, token) => sum + token.grams, 0);
  const weightDelta = currentGrams - round.targetGrams;
  const deltaRatio = round.targetGrams > 0 ? Math.abs(weightDelta) / round.targetGrams : 0;

  const activeScaleFrame = useMemo<ScaleFrameKey>(() => {
    if (Math.abs(weightDelta) <= 1) return 'balanced';
    if (weightDelta < 0) {
      if (deltaRatio >= 0.5) return 'left_heavy';
      if (deltaRatio >= 0.16) return 'left_mid';
      return 'left_light';
    }
    if (deltaRatio >= 0.5) return 'right_heavy';
    return 'right_light';
  }, [deltaRatio, weightDelta]);

  const scaleFramePosition = SCALE_FRAME_POSITION[activeScaleFrame];

  const unplacedTokens = round.tokens.filter((token) => !placedIds.includes(token.id));

  const isInsideDrop = (x: number, y: number) => {
    const dropRect = dropRef.current?.getBoundingClientRect();
    if (!dropRect) return false;
    return x >= dropRect.left && x <= dropRect.right && y >= dropRect.top && y <= dropRect.bottom;
  };

  const placeToken = (id: string) => {
    if (placedIds.includes(id)) return;
    setPlacedIds((previous) => [...previous, id]);
  };

  const removePlacedToken = (id: string) => {
    setPlacedIds((previous) => previous.filter((tokenId) => tokenId !== id));
  };

  useEffect(() => {
    if (currentGrams !== round.targetGrams) return;

    setSuccessPulse(true);
    const nextScore = XP + 350 + (roundIndex * 70);
    setScore(nextScore);

    const timeout = window.setTimeout(() => {
      setSuccessPulse(false);
      if (roundIndex >= TOTAL_ROUNDS - 1) {
        onVictory(scoreToStars(nextScore), nextScore);
        return;
      }

      const nextRoundIndex = roundIndex + 1;
      setRoundIndex(nextRoundIndex);
      setRound(buildRound(levelId, nextRoundIndex));
      setPlacedIds([]);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [currentGrams, levelId, onVictory, round.targetGrams, roundIndex, XP]);

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#07122b]">
      <div className="relative z-0 flex h-full w-full min-h-0 flex-col items-center justify-between px-4 pb-[calc(env(safe-area-inset-bottom)+4.8rem)] pt-1">
        <motion.div
          animate={successPulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="relative mt-[calc(clamp(3.2rem,7.5vh,4.8rem)+50px)] w-[min(54vw,15rem)] shrink-0 aspect-square"
        >
          <motion.div
            aria-hidden="true"
            animate={
              activeScaleFrame === 'balanced'
                ? { y: [0, -1.5, 0] }
                : { y: [0, -3, 0], rotate: successPulse ? [0, 1, -1, 0] : 0 }
            }
            transition={
              activeScaleFrame === 'balanced'
                ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            }
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${scaleSheet})`,
              backgroundSize: `${SCALE_FRAME_SIZE.columns * 100}% ${SCALE_FRAME_SIZE.rows * 100}%`,
              backgroundPosition: `${scaleFramePosition.x}% ${scaleFramePosition.y}%`,
              backgroundRepeat: 'no-repeat',
            }}
          />

          <div
            className={`absolute left-[14%] top-[17%] flex min-h-[16%] w-[23%] items-center justify-center rounded-[1.25rem] px-2 py-1.5 text-center ${
              successPulse ? 'bg-emerald-400/24' : 'bg-slate-950/30'
            }`}
          >
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/80">Target</div>
              <div className="text-[clamp(0.72rem,2vw,0.9rem)] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                {toKgLabel(round.targetGrams)}
              </div>
            </div>
          </div>

          <div
            ref={dropRef}
            className={`absolute left-[63%] top-[17%] h-[15%] w-[23%] -translate-x-1/2 rounded-[1.35rem] border-2 ${
              successPulse
                ? 'border-emerald-300 bg-emerald-300/20'
                : 'border-white/38 bg-white/8'
            }`}
          />

          <div className="absolute left-[63%] top-[17.6%] flex h-[14%] w-[23%] -translate-x-1/2 flex-wrap content-start justify-center gap-1 overflow-hidden px-1.5 pt-1">
            {placedTokens.map((token) => (
              <button
                key={token.id}
                onClick={() => removePlacedToken(token.id)}
                className="flex min-w-[2.9rem] flex-col items-center rounded-xl bg-[#0b2d68]/84 px-1.5 py-1 text-white ring-1 ring-white/30"
              >
                <span className="text-[10px] font-black leading-none">{getMeasurementDisplay(token.grams).primary}</span>
                <span className="mt-0.5 text-[8px] font-bold leading-none text-white/70">{getMeasurementDisplay(token.grams).secondary}</span>
              </button>
            ))}
          </div>

          <div className="absolute left-1/2 top-[64%] w-[58%] -translate-x-1/2 rounded-[1.3rem] bg-slate-950/32 px-3 py-2 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/80">Current Weight</div>
            <div className="text-lg font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              {toGramLabel(currentGrams)}
            </div>
            <div className="text-[10px] font-bold text-white/70">{toKgLabel(currentGrams)}</div>
          </div>
        </motion.div>

        <div className="relative w-full max-w-xl shrink-0 pb-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {unplacedTokens.map((token) => (
              <motion.button
                key={token.id}
                drag
                dragConstraints={rootRef}
                dragSnapToOrigin
                whileTap={{ scale: 1.08 }}
                onClick={() => placeToken(token.id)}
                onPointerUp={() => placeToken(token.id)}
                onDragEnd={(_, info) => {
                  if (isInsideDrop(info.point.x, info.point.y)) {
                    placeToken(token.id);
                  }
                }}
                className="flex h-14 min-w-[5.6rem] flex-col items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#fef08a,#f59e0b)] px-2.5 text-amber-900 shadow-[0_10px_16px_rgba(0,0,0,0.34)] ring-2 ring-yellow-100/70 md:h-[4.15rem] md:min-w-[6.2rem] md:px-3"
              >
                <span className="text-sm font-black leading-none md:text-base">{getMeasurementDisplay(token.grams).primary}</span>
                <span className="mt-1 text-[10px] font-bold leading-none text-amber-950/80 md:text-[11px]">
                  {getMeasurementDisplay(token.grams).secondary}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementForgeGame;
