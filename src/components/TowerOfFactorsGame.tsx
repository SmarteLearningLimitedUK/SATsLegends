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
    setTower([]);
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

      setTimeout(() => {
        setTower([]);
        setShake(false);
        setFeedback(null);
      }, 1000);
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
          title="Tower of Factors"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-slate-900"
          accentSoftBg="bg-slate-100/80"
          accentBorder="border-slate-200/80"
          progressBar="bg-gradient-to-r from-slate-400 via-blue-400 to-indigo-500"
          statLabel="Streak"
          statValue={streak}
        />

        <div className="relative grid w-full flex-1 min-h-0 grid-rows-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-2 md:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] md:grid-rows-1 md:gap-4">
          {problem && (
            <>
              <div className="relative min-h-0 overflow-hidden rounded-[1.6rem] border-2 border-sky-200/12 bg-[linear-gradient(180deg,rgba(14,24,46,0.86),rgba(8,18,34,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_22px_40px_rgba(2,6,23,0.26)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_80%_14%,rgba(167,139,250,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%,rgba(15,23,42,0.18)_100%)]" />
                <div className="absolute inset-x-[12%] top-[14%] h-[18%] rounded-full bg-white/6 blur-3xl" />
                <div className="absolute bottom-[10%] left-1/2 h-[62%] w-[8rem] -translate-x-1/2 rounded-[2rem] border border-cyan-100/8 bg-white/[0.03] md:w-[10.5rem]" />
                <div className="relative z-10 flex h-full flex-col p-3 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-[1.3rem] border border-white/12 bg-slate-950/34 px-3 py-2.5 backdrop-blur-md shadow-[0_10px_24px_rgba(2,6,23,0.2)]">
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300/72 md:text-xs">Build The Tower</div>
                      <div className="mt-1 flex items-end gap-2">
                        <span className="text-4xl font-black leading-none text-lime-300 drop-shadow-[0_8px_20px_rgba(163,230,53,0.22)] md:text-6xl">{problem.target}</span>
                        <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/60 md:text-xs">Target</span>
                      </div>
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/60 md:text-xs">
                        {tower.length}/{towerGoal} factors found
                      </div>
                    </div>

                    {bossEncounter && (
                      <div className="w-24 shrink-0 md:w-36">
                        <BossPortrait encounter={bossEncounter} pose={bossPose} compact />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-1 items-end justify-center">
                    <motion.div
                      className="relative z-10 flex w-28 flex-col-reverse items-center gap-1.5 sm:w-32 md:w-44 md:gap-2"
                      animate={shake ? { x: [-10, 10, -10, 10, 0], rotate: [-5, 5, -5, 5, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="absolute bottom-[2.35rem] left-1/2 h-[55%] w-[86%] -translate-x-1/2 rounded-[1.6rem] border border-cyan-100/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
                      <div className="absolute bottom-[2.35rem] left-1/2 h-[55%] w-[2px] -translate-x-1/2 bg-cyan-100/10" />

                      <div className="relative flex h-8 w-40 items-center justify-center overflow-hidden rounded-[1rem] border border-amber-100/26 bg-[linear-gradient(180deg,rgba(120,53,15,0.98),rgba(68,32,12,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_24px_rgba(68,32,12,0.34)] md:h-10 md:w-60">
                        <div className="absolute inset-x-[10%] top-[18%] h-[24%] rounded-full bg-white/16 blur-[1px]" />
                        <Castle className="h-5 w-5 text-amber-100/86 md:h-6 md:w-6" />
                      </div>

                      <AnimatePresence>
                        {tower.map((num, index) => (
                          <motion.div
                            key={`${num}-${index}`}
                            initial={{ y: -200, opacity: 0, scale: 0.5 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 200, opacity: 0, rotate: Math.random() * 90 - 45 }}
                            transition={{ type: 'spring', bounce: 0.42 }}
                            className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-[0.95rem] border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(192,132,252,0.94),rgba(96,165,250,0.92)_42%,rgba(30,64,175,0.94)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_12px_24px_rgba(30,41,59,0.3)] md:h-14 md:rounded-[1.15rem]"
                          >
                            <div className="absolute inset-x-[14%] top-[14%] h-[24%] rounded-full bg-white/24 blur-[1px]" />
                            <span className="text-xl font-black text-white drop-shadow-[0_6px_14px_rgba(15,23,42,0.42)] md:text-3xl">{num}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 overflow-hidden rounded-[1.6rem] border-2 border-indigo-200/12 bg-[linear-gradient(180deg,rgba(17,27,49,0.9),rgba(10,17,32,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_22px_40px_rgba(2,6,23,0.28)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(125,211,252,0.1),transparent_20%),radial-gradient(circle_at_82%_10%,rgba(253,224,71,0.08),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%,rgba(15,23,42,0.18)_100%)]" />
                <div className="relative z-10 flex h-full flex-col p-3 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300/72 md:text-xs">Choose The Stones</div>
                      <h3 className="text-lg font-black text-white md:text-2xl">Tap only true factors</h3>
                    </div>
                    <div className="rounded-full border border-cyan-100/16 bg-cyan-400/10 px-3 py-2 text-center shadow-[0_8px_18px_rgba(14,165,233,0.12)]">
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70 md:text-[10px]">Remaining</div>
                      <div className="text-lg font-black text-cyan-100 md:text-2xl">{remainingFactors}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid min-h-0 flex-1 grid-cols-3 auto-rows-fr gap-2 md:gap-3">
                    {problem.options.map((option, index) => {
                      const isSelected = tower.includes(option);

                      return (
                        <button
                          key={index}
                          onClick={() => handleSelect(option)}
                          disabled={isSelected || !!feedback}
                          className={`
                            relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[1rem] border-2 transition-all md:rounded-[1.25rem]
                            ${isSelected
                              ? 'scale-[0.98] border-slate-300/18 bg-[linear-gradient(180deg,rgba(71,85,105,0.72),rgba(30,41,59,0.82))] opacity-55'
                              : 'border-cyan-100/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(96,165,250,0.2)_42%,rgba(30,41,59,0.92)_100%)] hover:-translate-y-0.5 hover:border-cyan-100/30 hover:shadow-[0_16px_28px_rgba(59,130,246,0.18)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(15,23,42,0.26)]'}
                          `}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.22),transparent_34%)]" />
                          <span className={`relative text-xl font-black drop-shadow-[0_6px_12px_rgba(15,23,42,0.4)] md:text-3xl ${isSelected ? 'text-slate-400' : 'text-white'}`}>
                            {option}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
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
          accentClass="text-slate-700"
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
