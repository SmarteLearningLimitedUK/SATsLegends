import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  FeedbackStrip,
  GameUiShell,
  StoryCard,
  TaskCard,
} from '../components/game-ui/GameUiKit';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import ratioBackdrop from '../assets/level_backgrounds/take_out.png';

interface RatioFractionsGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface RatioFractionQuestion {
  id: string;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  ratioA: number;
  ratioB: number;
  partLabel: string;
  showDots: boolean;
  correct: string;
  options: string[];
}

const ROUNDS_TO_WIN = 5;
const BASE_XP = 140;

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const fractionText = (numerator: number, denominator: number) => `${numerator}/${denominator}`;

const buildRatioQuestion = (
  ratioA: number,
  ratioB: number,
  partLabel: string,
  showDots = true,
): RatioFractionQuestion => {
  const total = ratioA + ratioB;
  const correct = partLabel === 'first' ? fractionText(ratioA, total) : fractionText(ratioB, total);
  const distractors = new Set<string>();

  const candidates = [
    fractionText(ratioB, total),
    fractionText(ratioA, ratioB),
    fractionText(ratioA, total + 1),
    fractionText(Math.max(1, ratioA - 1), total),
    fractionText(Math.min(total - 1, ratioA + 1), total),
    fractionText(total, ratioA),
  ];

  candidates.forEach((value) => {
    if (value !== correct && distractors.size < 3) distractors.add(value);
  });

  while (distractors.size < 3) {
    const guess = fractionText(Math.max(1, ratioA - 1), total + 1);
    if (guess !== correct) distractors.add(guess);
  }

  return {
    id: `${ratioA}-${ratioB}-${partLabel}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    prompt: `A potion mix uses the ratio ${ratioA}:${ratioB}. What fraction of the mix is ${partLabel === 'first' ? 'the first' : 'the second'} ingredient?`,
    ratioA,
    ratioB,
    partLabel,
    showDots,
    correct,
    options: shuffle([correct, ...Array.from(distractors)]),
  };
};

const QUESTION_BANK: RatioFractionQuestion[] = [
  buildRatioQuestion(2, 3, 'first', true),
  buildRatioQuestion(1, 4, 'second', true),
  buildRatioQuestion(3, 2, 'first', true),
  buildRatioQuestion(1, 2, 'second', true),
  buildRatioQuestion(4, 1, 'first', false),
  buildRatioQuestion(2, 5, 'second', false),
  buildRatioQuestion(3, 1, 'second', false),
  buildRatioQuestion(5, 3, 'first', false),
];

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const RatioFractionsGame: React.FC<RatioFractionsGameProps> = ({
  levelId,
  onVictory,
  onGameOver: _onGameOver,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState('Choose the fraction that matches the ratio.');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const question = useMemo(() => QUESTION_BANK[roundIndex % QUESTION_BANK.length], [roundIndex]);

  const handleAnswer = (option: string) => {
    if (locked) return;
    setSelected(option);
    setAttempts((prev) => prev + 1);

    if (option === question.correct) {
      setCorrectCount((prev) => prev + 1);
      setFeedback('Great! That fraction matches the ratio.');
      setFeedbackTone('good');
      setLocked(true);
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.62 },
        colors: ['#facc15', '#60a5fa', '#34d399'],
      });
      window.setTimeout(() => {
        if (roundIndex + 1 >= ROUNDS_TO_WIN) {
          const xp = BASE_XP * ROUNDS_TO_WIN + levelId * 40;
          onVictory(starsForAccuracy(correctCount + 1, attempts + 1), xp);
          return;
        }
        setRoundIndex((prev) => prev + 1);
        setSelected(null);
        setLocked(false);
        setFeedback('Choose the fraction that matches the ratio.');
        setFeedbackTone('neutral');
      }, 700);
      return;
    }

    setFeedback('Not quite. Check the total parts in the ratio.');
    setFeedbackTone('bad');
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      setSelected(null);
      setFeedback('Choose the fraction that matches the ratio.');
      setFeedbackTone('neutral');
      setRoundIndex((prev) => prev + 1);
    }, 750);
  };

  return (
    <GameUiShell backgroundImage={ratioBackdrop} backgroundOpacity={0.85}>
      <div className="flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+3.5rem)] pt-3 text-white">
        <section className="shrink-0">
          <StoryCard>
            <p className="text-[clamp(15px,2.2vh,20px)] font-black text-white">
              Help the apothecary measure ingredients fairly.
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,250,255,0.9))]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-900/90">Ratio Fractions</div>
                <div className="mt-1 text-[clamp(17px,2.2vh,22px)] font-black text-slate-950">
                  {question.prompt}
                </div>
              </div>
              <div className="rounded-full bg-amber-200/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900">
                Round {roundIndex + 1} / {ROUNDS_TO_WIN}
              </div>
            </div>

            {question.showDots ? (
              <div className="mt-3 flex items-center justify-center gap-2">
                {Array.from({ length: question.ratioA }).map((_, index) => (
                  <span
                    key={`a-${index}`}
                    className="h-5 w-5 rounded-full border border-white/70 bg-rose-400 shadow-[0_0_10px_rgba(248,113,113,0.65)]"
                  />
                ))}
                {Array.from({ length: question.ratioB }).map((_, index) => (
                  <span
                    key={`b-${index}`}
                    className="h-5 w-5 rounded-full border border-white/70 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 text-center text-[12px] font-semibold text-slate-700">
                Use the ratio to work out the fraction.
              </div>
            )}
          </TaskCard>
        </section>

        <section className="min-h-0 flex-1 rounded-[1.4rem] border border-white/14 bg-white/10 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.28)]">
          <div className="grid h-full min-h-0 grid-cols-2 gap-2">
            {question.options.map((option) => (
              <motion.button
                key={option}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAnswer(option)}
                disabled={locked}
                className={`flex h-full min-h-[5.5rem] items-center justify-center rounded-[1rem] border text-xl font-black shadow-[0_12px_20px_rgba(2,6,23,0.2)] transition ${
                  selected === option
                    ? option === question.correct
                      ? 'border-emerald-200/70 bg-emerald-300/50 text-emerald-950'
                      : 'border-rose-200/70 bg-rose-300/50 text-rose-950'
                    : 'border-white/30 bg-white/15 text-white'
                }`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        </section>

        <section className="shrink-0">
          <FeedbackStrip tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}>
            {feedback}
          </FeedbackStrip>
        </section>

      </div>
    </GameUiShell>
  );
};

export default RatioFractionsGame;
