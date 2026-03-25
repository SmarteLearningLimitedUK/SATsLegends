import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CircleHelp,
  Heart,
  Sparkles,
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

const OPTIONS = ['8', '10', '12', '14'] as const;
const CORRECT = '10';
const ROUND_TIME_SECONDS = 83;

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameProps> = ({
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_SECONDS);
  const [lives, setLives] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('default');
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const canSubmit = selected !== null;
  const avatarInitial = useMemo(
    () => (avatarId?.trim()?.charAt(0)?.toUpperCase() || 'E'),
    [avatarId],
  );

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

  useEffect(() => {
    if (!showHelp) return undefined;
    const id = window.setTimeout(() => setShowHelp(false), 2400);
    return () => window.clearTimeout(id);
  }, [showHelp]);

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

      <div className="relative z-10 flex h-full w-full flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.8rem,env(safe-area-inset-top))] text-slate-100 sm:px-4">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2 rounded-[1.05rem] border-2 border-amber-200/85 bg-[linear-gradient(180deg,#7a4a1f_0%,#5f3918_62%,#46280f_100%)] px-2 py-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.35),0_0_18px_rgba(245,158,11,0.2)]">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] border-2 border-amber-200/90 bg-[linear-gradient(180deg,#1f5ab0_0%,#1e3f89_100%)] shadow-[0_0_0_2px_rgba(180,83,9,0.35)]">
              <UserCircle2 className="absolute h-4 w-4 text-cyan-100/55" />
              <span className="relative text-sm font-black text-cyan-50">{avatarInitial}</span>
            </div>
            <div className="min-w-0 pr-1">
              <p className="truncate text-[15px] font-black uppercase tracking-[0.04em] text-amber-50">Explorer</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-11 min-w-[170px] items-center gap-2 rounded-[1.05rem] border-2 border-cyan-100/70 bg-[linear-gradient(180deg,#1256b7_0%,#163f8d_55%,#102f70_100%)] px-2 shadow-[0_12px_24px_rgba(3,21,58,0.42)] sm:min-w-[190px]">
              <div className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/85 bg-[linear-gradient(180deg,#f7d77a_0%,#d0912c_100%)] text-amber-900 shadow-[0_0_10px_rgba(245,158,11,0.35)]">
                <Timer className="h-4 w-4" />
              </div>
              <div className="relative h-5 flex-1 overflow-hidden rounded-full border border-cyan-100/55 bg-slate-900/45">
                <div className="absolute inset-[2px] rounded-full bg-slate-950/55" />
                <div
                  className="absolute inset-y-[2px] left-[2px] rounded-full bg-[linear-gradient(90deg,#6dff4a_0%,#22d34e_55%,#14b8a6_100%)] shadow-[0_0_12px_rgba(74,222,128,0.6)] transition-all duration-500"
                  style={{ width: `calc(${(timeLeft / ROUND_TIME_SECONDS) * 100}% - 4px)` }}
                />
              </div>
              <span className="shrink-0 text-sm font-black text-cyan-50">{timeLeft}s</span>
            </div>

            <div className="inline-flex h-11 items-center gap-1.5 rounded-[1.05rem] border-2 border-cyan-100/70 bg-[linear-gradient(180deg,#1256b7_0%,#163f8d_55%,#102f70_100%)] px-2.5 text-sm font-black text-cyan-50 shadow-[0_10px_18px_rgba(3,21,58,0.35)]">
              <Heart className="h-4 w-4 text-red-400" />
              <span>{lives}</span>
            </div>
          </div>
        </header>

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

        <footer className="mt-3 grid shrink-0 grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(37,99,235,0.45),rgba(30,58,138,0.42))] text-sm font-black text-white shadow-[0_8px_14px_rgba(2,6,23,0.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(37,99,235,0.45),rgba(30,58,138,0.42))] text-sm font-black text-white shadow-[0_8px_14px_rgba(2,6,23,0.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            Sound
          </button>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,rgba(37,99,235,0.45),rgba(30,58,138,0.42))] text-sm font-black text-white shadow-[0_8px_14px_rgba(2,6,23,0.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <CircleHelp className="h-4 w-4" />
            Help
          </button>
        </footer>
      </div>

      {showHelp ? (
        <div className="pointer-events-none absolute bottom-[max(6.2rem,calc(env(safe-area-inset-bottom)+5.2rem))] left-1/2 z-30 -translate-x-1/2 rounded-full border border-cyan-100/65 bg-[linear-gradient(180deg,rgba(34,211,238,0.26),rgba(30,64,175,0.32))] px-4 py-2 text-xs font-black uppercase tracking-[0.09em] text-cyan-50 shadow-[0_10px_24px_rgba(34,211,238,0.25)]">
          Pick the missing number, then tap Submit.
        </div>
      ) : null}

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
