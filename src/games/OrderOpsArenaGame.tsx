import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import AnimatedAvatar from '../components/AnimatedAvatar';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { formatMultiplicationDisplay } from '../utils/mathDisplay';
import orderOpsEnemy from '../assets/bosses/goblinwiz.jpg';

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
  const mode = modes[randomInt(0, Math.min(modes.length - 1, 1 + Math.floor(levelId / 2)))] as typeof modes[number];

  if (mode === 'brackets') {
    const a = randomInt(2, 12);
    const b = randomInt(2, 10);
    const c = randomInt(2, 7);
    const answer = (a + b) * c;
    return {
      expression: `(${a} + ${b}) * ${c}`,
      answer,
      options: makeOptions(answer),
      hint: 'Brackets first.',
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
      hint: 'Multiply before add.',
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
    hint: 'Multiply before add or subtract.',
  };
};

const OrderOpsArenaGame: React.FC<OrderOpsArenaGameProps> = ({
  levelId,
  avatarId,
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


  const playerAvatar = useMemo(
    () => AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0],
    [avatarId],
  );

  const displayExpression = formatMultiplicationDisplay(round.expression);

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
      title: 'Enemy Counter',
      subtitle: `The enemy blocked the strike. ${subtitle}`,
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
    setFeedback({
      type: 'success',
      title: 'Direct Hit',
      subtitle: `Player strike landed - +${points} XP`,
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

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+4.6rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.4rem)] md:pt-[calc(env(safe-area-inset-top)+4.95rem)]">
        <div className="flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 md:gap-3">
          <div className="flex justify-center">
            <GameQuestionCard
              title="Order Ops Arena"
              subtitle="Solve it in BIDMAS order. Each correct answer pushes the bar."
              className="w-full max-w-[860px] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(15,23,42,0.18))] px-4 py-2 text-center shadow-[0_12px_26px_rgba(15,23,42,0.14)] md:px-6 md:py-2.5"
              bodyClassName="text-[clamp(1.15rem,2.9vw,2.7rem)] font-black tracking-tight text-white"
            >
              {displayExpression}
            </GameQuestionCard>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,31,0.82),rgba(6,10,20,0.92))] shadow-[0_16px_34px_rgba(2,6,23,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.12),rgba(15,23,42,0.04)_38%,rgba(2,6,23,0.32)_100%)]" />
            <div className="relative z-10 flex h-full min-h-0 flex-col justify-between gap-3 p-3 md:p-4">
              <div className="flex flex-1 items-end justify-between gap-3">
                <div className="flex min-h-0 w-[48%] flex-1 justify-center">
                  <div className="relative flex h-full min-h-[14rem] w-full max-w-[18rem] items-end justify-center rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.16),rgba(15,23,42,0.02)_52%,rgba(15,23,42,0.18)_100%)] p-3 md:min-h-[20rem]">
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-200/18 bg-slate-950/35 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/80">
                      {hearts} shields
                    </div>
                    <AnimatedAvatar
                      avatar={playerAvatar}
                      pose={feedback?.type === 'error' ? 'sad' : 'attack'}
                      floating={false}
                      cycleFrames
                      showBackdropGlow={false}
                      className="h-full w-[90%]"
                      imageClassName="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.32)]"
                    />
                    <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-[0.9rem] border border-white/10 bg-black/20 px-2 py-1.5 text-center text-[10px] font-bold text-white/78">
                      {Combo > 0 ? `${Combo} strike streak` : 'Hold your defence'}
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 w-[48%] flex-1 justify-center">
                  <div className="relative flex h-full min-h-[14rem] w-full max-w-[18rem] items-end justify-center rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(15,23,42,0.02)_52%,rgba(15,23,42,0.18)_100%)] p-3 md:min-h-[20rem]">
                    <div className="absolute left-3 top-3 rounded-full border border-rose-200/14 bg-slate-950/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-rose-100/82">
                      {Math.max(0, maxEnemyHealth - enemyHealth)} hits landed
                    </div>
                    <motion.img
                      src={orderOpsEnemy}
                      alt="Order Ops enemy"
                      animate={feedback?.type === 'success'
                        ? { x: [0, -5, 5, -3, 0] }
                        : feedback?.type === 'error'
                          ? { x: [0, 4, -4, 0] }
                          : { x: 0 }}
                      transition={{ duration: 0.38 }}
                      className="h-full w-[92%] object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,0.3)]"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[1.45rem] border border-white/10 bg-slate-950/34 p-3 shadow-[0_14px_28px_rgba(2,6,23,0.14)] backdrop-blur-sm md:p-4">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  {round.options.map((option) => (
                    <button
                      key={`${displayExpression}-${option}`}
                      type="button"
                      onClick={() => handleAnswer(option)}
                      disabled={Boolean(feedback) || isFinished}
                      className="ui-button-primary min-h-[3.2rem] rounded-[1.1rem] px-2 py-2 text-base font-black text-white shadow-[0_12px_20px_rgba(2,6,23,0.2)] disabled:opacity-60 md:min-h-[3.8rem] md:text-2xl"
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
                <div className={`text-4xl font-black uppercase tracking-[0.12em] md:text-6xl ${feedback.type === 'success' ? 'text-emerald-100' : 'text-amber-100'}`}>
                  {feedback.title}
                </div>
                <div className="mt-2 text-lg font-bold text-white/92 md:text-2xl">{feedback.subtitle}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameScreenShell>
  );
};

export default OrderOpsArenaGame;

