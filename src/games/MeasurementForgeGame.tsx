import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import weighScale from '../assets/maps/backgroundsforgames/Scale Master.png';
import gemBlue from '../assets/place_value/jewels/diamond_blue.png';
import gemGreen from '../assets/place_value/jewels/diamond_green.png';
import gemPurple from '../assets/place_value/jewels/diamond_purple.png';
import gemRed from '../assets/place_value/jewels/diamond_red.png';
import gemYellow from '../assets/place_value/jewels/diamond_yellow.png';
import gemEmerald from '../assets/place_value/jewels/emerald.png';
import gemSapphire from '../assets/place_value/jewels/sapphire.png';

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
  gem: string;
}

interface RoundData {
  targetGrams: number;
  tokens: WeightToken[];
}

const TOTAL_ROUNDS = 5;
const GEM_IMAGES = [gemBlue, gemGreen, gemPurple, gemRed, gemYellow, gemEmerald, gemSapphire];

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

const useAlphaKeyImage = (src: string, threshold = 210) => {
  const [processed, setProcessed] = useState(src);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      setProcessed(src);
      return;
    }
    let isActive = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;

    image.onload = () => {
      if (!isActive) return;
      const canvas = document.createElement('canvas');
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        setProcessed(src);
        return;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessed(src);
        return;
      }
      try {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const brightness = (red + green + blue) / 3;
          const lowSaturation = max - min <= 20;

          if (brightness >= threshold && lowSaturation) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setProcessed(canvas.toDataURL('image/png'));
      } catch {
        setProcessed(src);
      }
    };

    image.onerror = () => {
      if (isActive) setProcessed(src);
    };

    return () => {
      isActive = false;
    };
  }, [src, threshold]);

  return processed;
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
  const shuffledGems = shuffle(GEM_IMAGES);
  const tokens: WeightToken[] = all.map((grams, index) => ({
    id: `${roundIndex}-${index}-${grams}-${Math.random().toString(36).slice(2, 7)}`,
    grams,
    gem: shuffledGems[index % shuffledGems.length],
  }));

  return { targetGrams, tokens };
};

