import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ChevronRight, Play, RotateCcw, Trophy } from 'lucide-react';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import GameActionDock from '../components/GameActionDock';

interface CalculationCrashGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type GameStatus = 'start' | 'playing' | 'won' | 'lost';
type Operation = '+' | '-' | 'x' | '/';

interface Question {
  prompt: string;
  answer: number;
  options: number[];
}

const TOTAL_STEPS = 6;
const TRACK_START_PERCENT = 10;
const TRACK_FINISH_PERCENT = 90;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const resolveDifficulty = (levelId: number) => clamp(levelId || 1, 1, 10);

const pickOperation = (difficulty: number): Operation => {
  const pool: Operation[] = difficulty <= 3
    ? ['+', '-', '+', '-']
    : difficulty <= 6
      ? ['+', '-', 'x', 'x']
      : ['+', '-', 'x', '/'];
  return pool[randomInt(0, pool.length - 1)];
};

const createQuestion = (levelId: number): Question => {
  const difficulty = resolveDifficulty(levelId);
  const operation = pickOperation(difficulty);

  let left = 0;
  let right = 0;
  let answer = 0;

  if (operation === '+') {
    const max = difficulty <= 3 ? 40 : difficulty <= 6 ? 180 : 650;
    left = randomInt(9, max);
    right = randomInt(7, max);
    answer = left + right;
  } else if (operation === '-') {
    const max = difficulty <= 3 ? 50 : difficulty <= 6 ? 220 : 760;
    left = randomInt(16, max);
    right = randomInt(6, left - 1);
    answer = left - right;
  } else if (operation === 'x') {
    const maxFactor = difficulty <= 6 ? 12 : 18;
    left = randomInt(2, maxFactor);
    right = randomInt(2, maxFactor);
    answer = left * right;
  } else {
    right = randomInt(2, difficulty <= 8 ? 12 : 16);
    answer = randomInt(2, difficulty <= 8 ? 12 : 24);
    left = right * answer;
  }

  const spread = Math.max(4, Math.round(Math.abs(answer) * 0.25));
  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const candidate = answer + randomInt(-spread, spread);
    if (candidate !== answer && candidate >= 0) distractors.add(candidate);
  }

  return {
    prompt: `${left} ${operation} ${right} = ?`,
    answer,
    options: shuffle([answer, ...Array.from(distractors)]),
  };
};

const progressToPercent = (steps: number) => {
  const ratio = clamp(steps / TOTAL_STEPS, 0, 1);
  return TRACK_START_PERCENT + ((TRACK_FINISH_PERCENT - TRACK_START_PERCENT) * ratio);
};

const resolveEnemyMoveInterval = (levelId: number) => {
  const difficulty = resolveDifficulty(levelId);
  return Math.max(2300, 4800 - (difficulty * 220));
};

const computeStars = (correctAnswers: number, wrongAnswers: number, enemyProgress: number) => {
  const attempts = Math.max(1, correctAnswers + wrongAnswers);
  const accuracy = correctAnswers / attempts;
  const lead = TOTAL_STEPS - enemyProgress;

  if (accuracy >= 0.9 && wrongAnswers <= 1 && lead >= 2) return 3;
  if (accuracy >= 0.7 && lead >= 1) return 2;
  return 1;
};

