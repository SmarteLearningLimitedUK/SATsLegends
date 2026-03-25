import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, Flame, Target } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface MathProblem {
  id: string;
  question: string;
  answer: number;
}

type FeedbackState = 'hit' | 'miss' | null;

const PROBLEMS: MathProblem[] = [
  { id: '1', question: 'Straight line: 180 deg - 45 deg = ?', answer: 135 },
  { id: '2', question: 'Straight line: 180 deg - 120 deg = ?', answer: 60 },
  { id: '3', question: 'Around a point: 360 deg - 270 deg = ?', answer: 90 },
  { id: '4', question: 'Triangle: 180 deg - (60 deg + 60 deg) = ?', answer: 60 },
  { id: '5', question: 'Triangle: 180 deg - (90 deg + 45 deg) = ?', answer: 45 },
  { id: '6', question: 'Straight line: 180 deg - 155 deg = ?', answer: 25 },
  { id: '7', question: 'Around a point: 360 deg - 315 deg = ?', answer: 45 },
  { id: '8', question: 'Triangle: 180 deg - (30 deg + 120 deg) = ?', answer: 30 },
  { id: '9', question: 'Straight line: 180 deg - 72 deg = ?', answer: 108 },
  { id: '10', question: 'Around a point: 360 deg - 180 deg - 90 deg = ?', answer: 90 },
];

