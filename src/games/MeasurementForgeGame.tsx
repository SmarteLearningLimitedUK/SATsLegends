import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import weighScale from '../assets/weigh.png';
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
          className="relative mt-2 w-full max-w-[32rem] shrink-0 rounded-[2rem] border border-white/12 bg-transparent p-3 shadow-none md:max-w-[36rem]"
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

          <div
            className="relative mt-4 flex min-h-[12.8rem] w-full items-center justify-center rounded-[1.6rem] border border-white/14 bg-transparent"
          >
            <img
              src={weighScale}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              style={{ transform: 'translateY(30px) scale(1.12)' }}
            />
            <div
              ref={dropRef}
              className="absolute left-1/2 top-[18%] flex w-[72%] -translate-x-1/2 items-center justify-center gap-2 rounded-[1.1rem] border border-white/35 bg-white/10 px-2 py-1.5"
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
          </div>
        </motion.div>

        <div className="relative w-full max-w-[26rem] shrink-0 pb-1 md:max-w-[32rem]">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
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
                className="flex h-12 min-w-[5rem] flex-col items-center justify-center rounded-2xl bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.35))] px-2 text-white shadow-[0_10px_16px_rgba(0,0,0,0.28)] ring-2 ring-white/10 md:h-[4.05rem] md:min-w-[6rem] md:px-3"
              >
                <img src={token.gem} alt="" className="h-6 w-6 object-contain md:h-8 md:w-8" draggable={false} />
                <span className="text-sm font-black leading-none md:text-base">{getMeasurementDisplay(token.grams).primary}</span>
                <span className="mt-1 text-[10px] font-bold leading-none text-white/70 md:text-[11px]">
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
