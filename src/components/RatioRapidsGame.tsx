import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import GameActionDock from './GameActionDock';
import GameplayHUD from './GameplayHUD';
import { Anchor, Droplets, Star } from './GameIcons';

interface RatioRapidsGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface CargoItem {
  name: string;
  short: string;
  color: string;
  glow: string;
}

interface RatioProblem {
  ratioA: number;
  ratioB: number;
  givenA: number | null;
  givenB: number | null;
  targetA: number;
  targetB: number;
  cargoA: CargoItem;
  cargoB: CargoItem;
}

const CARGO_ITEMS: CargoItem[] = [
  { name: 'Sun Gems', short: 'SG', color: 'from-amber-300 via-yellow-300 to-orange-400', glow: 'shadow-[0_0_24px_rgba(251,191,36,0.3)]' },
  { name: 'Mist Crystals', short: 'MC', color: 'from-cyan-300 via-sky-300 to-blue-400', glow: 'shadow-[0_0_24px_rgba(56,189,248,0.3)]' },
  { name: 'Forest Herbs', short: 'FH', color: 'from-lime-300 via-emerald-300 to-green-400', glow: 'shadow-[0_0_24px_rgba(74,222,128,0.3)]' },
  { name: 'Royal Ink', short: 'RI', color: 'from-violet-300 via-fuchsia-300 to-pink-400', glow: 'shadow-[0_0_24px_rgba(232,121,249,0.3)]' },
  { name: 'Forge Ore', short: 'FO', color: 'from-slate-300 via-stone-300 to-orange-400', glow: 'shadow-[0_0_24px_rgba(251,146,60,0.24)]' },
  { name: 'Moon Pearls', short: 'MP', color: 'from-indigo-300 via-blue-300 to-cyan-300', glow: 'shadow-[0_0_24px_rgba(96,165,250,0.28)]' },
];

const formatRatio = (first: number, second: number) => `${first}:${second}`;

