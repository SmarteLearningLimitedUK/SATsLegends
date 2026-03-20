import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Zap,
  Clock,
  Trophy,
  RotateCcw,
  Play,
  Timer,
  CheckCircle2,
  XCircle,
  Flame,
  History,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  onTimeChange,
  disabled,
}: {
  hour: number;
  minute: number;
  onTimeChange: (h: number, m: number) => void;
  disabled: boolean;
}) => {
  const clockRef = useRef<HTMLDivElement>(null);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || !clockRef.current) return;

    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
    const normalizedAngle = (angle + 360) % 360;

    const dist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
    const radius = rect.width / 2;

    if (dist > radius * 0.55) {
      const rawMin = Math.round(normalizedAngle / 6) % 60;
      const snappedMin = Math.round(rawMin / 5) * 5;
      onTimeChange(hour, snappedMin % 60);
      return;
    }

    const newHour = Math.round(normalizedAngle / 30) % 12 || 12;
    onTimeChange(newHour, minute);
  };

  return (
    <div
      ref={clockRef}
      onMouseDown={handleInteraction}
      onTouchStart={handleInteraction}
      className={`relative flex h-72 w-72 cursor-crosshair touch-none items-center justify-center rounded-full border-8 border-indigo-500 bg-slate-900 shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-opacity ${disabled ? 'opacity-80' : 'opacity-100'}`}
    >
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute text-lg font-black text-indigo-300/50"
          style={{ transform: `rotate(${i * 30 + 30}deg) translateY(-110px) rotate(-${i * 30 + 30}deg)` }}
        >
          {i + 1}
        </div>
      ))}

      <div className="z-30 h-4 w-4 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]" />

      <motion.div
        animate={{ rotate: (hour % 12) * 30 + (minute / 60) * 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute z-10 h-20 w-2.5 origin-bottom rounded-full bg-white shadow-lg"
        style={{ bottom: '50%' }}
      />

      <motion.div
        animate={{ rotate: minute * 6 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute z-20 h-28 w-1.5 origin-bottom rounded-full bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.5)]"
        style={{ bottom: '50%' }}
      />

      {[...Array(60)].map((_, i) => (
        <div
          key={i}
          className={`absolute w-0.5 origin-bottom ${i % 5 === 0 ? 'h-4 bg-indigo-500' : 'h-1.5 bg-slate-700'}`}
          style={{ bottom: '50%', transform: `rotate(${i * 6}deg) translateY(-128px)` }}
        />
      ))}
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

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 font-sans text-white select-none">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />

      <header className="z-20 flex h-20 items-center justify-between border-b border-white/10 bg-slate-900/50 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/40 bg-slate-900 text-indigo-300 transition hover:bg-slate-800"
            aria-label="Back to levels"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="rounded-xl bg-indigo-600 p-2.5 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            <Zap className="h-6 w-6 fill-current text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">Chrono Dash</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Time Trial Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-12">
          <div className="flex flex-col items-end">
            <span className="mb-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase">Score</span>
            <span className="text-2xl font-black tabular-nums tracking-tight">{score.toLocaleString()}</span>
          </div>

          <div className="flex w-32 flex-col items-center">
            <span className="mb-1 text-[10px] font-black tracking-widest text-rose-400 uppercase">Time Left</span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className={`h-full ${timeLeft < 10 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
              />
            </div>
            <span className={`mt-1 text-xl font-black tabular-nums ${timeLeft < 10 ? 'animate-pulse text-rose-500' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="mb-1 text-[10px] font-black tracking-widest text-amber-400 uppercase">Combo</span>
            <div className="flex items-center gap-2">
              {combo > 0 && <Flame className="h-4 w-4 fill-current text-amber-500" />}
              <span className="text-2xl font-black tabular-nums tracking-tight">x{combo}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {gameState === 'playing' && target && (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="flex flex-col items-center gap-4">
                <span className="text-xs font-black tracking-[0.3em] text-indigo-400 uppercase">Set Clock To</span>
                <div className="group relative rounded-[2rem] border-2 border-indigo-500/30 bg-slate-900 px-12 py-6 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                  <div className="absolute -inset-1 rounded-[2rem] bg-indigo-500/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
                  <span className="relative text-6xl font-black tabular-nums tracking-tighter">
                    {target.hour.toString().padStart(2, '0')}:{target.minute.toString().padStart(2, '0')}
                    <span className="ml-4 text-2xl text-indigo-400">{target.period}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-16">
                <div className="relative">
                  <AnalogueClock
                    hour={userHour}
                    minute={userMinute}
                    onTimeChange={(h, m) => {
                      setUserHour(h);
                      setUserMinute(m);
                    }}
                    disabled={feedback === 'correct'}
                  />

                  <div className="absolute top-1/2 -right-20 flex -translate-y-1/2 flex-col gap-3">
                    {(['AM', 'PM'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setUserPeriod(period)}
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-sm font-black transition-all ${
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

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/5 bg-slate-900/80 p-6">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Current Input</span>
                    <span className="text-3xl font-black tabular-nums">
                      {userHour.toString().padStart(2, '0')}:{userMinute.toString().padStart(2, '0')} {userPeriod}
                    </span>
                  </div>

                  <button
                    onClick={checkAnswer}
                    className={`flex h-24 w-48 items-center justify-center gap-3 rounded-3xl text-lg font-black tracking-widest uppercase shadow-2xl transition-all ${
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

      <footer className="z-20 flex h-12 items-center justify-between border-t border-white/5 bg-slate-900/50 px-8 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <History className="h-3 w-3 text-indigo-400" />
            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase">Session: 0319-X</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-indigo-400" />
            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase">Mode: Blitz</span>
          </div>
        </div>
        <span className="text-[8px] font-black tracking-widest text-slate-600 uppercase">(c) 2026 Chrono Dash Systems</span>
      </footer>

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
    </div>
  );
};

export default TimekeeperTempleGame;
