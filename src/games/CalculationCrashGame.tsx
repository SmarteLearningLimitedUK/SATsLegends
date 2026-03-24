import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Play, RotateCcw, Trophy } from 'lucide-react';
import GameActionDock from '../components/GameActionDock';
import world01Map from '../assets/maps/world_01.png';

interface CalculationCrashGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type GameStatus = 'start' | 'playing' | 'complete';
type Operation = '+' | '-' | 'x' | '/';

interface Question {
  prompt: string;
  answer: number;
  options: number[];
}

const ROUND_SECONDS = 30;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]): T[] => {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

const resolveDifficulty = (levelId: number) => Math.max(1, Math.min(10, levelId || 1));

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
    const max = difficulty <= 3 ? 45 : difficulty <= 6 ? 160 : 420;
    left = randomInt(7, max);
    right = randomInt(6, max);
    answer = left + right;
  } else if (operation === '-') {
    const max = difficulty <= 3 ? 55 : difficulty <= 6 ? 210 : 520;
    left = randomInt(16, max);
    right = randomInt(5, left - 1);
    answer = left - right;
  } else if (operation === 'x') {
    const maxFactor = difficulty <= 6 ? 12 : 16;
    left = randomInt(2, maxFactor);
    right = randomInt(2, maxFactor);
    answer = left * right;
  } else {
    right = randomInt(2, difficulty <= 8 ? 12 : 15);
    answer = randomInt(2, difficulty <= 8 ? 14 : 20);
    left = right * answer;
  }

  const spread = Math.max(5, Math.round(Math.abs(answer) * 0.2));
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

const computeStars = (solved: number, attempted: number) => {
  const accuracy = attempted > 0 ? solved / attempted : 0;
  if (solved >= 16 && accuracy >= 0.8) return 3;
  if (solved >= 10 && accuracy >= 0.6) return 2;
  return 1;
};

