import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Brain, Flame, Play, Skull, Target } from 'lucide-react';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
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

const PROBLEMS: MathProblem[] = [
  { id: '1', question: 'Angles on a straight line: 180 deg - 45 deg = ?', answer: 135 },
  { id: '2', question: 'Angles on a straight line: 180 deg - 120 deg = ?', answer: 60 },
  { id: '3', question: 'Angles around a point: 360 deg - 270 deg = ?', answer: 90 },
  { id: '4', question: 'Angles in a triangle: 180 deg - (60 deg + 60 deg) = ?', answer: 60 },
  { id: '5', question: 'Angles in a triangle: 180 deg - (90 deg + 45 deg) = ?', answer: 45 },
  { id: '6', question: 'Angles on a straight line: 180 deg - 155 deg = ?', answer: 25 },
  { id: '7', question: 'Angles around a point: 360 deg - 315 deg = ?', answer: 45 },
  { id: '8', question: 'Angles in a triangle: 180 deg - (30 deg + 120 deg) = ?', answer: 30 },
  { id: '9', question: 'Angles on a straight line: 180 deg - 72 deg = ?', answer: 108 },
  { id: '10', question: 'Angles around a point: 360 deg - 180 deg - 90 deg = ?', answer: 90 },
];

type FeedbackState = 'hit' | 'miss' | null;

