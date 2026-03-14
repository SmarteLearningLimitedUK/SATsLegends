import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { AVATARS } from '../constants';
import { getBossEncounter } from '../bossMeta';
import BossPortrait from './BossPortrait';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import { ArrowRightLeft, ArrowUpDown, Bomb, Star } from './GameIcons';
import { triggerHaptic } from '../haptics';
import { FRACTION_MATCH_ASSETS } from '../assets/fraction_match';

interface FractionMatchGameProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

interface TileFamily {
  id: string;
  labels: string[];
  asset: string;
  glow: string;
  value: number;
}

interface TileData {
  id: string;
  familyId: string;
  label: string;
  asset: string;
  special?: 'BOMB' | 'ROW_CLEAR' | 'COLUMN_CLEAR';
  row: number;
  col: number;
}

interface TilePosition {
  row: number;
  col: number;
}

const ROWS = 8;
const COLS = 8;
const LEVEL_TARGET_BASE = 1100;
const LEVEL_TARGET_STEP = 180;
const LEVEL_TIME_BASE = 90;
const LEVEL_TIME_STEP = 8;
const MATCH_DELAY_MS = 180;
const SPECIAL_CHANCE = 0.07;

const TILE_FAMILIES: TileFamily[] = [
  { id: 'half', labels: ['1/2', '0.5', '2/4', '0.50'], asset: FRACTION_MATCH_ASSETS.tiles.ember, glow: 'shadow-[0_0_24px_rgba(249,115,22,0.38)]', value: 0.5 },
  { id: 'quarter', labels: ['1/4', '0.25', '2/8'], asset: FRACTION_MATCH_ASSETS.tiles.sapphire, glow: 'shadow-[0_0_24px_rgba(59,130,246,0.38)]', value: 0.25 },
  { id: 'three-quarters', labels: ['3/4', '0.75', '6/8'], asset: FRACTION_MATCH_ASSETS.tiles.emerald, glow: 'shadow-[0_0_24px_rgba(34,197,94,0.36)]', value: 0.75 },
  { id: 'fifth', labels: ['1/5', '0.2', '2/10'], asset: FRACTION_MATCH_ASSETS.tiles.violet, glow: 'shadow-[0_0_24px_rgba(192,132,252,0.36)]', value: 0.2 },
  { id: 'two-fifths', labels: ['2/5', '0.4', '4/10'], asset: FRACTION_MATCH_ASSETS.tiles.gold, glow: 'shadow-[0_0_24px_rgba(250,204,21,0.38)]', value: 0.4 },
  { id: 'tenth', labels: ['1/10', '0.1', '10/100'], asset: FRACTION_MATCH_ASSETS.tiles.storm, glow: 'shadow-[0_0_24px_rgba(167,139,250,0.36)]', value: 0.1 },
  { id: 'three-tenths', labels: ['3/10', '0.3', '30/100'], asset: FRACTION_MATCH_ASSETS.tiles.plasma, glow: 'shadow-[0_0_24px_rgba(236,72,153,0.34)]', value: 0.3 },
  { id: 'eighth', labels: ['1/8', '0.125', '2/16'], asset: FRACTION_MATCH_ASSETS.tiles.azure, glow: 'shadow-[0_0_24px_rgba(56,189,248,0.34)]', value: 0.125 },
];

const createId = () => Math.random().toString(36).slice(2, 11);
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const areAdjacent = (first: TilePosition, second: TilePosition) => (
  Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1
);

const tileKey = (row: number, col: number) => `${row}-${col}`;

const getFamily = (familyId: string) => TILE_FAMILIES.find(family => family.id === familyId) || TILE_FAMILIES[0];

const maybeCreateSpecial = (): TileData['special'] => {
  if (Math.random() > SPECIAL_CHANCE) return undefined;
  const specials: Array<NonNullable<TileData['special']>> = ['BOMB', 'ROW_CLEAR', 'COLUMN_CLEAR'];
  return specials[Math.floor(Math.random() * specials.length)];
};

