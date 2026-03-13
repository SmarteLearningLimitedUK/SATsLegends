import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, TileData, CloudCollapseLevelConfig } from '../types';
import { GameService } from '../services/gameService';
import Tile from './Tile';

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
  const [selectedTile, setSelectedTile] = useState<{ x: number, y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [effects, setEffects] = useState<GameEffect[]>([]);

  useEffect(() => {
    const initialGrid = GameService.createInitialGrid(level.gridSize, level.mathTypes);
    setGrid(initialGrid);
  }, [level]);

  const addEffect = (type: 'bomb' | 'row' | 'column', x: number, y: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setEffects(prev => [...prev, { id, type, x, y }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 600);
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

  const swapAndProcess = async (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    setIsProcessing(true);
    setSelectedTile(null);

    // 1. Visual Swap
    let newGrid = grid.map(row => [...row]);
    const t1 = newGrid[p1.y][p1.x];
    const t2 = newGrid[p2.y][p2.x];
    
    if (t1 && t2) {
      newGrid[p1.y][p1.x] = { ...t2, x: p1.x, y: p1.y };
      newGrid[p2.y][p2.x] = { ...t1, x: p2.x, y: p2.y };
      setGrid(newGrid);

      // Wait for swap animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // 2. Check for matches
      const matches = GameService.findMatches(newGrid);
      if (matches.length > 0) {
        onMatch();
        await processMatches(newGrid);
      } else {
        // Swap back if no match
        newGrid[p1.y][p1.x] = { ...t1, x: p1.x, y: p1.y };
        newGrid[p2.y][p2.x] = { ...t2, x: p2.x, y: p2.y };
        setGrid(newGrid);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    setIsProcessing(false);
  };

  const processMatches = async (currentGrid: Grid) => {
    let workingGrid = currentGrid;
    let hasMoreMatches = true;

    while (hasMoreMatches) {
      // Phase 1: Find and Remove Matches
      const matches = GameService.findMatches(workingGrid);
      if (matches.length === 0) {
        hasMoreMatches = false;
        break;
      }

      // Check for power-ups being triggered
      matches.forEach(({ x, y }) => {
        const tile = workingGrid[y][x];
        if (tile?.powerUp === 'BOMB') addEffect('bomb', x, y);
        if (tile?.powerUp === 'ROW_CLEAR') addEffect('row', x, y);
        if (tile?.powerUp === 'COLUMN_CLEAR') addEffect('column', x, y);
      });

      const affected = GameService.applyPowerUps(workingGrid, matches);
      const score = affected.length * 10;
      onScoreUpdate(score);

      // Mark for removal
      let removedGrid = workingGrid.map(row => row.map(tile => {
        if (tile && affected.some(a => a.x === tile.x && a.y === tile.y)) {
          return null;
        }
        return tile;
      }));
      
      setGrid(removedGrid);
      await new Promise(resolve => setTimeout(resolve, 400));

      // Phase 2: Drop existing tiles
      const { newGrid: droppedGrid } = GameService.dropTiles(removedGrid);
      setGrid(droppedGrid);
      await new Promise(resolve => setTimeout(resolve, 450));

      // Phase 3: Refill from top
      const { newGrid: refilledGrid } = GameService.fillTop(droppedGrid, level.mathTypes);
      workingGrid = refilledGrid;
      setGrid(workingGrid);
      await new Promise(resolve => setTimeout(resolve, 450));
    }
  };

  const tileSize = 100 / level.gridSize;

  return (
    <div 
      className="relative bg-white/30 backdrop-blur-xl rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-4 md:border-8 border-white/40 overflow-hidden"
      style={{
        width: 'min(82vw, 52dvh, 480px)',
        height: 'min(82vw, 52dvh, 480px)',
      }}
    >
      {/* Subtle Grid Pattern Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', 
          backgroundSize: `${tileSize}% ${tileSize}%` 
        }} 
      />

      <div className="relative w-full h-full">
        <AnimatePresence mode="popLayout">
          {grid.map((row) => 
            row.map((tile) => (
              tile && (
                <Tile
                  key={tile.id}
                  tile={tile}
                  gridSize={level.gridSize}
                  tileSize={tileSize}
                  isSelected={selectedTile?.x === tile.x && selectedTile?.y === tile.y}
                  onClick={() => handleTileClick(tile.x, tile.y)}
                />
              )
            ))
          )}
        </AnimatePresence>

        {/* Power-up Effects Overlay */}
        <AnimatePresence>
          {effects.map(effect => (
            <motion.div
              key={effect.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none z-30"
              style={{
                left: effect.type === 'row' ? 0 : `${effect.x * tileSize}%`,
                top: effect.type === 'column' ? 0 : `${effect.y * tileSize}%`,
                width: effect.type === 'row' ? '100%' : `${tileSize}%`,
                height: effect.type === 'column' ? '100%' : `${tileSize}%`,
              }}
            >
              {effect.type === 'bomb' && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 3, opacity: [0, 1, 0] }}
                  className="w-full h-full bg-orange-500/40 rounded-full blur-xl"
                />
              )}
              {effect.type === 'row' && (
                <motion.div 
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: [0, 1, 0] }}
                  className="w-full h-full bg-blue-400/40 blur-md"
                />
              )}
              {effect.type === 'column' && (
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 0] }}
                  className="w-full h-full bg-purple-400/40 blur-md"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GameBoard;
