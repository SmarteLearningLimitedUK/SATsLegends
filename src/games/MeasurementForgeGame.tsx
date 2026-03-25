import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import scaleImage from '../assets/maps/scale.png';

interface MeasurementForgeGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
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

const STAGE_DENOMS: number[][] = [
  [50, 100, 200],
  [100, 200, 500],
  [100, 250, 500, 1000],
  [250, 500, 1000, 2000],
  [500, 1000, 2000, 5000],
  [1000, 2000, 5000, 10000],
];

const toKgLabel = (grams: number) => `${(grams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;

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
  const requiredCount = Math.min(6, 2 + stage);
  const distractorCount = Math.min(5, 2 + Math.floor(stage / 2));

  const required: number[] = Array.from({ length: requiredCount }, () => randomFrom(denoms));
  const targetGrams = required.reduce((sum, grams) => sum + grams, 0);

  const extras: number[] = [];
  while (extras.length < distractorCount) {
    const pick = randomFrom(denoms);
    const expectedRequiredOccurrences = required.filter((v) => v === pick).length;
    const existingOccurrences = extras.filter((v) => v === pick).length;
    if (existingOccurrences >= expectedRequiredOccurrences + 1) continue;
    extras.push(pick);
  }

  const all = shuffle([...required, ...extras]);
  const tokens: WeightToken[] = all.map((grams, index) => ({
    id: `${roundIndex}-${index}-${grams}-${Math.random().toString(36).slice(2, 7)}`,
    grams,
  }));

  return { targetGrams, tokens };
};

const scoreToStars = (score: number) => {
  if (score >= 2200) return 3;
  if (score >= 1400) return 2;
  return 1;
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
  const [score, setScore] = useState(0);
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
    const nextScore = score + 350 + (roundIndex * 70);
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
  }, [currentGrams, levelId, onVictory, round.targetGrams, roundIndex, score]);

  return (
    <div ref={rootRef} className="fixed inset-0 overflow-hidden bg-[#07122b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,227,92,0.25),rgba(7,18,43,0.92)_58%,rgba(4,9,24,0.98))]" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="relative mt-1 w-[min(94vw,34rem)] aspect-square">
          <img
            src={scaleImage}
            alt="Scale"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          />

          <div
            className={`absolute left-1/2 top-[52.5%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-2 py-2 text-center ${
              successPulse ? 'bg-emerald-400/28' : 'bg-black/24'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/85">Target</div>
            <div className="text-xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
              {toKgLabel(round.targetGrams)}
            </div>
            <div className="mt-1 text-[11px] font-bold text-white/85">
              {currentGrams.toLocaleString()} g
            </div>
          </div>

          <div
            ref={dropRef}
            className={`absolute left-1/2 top-[16.8%] h-[16%] w-[68%] -translate-x-1/2 rounded-[1.6rem] border-2 ${
              successPulse
                ? 'border-emerald-300 bg-emerald-300/18'
                : 'border-white/42 bg-white/6'
            }`}
          />

          <div className="absolute left-1/2 top-[17.5%] flex h-[15%] w-[66%] -translate-x-1/2 flex-wrap content-start justify-center gap-1.5 overflow-hidden px-2 pt-1">
            {placedTokens.map((token) => (
              <button
                key={token.id}
                onClick={() => removePlacedToken(token.id)}
                className="min-w-[2.7rem] rounded-full bg-[#0b2d68]/80 px-2 py-1 text-xs font-black text-white ring-1 ring-white/30"
              >
                {token.grams}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-xl pb-1">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {unplacedTokens.map((token) => (
              <motion.button
                key={token.id}
                drag
                dragConstraints={rootRef}
                dragSnapToOrigin
                whileTap={{ scale: 1.08 }}
                onDragEnd={(_, info) => {
                  if (isInsideDrop(info.point.x, info.point.y)) {
                    placeToken(token.id);
                  }
                }}
                className="h-14 min-w-[4.2rem] rounded-2xl bg-[linear-gradient(180deg,#fef08a,#f59e0b)] px-3 text-lg font-black text-amber-900 shadow-[0_10px_16px_rgba(0,0,0,0.34)] ring-2 ring-yellow-100/70"
              >
                {token.grams}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementForgeGame;