const RatioRapidsGame: React.FC<RatioRapidsGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(68 + (levelId * 15));
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [problem, setProblem] = useState<RatioProblem | null>(null);
  const [playerA, setPlayerA] = useState(0);
  const [playerB, setPlayerB] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 820 + (levelId * 220);
  const progress = Math.min((score / targetScore) * 100, 100);

  const generateProblem = useCallback(() => {
    const ratioA = Math.floor(Math.random() * 5) + 1;
    let ratioB = Math.floor(Math.random() * 5) + 1;
    while (ratioB === ratioA) {
      ratioB = Math.floor(Math.random() * 5) + 1;
    }

    const multiplier = Math.floor(Math.random() * (2 + levelId * 2)) + 2;
    const targetA = ratioA * multiplier;
    const targetB = ratioB * multiplier;
    const cargoA = CARGO_ITEMS[Math.floor(Math.random() * CARGO_ITEMS.length)];
    let cargoB = CARGO_ITEMS[Math.floor(Math.random() * CARGO_ITEMS.length)];
    while (cargoB.name === cargoA.name) {
      cargoB = CARGO_ITEMS[Math.floor(Math.random() * CARGO_ITEMS.length)];
    }

    const missingA = Math.random() > 0.5;
    setProblem({
      ratioA,
      ratioB,
      givenA: missingA ? null : targetA,
      givenB: missingA ? targetB : null,
      targetA,
      targetB,
      cargoA,
      cargoB,
    });
    setPlayerA(missingA ? 0 : targetA);
    setPlayerB(missingA ? targetB : 0);
    setFeedback(null);
  }, [levelId]);

  useEffect(() => {
    setScore(0);
    setTimeLeft(68 + (levelId * 15));
    setStreak(0);
    setFeedback(null);
    setIsGameOver(false);
    setIsVictory(false);
    generateProblem();
  }, [generateProblem, levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;
    if (timeLeft <= 0) {
      if (score >= targetScore) {
        const stars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
        setIsVictory(true);
        confetti({
          particleCount: 150,
          spread: 68,
          origin: { y: 0.62 },
          colors: ['#38bdf8', '#fde68a', '#ffffff'],
        });
        onVictory(stars, score);
      } else {
        setIsGameOver(true);
        onGameOver(score);
      }
      return undefined;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore, timeLeft]);

  const handleSubmit = () => {
    if (!problem || feedback) return;

    const isCorrect = playerA === problem.targetA && playerB === problem.targetB;
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      const points = 120 + (streak * 20);
      const newScore = score + points;
      setScore(newScore);
      setStreak((prev) => prev + 1);

      confetti({
        particleCount: 44,
        spread: 46,
        origin: { y: 0.7 },
        colors: ['#22d3ee', '#60a5fa', '#ffffff'],
      });

      setTimeout(() => {
        if (newScore >= targetScore) {
          const stars = newScore >= targetScore * 1.85 ? 3 : newScore >= targetScore * 1.3 ? 2 : 1;
          setIsVictory(true);
          onVictory(stars, newScore);
        } else {
          generateProblem();
        }
      }, 760);
    } else {
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 35));
      setTimeout(() => setFeedback(null), 760);
    }
  };

  const adjustCargo = (side: 'A' | 'B', delta: number) => {
    if (!problem || feedback) return;
    if (side === 'A' && problem.givenA === null) setPlayerA((prev) => Math.max(0, prev + delta));
    if (side === 'B' && problem.givenB === null) setPlayerB((prev) => Math.max(0, prev + delta));
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[linear-gradient(180deg,#0f766e_0%,#0f172a_42%,#020617_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32%] bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_42%)]" />
        <motion.div className="absolute inset-x-[-10%] bottom-[24%] h-[28%] rounded-[45%] bg-cyan-400/18 blur-2xl" animate={{ x: ['0%', '4%', '0%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute inset-x-[-12%] bottom-[16%] h-[24%] rounded-[45%] bg-sky-500/22 blur-2xl" animate={{ x: ['0%', '-4%', '0%'] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,rgba(14,165,233,0.04),rgba(8,47,73,0.3)_18%,rgba(8,47,73,0.78)_56%,rgba(2,6,23,0.98)_100%)]" />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Ratio Rapids"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-cyan-950"
          accentSoftBg="bg-cyan-100/86"
          accentBorder="border-cyan-200/88"
          progressBar="bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300"
          statLabel="Streak"
          statValue={streak}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-2 shadow-[0_28px_64px_rgba(0,0,0,0.34)] md:rounded-[2.6rem] md:p-4">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.14))]" />

          {problem && (
            <>
              <div className="relative z-10 mb-2 rounded-[1.3rem] border border-cyan-100/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.88),rgba(8,47,73,0.96))] px-4 py-3 shadow-[0_18px_36px_rgba(0,0,0,0.24)] md:mb-4 md:rounded-[1.8rem]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/74 md:text-xs">River Contract</div>
                    <div className="mt-1 text-base font-black text-white md:text-3xl">{formatRatio(problem.ratioA, problem.ratioB)}</div>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50 md:text-xs">
                    Keep the cargo in exact proportion
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-2 md:gap-3 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,89,133,0.44),rgba(8,47,73,0.86))] p-3 shadow-[0_24px_38px_rgba(0,0,0,0.26)] md:rounded-[2rem]">
                  <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(14,116,144,0.32),rgba(8,47,73,0.92))]" />
                  <div className="absolute left-[10%] top-[16%] h-12 w-12 rounded-full bg-white/14 blur-2xl" />
                  <div className="absolute right-[10%] top-[22%] h-12 w-12 rounded-full bg-white/12 blur-2xl" />

                  <div className="relative flex h-full flex-col justify-between gap-3">
                    <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/26 px-3 py-2 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">Cargo Order</div>
                      <div className="mt-1 text-sm font-bold text-white md:text-lg">
                        Load the rafts so the cargo stays in the ratio {problem.ratioA}:{problem.ratioB}.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[{ key: 'A', cargo: problem.cargoA, value: playerA, given: problem.givenA !== null }, { key: 'B', cargo: problem.cargoB, value: playerB, given: problem.givenB !== null }].map((raft) => (
                        <div key={raft.key} className="relative rounded-[1.2rem] border border-white/12 bg-slate-950/24 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <div className={`absolute inset-x-[22%] top-[16%] h-14 rounded-full bg-gradient-to-br ${raft.cargo.color} opacity-35 blur-2xl`} />
                          <div className="relative flex flex-col items-center gap-2">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${raft.cargo.color} text-sm font-black text-slate-950 shadow-[0_14px_20px_rgba(0,0,0,0.24)] ${raft.cargo.glow}`}>
                              {raft.cargo.short}
                            </div>
                            <div className="text-center">
                              <div className="text-[11px] font-black text-white md:text-base">{raft.cargo.name}</div>
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/54 md:text-[10px]">Raft {raft.key}</div>
                            </div>
                            <motion.div
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                              className="relative flex h-16 w-full items-center justify-center rounded-[1.1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(41,37,36,0.82),rgba(28,25,23,0.92))] shadow-[0_14px_24px_rgba(0,0,0,0.24)]"
                            >
                              <div className="absolute inset-x-[10%] bottom-[-10px] h-5 rounded-full bg-cyan-950/50 blur-md" />
                              <div className="absolute inset-x-[12%] bottom-0 h-5 rounded-[0.9rem] bg-[linear-gradient(180deg,#7c4a22,#4a2b14)]" />
                              <div className="absolute inset-x-[8%] bottom-[10px] h-7 rounded-[0.8rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.02))] backdrop-blur-[2px]" />
                              <div className="relative text-2xl font-black text-white md:text-3xl">{raft.value}</div>
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid min-h-0 grid-rows-[1fr_auto] gap-2 md:gap-3">
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {[{ side: 'A' as const, cargo: problem.cargoA, value: playerA, locked: problem.givenA !== null }, { side: 'B' as const, cargo: problem.cargoB, value: playerB, locked: problem.givenB !== null }].map((panel) => (
                      <div key={panel.side} className="rounded-[1.4rem] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(8,47,73,0.9))] p-3 shadow-[0_20px_30px_rgba(0,0,0,0.24)] md:rounded-[1.8rem]">
                        <div className="mb-2 text-center">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/66 md:text-[11px]">Adjust {panel.side}</div>
                          <div className="mt-1 text-sm font-black text-white md:text-lg">{panel.cargo.name}</div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => adjustCargo(panel.side, -1)}
                            disabled={panel.locked || !!feedback}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-xl font-black text-white disabled:opacity-35"
                          >
                            -
                          </button>
                          <div className="rounded-[1rem] border border-white/12 bg-white/10 px-3 py-2 text-center">
                            <div className="text-2xl font-black text-white md:text-3xl">{panel.value}</div>
                          </div>
                          <button
                            onClick={() => adjustCargo(panel.side, 1)}
                            disabled={panel.locked || !!feedback}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-xl font-black text-white disabled:opacity-35"
                          >
                            +
                          </button>
                        </div>

                        {panel.locked && (
                          <div className="mt-2 rounded-full border border-emerald-200/18 bg-emerald-400/12 px-2.5 py-1 text-center text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/82">
                            Locked Cargo
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!!feedback}
                    className="licensed-submit-button flex items-center justify-center gap-3 rounded-[1.4rem] py-3 text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-45 md:rounded-[1.8rem] md:text-2xl"
                  >
                    <Anchor className="h-5 w-5 md:h-6 md:w-6" />
                    Set Sail
                  </button>
                </div>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className={`absolute inset-0 z-20 flex items-center justify-center rounded-[1.6rem] backdrop-blur-md ${
                        feedback === 'correct' ? 'bg-emerald-500/18' : 'bg-rose-500/18'
                      }`}
                    >
                      <div className="rounded-full border border-white/14 bg-slate-950/46 px-5 py-3 shadow-[0_18px_28px_rgba(0,0,0,0.24)]">
                        <div className={`flex items-center gap-3 text-lg font-black uppercase tracking-[0.2em] md:text-2xl ${
                          feedback === 'correct' ? 'text-emerald-100' : 'text-rose-100'
                        }`}>
                          <Droplets className="h-5 w-5 md:h-6 md:w-6" />
                          {feedback === 'correct' ? 'Safe Crossing' : 'Rapids Crash'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        <GameActionDock onBack={onBack} accentClass="text-cyan-100" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.84, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/66 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-cyan-200/32 bg-[linear-gradient(180deg,#f0f9ff,#bae6fd)] p-6 shadow-2xl md:gap-7 md:p-10">
                <div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isVictory ? 'Rapid Master' : 'River Closed'}
                </div>
                <button onClick={onBack} className="licensed-submit-button w-full rounded-2xl py-4 text-xl font-black text-white transition-all">
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RatioRapidsGame;