const scoreToStars = (XP: number) => {
  if (XP >= 2200) return 3;
  if (XP >= 1400) return 2;
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
  const [XP, setScore] = useState(0);
  const [successPulse, setSuccessPulse] = useState(false);
  const [feedback, setFeedback] = useState<null | { tone: 'success' | 'error'; text: string }>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const alphaKeyedScale = useAlphaKeyImage(weighScale);

  useEffect(() => {
    setRoundIndex(0);
    setRound(buildRound(levelId, 0));
    setPlacedIds([]);
    setScore(0);
    setSuccessPulse(false);
    setFeedback(null);
  }, [levelId]);

  const tokenMap = useMemo(() => new Map(round.tokens.map((token) => [token.id, token])), [round.tokens]);

  const placedTokens = placedIds
    .map((id) => tokenMap.get(id))
    .filter((token): token is WeightToken => !!token);

  const currentGrams = placedTokens.reduce((sum, token) => sum + token.grams, 0);
  const allTokens = round.tokens;

  const isInsideDrop = (x: number, y: number) => {
    const dropRect = dropRef.current?.getBoundingClientRect();
    if (!dropRect) return false;
    return x >= dropRect.left && x <= dropRect.right && y >= dropRect.top && y <= dropRect.bottom;
  };

  const placeToken = (id: string) => {
    if (placedIds.includes(id)) return;
    setPlacedIds((previous) => [...previous, id]);
    setFeedback(null);
  };

  const removePlacedToken = (id: string) => {
    setPlacedIds((previous) => previous.filter((tokenId) => tokenId !== id));
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (successPulse) return;
    if (currentGrams !== round.targetGrams) {
      setFeedback({ tone: 'error', text: 'Not quite. Adjust the weights and try again.' });
      return;
    }

    setFeedback({ tone: 'success', text: 'Perfect weight! Sending the order.' });
    setSuccessPulse(true);
    const nextScore = XP + 350 + (roundIndex * 70);
    setScore(nextScore);

    window.setTimeout(() => {
      setSuccessPulse(false);
      setFeedback(null);
      if (roundIndex >= TOTAL_ROUNDS - 1) {
        onVictory(scoreToStars(nextScore), nextScore);
        return;
      }

      const nextRoundIndex = roundIndex + 1;
      setRoundIndex(nextRoundIndex);
      setRound(buildRound(levelId, nextRoundIndex));
      setPlacedIds([]);
    }, 700);
  };

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#07122b]">
      <div className="relative z-0 flex h-full w-full min-h-0 flex-col items-center justify-start gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+3.4rem)] pt-[calc(env(safe-area-inset-top)+0.6rem)]">
        <div className="w-full max-w-[34rem] rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,24,45,0.72),rgba(8,14,28,0.78))] px-4 py-2 text-center shadow-[0_16px_30px_rgba(2,6,23,0.35)]">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Conversion Canyon</div>
          <div className="mt-1 text-[clamp(1rem,3.8vw,1.35rem)] font-black text-white">
            The armoury is requesting weights for the catapults. We need to make {toKgLabel(round.targetGrams)}.
          </div>
          <div className="mt-1 text-[11px] font-semibold text-cyan-100/90">
            Use the weights available to meet the target amount.
          </div>
        </div>

        <motion.div
          animate={successPulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 0.36, ease: 'easeOut' }}
          className="relative mt-2 w-full max-w-[26rem] shrink-0 p-1 md:max-w-[30rem]"
        >
          <div
            className={`flex w-full items-center justify-between rounded-[1.35rem] px-3 py-2 text-center ${
              successPulse ? 'bg-emerald-400/18' : 'bg-slate-950/24'
            }`}
          >
            <div className="text-left">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/80">Target</div>
              <div className="text-[clamp(0.9rem,2.2vw,1.1rem)] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                {toKgLabel(round.targetGrams)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/80">Current</div>
              <div className="text-[clamp(0.9rem,2.2vw,1.1rem)] font-black leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                {toGramLabel(currentGrams)}
              </div>
            </div>
          </div>

          <div className="relative mt-4 flex min-h-[10.5rem] w-full items-center justify-center">
            <img
              src={alphaKeyedScale}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-x-0 top-0 h-full w-full object-contain object-center"
              style={{ transform: 'translateY(6px) scale(0.84)' }}
            />
            <div
              ref={dropRef}
              className="absolute left-1/2 top-[8%] flex w-[68%] -translate-x-1/2 items-center justify-center gap-2 rounded-[1.1rem] px-2 py-1.5"
            >
              {placedTokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => removePlacedToken(token.id)}
                  className="relative z-10 flex min-w-[2.7rem] flex-col items-center rounded-xl bg-[#0b2d68]/80 px-1.5 py-1 text-white ring-1 ring-white/30"
                >
                  <img src={token.gem} alt="" className="h-6 w-6 object-contain" draggable={false} />
                  <span className="text-[10px] font-black leading-none">{getMeasurementDisplay(token.grams).primary}</span>
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-[11%] left-1/2 z-20 -translate-x-1/2">
              <div className="flex min-w-[7.5rem] flex-col items-center rounded-[0.8rem] border border-cyan-200/50 bg-[#07162b]/90 px-3 py-1.5 text-center shadow-[0_10px_18px_rgba(2,6,23,0.55)]">
                <div className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/75">Digital Readout</div>
                <div className="mt-0.5 font-mono text-[1.05rem] font-black tracking-[0.12em] text-emerald-200">
                  {toGramLabel(currentGrams)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="relative w-full max-w-[26rem] shrink-0 pb-1 md:max-w-[32rem]">
          <div className="flex flex-wrap items-center justify-center gap-2.5 pb-16">
            {allTokens.map((token) => {
              const isPlaced = placedIds.includes(token.id);
              return (
                <motion.button
                  key={token.id}
                  drag={!isPlaced}
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
                  disabled={isPlaced}
                  className={`flex h-12 min-w-[5rem] flex-col items-center justify-center rounded-2xl px-2 text-white shadow-[0_10px_16px_rgba(0,0,0,0.28)] ring-2 ring-white/10 md:h-[4.05rem] md:min-w-[6rem] md:px-3 ${
                    isPlaced
                      ? 'bg-slate-900/30 opacity-40'
                      : 'bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.35))]'
                  }`}
                >
                  <img src={token.gem} alt="" className="h-6 w-6 object-contain md:h-8 md:w-8" draggable={false} />
                  <span className="text-sm font-black leading-none md:text-base">{getMeasurementDisplay(token.grams).primary}</span>
                  <span className="mt-1 text-[10px] font-bold leading-none text-white/70 md:text-[11px]">
                    {getMeasurementDisplay(token.grams).secondary}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-[3.4rem] flex flex-col items-center gap-2">
            {feedback ? (
              <div
                className={`w-full rounded-[1.1rem] border px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.12em] shadow-[0_10px_20px_rgba(2,6,23,0.2)] ${
                  feedback.tone === 'success'
                    ? 'border-emerald-200/60 bg-emerald-400/20 text-emerald-100'
                    : 'border-rose-200/60 bg-rose-400/15 text-rose-100'
                }`}
              >
                {feedback.text}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={successPulse}
              className="w-full rounded-[1.35rem] border border-amber-200/60 bg-[linear-gradient(180deg,#f7d47c_0%,#f5b72e_100%)] py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-900 shadow-[0_10px_20px_rgba(2,6,23,0.32)] disabled:opacity-60"
            >
              Submit Weights
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementForgeGame;
