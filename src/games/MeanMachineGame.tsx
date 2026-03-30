import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  RotateCcw,
  ChevronRight,
  Trophy,
  AlertCircle,
  TrendingUp,
  Scale,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface LevelData {
  numbers: number[];
  mean: number;
  total: number;
  options: number[];
}

interface MeanMachineGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const MAX_LEVEL = 10;

const scoreToStars = (XP: number) => {
  if (XP >= 1800) return 3;
  if (XP >= 1300) return 2;
  return 1;
};

const MeanMachineGame: React.FC<MeanMachineGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [XP, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLButtonElement>(null);

  const generateLevel = useCallback((lvl: number) => {
    const numCount = Math.min(3 + Math.floor((lvl - 1) / 2), 7);
    const targetMean = Math.floor(Math.random() * 20) + 10 + (lvl * 2);

    const totalSum = targetMean * numCount;
    let numbers: number[] = [];
    let currentSum = 0;

    for (let i = 0; i < numCount - 1; i += 1) {
      const maxVal = Math.min(targetMean * 2, totalSum - currentSum - (numCount - i - 1));
      const minVal = 1;
      const num = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
      numbers.push(num);
      currentSum += num;
    }
    numbers.push(totalSum - currentSum);
    numbers = numbers.sort(() => Math.random() - 0.5);

    const optionPool = new Set<number>([targetMean]);
    while (optionPool.size < 4) {
      const candidate = targetMean + Math.floor(Math.random() * 11) - 5;
      if (candidate > 0) optionPool.add(candidate);
    }
    const options = Array.from(optionPool).sort(() => Math.random() - 0.5);

    setCurrentLevelData({
      numbers,
      mean: targetMean,
      total: totalSum,
      options,
    });
    setSelectedAnswer(null);
    setFeedback(null);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  const startGame = () => {
    const openingLevel = 1;
    setScore(0);
    setLevel(openingLevel);
    setGameState('playing');
    generateLevel(openingLevel);
  };

  useEffect(() => {
    generateLevel(1);
  }, [generateLevel]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLevelData || gameState !== 'playing') return;

    if (selectedAnswer === null) {
      setFeedback({ type: 'error', message: 'Pick one answer first.' });
      window.setTimeout(() => setFeedback(null), 1400);
      return;
    }

    if (selectedAnswer === currentLevelData.mean) {
      setScore(prev => prev + 100 + (level * 20));
      setFeedback({ type: 'success', message: 'Perfectly Balanced!' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: 'Not quite. Mean = total divided by how many numbers.' });
    window.setTimeout(() => setFeedback(null), 1500);
  };

  const nextLevel = () => {
    if (level < MAX_LEVEL) {
      const nextLvl = level + 1;
      setLevel(nextLvl);
      setGameState('playing');
      generateLevel(nextLvl);
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.2),rgba(56,189,248,0)_32%),radial-gradient(circle_at_18%_80%,rgba(59,130,246,0.16),rgba(59,130,246,0)_30%),radial-gradient(circle_at_82%_74%,rgba(251,191,36,0.14),rgba(251,191,36,0)_28%)]" />

      {!useSharedTopHud ? (
        <div className="relative z-10 flex items-center justify-between px-3 pb-2 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-cyan-100/35 bg-slate-950/40 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white"
          >
            Back
          </button>
          <div className="rounded-full border border-cyan-100/35 bg-slate-950/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/90">
            Mean Machine
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] pt-1">
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentLevelData ? (
            <motion.div
              key={level}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              className="flex h-full min-h-0 flex-col gap-3"
            >
              <section className="mx-auto w-full max-w-[22rem] shrink-0 rounded-[1.35rem] border border-cyan-100/28 bg-[linear-gradient(180deg,rgba(14,45,103,0.92),rgba(8,26,72,0.96))] px-4 py-3 text-center shadow-[0_16px_28px_rgba(2,6,23,0.36)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                  Mean Machine
                </div>
                <div className="mt-1 text-[clamp(1rem,3.8vw,1.2rem)] font-black text-white">
                  Find the mean of the data set
                </div>
                <div className="mt-1 text-[11px] font-semibold text-cyan-100/80">
                  Add the numbers, then divide by how many numbers there are.
                </div>
              </section>

              <main className="flex min-h-0 flex-1 flex-col gap-3">
                <section className="relative min-h-0 flex-1 overflow-hidden rounded-[1.7rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(15,41,95,0.74),rgba(6,22,62,0.9))] px-3 py-3 shadow-[0_18px_30px_rgba(2,6,23,0.34)]">
                  <div className="pointer-events-none absolute inset-x-[12%] top-[9%] h-16 rounded-full bg-cyan-300/12 blur-2xl" />
                  <div className="flex h-full min-h-0 flex-col gap-3">
                    <div className="grid shrink-0 grid-cols-2 gap-2">
                      <div className="rounded-[1.1rem] border border-cyan-100/24 bg-slate-950/26 px-3 py-2 text-center">
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
                          Data Count
                        </div>
                        <div className="mt-1 text-xl font-black text-cyan-50">
                          {currentLevelData.numbers.length}
                        </div>
                      </div>
                      <div className="rounded-[1.1rem] border border-amber-100/24 bg-slate-950/26 px-3 py-2 text-center">
                        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/75">
                          Total
                        </div>
                        <div className="mt-1 text-xl font-black text-amber-100">
                          {currentLevelData.total}
                        </div>
                      </div>
                    </div>

                    <div className="relative shrink-0 overflow-hidden rounded-[1.4rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(17,56,128,0.8),rgba(11,31,83,0.94))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                      <div className="pointer-events-none absolute inset-x-[18%] top-2 h-10 rounded-full bg-cyan-300/15 blur-xl" />
                      <div className="relative flex items-center justify-between gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-100/30 bg-slate-950/28 shadow-[0_8px_14px_rgba(2,6,23,0.3)]">
                          <Scale className="h-6 w-6 text-cyan-100" />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-cyan-100/18 bg-slate-950/25 px-3 py-2">
                          <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Total</div>
                            <div className="text-xl font-black text-white">{currentLevelData.total}</div>
                          </div>
                          <div className="text-lg font-black text-cyan-100/70">÷</div>
                          <div className="text-center">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">Count</div>
                            <div className="text-xl font-black text-white">{currentLevelData.numbers.length}</div>
                          </div>
                          <div className="text-lg font-black text-cyan-100/70">=</div>
                          <div className="flex h-12 min-w-[3.25rem] items-center justify-center rounded-[1rem] border border-amber-200/45 bg-[linear-gradient(180deg,rgba(251,191,36,0.95),rgba(245,158,11,0.95))] px-3 text-[1.55rem] font-black text-slate-950 shadow-[0_10px_18px_rgba(146,64,14,0.35)]">
                            {selectedAnswer ?? '?'}
                          </div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-100/30 bg-slate-950/28 shadow-[0_8px_14px_rgba(2,6,23,0.3)]">
                          <TrendingUp className="h-6 w-6 text-cyan-100" />
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-cyan-100/20 bg-slate-950/18 p-3">
                      <div className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">
                        Data Set
                      </div>
                      <div className="grid h-full min-h-0 grid-cols-3 gap-2 sm:grid-cols-4">
                        {currentLevelData.numbers.map((n, i) => (
                          <div
                            key={i}
                            className="flex min-h-[3.1rem] items-center justify-center rounded-[1rem] border border-cyan-100/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] px-2 text-[clamp(1rem,4vw,1.35rem)] font-black text-white shadow-[0_10px_16px_rgba(2,6,23,0.2)]"
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="shrink-0 rounded-[1.5rem] border border-cyan-100/22 bg-[linear-gradient(180deg,rgba(10,31,83,0.92),rgba(7,21,58,0.96))] p-3 shadow-[0_16px_26px_rgba(2,6,23,0.34)]">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {currentLevelData.options.map((option, idx) => (
                        <button
                          key={`${option}-${idx}`}
                          type="button"
                          ref={idx === 0 ? inputRef : undefined}
                          onClick={() => setSelectedAnswer(option)}
                          disabled={gameState === 'success'}
                          className={`rounded-[1rem] border px-4 py-3 text-lg font-black transition-all ${
                            selectedAnswer === option
                              ? 'border-amber-100/85 bg-[linear-gradient(180deg,#fbbf24_0%,#f59e0b_100%)] text-slate-950 shadow-[0_12px_20px_rgba(146,64,14,0.34)]'
                              : 'border-cyan-100/24 bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white'
                          } ${gameState === 'success' ? 'opacity-80' : 'hover:brightness-110'}`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {gameState === 'success' ? (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={nextLevel}
                          type="button"
                          className="mx-auto flex min-h-[3rem] items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f8d66b_0%,#f2a82c_100%)] px-7 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_0_rgba(146,87,8,0.72),0_16px_24px_rgba(2,6,23,0.22)]"
                        >
                          Continue <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      ) : (
                        <button
                          type="submit"
                          className="mx-auto flex min-h-[2.8rem] items-center gap-2 rounded-full border border-cyan-100/26 bg-[linear-gradient(180deg,#123d90_0%,#0b2b72_100%)] px-6 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_20px_rgba(2,6,23,0.26)] hover:brightness-110"
                        >
                          Verify Mean
                        </button>
                      )}
                    </AnimatePresence>
                  </form>
                </section>
              </main>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'complete' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
            >
              <div className="w-full max-w-[20rem] rounded-[1.75rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(16,46,107,0.96),rgba(8,25,68,0.98))] px-5 py-6 text-center text-white shadow-[0_22px_36px_rgba(2,6,23,0.46)]">
                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/40 bg-amber-300/18">
                  <Trophy className="h-10 w-10 text-amber-200" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-[-10px] rounded-full border-2 border-dashed border-amber-200/30"
                  />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/75">
                  Mean Machine
                </div>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.04em] text-amber-100">
                  Machine Calibrated
                </h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-100/82">
                  You balanced every data set and mastered the mean.
                </p>
                <div className="mt-4 rounded-[1.25rem] border border-cyan-100/18 bg-slate-950/24 px-4 py-4">
                  <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/72">Final XP</div>
                  <div className="mt-1 text-4xl font-black text-amber-100">{XP}</div>
                </div>
                <button
                  type="button"
                  onClick={startGame}
                  className="mx-auto mt-5 flex min-h-[3rem] items-center gap-2 rounded-full bg-[linear-gradient(180deg,#f8d66b_0%,#f2a82c_100%)] px-7 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_0_rgba(146,87,8,0.72),0_16px_24px_rgba(2,6,23,0.22)]"
                >
                  <RotateCcw className="h-4 w-4" /> Restart
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {feedback ? (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className={`absolute bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-1/2 z-40 flex max-w-[18rem] -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-center shadow-[0_16px_26px_rgba(2,6,23,0.34)] ${
                feedback.type === 'success'
                  ? 'border-emerald-200/55 bg-emerald-500/24 text-emerald-50'
                  : 'border-rose-200/55 bg-rose-500/24 text-rose-50'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                {feedback.message}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MeanMachineGame;
