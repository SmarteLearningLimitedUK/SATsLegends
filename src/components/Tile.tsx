import React from 'react';
import { motion } from 'motion/react';
import { Bomb, ArrowRightLeft, ArrowUpDown } from './GameIcons';
import { TileData } from '../types';
import { clsx } from 'clsx';

interface TileProps {
  tile: TileData;
  isSelected: boolean;
  onClick: () => void;
  gridSize: number;
  tileSize: number;
}

const Tile: React.FC<TileProps> = ({ tile, isSelected, onClick, gridSize, tileSize }) => {
  const getPowerUpIcon = () => {
    switch (tile.powerUp) {
      case 'BOMB': return <Bomb className="w-4 h-4 text-white" />;
      case 'ROW_CLEAR': return <ArrowRightLeft className="w-4 h-4 text-white" />;
      case 'COLUMN_CLEAR': return <ArrowUpDown className="w-4 h-4 text-white" />;
      default: return null;
    }
  };

  const getTileColor = () => {
    const colors: Record<string, string> = {
      'half': 'from-blue-400 to-blue-600 border-blue-700 shadow-blue-900/40',
      'quarter': 'from-purple-400 to-purple-600 border-purple-700 shadow-purple-900/40',
      'three-quarters': 'from-pink-400 to-pink-600 border-pink-700 shadow-pink-900/40',
      'one-fifth': 'from-emerald-400 to-emerald-600 border-emerald-700 shadow-emerald-900/40',
      'ten': 'from-orange-400 to-orange-600 border-orange-700 shadow-orange-900/40',
      'twelve': 'from-yellow-400 to-yellow-600 border-yellow-700 shadow-yellow-900/40',
      'twenty': 'from-indigo-400 to-indigo-600 border-indigo-700 shadow-indigo-900/40',
      'one': 'from-teal-400 to-teal-600 border-teal-700 shadow-teal-900/40',
    };
    return colors[tile.familyId] || 'from-gray-400 to-gray-600 border-gray-700 shadow-gray-900/40';
  };

  const getExitAnimation = () => {
    switch (tile.powerUp) {
      case 'BOMB':
        return { 
          scale: [1, 1.5, 0], 
          opacity: [1, 1, 0],
          rotate: [0, 45, 90],
          transition: { duration: 0.4 } 
        };
      case 'ROW_CLEAR':
        return { 
          x: tile.x < gridSize / 2 ? -500 : 500,
          opacity: 0,
          transition: { duration: 0.4, ease: "easeIn" }
        };
      case 'COLUMN_CLEAR':
        return { 
          y: tile.y < gridSize / 2 ? -500 : 500,
          opacity: 0,
          transition: { duration: 0.4, ease: "easeIn" }
        };
      default:
        return { 
          scale: 0, 
          opacity: 0, 
          transition: { duration: 0.2 } 
        };
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, y: -100 }}
      animate={{ 
        scale: isSelected ? 1.1 : 1, 
        opacity: 1,
        y: 0,
        left: `${tile.x * tileSize}%`,
        top: `${tile.y * tileSize}%`,
        rotate: isSelected ? [0, -2, 2, 0] : 0,
      }}
      whileTap={{ scale: 0.9 }}
      exit={getExitAnimation()}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25,
        mass: 0.8,
        rotate: { repeat: Infinity, duration: 0.5 },
        layout: { duration: 0.3 }
      }}
      onClick={onClick}
      className={clsx(
        "absolute flex items-center justify-center rounded-2xl border-b-6 cursor-pointer select-none transition-all duration-200 bg-gradient-to-b shadow-lg",
        getTileColor(),
        isSelected && "ring-4 ring-white shadow-2xl z-10 -translate-y-2",
        gridSize > 7 ? "p-1 text-xs" : "p-2 text-sm md:text-base"
      )}
      style={{
        width: `${tileSize}%`,
        height: `${tileSize}%`,
        padding: '4px',
      }}
    >
      <div className="shine rounded-2xl" />
      <div className="gloss" />
      
      <span className="font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] text-center break-words z-10">
        {tile.display}
      </span>
      
      {tile.powerUp && (
        <div className="absolute top-1 right-1 bg-white/40 backdrop-blur-sm rounded-full p-1 shadow-sm border border-white/50 z-20">
          {getPowerUpIcon()}
        </div>
      )}
    </motion.div>
  );
};

export default Tile;
