import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Pickaxe, RotateCcw, Search, Trophy } from 'lucide-react';
import factorFrenzyBackground from '../assets/maps/facctor frenzy.jpg';

interface LevelData {
  numbers: number[];
  mode: number;
  choices: number[];
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

const shuffle = <T,>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const scoreToStars = (XP: number) => {
  if (XP >= 2500) return 3;
  if (XP >= 1700) return 2;
  return 1;
};

const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildLevel = (level: number): LevelData => {
  const uniqueCount = Math.min(3 + Math.floor((level - 1) / 2), 6);
  const totalItems = 10 + (level * 2);

  const values: number[] = [];
  while (values.length < uniqueCount) {
    const candidate = randomInRange(2, 45);
    if (!values.includes(candidate)) values.push(candidate);
  }

  const modeIndex = randomInRange(0, uniqueCount - 1);
  const counts = new Array(uniqueCount).fill(1);
  let remaining = totalItems - uniqueCount;

  while (remaining > 0) {
    const idx = randomInRange(0, uniqueCount - 1);
    if (idx === modeIndex || counts[idx] < counts[modeIndex] - 1) {
      counts[idx] += 1;
      remaining -= 1;
    }
  }

  const highestOther = Math.max(...counts.filter((_, idx) => idx !== modeIndex));
  if (counts[modeIndex] <= highestOther) {
    counts[modeIndex] = highestOther + 1;
  }

  const numbers: number[] = [];
  values.forEach((value, idx) => {
    for (let i = 0; i < counts[idx]; i += 1) numbers.push(value);
  });

  const mode = values[modeIndex];
  const modeCount = counts[modeIndex];

  const distractors = shuffle(values.filter((value) => value !== mode)).slice(0, 3);
  while (distractors.length < 3) {
    const near = mode + randomInRange(-5, 5);
    if (near > 0 && near !== mode && !distractors.includes(near)) distractors.push(near);
  }

  return {
    numbers: shuffle(numbers),
    mode,
    modeCount,
    choices: shuffle([mode, ...distractors.slice(0, 3)]),
  };
};

const ModeMinerGame: React.FC<ModeMinerGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
  useSharedTopHud = true,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [XP, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [Combo, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const startGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setStreak(0);
    setMistakes(0);
    setSelectedChoice(null);
    setCurrentLevelData(buildLevel(1));
    setFeedback(null);
    setGameState('playing');
  }, []);

  useEffect(() => {
    setCurrentLevelData(buildLevel(1));
  }, []);

  const handleNextLevel = useCallback(() => {
    if (level < MAX_LEVEL) {
      const next = level + 1;
      setLevel(next);
      setSelectedChoice(null);
      setCurrentLevelData(buildLevel(next));
      setFeedback(null);
      setGameState('playing');
      return;
    }

    setGameState('complete');
    onVictory(scoreToStars(XP), XP);
  }, [level, onVictory, XP]);

