import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import {
  FeedbackStrip,
  GameQuestionCard,
  GameUiShell,
} from '../components/game-ui/GameUiKit';
import PracticeIntroPopup from '../components/game-ui/PracticeIntroPopup';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';
import areaBackdrop from '../assets/maps/premium/area-architect.webp';
import { playGameSound } from '../audio/gameAudio';
import './area-architect.css';
import { reshuffleAvoidingRepeat } from '../utils/questionShuffle';

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
  prompt: string;
  gridSize: number;
  cells: Cell[];
  correct: number;
}

interface FloorTile { label: string; width: number; height: number }
interface PlacedTile { id: string; cells: string[]; label: string }

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

const buildQuestion = (id: string, gridSize: number, cells: Cell[], prompt: string): AreaQuestion => {
  const uniqueCells = [...new Map(cells.map((cell) => [`${cell.x}-${cell.y}`, cell])).values()];
  return { id, prompt, gridSize, cells: uniqueCells, correct: uniqueCells.length };
};

const areaQuestionsForTier = (level: number): AreaQuestion[] => {
  const tier = Math.max(1, Math.min(5, level));
  return Array.from({ length: 8 }, (_, variant) => {
    if (tier <= 2) {
      const gridSize = tier === 1 ? 6 : 7;
      const width = tier === 1 ? 2 + (variant % 3) : 3 + (variant % 3);
      const height = tier === 1 ? 2 + (Math.floor(variant / 3) % 2) : 2 + (Math.floor(variant / 3) % 3);
      const x = 1 + (variant % (gridSize - width + 1));
      const y = 1 + (Math.floor(variant / 2) % (gridSize - height + 1));
      return buildQuestion(`${tier}-rectangle-${variant}`, gridSize, rectCells(x, y, width, height), 'Tile every gold square. Each small square has an area of 1 square unit. Choose a tile, then tap where it fits. Leave no gaps or overlaps.');
    }
    if (tier <= 4) {
      const gridSize = tier === 3 ? 6 : 7;
      const topWidth = 3 + (variant % 3);
      const topHeight = 1 + (variant % 2);
      const lowerWidth = 1 + (Math.floor(variant / 2) % 2);
      const lowerHeight = 2 + (Math.floor(variant / 3) % 3);
      const x = 1 + (variant % 2);
      const y = 1;
      return buildQuestion(`${tier}-corner-${variant}`, gridSize, [
        ...rectCells(x, y, topWidth, topHeight),
        ...rectCells(x, y + topHeight, lowerWidth, lowerHeight),
      ], 'Tile around the corner. Add the tile areas.');
    }
    const width = 5 + (variant % 2);
    const height = 4 + (Math.floor(variant / 2) % 2);
    const gapX = 1 + (variant % 3);
    const gapY = 1 + (Math.floor(variant / 3) % 2);
    const gapWidth = 1 + (variant % 2);
    return buildQuestion(`${tier}-cutout-${variant}`, 7, rectCells(1, 1, width, height).filter((cell) =>
      !(cell.x > gapX && cell.x <= gapX + gapWidth && cell.y > gapY && cell.y <= gapY + 1)),
    'Tile around the gap. Leave empty squares uncovered.');
  });
};

const buildQuestionDeck = (level: number, previousLast: AreaQuestion | null) => (
  reshuffleAvoidingRepeat(areaQuestionsForTier(level), previousLast, (question) => question.id)
);