const AngleArenaGame: React.FC<AngleArenaGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const roundTime = 90 + (levelId * 6);
  const targetScore = 2600 + (levelId * 280);

  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(roundTime);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(PROBLEMS[0]);
  const [userAngle, setUserAngle] = useState(45);
  const [isFiring, setIsFiring] = useState(false);
  const [projectilePath, setProjectilePath] = useState<{ x: number; y: number }[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [gameActive, setGameActive] = useState(true);
  const [bestStreak, setBestStreak] = useState(0);

  const endedRef = useRef(false);
  const scoreRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const progress = Math.min((score / Math.max(1, targetScore)) * 100, 100);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  const generateProblem = useCallback(() => {
    setCurrentProblem((previous) => {
      const available = PROBLEMS.filter((problem) => problem.id !== previous.id);
      return available[Math.floor(Math.random() * available.length)];
    });
    setFeedback(null);
    setIsFiring(false);
    setProjectilePath([]);
  }, []);

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
    setCurrentProblem(PROBLEMS[0]);
    setUserAngle(45);
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

    const isCorrect = userAngle === currentProblem.answer;
    const steps = 30;
    const targetX = 82;
    const targetY = 60;
    const startX = 14;
    const startY = 74;
    const nextPath: { x: number; y: number }[] = [];

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const angleDiff = userAngle - currentProblem.answer;
      const x = startX + ((targetX - startX) * t);
      const peakHeight = 40;
      const arcY = startY + ((targetY - startY) * t) - (Math.sin(t * Math.PI) * peakHeight);
      const errorY = angleDiff * 0.5;
      nextPath.push({ x, y: arcY + (t * errorY) });
    }

    setProjectilePath(nextPath);

    const resultTimer = window.setTimeout(() => {
      if (endedRef.current) return;

      if (isCorrect) {
        setFeedback('hit');
        triggerHaptic('success');
        setScore((value) => {
          const earned = 1000 + (streak * 100);
          const next = value + earned;
          scoreRef.current = next;
          if (next >= targetScore) {
            const finishTimer = window.setTimeout(() => finishRound(true, next), 900);
            timersRef.current.push(finishTimer);
          } else {
            const nextTimer = window.setTimeout(generateProblem, 1100);
            timersRef.current.push(nextTimer);
          }
          return next;
        });
        setStreak((value) => {
          const next = value + 1;
          setBestStreak((best) => Math.max(best, next));
          return next;
        });
      } else {
        setFeedback('miss');
        triggerHaptic('error');
        setStreak(0);
        const resetTimer = window.setTimeout(() => {
          if (endedRef.current) return;
          setIsFiring(false);
          setFeedback(null);
          setProjectilePath([]);
        }, 900);
        timersRef.current.push(resetTimer);
      }
    }, 900);

    timersRef.current.push(resultTimer);
  };

  const timerLabel = useMemo(() => timer.toString().padStart(2, '0'), [timer]);

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="angle_arena" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Angle Arena"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timer}
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
                  Solve the angle and fire the siege shot at the target
                </div>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto md:mt-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_1fr] md:gap-4">
                <div className="licensed-game-card-dark relative min-h-[20rem] rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:min-h-[22rem] md:p-4">
                  <div className="absolute inset-x-4 bottom-3 top-4 rounded-[1.2rem] border border-sky-200/22 bg-[radial-gradient(circle_at_50%_14%,rgba(56,189,248,0.35),rgba(15,23,42,0.82)_58%)] md:inset-x-6 md:bottom-4 md:top-5" />
                  <div className="relative z-10 h-full w-full">
                    <div className="absolute left-1/2 top-2 w-full max-w-md -translate-x-1/2 px-2 md:top-3 md:px-4">
                      <motion.div
                        key={currentProblem.id}
                        initial={{ y: -16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="rounded-2xl border border-sky-200/24 bg-slate-900/72 p-3 text-center shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:p-4"
                      >
                        <div className="mb-1 flex items-center justify-center gap-2">
                          <Brain className="h-4 w-4 text-cyan-200" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-100/80">Current challenge</span>
                        </div>
                        <h3 className="text-sm font-black text-white md:text-xl">{currentProblem.question}</h3>
                      </motion.div>
                    </div>

                    <div className="absolute bottom-7 left-[8%] flex flex-col items-center md:bottom-8">
                      <div className="relative h-20 w-12 rounded-t-full border-x-4 border-t-4 border-amber-300/60 bg-slate-900/90">
                        <motion.div
                          animate={{ rotate: isFiring ? -20 : -userAngle }}
                          transition={{ type: 'spring', stiffness: 110, damping: 16 }}
                          className="absolute bottom-4 left-1/2 h-24 w-2 origin-bottom -translate-x-1/2 rounded-full border-2 border-amber-800 bg-amber-500"
                        >
                          <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-900 bg-amber-700 shadow-[0_8px_14px_rgba(0,0,0,0.3)]" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="absolute bottom-10 right-[12%] flex flex-col items-center md:bottom-12">
                      <AnimatePresence>
                        {feedback !== 'hit' && (
                          <motion.div exit={{ scale: 0, rotate: 180, opacity: 0 }} className="relative">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-rose-400/80 bg-rose-950/50 shadow-[0_0_24px_rgba(244,63,94,0.3)]">
                              <Skull className="h-12 w-12 text-rose-300" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {feedback === 'hit' && (
                        <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1.3 }} className="text-amber-300">
                          <Flame className="h-16 w-16 fill-current" />
                        </motion.div>
                      )}
                    </div>

                    {isFiring && projectilePath.length > 0 && (
                      <motion.div
                        className="absolute z-50 h-5 w-5 rounded-full border-2 border-slate-400 bg-slate-200 shadow-[0_0_14px_rgba(255,255,255,0.75)]"
                        animate={{
                          left: projectilePath.map((point) => `${point.x}%`),
                          top: projectilePath.map((point) => `${point.y}%`),
                        }}
                        transition={{ duration: 0.9, ease: 'linear' }}
                      />
                    )}
                  </div>
                </div>

                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Launch controls</div>
                  <div className="mt-3 rounded-[1.1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-3 text-center shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-100/82">Selected angle</div>
                    <div className="mt-1 text-5xl font-black text-white md:text-6xl">{userAngle}<span className="text-2xl md:text-3xl">deg</span></div>
                  </div>

                  <div className="mt-3 rounded-[1rem] border border-white/12 bg-black/18 p-3 md:mt-4">
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={userAngle}
                      onChange={(event) => setUserAngle(parseInt(event.target.value, 10))}
                      disabled={isFiring || !gameActive}
                      className="h-3.5 w-full cursor-pointer appearance-none rounded-full border border-sky-200/35 bg-sky-950 accent-amber-300 disabled:opacity-60"
                    />
                    <div className="mt-1 flex justify-between text-[10px] font-bold text-cyan-100/76 md:text-xs">
                      <span>0deg</span>
                      <span>45deg</span>
                      <span>90deg</span>
                      <span>135deg</span>
                      <span>180deg</span>
                    </div>
                  </div>

                  <button
                    onClick={fire}
                    disabled={isFiring || !gameActive}
                    className="ui-button-primary mt-3 min-h-[3.4rem] w-full rounded-[1rem] px-4 py-2 text-xl font-black text-white disabled:opacity-60 md:mt-4 md:min-h-[4rem] md:text-2xl"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Play className="h-6 w-6 fill-current" />
                      FIRE
                    </span>
                  </button>

                  <div className="mt-3 rounded-[1rem] border border-white/12 bg-slate-950/38 p-3 text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/70 md:text-xs">Goal</div>
                    <div className="mt-1 text-sm font-semibold text-white/90 md:text-base">
                      Hit target score before time runs out.
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-cyan-200/30 bg-cyan-900/40 px-3 py-1 text-xs font-black text-cyan-100">
                      <Target className="h-3.5 w-3.5" />
                      Best streak: {bestStreak}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm ${
                  feedback === 'hit' ? 'bg-emerald-500/16' : 'bg-rose-500/16'
                }`}
              >
                <div className={`rounded-3xl border px-8 py-4 text-center shadow-2xl ${
                  feedback === 'hit'
                    ? 'border-emerald-200/70 bg-emerald-500 text-white'
                    : 'border-rose-200/70 bg-rose-500 text-white'
                }`}
                >
                  <div className="text-4xl font-black uppercase md:text-5xl">
                    {feedback === 'hit' ? 'Direct Hit' : 'Missed Shot'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>

      <div className="sr-only" aria-live="polite">Time {timerLabel}</div>
    </GameScreenShell>
  );
};

export default AngleArenaGame;
