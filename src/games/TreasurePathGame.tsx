import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { Coins } from '../components/GameIcons';
import { GameScreenShell, PuzzleStage } from '../layout/ScreenPrimitives';

interface TreasurePathGameProps {
  levelId: number;
  avatarId: string;
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

const GRID_SIZE = 5;

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
    promptTitle: 'Follow The Route',
    promptText: `Start at (${start.x}, ${start.y}). ${instructions.join('. ')}.`,
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
      promptTitle: 'Find The Treasure',
      promptText: `Move the explorer to (${target.x}, ${target.y}).`,
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
  avatarId: _avatarId,
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
    <GameScreenShell className="overflow-hidden">
      <GameplaySceneBackdrop gameType="coordinate_quest" />

      <div className="relative z-10 mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-2 pb-[calc(env(safe-area-inset-bottom)+2.1rem)] pt-[calc(env(safe-area-inset-top)+4.8rem)] md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+2.35rem)] md:pt-[calc(env(safe-area-inset-top)+5.1rem)]">
        <PuzzleStage className="w-full min-h-0 flex-1 rounded-[1.7rem] p-2 md:rounded-[2rem] md:p-3">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(74,222,128,0.18),transparent_24%),radial-gradient(circle_at_82%_30%,rgba(56,189,248,0.14),transparent_20%),linear-gradient(180deg,rgba(8,15,30,0.12),rgba(8,15,30,0.34))]" />

          <div className="relative z-10 mb-2">
            <div className="licensed-game-card w-full px-4 py-3 md:px-5 md:py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/72">Coordinate Quest</div>
              <div className="mt-1 text-[1.35rem] font-black leading-none text-white md:text-[1.8rem]">{round.promptTitle}</div>
              <div className="mt-2 text-xs font-bold text-white/78 md:text-sm">{round.promptText}</div>
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pr-0.5 md:gap-3 md:pr-0">
            <div className="licensed-game-card-dark relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] p-2.5 md:rounded-[1.75rem] md:p-4">
              <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(8,15,11,0.55))]" />
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/62">Grid map</div>

              <div className="mx-auto grid w-full max-w-[23rem] grid-cols-[1.2rem_repeat(5,minmax(0,1fr))] gap-1.5 md:max-w-[26rem] md:grid-cols-[1.5rem_repeat(5,minmax(0,1fr))] md:gap-2">
                <div />
                {[1, 2, 3, 4, 5].map((value) => (
                  <div key={`top-${value}`} className="text-center text-[11px] font-black text-emerald-100/62 md:text-xs">
                    {value}
                  </div>
                ))}

                {[5, 4, 3, 2, 1].map((rowValue) => (
                  <React.Fragment key={`row-${rowValue}`}>
                    <div className="flex items-center justify-center text-[11px] font-black text-emerald-100/62 md:text-xs">
                      {rowValue}
                    </div>
                    {Array.from({ length: 5 }, (_, index) => {
                      const x = index + 1;
                      const y = rowValue;
                      const key = coordinateKey(x, y);
                      const isStart = x === round.start.x && y === round.start.y;
                      const isSelected = selectedTile === key;

                      return (
                        <button
                          key={key}
                          onClick={() => handleTileTap(x, y)}
                          disabled={!!feedback}
                          className={`relative aspect-square rounded-[0.82rem] border text-left transition-all md:rounded-[1rem] ${
                            isSelected
                              ? feedback === 'correct'
                                ? 'border-emerald-300 bg-emerald-400/30'
                                : 'border-rose-300 bg-rose-500/26'
                              : 'border-white/10 bg-[linear-gradient(180deg,rgba(103,162,90,0.34),rgba(50,91,53,0.6))] hover:-translate-y-0.5 hover:border-emerald-200/30'
                          }`}
                        >
                          <div className="absolute inset-[10%] rounded-[0.8rem] border border-black/8 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.08))]" />
                          {isStart && (
                            <motion.div
                              layout
                              className="absolute inset-x-[24%] bottom-[18%] flex h-[42%] items-center justify-center rounded-[0.8rem] border border-white/12 bg-[linear-gradient(180deg,#f59e0b,#c2410c)] text-[11px] font-black text-white shadow-[0_10px_20px_rgba(0,0,0,0.24)]"
                            >
                              You
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
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
                    : 'border-rose-300/60 bg-rose-500/16 text-rose-300'
                }`}>
                  <div className="text-4xl font-black">{feedback === 'correct' ? 'Treasure Found!' : 'Trap Triggered!'}</div>
                  <div className="mt-2 text-sm font-bold text-white/82">
                    {feedback === 'correct' ? 'Your route was perfect.' : 'That tile was not the final destination.'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </PuzzleStage>

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md"
            >
              <div className="licensed-overlay-card flex w-full max-w-md flex-col items-center gap-6 p-8 text-center md:p-10">
                <div className={`text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isVictory ? 'Path Cleared!' : 'Expedition Lost!'}
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

