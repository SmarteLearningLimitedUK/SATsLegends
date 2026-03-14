import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, TileData, CloudCollapseLevelConfig } from '../types';
import { GameService } from '../services/gameService';
import Tile from './Tile';
import boardBg from '../assets/fantasy_hero/cloud_collapse/board_bg.png';
import boardBorder from '../assets/fantasy_hero/cloud_collapse/board_border.png';
import boardGradient from '../assets/fantasy_hero/cloud_collapse/board_gradient.png';
import boardInnerBorder from '../assets/fantasy_hero/cloud_collapse/board_inner_border.png';
import sparkle from '../assets/fantasy_hero/cloud_collapse/sparkle.png';

interface GameBoardProps {
  level: CloudCollapseLevelConfig;
  onScoreUpdate: (points: number) => void;
  onMatch: () => void;
}

interface GameEffect {
  id: string;
  type: 'bomb' | 'row' | 'column';
  x: number;
  y: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ level, onScoreUpdate, onMatch }) => {
  const [grid, setGrid] = useState<Grid>([]);
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [effects, setEffects] = useState<GameEffect[]>([]);

  useEffect(() => {
    const initialGrid = GameService.createInitialGrid(level.gridSize, level.mathTypes);
    setGrid(initialGrid);
  }, [level]);

  const addEffect = (type: 'bomb' | 'row' | 'column', x: number, y: number) => {
    const id = Math.random().toString(36).slice(2, 11);
    setEffects((prev) => [...prev, { id, type, x, y }]);
    setTimeout(() => {
      setEffects((prev) => prev.filter((effect) => effect.id !== id));
    }, 520);
  };

  const handleTileClick = async (x: number, y: number) => {
    if (isProcessing) return;

    if (!selectedTile) {
      setSelectedTile({ x, y });
      return;
    }

    if (selectedTile.x === x && selectedTile.y === y) {
      setSelectedTile(null);
      return;
    }

    if (GameService.areAdjacent(selectedTile, { x, y })) {
      await swapAndProcess(selectedTile, { x, y });
    } else {
      setSelectedTile({ x, y });
    }
  };

  const swapAndProcess = async (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    setIsProcessing(true);
    setSelectedTile(null);

    let newGrid = grid.map((row) => [...row]);
    const t1 = newGrid[p1.y][p1.x];
    const t2 = newGrid[p2.y][p2.x];

    if (t1 && t2) {
      newGrid[p1.y][p1.x] = { ...t2, x: p1.x, y: p1.y };
      newGrid[p2.y][p2.x] = { ...t1, x: p2.x, y: p2.y };
      setGrid(newGrid);

      await new Promise((resolve) => setTimeout(resolve, 220));

      const matches = GameService.findMatches(newGrid);
      if (matches.length > 0) {
        onMatch();
        await processMatches(newGrid);
      } else {
        newGrid[p1.y][p1.x] = { ...t1, x: p1.x, y: p1.y };
        newGrid[p2.y][p2.x] = { ...t2, x: p2.x, y: p2.y };
        setGrid(newGrid);
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
    }

    setIsProcessing(false);
  };

  const processMatches = async (currentGrid: Grid) => {
    let workingGrid = currentGrid;
    let hasMoreMatches = true;

    while (hasMoreMatches) {
      const matches = GameService.findMatches(workingGrid);
      if (matches.length === 0) {
        hasMoreMatches = false;
        break;
      }

      matches.forEach(({ x, y }) => {
        const tile = workingGrid[y][x];
        if (tile?.powerUp === 'BOMB') addEffect('bomb', x, y);
        if (tile?.powerUp === 'ROW_CLEAR') addEffect('row', x, y);
        if (tile?.powerUp === 'COLUMN_CLEAR') addEffect('column', x, y);
      });

      const affected = GameService.applyPowerUps(workingGrid, matches);
      onScoreUpdate(affected.length * 10);

      const removedGrid = workingGrid.map((row) =>
        row.map((tile) => {
          if (tile && affected.some((coord) => coord.x === tile.x && coord.y === tile.y)) {
            return null;
          }
          return tile;
        }),
      );

      setGrid(removedGrid);
      await new Promise((resolve) => setTimeout(resolve, 260));

      const { newGrid: droppedGrid } = GameService.dropTiles(removedGrid);
      setGrid(droppedGrid);
      await new Promise((resolve) => setTimeout(resolve, 280));

      const { newGrid: refilledGrid } = GameService.fillTop(droppedGrid, level.mathTypes);
      workingGrid = refilledGrid;
      setGrid(workingGrid);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  const boardPadding = level.gridSize >= 8 ? 4.2 : 4.8;
  const gap = level.gridSize >= 8 ? 0.8 : level.gridSize >= 7 ? 0.95 : 1.15;
  const tileSize = (100 - boardPadding * 2 - gap * (level.gridSize - 1)) / level.gridSize;
  const innerSize = 100 - boardPadding * 2;

  return (
    <div
      className="relative aspect-square max-h-full max-w-full overflow-hidden rounded-[1.8rem] md:rounded-[2.4rem]"
      style={{
        width: 'min(96vw, calc(100dvh - 13.5rem), 680px)',
        height: 'min(96vw, calc(100dvh - 13.5rem), 680px)',
      }}
    >
      <img src={boardBg} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      <img src={boardGradient} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" draggable={false} />
      <img src={boardInnerBorder} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" draggable={false} />
      <img src={boardBorder} alt="" className="absolute inset-0 h-full w-full object-fill opacity-100" draggable={false} />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.12),rgba(96,165,250,0.06)_34%,rgba(2,6,23,0)_72%)] blur-xl" />
      <motion.img
        src={sparkle}
        alt=""
        draggable={false}
        animate={{ opacity: [0.18, 0.48, 0.18], rotate: [0, 18, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[6%] top-[5%] h-[18%] w-[18%] object-contain opacity-30"
      />
      <motion.img
        src={sparkle}
        alt=""
        draggable={false}
        animate={{ opacity: [0.14, 0.34, 0.14], rotate: [0, -16, 0] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[4%] right-[6%] h-[16%] w-[16%] object-contain opacity-24"
      />

      <div
        className="absolute overflow-hidden rounded-[1.25rem] md:rounded-[1.7rem]"
        style={{
          left: `${boardPadding}%`,
          top: `${boardPadding}%`,
          width: `${innerSize}%`,
          height: `${innerSize}%`,
          background:
            'linear-gradient(180deg, rgba(53,182,108,0.92), rgba(94,198,110,0.94) 30%, rgba(138,209,88,0.94) 72%, rgba(82,160,68,0.94))',
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18), inset 0 0 24px rgba(255,255,255,0.12)',
        }}
      >
        {Array.from({ length: level.gridSize + 1 }).map((_, index) => (
          <div
            key={`v-${index}`}
            className="absolute top-0 h-full w-[2px] bg-white/18"
            style={{ left: `${(index * 100) / level.gridSize}%`, transform: 'translateX(-50%)' }}
          />
        ))}
        {Array.from({ length: level.gridSize + 1 }).map((_, index) => (
          <div
            key={`h-${index}`}
            className="absolute left-0 h-[2px] w-full bg-white/18"
            style={{ top: `${(index * 100) / level.gridSize}%`, transform: 'translateY(-50%)' }}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(255,255,255,0)_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(2,6,23,0.08))]" />
      </div>

      <div className="relative h-full w-full">
        <AnimatePresence mode="popLayout">
          {grid.map((row) =>
            row.map((tile) =>
              tile ? (
                <Tile
                  key={tile.id}
                  tile={tile}
                  gridSize={level.gridSize}
                  tileSize={tileSize}
                  boardPadding={boardPadding}
                  gap={gap}
                  isSelected={selectedTile?.x === tile.x && selectedTile?.y === tile.y}
                  onClick={() => handleTileClick(tile.x, tile.y)}
                />
              ) : null,
            ),
          )}
        </AnimatePresence>

        <AnimatePresence>
          {effects.map((effect) => {
            const left = boardPadding + effect.x * (tileSize + gap);
            const top = boardPadding + effect.y * (tileSize + gap);

            return (
              <motion.div
                key={effect.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none z-40"
                style={{
                  left: effect.type === 'row' ? `${boardPadding}%` : `${left}%`,
                  top: effect.type === 'column' ? `${boardPadding}%` : `${top}%`,
                  width: effect.type === 'row' ? `${innerSize}%` : `${tileSize}%`,
                  height: effect.type === 'column' ? `${innerSize}%` : `${tileSize}%`,
                }}
              >
                {effect.type === 'bomb' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 2.4, opacity: [0, 1, 0] }}
                    className="h-full w-full rounded-full bg-orange-300/60 blur-xl"
                  />
                )}
                {effect.type === 'row' && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                    className="h-full w-full bg-cyan-200/40 blur-md"
                  />
                )}
                {effect.type === 'column' && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1, opacity: [0, 1, 0] }}
                    className="h-full w-full bg-fuchsia-300/35 blur-md"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameBoard;
