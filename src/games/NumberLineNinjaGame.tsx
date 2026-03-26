import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, WandSparkles } from 'lucide-react';
import {
  emitMiniGameSessionEvent,
  MiniGameShellContractProps,
} from '../app/gameplaySessionContract';
import {
  FantasyAnswerCluster,
  FantasyAnswerFeedbackBanner,
  FantasyAnswerFeedbackState,
} from '../components/FantasyAnswerFeedback';

interface NumberLineNinjaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

type NumberLineNinjaGameShellProps = NumberLineNinjaGameProps & MiniGameShellContractProps;

const PUZZLE = {
  question: 'A number line goes from 0 to 20. Which number is missing?',
  options: ['8', '10', '12', '14'] as const,
  correct: '10',
  ticks: [0, 5, 10, 15, 20] as const,
};

type OptionValue = (typeof PUZZLE.options)[number];
type FeedbackState = FantasyAnswerFeedbackState;

const NumberLineNinjaGame: React.FC<NumberLineNinjaGameShellProps> = ({
  levelId,
  avatarId: _avatarId,
  onVictory,
  onGameOver: _onGameOver,
  onBack: _onBack,
  sessionState,
  sessionEvents,
}) => {
  const [selected, setSelected] = useState<OptionValue | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>('default');
  const [score, setScore] = useState(0);
  const [hasSignalledFailure, setHasSignalledFailure] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const timeLeft = sessionState?.timeLeft ?? 0;
  const lives = sessionState?.lives ?? 0;
  const isSessionActive = timeLeft > 0 && lives > 0;

  const canSubmit = selected !== null && isSessionActive && feedback !== 'correct';

  useEffect(() => {
    if (!sessionState) return;
    if (sessionState.timeLeft !== sessionState.totalTime) return;
    setHasSignalledFailure(false);
    setSelected(null);
    setFeedback('default');
    setScore(0);
    setShowCelebration(false);
  }, [levelId, sessionState, sessionState?.timeLeft, sessionState?.totalTime]);

  useEffect(() => {
    if (hasSignalledFailure) return;
    if (isSessionActive) return;
    setHasSignalledFailure(true);
    emitMiniGameSessionEvent(sessionEvents, 'game_failed', {
      score,
      reason: lives <= 0 ? 'lives' : 'time',
    });
  }, [hasSignalledFailure, isSessionActive, lives, score, sessionEvents]);

  const selectOption = (value: OptionValue) => {
    if (!isSessionActive || feedback === 'correct') return;
    setSelected(value);
    setFeedback('selected');
  };

  const submit = () => {
    if (!selected || !isSessionActive || feedback === 'correct') return;

    if (selected === PUZZLE.correct) {
      const nextScore = score + 120;
      setScore(nextScore);
      setFeedback('correct');
      setShowCelebration(true);

      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', {
        score,
        metadata: {
          scoreDelta: 120,
          scoreAfter: nextScore,
        },
      });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete', {
        score: nextScore,
        metadata: {
          scoreDelta: 120,
        },
      });

      window.setTimeout(() => setShowCelebration(false), 540);
      window.setTimeout(() => {
        emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: nextScore });
        onVictory(3, nextScore);
      }, 700);
      return;
    }

    setFeedback('incorrect');
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', {
      score,
      metadata: {
        livesBefore: lives,
        livesLost: 1,
      },
    });

    window.setTimeout(() => {
      if (!isSessionActive) return;
      setSelected(null);
      setFeedback('default');
    }, 760);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(130%_80%_at_50%_10%,#5eead433_0%,#3b82f666_32%,#1d4ed8aa_64%,#0b1028_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#1e1b4bcc_0%,#0f172ad9_52%,#020617_f0_100%)]" />
      <div className="pointer-events-none absolute -left-14 top-20 h-56 w-56 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-28 h-64 w-64 rounded-full bg-fuchsia-400/26 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-amber-300/22 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background:radial-gradient(circle_at_14%_19%,#ffffff_0,transparent_2px),radial-gradient(circle_at_84%_16%,#ffffff_0,transparent_2px),radial-gradient(circle_at_31%_72%,#ffffff_0,transparent_2px),radial-gradient(circle_at_66%_63%,#ffffff_0,transparent_2px)]" />

      <FantasyAnswerFeedbackBanner
        state={feedback === 'correct' ? 'correct' : feedback === 'incorrect' ? 'incorrect' : null}
        correctText="Perfect cast!"
        incorrectText="Good try. Pick another!"
      />

      <AnimatePresence initial={false}>
        {showCelebration ? (
          <motion.div
            key="celebration-burst"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20"
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0.8 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300/60 blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
              className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-100/80"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 flex h-full w-full flex-col px-3 pb-3 pt-1 text-slate-100 sm:px-4">
        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <section className="shrink-0 rounded-[1.35rem] border border-cyan-100/55 bg-[linear-gradient(180deg,rgba(15,23,42,0.66),rgba(30,41,59,0.54))] px-4 py-3 text-center shadow-[0_14px_28px_rgba(15,23,42,0.4)]">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Missing Number</p>
            <h1 className="mt-1.5 text-[clamp(1rem,4.3vw,1.3rem)] font-black leading-snug text-white">
              {PUZZLE.question}
            </h1>
          </section>

          <section className="relative flex-1 overflow-hidden rounded-[1.6rem] border border-cyan-100/55 bg-[linear-gradient(180deg,rgba(56,189,248,0.2),rgba(30,58,138,0.26)_36%,rgba(15,23,42,0.64)_100%)] px-4 py-5 shadow-[0_22px_34px_rgba(2,6,23,0.45)]">
            <div className="pointer-events-none absolute inset-x-5 top-5 h-14 rounded-full bg-cyan-300/22 blur-2xl" />
            <div className="pointer-events-none absolute inset-x-10 bottom-6 h-20 rounded-full bg-indigo-500/16 blur-3xl" />

            <div className="relative mx-auto flex h-full w-full max-w-[580px] flex-col items-center justify-center">
              <p className="mb-4 inline-flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-300/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
                <WandSparkles className="h-3.5 w-3.5" />
                Cast The Missing Value
              </p>

              <div className="relative h-36 w-full">
                <div className="absolute inset-x-2 top-1/2 h-[7px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.45)]" />

                {PUZZLE.ticks.map((tick) => {
                  const leftPercent = (tick / 20) * 100;
                  const missing = tick === 10;
                  return (
                    <div
                      key={tick}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${leftPercent}%` }}
                    >
                      {missing ? (
                        <motion.div
                          animate={{ scale: [1, 1.08, 1], opacity: [0.58, 0.9, 0.58] }}
                          transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute left-1/2 top-[20px] h-16 w-16 -translate-x-1/2 rounded-full bg-amber-300/35 blur-xl"
                        />
                      ) : null}

                      <div
                        className={`relative mx-auto w-[5px] rounded-full ${
                          missing
                            ? 'h-14 bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.6)]'
                            : 'h-9 bg-white shadow-[0_0_10px_rgba(255,255,255,0.35)]'
                        }`}
                      />
                      <div className="absolute left-1/2 top-12 -translate-x-1/2">
                        <span
                          className={`inline-flex items-center justify-center text-[clamp(1.28rem,5.7vw,1.6rem)] font-black [text-shadow:0_2px_2px_rgba(0,0,0,0.28)] ${
                            missing
                              ? 'rounded-full border border-amber-200/80 bg-[linear-gradient(180deg,rgba(251,191,36,0.45),rgba(245,158,11,0.3))] px-3 py-1 text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.55)]'
                              : 'text-white'
                          }`}
                        >
                          {missing ? '?' : tick}
                        </span>
                      </div>
                      {missing ? (
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-amber-200">
                          <Sparkles className="h-5 w-5" />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-cyan-100/55 bg-[linear-gradient(180deg,rgba(30,41,59,0.62),rgba(15,23,42,0.62))] p-3.5 shadow-[0_16px_28px_rgba(2,6,23,0.36)]">
            <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/90">
              Choose Your Answer
            </p>
            <FantasyAnswerCluster
              options={PUZZLE.options}
              selected={selected}
              feedback={feedback}
              correctOption={PUZZLE.correct}
              onSelect={selectOption}
              disabled={!isSessionActive || feedback === 'correct'}
              columns={2}
              buttonClassName="h-[3.75rem]"
            />
          </section>

          <motion.button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            whileTap={canSubmit ? { scale: 0.985 } : undefined}
            className={[
              'mt-auto h-14 shrink-0 rounded-[1.25rem] border text-lg font-black tracking-[0.02em] transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              canSubmit
                ? 'border-amber-100/95 bg-[linear-gradient(180deg,#fde047_0%,#f59e0b_100%)] text-amber-950 shadow-[0_14px_24px_rgba(217,119,6,0.45)] hover:brightness-105'
                : 'border-slate-300/30 bg-slate-700/55 text-slate-300 shadow-none',
            ].join(' ')}
          >
            {canSubmit ? 'Cast Answer' : 'Select An Answer'}
          </motion.button>
        </main>
      </div>
    </div>
  );
};

export default NumberLineNinjaGame;
