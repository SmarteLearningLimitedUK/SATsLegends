import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, RotateCcw, Trophy } from 'lucide-react';
import calculationClashBackground from '../assets/maps/backgroundsforgames/Calculation Cup.png';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';
import { GAME_HUD_RESTART_EVENT } from '../gameHudEvents';

interface CalculationCrashGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type GameStatus = 'playing' | 'complete';
type Operation = '+' | '-' | 'x' | '/';

interface Question {
  kind: 'fluency' | 'reasoning';
  prompt: string;
  answer: number;
  options: number[];
}

const ROUND_SECONDS = 90;

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
    kind: 'fluency',
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
  const [status, setStatus] = useState<GameStatus>('playing');
  const [question, setQuestion] = useState<Question>(() => createQuestion(levelId));
  const [XP, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [Combo, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(false);

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
    setSelectedChoice(null);
    setScreenShake(false);
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
    setSelectedChoice(choice);

    const correct = choice === question.answer;
    const nextAttempted = attempted + 1;
    setAttempted(nextAttempted);

    if (correct) {
      const nextSolved = solved + 1;
      const nextStreak = Combo + 1;
      const earned = 90 + (difficulty * 12) + (nextStreak * 14);

      setSolved(nextSolved);
      setStreak(nextStreak);
      setScore((prev) => prev + earned);
      queueFeedback('success', nextStreak > 1 ? `+${earned} - Combo x${nextStreak}` : `+${earned}`);
    } else {
      setStreak(0);
      setScreenShake(true);
      queueFeedback('error', `Answer: ${question.answer}`);
      window.setTimeout(() => setScreenShake(false), 260);
    }

    window.setTimeout(() => {
      setQuestion(createQuestion(levelId));
      setSelectedChoice(null);
    }, correct ? 140 : 180);
  };

  const submitRound = () => {
    if (submittedResultRef.current) return;
    submittedResultRef.current = true;
    onVictoryRef.current(computeStars(solved, attempted), XP);
  };

  const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
  const topPadding = useSharedTopHud
    ? 'pt-[calc(env(safe-area-inset-top)+5.35rem)]'
    : 'pt-[calc(env(safe-area-inset-top)+1rem)]';

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${calculationClashBackground})` }}
    >
      <main className={`relative z-10 flex h-full w-full flex-col ${topPadding} px-[max(1rem,env(safe-area-inset-left))] pb-[calc(env(safe-area-inset-bottom)+5rem)]`}>
        <div className="mx-auto flex h-full w-full max-w-[34rem] flex-col">
          <motion.div
            animate={screenShake ? { x: [0, -8, 8, -5, 5, -2, 0] } : { x: 0 }}
            transition={{ duration: 0.28 }}
            className="my-auto w-full"
          >
            <section className="text-center">
              <div className="mx-auto w-full max-w-[31rem] rounded-[1.25rem] border border-amber-100/35 bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(2,6,23,0.68))] px-4 py-3 shadow-[0_14px_34px_rgba(2,6,23,0.52)] backdrop-blur-[2px]">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200/95">Calculation Clash</p>
                <p className="game-question-copy mt-2 leading-none tracking-[-0.02em] text-white [text-shadow:0_6px_14px_rgba(0,0,0,0.72)]">
                  {formatFantasyPrompt(question.prompt)}
                </p>
              </div>
            </section>

            <section className="mx-auto mt-5 w-full max-w-[30rem] rounded-[1.3rem] border border-white/20 bg-black/28 px-3 py-3 backdrop-blur-[2px] shadow-[0_14px_30px_rgba(2,6,23,0.4)]">
              <div className="grid grid-cols-2 gap-2.5">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={`${question.prompt}-${option}-${idx}`}
                    type="button"
                    onClick={() => handleAnswer(option)}
                    disabled={status !== 'playing'}
                    whileTap={{ scale: 0.96, y: 2 }}
                    animate={selectedChoice === option ? { scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] } : { scale: 1, rotate: 0 }}
                    className="rounded-[1.05rem] border border-amber-100/70 bg-[linear-gradient(180deg,#fde68a_0%,#f59e0b_100%)] px-3 py-3 text-center text-[clamp(1.35rem,6vw,2.2rem)] font-black text-amber-950 shadow-[0_10px_18px_rgba(146,64,14,0.35)] transition disabled:opacity-45"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>

              <div className="mt-3 rounded-full border border-white/18 bg-black/38 px-3 py-1.5 text-center text-[clamp(0.92rem,3.8vw,1.28rem)] font-black tracking-[0.02em] text-amber-50">
                Solved: {solved}
              </div>
            </section>
          </motion.div>
        </div>
      </main>

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
                : 'border-rose-200/75 bg-rose-500/25 text-amber-50'
            }`}
          >
            {feedback.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.4rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3">
        <div className="pointer-events-auto">
        </div>
      </div>

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
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-emerald-100/70">XP</p>
                  <p className="text-lg font-black text-emerald-100">{XP.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new Event(GAME_HUD_RESTART_EVENT));
                    startRound();
                  }}
                  className="ui-button-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-[0.14em]"
                >
                  <RotateCcw className="h-4 w-4" /> Replay
                </button>
                <button
                  type="button"
                  onClick={submitRound}
                  className="ui-button-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-[0.14em]"
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


