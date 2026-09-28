import React, { useEffect, useMemo, useState } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Coins } from '../components/GameIcons';
import AssetIcon from '../components/AssetIcon';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import coordinateQuestBackground from '../assets/maps/premium/coordinates-quest.webp';
import { emitMiniGameSessionEvent, MiniGameShellContractProps } from '../app/gameplaySessionContract';

interface TreasurePathGameProps extends MiniGameShellContractProps {
  levelId: number;
  avatarId: string;
  gameTitle?: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

interface GridCell {
  x: number;
  y: number;
  trap: boolean;
}

interface TreasureRound {
  promptTitle: string;
  promptText: string;
  promptType: 'coordinate' | 'movement';
  start: { x: number; y: number };
  target: { x: number; y: number };
  traps: string[];
}

const randomInt = (max: number) => Math.floor(Math.random() * max) + 1;

const coordinateKey = (x: number, y: number) => `${x}-${y}`;

const buildMovementRound = (gridSize: number, difficulty: number) => {
  const start = { x: randomInt(gridSize), y: randomInt(gridSize) };
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
      return nextX >= 1 && nextX <= gridSize && nextY >= 1 && nextY <= gridSize;
    });

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    target = { x: target.x + move.dx * distance, y: target.y + move.dy * distance };
    instructions.push(`Move ${distance} ${move.label}`);
  }

  return {
    promptTitle: 'Marker Recovery',
    promptText: `Start at (${start.x}, ${start.y}). ${instructions.join('. ')}. Tap your finishing point.`,
    promptType: 'movement' as const,
    start,
    target,
  };
};

