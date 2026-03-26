import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mountain,
  ArrowUpDown,
  CheckCircle2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  LayoutGrid,
  Divide,
  Calculator,
  Search,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface NumberItem {
  id: number;
  value: number;
  isSorted: boolean;
}

interface LevelData {
  numbers: NumberItem[];
  median: number;
  isEven: boolean;
  middleIndices: number[];
}

interface MedianMountainGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const MAX_LEVEL = 10;

const scoreToStars = (score: number) => {
  if (score >= 3500) return 3;
  if (score >= 2500) return 2;
  return 1;
};

const MedianMountainGame: React.FC<MedianMountainGameProps> = ({
  levelId: _levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<'playing' | 'success' | 'complete'>('playing');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [currentLevelData, setCurrentLevelData] = useState<LevelData | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSorted, setIsSorted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateLevel = useCallback((lvl: number) => {
    const count = lvl <= 5
      ? 3 + (Math.floor((lvl - 1) / 2) * 2)
      : 4 + (Math.floor((lvl - 6) / 2) * 2);

    const evenSet = count % 2 === 0;
    const rawNumbers: number[] = [];
    for (let i = 0; i < count; i += 1) {
      rawNumbers.push(Math.floor(Math.random() * 50) + 1);
    }

    const sorted = [...rawNumbers].sort((a, b) => a - b);
    let medianValue: number;
    let middle: number[] = [];

    if (evenSet) {
      const mid1 = count / 2 - 1;
      const mid2 = count / 2;
      medianValue = (sorted[mid1] + sorted[mid2]) / 2;
      middle = [mid1, mid2];
    } else {
      const mid = Math.floor(count / 2);
      medianValue = sorted[mid];
      middle = [mid];
    }

    const numbers: NumberItem[] = rawNumbers.map((value, index) => ({
      id: index,
      value,
      isSorted: false,
    }));

    setCurrentLevelData({
      numbers,
      median: medianValue,
      isEven: evenSet,
      middleIndices: middle,
    });
    setUserAnswer('');
    setFeedback(null);
    setIsSorted(false);
    setTimeout(() => inputRef.current?.focus(), 10);
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

  const toggleSort = () => {
    if (!currentLevelData) return;
    setIsSorted(prev => !prev);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentLevelData || gameState !== 'playing') return;

    const numAnswer = parseFloat(userAnswer);
    if (numAnswer === currentLevelData.median) {
      setScore(prev => prev + 200 + (level * 40));
      setFeedback({ type: 'success', message: 'Path Found! That is the Median.' });
      setGameState('success');
      return;
    }

    setFeedback({ type: 'error', message: 'The middle is elsewhere. Try again!' });
    setTimeout(() => setFeedback(null), 1500);
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
    onVictory(scoreToStars(score), score);
  };

  const displayNumbers = currentLevelData
    ? (isSorted ? [...currentLevelData.numbers].sort((a, b) => a.value - b.value) : currentLevelData.numbers)
    : [];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-indigo-50 font-sans text-indigo-900 select-none">
      <header className="z-20 flex h-16 items-center justify-between border-b border-indigo-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
            aria-label="Back to levels"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="rounded-lg bg-indigo-600 p-2 shadow-lg shadow-indigo-200">
            <Mountain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-indigo-800">Median Mountain</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Middle Path Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Mountain XP</span>
            <span className="text-sm font-black tabular-nums text-indigo-600">{score} XP</span>
          </div>
          <div className="h-8 w-[1px] bg-indigo-200" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Ascent Progress</span>
            <span className="text-sm font-black text-indigo-800">Level {level} / {MAX_LEVEL}</span>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {(gameState === 'playing' || gameState === 'success') && currentLevelData && (
            <motion.div
              key={level}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex w-full max-w-4xl flex-col gap-8"
            >
              <div className="flex flex-col gap-8 rounded-3xl border border-indigo-100 bg-white p-8 shadow-xl shadow-indigo-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-indigo-100 p-2">
                      <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">Find the Median</h2>
                      <p className="text-xs font-medium text-indigo-400">
                        {currentLevelData.isEven
                          ? 'Even set: Find the average of the two middle numbers.'
                          : 'Odd set: Find the middle value after sorting.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleSort}
                    className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                      isSorted
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-indigo-100 bg-white text-indigo-400 hover:border-indigo-200'
                    }`}
                  >
                    <ArrowUpDown className="h-4 w-4" /> {isSorted ? 'Sorted' : 'Sort Data'}
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-4 py-8">
                  {displayNumbers.map((item, index) => {
                    const isMiddle = isSorted && currentLevelData.middleIndices.includes(index);
                    return (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: isMiddle && gameState === 'success' ? 1.2 : 1,
                        }}
                        className={`flex h-20 w-20 items-center justify-center rounded-2xl border-4 text-2xl font-black shadow-lg transition-all ${
                          isMiddle
                            ? (gameState === 'success'
                              ? 'border-indigo-400 bg-indigo-600 text-white shadow-indigo-200'
                              : 'border-indigo-200 bg-indigo-50 text-indigo-600')
                            : 'border-indigo-50 bg-white text-indigo-300'
                        }`}
                      >
                        {item.value}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-4">
                  <form onSubmit={handleSubmit} className="flex gap-4">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="number"
                        step="0.5"
                        disabled={gameState === 'success'}
                        value={userAnswer}
                        onChange={(event) => setUserAnswer(event.target.value)}
                        placeholder="Enter the Median..."
                        className="w-full rounded-2xl border-2 border-indigo-100 bg-indigo-50 px-6 py-4 text-xl font-black text-indigo-800 transition-all placeholder:text-indigo-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200">
                        {currentLevelData.isEven ? <Divide className="h-6 w-6" /> : <Search className="h-6 w-6" />}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {gameState === 'success' ? (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={nextLevel}
                          type="button"
                          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
                        >
                          Climb Higher <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      ) : (
                        <button
                          type="submit"
                          className="flex items-center gap-2 rounded-2xl bg-indigo-800 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-900"
                        >
                          Verify Path
                        </button>
                      )}
                    </AnimatePresence>
                  </form>

                  {currentLevelData.isEven && isSorted && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-widest text-indigo-400"
                    >
                      <Calculator className="h-3 w-3" />
                      ({displayNumbers[currentLevelData.middleIndices[0]].value} + {displayNumbers[currentLevelData.middleIndices[1]].value}) ÷ 2 = ?
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-50/95 p-12 text-center backdrop-blur-md"
            >
              <div className="flex max-w-md flex-col items-center">
                <div className="relative mb-8">
                  <Trophy className="h-24 w-24 text-indigo-600 drop-shadow-lg" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 -z-10 -m-8 rounded-full bg-indigo-200/30"
                  />
                </div>
                <h2 className="mb-2 text-4xl font-black uppercase tracking-tight text-indigo-800">Summit Reached</h2>
                <p className="mb-8 font-medium text-indigo-500">
                  You have mastered finding the middle path.
                </p>
                <div className="mb-8 w-full rounded-3xl border border-indigo-200 bg-white p-8 shadow-xl shadow-indigo-200/50">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-indigo-400">Final Ascent Score</span>
                  <span className="text-5xl font-black text-indigo-600">{score} XP</span>
                </div>
                <button
                  onClick={startGame}
                  className="flex items-center gap-3 rounded-full bg-indigo-800 px-12 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-900"
                >
                  <RotateCcw className="h-4 w-4" /> New Ascent
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute bottom-12 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-8 py-4 shadow-2xl ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-rose-200 bg-rose-50 text-rose-600'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span className="text-sm font-black uppercase tracking-wide">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="z-20 flex h-10 items-center justify-between border-t border-indigo-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Altimeter: Calibrated</span>
          </div>
          <div className="h-3 w-[1px] bg-indigo-200" />
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Altitude: Level {level}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">© 2026 Median Mountain Expedition</span>
        </div>
      </footer>
    </div>
  );
};

export default MedianMountainGame;
