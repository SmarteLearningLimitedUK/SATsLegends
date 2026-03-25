import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CircleHelp,
  Heart,
  Timer,
  UserCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type FeedbackState = 'default' | 'selected' | 'correct' | 'incorrect';

const ANSWERS = ['8', '10', '12', '14'] as const;
const CORRECT_ANSWER = '10';

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameProps> = ({
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [timeLeft, setTimeLeft] = useState(83);
  const [lives, setLives] = useState(3);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('default');
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [score, setScore] = useState(0);

  const canSubmit = selectedAnswer !== null;
  const isCorrect = selectedAnswer === CORRECT_ANSWER;
  const avatarGlyph = useMemo(
    () => (avatarId?.trim()?.charAt(0)?.toUpperCase() || 'E'),
    [avatarId],
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          onGameOver(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [onGameOver, score]);

  useEffect(() => {
    if (!showHelp) return undefined;
    const timeoutId = window.setTimeout(() => setShowHelp(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [showHelp]);

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setFeedbackState('selected');
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;

    if (selectedAnswer === CORRECT_ANSWER) {
      setFeedbackState('correct');
      const nextScore = score + 120;
      setScore(nextScore);
      window.setTimeout(() => onVictory(3, nextScore), 650);
      return;
    }

    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    setFeedbackState('incorrect');

    window.setTimeout(() => {
      if (nextLives <= 0) {
        onGameOver(score);
        return;
      }
      setSelectedAnswer(null);
      setFeedbackState('default');
    }, 700);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(110% 75% at 50% 12%, rgba(59,130,246,0.26), rgba(30,41,59,0.32) 45%, rgba(2,6,23,0.92) 100%), linear-gradient(180deg, #0b1228 0%, #09142f 40%, #071021 100%)',
        }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 right-[-2.5rem] h-60 w-60 rounded-full bg-indigo-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.9rem,env(safe-area-inset-top))]">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/14 bg-slate-900/72 px-3 py-2.5 shadow-[0_12px_24px_rgba(2,6,23,0.34)] backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/40 bg-cyan-500/20">
              <UserCircle2 className="absolute h-4 w-4 text-cyan-100/40" />
              <span className="relative text-sm font-black text-cyan-100">{avatarGlyph}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-[0.03em] text-cyan-50">Explorer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/35 bg-blue-500/20 px-2.5 py-1 text-xs font-black tracking-[0.03em] text-cyan-50">
              <Timer className="h-3.5 w-3.5" />
              <span>{timeLeft}s</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/35 bg-rose-500/18 px-2.5 py-1 text-xs font-black tracking-[0.03em] text-rose-100">
              <Heart className="h-3.5 w-3.5" />
              <span>{lives}</span>
            </div>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-white/12 bg-slate-900/66 px-4 py-3 shadow-[0_10px_20px_rgba(2,6,23,0.3)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/80">Missing Number</p>
            <h1 className="mt-1.5 text-[clamp(1rem,4.3vw,1.25rem)] font-black leading-snug text-white">
              A number line goes from 0 to 20. Which number is missing?
            </h1>
          </section>

          <section className="rounded-2xl border border-cyan-100/20 bg-slate-900/64 px-4 py-5 shadow-[0_16px_30px_rgba(2,6,23,0.35)]">
            <div className="relative mx-auto h-24 w-full max-w-[350px]">
              <div className="absolute left-0 right-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200 via-cyan-50 to-cyan-200 shadow-[0_0_12px_rgba(103,232,249,0.18)]" />

              {[0, 5, 10, 15, 20].map((tick) => {
                const leftPercent = (tick / 20) * 100;
                const isMissingTick = tick === 10;
                return (
                  <div
                    key={`tick-${tick}`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <div className={`mx-auto w-[4px] rounded-full ${isMissingTick ? 'h-9 bg-amber-300' : 'h-7 bg-white/95'}`} />
                    <div className="absolute left-1/2 top-9 -translate-x-1/2">
                      <span
                        className={`text-[clamp(1.1rem,5vw,1.35rem)] font-black ${
                          isMissingTick
                            ? 'rounded-full border border-amber-200/50 bg-amber-400/20 px-2 py-0.5 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                            : 'text-white'
                        }`}
                      >
                        {isMissingTick ? '?' : tick}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/12 bg-slate-900/62 p-3.5 shadow-[0_14px_26px_rgba(2,6,23,0.34)]">
            <div className="grid grid-cols-2 gap-2.5">
              {ANSWERS.map((answer) => {
                const selected = selectedAnswer === answer;
                const showCorrect = feedbackState === 'correct' && answer === CORRECT_ANSWER;
                const showWrong = feedbackState === 'incorrect' && selected && answer !== CORRECT_ANSWER;
                return (
                  <button
                    key={answer}
                    type="button"
                    onClick={() => handleSelectAnswer(answer)}
                    className={[
                      'h-14 rounded-2xl border text-xl font-black transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/85 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                      selected ? 'border-cyan-200/75 bg-cyan-400/26 text-cyan-50 shadow-[0_10px_18px_rgba(34,211,238,0.22)]' : 'border-white/16 bg-slate-800/76 text-white hover:border-cyan-100/35',
                      showCorrect ? 'border-emerald-200/80 bg-emerald-500/30 text-emerald-50' : '',
                      showWrong ? 'border-rose-200/85 bg-rose-500/32 text-rose-50' : '',
                    ].join(' ')}
                  >
                    {answer}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-auto h-14 shrink-0 rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-300 to-amber-500 text-lg font-black text-amber-950 shadow-[0_12px_20px_rgba(180,83,9,0.34)] transition-all disabled:cursor-not-allowed disabled:opacity-45"
          >
            Submit
          </button>
        </main>

        <footer className="mt-3 grid shrink-0 grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-white/18 bg-slate-900/70 text-sm font-black text-white/90 transition hover:border-cyan-200/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/85"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-white/18 bg-slate-900/70 text-sm font-black text-white/90 transition hover:border-cyan-200/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/85"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            Sound
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-white/18 bg-slate-900/70 text-sm font-black text-white/90 transition hover:border-cyan-200/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/85"
          >
            <CircleHelp className="h-4 w-4" />
            Help
          </button>
        </footer>
      </div>

      {showHelp ? (
        <div className="pointer-events-none absolute bottom-[max(6.25rem,calc(env(safe-area-inset-bottom)+5.5rem))] left-1/2 z-30 -translate-x-1/2 rounded-full border border-cyan-100/45 bg-slate-900/88 px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-cyan-50 shadow-[0_10px_24px_rgba(2,6,23,0.45)]">
          Tap the missing value on the number line.
        </div>
      ) : null}

      {feedbackState === 'correct' ? (
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+4.9rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border border-emerald-200/80 bg-emerald-500/35 px-4 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-emerald-50 shadow-[0_8px_20px_rgba(16,185,129,0.28)]">
          Correct!
        </div>
      ) : null}

      {feedbackState === 'incorrect' ? (
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+4.9rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border border-rose-200/80 bg-rose-500/35 px-4 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-rose-50 shadow-[0_8px_20px_rgba(244,63,94,0.28)]">
          Try again
        </div>
      ) : null}
    </div>
  );
};

export default NumberLineNinjaGame;