const MAX_LIVES = 3;

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const roundTime = 90 + (levelId * 6);
  const targetScore = 2600 + (levelId * 280);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(roundTime);
  const [lives, setLives] = useState(MAX_LIVES);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(PROBLEMS[0]);
  const [userAngle, setUserAngle] = useState(45);
  const [power, setPower] = useState(70);
  const [isFiring, setIsFiring] = useState(false);
  const [projectilePath, setProjectilePath] = useState<{ x: number; y: number }[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [gameActive, setGameActive] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);

  const endedRef = useRef(false);
  const scoreRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const finishRound = useCallback((won: boolean, finalScore: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameActive(false);
    clearTimers();

    if (won) {
      const stars = finalScore >= targetScore * 1.8 ? 3 : finalScore >= targetScore * 1.35 ? 2 : 1;
      onVictory(stars, finalScore);
      return;
    }

    onGameOver(finalScore);
  }, [onGameOver, onVictory, targetScore]);

  const generateProblem = useCallback(() => {
    setCurrentProblem((previous) => {
      const available = PROBLEMS.filter((problem) => problem.id !== previous.id);
      return available[Math.floor(Math.random() * available.length)];
    });
    setFeedback(null);
    setIsFiring(false);
    setProjectilePath([]);
  }, []);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    endedRef.current = false;
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setStreak(0);
    setBestStreak(0);
    setTimer(roundTime);
    setLives(MAX_LIVES);
    setCurrentProblem(PROBLEMS[0]);
    setUserAngle(45);
    setPower(70);
    setIsFiring(false);
    setProjectilePath([]);
    setFeedback(null);
    setGameActive(true);
  }, [roundTime]);

  useEffect(() => {
    if (!gameActive || endedRef.current) return undefined;

    const interval = window.setInterval(() => {
      setTimer((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          const finalScore = scoreRef.current;
          finishRound(finalScore >= targetScore, finalScore);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [finishRound, gameActive, targetScore]);

  const fire = () => {
    if (isFiring || !gameActive || endedRef.current) return;
    setIsFiring(true);

    const tolerance = 1;
    const isCorrect = Math.abs(userAngle - currentProblem.answer) <= tolerance;

    const steps = 28;
    const startX = 13;
    const startY = 76;
    const endX = 84;
    const endY = 57;
    const arcPeak = 18 + (power * 0.25);
    const error = userAngle - currentProblem.answer;
    const missDrift = error * 0.35;
    const path: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = startX + ((endX - startX) * t);
      const baseY = startY + ((endY - startY) * t);
      const arc = Math.sin(t * Math.PI) * arcPeak;
      const y = baseY - arc + (t * missDrift);
      path.push({ x, y });
    }

    setProjectilePath(path);

    const resultTimer = window.setTimeout(() => {
      if (endedRef.current) return;

      if (isCorrect) {
        const gained = 900 + (streak * 120);
        const nextScore = scoreRef.current + gained;
        setScore(nextScore);
        scoreRef.current = nextScore;
        setStreak((current) => {
          const value = current + 1;
          setBestStreak((best) => Math.max(best, value));
          return value;
        });
        setFeedback('hit');
        triggerHaptic('success');

        if (nextScore >= targetScore) {
          const finishTimer = window.setTimeout(() => finishRound(true, nextScore), 900);
          timersRef.current.push(finishTimer);
          return;
        }

        const nextTimer = window.setTimeout(generateProblem, 980);
        timersRef.current.push(nextTimer);
        return;
      }

      setFeedback('miss');
      setStreak(0);
      setLives((currentLives) => {
        const nextLives = currentLives - 1;
        if (nextLives <= 0) {
          const loseTimer = window.setTimeout(() => finishRound(false, scoreRef.current), 760);
          timersRef.current.push(loseTimer);
        } else {
          const retryTimer = window.setTimeout(generateProblem, 920);
          timersRef.current.push(retryTimer);
        }
        return nextLives;
      });
      triggerHaptic('error');
    }, 860);

    timersRef.current.push(resultTimer);
  };

  const timerLabel = useMemo(() => timer.toString().padStart(2, '0'), [timer]);

  return (
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="angle_arena" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,16,34,0.2),rgba(6,16,34,0.34)_58%,rgba(6,16,34,0.54))]" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.05rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.35rem)] md:pt-[calc(env(safe-area-inset-top)+5.1rem)]">
        <PuzzleStage className="w-full max-w-5xl min-h-0 flex-1 rounded-[1.7rem] p-2 md:rounded-[2rem] md:p-3">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.02)_26%,rgba(15,23,42,0.24)_100%)]" />

          <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-2 md:gap-3">
            <div className="licensed-slice-paper-panel mx-auto max-w-[95%] px-3 py-1.5 text-center shadow-[0_10px_22px_rgba(15,23,42,0.14)] md:px-5 md:py-2">
              <div className="text-sm font-black tracking-tight text-amber-900 md:text-[1.1rem]">Angle Arena</div>
              <div className="text-[11px] font-bold text-amber-950/76 md:text-sm">Solve the angle, aim the shot, and hit the rival tower.</div>
            </div>

            <div className="grid grid-cols-4 gap-2 md:gap-3">
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Time</div>
                <div className="text-lg font-black text-white md:text-xl">{timer}s</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Lives</div>
                <div className="text-lg font-black text-white md:text-xl">{lives}/3</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Streak</div>
                <div className="text-lg font-black text-white md:text-xl">x{streak}</div>
              </div>
              <div className="rounded-xl border border-white/20 bg-slate-950/42 px-2 py-1 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/70">Score</div>
                <div className="text-lg font-black text-white md:text-xl">{score}</div>
              </div>
            </div>

            <div className="min-h-0 flex-1 grid grid-rows-[1fr_auto] gap-2 md:gap-3">
              <div className="licensed-game-card-dark relative min-h-0 rounded-[1.25rem] border border-white/14 p-2 md:rounded-[1.6rem] md:p-3">
                <div className="absolute inset-x-2 top-2 rounded-[1rem] border border-cyan-200/24 bg-slate-900/72 px-3 py-2 text-center md:inset-x-3 md:top-3 md:px-4 md:py-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/78">Current challenge</div>
                  <div className="mt-0.5 text-sm font-black text-white md:text-lg">{currentProblem.question}</div>
                </div>

                <div className="absolute inset-x-3 bottom-3 top-[30%] rounded-[1rem] border border-sky-200/18 bg-[radial-gradient(circle_at_50%_14%,rgba(56,189,248,0.3),rgba(15,23,42,0.82)_58%)] md:inset-x-4 md:bottom-4 md:top-[28%]" />
                <div className="absolute left-[8%] right-[8%] top-[63%] h-[2px] bg-white/26" />

                <div className="absolute bottom-[13%] left-[8%] h-[16%] w-[14%] rounded-t-[1rem] border border-amber-300/40 bg-slate-950/74 shadow-[0_10px_18px_rgba(2,6,23,0.35)]" />
                <motion.div
                  animate={{ rotate: isFiring ? -20 : -userAngle }}
                  transition={{ type: 'spring', stiffness: 110, damping: 16 }}
                  className="absolute bottom-[20%] left-[15%] h-[22%] w-[6px] origin-bottom rounded-full border border-amber-700 bg-amber-500"
                >
                  <div className="absolute -left-[7px] -top-[14px] h-4 w-4 rounded-full border border-amber-900 bg-amber-700" />
                </motion.div>

                <div className="absolute bottom-[19%] right-[10%] flex h-12 w-12 items-center justify-center rounded-xl border-2 border-rose-300/70 bg-rose-950/58 shadow-[0_0_20px_rgba(244,63,94,0.3)] md:h-14 md:w-14">
                  <AnimatePresence mode="wait">
                    {feedback === 'hit' ? (
                      <motion.div key="hit" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.15, opacity: 1 }} exit={{ opacity: 0 }}>
                        <Flame className="h-8 w-8 text-amber-300" />
                      </motion.div>
                    ) : (
                      <motion.div key="target" initial={{ scale: 0.8, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}>
                        <Target className="h-7 w-7 text-rose-200" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isFiring && projectilePath.length > 0 && (
                  <motion.div
                    className="absolute z-50 h-4 w-4 rounded-full border border-slate-400 bg-slate-200 shadow-[0_0_12px_rgba(255,255,255,0.72)]"
                    animate={{ left: projectilePath.map((p) => `${p.x}%`), top: projectilePath.map((p) => `${p.y}%`) }}
                    transition={{ duration: 0.86, ease: 'linear' }}
                  />
                )}
              </div>

              <div className="licensed-game-card-dark rounded-[1.25rem] border border-white/14 p-2 md:rounded-[1.6rem] md:p-3">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="rounded-xl border border-white/16 bg-slate-950/34 p-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/78">Angle</div>
                    <div className="mt-0.5 text-2xl font-black text-white md:text-3xl">{userAngle}<span className="text-sm md:text-base">deg</span></div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={userAngle}
                      onChange={(e) => setUserAngle(parseInt(e.target.value, 10))}
                      disabled={isFiring || !gameActive}
                      className="mt-1.5 h-2.5 w-full cursor-pointer appearance-none rounded-full border border-sky-200/35 bg-sky-950 accent-amber-300 disabled:opacity-60"
                    />
                  </div>

                  <div className="rounded-xl border border-white/16 bg-slate-950/34 p-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/78">Power</div>
                    <div className="mt-0.5 text-2xl font-black text-white md:text-3xl">{power}<span className="text-sm md:text-base">%</span></div>
                    <input
                      type="range"
                      min="35"
                      max="100"
                      value={power}
                      onChange={(e) => setPower(parseInt(e.target.value, 10))}
                      disabled={isFiring || !gameActive}
                      className="mt-1.5 h-2.5 w-full cursor-pointer appearance-none rounded-full border border-sky-200/35 bg-sky-950 accent-cyan-300 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fire}
                  disabled={isFiring || !gameActive}
                  className="ui-button-primary mt-2.5 min-h-[2.8rem] w-full rounded-[0.95rem] px-4 py-2 text-lg font-black text-white shadow-[0_10px_18px_rgba(2,6,23,0.18)] disabled:opacity-60 md:mt-3 md:min-h-[3.3rem] md:text-xl"
                >
                  <span className="inline-flex items-center gap-2">
                    <Crosshair className="h-5 w-5" />
                    FIRE SHOT
                  </span>
                </button>

                <div className="mt-2 text-center text-[11px] font-semibold text-cyan-100/84 md:text-sm">
                  Match the exact angle to land a hit. Best streak: {bestStreak}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0.84, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm ${feedback === 'hit' ? 'bg-emerald-500/16' : 'bg-rose-500/16'}`}
              >
                <div className={`rounded-2xl border px-6 py-4 text-center shadow-2xl ${feedback === 'hit' ? 'border-emerald-200/70 bg-emerald-500 text-white' : 'border-rose-200/70 bg-rose-500 text-white'}`}>
                  <div className="text-3xl font-black uppercase md:text-4xl">{feedback === 'hit' ? 'Direct Hit' : 'Missed Shot'}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>
      </div>

      <div className="sr-only" aria-live="polite">Time {timerLabel}</div>
    </GameScreenShell>
  );
};

export default AngleArenaGame;
