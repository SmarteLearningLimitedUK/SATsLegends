import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Zap,
  Trophy,
  RotateCcw,
  Play,
  Timer,
  CheckCircle2,
  XCircle,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GameActionDock from '../components/GameActionDock';
import clockFaceImage from '../assets/maps/gold_rimmed_clock_transparent.png';

interface TimekeeperTempleGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface TimeTarget {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

const GAME_DURATION = 60;

const scoreToStars = (score: number, targetScore: number) => {
  if (score >= Math.round(targetScore * 1.8)) return 3;
  if (score >= Math.round(targetScore * 1.3)) return 2;
  return 1;
};

const AnalogueClock = ({
  hour,
  minute,
  disabled,
  sizeStyle,
}: {
  hour: number;
  minute: number;
  disabled: boolean;
  sizeStyle?: React.CSSProperties;
}) => {
  return (
    <div
      className={`relative flex items-center justify-center transition-opacity ${disabled ? 'opacity-80' : 'opacity-100'}`}
      style={sizeStyle}
    >
      <img
        src={clockFaceImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />

      <div className="z-30 h-3 w-3 rounded-full bg-indigo-300 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />

      <motion.div
        animate={{ rotate: (hour % 12) * 30 + (minute / 60) * 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute z-10 h-[28%] w-2 origin-bottom rounded-full bg-indigo-950 shadow-[0_0_8px_rgba(255,255,255,0.38)]"
        style={{ bottom: '50%' }}
      />

      <motion.div
        animate={{ rotate: minute * 6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute z-20 h-[42%] w-1 origin-bottom rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(186,230,253,0.7)]"
        style={{ bottom: '50%' }}
      />
    </div>
  );
};

const TimekeeperTempleGame: React.FC<TimekeeperTempleGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const targetScore = 900 + (levelId * 180);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'complete'>('start');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [target, setTarget] = useState<TimeTarget | null>(null);
  const [userHour, setUserHour] = useState(12);
  const [userMinute, setUserMinute] = useState(0);
  const [userPeriod, setUserPeriod] = useState<'AM' | 'PM'>('AM');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [runSubmitted, setRunSubmitted] = useState(false);

  const timeoutsRef = useRef<number[]>([]);

  const clearTimers = () => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const generateTarget = useCallback(() => {
    const hour = Math.floor(Math.random() * 12) + 1;
    const minute = Math.floor(Math.random() * 12) * 5;
    const period: 'AM' | 'PM' = Math.random() > 0.5 ? 'AM' : 'PM';
    setTarget({ hour, minute, period });

    setUserHour(12);
    setUserMinute(0);
    setUserPeriod('AM');
    setFeedback(null);
  }, []);

  const startGame = () => {
    clearTimers();
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setTimeLeft(GAME_DURATION);
    setRunSubmitted(false);
    setGameState('playing');
    generateTarget();
  };

  useEffect(() => {
    if (gameState !== 'playing' || timeLeft <= 0) return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          setGameState('complete');
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameState, timeLeft]);

  const checkAnswer = () => {
    if (!target || gameState !== 'playing') return;

    const isCorrect = userHour === target.hour && userMinute === target.minute && userPeriod === target.period;

    if (isCorrect) {
      const points = 100 + (combo * 20);
      const nextCombo = combo + 1;
      setScore((previous) => previous + points);
      setCombo(nextCombo);
      setBestCombo((previous) => Math.max(previous, nextCombo));
      setFeedback('correct');

      if (nextCombo % 5 === 0) {
        setTimeLeft((previous) => Math.min(previous + 5, GAME_DURATION));
      }

      const timeoutId = window.setTimeout(generateTarget, 400);
      timeoutsRef.current.push(timeoutId);
      return;
    }

    setCombo(0);
    setFeedback('wrong');
    const timeoutId = window.setTimeout(() => setFeedback(null), 600);
    timeoutsRef.current.push(timeoutId);
  };

  const submitRun = () => {
    if (runSubmitted) return;
    setRunSubmitted(true);

    if (score >= targetScore) {
      onVictory(scoreToStars(score, targetScore), score);
      return;
    }

    onGameOver(score);
  };

  const incrementHour = () => {
    if (gameState !== 'playing') return;
    setUserHour((prev) => (prev >= 12 ? 1 : prev + 1));
  };

  const incrementMinute = () => {
    if (gameState !== 'playing') return;
    setUserMinute((prev) => (prev + 5) % 60);
  };

  const topPadding = 'pt-[calc(env(safe-area-inset-top)+4.8rem)]';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 font-sans text-white select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      <main className={`relative z-10 flex flex-1 flex-col items-center justify-start px-4 pb-[max(6.9rem,calc(env(safe-area-inset-bottom)+5.9rem))] ${topPadding}`}>
        <AnimatePresence mode="wait">
          {gameState === 'playing' && target && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex w-full max-w-[28rem] flex-col items-center gap-5 md:gap-8"
            >
              <div className="flex flex-col items-center gap-4">
                <span className="text-xs font-black tracking-[0.3em] text-indigo-400 uppercase">Set Clock To</span>
                <div className="group relative rounded-[1.45rem] border-2 border-indigo-500/30 bg-slate-900 px-6 py-3 shadow-[0_0_40px_rgba(99,102,241,0.1)] md:px-8 md:py-4">
                  <div className="absolute -inset-1 rounded-[2rem] bg-indigo-500/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                  <span className="relative text-[clamp(2rem,9vw,3.4rem)] font-black tabular-nums tracking-tighter">
                    {target.hour.toString().padStart(2, '0')}:{target.minute.toString().padStart(2, '0')}
                    <span className="ml-3 text-[clamp(1rem,4.8vw,1.7rem)] text-indigo-400">{target.period}</span>
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
                <div className="relative">
                  <AnalogueClock
                    hour={userHour}
                    minute={userMinute}
                    disabled={feedback === 'correct'}
                    sizeStyle={{ width: 'min(68vw, 18rem)', height: 'min(68vw, 18rem)' }}
                  />

                  <div className="absolute top-1/2 -right-16 flex -translate-y-1/2 flex-col gap-2.5">
                    {(['AM', 'PM'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setUserPeriod(period)}
                        className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xs font-black transition-all ${
                          userPeriod === period
                            ? 'border-indigo-400 bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]'
                            : 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex w-full max-w-[15.5rem] flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={incrementHour}
                      className="rounded-xl border border-cyan-300/45 bg-sky-900/80 px-2 py-2 text-xs font-black tracking-[0.08em] text-cyan-100 uppercase transition hover:brightness-110"
                    >
                      Hour +
                    </button>
                    <button
                      onClick={incrementMinute}
                      className="rounded-xl border border-cyan-300/45 bg-sky-900/80 px-2 py-2 text-xs font-black tracking-[0.08em] text-cyan-100 uppercase transition hover:brightness-110"
                    >
                      Minute +
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-slate-900/80 p-6">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Current Input</span>
                    <span className="text-2xl font-black tabular-nums">
                      {userHour.toString().padStart(2, '0')}:{userMinute.toString().padStart(2, '0')} {userPeriod}
                    </span>
                  </div>

                  <button
                    onClick={checkAnswer}
                    className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-base font-black tracking-widest uppercase shadow-2xl transition-all ${
                      feedback === 'correct'
                        ? 'scale-95 bg-emerald-500 text-white'
                        : feedback === 'wrong'
                          ? 'animate-shake bg-rose-500 text-white'
                          : 'bg-white text-slate-950 hover:bg-indigo-50 active:scale-95'
                    }`}
                  >
                    {feedback === 'correct'
                      ? <CheckCircle2 className="h-8 w-8" />
                      : feedback === 'wrong'
                        ? <XCircle className="h-8 w-8" />
                        : 'Check'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'start' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-12 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-indigo-600 shadow-[0_0_40px_rgba(79,70,229,0.5)]">
                  <Zap className="h-12 w-12 fill-current text-white" />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-[2.5rem] border-4 border-indigo-500"
                  />
                </div>
                <h2 className="mb-4 text-5xl font-black tracking-tighter uppercase italic">Chrono Dash</h2>
                <p className="mb-10 leading-relaxed font-medium text-slate-400">
                  Convert the digital time to analogue as fast as you can.
                  Every correct answer builds score and combo.
                  Reach a 5x combo for bonus time.
                </p>
                <button
                  onClick={startGame}
                  className="group flex items-center gap-3 rounded-full bg-white px-16 py-6 text-sm font-black tracking-[0.3em] text-slate-950 uppercase shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all hover:bg-indigo-50"
                >
                  <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" /> Initialize Dash
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-12 text-center backdrop-blur-xl"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8">
                  <Trophy className="h-24 w-24 text-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                </div>
                <h2 className="mb-2 text-4xl font-black tracking-tighter uppercase italic">Time&apos;s Up!</h2>
                <p className="mb-8 font-medium text-slate-400">The dash has concluded. Here is your performance report:</p>

                <div className="mb-10 grid w-full grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-white/5 bg-slate-900 p-6">
                    <span className="mb-1 block text-[10px] font-black tracking-widest text-indigo-400 uppercase">Final Score</span>
                    <span className="text-3xl font-black tabular-nums">{score}</span>
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-slate-900 p-6">
                    <span className="mb-1 block text-[10px] font-black tracking-widest text-amber-400 uppercase">Max Combo</span>
                    <span className="text-3xl font-black tabular-nums">x{bestCombo}</span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3">
                  <button
                    onClick={submitRun}
                    disabled={runSubmitted}
                    className="flex items-center justify-center gap-3 rounded-full bg-indigo-600 px-16 py-6 text-sm font-black tracking-[0.2em] text-white uppercase shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Timer className="h-4 w-4" /> Submit Run
                  </button>
                  <button
                    onClick={startGame}
                    className="flex items-center justify-center gap-3 rounded-full bg-slate-800 px-16 py-5 text-sm font-black tracking-[0.2em] text-white uppercase transition-all hover:bg-slate-700"
                  >
                    <RotateCcw className="h-4 w-4" /> Restart Dash
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.45rem,env(safe-area-inset-bottom))] z-40 flex justify-center">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </div>
  );
};

export default TimekeeperTempleGame;
