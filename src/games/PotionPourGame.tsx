import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  FlaskConical,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface PotionPourGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface Recipe {
  ratio: number[];
  totalUnits: number;
  potionNames: string[];
  correctAmounts: number[];
}

type GameState = 'start' | 'playing' | 'end';
type Feedback = 'correct' | 'incorrect' | null;

interface FinalOutcome {
  won: boolean;
  stars: number;
  rawScore: number;
  rewardScore: number;
}

const GAME_DURATION = 90;

const POTION_CONFIG = [
  { name: 'Dragon Blood', color: 'bg-rose-500', text: 'text-rose-300', border: 'border-rose-400/50' },
  { name: 'Moon Essence', color: 'bg-indigo-500', text: 'text-indigo-300', border: 'border-indigo-400/50' },
  { name: 'Forest Moss', color: 'bg-emerald-500', text: 'text-emerald-300', border: 'border-emerald-400/50' },
];

const formatTimer = (seconds: number) => `${Math.max(0, seconds)}s`;

const starsForScore = (score: number, levelId: number) => {
  const target = 6 + levelId;
  if (score >= target + 6) return 3;
  if (score >= target + 3) return 2;
  if (score >= target) return 1;
  return 0;
};

const titleForScore = (score: number, levelId: number) => {
  const stars = starsForScore(score, levelId);
  if (stars === 3) return 'Archmage';
  if (stars === 2) return 'Spellsmith';
  if (stars === 1) return 'Apprentice';
  return 'Needs Practice';
};

