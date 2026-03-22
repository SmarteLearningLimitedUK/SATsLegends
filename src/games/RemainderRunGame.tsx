import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface RemainderRunGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type Lane = 'quotient' | 'remainder';

interface RouteToken {
  id: string;
  value: number;
}

interface RemainderPrompt {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  tokens: RouteToken[];
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const ROUND_SECONDS = 60;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffleNumbers = (items: number[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    const swap = next[i];
    next[i] = next[j];
    next[j] = swap;
  }
  return next;
};

const createPrompt = (levelId: number, solvedCount: number): RemainderPrompt => {
  const resolvedLevel = Math.max(1, Math.min(10, levelId || 1));
  const divisor = randomInt(2, Math.min(14, 5 + resolvedLevel + Math.floor(solvedCount / 5)));
  const quotient = randomInt(2, Math.min(22, 6 + resolvedLevel + Math.floor(solvedCount / 4)));

  const maxRemainder = Math.max(1, divisor - 1);
  const startAtZero = randomInt(0, 9) < 2;
  let remainder = startAtZero ? 0 : randomInt(1, maxRemainder);
  if (remainder === quotient) {
    remainder = (remainder + 1) % divisor;
  }

  const dividend = (divisor * quotient) + remainder;
  const values = new Set<number>([quotient, remainder]);
  const minDecoy = Math.max(0, Math.min(quotient, remainder) - 4);
  const maxDecoy = Math.max(quotient, remainder) + 5 + Math.floor(resolvedLevel / 2);

  while (values.size < 4) {
    values.add(randomInt(minDecoy, maxDecoy));
  }

  const tokens = shuffleNumbers(Array.from(values))
    .map((value, index) => ({ id: `token-${index}`, value }));

  return { dividend, divisor, quotient, remainder, tokens };
};

const starsForRun = (score: number, targetScore: number, accuracy: number) => {
  if (score >= targetScore * 0.9 && accuracy >= 0.82) return 3;
  if (score >= targetScore * 0.56 && accuracy >= 0.62) return 2;
  return 1;
};

const RemainderRunGame: React.FC<RemainderRunGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const targetScore = useMemo(() => 2100 + (resolvedLevel * 260), [resolvedLevel]);

