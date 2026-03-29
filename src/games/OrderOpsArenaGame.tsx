import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import goblinEnemy from '../assets/bosses/goblin.png';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface OrderOpsArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface OpsRound {
  expression: string;
  answer: number;
  options: number[];
  hint: string;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const HEARTS_MAX = 3;
const ENEMY_HEALTH_BY_LEVEL: Record<number, number> = {
  1: 5,
  2: 6,
  3: 7,
  4: 8,
  5: 9,
  6: 10,
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const makeOptions = (correct: number) => {
  const pool = new Set<number>([correct]);
  const offsets = [-8, -5, -3, -2, 2, 3, 5, 8];
  for (const offset of shuffle(offsets)) {
    if (pool.size >= 4) break;
    const candidate = correct + offset;
    if (candidate >= 0) pool.add(candidate);
  }
  while (pool.size < 4) {
    pool.add(Math.max(0, correct + randomInt(-9, 9)));
  }
  return shuffle(Array.from(pool).slice(0, 4));
};

const createOpsRound = (levelId: number): OpsRound => {
  const modes = ['mixed', 'brackets', 'doubleMultiply'] as const;
  const mode = modes[randomInt(0, Math.min(modes.length - 1, 1 + Math.floor(levelId / 2)))];

  if (mode === 'brackets') {
    const a = randomInt(2, 12);
    const b = randomInt(2, 10);
    const c = randomInt(2, 7);
    const answer = (a + b) * c;
    return {
      expression: `(${a} + ${b}) * ${c}`,
      answer,
      options: makeOptions(answer),
      hint: 'Brackets first, then multiply.',
    };
  }

  if (mode === 'doubleMultiply') {
    const a = randomInt(2, 10);
    const b = randomInt(2, 8);
    const c = randomInt(2, 9);
    const d = randomInt(2, 7);
    const answer = (a * b) + (c * d);
    return {
      expression: `${a} * ${b} + ${c} * ${d}`,
      answer,
      options: makeOptions(answer),
      hint: 'Do each multiplication before adding.',
    };
  }

  const a = randomInt(10, 45);
  const b = randomInt(2, 10);
  const c = randomInt(2, 7);
  const d = randomInt(1, 14);
  const answer = a + (b * c) - d;
  return {
    expression: `${a} + ${b} * ${c} - ${d}`,
    answer,
    options: makeOptions(answer),
    hint: 'Multiply first, then finish + and -.',
  };
};

const OrderOpsArenaGame: React.FC<OrderOpsArenaGameProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const maxEnemyHealth = ENEMY_HEALTH_BY_LEVEL[levelId] || 7;
  const initialTime = 76 + (levelId * 7);
  const targetScore = maxEnemyHealth * 210;
  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);

  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [hearts, setHearts] = useState(HEARTS_MAX);
  const [Combo, setStreak] = useState(0);
  const [enemyHealth, setEnemyHealth] = useState(maxEnemyHealth);
  const [questionCount, setQuestionCount] = useState(1);
  const [round, setRound] = useState<OpsRound>(() => createOpsRound(levelId));
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [enemyImpactTick, setEnemyImpactTick] = useState(0);

  const enemyHealthPercent = (enemyHealth / maxEnemyHealth) * 100;

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = XP;
  }, [XP]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(initialTime);
    setHearts(HEARTS_MAX);
    setStreak(0);
    setEnemyHealth(maxEnemyHealth);
    setQuestionCount(1);
    setRound(createOpsRound(levelId));
    setFeedback(null);
    setIsFinished(false);
    setEnemyImpactTick(0);
  }, [initialTime, levelId, maxEnemyHealth]);

  useEffect(() => {
    if (isFinished) return undefined;
    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          onGameOver(scoreRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isFinished, onGameOver]);

  const finishVictory = (finalScore: number, heartsLeft: number) => {
    if (isFinished) return;
    setIsFinished(true);
    const stars = finalScore >= targetScore * 1.2 && heartsLeft >= 2
      ? 3
      : finalScore >= targetScore * 0.9
        ? 2
        : 1;

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.64 },
      colors: ['#fcd34d', '#67e8f9', '#ffffff'],
    });

    onVictory(stars, finalScore);
  };

  const moveToNextQuestion = () => {
    const timeoutId = window.setTimeout(() => {
      setQuestionCount((previous) => previous + 1);
      setRound(createOpsRound(levelId));
      setFeedback(null);
    }, 620);
    timersRef.current.push(timeoutId);
  };

  const loseHeart = (subtitle: string) => {
    if (feedback || isFinished) return;
    const nextHearts = hearts - 1;
    setHearts(nextHearts);
    setStreak(0);
    setFeedback({
      type: 'error',
      title: 'Attack Missed',
      subtitle,
    });
    triggerHaptic('error');

    if (nextHearts <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsFinished(true);
        onGameOver(scoreRef.current);
      }, 860);
      timersRef.current.push(timeoutId);
      return;
    }

    moveToNextQuestion();
  };

  const handleAnswer = (choice: number) => {
    if (feedback || isFinished) return;

    if (choice !== round.answer) {
      loseHeart(`Correct value was ${round.answer}.`);
      return;
    }

    const points = 140 + (Combo * 24);
    const updatedScore = XP + points;
    const nextEnemyHealth = Math.max(0, enemyHealth - 1);

    setScore(updatedScore);
    scoreRef.current = updatedScore;
    setStreak((previous) => previous + 1);
    setEnemyHealth(nextEnemyHealth);
    setEnemyImpactTick((previous) => previous + 1);
    setFeedback({
      type: 'success',
      title: 'Direct Hit',
      subtitle: `Enemy takes damage - +${points} XP`,
    });
    triggerHaptic('success');

    if (nextEnemyHealth <= 0) {
      const timeoutId = window.setTimeout(() => {
        finishVictory(updatedScore, hearts);
      }, 720);
      timersRef.current.push(timeoutId);
      return;
    }

    moveToNextQuestion();
  };

  return (
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="equation_grove" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.4rem)] md:pt-[calc(env(safe-area-inset-top)+5.15rem)]">
        <PuzzleStage className="w-full max-w-6xl min-h-0 flex-1 rounded-[1.7rem] p-2 md:rounded-[2rem] md:p-3">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/12 bg-slate-950/32 px-2.5 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:left-5 md:top-5 md:gap-2 md:px-4 md:py-2">
            {Array.from({ length: HEARTS_MAX }).map((_, index) => (
              <div key={index} className={`h-5 w-5 rounded-full ${index < hearts ? 'bg-[radial-gradient(circle_at_30%_25%,#fca5a5,#ef4444_60%,#991b1b)] shadow-[0_6px_12px_rgba(239,68,68,0.35)]' : 'bg-white/12'} md:h-6 md:w-6`} />
            ))}
          </div>

          <div className="absolute right-3 top-3 z-20 rounded-full border border-white/12 bg-slate-950/32 px-3 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.2)] md:right-5 md:top-5 md:px-4 md:py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70 md:text-xs">Combo</div>
            <div className="text-lg font-black text-white md:text-2xl">{Combo}</div>
          </div>

          <div className="relative z-10 flex h-full w-full min-h-0 flex-col px-2 pb-2 pt-14 md:px-4 md:pb-4 md:pt-20">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[96%] px-3 py-1.5 text-center shadow-[0_10px_22px_rgba(15,23,42,0.14)] md:px-6 md:py-2.5">
                <div className="text-sm font-black tracking-tight text-amber-900 md:text-[1.2rem]">
                  Solve operations to defeat the enemy
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-amber-950/76 md:text-sm">
                  Every correct answer removes enemy health.
                </div>
              </div>
            </div>

            <div className="mt-2 min-h-0 flex-1 md:mt-3">
              <div className="grid h-full min-h-0 grid-cols-[0.9fr_1.1fr] gap-2 md:grid-cols-[1.02fr_1fr] md:gap-3">
                <div className="licensed-game-card-dark min-h-0 rounded-[1.2rem] border border-white/14 p-2 shadow-[0_12px_22px_rgba(2,6,23,0.18)] md:rounded-[1.5rem] md:p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Enemy target</div>
                  <div className="mt-1.5 rounded-[1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-2 md:mt-2 md:p-3">
                    <div className="flex flex-col items-center gap-3">
                      <motion.img
                        key={`enemy-${enemyImpactTick}`}
                        src={goblinEnemy}
                        alt="Enemy"
                        className="h-24 w-auto object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.42)] md:h-36"
                        animate={feedback?.type === 'success' ? { x: [0, -7, 7, -4, 4, 0], scale: [1, 1.04, 1] } : { y: [0, -2, 0] }}
                        transition={feedback?.type === 'success'
                          ? { duration: 0.34 }
                          : { duration: 1.8, repeat: Infinity, repeatType: 'mirror' }}
                      />
                      <div className="w-full max-w-sm">
                        <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/75 md:text-[11px]">
                          <span>Enemy Health</span>
                          <span>{enemyHealth}/{maxEnemyHealth}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-black/30 md:h-4">
                          <motion.div
                            animate={{ width: `${enemyHealthPercent}%` }}
                            transition={{ duration: 0.25 }}
                            className="h-full bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 rounded-[1rem] border border-white/10 bg-black/18 p-2 text-[11px] font-semibold text-cyan-50/90 md:mt-3 md:p-2.5 md:text-sm">
                    Question {questionCount} - {round.hint}
                  </div>
                </div>

                <div className="licensed-game-card-dark min-h-0 rounded-[1.3rem] border border-white/14 p-2 shadow-[0_12px_22px_rgba(2,6,23,0.18)] md:rounded-[1.6rem] md:p-3">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Operation challenge</div>
                  <div className="mt-2 rounded-[1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-2 text-center shadow-[0_10px_18px_rgba(2,6,23,0.18)] md:mt-3 md:p-3">
                    <div className="text-xl font-black tracking-tight text-white md:text-3xl">{round.expression}</div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 md:mt-3 md:gap-2.5">
                    {round.options.map((option) => (
                      <button
                        key={`${round.expression}-${option}`}
                        type="button"
                        onClick={() => handleAnswer(option)}
                        disabled={Boolean(feedback) || isFinished}
                        className="ui-button-primary min-h-[2.85rem] rounded-[0.95rem] px-2 py-1.5 text-base font-black text-white shadow-[0_10px_18px_rgba(2,6,23,0.16)] disabled:opacity-60 md:min-h-[3.35rem] md:text-xl"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.08 }}
                className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md ${feedback.type === 'success' ? 'bg-emerald-500/16' : 'bg-red-500/16'}`}
              >
                <div className="rounded-[2rem] border border-white/14 bg-slate-950/60 px-8 py-6 text-center shadow-[0_24px_36px_rgba(0,0,0,0.24)]">
                  <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-red-100'}`}>
                    {feedback.title}
                  </div>
                  <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>
      </div>
    </GameScreenShell>
  );
};

export default OrderOpsArenaGame;