const PotionPourGame: React.FC<PotionPourGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [userAmounts, setUserAmounts] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<FinalOutcome | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  const shareQuest = () => {
    const text = `I brewed ${scoreRef.current} spells in Potion Pour Panic! Can you match my ratio mastery?`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
    setShowShareToast(true);
    window.setTimeout(() => setShowShareToast(false), 2000);
  };

  const generateRecipe = useCallback(() => {
    const unlockedThreePotion = levelId >= 4;
    const numPotions = unlockedThreePotion && Math.random() > 0.55 ? 3 : 2;
    const ratio = Array.from({ length: numPotions }, () => Math.floor(Math.random() * 4) + 1);
    const ratioSum = ratio.reduce((a, b) => a + b, 0);
    const multiplier = Math.floor(Math.random() * 4) + 1;
    const totalUnits = ratioSum * multiplier;
    const correctAmounts = ratio.map((item) => item * multiplier);

    setCurrentRecipe({
      ratio,
      totalUnits,
      potionNames: POTION_CONFIG.slice(0, numPotions).map((potion) => potion.name),
      correctAmounts,
    });
    setUserAmounts(new Array(numPotions).fill(0));
    setFeedback(null);
  }, [levelId]);

  const finishRound = useCallback((rawScore: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();

    const stars = starsForScore(rawScore, levelId);
    const rewardScore = rawScore * 100;
    setFinalOutcome({
      won: stars > 0,
      stars,
      rawScore,
      rewardScore,
    });
    setGameState('end');
  }, [levelId]);

  const startGame = () => {
    finishedRef.current = false;
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(GAME_DURATION);
    setFeedback(null);
    setFinalOutcome(null);
    setGameState('playing');
    generateRecipe();
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    clearTimers();
    timerRef.current = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          finishRound(scoreRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [finishRound, gameState]);

  const handleAdjust = (index: number, delta: number) => {
    if (gameState !== 'playing' || feedback || !currentRecipe) return;

    setUserAmounts((previous) => {
      const next = [...previous];
      const currentTotal = next.reduce((a, b) => a + b, 0);

      if (delta > 0 && currentTotal >= currentRecipe.totalUnits) return previous;
      if (delta < 0 && next[index] <= 0) return previous;

      next[index] += delta;
      return next;
    });
  };

  const handleCast = () => {
    if (!currentRecipe || feedback || gameState !== 'playing') return;

    const isCorrect = userAmounts.every((value, index) => value === currentRecipe.correctAmounts[index]);

    if (isCorrect) {
      setFeedback('correct');
      setScore((previous) => previous + 1);
      transitionRef.current = setTimeout(() => {
        if (gameState === 'playing' && !finishedRef.current) {
          generateRecipe();
        }
      }, 950);
      return;
    }

    setFeedback('incorrect');
    transitionRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1200);
  };

  const currentTotal = userAmounts.reduce((a, b) => a + b, 0);
  const remainingUnits = Math.max(0, (currentRecipe?.totalUnits || 0) - currentTotal);

  const commitOutcome = () => {
    if (!finalOutcome) return;
    if (finalOutcome.won) {
      onVictory(finalOutcome.stars, finalOutcome.rewardScore);
      return;
    }
    onGameOver(finalOutcome.rewardScore);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center overflow-hidden bg-[#050505] font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1a0b2e_0%,#050505_100%)]" />

      <div className="relative z-10 flex h-full w-full max-w-[1200px] flex-col p-3 md:p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Back"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4 rounded-2xl border border-purple-400/30 bg-purple-900/40 p-3 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Spells Cast</span>
              <span className="text-2xl font-black leading-none text-white">{score}</span>
            </div>
            <div className="h-10 w-[2px] bg-purple-400/20" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">Magic Remaining</span>
              <div className="flex items-center gap-2">
                <Clock className={`h-5 w-5 ${timeLeft < 10 ? 'animate-pulse text-rose-500' : 'text-yellow-400'}`} />
                <span className={`text-2xl font-black leading-none ${timeLeft < 10 ? 'text-rose-500' : 'text-white'}`}>
                  {formatTimer(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2 rounded-2xl border border-purple-400/50 bg-purple-900/60 px-5 py-3 shadow-xl">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <h1 className="text-base font-black uppercase italic tracking-tight md:text-xl">Potion Pour Panic</h1>
            <button
              onClick={shareQuest}
              className="ml-3 rounded-xl bg-purple-400/20 p-2 transition-colors hover:bg-purple-400/40"
              aria-label="Share"
            >
              <Navigation className="h-4 w-4 rotate-45 text-purple-300" />
            </button>

            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute -bottom-12 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black text-white shadow-lg"
                >
                  COPIED TO CLIPBOARD
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {gameState === 'start' ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-xl rounded-[3rem] border-4 border-purple-400/30 bg-purple-950/40 p-12 shadow-2xl"
            >
              <FlaskConical className="mx-auto mb-6 h-24 w-24 text-purple-400" />
              <h2 className="mb-4 text-5xl font-black italic tracking-tighter">ALCHEMY PANIC</h2>
              <p className="mb-8 text-lg leading-relaxed text-purple-200">
                Brew spells by pouring potion ingredients in the correct ratio. You have{' '}
                <span className="font-bold text-white">90 seconds</span> to complete as many brews as possible.
              </p>
              <button
                onClick={startGame}
                className="rounded-full border-b-8 border-purple-700 bg-purple-500 px-12 py-5 text-2xl font-black text-white shadow-lg transition-transform hover:scale-105 active:translate-y-2 active:border-b-0"
              >
                BEGIN BREWING
              </button>
            </motion.div>
          </div>
        ) : gameState === 'playing' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
            <div className="relative overflow-hidden rounded-3xl border-2 border-purple-400/20 bg-purple-900/20 p-6 text-center">
              <div className="absolute left-0 top-0 h-1 w-full bg-purple-400/10" />
              <h2 className="mb-2 text-2xl font-black uppercase tracking-tight text-purple-100">
                Brew <span className="mx-2 text-4xl text-purple-400">{currentRecipe?.totalUnits}</span> units
              </h2>
              <div className="flex items-center justify-center gap-4">
                <span className="text-lg font-bold uppercase tracking-widest text-purple-300">Ratio</span>
                <div className="flex items-center gap-2">
                  {currentRecipe?.ratio.map((value, index) => (
                    <React.Fragment key={`ratio-${index}`}>
                      <span className={`${POTION_CONFIG[index].color} flex h-10 w-10 items-center justify-center rounded-lg text-xl font-black text-white shadow-lg`}>
                        {value}
                      </span>
                      {index < (currentRecipe?.ratio.length || 0) - 1 && (
                        <span className="text-2xl font-black text-purple-400">:</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[4rem] border-8 border-purple-900/40 bg-purple-950/20 shadow-inner">
              <div className="relative z-20 flex flex-col items-center">
                <div className="relative h-64 w-64">
                  <div className="absolute inset-0 overflow-hidden rounded-full border-8 border-zinc-800 bg-zinc-900 shadow-2xl">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(currentTotal / Math.max(currentRecipe?.totalUnits || 1, 1)) * 100}%` }}
                      className="absolute bottom-0 left-0 w-full bg-purple-500/40 transition-all duration-500"
                    >
                      {Array.from({ length: 8 }).map((_, index) => (
                        <motion.div
                          key={`bubble-${index}`}
                          animate={{ y: [-16, -72], opacity: [0, 1, 0], scale: [0.6, 1.1, 0.6] }}
                          transition={{ repeat: Infinity, duration: 1.3 + (index * 0.16), delay: index * 0.11 }}
                          className="absolute bottom-0 h-3 w-3 rounded-full bg-purple-300/40"
                          style={{ left: `${12 + index * 11}%` }}
                        />
                      ))}
                    </motion.div>
                  </div>
                  <div className="absolute -top-4 left-1/2 h-12 w-72 -translate-x-1/2 rounded-full border-4 border-zinc-700 bg-zinc-800 shadow-lg" />
                  <div className="absolute -bottom-4 left-8 h-12 w-8 rounded-full bg-zinc-800" />
                  <div className="absolute -bottom-4 right-8 h-12 w-8 rounded-full bg-zinc-800" />
                  <div className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <motion.div
                        key={`flame-${index}`}
                        animate={{ height: [20, 36, 20], opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 0.6 + (index * 0.08), delay: index * 0.08 }}
                        className="w-4 rounded-full bg-orange-500 blur-[2px]"
                      />
                    ))}
                  </div>
                </div>
                {remainingUnits > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                    className="mt-12 rounded-full border-4 border-white bg-rose-500 px-6 py-2 text-xl font-black text-white shadow-lg"
                  >
                    {remainingUnits} UNITS NEEDED
                  </motion.div>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-12 flex items-center justify-around px-10">
                {currentRecipe?.potionNames.map((name, index) => (
                  <motion.div
                    key={`potion-${name}`}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="relative">
                      <div className={`relative flex h-40 w-28 flex-col items-center justify-end rounded-2xl border-4 bg-zinc-900/80 p-2 ${POTION_CONFIG[index].border}`}>
                        <div className={`w-full rounded-lg ${POTION_CONFIG[index].color}`} style={{ height: '62%' }} />
                        <div className="absolute -top-6 left-1/2 h-8 w-8 -translate-x-1/2 rounded-t-lg border-4 border-zinc-700 bg-zinc-800" />
                        <div className={`absolute top-1/2 w-full -translate-y-1/2 px-2 text-center text-[10px] font-black uppercase tracking-tight ${POTION_CONFIG[index].text}`}>
                          {name}
                        </div>
                      </div>
                      <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
                        <button
                          onClick={() => handleAdjust(index, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 shadow-lg transition-all hover:bg-rose-400 active:translate-y-1"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl font-black text-zinc-950 shadow-xl">
                          {userAmounts[index]}
                        </div>
                        <button
                          onClick={() => handleAdjust(index, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-lg transition-all hover:bg-emerald-400 active:translate-y-1"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.4, opacity: 0 }}
                    className="absolute z-50 flex flex-col items-center"
                  >
                    {feedback === 'correct' ? (
                      <div className="rounded-full bg-emerald-500 p-6 text-white shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                        <CheckCircle2 className="h-24 w-24" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-rose-500 p-6 text-white shadow-[0_0_50px_rgba(244,63,94,0.5)]">
                        <AlertCircle className="h-24 w-24" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-center pb-6">
              <button
                onClick={handleCast}
                disabled={remainingUnits > 0 || feedback !== null}
                className={`flex items-center gap-4 rounded-full px-20 py-6 text-3xl font-black transition-all shadow-2xl ${
                  remainingUnits > 0 || feedback !== null
                    ? 'cursor-not-allowed bg-purple-900/20 text-purple-800 grayscale'
                    : 'border-b-8 border-purple-700 bg-purple-500 text-white hover:scale-105 active:translate-y-2 active:border-b-0'
                }`}
              >
                <Wand2 className="h-8 w-8" />
                CAST SPELL
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-w-lg rounded-[3rem] border-4 border-purple-400/30 bg-purple-950/40 p-12 shadow-2xl"
            >
              <Trophy className="mx-auto mb-6 h-24 w-24 text-yellow-400" />
              <h2 className="mb-2 text-5xl font-black italic uppercase tracking-tighter">
                {finalOutcome?.won ? 'RITUAL COMPLETE' : 'RITUAL FAILED'}
              </h2>
              <div className="mb-8 text-6xl font-black text-white">
                {score} <span className="text-2xl uppercase italic text-purple-400">Spells</span>
              </div>
              <div className="mb-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-purple-400/20 bg-purple-900/40 p-4">
                  <Star className="mx-auto mb-2 h-6 w-6 text-yellow-400" />
                  <span className="block text-[10px] font-black uppercase text-purple-300">Mastery</span>
                  <span className="text-xl font-black">{Math.min(100, Math.round((score / Math.max(1, 6 + levelId)) * 100))}%</span>
                </div>
                <div className="rounded-2xl border border-purple-400/20 bg-purple-900/40 p-4">
                  <Flame className="mx-auto mb-2 h-6 w-6 text-orange-300" />
                  <span className="block text-[10px] font-black uppercase text-purple-300">Title</span>
                  <span className="text-xl font-black">{titleForScore(score, levelId)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={startGame}
                  className="flex items-center justify-center gap-3 rounded-full border-b-8 border-purple-700 bg-purple-500 px-12 py-5 text-2xl font-black text-white shadow-lg transition-transform hover:scale-105 active:translate-y-2 active:border-b-0"
                >
                  <RotateCcw className="h-6 w-6" />
                  RETRY RITUAL
                </button>
                <button
                  onClick={commitOutcome}
                  className="rounded-full border-b-4 border-emerald-700 bg-emerald-500 px-12 py-5 text-xl font-black text-white transition-transform hover:scale-105 active:translate-y-1 active:border-b-0"
                >
                  CONTINUE
                </button>
                <button
                  onClick={shareQuest}
                  className="rounded-full border-b-4 border-white/10 bg-white/10 px-12 py-5 text-lg font-black text-white transition-all hover:bg-white/20 active:translate-y-1 active:border-b-0"
                >
                  SHARE MAGIC
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PotionPourGame;
