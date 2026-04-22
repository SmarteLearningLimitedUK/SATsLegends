import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import conversionCanyonBackground from '../assets/maps/backgroundsforgames/conversion canyon.jpg';
import weighScale from '../assets/maps/backgroundsforgames/Scale Master.png';
import gemBlue from '../assets/place_value/jewels/diamond_blue.png';
import gemGreen from '../assets/place_value/jewels/diamond_green.png';
import gemPurple from '../assets/place_value/jewels/diamond_purple.png';
import gemRed from '../assets/place_value/jewels/diamond_red.png';
import gemYellow from '../assets/place_value/jewels/diamond_yellow.png';
import gemEmerald from '../assets/place_value/jewels/emerald.png';
import gemSapphire from '../assets/place_value/jewels/sapphire.png';
import { useTrimmedImageSource, useTrimmedImageSources } from '../utils/trimTransparentImage';

interface ConversionCanyonGameProps {
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

const buildRound = (levelId: number, roundIndex: number): RoundData => {
  const stage = clampStage(levelId, roundIndex);
  const denoms = STAGE_DENOMS[stage];
  const minimumDistinctChoices = 5;
  const distinctChoices = shuffle(denoms).slice(0, Math.max(minimumDistinctChoices, Math.min(denoms.length, 6)));
  const requiredCount = Math.min(4, Math.max(2, 2 + Math.floor(stage / 2)));

  const required = shuffle(distinctChoices).slice(0, requiredCount);
  const targetGrams = required.reduce((sum, grams) => sum + grams, 0);

  const distractorPool = distinctChoices.filter((value) => !required.includes(value));
  const extraCopiesCount = stage >= 4 ? 0 : stage >= 2 ? 1 : 2;
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

const ConversionCanyonGame: React.FC<ConversionCanyonGameProps> = ({
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
  const trimmedScaleImage = useTrimmedImageSource(weighScale);
  const trimmedGemImages = useTrimmedImageSources(GEM_IMAGES);
  const gemImageMap = useMemo(
    () => new Map(GEM_IMAGES.map((src, index) => [src, trimmedGemImages[index] ?? src])),
    [trimmedGemImages],
  );

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

  const handleResetScale = () => {
    setPlacedIds([]);
    setSuccessPulse(false);
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (successPulse) return;
    if (currentGrams !== round.targetGrams) {
      setFeedback({ tone: 'error', text: 'Still unbalanced. Adjust the weights and try again.' });
      return;
    }

    setFeedback({ tone: 'success', text: 'Perfect balance! Shipment restored.' });
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
      <img
        src={conversionCanyonBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_18%,rgba(15,23,42,0.25),transparent_52%),linear-gradient(180deg,rgba(2,6,23,0.45),rgba(2,6,23,0.7))]"
      />
      <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
          <div className="w-full max-w-[34rem] rounded-[1.35rem] border border-white/12 bg-[linear-gradient(180deg,rgba(12,24,45,0.8),rgba(8,14,28,0.86))] px-4 py-2 text-center shadow-[0_16px_30px_rgba(2,6,23,0.35)]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Conversion Canyon</div>
            <div className="mt-1 text-[clamp(1rem,3.8vw,1.35rem)] font-black text-white">
              The Monster Minds have disrupted the canyon supplies. Rebuild the shipment so it totals {toKgLabel(round.targetGrams)}.
            </div>
            <div className="mt-1 text-[11px] font-semibold text-cyan-100/90">
              Use the available weights to match the target exactly.
            </div>
          </div>

          <motion.div
            animate={successPulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 0.36, ease: 'easeOut' }}
            className="relative flex w-full max-w-[35rem] flex-1 min-h-[19rem] items-center justify-center p-1 md:max-w-[40rem]"
          >
            <div className="relative flex min-h-[19rem] w-full items-center justify-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-full max-w-[26rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                <img
                  src={trimmedScaleImage}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none relative z-10 h-auto w-full object-contain object-center drop-shadow-[0_18px_24px_rgba(2,6,23,0.38)]"
                />
                <div className="pointer-events-none absolute left-1/2 top-[58%] z-20 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex min-w-[8.4rem] flex-col items-center rounded-[0.95rem] border border-cyan-200/58 bg-[linear-gradient(180deg,rgba(7,22,43,0.94),rgba(4,10,24,0.98))] px-3 py-1.5 text-center shadow-[0_10px_18px_rgba(2,6,23,0.55)]">
                    <div className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-100/80">Load Meter</div>
                    <div className="mt-0.5 font-mono text-[1.1rem] font-black tracking-[0.12em] text-emerald-200">
                      {toGramLabel(currentGrams)}
                    </div>
                  </div>
                </div>
              </div>
              <div
                ref={dropRef}
                className="absolute left-1/2 top-[51%] z-20 flex min-h-[4.5rem] w-[70%] -translate-x-1/2 items-center justify-center gap-2 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.16),rgba(2,6,23,0.28))] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                {placedTokens.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => removePlacedToken(token.id)}
                    className="relative z-10 flex min-w-[2.4rem] flex-col items-center rounded-xl bg-[linear-gradient(180deg,rgba(11,45,104,0.92),rgba(7,26,61,0.96))] px-1 py-0.5 text-white ring-1 ring-white/28"
                  >
                    <img src={gemImageMap.get(token.gem) ?? token.gem} alt="" className="h-5 w-5 object-contain" draggable={false} />
                    <span className="text-[9px] font-black leading-none">{getMeasurementDisplay(token.grams).primary}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="w-full shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-2">
          <div className="mx-auto w-full max-w-[32rem] rounded-[1.6rem] border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(8,15,28,0.78))] p-2 shadow-[0_18px_44px_rgba(2,6,23,0.55)] backdrop-blur-sm">
            <div className="grid grid-cols-4 gap-2 px-1 pb-1 pt-1">
              {allTokens.map((token) => {
                const isPlaced = placedIds.includes(token.id);
                return (
                  <motion.button
                    key={token.id}
                    drag={!isPlaced}
                    dragConstraints={rootRef}
                    dragSnapToOrigin
                    whileTap={{ scale: 1.06 }}
                    onClick={() => placeToken(token.id)}
                    onPointerUp={() => placeToken(token.id)}
                    onDragEnd={(_, info) => {
                      if (isInsideDrop(info.point.x, info.point.y)) {
                        placeToken(token.id);
                      }
                    }}
                    disabled={isPlaced}
                    className={`flex h-[4.25rem] w-full flex-col items-center justify-center rounded-xl px-1 text-white shadow-[0_10px_16px_rgba(0,0,0,0.28)] ring-2 ring-white/10 touch-none ${
                      isPlaced
                        ? 'bg-slate-900/30 opacity-40'
                        : 'bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.35))]'
                    }`}
                  >
                    <img src={gemImageMap.get(token.gem) ?? token.gem} alt="" className="h-6 w-6 object-contain" draggable={false} />
                    <span className="text-[11px] font-black leading-none">{getMeasurementDisplay(token.grams).primary}</span>
                    <span className="mt-0.5 text-[9px] font-bold leading-none text-white/70">
                      {getMeasurementDisplay(token.grams).secondary}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="game-submit-dock mt-2 flex flex-col items-center gap-2 px-1">
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
              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetScale}
                  className="ui-button-secondary w-full rounded-[1.15rem] py-2.5 text-[0.78rem] font-black uppercase tracking-[0.14em]"
                >
                  Reset Weights
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={successPulse}
                  className="ui-button-primary w-full rounded-[1.15rem] py-2.5 text-[0.78rem] font-black uppercase tracking-[0.16em] disabled:opacity-60"
                >
                  Submit Shipment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionCanyonGame;
