import React, { useEffect, useState } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Coins } from '../components/GameIcons';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import coordinateQuestBackground from '../assets/maps/premium/coordinates-quest.webp';
import './coordinates-quest.css';
import CoordinateGrid from './CoordinateGrid';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface TreasurePathGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  gameTitle?: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface TreasureRound {
  promptTitle: string;
  promptText: string;
  promptType: 'coordinate' | 'movement' | 'reflection';
  start: { x: number; y: number };
  target: { x: number; y: number };
  traps: string[];
}

const randomInt = (max: number) => Math.floor(Math.random() * max) + 1;
const randomBetween = (minimum: number, maximum: number) => minimum + Math.floor(Math.random() * (maximum - minimum + 1));

const coordinateKey = (x: number, y: number) => `${x}-${y}`;

const buildMovementRound = (minimum: number, maximum: number, difficulty: number) => {
  const start = { x: randomBetween(minimum, maximum), y: randomBetween(minimum, maximum) };
  const moves = [
    { label: 'right', dx: 1, dy: 0 },
    { label: 'left', dx: -1, dy: 0 },
    { label: 'up', dx: 0, dy: 1 },
    { label: 'down', dx: 0, dy: -1 },
  ];

  let target = { ...start };
  const instructions: string[] = [];

  const stepCount = difficulty <= 2 ? 1 : difficulty === 3 ? 2 : 3;
  for (let index = 0; index < stepCount; index += 1) {
    const distance = difficulty === 5 ? randomInt(2) : 1;
    const validMoves = moves.filter((move) => {
      const nextX = target.x + move.dx * distance;
      const nextY = target.y + move.dy * distance;
      return nextX >= minimum && nextX <= maximum && nextY >= minimum && nextY <= maximum;
    });

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    target = { x: target.x + move.dx * distance, y: target.y + move.dy * distance };
    instructions.push(`Move ${distance} ${move.label}`);
  }

  return {
    promptTitle: 'Marker Recovery',
    promptText: `Start at (${start.x}, ${start.y}). ${instructions.join('. ')}. Select your finishing point.`,
    promptType: 'movement' as const,
    start,
    target,
  };
};

const generateRound = (gridSize: number, difficulty: number, translation: boolean, roundIndex = 0): TreasureRound => {
  const minimum = difficulty >= 3 ? -Math.floor(gridSize / 2) : 1;
  const maximum = minimum + gridSize - 1;
  if (difficulty === 5 && roundIndex % 3 === 2) {
    const axis = roundIndex % 2 === 0 ? 'y' : 'x';
    const start = { x: randomBetween(minimum, maximum), y: randomBetween(minimum, maximum) };
    // A point on the mirror line would not move, so keep the changing coordinate nonzero.
    if (axis === 'y' && start.x === 0) start.x = 2;
    if (axis === 'x' && start.y === 0) start.y = -2;
    return {
      promptTitle: 'Mirror Route',
      promptText: `Reflect (${start.x}, ${start.y}) in the ${axis}-axis. Select its reflected position. The ${axis === 'y' ? 'x' : 'y'} sign changes.`,
      promptType: 'reflection',
      start,
      target: axis === 'y' ? { x: -start.x, y: start.y } : { x: start.x, y: -start.y },
      traps: [],
    };
  }
  const directMode = !translation && (difficulty === 1 || Math.random() > (difficulty >= 4 ? 0.8 : 0.4));

  if (directMode) {
    const target = { x: randomBetween(minimum, maximum), y: randomBetween(minimum, maximum) };
    const start = { x: randomBetween(minimum, maximum), y: randomBetween(minimum, maximum) };

    return {
      promptTitle: 'Route Recovery',
      promptText: `Select the point (${target.x}, ${target.y}). Read x across first${minimum < 0 ? ' (left of zero is negative)' : ''}, then y up${minimum < 0 ? ' (below zero is negative)' : ''}.`,
      promptType: 'coordinate',
      start,
      target,
      traps: [],
    };
  }

  const movement = buildMovementRound(minimum, maximum, difficulty);
  return {
    ...movement,
    traps: [],
  };
};

