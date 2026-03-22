import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplayHUD from '../components/GameplayHUD';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { AVATARS } from '../constants';
import { triggerHaptic } from '../haptics';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface ArithmeticGauntletGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type Operation = '+' | '-' | '×' | '÷';

interface ArithmeticQuestion {
  prompt: string;
  answer: number;
}

type FeedbackState = null | {
  type: 'success' | 'error';
  title: string;
  subtitle: string;
};

const ROUND_SECONDS = 60;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const createQuestion = (levelId: number): ArithmeticQuestion => {
  const resolvedLevel = Math.max(1, Math.min(10, levelId || 1));
  const availableOps: Operation[] = resolvedLevel <= 2
    ? ['+', '-']
    : resolvedLevel <= 5
      ? ['+', '-', '×']
      : ['+', '-', '×', '÷'];

  const op = availableOps[randomInt(0, availableOps.length - 1)];

  if (op === '+') {
    const max = 20 + (resolvedLevel * 8);
    const a = randomInt(4, max);
    const b = randomInt(3, max);
    return { prompt: `${a} + ${b}`, answer: a + b };
  }

  if (op === '-') {
    const max = 24 + (resolvedLevel * 9);
    const a = randomInt(8, max);
    const b = randomInt(2, a - 1);
    return { prompt: `${a} - ${b}`, answer: a - b };
  }

  if (op === '×') {
    const maxFactor = Math.min(14, 7 + Math.floor(resolvedLevel / 2));
    const a = randomInt(2, maxFactor);
    const b = randomInt(2, maxFactor);
    return { prompt: `${a} × ${b}`, answer: a * b };
  }

  const divisor = randomInt(2, Math.min(12, 5 + Math.floor(resolvedLevel / 2)));
  const quotient = randomInt(2, Math.min(14, 7 + Math.floor(resolvedLevel / 2)));
  const dividend = divisor * quotient;
  return { prompt: `${dividend} ÷ ${divisor}`, answer: quotient };
};

const starsForScore = (score: number, targetScore: number, accuracy: number) => {
  if (score >= targetScore * 0.9 && accuracy >= 0.82) return 3;
  if (score >= targetScore * 0.55 && accuracy >= 0.62) return 2;
  return 1;
};