  const timersRef = useRef<number[]>([]);
  const finishGuardRef = useRef(false);
  const scoreRef = useRef(0);
  const attemptsRef = useRef(0);
  const correctRef = useRef(0);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [streak, setStreak] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [prompt, setPrompt] = useState<RemainderPrompt>(() => createPrompt(resolvedLevel, 0));
  const [selectedQuotientTokenId, setSelectedQuotientTokenId] = useState<string | null>(null);
  const [selectedRemainderTokenId, setSelectedRemainderTokenId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const progress = Math.min((score / Math.max(1, targetScore)) * 100, 100);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    attemptsRef.current = attemptCount;
  }, [attemptCount]);

  useEffect(() => {
    correctRef.current = correctCount;
  }, [correctCount]);

  useEffect(() => () => clearTimers(), []);

  const finishRound = useCallback(() => {
    if (finishGuardRef.current) return;
    finishGuardRef.current = true;
    clearTimers();
    setIsFinished(true);
    setIsLocked(true);

    const attempts = Math.max(1, attemptsRef.current);
    const accuracy = correctRef.current / attempts;
    const stars = starsForRun(scoreRef.current, targetScore, accuracy);

    confetti({
      particleCount: 105,
      spread: 68,
      origin: { y: 0.66 },
      colors: ['#fcd34d', '#67e8f9', '#ffffff'],
    });

    onVictory(stars, scoreRef.current);
  }, [onVictory, targetScore]);

  useEffect(() => {
    clearTimers();
    finishGuardRef.current = false;
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(ROUND_SECONDS);
    setStreak(0);
    setSolvedCount(0);
    setAttemptCount(0);
    attemptsRef.current = 0;
    setCorrectCount(0);
    correctRef.current = 0;
    setPrompt(createPrompt(resolvedLevel, 0));
    setSelectedQuotientTokenId(null);
    setSelectedRemainderTokenId(null);
    setFeedback(null);
    setIsFinished(false);
    setIsLocked(false);
  }, [resolvedLevel]);

  useEffect(() => {
    if (isFinished) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isFinished]);

  useEffect(() => {
    if (!isFinished && timeLeft <= 0) {
      finishRound();
    }
  }, [finishRound, isFinished, timeLeft]);

  const moveNextPrompt = (nextSolvedCount: number, delay: number) => {
    const timerId = window.setTimeout(() => {
      if (finishGuardRef.current) return;
      setPrompt(createPrompt(resolvedLevel, nextSolvedCount));
      setSelectedQuotientTokenId(null);
      setSelectedRemainderTokenId(null);
      setFeedback(null);
      setIsLocked(false);
    }, delay);
    timersRef.current.push(timerId);
  };

  const evaluateRoute = (quotientTokenId: string, remainderTokenId: string) => {
    if (isFinished || isLocked) return;
    setIsLocked(true);

    const tokenLookup = new Map(prompt.tokens.map((token) => [token.id, token.value]));
    const selectedQuotientValue = tokenLookup.get(quotientTokenId);
    const selectedRemainderValue = tokenLookup.get(remainderTokenId);

    const nextAttempts = attemptCount + 1;
    const nextSolvedCount = solvedCount + 1;

    setAttemptCount(nextAttempts);
    attemptsRef.current = nextAttempts;
    setSolvedCount(nextSolvedCount);

    const isCorrect = (
      selectedQuotientValue === prompt.quotient
      && selectedRemainderValue === prompt.remainder
    );

    if (isCorrect) {
      const points = 140 + (streak * 20) + (Math.max(0, Math.floor(timeLeft / 10)) * 6);
      const updatedScore = score + points;
      const nextCorrect = correctCount + 1;

      setScore(updatedScore);
      scoreRef.current = updatedScore;
      setCorrectCount(nextCorrect);
      correctRef.current = nextCorrect;
      setStreak((previous) => previous + 1);
      setFeedback({
        type: 'success',
        title: 'Routed Correctly',
        subtitle: `+${points} score`,
      });
      triggerHaptic('success');
      moveNextPrompt(nextSolvedCount, 320);
      return;
    }

    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Misroute',
      subtitle: `Q=${prompt.quotient}, R=${prompt.remainder}`,
    });
    triggerHaptic('error');
    setTimeLeft((previous) => Math.max(0, previous - 3));
    moveNextPrompt(nextSolvedCount, 540);
  };

  const handleRoute = (tokenId: string, lane: Lane) => {
    if (isFinished || isLocked) return;

    let nextQuotient = selectedQuotientTokenId;
    let nextRemainder = selectedRemainderTokenId;

    if (lane === 'quotient') {
      nextQuotient = tokenId;
      if (nextRemainder === tokenId) nextRemainder = null;
    } else {
      nextRemainder = tokenId;
      if (nextQuotient === tokenId) nextQuotient = null;
    }

    setSelectedQuotientTokenId(nextQuotient);
    setSelectedRemainderTokenId(nextRemainder);

    if (nextQuotient && nextRemainder) {
      evaluateRoute(nextQuotient, nextRemainder);
    }
  };

  const tokenValue = (tokenId: string | null) => {
    if (!tokenId) return '--';
    const token = prompt.tokens.find((item) => item.id === tokenId);
    return token ? `${token.value}` : '--';
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="calculation_clash" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Remainder Run"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/84"
            accentBorder="border-sky-200/88"
            progressBar="bg-gradient-to-r from-cyan-300 via-sky-300 to-yellow-300"
            statLabel="Streak"
            statValue={`${streak}`}
          />
        </div>

        <PuzzleStage className="w-full max-w-6xl rounded-[2.3rem] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-14 md:px-6 md:pb-6 md:pt-20">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[95%] px-5 py-3 text-center shadow-[0_16px_30px_rgba(15,23,42,0.16)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-900 md:text-[1.75rem]">
                  Route each value to quotient or remainder before the clock expires
                </div>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto md:mt-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr] md:gap-4">
                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Current equation</div>
                  <div className="mt-3 rounded-[1.1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-3 text-center shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:p-4">
                    <div className="text-3xl font-black tracking-tight text-white md:text-5xl">
                      {prompt.dividend} / {prompt.divisor}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-cyan-50/86 md:text-sm">
                      Route one token to Quotient lane and one token to Remainder lane.
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:gap-3">
                    {prompt.tokens.map((token) => {
                      const inQ = selectedQuotientTokenId === token.id;
                      const inR = selectedRemainderTokenId === token.id;
                      return (
                        <div
                          key={token.id}
                          className={`rounded-[1rem] border bg-black/20 p-2.5 shadow-[0_10px_18px_rgba(2,6,23,0.2)] ${
                            inQ ? 'border-cyan-300/80' : inR ? 'border-amber-300/85' : 'border-white/12'
                          }`}
                        >
                          <div className="text-center text-2xl font-black text-white md:text-3xl">{token.value}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={isLocked || isFinished}
                              onClick={() => handleRoute(token.id, 'quotient')}
                              className={`rounded-[0.8rem] px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] md:text-xs ${
                                inQ
                                  ? 'bg-cyan-300 text-sky-950'
                                  : 'bg-cyan-900/50 text-cyan-100 hover:bg-cyan-800/65'
                              } disabled:opacity-60`}
                            >
                              Quotient
                            </button>
                            <button
                              type="button"
                              disabled={isLocked || isFinished}
                              onClick={() => handleRoute(token.id, 'remainder')}
                              className={`rounded-[0.8rem] px-2 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] md:text-xs ${
                                inR
                                  ? 'bg-amber-300 text-amber-950'
                                  : 'bg-amber-900/50 text-amber-100 hover:bg-amber-800/65'
                              } disabled:opacity-60`}
                            >
                              Remainder
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/18 p-2.5 text-xs font-semibold text-cyan-50/90 md:text-sm">
                    Attempts: {attemptCount} · Correct: {correctCount}
                  </div>
                </div>

                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Routing lanes</div>
                  <div className="mt-3 flex flex-col gap-3 md:gap-4">
                    <div className="rounded-[1.05rem] border border-cyan-200/30 bg-cyan-950/24 p-3 text-center md:p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/75">Quotient lane</div>
                      <div className="mt-1 text-4xl font-black text-white md:text-5xl">{tokenValue(selectedQuotientTokenId)}</div>
                    </div>
                    <div className="rounded-[1.05rem] border border-amber-200/30 bg-amber-950/24 p-3 text-center md:p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/75">Remainder lane</div>
                      <div className="mt-1 text-4xl font-black text-white md:text-5xl">{tokenValue(selectedRemainderTokenId)}</div>
                    </div>
                    <div className="rounded-[1rem] border border-white/12 bg-slate-950/38 p-3 text-center">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Rule</div>
                      <div className="mt-1 text-sm font-semibold text-white/90 md:text-base">
                        dividend = divisor x quotient + remainder
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${
                  feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'
                }`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${
                    feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'
                  }`}
                  >
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default RemainderRunGame;