const generateRound = (gridSize: number, difficulty: number, translation: boolean): TreasureRound => {
  const directMode = !translation && (difficulty === 1 || Math.random() > (difficulty >= 4 ? 0.8 : 0.4));

  if (directMode) {
    const target = { x: randomInt(gridSize), y: randomInt(gridSize) };
    const start = { x: randomInt(gridSize), y: randomInt(gridSize) };

    return {
      promptTitle: 'Route Recovery',
      promptText: `Tap (${target.x}, ${target.y}) to restore the route. Read x across first, then y up.`,
      promptType: 'coordinate',
      start,
      target,
      traps: [],
    };
  }

  const movement = buildMovementRound(gridSize, difficulty);
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
  const gridSize = difficulty <= 2 ? 5 : difficulty === 3 ? 6 : 7;
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

  const playerAvatar = useMemo(() => (
    CHARACTER_AVATARS.find((avatar) => avatar.id === avatarId)
    || CHARACTER_AVATARS.find((avatar) => avatar.id === DEFAULT_AVATAR_ID)
    || CHARACTER_AVATARS[0]
  ), [avatarId]);

  const targetScore = 950 + levelId * 100;

  const cells: GridCell[] = useMemo(() => {
    const entries: GridCell[] = [];
    for (let y = gridSize; y >= 1; y -= 1) {
      for (let x = 1; x <= gridSize; x += 1) {
        entries.push({
          x,
          y,
          trap: round.traps.includes(coordinateKey(x, y)),
        });
      }
    }
    return entries;
  }, [gridSize, round.traps]);

  useEffect(() => {
    endedRef.current = false;
    answerLockedRef.current = false;
    attemptsRef.current = 0;
    correctRef.current = 0;
    clearTimers();
    setScore(0);
    setTimeLeft(115 + levelId * 6);
    setRoundIndex(0);
    setRound(generateRound(gridSize, difficulty, translation));
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
    setRound(generateRound(gridSize, difficulty, translation));
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

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+3.6rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.35rem)] md:pt-[calc(env(safe-area-inset-top)+3.9rem)]">
        <div className="relative z-10 mb-2">
          <GameQuestionCard
            title={gameTitle || 'Coordinates Quest'}
            subtitle={round.promptText}
            bodyClassName="mt-1 text-[1.35rem] font-black leading-none text-white md:text-[1.8rem]"
          >
            {round.promptTitle}
          </GameQuestionCard>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <div className="relative flex aspect-square w-full max-w-[26.5rem] flex-col rounded-[1.5rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(8,22,52,0.84),rgba(7,18,43,0.92))] p-3 shadow-[0_18px_36px_rgba(2,6,23,0.4)]" role="group" aria-label="Coordinate grid">
            <div className="mb-2 flex items-end gap-2 text-[10px] font-black text-cyan-100">
              <div className="w-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-center uppercase tracking-[0.22em]">x-axis</div>
                <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }} aria-label={`X coordinates increase from 1 to ${gridSize}`}>
                  {Array.from({ length: gridSize }, (_, index) => <span key={index + 1}>{index + 1}</span>)}
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 items-stretch gap-2">
              <div className="flex w-8 shrink-0 items-stretch gap-1 text-[10px] font-black text-cyan-100">
                <div className="flex w-3 items-center justify-center">
                  <span className="-rotate-90 whitespace-nowrap uppercase tracking-[0.22em]">y-axis</span>
                </div>
                <div className="grid min-h-0 flex-1 text-center" style={{ gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` }} aria-label={`Y coordinates increase from 1 at the bottom to ${gridSize} at the top`}>
                  {Array.from({ length: gridSize }, (_, index) => <span key={gridSize - index} className="flex items-center justify-center">{gridSize - index}</span>)}
                </div>
              </div>
              <div className="relative min-h-0 flex-1 rounded-[1.2rem] border border-cyan-100/14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[1.2rem]"
                  style={{
                    backgroundImage: [
                      'linear-gradient(to right, rgba(191,219,254,0.38) 1px, transparent 1px)',
                      'linear-gradient(to bottom, rgba(191,219,254,0.38) 1px, transparent 1px)',
                    ].join(', '),
                    backgroundSize: `calc(100% / ${gridSize}) calc(100% / ${gridSize})`,
                    backgroundPosition: '0 0',
                  }}
                />
                <div className="absolute inset-0 z-10 grid overflow-hidden rounded-[1.2rem]" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {cells.map((cell) => {
                const key = coordinateKey(cell.x, cell.y);
                const isStart = cell.x === round.start.x && cell.y === round.start.y;
                const isSelected = selectedTile === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleTileTap(cell.x, cell.y)}
                    disabled={!!feedback}
                    aria-label={`Marker at x=${cell.x}, y=${cell.y}${isStart ? ', current explorer position' : ''}`}
                    className={`relative border text-left transition-all ${
                      isSelected
                        ? feedback === 'correct'
                          ? 'border-emerald-300 bg-emerald-400/30'
                          : 'border-rose-300 bg-rose-500/26'
                        : 'border-cyan-100/12 bg-transparent hover:bg-white/10'
                    }`}
                  >
                    {isStart && (
                      <motion.div
                        layout
                        className="absolute left-1/2 top-1/2 flex h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-white/22 bg-[linear-gradient(180deg,rgba(245,158,11,0.95),rgba(194,65,12,0.95))] shadow-[0_10px_20px_rgba(0,0,0,0.24)]"
                      >
                        {playerAvatar?.image ? (
                          <img
                            src={playerAvatar.image}
                            alt=""
                            draggable={false}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-black text-white">You</span>
                        )}
                      </motion.div>
                    )}
                  </button>
                );
              })}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/18 backdrop-blur-[2px]"
                >
                  <div className={`rounded-[2rem] border px-8 py-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.34)] ${
                    feedback === 'correct'
                      ? 'border-emerald-300/60 bg-emerald-500/16 text-emerald-300'
                      : 'border-rose-300/60 bg-rose-500/16 text-amber-300'
                  }`}>
                    <div className="text-4xl font-black">{feedback === 'correct' ? 'Route Restored!' : 'Wrong Marker!'}</div>
                    <div className="mt-2 text-sm font-bold text-white/82">
                      {feedback === 'correct' ? 'You found the correct marker.' : 'That was not the correct route tile.'}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/54">Final XP</div>
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