const ArithmeticGauntletGame: React.FC<ArithmeticGauntletGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack,
}) => {
  const avatar = useMemo(() => AVATARS.find((item) => item.id === avatarId) || AVATARS[0], [avatarId]);
  const resolvedLevel = useMemo(() => Math.max(1, Math.min(10, levelId || 1)), [levelId]);
  const targetScore = useMemo(() => 1800 + (resolvedLevel * 240), [resolvedLevel]);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [streak, setStreak] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [question, setQuestion] = useState<ArithmeticQuestion>(() => createQuestion(resolvedLevel));
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isFinished, setIsFinished] = useState(false);

  const timersRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = Math.min((score / Math.max(1, targetScore)) * 100, 100);

  const clearTimers = () => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  };

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    clearTimers();
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(ROUND_SECONDS);
    setStreak(0);
    setQuestionCount(0);
    setCorrectCount(0);
    setQuestion(createQuestion(resolvedLevel));
    setInputValue('');
    setFeedback(null);
    setIsFinished(false);
    const timerId = window.setTimeout(() => inputRef.current?.focus(), 30);
    timersRef.current.push(timerId);
  }, [resolvedLevel]);

  useEffect(() => {
    if (isFinished) return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setIsFinished(true);
          const attempts = Math.max(1, questionCount);
          const accuracy = correctCount / attempts;
          const stars = starsForScore(scoreRef.current, targetScore, accuracy);

          confetti({
            particleCount: 95,
            spread: 64,
            origin: { y: 0.66 },
            colors: ['#fcd34d', '#67e8f9', '#ffffff'],
          });
          onVictory(stars, scoreRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [correctCount, isFinished, onVictory, questionCount, targetScore]);

  const moveNextQuestion = () => {
    const timerId = window.setTimeout(() => {
      setQuestion(createQuestion(resolvedLevel));
      setInputValue('');
      setFeedback(null);
      inputRef.current?.focus();
    }, 240);
    timersRef.current.push(timerId);
  };

  const submitAnswer = (event: React.FormEvent) => {
    event.preventDefault();
    if (isFinished) return;

    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === '-') {
      setFeedback({
        type: 'error',
        title: 'No Input',
        subtitle: 'Enter an answer to continue.',
      });
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) {
      setFeedback({
        type: 'error',
        title: 'Invalid',
        subtitle: 'Answer must be numeric.',
      });
      return;
    }

    setQuestionCount((previous) => previous + 1);

    if (parsed === question.answer) {
      const gained = 110 + (streak * 18);
      const updatedScore = score + gained;
      setScore(updatedScore);
      scoreRef.current = updatedScore;
      setStreak((previous) => previous + 1);
      setCorrectCount((previous) => previous + 1);
      setFeedback({
        type: 'success',
        title: 'Correct',
        subtitle: `+${gained} score`,
      });
      triggerHaptic('success');
    } else {
      setStreak(0);
      setFeedback({
        type: 'error',
        title: 'Miss',
        subtitle: `Correct answer: ${question.answer}`,
      });
      triggerHaptic('error');
    }

    moveNextQuestion();
  };

  return (
    <GameScreenShell className="overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+0.35rem)]">
      <GameplaySceneBackdrop gameType="calculation_clash" />

      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-4 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title="Arithmetic Gauntlet"
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/84"
            accentBorder="border-sky-200/88"
            progressBar="bg-gradient-to-r from-cyan-300 via-sky-300 to-yellow-300"
            statLabel="Streak"
            statValue={`${streak}`}
          />
        </div>

        <PuzzleStage className="w-full max-w-6xl rounded-[2.3rem] md:rounded-[2.6rem]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)_24%,rgba(15,23,42,0.2)_100%)]" />

          <div className="relative z-10 flex h-full w-full flex-col px-3 pb-4 pt-14 md:px-6 md:pb-6 md:pt-20">
            <div className="flex justify-center">
              <div className="licensed-slice-paper-panel max-w-[95%] px-5 py-3 text-center shadow-[0_16px_30px_rgba(15,23,42,0.16)] md:px-7 md:py-4">
                <div className="text-base font-black tracking-tight text-amber-900 md:text-[1.75rem]">
                  Answer as many arithmetic questions as possible in 60 seconds
                </div>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto md:mt-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.05fr_1fr] md:gap-4">
                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Current question</div>
                  <div className="mt-3 rounded-[1.1rem] border border-sky-200/22 bg-[linear-gradient(180deg,rgba(14,116,144,0.2),rgba(15,23,42,0.5))] p-3 text-center shadow-[0_12px_22px_rgba(2,6,23,0.2)] md:p-4">
                    <div className="text-3xl font-black tracking-tight text-white md:text-5xl">{question.prompt}</div>
                  </div>
                  <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/18 p-2.5 text-xs font-semibold text-cyan-50/90 md:text-sm">
                    Attempts: {questionCount} • Correct: {correctCount}
                  </div>
                </div>

                <div className="licensed-game-card-dark rounded-[1.6rem] border border-white/14 p-3 shadow-[0_16px_28px_rgba(2,6,23,0.22)] md:p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/75 md:text-xs">Answer input</div>
                  <form onSubmit={submitAnswer} className="mt-3 flex flex-col gap-2.5 md:gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value.replace(/[^\d-]/g, ''))}
                      disabled={isFinished}
                      placeholder="Type answer"
                      className="h-14 rounded-[1.05rem] border border-sky-200/25 bg-black/28 px-4 text-center text-2xl font-black text-white outline-none transition placeholder:text-cyan-100/45 focus:border-sky-300/70 disabled:opacity-60 md:h-16 md:text-3xl"
                    />
                    <button
                      type="submit"
                      disabled={isFinished}
                      className="ui-button-primary min-h-[3.3rem] rounded-[1.05rem] px-3 py-2 text-lg font-black text-white shadow-[0_12px_22px_rgba(2,6,23,0.18)] disabled:opacity-60 md:min-h-[4rem] md:text-2xl"
                    >
                      Submit
                    </button>
                  </form>
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

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass="text-amber-100" />
        </div>
      </div>
    </GameScreenShell>
  );
};

export default ArithmeticGauntletGame;