  const handleSubmit = useCallback((choiceOverride?: number) => {
    if (!currentLevelData || gameState !== 'playing') return;

    const activeChoice = choiceOverride ?? selectedChoice;

    if (activeChoice === null) {
      setFeedback({ type: 'error', message: 'Pick one number first.' });
      window.setTimeout(() => setFeedback(null), 1200);
      return;
    }

    if (activeChoice === currentLevelData.mode) {
      const earned = 120 + level * 20 + Combo * 15;
      setScore((prev) => prev + earned);
      setStreak((prev) => prev + 1);
      setFeedback({ type: 'success', message: `Great! ${activeChoice} appears the most.` });
      setGameState('success');
      window.setTimeout(() => handleNextLevel(), 650);
      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setStreak(0);
    setFeedback({ type: 'error', message: 'Not the mode. Look for the most repeated number.' });
    window.setTimeout(() => setFeedback(null), 1300);

    if (nextMistakes >= MAX_MISTAKES) {
      window.setTimeout(() => onGameOver(XP), 550);
    }
  }, [currentLevelData, gameState, handleNextLevel, level, mistakes, onGameOver, XP, selectedChoice, Combo]);

  const topPadding = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.35rem)]'
    : 'pt-[calc(env(safe-area-inset-top)+1rem)]';

  const mistakesLeft = useMemo(() => Math.max(0, MAX_MISTAKES - mistakes), [mistakes]);

  return (
    <div className="fixed inset-0 z-20 h-screen w-screen overflow-hidden text-white">
      <img
        src={factorFrenzyBackground}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(74,222,128,0.22),rgba(3,7,20,0.46)_68%)]" />

      <main className={`relative z-10 flex h-full w-full flex-col ${topPadding} px-[max(1rem,env(safe-area-inset-left))] pb-[calc(env(safe-area-inset-bottom)+4.25rem)]`}>
        <div className="mx-auto flex h-full w-full max-w-[31rem] min-h-0 flex-col">
          <AnimatePresence mode="wait">
            {(gameState === 'playing' || gameState === 'success') && currentLevelData && (
              <motion.div
                key={level}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="my-auto flex w-full min-h-0 flex-col gap-3 rounded-[1.45rem] border border-cyan-100/25 bg-[linear-gradient(180deg,rgba(10,26,68,0.86),rgba(7,16,46,0.88))] p-3.5 shadow-[0_18px_36px_rgba(2,6,23,0.52)] backdrop-blur-[2px]"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-cyan-900/55 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    <Pickaxe className="h-3.5 w-3.5" />
                    Mode Miner
                  </div>
                  <div className="text-right text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">
                    L{level}/{MAX_LEVEL}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-100/18 bg-slate-900/35 px-4 py-3 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">Mission</p>
                  <p className="mt-1 text-[clamp(1rem,4.5vw,1.3rem)] font-black leading-tight text-white">
                    Tap the number that appears the most
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-cyan-100/85">
                    Mistakes left: {mistakesLeft} • Combo: x{Combo}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-100/18 bg-slate-950/35 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/85">Data Cave</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/85">
                      {currentLevelData.numbers.length} gems
                    </span>
                  </div>
                  <div className="max-h-[22vh] min-h-[18vh] overflow-hidden pr-1">
                    <div className="flex flex-wrap gap-2">
                      {currentLevelData.numbers.map((value, idx) => (
                        <div
                          key={`${value}-${idx}`}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-black ${
                            gameState === 'success' && value === currentLevelData.mode
                              ? 'border-emerald-300 bg-emerald-500 text-white shadow-[0_0_0_2px_rgba(16,185,129,0.25)]'
                              : 'border-cyan-200/35 bg-slate-900/60 text-cyan-50'
                          }`}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {currentLevelData.choices.map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      disabled={gameState === 'success'}
                      onClick={() => {
                        setSelectedChoice(choice);
                        if (choice === currentLevelData.mode) {
                          handleSubmit(choice);
                        }
                      }}
                      className={`rounded-xl border-2 px-3 py-3 text-center text-2xl font-black transition ${
                        selectedChoice === choice
                          ? 'border-amber-300 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] text-amber-950 shadow-[0_10px_20px_rgba(245,158,11,0.35)]'
                          : 'border-cyan-100/30 bg-slate-900/50 text-cyan-50 hover:border-cyan-100/55'
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100/85">
                    XP: {XP}
                  </div>
                  {gameState === 'success' ? (
                    <button
                      type="button"
                      onClick={handleNextLevel}
                      className="rounded-full border border-emerald-200/80 bg-emerald-500 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-[0_8px_16px_rgba(16,185,129,0.35)]"
                    >
                      Next Level
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="inline-flex items-center gap-2 rounded-full border border-cyan-100/70 bg-cyan-500 px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_8px_16px_rgba(34,211,238,0.35)]"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Check
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <h2 className="mb-1 text-3xl font-black uppercase tracking-tight text-white">Master Miner</h2>
              <p className="mb-5 text-sm font-semibold text-cyan-100/90">You found the mode in every cave.</p>
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
            className={`absolute left-1/2 top-[calc(env(safe-area-inset-top)+6.4rem)] z-50 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
              feedback.type === 'success'
                ? 'border-emerald-200/75 bg-emerald-500/25 text-emerald-50'
                : 'border-rose-200/75 bg-rose-500/25 text-rose-50'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {feedback.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {feedback.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModeMinerGame;
