import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, CircleDollarSign } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AssetIcon from '../components/AssetIcon';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { triggerHaptic } from '../haptics';
import simplifySprintBackground from '../assets/maps/backgroundsforgames/simplifysprint.jpg';
import successRoundBackground from '../assets/end of round screen/success screen.jpg';
import failureRoundBackground from '../assets/end of round screen/failure screen.jpg';

interface SimplifySprintGameProps {
  levelId: number;
  miniGameLevel?: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface FractionPair {
  numerator: number;
  denominator: number;
}

type QuestionKind = 'fluency' | 'reasoning';

interface RoundQuestion {
  id: string;
  prompt: FractionPair;
  answer: FractionPair;
  options: FractionPair[];
  kind: QuestionKind;
}

type RoundResultState = {
  kind: 'success' | 'failure';
  title: string;
  subtitle: string;
  statLabel: string;
  statValue: string;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return Math.max(1, x);
};

const sameFraction = (a: FractionPair, b: FractionPair) => a.numerator === b.numerator && a.denominator === b.denominator;

const simplify = (pair: FractionPair): FractionPair => {
  const d = gcd(pair.numerator, pair.denominator);
  return {
    numerator: Math.floor(pair.numerator / d),
    denominator: Math.floor(pair.denominator / d),
  };
};

const fractionKey = (pair: FractionPair) => `${pair.numerator}/${pair.denominator}`;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const makeQuestion = (level: number, round: number): RoundQuestion => {
  const maxDen = Math.min(12 + level + round, 28);
  let baseDen = randomInt(2, Math.max(4, maxDen));
  let baseNum = randomInt(1, Math.max(2, baseDen - 1));
  if (level >= 5 && Math.random() > 0.58) {
    baseNum = randomInt(baseDen + 1, Math.max(baseDen + 2, baseDen * 2));
  }

  const base = simplify({ numerator: baseNum, denominator: baseDen });
  const multiplier = randomInt(2, Math.min(9, 3 + Math.floor(level / 2)));
  const prompt = {
    numerator: base.numerator * multiplier,
    denominator: base.denominator * multiplier,
  };
  const answer = simplify(prompt);

  const distractorPool: FractionPair[] = [
    { numerator: Math.max(1, answer.numerator + 1), denominator: answer.denominator },
    { numerator: Math.max(1, answer.numerator - 1), denominator: answer.denominator },
    { numerator: answer.numerator, denominator: Math.max(2, answer.denominator + 1) },
    { numerator: answer.numerator, denominator: Math.max(2, answer.denominator - 1) },
    simplify({ numerator: Math.max(1, prompt.numerator - gcd(prompt.numerator, prompt.denominator)), denominator: prompt.denominator }),
    simplify({ numerator: prompt.numerator, denominator: Math.max(2, prompt.denominator - gcd(prompt.numerator, prompt.denominator)) }),
  ]
    .filter((option) => option.denominator !== 0 && !sameFraction(option, answer))
    .map((option) => simplify(option));

  const options = shuffle(
    [answer, ...shuffle(distractorPool).filter((option, idx, arr) => (
      arr.findIndex((candidate) => fractionKey(candidate) === fractionKey(option)) === idx
    )).slice(0, 3)],
  );

  while (options.length < 4) {
    const fallback = simplify({
      numerator: Math.max(1, answer.numerator + randomInt(-2, 2)),
      denominator: Math.max(2, answer.denominator + randomInt(-2, 2)),
    });
    if (!options.some((option) => sameFraction(option, fallback))) {
      options.push(fallback);
    }
  }

  return {
    id: `${Date.now()}-${round}-${Math.random().toString(36).slice(2, 7)}`,
    prompt,
    answer,
    options: shuffle(options),
    kind: 'fluency',
  };
};

const getFactorChoices = (pair: FractionPair): number[] => {
  const valid = Array.from({ length: 8 }, (_, index) => index + 2)
    .filter((factor) => pair.numerator % factor === 0 && pair.denominator % factor === 0);
  const distractors = shuffle(
    Array.from({ length: 8 }, (_, index) => index + 2)
      .filter((factor) => !valid.includes(factor)),
  );

  const merged = [...valid, ...distractors].slice(0, 4);
  return shuffle(merged);
};

const scoreToStars = (accuracy: number, lives: number, timeLeft: number) => {
  if (accuracy >= 0.9 && lives >= 3 && timeLeft >= 14) return 3;
  if (accuracy >= 0.65 && lives >= 2) return 2;
  return 1;
};

const FractionView: React.FC<{ pair: FractionPair; className?: string }> = ({ pair, className = '' }) => (
  <div className={`inline-flex flex-col items-center justify-center ${className}`.trim()}>
    <span className="text-[clamp(1.65rem,4vw,2.9rem)] font-black leading-none">{pair.numerator}</span>
    <span className="my-1 h-[3px] w-[72%] rounded-full bg-white/95" />
    <span className="text-[clamp(1.65rem,4vw,2.9rem)] font-black leading-none">{pair.denominator}</span>
  </div>
);

const SimplifySprintGame: React.FC<SimplifySprintGameProps> = ({
  levelId,
  miniGameLevel,
  avatarId: _avatarId,
  useSharedTopHud = false,
  isBoss: _isBoss = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const resolvedLevel = useMemo(
    () => Math.max(1, Math.min(10, miniGameLevel || levelId || 1)),
    [levelId, miniGameLevel],
  );
  const totalRounds = useMemo(() => Math.min(12, 6 + Math.floor(resolvedLevel / 2)), [resolvedLevel]);
  const initialTime = useMemo(() => Math.max(36, 64 - (resolvedLevel * 2)), [resolvedLevel]);

  const [roundNumber, setRoundNumber] = useState(1);
  const [question, setQuestion] = useState<RoundQuestion>(() => makeQuestion(resolvedLevel, 1));
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [XP, setScore] = useState(0);
  const [lives, setLives] = useState(4);
  const [attempts, setAttempts] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [currentPair, setCurrentPair] = useState<FractionPair>(() => makeQuestion(resolvedLevel, 1).prompt);
  const [startPair, setStartPair] = useState<FractionPair>(() => makeQuestion(resolvedLevel, 1).prompt);
  const [fractionShake, setFractionShake] = useState(false);
  const [fractionPulseKey, setFractionPulseKey] = useState(0);
  const [roundResult, setRoundResult] = useState<RoundResultState | null>(null);

  const scoreRef = useRef(0);
  const endedRef = useRef(false);
  const roundResultTimerRef = useRef<number | null>(null);
  scoreRef.current = XP;

  const clearRoundResultTimer = useCallback(() => {
    if (roundResultTimerRef.current !== null) {
      window.clearTimeout(roundResultTimerRef.current);
      roundResultTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearRoundResultTimer();
    const initialQuestion = makeQuestion(resolvedLevel, 1);
    endedRef.current = false;
    setRoundNumber(1);
    setQuestion(initialQuestion);
    setTimeLeft(initialTime);
    setScore(0);
    setLives(4);
    setAttempts(0);
    setCorrectAnswers(0);
    setLocked(false);
    setFeedback(null);
    setCurrentPair(initialQuestion.prompt);
    setStartPair(initialQuestion.prompt);
    setFractionShake(false);
    setFractionPulseKey(0);
    setRoundResult(null);
  }, [clearRoundResultTimer, initialTime, resolvedLevel]);

  useEffect(() => {
    setCurrentPair(question.prompt);
    setStartPair(question.prompt);
  }, [question]);

  useEffect(() => () => {
    clearRoundResultTimer();
  }, [clearRoundResultTimer]);

  useEffect(() => {
    if (endedRef.current) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!endedRef.current) {
            endedRef.current = true;
            clearRoundResultTimer();
            setFeedback(null);
            setRoundResult({
              kind: 'failure',
              title: 'Time Up',
              subtitle: 'The sprint ran out before the fraction was simplified.',
              statLabel: 'Final XP',
              statValue: `${scoreRef.current}`,
            });
            roundResultTimerRef.current = window.setTimeout(() => onGameOver(scoreRef.current), 1400);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [clearRoundResultTimer, onGameOver]);

  const factorChoices = useMemo(() => getFactorChoices(currentPair), [currentPair]);
  const startGcd = useMemo(() => gcd(startPair.numerator, startPair.denominator), [startPair]);
  const currentGcd = useMemo(() => gcd(currentPair.numerator, currentPair.denominator), [currentPair]);
  const simplifyProgress = startGcd <= 1 ? 1 : Math.max(0, Math.min(1, 1 - (currentGcd - 1) / (startGcd - 1)));

  const handleFactor = (factor: number) => {
    if (locked || endedRef.current) return;
    setLocked(true);
    const isValid = currentPair.numerator % factor === 0 && currentPair.denominator % factor === 0;

    if (!isValid) {
      const nextAttempts = attempts + 1;
      const nextLives = lives - 1;
      setAttempts(nextAttempts);
      setLives(nextLives);
      setFeedback({ tone: 'error', text: `${factor} will not simplify both numbers.` });
      setFractionShake(true);
      triggerHaptic('error');

      if (nextLives <= 0) {
        endedRef.current = true;
        clearRoundResultTimer();
        setFeedback(null);
        setRoundResult({
          kind: 'failure',
          title: 'Sprint Failed',
          subtitle: 'You ran out of lives on this fraction.',
          statLabel: 'Final XP',
          statValue: `${XP}`,
        });
        roundResultTimerRef.current = window.setTimeout(() => onGameOver(XP), 1400);
        return;
      }

      window.setTimeout(() => {
        setFeedback(null);
        setLocked(false);
        setFractionShake(false);
      }, 460);
      return;
    }

    const reduced = {
      numerator: currentPair.numerator / factor,
      denominator: currentPair.denominator / factor,
    };

    setCurrentPair(reduced);
    setFractionPulseKey((prev) => prev + 1);
    triggerHaptic('success');

    if (!sameFraction(reduced, question.answer)) {
      setFeedback({ tone: 'success', text: `Nice. ${factor} works. Keep reducing.` });
      window.setTimeout(() => {
        setFeedback(null);
        setLocked(false);
      }, 420);
      return;
    }

    const nextAttempts = attempts + 1;
    const awarded = 100 + Math.max(0, Math.floor(timeLeft * 0.8)) + (resolvedLevel * 12);
    const nextScore = XP + awarded;
    const nextCorrect = correctAnswers + 1;
    const isFinalRound = roundNumber >= totalRounds;
    const accuracy = nextAttempts > 0 ? nextCorrect / nextAttempts : 1;
    const stars = scoreToStars(accuracy, lives, timeLeft);

    setAttempts(nextAttempts);
    setScore(nextScore);
    setCorrectAnswers(nextCorrect);
    setFeedback(null);

    clearRoundResultTimer();
    setRoundResult({
      kind: 'success',
      title: isFinalRound ? 'Sprint Cleared' : 'Sprint Cleared',
      subtitle: isFinalRound
        ? 'You simplified the final fraction.'
        : 'Brain power collected. Next fraction is loading.',
      statLabel: isFinalRound ? 'Final XP' : 'XP Earned',
      statValue: isFinalRound ? `${nextScore}` : `+${awarded}`,
    });

    if (isFinalRound) {
      endedRef.current = true;
      roundResultTimerRef.current = window.setTimeout(() => onVictory(stars, nextScore), 1400);
      return;
    }

    roundResultTimerRef.current = window.setTimeout(() => {
      const nextRound = roundNumber + 1;
      const nextQuestion = makeQuestion(resolvedLevel, nextRound);
      setRoundResult(null);
      setRoundNumber(nextRound);
      setQuestion(nextQuestion);
      setFeedback(null);
      setLocked(false);
    }, 1400);
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none text-white">
      <GameplaySceneBackdrop
        gameType="fraction_match"
        backgroundOverride={simplifySprintBackground}
        className="opacity-[0.98]"
      />

      {!useSharedTopHud && (
        <div className="absolute left-0 right-0 z-30 flex items-center justify-between px-3 py-2 md:px-5" style={{ top: 'calc(env(safe-area-inset-top) + 2px)' }}>
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/45 bg-[#0a1f56]/88 shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-cyan-100" />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-cyan-200/45 bg-[#0a1f56]/92 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.45)]">
            <AssetIcon name="timer" className="h-4 w-4" />
            <span className="text-xs font-black tabular-nums">{timeLeft}s</span>
            <span className="h-4 w-px bg-cyan-100/35" />
            <CircleDollarSign className="h-4 w-4 text-yellow-300" />
            <span className="text-xs font-black tabular-nums">{XP}</span>
          </div>
        </div>
      )}

      <div
        className={`relative z-20 flex h-full w-full flex-col items-center justify-start px-4 pb-[calc(env(safe-area-inset-bottom)+4.9rem)] ${
          useSharedTopHud
            ? 'pt-[calc(env(safe-area-inset-top)+5.45rem)]'
            : 'pt-[calc(env(safe-area-inset-top)+3.9rem)]'
        }`}
      >
        <div className="w-full max-w-[44rem] px-1">
          <div className="mt-2">
            <GameQuestionCard title="Simplify Sprint" className="max-w-[44rem]">
              Reduce the fraction to its smallest form by tapping the correct factor.
            </GameQuestionCard>
          </div>
        </div>

        <div className="mt-3 flex w-full max-w-[44rem] flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(15,118,110,0.32),rgba(30,64,175,0.34),rgba(15,23,42,0.86))] px-4 py-5 shadow-[0_22px_50px_rgba(0,0,0,0.45)]">
          <div className="flex w-full items-center gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/80">Simplify meter</div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-950/70">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300"
                  animate={{ width: `${simplifyProgress * 100}%` }}
                />
              </div>
            </div>
          </div>

          <motion.div
            animate={fractionShake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.34, ease: 'easeInOut' }}
            className="relative mt-2 rounded-[1.7rem] border-2 border-cyan-100/50 bg-gradient-to-b from-cyan-400/95 via-sky-500/95 to-indigo-700/95 px-10 py-6 shadow-[0_18px_34px_rgba(0,0,0,0.5)]"
          >
            <motion.div
              className="absolute inset-0 rounded-[1.7rem] border border-cyan-200/30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]"
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              key={`${question.id}-${fractionKey(currentPair)}-${fractionPulseKey}`}
              initial={{ scale: 0.94, opacity: 0.86 }}
              animate={{ scale: [1, 1.1, 1], opacity: 1 }}
              transition={{ duration: 0.34, ease: 'easeOut' }}
              className="relative"
            >
              <FractionView pair={currentPair} />
            </motion.div>
          </motion.div>

          <div className="rounded-full border border-sky-200/40 bg-[linear-gradient(180deg,rgba(14,116,144,0.28),rgba(15,23,42,0.78))] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-50">
            Reduce until it cannot simplify further
          </div>
        </div>

        <div className="mt-4 grid w-full max-w-[760px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {factorChoices.map((factor) => (
            <motion.button
              key={`${question.id}-factor-${factor}-${fractionKey(currentPair)}`}
              type="button"
              whileTap={{ scale: 0.97 }}
              disabled={locked}
              onClick={() => handleFactor(factor)}
              className="ui-button-secondary rounded-[1.1rem] px-2 py-4 disabled:opacity-70"
            >
              <span className="text-[clamp(1.1rem,2.7vw,1.7rem)] font-black uppercase tracking-[0.1em] text-cyan-50">
                ÷ {factor}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className={`mt-3 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                feedback.tone === 'success'
                  ? 'border-emerald-300/65 bg-emerald-300/20 text-emerald-50'
                  : 'border-rose-300/65 bg-rose-300/20 text-amber-50'
              }`}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {roundResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-hidden"
            >
              <div className="absolute inset-0">
                <img
                  src={roundResult.kind === 'success' ? successRoundBackground : failureRoundBackground}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div
                  className={`absolute inset-0 ${
                    roundResult.kind === 'success'
                      ? 'bg-[linear-gradient(180deg,rgba(4,18,45,0.28),rgba(2,6,23,0.68))]'
                      : 'bg-[linear-gradient(180deg,rgba(35,8,16,0.22),rgba(2,6,23,0.76))]'
                  }`}
                />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
              </div>

              <div className="relative flex h-full w-full items-center justify-center px-4 py-6">
                <motion.div
                  initial={{ scale: 0.92, y: 16 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                  className={`w-full max-w-[24rem] overflow-hidden rounded-[2rem] border px-5 py-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md ${
                    roundResult.kind === 'success'
                      ? 'border-emerald-200/38 bg-[linear-gradient(180deg,rgba(6,39,35,0.78),rgba(5,15,32,0.9))]'
                      : 'border-rose-200/34 bg-[linear-gradient(180deg,rgba(54,13,24,0.78),rgba(15,11,18,0.92))]'
                  }`}
                >
                  <div className={`inline-flex rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${
                    roundResult.kind === 'success'
                      ? 'border-emerald-200/45 bg-emerald-200/16 text-emerald-50'
                      : 'border-rose-200/45 bg-rose-200/16 text-rose-50'
                  }`}>
                    {roundResult.kind === 'success' ? 'Success' : 'Failure'}
                  </div>

                  <h2 className="mt-4 text-[clamp(2.25rem,9vw,3.6rem)] font-black leading-none text-white drop-shadow-[0_6px_16px_rgba(2,6,23,0.52)]">
                    {roundResult.title}
                  </h2>

                  <p className="mt-3 text-[0.95rem] font-semibold leading-snug text-white/88">
                    {roundResult.subtitle}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-[1.2rem] border border-white/12 bg-white/8 px-4 py-3 text-left">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/56">
                        Stage
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {Math.min(roundNumber, totalRounds)} / {totalRounds}
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/12 bg-white/8 px-4 py-3 text-left">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/56">
                        {roundResult.statLabel}
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {roundResult.statValue}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-50/85">
                    {roundResult.kind === 'success'
                      ? 'Next challenge is loading.'
                      : 'Returning you to the map.'}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SimplifySprintGame;



