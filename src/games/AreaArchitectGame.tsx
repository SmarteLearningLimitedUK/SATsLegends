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
import areaBackdrop from '../assets/level_backgrounds/place_value_panicbkgrd.png';
import { formatFantasyPrompt } from '../utils/fantasyPrompt';

interface AreaArchitectGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type Cell = { x: number; y: number };

interface AreaQuestion {
  id: string;
  kind: 'fluency' | 'reasoning';
  prompt: string;
  gridSize: number;
  cells: Cell[];
  correct: number;
  options: number[];
}

const ROUNDS_TO_WIN = 5;
const BASE_XP = 160;

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const rectCells = (xStart: number, yStart: number, width: number, height: number): Cell[] => {
  const cells: Cell[] = [];
  for (let y = yStart; y < yStart + height; y += 1) {
    for (let x = xStart; x < xStart + width; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
};

const buildQuestion = (gridSize: number, cells: Cell[], prompt: string): AreaQuestion => {
  const correct = cells.length;
  const step = Math.max(2, Math.round(correct * 0.2));
  const options = shuffle([
    correct,
    Math.max(1, correct - step),
    correct + step,
    Math.max(1, correct - Math.max(1, Math.round(step / 2))),
  ]).slice(0, 4);

  if (!options.includes(correct)) {
    options[0] = correct;
  }

  return {
    id: `${gridSize}-${correct}-${Math.random().toString(36).slice(2, 6)}`,
    kind: 'fluency',
    prompt,
    gridSize,
    cells,
    correct,
    options: shuffle(options),
  };
};

const QUESTION_BANK: AreaQuestion[] = [
  buildQuestion(6, rectCells(1, 1, 3, 2), 'Find the area of the shaded rectangle.'),
  buildQuestion(6, rectCells(1, 1, 4, 3), 'Find the area of the shaded shape.'),
  buildQuestion(6, rectCells(2, 2, 2, 3), 'Count the squares to find the area.'),
  buildQuestion(
    6,
    [
      ...rectCells(1, 1, 3, 2),
      ...rectCells(3, 3, 2, 2),
    ],
    'Find the area of the L-shaped floor.',
  ),
  buildQuestion(
    6,
    [
      ...rectCells(1, 1, 2, 4),
      ...rectCells(3, 3, 2, 2),
    ],
    'What is the area of the shaded shape?',
  ),
  buildQuestion(
    7,
    [
      ...rectCells(2, 2, 3, 3),
      ...rectCells(5, 2, 1, 2),
    ],
    'Find the area using square units.',
  ),
];

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const AreaArchitectGame: React.FC<AreaArchitectGameProps> = ({
  levelId,
  onVictory,
  onGameOver: _onGameOver,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('Count the squares and pick the area.');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');

  const question = useMemo(() => QUESTION_BANK[roundIndex % QUESTION_BANK.length], [roundIndex]);
  const cellSet = useMemo(() => new Set(question.cells.map((cell) => `${cell.x}-${cell.y}`)), [question.cells]);

  const handleAnswer = (value: number) => {
    if (locked) return;
    setSelected(value);
    setAttempts((prev) => prev + 1);

    if (value === question.correct) {
      setCorrectCount((prev) => prev + 1);
      setFeedback('Great measuring! That area is correct.');
      setFeedbackTone('good');
      setLocked(true);
      confetti({
        particleCount: 36,
        spread: 55,
        origin: { y: 0.62 },
        colors: ['#facc15', '#60a5fa', '#34d399'],
      });
      window.setTimeout(() => {
        if (roundIndex + 1 >= ROUNDS_TO_WIN) {
          const xp = BASE_XP * ROUNDS_TO_WIN + levelId * 50;
          onVictory(starsForAccuracy(correctCount + 1, attempts + 1), xp);
          return;
        }
        setRoundIndex((prev) => prev + 1);
        setSelected(null);
        setLocked(false);
        setFeedback('Count the squares and pick the area.');
        setFeedbackTone('neutral');
      }, 700);
      return;
    }

    setFeedback('Not quite. Recount the square units.');
    setFeedbackTone('bad');
    setLocked(true);
    window.setTimeout(() => {
      setLocked(false);
      setSelected(null);
      setFeedback('Count the squares and pick the area.');
      setFeedbackTone('neutral');
      setRoundIndex((prev) => prev + 1);
    }, 750);
  };

  return (
    <GameUiShell backgroundImage={areaBackdrop}>
      <div className="flex h-full min-h-0 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+3.5rem)] pt-3 text-white">
        <section className="shrink-0">
          <StoryCard>
            <p className="text-[clamp(13px,2vh,18px)] font-semibold text-white/90">
              Help the builders plan the floor space.
            </p>
          </StoryCard>
        </section>

        <section className="shrink-0">
          <TaskCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">Area Architect</div>
                <div className="mt-1 text-[clamp(15px,2vh,20px)] font-black text-slate-50">
                  {formatFantasyPrompt(question.prompt)}
                </div>
              </div>
              <div className="rounded-full bg-amber-200/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900">
                Round {roundIndex + 1} / {ROUNDS_TO_WIN}
              </div>
            </div>
          </TaskCard>
        </section>

        <section className="min-h-0 flex-1 rounded-[1.4rem] border border-white/14 bg-black/25 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.28)]">
          <div
            className="mx-auto grid h-full max-h-[22rem] w-full max-w-[22rem] flex-1 place-content-center gap-1 rounded-[1rem] border border-white/12 bg-slate-900/50 p-2"
            style={{ gridTemplateColumns: `repeat(${question.gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: question.gridSize * question.gridSize }).map((_, index) => {
              const x = (index % question.gridSize) + 1;
              const y = Math.floor(index / question.gridSize) + 1;
              const key = `${x}-${y}`;
              const filled = cellSet.has(key);
              return (
                <div
                  key={key}
                  className={`aspect-square rounded-[0.3rem] border ${filled ? 'border-amber-200/80 bg-amber-300/45' : 'border-white/12 bg-slate-900/60'}`}
                />
              );
            })}
          </div>
        </section>

        <section className="shrink-0 grid grid-cols-2 gap-2">
          {question.options.map((option) => (
            <motion.button
              key={option}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAnswer(option)}
              disabled={locked}
              className={`h-12 rounded-[1rem] border text-lg font-black shadow-[0_12px_20px_rgba(2,6,23,0.28)] ${
                selected === option
                  ? option === question.correct
                    ? 'border-emerald-200/70 bg-emerald-400/35 text-emerald-50'
                    : 'border-rose-200/70 bg-rose-400/35 text-rose-50'
                  : 'border-white/18 bg-slate-900/70 text-white'
              }`}
            >
              {option} sq units
            </motion.button>
          ))}
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

export default AreaArchitectGame;
