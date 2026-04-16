import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  FeedbackStrip,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import pyramidImage from '../assets/pyramid.png';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import problemPyramidBackground from '../assets/maps/backgroundsforgames/problem pyramid.jpg';

interface ProblemPyramidGameProps {
  levelId: number;
  avatarId: string;
  useSharedTopHud?: boolean;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface PyramidRound {
  id: string;
  base: [number, number, number];
  middle: [number, number];
  top: number;
  options: number[];
}

const ROUNDS_TO_WIN = 6;
const BASE_XP = 140;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const buildRound = (level: number, round: number): PyramidRound => {
  const min = level <= 2 ? 2 : level <= 5 ? 4 : 6;
  const max = level <= 2 ? 8 : level <= 5 ? 12 : 18;
  const base: [number, number, number] = [
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
    clamp(min + Math.floor(Math.random() * (max - min + 1)), min, max),
  ];
  const middle: [number, number] = [base[0] + base[1], base[1] + base[2]];
  const top = middle[0] + middle[1];

  const distractors = new Set<number>();
  const jitter = level <= 3 ? 6 : 10;
  while (distractors.size < 3) {
    const guess = top + (Math.floor(Math.random() * (jitter * 2 + 1)) - jitter);
    if (guess !== top && guess > 0) distractors.add(guess);
  }

  return {
    id: `pyr-${round}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    base,
    middle,
    top,
    options: shuffle([top, ...Array.from(distractors)]),
  };
};

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const ProblemPyramidGame: React.FC<ProblemPyramidGameProps> = ({
  levelId,
  onVictory,
  onGameOver: _onGameOver,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [glow, setGlow] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');

  const round = useMemo(() => buildRound(levelId, roundIndex + 1), [levelId, roundIndex]);

  const handleAnswer = (option: number) => {
    if (locked) return;
    setSelected(option);
    setAttempts((prev) => prev + 1);

    if (option === round.top) {
      setCorrectCount((prev) => prev + 1);
      setFeedback('Brilliant! Pyramid locked in.');
      setFeedbackTone('good');
      setLocked(true);
      setGlow(true);
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.62 },
        colors: ['#facc15', '#60a5fa', '#34d399'],
      });
      window.setTimeout(() => {
        const nextRound = roundIndex + 1;
        if (nextRound >= ROUNDS_TO_WIN) {
          const xp = BASE_XP * ROUNDS_TO_WIN + levelId * 40;
          onVictory(starsForAccuracy(correctCount + 1, attempts + 1), xp);
          return;
        }
        setRoundIndex(nextRound);
        setSelected(null);
        setLocked(false);
        setGlow(false);
        setFeedback('');
        setFeedbackTone('neutral');
      }, 750);
      return;
    }

    setFeedback('Close! Re-check the numbers below.');
    setFeedbackTone('bad');
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      setSelected(null);
      setFeedback('');
      setFeedbackTone('neutral');
      setRoundIndex((prev) => prev + 1);
    }, 800);
  };

  const blockClass = (isTop?: boolean) => (
    `flex h-[3.6rem] w-[4.8rem] items-center justify-center rounded-[0.95rem] border text-[1.2rem] font-black shadow-[0_10px_18px_rgba(2,6,23,0.25)] md:h-[4.2rem] md:w-[5.4rem] md:text-[1.5rem] ${
      glow
        ? 'border-emerald-200/80 bg-emerald-300/35 text-emerald-950 shadow-[0_0_18px_rgba(16,185,129,0.55)]'
        : isTop
          ? 'border-cyan-100/30 bg-white/12 text-white'
          : 'border-white/20 bg-white/10 text-white'
    }`
  );

  return (
    <GameUiShell className="bg-transparent" overlayDisabled>
      <GameplaySceneBackdrop gameType="rule_runner" backgroundOverride={problemPyramidBackground} />
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-1.5 px-3 pb-[calc(env(safe-area-inset-bottom)+2.8rem)] pt-2 text-white">
        <section className="shrink-0">
          <div className="game-question-card w-full max-w-[780px] px-3 py-2 text-center">
            <div className="question-title">Find the top number in the pyramid.</div>
            <div className="question-subtitle">Round {roundIndex + 1} / {ROUNDS_TO_WIN}</div>
          </div>
        </section>

        <section className="min-h-0 flex-1 rounded-[1.4rem] border border-white/14 bg-white/10 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.28)]">
          <div className="relative flex h-full min-h-0 flex-col items-center justify-center gap-3">
            <img
              src={pyramidImage}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-90 scale-[1.08]"
            />
            <motion.div
              animate={glow ? { scale: [1.05, 1.1, 1.05] } : { scale: 1.05 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="relative z-10 flex flex-col items-center gap-2 translate-y-6"
            >
              <div className={blockClass(true)}>?</div>
              <div className="flex items-center gap-2">
                <div className={blockClass()}>{round.middle[0]}</div>
                <div className={blockClass()}>{round.middle[1]}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className={blockClass()}>{round.base[0]}</div>
                <div className={blockClass()}>{round.base[1]}</div>
                <div className={blockClass()}>{round.base[2]}</div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {round.options.map((option) => (
              <motion.button
                key={option}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAnswer(option)}
                disabled={locked}
                className={`flex min-h-[2.6rem] items-center justify-center rounded-[0.95rem] border text-[0.98rem] font-black shadow-[0_10px_18px_rgba(2,6,23,0.22)] transition ${
                  selected === option
                    ? option === round.top
                      ? 'border-emerald-200/70 bg-emerald-300/50 text-emerald-950'
                      : 'border-rose-200/70 bg-rose-300/50 text-amber-950'
                    : 'border-cyan-100/30 bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </section>

        {feedback ? (
          <section className="shrink-0">
            <FeedbackStrip tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}>
              {feedback}
            </FeedbackStrip>
          </section>
        ) : null}
      </div>
    </GameUiShell>
  );
};

export default ProblemPyramidGame;