const floorTilesForTier = (tier: number): FloorTile[] => [
  { label: '1 × 1', width: 1, height: 1 },
  { label: '1 × 2', width: 1, height: 2 },
  { label: '2 × 1', width: 2, height: 1 },
  ...(tier >= 2 ? [{ label: '2 × 2', width: 2, height: 2 }] : []),
  ...(tier >= 3 ? [{ label: '2 × 3', width: 2, height: 3 }, { label: '3 × 2', width: 3, height: 2 }] : []),
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
  isPractice,
  practiceBriefing,
  onVictory,
  onGameOver: _onGameOver,
  sessionEvents,
}) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedTool, setSelectedTool] = useState('1 × 1');
  const [placedTiles, setPlacedTiles] = useState<PlacedTile[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState<'neutral' | 'good' | 'bad'>('neutral');
  const [questionOrder, setQuestionOrder] = useState<AreaQuestion[]>(() => buildQuestionDeck(levelId, null));
  const [showPracticeIntro, setShowPracticeIntro] = useState(Boolean(isPractice));
  const lastCheckedCoverageRef = useRef('');

  const question = useMemo(
    () => questionOrder[roundIndex % questionOrder.length],
    [questionOrder, roundIndex],
  );
  const tileTools = useMemo(() => floorTilesForTier(levelId), [levelId]);
  const activeTool = tileTools.find((tool) => tool.label === selectedTool) ?? tileTools[0];
  const cellSet = useMemo(() => new Set(question.cells.map((cell) => `${cell.x}-${cell.y}`)), [question.cells]);
  const coveredSet = useMemo(() => new Set(placedTiles.flatMap((tile) => tile.cells)), [placedTiles]);
  const hoveredCells = useMemo(() => {
    if (!hoveredCell) return new Set<string>();
    const [x, y] = hoveredCell.split('-').map(Number);
    return new Set(Array.from({ length: activeTool.width * activeTool.height }, (_, index) =>
      `${x + index % activeTool.width}-${y + Math.floor(index / activeTool.width)}`));
  }, [activeTool, hoveredCell]);
  const lastQuestion = questionOrder.length ? questionOrder[questionOrder.length - 1] : null;

  useEffect(() => {
    if (!questionOrder.length) return;
    if (roundIndex > 0 && roundIndex % questionOrder.length === 0) {
      setQuestionOrder(buildQuestionDeck(levelId, lastQuestion));
    }
  }, [lastQuestion, questionOrder.length, roundIndex]);

  useEffect(() => {
    setShowPracticeIntro(Boolean(isPractice));
  }, [isPractice]);

  const placeTile = (x: number, y: number) => {
    if (locked) return;
    const cells = Array.from({ length: activeTool.width * activeTool.height }, (_, index) =>
      `${x + index % activeTool.width}-${y + Math.floor(index / activeTool.width)}`);
    if (cells.some((cell) => !cellSet.has(cell) || coveredSet.has(cell))) {
      setFeedback('That tile crosses the floor edge or a tile already laid. Try another spot or tile size.');
      setFeedbackTone('bad');
      return;
    }
    setPlacedTiles((previous) => [...previous, { id: `${roundIndex}-${Date.now()}-${previous.length}`, cells, label: activeTool.label }]);
    playGameSound('place');
    setFeedback(`${activeTool.label} covers ${cells.length} square unit${cells.length === 1 ? '' : 's'}.`);
    setFeedbackTone('neutral');
  };

  const checkFloor = () => {
    if (locked) return;
    const coverageKey = `${question.id}:${[...coveredSet].sort().join(',')}`;
    if (lastCheckedCoverageRef.current === coverageKey) return;
    lastCheckedCoverageRef.current = coverageKey;
    setAttempts((prev) => prev + 1);
    const isCorrect = coveredSet.size === question.correct;
    emitMiniGameSessionEvent(sessionEvents, isCorrect ? 'correct_answer' : 'incorrect_answer', {
      metadata: { questionId: question.id, covered: coveredSet.size, target: question.correct, roundIndex },
    });

    if (isCorrect) {
      playGameSound('impact');
      setCorrectCount((prev) => prev + 1);
      setFeedback(`Floor complete: ${question.correct} square units of area.`);
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
        setPlacedTiles([]);
        setSelectedTool('1 × 1');
        setHoveredCell(null);
        setLocked(false);
        setFeedback('');
        setFeedbackTone('neutral');
      }, 700);
      return;
    }

    setFeedback(`${question.correct - coveredSet.size} square unit${question.correct - coveredSet.size === 1 ? '' : 's'} still need covering. Try a tile that fits the outline.`);
    setFeedbackTone('bad');
  };

  return (
    <GameUiShell backgroundImage={areaBackdrop} overlayDisabled>
      <PracticeIntroPopup
        open={showPracticeIntro}
        title="Area Architect"
        body="Cover every highlighted floor square with the tile sizes below. Tap a tile size, then tap where its top-left corner should go. Add the areas of your tiles; unshaded squares are outside the floor. Undo or clear whenever you need."
        briefing={practiceBriefing}
        onAction={() => setShowPracticeIntro(false)}
      />
      <div className="area-architect-content flex h-full min-h-0 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+1.1rem)] pt-3 text-white">
        <div className="area-architect-spacer flex-1" />

        <section className="mx-auto w-full max-w-[52rem] shrink-0">
          <div className="rounded-[1.6rem] border border-white/14 bg-black/28 p-3 shadow-[0_18px_34px_rgba(15,23,42,0.34)] backdrop-blur-sm">
            <div className="area-architect-board space-y-2">
              <GameQuestionCard
                title="Area Architect"
                className="area-architect-question"
                style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', width: '100%' }}
              >
                {question.prompt}
              </GameQuestionCard>

              <div className="area-architect-map rounded-[1.25rem] border border-white/10 bg-slate-950/35 p-2" data-area-board data-area-covered={coveredSet.size} data-area-target={question.correct}>
                <div
                  className="mx-auto grid w-full max-w-[20rem] gap-1 rounded-[1rem] border border-white/10 bg-slate-900/20 p-2"
                  style={{ gridTemplateColumns: `repeat(${question.gridSize}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: question.gridSize * question.gridSize }).map((_, index) => {
                    const x = (index % question.gridSize) + 1;
                    const y = Math.floor(index / question.gridSize) + 1;
                    const key = `${x}-${y}`;
                    const filled = cellSet.has(key);
                    const covered = coveredSet.has(key);
                    const preview = hoveredCells.has(key) && filled && !covered;
                    return (
                      <button
                        type="button"
                        key={key}
                        onMouseEnter={() => setHoveredCell(key)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onFocus={() => setHoveredCell(key)}
                        onBlur={() => setHoveredCell(null)}
                        onClick={() => placeTile(x, y)}
                        disabled={!filled || locked}
                        aria-label={`Row ${y}, column ${x}: ${!filled ? 'outside floor' : covered ? 'covered' : 'empty floor square'}`}
                        className={`area-architect-cell aspect-square rounded-[0.22rem] border ${
                          covered ? 'border-cyan-100 bg-cyan-400 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.3)]'
                            : preview ? 'border-white bg-cyan-300/55'
                              : filled ? 'border-amber-200/80 bg-amber-300/45' : 'border-white/10 bg-slate-900/50'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <section className="area-architect-controls answer-choice-surface" aria-label="Floor tiles and tools">
                <div className="area-architect-tool-list">
                  {tileTools.map((tool) => <motion.button
                    key={tool.label}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedTool(tool.label); setFeedback(''); }}
                    disabled={locked}
                    aria-pressed={activeTool.label === tool.label}
                    className={`area-architect-tool ${activeTool.label === tool.label ? 'ui-button-primary' : 'ui-button-secondary'}`}
                  >{tool.label}<small>{tool.width * tool.height} sq</small></motion.button>)}
                </div>
                <div className="area-architect-actions">
                  <strong aria-live="polite">Laid {coveredSet.size} square unit{coveredSet.size === 1 ? '' : 's'}</strong>
                  <button type="button" className="ui-button-secondary" onClick={() => setPlacedTiles((previous) => previous.slice(0, -1))} disabled={locked || placedTiles.length === 0}>Undo</button>
                  <button type="button" className="ui-button-secondary" onClick={() => setPlacedTiles([])} disabled={locked || placedTiles.length === 0}>Clear</button>
                  <button type="button" className="ui-button-primary" onClick={checkFloor} disabled={locked}>Check floor</button>
                </div>
              </section>

              {feedback ? <div className="area-architect-feedback">
                <FeedbackStrip tone={feedbackTone === 'good' ? 'success' : feedbackTone === 'bad' ? 'warning' : 'neutral'}>
                  {feedback}
                </FeedbackStrip>
              </div> : null}
            </div>
          </div>
        </section>
      </div>
    </GameUiShell>
  );
};

export default AreaArchitectGame;