const CalculationCupGame: React.FC<CalculationCrashGameProps> = ({
  levelId,
  useSharedTopHud = false,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [status, setStatus] = useState<GameStatus>('start');
  const [score, setScore] = useState(0);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [enemyProgress, setEnemyProgress] = useState(0);
  const [combo, setCombo] = useState(0);
  const [question, setQuestion] = useState<Question>(() => createQuestion(levelId));
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const feedbackTimerRef = useRef<number | null>(null);
  const submittedResultRef = useRef(false);
  const difficulty = useMemo(() => resolveDifficulty(levelId), [levelId]);
  const playerX = useMemo(() => progressToPercent(playerProgress), [playerProgress]);
  const enemyX = useMemo(() => progressToPercent(enemyProgress), [enemyProgress]);

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const queueFeedback = (tone: 'success' | 'error', text: string) => {
    clearFeedbackTimer();
    setFeedback({ tone, text });
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 820);
  };

  const startRace = () => {
    submittedResultRef.current = false;
    clearFeedbackTimer();
    setStatus('playing');
    setScore(0);
    setPlayerProgress(0);
    setEnemyProgress(0);
    setCombo(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setFeedback(null);
    setQuestion(createQuestion(levelId));
  };

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const interval = window.setInterval(() => {
      setEnemyProgress((prev) => Math.min(TOTAL_STEPS, prev + 1));
    }, resolveEnemyMoveInterval(levelId));
    return () => window.clearInterval(interval);
  }, [levelId, status]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (playerProgress >= TOTAL_STEPS) {
      setStatus('won');
      return;
    }
    if (enemyProgress >= TOTAL_STEPS) {
      setStatus('lost');
    }
  }, [enemyProgress, playerProgress, status]);

  useEffect(() => {
    if (status === 'start') setQuestion(createQuestion(levelId));
  }, [levelId, status]);

  useEffect(() => () => clearFeedbackTimer(), []);

  const handleAnswer = (choice: number) => {
    if (status !== 'playing') return;

    if (choice === question.answer) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setCorrectAnswers((prev) => prev + 1);
      setPlayerProgress((prev) => Math.min(TOTAL_STEPS, prev + 1));
      setScore((prev) => prev + 120 + (difficulty * 14) + (nextCombo * 15));
      queueFeedback('success', 'Correct! Dash boost.');
    } else {
      setCombo(0);
      setWrongAnswers((prev) => prev + 1);
      setEnemyProgress((prev) => Math.min(TOTAL_STEPS, prev + 1));
      queueFeedback('error', `Not quite. Correct answer: ${question.answer}`);
    }

    setQuestion(createQuestion(levelId));
  };

  const submitVictory = () => {
    if (submittedResultRef.current) return;
    submittedResultRef.current = true;
    onVictory(computeStars(correctAnswers, wrongAnswers, enemyProgress), score);
  };

  const submitDefeat = () => {
    if (submittedResultRef.current) return;
    submittedResultRef.current = true;
    onGameOver(score);
  };

  const topPadding = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.9rem)]'
    : 'pt-[calc(env(safe-area-inset-top)+1rem)]';

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <GameplaySceneBackdrop gameType="calculation_clash" minimalDecor />

      <div className={`relative z-10 flex h-full flex-col px-3 md:px-4 ${topPadding} pb-[calc(env(safe-area-inset-bottom)+4.9rem)]`}>
        <section className="mx-auto w-full max-w-5xl">
          <div className="rounded-[1.15rem] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(37,24,12,0.86),rgba(17,11,7,0.9))] px-4 py-3 text-center shadow-[0_12px_28px_rgba(2,6,23,0.45)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90">Calculation Cup</p>
            <p className="mt-1 text-[clamp(1.3rem,4.8vw,2.2rem)] font-black tracking-[0.03em] text-amber-50">
              {question.prompt}
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-[0.08em] text-amber-100/90">
              First to the castle wins!
            </p>
          </div>
        </section>

        <section className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(180deg,rgba(172,222,244,0.18)_0%,rgba(44,111,155,0.22)_100%)] shadow-[0_12px_30px_rgba(2,6,23,0.38)]">
          <div className="absolute left-3 top-3 rounded-full border border-amber-200/55 bg-[linear-gradient(180deg,#fde68a,#f59e0b)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-amber-950 shadow">
            You {playerProgress}/{TOTAL_STEPS}
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-red-200/45 bg-[linear-gradient(180deg,#ef4444,#b91c1c)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow">
            Rival {enemyProgress}/{TOTAL_STEPS}
          </div>

          <div className="absolute inset-x-[4%] top-[16%] h-[52%] overflow-hidden rounded-[1.6rem] border-2 border-slate-900/35 bg-[linear-gradient(180deg,#8da6d4_0%,#7893c4_100%)]">
            <div className="race-road-stripes absolute inset-0 opacity-70" />
            <div className="absolute inset-x-[4%] top-1/2 h-[4px] -translate-y-1/2 bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.95)_0_22px,transparent_22px_50px)] opacity-85" />

            <div className="absolute bottom-0 right-[8.2%] top-0 w-[10px] bg-[repeating-linear-gradient(180deg,#ffffff_0_10px,#111827_10px_20px)] opacity-92" />

            <motion.div
              className="absolute left-0 top-[32%]"
              animate={{ x: `${playerX}%` }}
              transition={{ type: 'spring', stiffness: 230, damping: 24 }}
            >
              <div className="relative flex h-[clamp(3rem,7.8vw,4.8rem)] w-[clamp(4.8rem,11vw,6.8rem)] -translate-x-1/2 items-center justify-center rounded-[1rem] border-2 border-cyan-100/85 bg-[linear-gradient(145deg,#38bdf8,#2563eb)] shadow-[0_10px_24px_rgba(2,132,199,0.45)]">
                <span className="text-xs font-black uppercase tracking-[0.08em]">YOU</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute left-0 top-[63%]"
              animate={{ x: `${enemyX}%` }}
              transition={{ type: 'spring', stiffness: 230, damping: 24 }}
            >
              <div className="relative flex h-[clamp(3rem,7.8vw,4.8rem)] w-[clamp(4.8rem,11vw,6.8rem)] -translate-x-1/2 items-center justify-center rounded-[1rem] border-2 border-rose-100/85 bg-[linear-gradient(145deg,#ef4444,#b91c1c)] shadow-[0_10px_24px_rgba(220,38,38,0.45)]">
                <span className="text-xs font-black uppercase tracking-[0.08em]">RIVAL</span>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {feedback ? (
              <motion.div
                key={feedback.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`absolute left-1/2 top-[8%] -translate-x-1/2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                  feedback.tone === 'success'
                    ? 'border-emerald-200/75 bg-emerald-500/20 text-emerald-950'
                    : 'border-rose-200/75 bg-rose-500/20 text-rose-950'
                }`}
              >
                {feedback.text}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="mt-2 rounded-[1.2rem] border border-amber-200/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.95))] px-3 py-2.5 shadow-[0_12px_24px_rgba(2,6,23,0.5)]">
          <div className="rounded-full border border-amber-200/35 bg-slate-900/60 px-3 py-1 text-center text-[11px] font-black uppercase tracking-[0.08em] text-amber-200">
            Choose Wisely - Cast Your Answer!
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {question.options.map((option, idx) => (
              <button
                key={`${question.prompt}-${option}-${idx}`}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={status !== 'playing'}
                className="rounded-[0.95rem] border border-amber-100/55 bg-[linear-gradient(180deg,#fcd66b_0%,#f59e0b_100%)] px-3 py-2.5 text-center text-[clamp(1.15rem,4.8vw,1.8rem)] font-black text-amber-950 shadow-[0_8px_16px_rgba(146,64,14,0.35)] transition active:scale-[0.98] disabled:opacity-45"
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 rounded-full border border-orange-200/40 bg-[linear-gradient(90deg,rgba(249,115,22,0.2),rgba(59,130,246,0.2))] px-3 py-1.5">
            <span className="text-lg">🔥</span>
            <span className="text-lg font-black uppercase tracking-[0.08em] text-amber-200">Combo x{combo}</span>
            <span className="text-sm font-black text-cyan-200">Dash Boost!</span>
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
        <div className="pointer-events-auto">
          <GameActionDock onBack={onBack} compact accentClass="text-slate-100" />
        </div>
      </div>

      <AnimatePresence>
        {status === 'start' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/86 p-8 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-cyan-300/35 bg-slate-900/95 p-8 text-center">
              <h2 className="text-4xl font-black uppercase tracking-tight text-cyan-100">Calculation Cup</h2>
              <p className="mt-3 text-sm text-cyan-50/80">
                Beat your rival to the finish line. Correct answers push your racer forward.
              </p>
              <button
                type="button"
                onClick={startRace}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-8 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
              >
                <Play className="h-4 w-4" /> Start Race
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'won' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-amber-300/40 bg-slate-900/96 p-8 text-center">
              <Trophy className="mx-auto h-14 w-14 text-amber-300" />
              <h2 className="mt-3 text-4xl font-black uppercase text-amber-100">Race Won</h2>
              <p className="mt-2 text-sm text-cyan-50/80">You reached the castle first in the Calculation Cup.</p>
              <p className="mt-2 text-lg font-black text-cyan-100">Score {score.toLocaleString()}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={startRace}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
                >
                  <RotateCcw className="h-4 w-4" /> Replay
                </button>
                <button
                  type="button"
                  onClick={submitVictory}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'lost' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-rose-300/35 bg-slate-900/96 p-8 text-center">
              <AlertCircle className="mx-auto h-14 w-14 text-rose-300" />
              <h2 className="mt-3 text-4xl font-black uppercase text-rose-100">Race Lost</h2>
              <p className="mt-2 text-sm text-cyan-50/80">The rival crossed first. Try again and tighten your answers.</p>
              <p className="mt-2 text-lg font-black text-cyan-100">Score {score.toLocaleString()}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={startRace}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
                >
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>
                <button
                  type="button"
                  onClick={submitDefeat}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-400 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
                >
                  Exit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .race-road-stripes {
          background-image:
            radial-gradient(circle at 12% 26%, rgba(255,255,255,0.16), transparent 34%),
            radial-gradient(circle at 78% 70%, rgba(255,255,255,0.12), transparent 28%),
            linear-gradient(180deg, rgba(2,6,23,0.1), rgba(2,6,23,0.28));
        }
      `}</style>
    </div>
  );
};

export default CalculationCupGame;

