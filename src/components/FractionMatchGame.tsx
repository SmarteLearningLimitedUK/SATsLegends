import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import GameplayHUD from './GameplayHUD';
import AssetIcon from './AssetIcon';
import { Star } from './GameIcons';
import { FRACTION_MATCH_ASSETS } from '../assets/fraction_match';

interface FractionMatchGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface TileFamily {
  id: string;
  labels: string[];
  asset: string;
  glow: string;
}

interface TileData {
  id: string;
  familyId: string;
  label: string;
  asset: string;
  row: number;
  col: number;
}

interface TilePosition {
  row: number;
  col: number;
}

const ROWS = 8;
const COLS = 10;
const LEVEL_TARGET_BASE = 1400;
const LEVEL_TARGET_STEP = 240;
const LEVEL_TIME_BASE = 85;
const LEVEL_TIME_STEP = 8;
const MATCH_DELAY_MS = 180;

const TILE_FAMILIES: TileFamily[] = [
  { id: 'half', labels: ['1/2', '0.5', '2/4', '0.50'], asset: FRACTION_MATCH_ASSETS.tiles.ember, glow: 'shadow-[0_0_24px_rgba(249,115,22,0.38)]' },
  { id: 'quarter', labels: ['1/4', '0.25', '2/8'], asset: FRACTION_MATCH_ASSETS.tiles.sapphire, glow: 'shadow-[0_0_24px_rgba(59,130,246,0.38)]' },
  { id: 'three-quarters', labels: ['3/4', '0.75', '6/8'], asset: FRACTION_MATCH_ASSETS.tiles.emerald, glow: 'shadow-[0_0_24px_rgba(34,197,94,0.36)]' },
  { id: 'fifth', labels: ['1/5', '0.2', '2/10'], asset: FRACTION_MATCH_ASSETS.tiles.violet, glow: 'shadow-[0_0_24px_rgba(192,132,252,0.36)]' },
  { id: 'two-fifths', labels: ['2/5', '0.4', '4/10'], asset: FRACTION_MATCH_ASSETS.tiles.gold, glow: 'shadow-[0_0_24px_rgba(250,204,21,0.38)]' },
  { id: 'tenth', labels: ['1/10', '0.1', '10/100'], asset: FRACTION_MATCH_ASSETS.tiles.storm, glow: 'shadow-[0_0_24px_rgba(167,139,250,0.36)]' },
  { id: 'three-tenths', labels: ['3/10', '0.3', '30/100'], asset: FRACTION_MATCH_ASSETS.tiles.plasma, glow: 'shadow-[0_0_24px_rgba(236,72,153,0.34)]' },
  { id: 'eighth', labels: ['1/8', '0.125', '2/16'], asset: FRACTION_MATCH_ASSETS.tiles.azure, glow: 'shadow-[0_0_24px_rgba(56,189,248,0.34)]' },
];

const createId = () => Math.random().toString(36).slice(2, 11);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const areAdjacent = (first: TilePosition, second: TilePosition) => (
  Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1
);

const tileKey = (row: number, col: number) => `${row}-${col}`;

const getFamily = (familyId: string) => TILE_FAMILIES.find(family => family.id === familyId) || TILE_FAMILIES[0];

const createTile = (familyId: string, row: number, col: number): TileData => {
  const family = getFamily(familyId);
  const label = family.labels[Math.floor(Math.random() * family.labels.length)];

  return {
    id: createId(),
    familyId,
    label,
    asset: family.asset,
    row,
    col,
  };
};

const cloneBoard = (board: TileData[][]) => board.map(row => row.map(tile => ({ ...tile })));

const swapTiles = (board: TileData[][], first: TilePosition, second: TilePosition) => {
  const nextBoard = cloneBoard(board);
  const firstTile = { ...nextBoard[first.row][first.col], row: second.row, col: second.col };
  const secondTile = { ...nextBoard[second.row][second.col], row: first.row, col: first.col };
  nextBoard[first.row][first.col] = secondTile;
  nextBoard[second.row][second.col] = firstTile;
  return nextBoard;
};

