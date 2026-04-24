import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  FeedbackStrip,
  GameQuestionCard,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import areaBackdrop from '../assets/maps/backgroundsforgames/area architect.jpg';
import {
  reshuffleAvoidingRepeat,
  shuffle,
  shuffleOptionsWithCorrect,
} from '../utils/questionShuffle';

interface AreaArchitectGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type HalfTriangle = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
type Cell = { x: number; y: number; half?: HalfTriangle };

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

const rectCells = (xStart: number, yStart: number, width: number, height: number): Cell[] => {
  const cells: Cell[] = [];
  for (let y = yStart; y < yStart + height; y += 1) {
    for (let x = xStart; x < xStart + width; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
};

const halfCell = (x: number, y: number, half: HalfTriangle): Cell => ({ x, y, half });

const buildQuestion = (gridSize: number, cells: Cell[], prompt: string): AreaQuestion => {
  const correct = cells.reduce((total, cell) => total + (cell.half ? 0.5 : 1), 0);
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
    id: `${gridSize}-${correct}-${cells.map((cell) => `${cell.x}-${cell.y}-${cell.half || 'full'}`).join('_')}`,
    kind: 'fluency',
    prompt,
    gridSize,
    cells,
    correct,
    options: shuffle(options),
  };
};

const QUESTION_BANK: AreaQuestion[] = [
  buildQuestion(6, rectCells(1, 1, 3, 2), 'Calculate the red area.'),
  buildQuestion(6, rectCells(1, 1, 4, 3), 'Calculate the area.'),
  buildQuestion(6, rectCells(2, 2, 2, 3), 'Calculate the red area.'),
  buildQuestion(
    6,
    [
      ...rectCells(1, 1, 3, 2),
      ...rectCells(3, 3, 2, 2),
    ],
    'Calculate the red area.',
  ),
  buildQuestion(
    6,
    [
      ...rectCells(1, 1, 2, 4),
      ...rectCells(3, 3, 2, 2),
    ],
    'Calculate the area.',
  ),
  buildQuestion(
    7,
    [
      ...rectCells(2, 2, 3, 3),
      ...rectCells(5, 2, 1, 2),
    ],
    'Calculate the red area.',
  ),
  buildQuestion(
    6,
    [
      ...rectCells(1, 2, 3, 2),
      halfCell(4, 2, 'topLeft'),
      halfCell(4, 3, 'bottomLeft'),
    ],
    'Calculate the red area.',
  ),
  buildQuestion(
    6,
    [
      ...rectCells(2, 2, 2, 3),
      halfCell(1, 2, 'topRight'),
      halfCell(4, 4, 'bottomLeft'),
    ],
    'Calculate the area.',
  ),
];

const buildQuestionDeck = (previousLast: AreaQuestion | null) => (
  reshuffleAvoidingRepeat(QUESTION_BANK, previousLast, (question) => question.id).map((question) => ({
    ...question,
    options: shuffleOptionsWithCorrect(question.options, question.correct).options,
  }))
);

const halfTriangleClipPath: Record<HalfTriangle, string> = {
  topLeft: 'polygon(0 0, 100% 0, 0 100%)',
  topRight: 'polygon(0 0, 100% 0, 100% 100%)',
  bottomLeft: 'polygon(0 0, 0 100%, 100% 100%)',
  bottomRight: 'polygon(100% 0, 0 100%, 100% 100%)',
};

const formatAreaOption = (value: number) => Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;

const starsForAccuracy = (correct: number, attempts: number) => {
  if (attempts === 0) return 0;
  const accuracy = correct / attempts;
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  return 1;
};

const AreaArchitectGame: React.FC<AreaArchitectGameProps> = ({
  levelId,
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver: _onGameOver,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [questionOrder, setQuestionOrder] = useState<AreaQuestion[]>(() => buildQuestionDeck(null));
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));

  const question = useMemo(
    () => questionOrder[roundIndex % questionOrder.length],
    [questionOrder, roundIndex],
  );
  const cellMap = useMemo(() => new Map(question.cells.map((cell) => [`${cell.x}-${cell.y}`, cell])), [question.cells]);
  const lastQuestion = questionOrder.length ? questionOrder[questionOrder.length - 1] : null;

  useEffect(() => {
    if (!questionOrder.length) return;
    if (roundIndex > 0 && roundIndex % questionOrder.length === 0) {
      setQuestionOrder(buildQuestionDeck(lastQuestion));
    }
  }, [lastQuestion, questionOrder.length, roundIndex]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

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
        setFeedback('');
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
      setFeedback('');
      setFeedbackTone('neutral');
      setRoundIndex((prev) => prev + 1);
    }, 750);
  };

  return (
    <GameUiShell backgroundImage={areaBackdrop} overlayDisabled>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Area Architect"
        body="The Monster Minds have scrambled the area grid.\nCalculate the red area carefully.\nHalf squares count as triangular halves."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="area-architect-content flex h-full min-h-0 flex-col gap-2 px-3 pb-2 pt-3 text-white">
        <section className="shrink-0">
          <div className="mx-auto w-full max-w-[44rem]">
            <div className="mt-2">
              <GameQuestionCard title="Area Architect">
                {question.prompt}
              </GameQuestionCard>
            </div>
          </div>
        </section>

        <section className="area-architect-grid-shell shrink-0 rounded-[1.4rem] border border-white/14 bg-black/25 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.28)]">
          <div
            className="mx-auto grid aspect-square w-full max-w-[22rem] place-content-center gap-1 rounded-[1rem] border border-white/12 bg-slate-900/50 p-2"
            style={{ gridTemplateColumns: `repeat(${question.gridSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: question.gridSize * question.gridSize }).map((_, index) => {
              const x = (index % question.gridSize) + 1;
              const y = Math.floor(index / question.gridSize) + 1;
              const key = `${x}-${y}`;
              const cell = cellMap.get(key);
              const filled = Boolean(cell);
              return (
                <div
                  key={key}
                  className={`relative aspect-square overflow-hidden rounded-[0.3rem] border ${
                    filled ? 'border-rose-100/85 bg-rose-950/20' : 'border-white/12 bg-slate-900/60'
                  }`}
                >
                  {cell?.half ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-red-500/78 shadow-[inset_0_0_10px_rgba(255,255,255,0.16)]"
                      style={{ clipPath: halfTriangleClipPath[cell.half] }}
                    />
                  ) : filled ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-red-500/72 shadow-[inset_0_0_10px_rgba(255,255,255,0.16)]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="answer-choice-surface shrink-0 grid grid-cols-2 gap-2">
          {question.options.map((option) => (
            <motion.button
              key={option}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleAnswer(option)}
              disabled={locked}
              className={`h-12 rounded-[1rem] text-lg font-black ${
                selected === option
                  ? option === question.correct
                    ? 'ui-button-success'
                    : 'ui-button-primary'
                  : 'ui-button-secondary'
              }`}
            >
              {formatAreaOption(option)} sq units
            </motion.button>
          ))}
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

export default AreaArchitectGame;
