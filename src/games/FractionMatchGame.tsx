import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import GameActionDock from '../components/GameActionDock';
import GameplaySceneBackdrop from '../components/GameplaySceneBackdrop';
import { ArrowRightLeft, ArrowUpDown, Bomb, Star } from '../components/GameIcons';
import { triggerHaptic } from '../haptics';
import { FRACTION_MATCH_ASSETS } from '../assets/fraction_match';
import coinAsset from '../assets/fantasy_hero/ui/coin.png';
import tileBlue from '../assets/fantasy_hero/cloud_collapse/tile_blue.png';
import tileGreen from '../assets/fantasy_hero/cloud_collapse/tile_green.png';
import tileRed from '../assets/fantasy_hero/cloud_collapse/tile_red.png';
import tileYellow from '../assets/fantasy_hero/cloud_collapse/tile_yellow.png';
import tileSky from '../assets/fantasy_hero/cloud_collapse/tile_navy.png';
import tileGradient from '../assets/fantasy_hero/cloud_collapse/tile_gradient.png';
import tileInnerDeco from '../assets/fantasy_hero/cloud_collapse/tile_inner_deco.png';
import tileGlow from '../assets/fantasy_hero/cloud_collapse/tile_glow.png';
import tileFocusBorder from '../assets/fantasy_hero/cloud_collapse/tile_focus_border.png';
import tileFocusGlow from '../assets/fantasy_hero/cloud_collapse/tile_focus_glow.png';

interface FractionMatchGameProps {
  levelId: number;
  avatarId: string;
  isBoss?: boolean;
  variantGameType?: 'fraction_match' | 'cloud_collapse';
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
  { id: 'fifth', labels: ['1/5', '0.2', '2/10'], asset: FRACTION_MATCH_ASSETS.tiles.cobalt, glow: 'shadow-[0_0_24px_rgba(56,189,248,0.36)]', value: 0.2 },
  { id: 'two-fifths', labels: ['2/5', '0.4', '4/10'], asset: FRACTION_MATCH_ASSETS.tiles.gold, glow: 'shadow-[0_0_24px_rgba(250,204,21,0.38)]', value: 0.4 },
  { id: 'tenth', labels: ['1/10', '0.1', '10/100'], asset: FRACTION_MATCH_ASSETS.tiles.storm, glow: 'shadow-[0_0_24px_rgba(167,139,250,0.36)]', value: 0.1 },
  { id: 'three-tenths', labels: ['3/10', '0.3', '30/100'], asset: FRACTION_MATCH_ASSETS.tiles.plasma, glow: 'shadow-[0_0_24px_rgba(236,72,153,0.34)]', value: 0.3 },
  { id: 'eighth', labels: ['1/8', '0.125', '2/16'], asset: FRACTION_MATCH_ASSETS.tiles.azure, glow: 'shadow-[0_0_24px_rgba(56,189,248,0.34)]', value: 0.125 },
];