const findMatches = (board: TileData[][]) => {
  const matches = new Set<string>();

  for (let row = 0; row < ROWS; row += 1) {
    let runStart = 0;
    while (runStart < COLS) {
      let runEnd = runStart + 1;
      while (runEnd < COLS && board[row][runEnd].familyId === board[row][runStart].familyId) {
        runEnd += 1;
      }
      if (runEnd - runStart >= 3) {
        for (let col = runStart; col < runEnd; col += 1) {
          matches.add(tileKey(row, col));
        }
      }
      runStart = runEnd;
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    let runStart = 0;
    while (runStart < ROWS) {
      let runEnd = runStart + 1;
      while (runEnd < ROWS && board[runEnd][col].familyId === board[runStart][col].familyId) {
        runEnd += 1;
      }
      if (runEnd - runStart >= 3) {
        for (let row = runStart; row < runEnd; row += 1) {
          matches.add(tileKey(row, col));
        }
      }
      runStart = runEnd;
    }
  }

  return matches;
};

const wouldCreateInitialMatch = (board: TileData[][], row: number, col: number, familyId: string) => {
  if (col >= 2 && board[row][col - 1].familyId === familyId && board[row][col - 2].familyId === familyId) {
    return true;
  }
  if (row >= 2 && board[row - 1][col].familyId === familyId && board[row - 2][col].familyId === familyId) {
    return true;
  }
  return false;
};

const hasPossibleMove = (board: TileData[][]) => {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const current = { row, col };
      if (col < COLS - 1) {
        const swapped = swapTiles(board, current, { row, col: col + 1 });
        if (findMatches(swapped).size > 0) return true;
      }
      if (row < ROWS - 1) {
        const swapped = swapTiles(board, current, { row: row + 1, col });
        if (findMatches(swapped).size > 0) return true;
      }
    }
  }
  return false;
};

const buildBoard = (): TileData[][] => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const board: TileData[][] = Array.from({ length: ROWS }, () => []);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const candidates = TILE_FAMILIES
          .map(family => family.id)
          .filter(familyId => !wouldCreateInitialMatch(board, row, col, familyId));
        const familyId = candidates[Math.floor(Math.random() * candidates.length)] || TILE_FAMILIES[Math.floor(Math.random() * TILE_FAMILIES.length)].id;
        board[row][col] = createTile(familyId, row, col);
      }
    }

    if (hasPossibleMove(board)) {
      return board;
    }
  }

  return Array.from({ length: ROWS }, (_, row) => (
    Array.from({ length: COLS }, (_, col) => createTile(TILE_FAMILIES[(row + col) % TILE_FAMILIES.length].id, row, col))
  ));
};

const collapseBoard = (board: TileData[][], matchedKeys: Set<string>) => {
  const nextBoard: TileData[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }));

  for (let col = 0; col < COLS; col += 1) {
    let writeRow = ROWS - 1;

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (matchedKeys.has(tileKey(row, col))) continue;
      nextBoard[writeRow][col] = { ...board[row][col], row: writeRow, col };
      writeRow -= 1;
    }

    while (writeRow >= 0) {
      const familyId = TILE_FAMILIES[Math.floor(Math.random() * TILE_FAMILIES.length)].id;
      nextBoard[writeRow][col] = createTile(familyId, writeRow, col);
      writeRow -= 1;
    }
  }

  return nextBoard;
};

