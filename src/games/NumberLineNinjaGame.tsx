import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type FeedbackState = 'default' | 'selected' | 'correct' | 'incorrect';

const OPTIONS = ['8', '10', '12', '14'] as const;
const CORRECT = '10';
const ROUND_TIME_SECONDS = 83;

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameProps> = ({
  avatarId: _avatarId,
  onVictory,
  onGameOver,
  onBack: _onBack,
}) => {
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);
  const [lives, setLives] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('default');
  const [score, setScore] = useState(0);

  const canSubmit = selected !== null;
  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          onGameOver(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [onGameOver, score]);

  const selectOption = (value: string) => {
    setSelected(value);
    setFeedback('selected');
  };

  const submit = () => {
    if (!selected) return;

    if (selected === CORRECT) {
      const nextScore = score + 120;
      setScore(nextScore);
      setFeedback('correct');
      window.setTimeout(() => onVictory(3, nextScore), 650);
      return;
    }

    const nextLives = Math.max(0, lives - 1);
    setLives(nextLives);
    setFeedback('incorrect');
    window.setTimeout(() => {
      if (nextLives <= 0) {
        onGameOver(score);
        return;
      }
      setSelected(null);
      setFeedback('default');
    }, 760);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_72%_at_50%_10%,#2dd4bf33_0%,#1d4ed833_32%,#4f46e533_58%,#0b1028_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#101b4a_0%,#132a63_28%,#182f6f_48%,#0f214f_68%,#091437_100%)]" />
      <div className="pointer-events-none absolute -left-16 top-20 h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-3rem] top-36 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-5rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background:radial-gradient(circle_at_16%_22%,#ffffff_0,transparent_3px),radial-gradient(circle_at_82%_17%,#ffffff_0,transparent_2px),radial-gradient(circle_at_34%_78%,#ffffff_0,transparent_2px),radial-gradient(circle_at_64%_66%,#ffffff_0,transparent_2px)]" />

      <div className="relative z-10 flex h-full w-full flex-col px-3 pb-3 pt-1 text-slate-100 sm:px-4">
        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(15,23,42,0.58),rgba(30,41,59,0.5))] px-4 py-3 text-center shadow-[0_12px_26px_rgba(15,23,42,0.34)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Missing Number</p>
            <h1 className="mt-1.5 text-[clamp(1rem,4.3vw,1.25rem)] font-black leading-snug text-white">
              A number line goes from 0 to 20. Which number is missing?
            </h1>
          </section>

          <section className="relative rounded-2xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(30,58,138,0.38),rgba(15,23,42,0.5))] px-4 py-5 shadow-[0_16px_30px_rgba(15,23,42,0.34)]">
            <div className="pointer-events-none absolute inset-x-6 top-3 h-10 rounded-full bg-cyan-300/12 blur-2xl" />
            <div className="relative mx-auto h-24 w-full max-w-[560px]">
              <div className="absolute left-0 right-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-200 via-cyan-50 to-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.3)]" />

              {[0, 5, 10, 15, 20].map((tick) => {
                const leftPercent = (tick / 20) * 100;
                const missing = tick === 10;
                return (
                  <div
                    key={tick}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <div className={`mx-auto w-[4px] rounded-full ${missing ? 'h-10 bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.45)]' : 'h-7 bg-white/95'}`} />
                    <div className="absolute left-1/2 top-9 -translate-x-1/2">
                      <span
                        className={`inline-flex items-center justify-center text-[clamp(1.15rem,5.2vw,1.38rem)] font-black ${
                          missing
                            ? 'rounded-full border border-amber-200/75 bg-[linear-gradient(180deg,rgba(251,191,36,0.3),rgba(245,158,11,0.26))] px-2.5 py-0.5 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.42)]'
                            : 'text-white'
                        }`}
                      >
                        {missing ? '?' : tick}
                      </span>
                    </div>
                    {missing ? (
                      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-amber-200">
                        <Sparkles className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(30,41,59,0.55),rgba(15,23,42,0.56))] p-3.5 shadow-[0_14px_26px_rgba(2,6,23,0.3)]">
            <div className="grid grid-cols-2 gap-2.5">
              {OPTIONS.map((answer) => {
                const isSelected = selected === answer;
                const isCorrect = feedback === 'correct' && answer === CORRECT;
                const isWrong = feedback === 'incorrect' && isSelected && answer !== CORRECT;
                return (
                  <button
                    key={answer}
                    type="button"
                    onClick={() => selectOption(answer)}
                    className={[
                      'h-14 rounded-2xl border text-xl font-black transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                      'active:scale-[0.98] active:brightness-110',
                      isSelected
                        ? 'border-cyan-100/80 bg-[linear-gradient(180deg,rgba(34,211,238,0.38),rgba(59,130,246,0.34))] text-cyan-50 shadow-[0_12px_20px_rgba(34,211,238,0.26)]'
                        : 'border-cyan-100/45 bg-[linear-gradient(180deg,rgba(37,99,235,0.28),rgba(30,58,138,0.22))] text-white hover:border-cyan-100/70 hover:bg-cyan-300/20',
                      isCorrect ? 'border-emerald-100/90 bg-emerald-500/35 text-emerald-50' : '',
                      isWrong ? 'border-rose-100/90 bg-rose-500/35 text-rose-50' : '',
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
            onClick={submit}
            disabled={!canSubmit}
            className={[
              'mt-auto h-14 shrink-0 rounded-2xl border text-lg font-black transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              canSubmit
                ? 'border-amber-200/85 bg-[linear-gradient(180deg,#fde047_0%,#f59e0b_100%)] text-amber-950 shadow-[0_12px_20px_rgba(217,119,6,0.4)] hover:brightness-105 active:translate-y-[1px]'
                : 'border-slate-300/25 bg-slate-700/50 text-slate-300 shadow-none',
            ].join(' ')}
          >
            Submit
          </button>
        </main>
      </div>

      {feedback === 'correct' ? (
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+4.8rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border border-emerald-100/90 bg-emerald-500/35 px-4 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-emerald-50 shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
          Great job!
        </div>
      ) : null}

      {feedback === 'incorrect' ? (
        <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+4.8rem)] left-1/2 z-30 -translate-x-1/2 rounded-full border border-rose-100/90 bg-rose-500/35 px-4 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-rose-50 shadow-[0_10px_24px_rgba(244,63,94,0.35)]">
          Oops! Try another.
        </div>
      ) : null}
    </div>
  );
};

export default NumberLineNinjaGame;
