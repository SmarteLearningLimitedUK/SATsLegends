import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleDollarSign, Gem as GemIcon, Target, Timer as TimerIcon, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface PerimeterPathGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface GameState {
  width: number;
  height: number;
  options: number[];
  correctAnswer: number;
}

const TopBar = ({
  score,
  coins,
  gems,
  timerLabel,
  onBack,
}: {
  score: number;
  coins: number;
  gems: number;
  timerLabel: string;
  onBack: () => void;
}) => (
  <div className="w-full px-2 pt-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-900/60 p-1">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-white bg-blue-500 shadow-lg active:scale-95"
          aria-label="Back"
        >
          <Target className="h-4 w-4 text-white" />
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-200">Perimeter Path</span>
          <div className="h-2 w-24 overflow-hidden rounded-full border border-white/10 bg-black/40">
            <div className="h-full w-3/4 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
          </div>
        </div>
        <span className="px-1 text-xs font-black text-white">{score.toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-yellow-400/50 bg-blue-900/80 px-3 py-1 shadow-lg">
        <Zap className="h-4 w-4 fill-current text-yellow-400" />
        <span className="text-sm font-black text-white">{timerLabel}</span>
        <div className="flex h-4 w-4 items-center justify-center rounded-sm bg-green-500">
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
      </div>
    </div>

    <div className="mt-2 flex justify-end gap-2">
      <div className="flex items-center gap-1 rounded-md border border-yellow-600/30 bg-black/40 px-2 py-0.5">
        <CircleDollarSign className="h-3 w-3 text-yellow-400" />
        <span className="text-[10px] font-bold text-white">{coins.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1 rounded-md border border-pink-600/30 bg-black/40 px-2 py-0.5">
        <GemIcon className="h-3 w-3 text-pink-400" />
        <span className="text-[10px] font-bold text-white">{gems}</span>
      </div>
    </div>
  </div>
);

const PerimeterRectangle = ({ width, height }: { width: number; height: number }) => (
  <div className="relative flex h-48 w-64 items-center justify-center">
    <div className="absolute inset-0 rounded-lg border-[12px] border-[#1a2e14] bg-[#2d4a22] shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
    </div>

    <div className="relative z-10 flex flex-col items-center">
      <div className="relative h-20 w-24 rounded-t-xl border-4 border-[#5c3c10] bg-gradient-to-b from-yellow-600 to-yellow-900 shadow-2xl">
        <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#5c3c10] bg-yellow-400">
          <div className="h-3 w-1 rounded-full bg-[#5c3c10]" />
        </div>
        <div className="absolute inset-y-0 left-4 w-2 bg-[#5c3c10]/40" />
        <div className="absolute inset-y-0 right-4 w-2 bg-[#5c3c10]/40" />
      </div>
      <div className="-mt-1 h-4 w-28 rounded-b-lg border-x-4 border-b-4 border-[#5c3c10] bg-[#3d2b1f] shadow-xl" />
      <div className="h-6 w-32 rounded-sm border-2 border-stone-800 bg-stone-600 shadow-lg" />
    </div>

    <div className="absolute left-1/2 top-0 mb-2 -translate-x-1/2 -translate-y-full">
      <div className="relative rounded-md border-2 border-[#5c3c10] bg-yellow-400 px-3 py-1 text-lg font-black text-[#5c3c10] shadow-lg">
        {width}
        <div className="absolute bottom-0 left-1/2 h-4 w-0.5 -translate-x-1/2 translate-y-full bg-yellow-400" />
      </div>
    </div>

    <div className="absolute left-0 top-1/2 mr-2 -translate-x-full -translate-y-1/2">
      <div className="relative rounded-md border-2 border-[#5c3c10] bg-yellow-400 px-3 py-1 text-lg font-black text-[#5c3c10] shadow-lg">
        ?
        <div className="absolute right-0 top-1/2 h-0.5 w-4 -translate-y-1/2 translate-x-full bg-yellow-400" />
      </div>
    </div>

    <div className="absolute right-0 top-1/2 ml-2 -translate-y-1/2 translate-x-full">
      <div className="relative rounded-md border-2 border-[#5c3c10] bg-yellow-400 px-3 py-1 text-lg font-black text-[#5c3c10] shadow-lg">
        ?
        <div className="absolute left-0 top-1/2 h-0.5 w-4 -translate-x-full -translate-y-1/2 bg-yellow-400" />
      </div>
    </div>
  </div>
);

const Monster = () => (
  <div className="relative flex h-48 w-48 items-center justify-center">
    <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
    <div className="relative z-10">
      <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-red-900 bg-gradient-to-b from-red-800 to-red-950 shadow-2xl">
        <div className="absolute left-1/4 top-1/3 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]">
          <div className="h-4 w-2 rounded-full bg-black" />
        </div>
        <div className="absolute right-1/4 top-1/3 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]">
          <div className="h-4 w-2 rounded-full bg-black" />
        </div>
        <div className="absolute bottom-1/4 left-1/2 flex h-8 w-16 -translate-x-1/2 items-center justify-center gap-2 rounded-b-full border-t-4 border-white/20 bg-black">
          <div className="h-4 w-2 rounded-b-sm bg-white" />
          <div className="h-4 w-2 rounded-b-sm bg-white" />
        </div>
      </div>
      <div className="absolute -top-4 left-4 h-12 w-8 rotate-[-30deg] rounded-full border-2 border-red-900 bg-red-950" />
      <div className="absolute -top-4 right-4 h-12 w-8 rotate-[30deg] rounded-full border-2 border-red-900 bg-red-950" />
      <div className="absolute -left-8 top-1/2 h-16 w-16 rounded-full border-4 border-red-950 bg-red-900" />
      <div className="absolute -right-8 top-1/2 h-16 w-16 rounded-full border-4 border-red-950 bg-red-900" />
    </div>
  </div>
);

const PerimeterPathGame: React.FC<PerimeterPathGameProps> = ({
  levelId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(54000);
  const [gems] = useState(420);
  const [timeLeft, setTimeLeft] = useState(95 + (levelId * 5));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const endedRef = useRef(false);

  const targetScore = useMemo(() => 1600 + (levelId * 220), [levelId]);

  const generateLevel = useCallback(() => {
    const width = Math.floor(Math.random() * 9) + 2;
    const height = Math.floor(Math.random() * 9) + 2;
    const correctAnswer = 2 * (width + height);
    const options = [correctAnswer];

    while (options.length < 3) {
      const wrong = Math.max(4, correctAnswer + ((Math.floor(Math.random() * 10) - 5) * 2));
      if (!options.includes(wrong)) options.push(wrong);
    }

    setGameState({
      width,
      height,
      options: options.sort((a, b) => a - b),
      correctAnswer,
    });
    setSelectedOption(null);
  }, []);

  useEffect(() => {
    endedRef.current = false;
    setScore(0);
    setTimeLeft(95 + (levelId * 5));
    setFeedback(null);
    generateLevel();
  }, [generateLevel, levelId]);

  useEffect(() => {
    if (endedRef.current) return;
    if (timeLeft <= 0) {
      endedRef.current = true;
      if (score >= targetScore) {
        const stars = score >= targetScore * 1.9 ? 3 : score >= targetScore * 1.35 ? 2 : 1;
        onVictory(stars, score);
      } else {
        onGameOver(score);
      }
      return;
    }

    const interval = window.setTimeout(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(interval);
  }, [onGameOver, onVictory, score, targetScore, timeLeft]);

  const handleBrew = () => {
    if (!gameState || selectedOption === null || endedRef.current || feedback) return;

    if (selectedOption === gameState.correctAnswer) {
      const earned = 260 + (levelId * 25) + Math.floor(timeLeft / 3);
      const nextScore = score + earned;
      setFeedback('correct');
      setScore(nextScore);
      setCoins((value) => value + 80);

      if (nextScore >= targetScore) {
        endedRef.current = true;
        const stars = nextScore >= targetScore * 1.9 ? 3 : nextScore >= targetScore * 1.35 ? 2 : 1;
        window.setTimeout(() => onVictory(stars, nextScore), 350);
        return;
      }

      window.setTimeout(() => {
        setFeedback(null);
        generateLevel();
      }, 350);
      return;
    }

    setFeedback('incorrect');
    setScore((value) => Math.max(0, value - 120));
    window.setTimeout(() => setFeedback(null), 400);
  };

  const timerLabel = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0a1a3a] font-sans text-white select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1e3a8a_0%,#0a1a3a_100%)]" />

      <div className="relative flex h-full w-full max-w-[500px] flex-col">
        <TopBar score={score} coins={coins} gems={gems} timerLabel={timerLabel} onBack={onBack} />

        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4">
          <Monster />

          <div className="relative w-full max-w-[320px]">
            <div className="relative z-10 rounded-xl border-4 border-blue-400 bg-gradient-to-b from-blue-600 to-blue-900 px-6 py-3 text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              <span className="text-2xl font-black italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Calculate the perimeter!
              </span>
            </div>
            <div className="absolute left-[-1rem] top-1/2 z-0 h-10 w-8 -translate-y-1/2 rounded-l-lg border-y-4 border-l-4 border-blue-400 bg-blue-800" />
            <div className="absolute right-[-1rem] top-1/2 z-0 h-10 w-8 -translate-y-1/2 rotate-180 rounded-r-lg border-y-4 border-l-4 border-blue-400 bg-blue-800" />
          </div>

          {gameState && <PerimeterRectangle width={gameState.width} height={gameState.height} />}

          <div className="mt-2">
            <span className="text-2xl font-black italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Perimeter =
            </span>
          </div>

          <div className="rounded-full border border-yellow-200/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.95),rgba(245,158,11,0.95))] px-4 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_8px_16px_rgba(2,6,23,0.24)]">
            Target {targetScore} | + correct, - wrong
          </div>
        </div>

        <div className="flex h-48 items-center justify-between gap-4 border-t-4 border-blue-400/30 bg-blue-950/80 p-4 backdrop-blur-md">
          <div className="flex flex-col items-center gap-1">
            <div className="relative h-20 w-16">
              <div className="absolute bottom-0 h-16 w-16 overflow-hidden rounded-full border-4 border-blue-400 bg-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                <div className="absolute inset-x-0 bottom-0 h-3/4 animate-pulse bg-blue-400/60" />
              </div>
              <div className="absolute left-1/2 top-0 h-8 w-6 -translate-x-1/2 rounded-t-sm border-2 border-stone-500 bg-stone-300" />
            </div>
            <div className="rounded-md border-2 border-[#5c3c10] bg-yellow-500 px-3 py-0.5 text-sm font-black text-[#5c3c10]">2X</div>
          </div>

          <div className="relative flex flex-1 items-center justify-between rounded-xl border-4 border-[#1a2e14] bg-blue-900/60 p-2">
            <button type="button" className="text-white/40" aria-label="Previous option">
              <ChevronLeft />
            </button>

            <div className="flex gap-4">
              {gameState?.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedOption(option)}
                  className={`text-xl font-black transition-all ${selectedOption === option ? 'scale-125 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'text-white/60'}`}
                >
                  {option}
                </button>
              ))}
            </div>

            <button type="button" className="text-white/40" aria-label="Next option">
              <ChevronRight />
            </button>

            <div className="absolute left-1/2 top-0 h-4 w-6 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-stone-600 bg-stone-400">
              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-stone-400" />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBrew}
            className={`flex h-16 w-32 items-center justify-center rounded-xl border-4 border-[#5c3c10] bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-700 shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform ${feedback === 'incorrect' ? 'ring-4 ring-red-400/70' : ''} ${feedback === 'correct' ? 'ring-4 ring-emerald-300/70' : ''}`}
          >
            <span className="text-2xl font-black uppercase italic text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Brew
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default PerimeterPathGame;