const FractionMatchGame: React.FC<FractionMatchGameProps> = ({
  levelId,
  avatarId,
  onVictory,
  onGameOver,
  onBack,
}) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LEVEL_TIME_BASE);
  const [board, setBoard] = useState<TileData[][]>(() => buildBoard());
  const [selectedTile, setSelectedTile] = useState<TilePosition | null>(null);
  const [matchedTileIds, setMatchedTileIds] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Swap adjacent tiles to line up three equivalent values.');

  const scoreRef = useRef(0);

  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const targetScore = LEVEL_TARGET_BASE + (levelId * LEVEL_TARGET_STEP);
  const progress = Math.min((score / targetScore) * 100, 100);

  const boardTiles = useMemo(() => board.flat(), [board]);

  const setBoardState = useCallback((nextBoard: TileData[][]) => {
    setBoard(nextBoard);
  }, []);

  const awardPoints = useCallback((points: number) => {
    scoreRef.current += points;
    setScore(scoreRef.current);
    return scoreRef.current;
  }, []);

  const finishLevel = useCallback((finalScore: number) => {
    const stars = finalScore >= targetScore * 1.85 ? 3 : finalScore >= targetScore * 1.3 ? 2 : 1;
    setIsVictory(true);
    confetti({
      particleCount: 180,
      spread: 74,
      origin: { y: 0.58 },
      colors: ['#fde68a', '#ffffff', '#c4b5fd'],
    });
    onVictory(stars, finalScore);
  }, [onVictory, targetScore]);

  const resetGame = useCallback(() => {
    const nextBoard = buildBoard();
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(LEVEL_TIME_BASE + (levelId * LEVEL_TIME_STEP));
    setBoardState(nextBoard);
    setSelectedTile(null);
    setMatchedTileIds([]);
    setIsResolving(false);
    setCombo(0);
    setIsGameOver(false);
    setIsVictory(false);
    setStatusMessage('Swap adjacent tiles to line up three equivalent values.');
  }, [levelId, setBoardState]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    if (isGameOver || isVictory) return undefined;
    if (timeLeft <= 0) {
      if (scoreRef.current >= targetScore) {
        finishLevel(scoreRef.current);
      } else {
        setIsGameOver(true);
        onGameOver(scoreRef.current);
      }
      return undefined;
    }

    const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [finishLevel, isGameOver, isVictory, onGameOver, targetScore, timeLeft]);

  const reshuffleIfNeeded = useCallback((currentBoard: TileData[][]) => {
    if (hasPossibleMove(currentBoard)) return currentBoard;
    const reshuffled = buildBoard();
    setStatusMessage('Board reshuffled to keep a move alive.');
    setBoardState(reshuffled);
    return reshuffled;
  }, [setBoardState]);

  const resolveBoard = useCallback(async (startingBoard: TileData[][]) => {
    let workingBoard = cloneBoard(startingBoard);
    let chain = 0;

    while (true) {
      const matches = findMatches(workingBoard);
      if (matches.size === 0) {
        break;
      }

      chain += 1;
      const matchedIds = Array.from(matches).map(key => {
        const [row, col] = key.split('-').map(Number);
        return workingBoard[row][col].id;
      });
      setMatchedTileIds(matchedIds);

      const points = (matches.size * 55) + (chain * 35);
      const total = awardPoints(points);
      setCombo(chain);
      setStatusMessage(chain > 1 ? `Cascade x${chain}. +${points}` : `Match scored. +${points}`);

      await delay(MATCH_DELAY_MS);
      workingBoard = collapseBoard(workingBoard, matches);
      setMatchedTileIds([]);
      setBoardState(workingBoard);

      await delay(MATCH_DELAY_MS + 40);

      if (total >= targetScore) {
        finishLevel(total);
        return;
      }
    }

    const finalBoard = reshuffleIfNeeded(workingBoard);
    setBoardState(finalBoard);
    setCombo(0);
  }, [awardPoints, finishLevel, reshuffleIfNeeded, setBoardState]);

  const attemptSwap = useCallback(async (first: TilePosition, second: TilePosition) => {
    if (isResolving || isGameOver || isVictory) return;

    setIsResolving(true);
    const swapped = swapTiles(board, first, second);
    setBoardState(swapped);
    setStatusMessage('Checking match...');

    await delay(160);

    if (findMatches(swapped).size === 0) {
      const reverted = swapTiles(swapped, second, first);
      setBoardState(reverted);
      setStatusMessage('No match there. Try another swap.');
      await delay(160);
      setIsResolving(false);
      setSelectedTile(null);
      setCombo(0);
      return;
    }

    await resolveBoard(swapped);
    setIsResolving(false);
    setSelectedTile(null);
  }, [board, isGameOver, isResolving, isVictory, resolveBoard, setBoardState]);

  const handleTileTap = (tile: TileData) => {
    if (isResolving || isGameOver || isVictory) return;

    const position = { row: tile.row, col: tile.col };

    if (!selectedTile) {
      setSelectedTile(position);
      setStatusMessage(`Selected ${tile.label}. Pick an adjacent tile.`);
      return;
    }

    if (selectedTile.row === position.row && selectedTile.col === position.col) {
      setSelectedTile(null);
      setStatusMessage('Swap adjacent tiles to line up three equivalent values.');
      return;
    }

    if (!areAdjacent(selectedTile, position)) {
      setSelectedTile(position);
      setStatusMessage(`Selected ${tile.label}. Choose a neighbour to swap.`);
      return;
    }

    void attemptSwap(selectedTile, position);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#17072a_0%,#0b1021_52%,#04060e_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title="Crystal Match"
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          accentText="text-violet-950"
          accentSoftBg="bg-violet-100/80"
          accentBorder="border-violet-200/90"
          progressBar="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400"
          statLabel="Combo"
          statValue={combo}
        />

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_28px_60px_rgba(2,6,23,0.5)] md:rounded-[2.6rem]">
          <div className="absolute left-3 top-3 z-20 flex items-center gap-2 md:left-4 md:top-4">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/45 text-white shadow-[0_12px_24px_rgba(2,6,23,0.32)] backdrop-blur-md"
              aria-label="Back to island"
            >
              <AssetIcon name="back" className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-white/90 shadow-[0_12px_24px_rgba(2,6,23,0.32)] backdrop-blur-md md:text-xs">
              Match 3+ equivalent values
            </div>
          </div>

          <div className="absolute bottom-3 left-1/2 z-20 w-[min(92%,720px)] -translate-x-1/2 rounded-[1.2rem] border border-white/10 bg-slate-950/48 px-4 py-2.5 text-center text-sm font-bold text-white/92 shadow-[0_12px_24px_rgba(2,6,23,0.32)] backdrop-blur-md md:bottom-4 md:text-base">
            {statusMessage}
          </div>

          <div className="relative h-full w-full max-w-[1080px]">
            <img
              src={FRACTION_MATCH_ASSETS.board}
              alt="Crystal Cave board"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />

            <div
              className="absolute"
              style={{
                left: '11.2%',
                right: '11.2%',
                top: '15.4%',
                bottom: '22.1%',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) 0.5fr repeat(5, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
                gap: '1.8% 1.2%',
              }}
            >
              {boardTiles.map(tile => {
                const isSelected = selectedTile?.row === tile.row && selectedTile?.col === tile.col;
                const isMatched = matchedTileIds.includes(tile.id);
                const family = getFamily(tile.familyId);

                return (
                  <motion.button
                    key={tile.id}
                    layout
                    transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                    onClick={() => handleTileTap(tile)}
                    disabled={isResolving || isGameOver || isVictory}
                    className={`group relative aspect-square rounded-[18%] ${family.glow} ${isSelected ? 'ring-4 ring-white/90 ring-offset-2 ring-offset-slate-900/20' : ''}`}
                    style={{
                      gridRow: tile.row + 1,
                      gridColumn: tile.col < 5 ? tile.col + 1 : tile.col + 2,
                    }}
                    whileTap={{ scale: 0.95 }}
                    animate={isMatched ? { scale: [1, 1.16, 0.88], opacity: [1, 1, 0.55] } : { scale: 1, opacity: 1 }}
                  >
                    <img
                      src={tile.asset}
                      alt={tile.label}
                      className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(2,6,23,0.22)]"
                      draggable={false}
                    />
                    <div className="absolute inset-[10%] rounded-[24%] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%)]" />
                    <div className="absolute inset-0 flex items-center justify-center px-1 text-center">
                      <span className={`font-black leading-none text-white drop-shadow-[0_2px_10px_rgba(15,23,42,0.7)] ${tile.label.length >= 5 ? 'text-[clamp(0.5rem,1.6vw,1rem)]' : 'text-[clamp(0.62rem,1.9vw,1.2rem)]'}`}>
                        {tile.label}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.84, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-violet-300 bg-white p-6 shadow-2xl md:gap-7 md:p-10">
                <div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isVictory ? 'Crystal Chain' : 'Time Up'}
                </div>
                <div className="text-center text-sm font-semibold text-slate-500 md:text-base">
                  {isVictory ? 'You cleared the target and kept the board alive with real match opportunities.' : 'The timer ran out before you hit the Crystal Cave target score.'}
                </div>

                {isVictory && (
                  <div className="flex gap-2">
                    {[1, 2, 3].map(index => {
                      const earnedStars = score >= targetScore * 1.85 ? 3 : score >= targetScore * 1.3 ? 2 : 1;
                      return (
                        <motion.div
                          key={index}
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.16, type: 'spring' }}
                        >
                          <Star className={`h-14 w-14 ${index <= earnedStars ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <div className="grid w-full grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] bg-violet-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700/70">Score</div>
                    <div className="mt-1 text-2xl font-black text-violet-950">{score}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-fuchsia-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700/70">Target</div>
                    <div className="mt-1 text-2xl font-black text-violet-950">{targetScore}</div>
                  </div>
                </div>

                <button onClick={onBack} className="licensed-submit-button w-full rounded-2xl py-4 text-xl font-black text-white transition-all">
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FractionMatchGame;