const TreasurePathGame: React.FC<TreasurePathGameProps> = ({
  levelId,
  avatarId,
  gameTitle,
  onVictory,
  onGameOver,
  onBack,
  isPractice,
  sessionState,
  sessionEvents,
}) => {
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;
  const timersRef = useRef(new Set<number>());
  const endedRef = useRef(false);
  const answerLockedRef = useRef(false);
  const attemptsRef = useRef(0);
  const correctRef = useRef(0);
  const performanceStars = () => {
    const accuracy = correctRef.current / Math.max(1, attemptsRef.current);
    return accuracy >= .9 ? 3 : accuracy >= .7 ? 2 : 1;
  };
  const clearTimers = () => { timersRef.current.forEach(window.clearTimeout); timersRef.current.clear(); };
  const queueTimeout = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id);
      if (presentRef.current && !endedRef.current) callback();
    }, delay);
    timersRef.current.add(id);
  };
  useLayoutEffect(() => { if (!isPresent) { endedRef.current = true; clearTimers(); } }, [isPresent]);
  useEffect(() => () => { endedRef.current = true; clearTimers(); }, []);
  const difficulty = Math.max(1, Math.min(5, levelId));
  const gridSize = difficulty <= 2 ? 5 : 7;
  const minimumCoordinate = difficulty <= 2 ? 1 : -3;
  const maximumCoordinate = minimumCoordinate + gridSize - 1;
  const translation = Boolean(gameTitle?.toLowerCase().includes('translation'));
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(115);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<TreasureRound>(() => generateRound(gridSize, difficulty, translation));
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [localLives, setLocalLives] = useState(3);
  const usesSharedLives = Boolean(sessionState && !isPractice);
  const lives = usesSharedLives ? sessionState!.lives : localLives;
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  const targetScore = 950 + levelId * 100;

  useEffect(() => {
    endedRef.current = false;
    answerLockedRef.current = false;
    attemptsRef.current = 0;
    correctRef.current = 0;
    clearTimers();
    setScore(0);
    setTimeLeft(115 + levelId * 6);
    setRoundIndex(0);
    setRound(generateRound(gridSize, difficulty, translation, 0));
    setFeedback(null);
    setLocalLives(3);
    setIsGameOver(false);
    setIsVictory(false);
    setSelectedTile(null);
  }, [difficulty, gridSize, levelId, translation]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback || isPractice || sessionState?.paused || !isPresent) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          if (endedRef.current) return 0;
          endedRef.current = true;
          if (XP >= targetScore) {
            const stars = performanceStars();
            setIsVictory(true);
            emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: XP, stars });
            onVictory(stars, XP);
            return 0;
          }

          setIsGameOver(true);
          emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: XP, reason: 'time' });
          onGameOver(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [feedback, isGameOver, isPresent, isPractice, isVictory, onGameOver, onVictory, sessionEvents, sessionState?.paused, XP, targetScore]);

  const handleAdvance = (nextScore: number, nextRoundIndex: number) => {
    if (endedRef.current || !presentRef.current) return;
    if (nextRoundIndex >= 7 || nextScore >= targetScore) {
      endedRef.current = true;
      const stars = performanceStars();
      setIsVictory(true);
      emitMiniGameSessionEvent(sessionEvents, 'game_complete', { score: nextScore, stars });
      onVictory(stars, nextScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(generateRound(gridSize, difficulty, translation, nextRoundIndex));
    setSelectedTile(null);
    setFeedback(null);
    answerLockedRef.current = false;
  };

  const handleTileTap = (x: number, y: number) => {
    if (feedback || answerLockedRef.current || endedRef.current || !isPresent || sessionState?.paused) return;
    answerLockedRef.current = true;
    attemptsRef.current += 1;

    const key = coordinateKey(x, y);
    setSelectedTile(key);

    if (x === round.target.x && y === round.target.y) {
      correctRef.current += 1;
      const nextScore = XP + 150 + Math.max(0, timeLeft);
      const nextRoundIndex = roundIndex + 1;

      setFeedback('correct');
      setScore(nextScore);
      emitMiniGameSessionEvent(sessionEvents, 'correct_answer', { metadata: { x, y } });
      emitMiniGameSessionEvent(sessionEvents, 'puzzle_complete');
      if (!reducedMotion) confetti({
        particleCount: 55,
        spread: 52,
        origin: { y: 0.62 },
        colors: ['#fde047', '#4ade80', '#38bdf8'],
      });

      queueTimeout(() => handleAdvance(nextScore, nextRoundIndex), 1100);
      return;
    }

    const remainingLives = lives - 1;
    emitMiniGameSessionEvent(sessionEvents, 'incorrect_answer', { metadata: { x, y } });
    setFeedback('incorrect');
    if (!usesSharedLives && !isPractice) setLocalLives(remainingLives);
    setScore((previous) => Math.max(0, previous - 35));

    if (!isPractice && remainingLives <= 0) {
      queueTimeout(() => {
        endedRef.current = true;
        setIsGameOver(true);
        if (!usesSharedLives) {
          emitMiniGameSessionEvent(sessionEvents, 'game_failed', { score: Math.max(0, XP - 35), reason: 'lives' });
          onGameOver(Math.max(0, XP - 35));
        }
      }, 700);
      return;
    }

    queueTimeout(() => {
      setFeedback(null);
      setSelectedTile(null);
      answerLockedRef.current = false;
    }, 800);
  };

  return (
    <GameScreenShell backgroundImage={coordinateQuestBackground} className="overflow-hidden">

      <div className="coordinates-quest-layout relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+3.6rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.35rem)] md:pt-[calc(env(safe-area-inset-top)+3.9rem)]">
        <div className="relative z-10 mb-2">
          <GameQuestionCard
            title={gameTitle || 'Coordinates Quest'} context=""
            style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', transform: 'none', width: '100%' }}
            subtitle={round.promptText}
            bodyClassName="mt-1 text-[1.35rem] font-black leading-none text-white md:text-[1.8rem]"
          >
            {round.promptTitle}
          </GameQuestionCard>
          <div className="coordinate-result" data-coordinate-feedback={feedback || 'idle'} role="status" aria-live="polite">
            {feedback === 'correct' ? 'Correct point!' : feedback === 'incorrect' ? 'Try another intersection.' : ''}
          </div>
        </div>

        <div className="coordinate-board-space relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
          <CoordinateGrid minimum={minimumCoordinate} maximum={maximumCoordinate} start={round.start}
            selected={selectedTile} feedback={feedback} onSelect={handleTileTap} />

        </div>

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md"
            >
              <div className="licensed-overlay-card relative flex w-full max-w-md flex-col items-center gap-6 p-8 text-center md:p-10">
                <button
                  type="button"
                  onClick={onBack}
                  className="ui-close-button absolute right-4 top-4 z-20"
                  aria-label="Close result"
                >
                  <span aria-hidden="true">Ã—</span>
                </button>

                <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {isVictory ? 'Route Restored!' : 'Route Lost!'}
                </div>
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.24em] text-white/54">Final XP</div>
                  <div className="mt-2 text-5xl font-black text-white">{XP}</div>
                </div>
                <button
                  onClick={onBack}
                  className="ui-button-primary licensed-submit-button flex w-full items-center justify-center gap-2 py-4 text-lg font-black uppercase tracking-[0.14em] text-white"
                >
                  <Coins className="h-5 w-5" />
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameScreenShell>
  );
};

export default TreasurePathGame;


