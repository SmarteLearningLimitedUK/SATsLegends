import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Coins } from '../components/GameIcons';
import AssetIcon from '../components/AssetIcon';
import { GameScreenShell } from '../layout/ScreenPrimitives';
import { GameQuestionCard } from '../components/game-ui/GameUiKit';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import coordinateQuestBackground from '../assets/maps/backgroundsforgames/coordinate quest.jpg';

interface TreasurePathGameProps {
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

const GRID_SIZE = 7;
const randomInt = (max: number) => Math.floor(Math.random() * max) + 1;

const coordinateKey = (x: number, y: number) => `${x}-${y}`;

const buildMovementRound = () => {
  let current = { x: randomInt(GRID_SIZE), y: randomInt(GRID_SIZE) };
  const steps: string[] = [];

  const moves = [
    { label: 'right', dx: 1, dy: 0 },
    { label: 'left', dx: -1, dy: 0 },
    { label: 'up', dx: 0, dy: 1 },
    { label: 'down', dx: 0, dy: -1 },
  ];

  for (let index = 0; index < 2; index += 1) {
    const validMoves = moves.filter((move) => {
      const nextX = current.x + move.dx;
      const nextY = current.y + move.dy;
      return nextX >= 1 && nextX <= GRID_SIZE && nextY >= 1 && nextY <= GRID_SIZE;
    });

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    current = { x: current.x + move.dx, y: current.y + move.dy };
    steps.push(`Move 1 ${move.label}`);
  }

  const start = { x: current.x, y: current.y };

  const followMoves = [
    { label: 'right', dx: 1, dy: 0 },
    { label: 'left', dx: -1, dy: 0 },
    { label: 'up', dx: 0, dy: 1 },
    { label: 'down', dx: 0, dy: -1 },
  ];

  let target = { ...start };
  const instructions: string[] = [];

  for (let index = 0; index < 2; index += 1) {
    const validMoves = followMoves.filter((move) => {
      const nextX = target.x + move.dx;
      const nextY = target.y + move.dy;
      return nextX >= 1 && nextX <= GRID_SIZE && nextY >= 1 && nextY <= GRID_SIZE;
    });

    const move = validMoves[Math.floor(Math.random() * validMoves.length)];
    target = { x: target.x + move.dx, y: target.y + move.dy };
    instructions.push(`Move 1 ${move.label}`);
  }

  return {
    promptTitle: 'Marker Recovery',
    promptText: `The Monster Minds have hidden the correct route. X axis runs left to right. Y axis runs bottom to top. Start at (x=${start.x}, y=${start.y}). ${instructions.join('. ')}.`,
    promptType: 'movement' as const,
    start,
    target,
  };
};

const generateRound = (): TreasureRound => {
  const directMode = Math.random() > 0.4;

  if (directMode) {
    let target = { x: randomInt(GRID_SIZE), y: randomInt(GRID_SIZE) };
    const start = { x: randomInt(GRID_SIZE), y: randomInt(GRID_SIZE) };

    return {
      promptTitle: 'Route Recovery',
      promptText: `The Monster Minds have scrambled the route markers. X axis runs left to right. Y axis runs bottom to top. Move the explorer to (x=${target.x}, y=${target.y}) to restore the path.`,
      promptType: 'coordinate',
      start,
      target,
      traps: [],
    };
  }

  const movement = buildMovementRound();
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
}) => {
  const [XP, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(115);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState<TreasureRound>(() => generateRound());
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [lives, setLives] = useState(3);
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
    for (let y = GRID_SIZE; y >= 1; y -= 1) {
      for (let x = 1; x <= GRID_SIZE; x += 1) {
        entries.push({
          x,
          y,
          trap: round.traps.includes(coordinateKey(x, y)),
        });
      }
    }
    return entries;
  }, [round.traps]);

  useEffect(() => {
    setScore(0);
    setTimeLeft(115 + levelId * 6);
    setRoundIndex(0);
    setRound(generateRound());
    setFeedback(null);
    setLives(3);
    setIsGameOver(false);
    setIsVictory(false);
    setSelectedTile(null);
  }, [levelId]);

  useEffect(() => {
    if (isGameOver || isVictory || feedback) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          if (XP >= targetScore) {
            const stars = XP >= targetScore * 1.7 ? 3 : XP >= targetScore * 1.25 ? 2 : 1;
            setIsVictory(true);
            onVictory(stars, XP);
            return 0;
          }

          setIsGameOver(true);
          onGameOver(XP);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [feedback, isGameOver, isVictory, onGameOver, onVictory, XP, targetScore]);

  const handleAdvance = (nextScore: number, nextRoundIndex: number) => {
    if (nextRoundIndex >= 7 || nextScore >= targetScore) {
      const stars = nextScore >= targetScore * 1.7 ? 3 : nextScore >= targetScore * 1.25 ? 2 : 1;
      setIsVictory(true);
      onVictory(stars, nextScore);
      return;
    }

    setRoundIndex(nextRoundIndex);
    setRound(generateRound());
    setSelectedTile(null);
    setFeedback(null);
  };

  const handleTileTap = (x: number, y: number) => {
    if (feedback) return;

    const key = coordinateKey(x, y);
    setSelectedTile(key);

    if (x === round.target.x && y === round.target.y) {
      const nextScore = XP + 150 + Math.max(0, timeLeft);
      const nextRoundIndex = roundIndex + 1;

      setFeedback('correct');
      setScore(nextScore);
      confetti({
        particleCount: 55,
        spread: 52,
        origin: { y: 0.62 },
        colors: ['#fde047', '#4ade80', '#38bdf8'],
      });

      window.setTimeout(() => handleAdvance(nextScore, nextRoundIndex), 1100);
      return;
    }

    const remainingLives = lives - 1;
    setFeedback('incorrect');
    setLives(remainingLives);
    setScore((previous) => Math.max(0, previous - 35));

    if (remainingLives <= 0) {
      window.setTimeout(() => {
        setIsGameOver(true);
        onGameOver(Math.max(0, XP - 35));
      }, 700);
      return;
    }

    window.setTimeout(() => {
      setFeedback(null);
      setSelectedTile(null);
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
          <div className="relative flex aspect-square w-[min(74vw,26.5rem)] flex-col rounded-[1.5rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(8,22,52,0.84),rgba(7,18,43,0.92))] p-3 shadow-[0_18px_36px_rgba(2,6,23,0.4)]">
            <div className="mb-2 flex items-center justify-start px-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">
              <span>x-axis</span>
            </div>
            <div className="flex min-h-0 flex-1 items-stretch gap-2">
              <div className="flex w-6 items-center justify-center">
                <div className="-rotate-90 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">
                  y-axis
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
                    backgroundSize: 'calc(100% / 7) calc(100% / 7)',
                    backgroundPosition: '0 0',
                  }}
                />
                <div className="absolute inset-0 z-10 grid grid-cols-7 grid-rows-7 overflow-hidden rounded-[1.2rem]">
              {cells.map((cell) => {
                const key = coordinateKey(cell.x, cell.y);
                const isStart = cell.x === round.start.x && cell.y === round.start.y;
                const isSelected = selectedTile === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleTileTap(cell.x, cell.y)}
                    disabled={!!feedback}
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
                            className="h-full w-full object-cover"
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