const MATCH3_TILE_SKIN: Record<string, string> = {
  half: tileRed,
  quarter: tileBlue,
  'three-quarters': tileGreen,
  fifth: tileYellow,
  'two-fifths': tileRed,
  tenth: tileSky,
  'three-tenths': tileYellow,
  eighth: tileBlue,
};

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
  avatarId: _avatarId,
  isBoss = false,
  variantGameType = 'fraction_match',
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

  const targetScore = LEVEL_TARGET_BASE + (levelId * LEVEL_TARGET_STEP);
  const title = isBoss ? 'Crystal Core' : 'Crystal Match';
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
    <div className="relative flex h-full w-full flex-col overflow-hidden px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-[env(safe-area-inset-top)] md:px-4 md:pb-4">
      <GameplaySceneBackdrop gameType="fraction_match" />

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-4">
        <header className="ui-panel-unified flex items-center justify-between gap-2 rounded-[1.2rem] border border-white/14 bg-[linear-gradient(180deg,rgba(17,27,64,0.92),rgba(12,22,52,0.88))] px-3 py-2 text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] md:rounded-[1.45rem] md:px-4">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/84 md:text-sm">{title}</div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:px-3">
              <img src={coinAsset} alt="" className="h-4 w-4 md:h-5 md:w-5" draggable={false} />
              <span className="text-xs font-black md:text-sm">{score}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:px-3">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/80 md:text-xs">Time</span>
              <span className="text-xs font-black md:text-sm">{timeLeft}s</span>
            </div>
            <div className="hidden items-center gap-1 rounded-full bg-white/14 px-2 py-1 md:flex md:px-3">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/80 md:text-xs">Combo</span>
              <span className="text-xs font-black md:text-sm">{combo}</span>
            </div>
          </div>
        </header>

        <div className="licensed-board-frame structured-playfield-frame relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 shadow-[0_28px_60px_rgba(0,0,0,0.42)] md:rounded-[2.6rem] md:p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_50%_24%,rgba(56,189,248,0.14),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.16))]" />

          <div className="relative z-10 mb-2 rounded-[1.2rem] border border-amber-200/35 bg-[linear-gradient(180deg,rgba(255,247,222,0.96),rgba(253,230,138,0.88))] px-4 py-3 text-center shadow-[0_12px_24px_rgba(0,0,0,0.18)] md:mb-3 md:rounded-[1.5rem] md:px-6 md:py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-900/72 md:text-xs">
              {isBoss ? 'Fraction Challenge' : variantGameType === 'cloud_collapse' ? 'Crazy Match-3' : 'Crazy Match-3'}
            </div>
            <div className="mt-1 text-sm font-black text-amber-950 md:text-xl">
              {isBoss ? statusMessage : 'Swap adjacent gems to match equivalent values.'}
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
            {isBoss ? (
              <div className="licensed-game-card-dark relative flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] p-3 md:rounded-[2rem] md:p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_62%,rgba(34,211,238,0.12),transparent_16%),radial-gradient(circle_at_70%_68%,rgba(251,146,60,0.12),transparent_18%)]" />
                <div className="relative z-10 mx-auto rounded-[1.1rem] border border-orange-200/20 bg-[linear-gradient(180deg,rgba(236,125,34,0.98),rgba(176,74,18,0.98))] px-4 py-2 text-center shadow-[0_14px_28px_rgba(0,0,0,0.24)] md:rounded-[1.45rem] md:px-6 md:py-3">
                  <div className="text-[1rem] font-black leading-tight text-amber-50 drop-shadow-[0_2px_0_rgba(120,53,15,0.64)] md:text-[1.85rem]">
                    Sort the fractions from smallest to largest!
                  </div>
                </div>

                <div className="relative z-10 mt-3 flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-center gap-3 md:gap-6">
                    {bossCards.map((card) => {
                      const isPicked = bossSelection.includes(card.id);
                      return (
                        <motion.button
                          key={card.id}
                          onClick={() => handleBossCardTap(card)}
                          disabled={isPicked || Boolean(bossFeedback) || isGameOver || isVictory}
                          whileTap={{ scale: 0.96 }}
                          animate={isPicked ? { y: -34, opacity: 0.15, scale: 0.9 } : { y: [0, -4, 0] }}
                          transition={isPicked ? { duration: 0.22 } : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                          className="relative flex h-[5.4rem] w-[5.4rem] items-center justify-center overflow-hidden rounded-full border border-amber-200/30 bg-[linear-gradient(180deg,rgba(89,54,23,0.95),rgba(58,34,17,0.98))] shadow-[0_16px_24px_rgba(8,47,73,0.34)] md:h-[6.8rem] md:w-[6.8rem]"
                        >
                          <img src={card.asset} alt="" className="absolute inset-0 h-full w-full object-cover opacity-22" draggable={false} />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_30%)]" />
                          <div className="absolute inset-[6%] rounded-full border border-white/16" />
                          <div className="relative z-10 text-center text-[1.2rem] font-black leading-[0.82] text-amber-50 drop-shadow-[0_3px_0_rgba(30,41,59,0.9)] md:text-[1.6rem]">
                            {card.label.includes('/') ? card.label.split('/').map((part, index) => (
                              <React.Fragment key={`${card.id}-${part}-${index}`}>
                                <div>{part}</div>
                                {index === 0 && <div className="mx-auto my-0.5 h-[2px] w-6 rounded-full bg-amber-50/90 md:w-8" />}
                              </React.Fragment>
                            )) : card.label}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-1 flex-col items-center justify-end gap-3">
                    <div className="flex items-end justify-center gap-2 md:gap-4">
                      {bossCards.map((card, index) => {
                        const selectedCard = bossSelectedCards[index];
                        return (
                          <div key={`slot-${card.id}`} className="flex flex-col items-center gap-1.5">
                            <div className="relative flex h-14 w-20 items-center justify-center rounded-[1rem] border border-stone-400/24 bg-[linear-gradient(180deg,rgba(120,83,58,0.92),rgba(76,53,39,0.98))] shadow-[inset_0_2px_0_rgba(255,255,255,0.1),0_10px_0_rgba(39,24,17,0.72),0_16px_24px_rgba(0,0,0,0.24)] md:h-20 md:w-28 md:rounded-[1.25rem]">
                              {selectedCard && (
                                <div className="text-center text-[1.05rem] font-black leading-[0.78] text-amber-50 drop-shadow-[0_2px_0_rgba(30,41,59,0.9)] md:text-[1.55rem]">
                                  {selectedCard.label.includes('/') ? selectedCard.label.split('/').map((part, partIndex) => (
                                    <React.Fragment key={`${selectedCard.id}-${part}-${partIndex}`}>
                                      <div>{part}</div>
                                      {partIndex === 0 && <div className="mx-auto my-0.5 h-[2px] w-5 rounded-full bg-amber-50/90 md:w-7" />}
                                    </React.Fragment>
                                  )) : selectedCard.label}
                                </div>
                              )}
                            </div>
                            {index < bossCards.length - 1 && <div className="text-cyan-300 text-lg font-black md:text-2xl">-&gt;</div>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-[1rem] border border-amber-300/24 bg-[linear-gradient(180deg,rgba(120,83,58,0.92),rgba(76,53,39,0.98))] px-6 py-2.5 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.08),0_10px_0_rgba(39,24,17,0.72),0_16px_24px_rgba(0,0,0,0.24)] md:px-10 md:py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/74 md:text-xs">Answer Slots</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square w-full max-w-[24rem] sm:max-w-[29rem] md:max-w-[36rem]">
                <div className="absolute inset-0 rounded-[1.9rem] bg-[linear-gradient(180deg,#5fae39_0%,#4c9b2e_34%,#438e2a_68%,#3d7f26_100%)] p-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.3),0_16px_28px_rgba(0,0,0,0.34)] md:rounded-[2.2rem] md:p-2.5">
                  <div className="relative h-full w-full rounded-[1.5rem] border border-[#d9ad3f] bg-[linear-gradient(180deg,#67bd3f_0%,#5ab236_42%,#4fa430_100%)] p-2 md:p-2.5">
                    <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_30%)]" />
                    <div className="grid h-full w-full grid-cols-8 grid-rows-8 gap-1 rounded-[1rem] bg-[linear-gradient(180deg,#59ac35,#4f9a30)] p-1 md:gap-1.5 md:p-1.5">
                      {boardTiles.map(tile => {
                        const isSelected = selectedTile?.row === tile.row && selectedTile?.col === tile.col;
                        const isMatched = matchedTileIds.includes(tile.id);
                        const family = getFamily(tile.familyId);
                        const skin = MATCH3_TILE_SKIN[tile.familyId] || tileBlue;

                        return (
                          <motion.button
                            key={tile.id}
                            layout
                            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                            onClick={() => handleTileTap(tile)}
                            disabled={isResolving || isGameOver || isVictory}
                            className={`group relative aspect-square overflow-hidden rounded-[20%] ${family.glow} ${isSelected ? 'z-20' : ''}`}
                            style={{
                              gridRow: tile.row + 1,
                              gridColumn: tile.col + 1,
                            }}
                            whileTap={{ scale: 0.95 }}
                            animate={isMatched ? { scale: [1, 1.16, 0.86], rotate: [0, 2, -2, 0], opacity: [1, 1, 0.4] } : { scale: isSelected ? 1.05 : 1, opacity: 1, y: isSelected ? -1 : 0 }}
                          >
                            <img
                              src={skin}
                              alt={tile.label}
                              className="absolute inset-0 h-full w-full object-fill drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
                              draggable={false}
                            />
                            <img src={tileGradient} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" draggable={false} />
                            <img src={tileInnerDeco} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" draggable={false} />
                            <img src={tileGlow} alt="" className="absolute inset-0 h-full w-full object-fill opacity-75" draggable={false} />
                            {isSelected && (
                              <>
                                <img src={tileFocusGlow} alt="" className="absolute inset-[-4%] h-[108%] w-[108%] object-fill opacity-90" draggable={false} />
                                <img src={tileFocusBorder} alt="" className="absolute inset-0 h-full w-full object-fill opacity-100" draggable={false} />
                              </>
                            )}
                            <span className={`absolute bottom-[8%] left-1/2 -translate-x-1/2 rounded-full bg-black/34 px-1 py-[2px] text-[clamp(0.3rem,1.25vw,0.58rem)] font-black leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.6)]`}>
                              {tile.label}
                            </span>
                            {tile.special && (
                              <div className="absolute right-[6%] top-[6%] flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white/18 bg-slate-950/58 shadow-[0_10px_16px_rgba(0,0,0,0.34)] md:h-5 md:w-5">
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
            )}
          </div>
        </div>

        <div className="licensed-slice-paper-panel rounded-[1.1rem] border border-amber-200/28 px-4 py-2 text-center shadow-[0_10px_20px_rgba(0,0,0,0.18)] md:rounded-[1.35rem] md:px-6 md:py-3">
          <div className="text-[11px] font-black tracking-[0.06em] text-amber-950 md:text-base">
            {isBoss ? 'Tap the answers in ascending order to fill the slots.' : 'Match equivalent fraction values to charge the board.'}
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

                <button onClick={onBack} className="ui-button-primary licensed-submit-button w-full py-4 text-xl font-black text-white transition-all">
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
