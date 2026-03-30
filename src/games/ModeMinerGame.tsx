import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Pickaxe, RotateCcw, Trophy, TriangleAlert } from 'lucide-react';

interface VeinData {
  value: number;
  count: number;
}

interface LevelData {
  veins: VeinData[];
  mode: number;
  modeCount: number;
}

interface ModeMinerGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
  useSharedTopHud?: boolean;
}

const MAX_LEVEL = 10;
const MAX_MISTAKES = 3;

const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const scoreToStars = (XP: number) => {
  if (XP >= 2500) return 3;
  if (XP >= 1700) return 2;
  return 1;
};

const buildLevel = (level: number): LevelData => {
  const uniqueCount = Math.min(4 + Math.floor((level - 1) / 2), 6);
  const values: number[] = [];

  while (values.length < uniqueCount) {
    const candidate = randomInRange(2, level >= 6 ? 55 : 28);
    if (!values.includes(candidate)) values.push(candidate);
  }

  const modeIndex = randomInRange(0, uniqueCount - 1);
  const baseCount = level <= 3 ? 2 : 3;
  const counts = new Array(uniqueCount).fill(baseCount);
  counts[modeIndex] = baseCount + 2 + Math.floor(level / 3);

  for (let index = 0; index < counts.length; index += 1) {
    if (index === modeIndex) continue;
    counts[index] += randomInRange(0, Math.max(1, Math.floor(level / 3)));
    if (counts[index] >= counts[modeIndex]) {
      counts[index] = Math.max(1, counts[modeIndex] - randomInRange(1, 2));
    }
  }

  const veins = values
    .map((value, index) => ({ value, count: counts[index] }))
    .sort((a, b) => b.count - a.count || a.value - b.value);

  return {
    veins,
    mode: values[modeIndex],
    modeCount: counts[modeIndex],
  };
};

const veinPalette = [
  'from-slate-700 via-slate-800 to-slate-950',
  'from-cyan-700 via-sky-800 to-slate-950',
  'from-indigo-700 via-blue-900 to-slate-950',
  'from-emerald-700 via-teal-800 to-slate-950',
  'from-violet-700 via-indigo-900 to-slate-950',
  'from-stone-700 via-neutral-800 to-slate-950',
];