const CalculationCupGame: React.FC<CalculationCrashGameProps> = ({
  levelId,
  useSharedTopHud = false,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const [status, setStatus] = useState<GameStatus>('start');
  const [question, setQuestion] = useState<Question>(() => createQuestion(levelId));
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const feedbackTimerRef = useRef<number | null>(null);
  const submittedResultRef = useRef(false);
  const onVictoryRef = useRef(onVictory);
  const difficulty = useMemo(() => resolveDifficulty(levelId), [levelId]);

  useEffect(() => {
    onVictoryRef.current = onVictory;
  }, [onVictory]);

  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };

  const queueFeedback = (tone: 'success' | 'error', text: string) => {
    clearFeedbackTimer();
    setFeedback({ tone, text });
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(null), 560);
  };

  const startRound = () => {
    submittedResultRef.current = false;
    clearFeedbackTimer();
    setStatus('playing');
    setQuestion(createQuestion(levelId));
    setScore(0);
    setSolved(0);
    setAttempted(0);
    setStreak(0);
    setTimeLeft(ROUND_SECONDS);
    setFeedback(null);
  };

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [status]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (timeLeft <= 0) setStatus('complete');
  }, [status, timeLeft]);

  useEffect(() => () => clearFeedbackTimer(), []);

  const handleAnswer = (choice: number) => {
    if (status !== 'playing') return;

    const correct = choice === question.answer;
    const nextAttempted = attempted + 1;
    setAttempted(nextAttempted);

    if (correct) {
      const nextSolved = solved + 1;
      const nextStreak = streak + 1;
      const earned = 90 + (difficulty * 12) + (nextStreak * 14);

      setSolved(nextSolved);
      setStreak(nextStreak);
      setScore((prev) => prev + earned);
      queueFeedback('success', `+${earned}`);
    } else {
      setStreak(0);
      queueFeedback('error', `Answer: ${question.answer}`);
    }

    setQuestion(createQuestion(levelId));
  };

  const submitRound = () => {
    if (submittedResultRef.current) return;
    submittedResultRef.current = true;
    onVictoryRef.current(computeStars(solved, attempted), score);
  };

  const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
  const topPadding = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.35rem)]'
    : 'pt-[calc(env(safe-area-inset-top)+1rem)]';

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <img
        src={world01Map}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className={`relative z-10 flex h-full flex-col px-3 md:px-4 ${topPadding} pb-[calc(env(safe-area-inset-bottom)+4.9rem)]`}>
        <section className="mx-auto w-full max-w-3xl rounded-[1.15rem] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(37,24,12,0.86),rgba(17,11,7,0.9))] px-4 py-3 text-center shadow-[0_12px_28px_rgba(2,6,23,0.45)]">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-amber-200/90">
            <span>Calculation Clash</span>
            <span>{timeLeft}s</span>
          </div>
          <p className="mt-1 text-[clamp(1.45rem,5.2vw,2.3rem)] font-black tracking-[0.03em] text-amber-50">
            {question.prompt}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-amber-100/90">
            Solve as many as you can in 30 seconds
          </p>
        </section>

        <section className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-cyan-100/40 bg-slate-900/65 px-2 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100/75">Solved</p>
            <p className="text-lg font-black text-cyan-50">{solved}</p>
          </div>
          <div className="rounded-xl border border-amber-100/40 bg-slate-900/65 px-2 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-100/75">Streak</p>
            <p className="text-lg font-black text-amber-100">x{streak}</p>
          </div>
          <div className="rounded-xl border border-emerald-100/40 bg-slate-900/65 px-2 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100/75">Score</p>
            <p className="text-lg font-black text-emerald-100">{score.toLocaleString()}</p>
          </div>
        </section>

        <section className="mt-2 rounded-[1.2rem] border border-amber-200/30 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.95))] px-3 py-3 shadow-[0_12px_24px_rgba(2,6,23,0.5)]">
          <div className="rounded-full border border-amber-200/35 bg-slate-900/60 px-3 py-1 text-center text-[11px] font-black uppercase tracking-[0.08em] text-amber-200">
            Tap the correct answer
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {question.options.map((option, idx) => (
              <button
                key={`${question.prompt}-${option}-${idx}`}
                type="button"
                onClick={() => handleAnswer(option)}
                disabled={status !== 'playing'}
                className="rounded-[0.95rem] border border-amber-100/55 bg-[linear-gradient(180deg,#fcd66b_0%,#f59e0b_100%)] px-3 py-3 text-center text-[clamp(1.2rem,5.2vw,1.9rem)] font-black text-amber-950 shadow-[0_8px_16px_rgba(146,64,14,0.35)] transition active:scale-[0.98] disabled:opacity-45"
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {feedback ? (
          <motion.div
            key={feedback.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute left-1/2 top-[calc(env(safe-area-inset-top)+6.2rem)] z-30 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
              feedback.tone === 'success'
                ? 'border-emerald-200/75 bg-emerald-500/25 text-emerald-50'
                : 'border-rose-200/75 bg-rose-500/25 text-rose-50'
            }`}
          >
            {feedback.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

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
              <h2 className="text-4xl font-black uppercase tracking-tight text-cyan-100">Calculation Clash</h2>
              <p className="mt-3 text-sm text-cyan-50/80">
                Quick fire round. Answer as many problems as possible in 30 seconds.
              </p>
              <button
                type="button"
                onClick={startRound}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-8 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
              >
                <Play className="h-4 w-4" /> Start
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'complete' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-8 backdrop-blur-md"
          >
            <div className="w-full max-w-xl rounded-3xl border border-amber-300/40 bg-slate-900/96 p-8 text-center">
              <Trophy className="mx-auto h-14 w-14 text-amber-300" />
              <h2 className="mt-3 text-4xl font-black uppercase text-amber-100">Round Complete</h2>
              <p className="mt-2 text-sm text-cyan-50/80">Time is up. Here is your quick-fire result.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-cyan-100/30 bg-slate-900/70 px-2 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100/70">Solved</p>
                  <p className="text-lg font-black text-cyan-50">{solved}</p>
                </div>
                <div className="rounded-xl border border-amber-100/30 bg-slate-900/70 px-2 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-100/70">Accuracy</p>
                  <p className="text-lg font-black text-amber-100">{accuracy}%</p>
                </div>
                <div className="rounded-xl border border-emerald-100/30 bg-slate-900/70 px-2 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100/70">Score</p>
                  <p className="text-lg font-black text-emerald-100">{score.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={startRound}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
                >
                  <RotateCcw className="h-4 w-4" /> Replay
                </button>
                <button
                  type="button"
                  onClick={submitRound}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-900"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalculationCupGame;
