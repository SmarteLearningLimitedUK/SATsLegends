import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import BossPortrait from './BossPortrait';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { getBossEncounter } from '../bossMeta';
import { triggerHaptic } from '../haptics';
import { Castle, Star } from './GameIcons';

interface TowerOfFactorsGameProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface FactorProblem {
  target: number;
  factors: number[];
  options: number[];
}

const MAX_HEARTS = 4;

const FORGE_POSITIONS = [
  { top: '18%', left: '17%' },
  { top: '21%', left: '61%' },
  { top: '43%', left: '10%' },
  { top: '40%', left: '39%' },
  { top: '52%', left: '70%' },
  { top: '60%', left: '28%' },
  { top: '68%', left: '52%' },
  { top: '30%', left: '79%' },
  { top: '63%', left: '80%' },
  { top: '33%', left: '25%' },
  { top: '48%', left: '55%' },
  { top: '74%', left: '12%' },
] as const;

const generateFactorProblem = (levelId: number): FactorProblem => {
  const maxTarget = levelId === 1 ? 24 : levelId === 2 ? 48 : levelId === 3 ? 72 : 100;
  const minTarget = levelId === 1 ? 12 : 24;

  let target = 0;
  let factors: number[] = [];

  while (factors.length < 4) {
    target = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;
    factors = [];
    for (let candidate = 1; candidate <= target; candidate += 1) {
      if (target % candidate === 0) {
        factors.push(candidate);
      }
    }
  }

  const options = new Set<number>();
  const numCorrect = Math.min(factors.length, Math.floor(Math.random() * 3) + 3);
  const shuffledFactors = [...factors].sort(() => Math.random() - 0.5);

  for (let index = 0; index < numCorrect; index += 1) {
    options.add(shuffledFactors[index]);
  }

  while (options.size < 12) {
    const wrong = Math.floor(Math.random() * target) + 1;
    if (!factors.includes(wrong)) {
      options.add(wrong);
    }
  }

  return {
    target,
    factors,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
};

const SKY_STARS = [
  { top: '8%', left: '10%', size: 2.4, duration: '2.8s' },
  { top: '12%', left: '24%', size: 1.8, duration: '3.4s' },
  { top: '6%', left: '39%', size: 2.2, duration: '2.5s' },
  { top: '14%', left: '57%', size: 1.6, duration: '3.1s' },
  { top: '10%', left: '76%', size: 2.8, duration: '2.6s' },
  { top: '18%', left: '88%', size: 1.9, duration: '3.6s' },
  { top: '22%', left: '14%', size: 1.7, duration: '3s' },
  { top: '26%', left: '31%', size: 2.1, duration: '2.9s' },
  { top: '20%', left: '48%', size: 1.5, duration: '3.5s' },
  { top: '28%', left: '66%', size: 2.3, duration: '2.7s' },
  { top: '24%', left: '81%', size: 1.8, duration: '3.2s' },
  { top: '34%', left: '7%', size: 2.6, duration: '2.8s' },
  { top: '36%', left: '53%', size: 1.9, duration: '3.3s' },
  { top: '40%', left: '72%', size: 1.6, duration: '3.8s' },
];

const TowerOfFactorsGame: React.FC<TowerOfFactorsGameProps> = ({
  levelId,
  avatarId,
  isBoss = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [problem, setProblem] = useState<FactorProblem | null>(null);
  const [tower, setTower] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [shake, setShake] = useState(false);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [statusMessage, setStatusMessage] = useState('Tap every true factor before the forge line breaks.');

  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const targetScore = 800 + (levelId * 200);
  const bossEncounter = isBoss ? getBossEncounter('tower_of_factors') : undefined;
  const bossPose = !bossEncounter
    ? 'neutral'
    : isVictory
      ? 'defeat'
      : isGameOver
        ? 'victory'
        : feedback === 'correct'
          ? 'dazed'
          : feedback === 'incorrect'
            ? 'attack'
            : streak >= 3
              ? 'happy'
              : 'neutral';

  useEffect(() => {
    setTimeLeft(60 + levelId * 10);
    setScore(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStreak(0);
    setHearts(MAX_HEARTS);
    setTower([]);
    setStatusMessage('Tap every true factor before the forge line breaks.');
    setProblem(generateFactorProblem(levelId));
  }, [levelId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft > 0 && !isGameOver && !isVictory && !feedback) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, isGameOver, isVictory, feedback]);

  const handleTimeUp = () => {
    if (score >= targetScore) {
      handleWin();
    } else {
      setIsGameOver(true);
      onGameOver(score);
    }
  };

  const handleWin = () => {
    const stars = score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fde047', '#f8fafc', '#7dd3fc'],
    });
    onVictory(stars, score);
  };

  const handleSelect = (num: number) => {
    if (feedback || isGameOver || isVictory || !problem) return;
    if (tower.includes(num)) return;

    if (problem.factors.includes(num)) {
      triggerHaptic('selection');
      setFeedback('correct');
      setTower(prev => [...prev, num]);
      setStatusMessage(`${num} is a factor of ${problem.target}. Smash the next one.`);

      const points = 50 + (streak * 10);
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);

      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 },
        colors: ['#a3e635', '#84cc16', '#38bdf8'],
      });

      const correctOptions = problem.options.filter(option => problem.factors.includes(option));
      if (tower.length + 1 === correctOptions.length) {
        setTimeout(() => {
          setProblem(generateFactorProblem(levelId));
          setTower([]);
          setFeedback(null);
          setStatusMessage('New target forged. Tap every true factor before the timer runs out.');
        }, 1500);
      } else {
        setTimeout(() => setFeedback(null), 450);
      }
    } else {
      triggerHaptic('error');
      setFeedback('incorrect');
      setShake(true);
      setStreak(0);
      setScore(prev => Math.max(0, prev - 20));
      const nextHearts = hearts - 1;
      setHearts(nextHearts);
      setStatusMessage(`${num} is not a factor. The forge takes damage.`);

      setTimeout(() => {
        setTower([]);
        setShake(false);
        setFeedback(null);
      }, 1000);

      if (nextHearts <= 0) {
        setTimeout(() => {
          setIsGameOver(true);
          onGameOver(score);
        }, 250);
      }
    }
  };

  const progress = Math.min((score / targetScore) * 100, 100);
  const correctOptions = problem ? problem.options.filter(option => problem.factors.includes(option)) : [];
  const towerGoal = Math.max(correctOptions.length, 1);
  const remainingFactors = Math.max(correctOptions.length - tower.length, 0);

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-[linear-gradient(180deg,#07111f_0%,#112247_44%,#07101a_100%)] p-2 font-sans md:p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[6%] h-[30%] w-[42%] rounded-full bg-cyan-400/14 blur-3xl" />
        <div className="absolute right-[-14%] top-[12%] h-[34%] w-[46%] rounded-full bg-violet-400/12 blur-3xl" />
        <div className="absolute left-[14%] bottom-[-10%] h-[36%] w-[50%] rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[36%] bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.58)_18%,rgba(2,6,23,0.88)_100%)]" />
        <div className="absolute bottom-[9%] left-[-6%] h-[20%] w-[44%] rounded-[50%] bg-slate-950/44 blur-xl" />
        <div className="absolute bottom-[6%] right-[-8%] h-[24%] w-[48%] rounded-[50%] bg-slate-950/52 blur-xl" />
        {SKY_STARS.map((star, index) => (
          <div
            key={`${star.left}-${star.top}-${index}`}
            className="absolute animate-pulse rounded-full bg-white/90"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              top: star.top,
              left: star.left,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      <div className="z-10 flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col items-center gap-2 md:gap-4">
        <GameplayHUD
          title="Factor Forge"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-amber-950"
          accentSoftBg="bg-amber-100/80"
          accentBorder="border-amber-200/80"
          progressBar="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500"
          statLabel="Combo"
          statValue={streak}
        />

        <div className="relative w-full flex-1 min-h-0">
          {problem && (
            <div className="relative h-full overflow-hidden rounded-[2rem] border border-orange-200/14 bg-[linear-gradient(180deg,rgba(54,19,10,0.88),rgba(17,10,10,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_28px_60px_rgba(0,0,0,0.4)] md:rounded-[2.6rem]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,146,60,0.26),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(0,0,0,0.24)_100%)]" />
              <div className="absolute inset-x-[26%] top-[14%] h-[26%] rounded-full bg-orange-300/16 blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(15,23,42,0.3)_12%,rgba(28,12,6,0.86)_100%)]" />

              <div className="relative z-10 flex h-full flex-col p-3 md:p-5">
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <div className="rounded-[1.25rem] border border-white/10 bg-black/20 px-3 py-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: MAX_HEARTS }).map((_, index) => (
                        <div key={index} className={`h-6 w-6 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_58%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/10'} md:h-7 md:w-7`} />
                      ))}
                    </div>
                    <div className="mt-2 rounded-[1rem] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(251,146,60,0.92),rgba(194,65,12,0.98))] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_20px_rgba(120,53,15,0.28)]">
                      <div className="flex items-center justify-between gap-2 text-amber-50">
                        <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] md:text-[0.82rem]">Combo x{Math.max(streak, 1)}</span>
                        <span className="text-[1.15rem] font-black md:text-[2rem]">Target: {problem.target}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="rounded-[1.1rem] border border-white/10 bg-slate-950/46 px-4 py-2 text-center shadow-[0_12px_22px_rgba(0,0,0,0.24)]">
                      <div className="text-2xl font-black text-white md:text-4xl">{timeLeft}s</div>
                    </div>
                    {bossEncounter && (
                      <div className="w-20 md:w-28">
                        <BossPortrait encounter={bossEncounter} pose={bossPose} compact />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-center text-[0.72rem] font-black uppercase tracking-[0.16em] text-amber-100/82 md:text-sm">
                  {statusMessage}
                </div>

                <div className="relative mt-3 flex-1">
                  {problem.options.map((option, index) => {
                    const isSelected = tower.includes(option);
                    const isCorrect = problem.factors.includes(option);
                    const position = FORGE_POSITIONS[index % FORGE_POSITIONS.length];
                    const variant = index % 4;
                    const baseClass = variant === 0
                      ? 'rounded-[1.1rem] border-lime-200/28 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.34),rgba(132,204,22,0.86)_40%,rgba(77,124,15,0.96)_100%)]'
                      : variant === 1
                        ? 'rounded-[1.4rem] border-orange-200/22 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.24),rgba(251,146,60,0.82)_40%,rgba(120,53,15,0.98)_100%)]'
                        : variant === 2
                          ? 'rounded-full border-sky-200/24 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.34),rgba(59,130,246,0.82)_40%,rgba(30,64,175,0.96)_100%)]'
                          : 'rounded-[1.3rem] border-stone-300/18 bg-[linear-gradient(180deg,rgba(120,113,108,0.98),rgba(68,64,60,0.98))]';

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleSelect(option)}
                        disabled={isSelected || !!feedback || isGameOver || isVictory}
                        whileTap={{ scale: 0.96 }}
                        animate={feedback === 'incorrect' && !isCorrect ? { x: [0, 2, -2, 0] } : { y: [0, -4, 0] }}
                        transition={{ duration: feedback === 'incorrect' && !isCorrect ? 0.3 : 2.8 + (index * 0.08), repeat: feedback === 'incorrect' && !isCorrect ? 0 : Infinity, ease: 'easeInOut' }}
                        className={`absolute flex h-16 w-16 items-center justify-center border-2 text-center shadow-[0_18px_26px_rgba(0,0,0,0.24)] transition-all md:h-24 md:w-24 ${baseClass} ${
                          isSelected ? 'scale-[0.92] opacity-25 grayscale' : 'hover:scale-[1.03]'
                        }`}
                        style={{ top: position.top, left: position.left }}
                      >
                        <span className="text-3xl font-black text-amber-50 drop-shadow-[0_4px_0_rgba(41,24,14,0.8)] md:text-5xl">{option}</span>
                        {feedback === 'incorrect' && !isCorrect && (
                          <span className="absolute -right-2 -bottom-2 text-2xl font-black text-red-500 md:text-4xl">x</span>
                        )}
                      </motion.button>
                    );
                  })}

                  <AnimatePresence>
                    {tower.slice(-2).map((num, index) => (
                      <motion.div
                        key={`${num}-${index}-forge-hit`}
                        initial={{ scale: 0.5, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-1/2 z-20 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-[1rem] border border-amber-200/22 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.3),rgba(251,191,36,0.9)_40%,rgba(194,65,12,0.98)_100%)] shadow-[0_0_24px_rgba(251,191,36,0.4)] md:h-24 md:w-24"
                        style={{ bottom: `${18 + index * 14}%` }}
                      >
                        <span className="text-3xl font-black text-amber-50 drop-shadow-[0_4px_0_rgba(120,53,15,0.9)] md:text-5xl">{num}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="relative mt-2 flex items-end justify-between">
                  <div className="hidden rounded-[1rem] border border-white/10 bg-black/16 px-3 py-2 text-left md:block">
                    <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-orange-100/70">Forged Factors</div>
                    <div className="mt-1 text-lg font-black text-amber-50">{tower.length}/{towerGoal}</div>
                  </div>

                  <div className="relative mx-auto flex h-24 w-24 items-end justify-center md:h-32 md:w-32">
                    <div className="absolute bottom-2 h-7 w-24 rounded-full bg-orange-500/30 blur-xl md:h-10 md:w-32" />
                    <div className="absolute bottom-0 h-14 w-24 rounded-[1rem] border border-stone-400/26 bg-[linear-gradient(180deg,rgba(71,85,105,0.96),rgba(51,65,85,0.98))] shadow-[0_16px_26px_rgba(0,0,0,0.28)] md:h-20 md:w-32 md:rounded-[1.3rem]" />
                    <div className="absolute bottom-8 z-10 flex h-16 w-16 items-center justify-center rounded-[1rem] border border-amber-200/18 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.22),rgba(251,191,36,0.9)_40%,rgba(194,65,12,0.98)_100%)] shadow-[0_0_28px_rgba(251,191,36,0.4)] md:bottom-12 md:h-20 md:w-20">
                      <span className="text-3xl font-black text-amber-50 drop-shadow-[0_4px_0_rgba(120,53,15,0.9)] md:text-5xl">{problem.target}</span>
                    </div>
                    <Castle className="absolute bottom-2 h-6 w-6 text-amber-100/70 md:h-8 md:w-8" />
                  </div>

                  <div className="rounded-[1rem] border border-white/10 bg-black/18 px-3 py-2 text-right shadow-[0_12px_22px_rgba(0,0,0,0.2)]">
                    <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-cyan-100/72">Remaining</div>
                    <div className="mt-1 text-xl font-black text-cyan-100 md:text-3xl">{remainingFactors}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {feedback === 'incorrect' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              >
                <div className="rounded-full border-4 border-red-300 bg-red-500/18 px-6 py-3 backdrop-blur-md md:px-12 md:py-6">
                  <span className="text-3xl font-black text-red-400 drop-shadow-lg md:text-6xl">
                    TIMBER!
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GameActionDock
          onBack={onBack}
          accentClass="text-white"
        />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel licensed-overlay-card flex w-full max-w-md flex-col items-center gap-5 p-6 md:gap-8 md:p-12">
                <div className={`text-center text-5xl font-black drop-shadow-md ${isVictory ? 'text-lime-400' : 'text-red-500'}`}>
                  {isVictory ? 'MASTER BUILDER!' : 'RUINS!'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(value => (
                      <motion.div
                        key={value}
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: value * 0.2, type: 'spring' }}
                      >
                        <Star className={`h-16 w-16 ${value <= (score >= targetScore * 2 ? 3 : score >= targetScore * 1.5 ? 2 : 1) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}`} />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="text-center">
                  <div className="text-sm font-black uppercase tracking-widest text-slate-400">Final Score</div>
                  <div className="text-6xl font-black text-white drop-shadow-sm">{score}</div>
                </div>

                <button
                  onClick={onBack}
                  className="licensed-submit-button w-full rounded-2xl py-5 text-2xl font-black text-slate-900 transition-all"
                >
                  CONTINUE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TowerOfFactorsGame;