const createTile = (familyId: string, row: number, col: number): TileData => {
  const family = getFamily(familyId);
  const label = family.labels[Math.floor(Math.random() * family.labels.length)];

  return {
    id: createId(),
    familyId,
    label,
    asset: family.asset,
    special: maybeCreateSpecial(),
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

const expandMatchesWithSpecials = (board: TileData[][], initialMatches: Set<string>) => {
  const expanded = new Set(initialMatches);
  const queue = [...initialMatches];

  while (queue.length > 0) {
    const key = queue.shift();
    if (!key) continue;

    const [row, col] = key.split('-').map(Number);
    const tile = board[row]?.[col];
    if (!tile?.special) continue;

    const affected: string[] = [];

    if (tile.special === 'ROW_CLEAR') {
      for (let targetCol = 0; targetCol < COLS; targetCol += 1) {
        affected.push(tileKey(row, targetCol));
      }
    }

    if (tile.special === 'COLUMN_CLEAR') {
      for (let targetRow = 0; targetRow < ROWS; targetRow += 1) {
        affected.push(tileKey(targetRow, col));
      }
    }

    if (tile.special === 'BOMB') {
      for (let targetRow = Math.max(0, row - 1); targetRow <= Math.min(ROWS - 1, row + 1); targetRow += 1) {
        for (let targetCol = Math.max(0, col - 1); targetCol <= Math.min(COLS - 1, col + 1); targetCol += 1) {
          affected.push(tileKey(targetRow, targetCol));
        }
      }
    }

    affected.forEach((affectedKey) => {
      if (!expanded.has(affectedKey)) {
        expanded.add(affectedKey);
        queue.push(affectedKey);
      }
    });
  }

  return expanded;
};

const renderSpecialBadge = (special: TileData['special']) => {
  if (!special) return null;

  if (special === 'BOMB') {
    return <Bomb className="h-3 w-3 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] md:h-4 md:w-4" />;
  }

  if (special === 'ROW_CLEAR') {
    return <ArrowRightLeft className="h-3 w-3 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] md:h-4 md:w-4" />;
  }

  return <ArrowUpDown className="h-3 w-3 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] md:h-4 md:w-4" />;
};

interface FractionOrderCard {
  id: string;
  familyId: string;
  label: string;
  value: number;
  asset: string;
}

const createBossSortChallenge = (size: number): FractionOrderCard[] => (
  shuffle(TILE_FAMILIES)
    .slice(0, size)
    .map((family) => ({
      id: createId(),
      familyId: family.id,
      label: family.labels[Math.floor(Math.random() * family.labels.length)],
      value: family.value,
      asset: family.asset,
    }))
);

const FractionMatchGame: React.FC<FractionMatchGameProps> = ({
  levelId,
  avatarId,
  isBoss = false,
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
  const [statusMessage, setStatusMessage] = useState('Swap adjacent tiles to line up three equivalent values and trigger crystal powers.');
  const [bossCards, setBossCards] = useState<FractionOrderCard[]>([]);
  const [bossSelection, setBossSelection] = useState<string[]>([]);
  const [bossFeedback, setBossFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const scoreRef = useRef(0);

  const avatar = AVATARS.find(item => item.id === avatarId) || AVATARS[0];
  const targetScore = LEVEL_TARGET_BASE + (levelId * LEVEL_TARGET_STEP);
  const progress = Math.min((score / targetScore) * 100, 100);
  const bossEncounter = isBoss ? getBossEncounter('crystal_core') : undefined;
  const bossPose = !bossEncounter
    ? 'neutral'
    : isVictory
      ? 'defeat'
      : isGameOver
        ? 'victory'
        : matchedTileIds.length > 0
          ? 'dazed'
          : combo >= 2
            ? 'happy'
            : isResolving
              ? 'attack'
              : 'neutral';
  const bossSelectedCards = useMemo(
    () => bossSelection.map((id) => bossCards.find((card) => card.id === id)).filter((card): card is FractionOrderCard => Boolean(card)),
    [bossCards, bossSelection],
  );

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
    const nextBossCards = createBossSortChallenge(levelId >= 5 ? 4 : 3);
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
    setBossCards(nextBossCards);
    setBossSelection([]);
    setBossFeedback(null);
    setStatusMessage(
      isBoss
        ? 'Tap the fraction cards in ascending order to stabilise the Crystal Core.'
        : 'Swap adjacent tiles to line up three equivalent values and trigger crystal powers.',
    );
  }, [isBoss, levelId, setBoardState]);

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

      const affectedMatches = expandMatchesWithSpecials(workingBoard, matches);

      chain += 1;
      const matchedIds = Array.from(affectedMatches).map(key => {
        const [row, col] = key.split('-').map(Number);
        return workingBoard[row][col].id;
      });
      setMatchedTileIds(matchedIds);

      const specialBonus = Math.max(0, affectedMatches.size - matches.size) * 18;
      const points = (affectedMatches.size * 55) + (chain * 35) + specialBonus;
      const total = awardPoints(points);
      triggerHaptic(chain > 1 ? 'success' : 'selection');
      setCombo(chain);
      setStatusMessage(
        affectedMatches.size > matches.size
          ? `Power clear triggered. +${points}`
          : chain > 1
            ? `Cascade x${chain}. +${points}`
            : `Match scored. +${points}`,
      );

      await delay(MATCH_DELAY_MS);
      workingBoard = collapseBoard(workingBoard, affectedMatches);
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
      triggerHaptic('warning');
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
      setStatusMessage('Swap adjacent tiles to line up three equivalent values and trigger crystal powers.');
      return;
    }

    if (!areAdjacent(selectedTile, position)) {
      setSelectedTile(position);
      setStatusMessage(`Selected ${tile.label}. Choose a neighbour to swap.`);
      return;
    }

    void attemptSwap(selectedTile, position);
  };

  const prepareNextBossChallenge = useCallback(() => {
    setBossCards(createBossSortChallenge(levelId >= 5 ? 4 : 3));
    setBossSelection([]);
    setBossFeedback(null);
  }, [levelId]);

  const handleBossCardTap = useCallback((card: FractionOrderCard) => {
    if (!isBoss || isResolving || isGameOver || isVictory || bossFeedback) return;
    if (bossSelection.includes(card.id)) return;

    triggerHaptic('selection');
    const nextSelection = [...bossSelection, card.id];
    setBossSelection(nextSelection);

    if (nextSelection.length < bossCards.length) {
      setStatusMessage(`Order locked: ${nextSelection.length}/${bossCards.length}. Keep going from smallest to largest.`);
      return;
    }

    const orderedCards = nextSelection
      .map((id) => bossCards.find((bossCard) => bossCard.id === id))
      .filter((bossCard): bossCard is FractionOrderCard => Boolean(bossCard));
    const expectedOrder = [...bossCards].sort((a, b) => a.value - b.value).map((bossCard) => bossCard.id);
    const isCorrect = expectedOrder.every((id, index) => id === nextSelection[index]);

    if (isCorrect) {
      const points = 180 + (combo * 28);
      const total = awardPoints(points);
      setCombo((prev) => prev + 1);
      setBossFeedback('correct');
      setStatusMessage(`Core stabilised. +${points}`);
      triggerHaptic('success');
      confetti({
        particleCount: 40,
        spread: 46,
        origin: { y: 0.72 },
        colors: ['#a78bfa', '#67e8f9', '#fde68a'],
      });

      if (total >= targetScore) {
        setTimeout(() => finishLevel(total), 520);
        return;
      }

      window.setTimeout(() => {
        prepareNextBossChallenge();
        setStatusMessage('Tap the fraction cards in ascending order to stabilise the Crystal Core.');
      }, 650);
      return;
    }

    setBossFeedback('incorrect');
    setCombo(0);
    setTimeLeft((prev) => Math.max(0, prev - 4));
    setStatusMessage(`Not quite. ${orderedCards.map((bossCard) => bossCard.label).join(' -> ')} is out of order.`);
    triggerHaptic('warning');
    window.setTimeout(() => {
      setBossSelection([]);
      setBossFeedback(null);
      setStatusMessage('Try again. Start with the smallest fraction.');
    }, 850);
  }, [awardPoints, bossCards, bossFeedback, bossSelection, combo, finishLevel, isBoss, isGameOver, isResolving, isVictory, prepareNextBossChallenge, targetScore]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#5b3b1a_0%,#23130b_28%,#120d0d_58%,#050608_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
      <img
        src={FRACTION_MATCH_ASSETS.board}
        alt="Crystal Cave board background"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-28"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_top_left,rgba(132,204,22,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(9,6,3,0.28),rgba(6,8,16,0.62))]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <GameplayHUD
          title={isBoss ? 'Crystal Core' : 'Crystal Match'}
          avatar={avatar}
          score={score}
          targetScore={targetScore}
          timeLeft={timeLeft}
          progress={progress}
          compact
          accentText="text-amber-950"
          accentSoftBg="bg-amber-100/85"
          accentBorder="border-amber-200/90"
          progressBar="bg-gradient-to-r from-lime-300 via-amber-300 to-orange-400"
          statLabel={isBoss ? 'Solved' : 'Combo'}
          statValue={isBoss ? combo : combo}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-[#f7d98c]/16 bg-[linear-gradient(180deg,rgba(255,248,220,0.08),rgba(255,255,255,0.01))] p-2 shadow-[0_28px_60px_rgba(0,0,0,0.42)] md:rounded-[2.6rem] md:p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,251,235,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.1))]" />

          <div className="relative z-10 mb-2 flex items-center justify-between gap-2 md:mb-3">
            <div className="min-w-0 flex-1 rounded-[1.25rem] border border-[#f6dfae]/24 bg-[linear-gradient(180deg,rgba(70,42,20,0.92),rgba(26,16,10,0.88))] px-3 py-2 shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-50/82 md:text-[10px]">Match 3+ Equivalent Values</div>
              <div className="mt-1 truncate text-[11px] font-bold text-amber-50 md:text-sm">{statusMessage}</div>
            </div>

            {bossEncounter && (
              <div className="w-24 shrink-0 md:w-32">
                <BossPortrait encounter={bossEncounter} pose={bossPose} compact />
              </div>
            )}
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
            <div className="relative aspect-square w-full max-w-[24rem] sm:max-w-[28rem] md:max-w-[34rem]">
              <div className="absolute inset-[-3.5%] overflow-hidden rounded-[2.35rem] border border-[#f7d98c]/20 shadow-[0_20px_38px_rgba(0,0,0,0.34)]">
                <img
                  src={FRACTION_MATCH_ASSETS.board}
                  alt="Crystal board stage"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-34 scale-[1.08]"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.16),transparent_24%),linear-gradient(180deg,rgba(5,8,15,0.04),rgba(5,8,15,0.24))]" />
              </div>

              <div className="absolute inset-0 rounded-[2rem] border border-[#f7d98c]/26 bg-[linear-gradient(180deg,rgba(72,44,19,0.94),rgba(39,24,14,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_38px_rgba(0,0,0,0.32)]" />
              <div className="absolute inset-[2.6%] rounded-[1.7rem] border border-[#f7d98c]/14 bg-[linear-gradient(180deg,rgba(30,20,12,0.94),rgba(18,12,8,0.96))]" />
              <div className="absolute inset-[6%] rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(26,20,18,0.94),rgba(14,10,9,0.98))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:p-2">
                <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-1 md:gap-1.5">
                  {boardTiles.map(tile => {
                    const isSelected = selectedTile?.row === tile.row && selectedTile?.col === tile.col;
                    const isMatched = matchedTileIds.includes(tile.id);
                    const family = getFamily(tile.familyId);

                    return (
                      <motion.button
                        key={tile.id}
                        layout
                        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                        onClick={() => handleTileTap(tile)}
                        disabled={isResolving || isGameOver || isVictory}
                        className={`group relative aspect-square overflow-hidden rounded-[26%] ${family.glow} ${isSelected ? 'z-20' : ''}`}
                        style={{
                          gridRow: tile.row + 1,
                          gridColumn: tile.col + 1,
                        }}
                        whileTap={{ scale: 0.95 }}
                        animate={isMatched ? { scale: [1, 1.16, 0.86], rotate: [0, 2, -2, 0], opacity: [1, 1, 0.4] } : { scale: isSelected ? 1.05 : 1, opacity: 1, y: isSelected ? -1 : 0 }}
                      >
                        <img
                          src={tile.asset}
                          alt={tile.label}
                          className="absolute inset-0 h-full w-full object-cover drop-shadow-[0_12px_18px_rgba(0,0,0,0.32)]"
                          draggable={false}
                        />
                        <div className="absolute inset-0 rounded-[26%] bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.42),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_42%,rgba(15,23,42,0.18))]" />
                        <div className="absolute inset-x-[16%] top-[10%] h-[16%] rounded-full bg-white/30 blur-[1px]" />
                        <div className={`absolute inset-[3%] rounded-[24%] border ${isSelected ? 'border-[#fff6bf]' : 'border-white/12'} shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]`} />
                        <div className="absolute inset-[14%] flex items-center justify-center">
                          <span className={`rounded-full border border-white/10 bg-slate-950/40 px-1.5 py-1 text-center font-black leading-none text-white backdrop-blur-[2px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] ${tile.label.length >= 5 ? 'text-[clamp(0.34rem,1.55vw,0.82rem)]' : 'text-[clamp(0.46rem,1.95vw,1rem)]'}`}>
                            {tile.label}
                          </span>
                        </div>
                        {tile.special && (
                          <div className="absolute right-[6%] top-[6%] flex h-5 w-5 items-center justify-center rounded-full border border-white/18 bg-slate-950/58 shadow-[0_10px_16px_rgba(0,0,0,0.34)] md:h-6 md:w-6">
                            {renderSpecialBadge(tile.special)}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <GameActionDock onBack={onBack} accentClass="text-amber-50" />

        <AnimatePresence>
          {(isGameOver || isVictory) && (
            <motion.div
              initial={{ scale: 0.84, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            >
              <div className="app-modal-panel flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] border-4 border-[#f6dfae]/40 bg-[linear-gradient(180deg,#fff4d8,#e7d1a3)] p-6 shadow-2xl md:gap-7 md:p-10">
                <div className={`text-center text-4xl font-black md:text-5xl ${isVictory ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isVictory ? 'Crystal Chain' : 'Time Up'}
                </div>
                <div className="text-center text-sm font-semibold text-slate-600 md:text-base">
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
                  <div className="rounded-[1.2rem] bg-amber-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700/70">Score</div>
                    <div className="mt-1 text-2xl font-black text-amber-950">{score}</div>
                  </div>
                  <div className="rounded-[1.2rem] bg-lime-50 p-3 text-center">
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-700/70">Target</div>
                    <div className="mt-1 text-2xl font-black text-lime-950">{targetScore}</div>
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