const ModeMinerGame: React.FC<ModeMinerGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
  useSharedTopHud: _useSharedTopHud = true,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [XP, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeVein, setActiveVein] = useState<number | null>(null);
  const [drillState, setDrillState] = useState<'idle' | 'drilling' | 'overheat'>('idle');

  const startGame = useCallback(() => {
    setXP(0);
    setLevel(1);
    setCombo(0);
    setMistakes(0);
    setCurrentLevelData(buildLevel(1));
    setFeedback(null);
    setActiveVein(null);
    setDrillState('idle');
    setGameState('playing');
  }, []);

  useEffect(() => {
    setCurrentLevelData(buildLevel(1));
  }, []);

  const handleNextLevel = useCallback(() => {
    if (level < MAX_LEVEL) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setCurrentLevelData(buildLevel(nextLevel));
      setFeedback(null);
      setActiveVein(null);
      setDrillState('idle');
      setGameState('playing');
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  }, [XP, level, onVictory]);

  const handleVeinTap = useCallback((value: number) => {
    if (!currentLevelData || gameState !== 'playing') return;

    setActiveVein(value);

    if (value === currentLevelData.mode) {
      const earned = 140 + level * 22 + combo * 18;
      setXP((previous) => previous + earned);
      setCombo((previous) => previous + 1);
      setDrillState('drilling');
      setFeedback({ type: 'success', message: `Gold burst! ${value} appears ${currentLevelData.modeCount} times.` });
      setGameState('success');
      window.setTimeout(() => handleNextLevel(), 760);
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setCombo(0);
    setDrillState('overheat');
    setFeedback({ type: 'error', message: 'Drill overheated. Find the number vein with the biggest cluster.' });

    window.setTimeout(() => {
      setFeedback(null);
      setActiveVein(null);
      setDrillState('idle');
    }, 950);

    if (nextMistakes >= MAX_MISTAKES) {
      window.setTimeout(() => onGameOver(XP), 520);
    }
  }, [XP, combo, currentLevelData, gameState, handleNextLevel, level, mistakes, onGameOver]);

  const mistakesLeft = useMemo(() => Math.max(0, MAX_MISTAKES - mistakes), [mistakes]);

  return (
    <div className="relative z-10 flex h-full w-full overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(250,204,21,0.12),transparent_25%),linear-gradient(180deg,rgba(2,6,23,0.25),rgba(2,6,23,0.68))]" />

      <main className="relative z-10 flex h-full w-full flex-col px-[max(1rem,env(safe-area-inset-left))] py-2">
        <div className="mx-auto flex h-full w-full max-w-[31rem] min-h-0 flex-col gap-2.5">
          <section className="shrink-0 rounded-[1.3rem] border border-cyan-100/25 bg-[linear-gradient(180deg,rgba(10,26,68,0.86),rgba(7,16,46,0.88))] px-4 py-3 shadow-[0_18px_36px_rgba(2,6,23,0.52)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-900/55 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  <Pickaxe className="h-3.5 w-3.5" />
                  Mode Miner
                </div>
                <p className="mt-2 text-[clamp(1rem,4.5vw,1.25rem)] font-black leading-tight text-white">
                  Drill the number vein that appears most often.
                </p>
                <p className="mt-1 text-[11px] font-bold text-cyan-100/82">
                  Repetition is shown as rock clusters. Bigger cluster = stronger evidence.
                </p>
              </div>
              <div className="grid gap-1.5 text-right">
                <div className="rounded-full border border-cyan-100/18 bg-slate-950/28 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/84">
                  L{level}/{MAX_LEVEL}
                </div>
                <div className="rounded-full border border-cyan-100/18 bg-slate-950/28 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/84">
                  Combo x{Math.max(1, combo)}
                </div>
                <div className="rounded-full border border-amber-200/18 bg-slate-950/28 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/84">
                  Mistakes {mistakesLeft}
                </div>
              </div>
            </div>
          </section>

          <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-cyan-100/24 bg-[linear-gradient(180deg,rgba(9,24,58,0.85),rgba(6,15,38,0.94))] px-3 py-3 shadow-[0_18px_36px_rgba(2,6,23,0.52)]">
            <div className="pointer-events-none absolute inset-x-[8%] top-[9%] h-16 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.5))]" />

            <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 rounded-[1.15rem] border border-cyan-100/18 bg-slate-950/28 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/76">Hero Tool</p>
                <p className="mt-0.5 text-sm font-black text-white">Mining Drill</p>
              </div>
              <motion.div
                animate={drillState === 'drilling'
                  ? { rotate: [0, -10, 10, -8, 8, 0], scale: [1, 1.08, 1.02] }
                  : drillState === 'overheat'
                    ? { rotate: [0, -18, 18, -12, 12, 0], y: [0, -2, 0] }
                    : { y: [0, -3, 0] }}
                transition={drillState === 'idle'
                  ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.45 }}
                className="relative flex h-16 w-24 shrink-0 items-center justify-center rounded-[1.1rem] border border-cyan-100/22 bg-[linear-gradient(180deg,#1e3a8a_0%,#0f172a_100%)] shadow-[0_12px_24px_rgba(2,6,23,0.35)]"
              >
                <span className={`absolute inset-0 rounded-[1.1rem] ${drillState === 'drilling' ? 'bg-amber-300/20' : drillState === 'overheat' ? 'bg-rose-400/18' : 'bg-cyan-300/10'} blur-sm`} />
                <Pickaxe className={`relative z-10 h-8 w-8 ${drillState === 'overheat' ? 'text-rose-200' : 'text-amber-200'}`} />
              </motion.div>
            </div>

            <motion.div
              animate={drillState === 'drilling'
                ? { scale: [1, 1.02, 1] }
                : drillState === 'overheat'
                  ? { scale: [1, 0.985, 1], y: [0, 6, 0] }
                  : { scale: 1 }}
              transition={{ duration: 0.36 }}
              className="relative mt-2.5 flex min-h-0 flex-1 overflow-hidden rounded-[1.35rem] border border-cyan-100/16 bg-[linear-gradient(180deg,rgba(30,41,59,0.66),rgba(15,23,42,0.9))] px-3 py-3"
            >
              <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
              <div className="relative z-10 flex w-full min-h-0 flex-col justify-center">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100/82">Rock Wall</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-100/82">
                    {currentLevelData?.veins.reduce((sum, vein) => sum + vein.count, 0) ?? 0} stones
                  </span>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 overflow-hidden sm:grid-cols-3">
                  {currentLevelData?.veins.map((vein, index) => {
                    const isMode = vein.value === currentLevelData.mode;
                    const isActive = activeVein === vein.value;
                    const burst = gameState === 'success' && isMode;
                    const collapsed = drillState === 'overheat' && isActive;
                    const columns = vein.count >= 6 ? 3 : 2;

                    return (
                      <motion.button
                        key={`${level}-${vein.value}`}
                        type="button"
                        disabled={gameState === 'success'}
                        onClick={() => handleVeinTap(vein.value)}
                        whileTap={gameState === 'playing' ? { scale: 0.98 } : undefined}
                        animate={burst
                          ? { scale: [1, 1.04, 0.98, 1], boxShadow: ['0 0 0 rgba(0,0,0,0)', '0 0 24px rgba(250,204,21,0.38)', '0 0 0 rgba(0,0,0,0)'] }
                          : collapsed
                            ? { x: [0, -4, 4, -2, 2, 0], rotate: [0, -1, 1, 0], opacity: [1, 0.76, 1] }
                            : { scale: 1 }}
                        transition={{ duration: burst ? 0.55 : 0.4 }}
                        aria-label={`Drill vein ${vein.value}, repeated ${vein.count} times`}
                        className={`group relative flex min-h-[8.2rem] flex-col overflow-hidden rounded-[1.15rem] border p-2.5 text-left shadow-[0_14px_24px_rgba(2,6,23,0.3)] ${
                          burst
                            ? 'border-amber-200/80 bg-[linear-gradient(180deg,#fbbf24_0%,#92400e_100%)]'
                            : collapsed
                              ? 'border-rose-200/60 bg-[linear-gradient(180deg,#7f1d1d_0%,#1f2937_100%)]'
                              : isActive
                                ? 'border-cyan-200/80 bg-[linear-gradient(180deg,#1d4ed8_0%,#0f172a_100%)]'
                                : `border-cyan-100/18 bg-[linear-gradient(180deg,var(--tw-gradient-stops))] ${veinPalette[index % veinPalette.length]}`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/76">Vein</p>
                            <p className="text-[clamp(1.15rem,4vw,1.5rem)] font-black text-white">{vein.value}</p>
                          </div>
                          <div className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${burst ? 'bg-amber-100/20 text-amber-50' : 'bg-slate-950/28 text-cyan-100/82'}`}>
                            x{vein.count}
                          </div>
                        </div>

                        <div
                          className="mt-2 grid flex-1 content-start gap-1.5"
                          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: vein.count }).map((_, gemIndex) => (
                            <motion.div
                              key={`${vein.value}-${gemIndex}`}
                              animate={burst
                                ? { scale: [1, 1.18, 1], y: [0, -3, 0] }
                                : collapsed
                                  ? { y: [0, 4, 0], opacity: [1, 0.42, 1], scale: [1, 0.9, 1] }
                                  : { scale: 1 }}
                              transition={{ duration: 0.34, delay: gemIndex * 0.03 }}
                              className={`flex h-7 items-center justify-center rounded-[0.75rem] border text-[11px] font-black ${burst ? 'border-amber-100/70 bg-amber-50/18 text-white' : 'border-cyan-100/16 bg-slate-950/34 text-cyan-50'}`}
                            >
                              {vein.value}
                            </motion.div>
                          ))}
                        </div>

                        {burst ? (
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.28),transparent_58%)]" />
                        ) : null}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {gameState === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/78 p-8 text-center backdrop-blur-sm"
          >
            <div className="flex w-full max-w-md flex-col items-center rounded-[2rem] border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(14,34,82,0.95),rgba(8,20,54,0.95))] px-7 py-8 shadow-[0_20px_50px_rgba(2,6,23,0.6)]">
              <Trophy className="mb-4 h-16 w-16 text-amber-300" />
              <h2 className="mb-1 text-3xl font-black uppercase tracking-tight text-white">Mine Master</h2>
              <p className="mb-5 text-sm font-semibold text-cyan-100/90">You extracted the mode from every wall.</p>
              <div className="mb-6 rounded-xl border border-cyan-100/20 bg-slate-900/50 px-6 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/70">Final XP</p>
                <p className="text-4xl font-black text-amber-200">{XP}</p>
              </div>
              <button
                type="button"
                onClick={startGame}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-100/70 bg-cyan-500 px-7 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            aria-live="polite"
            className={`absolute left-1/2 top-[calc(env(safe-area-inset-top)+6.4rem)] z-50 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
              feedback.type === 'success'
                ? 'border-emerald-200/75 bg-emerald-500/25 text-emerald-50'
                : 'border-rose-200/75 bg-rose-500/25 text-rose-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {feedback.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
              {feedback.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModeMinerGame;
