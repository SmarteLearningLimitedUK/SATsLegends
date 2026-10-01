import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import conversionCanyonBackground from '../assets/maps/premium/conversion-canyon.webp';
import weighScale from '../assets/maps/backgroundsforgames/Scale Master.png';
import gemBlue from '../assets/place_value/jewels/diamond_blue.png';
import gemGreen from '../assets/place_value/jewels/diamond_green.png';
import gemPurple from '../assets/place_value/jewels/diamond_purple.png';
import gemRed from '../assets/place_value/jewels/diamond_red.png';
import gemYellow from '../assets/place_value/jewels/diamond_yellow.png';
import gemEmerald from '../assets/place_value/jewels/emerald.png';
import gemSapphire from '../assets/place_value/jewels/sapphire.png';
import { useTrimmedImageSource, useTrimmedImageSources } from '../utils/trimTransparentImage';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import './game-refinements.css';
import '../components/game-ui/arcade-amendments.css';

interface ConversionCanyonGameProps extends MiniGameShellContractProps {
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
  [100, 200, 300, 400, 500],
  [50, 100, 150, 200, 250, 500],
  [100, 250, 500, 750, 1000, 1250],
  [250, 500, 750, 1000, 1500, 2000],
  [500, 750, 1000, 1500, 2000, 2500],
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

const clampStage = (levelId: number) => Math.min(STAGE_DENOMS.length - 1, Math.max(0, levelId - 1));

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
  const stage = clampStage(levelId);
  const denoms = STAGE_DENOMS[stage];
  const minimumDistinctChoices = 5;
  const distinctChoices = shuffle(denoms).slice(0, Math.max(minimumDistinctChoices, Math.min(denoms.length, 6)));
  const requiredCount = stage <= 1 ? 2 : stage <= 3 ? 3 : 4;

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
  sessionState,
  sessionEvents,
}) => {
  const reducedMotion = useReducedMotion();
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<RoundData>(() => buildRound(levelId, 0));
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [XP, setScore] = useState(0);
  const [successPulse, setSuccessPulse] = useState(false);
  const [impact, setImpact] = useState(0);
  const [broken, setBroken] = useState(false);
  const [feedback, setFeedback] = useState<null | { tone: 'success' | 'error'; text: string }>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const placedIdsRef = useRef<string[]>([]);
  const resolvingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const victoryRef = useRef(onVictory);
  victoryRef.current = onVictory;
  const trimmedScaleImage = useTrimmedImageSource(weighScale);
  const trimmedGemImages = useTrimmedImageSources(GEM_IMAGES);
  const gemImageMap = useMemo(
    () => new Map(GEM_IMAGES.map((src, index) => [src, trimmedGemImages[index] ?? src])),
    [trimmedGemImages],
  );

  useEffect(() => {
    if (!presentRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    placedIdsRef.current = [];
    resolvingRef.current = false;
    setRoundIndex(0);
    setRound(buildRound(levelId, 0));
    setPlacedIds([]);
    setBroken(false);
    setImpact(0);
    setScore(0);
    setSuccessPulse(false);
    setFeedback(null);
  }, [levelId]);

  useLayoutEffect(() => {
    if (!isPresent) resolvingRef.current = true;
    return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); };
  }, [isPresent]);

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
    if (!presentRef.current || resolvingRef.current || sessionState?.paused || placedIdsRef.current.includes(id) || !tokenMap.has(id)) return;
    placedIdsRef.current = [...placedIdsRef.current, id];
    setPlacedIds(placedIdsRef.current);
    setImpact((value) => value + 1);
    setFeedback(null);
  };

  const removePlacedToken = (id: string) => {
    if (!presentRef.current || resolvingRef.current || sessionState?.paused) return;
    placedIdsRef.current = placedIdsRef.current.filter((tokenId) => tokenId !== id);
    const remaining = placedIdsRef.current.reduce((sum, tokenId) => sum + (tokenMap.get(tokenId)?.grams ?? 0), 0);
    if (remaining <= round.targetGrams) setBroken(false);
    setPlacedIds(placedIdsRef.current);
    setFeedback(null);
  };

  const handleResetScale = () => {
    if (!presentRef.current || resolvingRef.current || sessionState?.paused) return;
    placedIdsRef.current = [];
    setPlacedIds([]);
    setBroken(false);
    setSuccessPulse(false);
    setFeedback(null);
  };

  const handleSubmit = () => {
    if (!presentRef.current || resolvingRef.current || sessionState?.paused) return;
    const submittedGrams = placedIdsRef.current.reduce((total, id) => total + (tokenMap.get(id)?.grams ?? 0), 0);
    if (submittedGrams !== round.targetGrams) {
      const excess = submittedGrams - round.targetGrams;
      setBroken(excess > 0);
      setImpact((value) => value + 1);
      setFeedback({ tone: 'error', text: excess > 0
        ? `Scale snapped! Over by ${toGramLabel(excess)} (${toKgLabel(excess)}). Remove excess to repair.`
        : `${toGramLabel(-excess)} (${toKgLabel(-excess)}) short. Add more weight.` });
      return;
    }

    setBroken(false);
    setFeedback({ tone: 'success', text: 'Perfect balance! Shipment restored.' });
    setSuccessPulse(true);
    resolvingRef.current = true;
    const nextScore = XP + 350 + (roundIndex * 70);
    setScore(nextScore);
    sessionEvents?.onCorrectAnswer?.({ score: nextScore, metadata: { round: roundIndex + 1 } });
    sessionEvents?.onPuzzleComplete?.({ score: nextScore, metadata: { round: roundIndex + 1, totalRounds: TOTAL_ROUNDS } });

    timerRef.current = window.setTimeout(() => {
      if (!presentRef.current) return;
      setSuccessPulse(false);
      setFeedback(null);
      if (roundIndex >= TOTAL_ROUNDS - 1) {
        const stars = scoreToStars(nextScore);
        sessionEvents?.onGameComplete?.({ score: nextScore, stars });
        victoryRef.current(stars, nextScore);
        return;
      }

      const nextRoundIndex = roundIndex + 1;
      setRoundIndex(nextRoundIndex);
      setRound(buildRound(levelId, nextRoundIndex));
      setPlacedIds([]);
      placedIdsRef.current = [];
      resolvingRef.current = false;
    }, 700);
  };

  return (
    <div ref={rootRef} className="conversion-game arcade-conversion relative h-full w-full overflow-hidden bg-[#94b8d2]" data-conversion-tier={clampStage(levelId) + 1}>
      <img
        src={conversionCanyonBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-game-scene-image data-background-fit="contain"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.15),rgba(2,6,23,0.26))]"
      />
      <div className="relative z-10 flex h-full w-full min-h-0 flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.6rem)]">
          <GameQuestionCard
            title="Conversion Canyon"
            subtitle={feedback ? undefined : "Tap or drop weights onto the tray."}
            className="shrink-0"
            style={{ position: 'relative', top: 0, width: '100%', transform: 'none' }}
          >
            {feedback ? <span role="status" aria-live="polite">{feedback.text}</span> : <>Match <strong>{toKgLabel(round.targetGrams)}</strong> exactly.</>}
          </GameQuestionCard>

          <motion.div
            animate={successPulse && !reducedMotion ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 0.36, ease: 'easeOut' }}
            data-conversion-playfield="true"
            className="relative flex w-full max-w-[35rem] min-h-0 flex-1 items-center justify-center p-1 md:max-w-[40rem]"
          >
            <div className="conversion-scale-frame" data-conversion-scale data-conversion-broken={broken} data-conversion-target={round.targetGrams}>
              <motion.img
                  key={`scale-${impact}-${broken}`}
                  initial={reducedMotion ? false : { rotate: 0, y: 0, x: 0 }}
                  animate={reducedMotion ? { rotate: broken ? 12 : 0, y: broken ? 7 : 0 } : broken
                    ? { rotate: [0, -5, 4, 12], y: [0, 1, -2, 7] }
                    : currentGrams > round.targetGrams ? { rotate: [0, -2, 1, -1, 0], y: [0, 3, 1, 3, 0] }
                    : impact > 0 ? { rotate: [0, -2, 2, -1, 0], y: [0, 3, -1, 0] } : { rotate: 0, y: 0 }}
                  transition={{ duration: .48, repeat: !reducedMotion && !broken && currentGrams > round.targetGrams ? Infinity : 0 }}
                  src={trimmedScaleImage}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className={`pointer-events-none conversion-scale-art ${broken ? 'is-broken' : currentGrams > round.targetGrams ? 'is-straining' : impact > 0 ? 'is-loading' : ''}`}
                />
              {broken && <><svg className="conversion-crack" viewBox="0 0 100 150" aria-hidden="true"><path d="M65 0 L38 35 L62 54 L30 87 L51 102 L23 150" /></svg></>}
              <div className="conversion-load-meter" data-conversion-load={currentGrams}>
                <span>Load meter</span><strong>{toGramLabel(currentGrams)}</strong>
              </div>
              <div
                ref={dropRef}
                className="conversion-load-tray" data-conversion-tray
              >
                {placedTokens.length === 0 ? <span>Tap or drop weights here</span> : null}
                {placedTokens.map((token) => (
                  <button
                    key={token.id}
                    type="button" disabled={successPulse || Boolean(sessionState?.paused)}
                    aria-label={`Remove ${getMeasurementDisplay(token.grams).primary} weight`}
                    onClick={() => removePlacedToken(token.id)}
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
                    drag={!isPlaced && !successPulse && !sessionState?.paused}
                    dragConstraints={rootRef}
                    dragSnapToOrigin
                    whileTap={reducedMotion ? undefined : { scale: 1.03 }}
                    onClick={() => placeToken(token.id)}
                    onDragEnd={(_, info) => {
                      if (isInsideDrop(info.point.x, info.point.y)) {
                        placeToken(token.id);
                      }
                    }}
                    disabled={isPlaced || successPulse || Boolean(sessionState?.paused)}
                    aria-label={`Add ${getMeasurementDisplay(token.grams).primary} weight`}
                    data-conversion-token={token.id} data-token-grams={token.grams}
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
              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetScale}
                  disabled={successPulse || Boolean(sessionState?.paused)}
                  className="ui-button-secondary w-full rounded-[1.15rem] py-2.5 text-[0.78rem] font-black uppercase tracking-[0.14em]"
                >
                  {broken ? 'Repair & reset' : 'Reset weights'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={successPulse || Boolean(sessionState?.paused)}
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
