import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { ShieldCheck } from 'lucide-react';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';

interface PerimeterPathGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface CageProblem {
  length: number;
  width: number;
  options: number[];
  perimeter: number;
}

const TOTAL_CAPTURES = 6;

const makeProblem = (round: number, levelId: number): CageProblem => {
  const difficulty = Math.max(1, Math.floor((round + levelId) / 2));
  const minSide = 2 + Math.min(6, difficulty);
  const maxSide = minSide + 7 + Math.min(8, difficulty);
  const length = Math.floor(Math.random() * (maxSide - minSide + 1)) + minSide;
  const width = Math.floor(Math.random() * (maxSide - minSide + 1)) + minSide;
  const perimeter = 2 * (length + width);

  const options = new Set<number>([perimeter]);
  while (options.size < 4) {
    const offset = (Math.floor(Math.random() * 7) + 1) * 2;
    const direction = Math.random() > 0.5 ? 1 : -1;
    options.add(Math.max(8, perimeter + (direction * offset)));
  }

  return {
    length,
    width,
    perimeter,
    options: Array.from(options).sort((a, b) => a - b),
  };
};

const CageBlueprint = ({ length, width }: { length: number; width: number }) => (
  <div className="relative mx-auto flex h-[13rem] w-[18rem] items-center justify-center md:h-[15rem] md:w-[22rem]">
    <div className="absolute inset-0 rounded-[1.4rem] border border-sky-100/25 bg-[linear-gradient(180deg,rgba(8,25,52,0.7),rgba(6,15,32,0.82))] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_28px_rgba(0,0,0,0.32)]" />
    <div className="absolute inset-[12%] rounded-[1rem] border-[6px] border-amber-300/80 bg-[radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.2),rgba(8,15,32,0.5)_55%,rgba(8,15,32,0.82))]" />
    <div className="absolute inset-[12%] rounded-[1rem] border border-amber-100/40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />

    <div className="absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border border-yellow-100/50 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-3 py-1 text-xs font-black text-amber-950 shadow-[0_8px_16px_rgba(0,0,0,0.25)]">
      {length} m
    </div>
    <div className="absolute right-[8%] top-1/2 -translate-y-1/2 rounded-full border border-yellow-100/50 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-3 py-1 text-xs font-black text-amber-950 shadow-[0_8px_16px_rgba(0,0,0,0.25)]">
      {width} m
    </div>
  </div>
);

const PerimeterPathGame: React.FC<PerimeterPathGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [problem, setProblem] = useState<CageProblem>(() => makeProblem(0, levelId));
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90 + (levelId * 5));
  const [captures, setCaptures] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isVictory, setIsVictory] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const avatar = AVATARS.find((item) => item.id === avatarId) || AVATARS[0];
  const targetScore = 1400 + (levelId * 150);
  const progress = Math.min(100, (captures / TOTAL_CAPTURES) * 100);

  const generateLevel = useCallback((nextRound: number) => {
    setProblem(makeProblem(nextRound, levelId));
    setSelectedOption(null);
  }, [levelId]);

  useEffect(() => {
    setScore(0);
    setTimeLeft(90 + (levelId * 5));
    setCaptures(0);
    setRoundIndex(0);
    setFeedback(null);
    setIsVictory(false);
    setIsGameOver(false);
    generateLevel(0);
  }, [generateLevel, levelId]);

  useEffect(() => {
    if (isVictory || isGameOver || feedback) return undefined;

    if (timeLeft <= 0) {
      if (captures >= Math.ceil(TOTAL_CAPTURES * 0.7) || score >= targetScore) {
        const stars = score >= targetScore * 1.9 ? 3 : score >= targetScore * 1.35 ? 2 : 1;
        setIsVictory(true);
        onVictory(stars, score);
      } else {
        setIsGameOver(true);
        onGameOver(score);
      }
      return;
    }

    const interval = window.setTimeout(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(interval);
  }, [captures, feedback, isGameOver, isVictory, onGameOver, onVictory, score, targetScore, timeLeft]);

  const advanceAfterCorrect = (nextScore: number) => {
    const nextCaptureCount = captures + 1;
    const nextRound = roundIndex + 1;
    setCaptures(nextCaptureCount);
    setRoundIndex(nextRound);

    if (nextCaptureCount >= TOTAL_CAPTURES || nextScore >= targetScore) {
      const stars = nextScore >= targetScore * 1.9 ? 3 : nextScore >= targetScore * 1.35 ? 2 : 1;
      setIsVictory(true);
      onVictory(stars, nextScore);
      return;
    }

    window.setTimeout(() => {
      setFeedback(null);
      generateLevel(nextRound);
    }, 600);
  };

  const handleDeployCage = () => {
    if (selectedOption === null || feedback || isVictory || isGameOver) return;

    if (selectedOption === problem.perimeter) {
      const earned = 220 + (levelId * 35) + Math.floor(timeLeft / 2);
      const nextScore = score + earned;
      setScore(nextScore);
      setFeedback('correct');
      confetti({
        particleCount: 60,
        spread: 56,
        origin: { y: 0.62 },
        colors: ['#fde047', '#38bdf8', '#4ade80'],
      });
      advanceAfterCorrect(nextScore);
      return;
    }

    setFeedback('incorrect');
    setScore((value) => Math.max(0, value - 110));
    window.setTimeout(() => {
      setFeedback(null);
      setSelectedOption(null);
    }, 550);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden p-2 font-sans pt-[env(safe-area-inset-top)] md:p-4">
      <GameplaySceneBackdrop gameType="measurement_forge" />

      <div className="relative z-10 flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Perimeter Path"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-cyan-900"
          accentSoftBg="bg-cyan-100/80"
          accentBorder="border-cyan-200/80"
          progressBar="bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
          statLabel="Captures"
          statValue={`${captures}/${TOTAL_CAPTURES}`}
          compact
        />

        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(250,204,21,0.16),transparent_20%),linear-gradient(180deg,rgba(8,15,30,0.14),rgba(8,15,30,0.34))]" />

          <div className="relative z-10 mb-3 flex items-center justify-center">
            <div className="licensed-game-card w-full max-w-[42rem] px-4 py-3 text-center md:px-5 md:py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/72">Capture Mission</div>
              <div className="mt-1 text-[1.1rem] font-black leading-tight text-white md:text-[1.4rem]">
                Calculate the perfect cage perimeter to trap the enemy.
              </div>
              <div className="mt-2 text-xs font-bold text-white/76 md:text-sm">
                Length = {problem.length} m, Width = {problem.width} m. What perimeter is needed?
              </div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 md:gap-4">
            <div className="licensed-game-card-dark relative flex min-h-[15rem] items-center justify-center overflow-hidden rounded-[1.75rem] p-4 md:min-h-[18rem]">
              <CageBlueprint length={problem.length} width={problem.width} />
              <motion.div
                animate={feedback === 'correct' ? { scale: [1, 1.08, 1] } : {}}
                className="absolute bottom-4 right-4 rounded-full border border-yellow-200/65 bg-[linear-gradient(180deg,rgba(250,204,21,0.92),rgba(245,158,11,0.95))] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
              >
                P = 2 x (L + W)
              </motion.div>
            </div>

            <div className="licensed-game-card-dark rounded-[1.5rem] p-3 md:p-4">
              <div className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/65">
                Select Perimeter (metres)
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {problem.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedOption(option)}
                    className={`rounded-[1rem] border px-4 py-4 text-center text-xl font-black transition-all ${
                      selectedOption === option
                        ? 'border-yellow-200/80 bg-[linear-gradient(180deg,#facc15,#f59e0b)] text-amber-950 shadow-[0_12px_20px_rgba(0,0,0,0.3)]'
                        : 'border-sky-100/25 bg-[linear-gradient(180deg,rgba(30,58,138,0.92),rgba(15,23,42,0.95))] text-white hover:-translate-y-0.5'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeployCage}
                  disabled={selectedOption === null || !!feedback}
                  className={`flex h-[3.4rem] min-w-[12rem] items-center justify-center gap-2 rounded-[1rem] border border-yellow-200/70 bg-[linear-gradient(180deg,#facc15,#f59e0b)] px-6 text-base font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_12px_22px_rgba(0,0,0,0.3)] ${
                    selectedOption === null || feedback ? 'opacity-50' : 'hover:brightness-105'
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                  Deploy Cage
                </motion.button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
              >
                <div className={`rounded-[1.6rem] border px-8 py-5 text-center shadow-[0_20px_40px_rgba(0,0,0,0.35)] ${
                  feedback === 'correct'
                    ? 'border-emerald-300/65 bg-emerald-500/16 text-emerald-300'
                    : 'border-rose-300/65 bg-rose-500/16 text-rose-300'
                }`}>
                  <div className="text-3xl font-black">{feedback === 'correct' ? 'Cage Locked!' : 'Wrong Perimeter'}</div>
                  <div className="mt-2 text-sm font-bold text-white/84">
                    {feedback === 'correct'
                      ? 'Enemy captured. Move to the next target.'
                      : 'Recalculate and try another cage size.'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-auto w-full max-w-6xl">
          <GameActionDock onBack={onBack} compact />
        </div>
      </div>
    </div>
  );
};

export default PerimeterPathGame;
