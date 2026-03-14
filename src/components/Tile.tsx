import React from 'react';
import { motion } from 'motion/react';
import { Bomb, ArrowRightLeft, ArrowUpDown } from './GameIcons';
import { TileData } from '../types';
import { clsx } from 'clsx';
import tileBlue from '../assets/fantasy_hero/cloud_collapse/tile_blue.png';
import tileGreen from '../assets/fantasy_hero/cloud_collapse/tile_green.png';
import tilePurple from '../assets/fantasy_hero/cloud_collapse/tile_purple.png';
import tileRed from '../assets/fantasy_hero/cloud_collapse/tile_red.png';
import tileYellow from '../assets/fantasy_hero/cloud_collapse/tile_yellow.png';
import tileNavy from '../assets/fantasy_hero/cloud_collapse/tile_navy.png';
import tileGlow from '../assets/fantasy_hero/cloud_collapse/tile_glow.png';
import tileGradient from '../assets/fantasy_hero/cloud_collapse/tile_gradient.png';
import tileInnerDeco from '../assets/fantasy_hero/cloud_collapse/tile_inner_deco.png';
import tileFocusBorder from '../assets/fantasy_hero/cloud_collapse/tile_focus_border.png';
import tileFocusGlow from '../assets/fantasy_hero/cloud_collapse/tile_focus_glow.png';

interface TileProps {
  tile: TileData;
  isSelected: boolean;
  onClick: () => void;
  gridSize: number;
  tileSize: number;
  boardPadding: number;
  gap: number;
}

const TILE_ART: Record<string, string> = {
  half: tileBlue,
  quarter: tileRed,
  'three-quarters': tileGreen,
  'one-fifth': tileYellow,
  ten: tilePurple,
  twelve: tileNavy,
  twenty: tileBlue,
  one: tileGreen,
};

const TILE_TEXT: Record<string, string> = {
  half: 'text-cyan-50',
  quarter: 'text-amber-50',
  'three-quarters': 'text-emerald-50',
  'one-fifth': 'text-yellow-50',
  ten: 'text-violet-50',
  twelve: 'text-slate-50',
  twenty: 'text-cyan-50',
  one: 'text-emerald-50',
};

const Tile: React.FC<TileProps> = ({ tile, isSelected, onClick, gridSize, tileSize, boardPadding, gap }) => {
  const getPowerUpIcon = () => {
    switch (tile.powerUp) {
      case 'BOMB':
        return <Bomb className="h-3 w-3 text-white md:h-4 md:w-4" />;
      case 'ROW_CLEAR':
        return <ArrowRightLeft className="h-3 w-3 text-white md:h-4 md:w-4" />;
      case 'COLUMN_CLEAR':
        return <ArrowUpDown className="h-3 w-3 text-white md:h-4 md:w-4" />;
      default:
        return null;
    }
  };

  const getExitAnimation = () => {
    switch (tile.powerUp) {
      case 'BOMB':
        return {
          scale: [1, 1.45, 0],
          opacity: [1, 1, 0],
          rotate: [0, 45, 90],
          transition: { duration: 0.35 },
        };
      case 'ROW_CLEAR':
        return {
          x: tile.x < gridSize / 2 ? -500 : 500,
          opacity: 0,
          transition: { duration: 0.34, ease: 'easeIn' },
        };
      case 'COLUMN_CLEAR':
        return {
          y: tile.y < gridSize / 2 ? -500 : 500,
          opacity: 0,
          transition: { duration: 0.34, ease: 'easeIn' },
        };
      default:
        return {
          scale: 0.2,
          opacity: 0,
          transition: { duration: 0.18 },
        };
    }
  };

  const tileArt = TILE_ART[tile.familyId] || tileBlue;
  const textColor = TILE_TEXT[tile.familyId] || 'text-white';
  const left = boardPadding + tile.x * (tileSize + gap);
  const top = boardPadding + tile.y * (tileSize + gap);
  const labelSize =
    gridSize >= 8
      ? 'text-[9px] md:text-xs'
      : gridSize >= 7
        ? 'text-[10px] md:text-sm'
        : 'text-[11px] md:text-base';

  return (
    <motion.button
      layout
      type="button"
      initial={{ scale: 0.4, opacity: 0, y: -36 }}
      animate={{
        scale: isSelected ? 1.06 : 1,
        opacity: 1,
        y: 0,
        left: `${left}%`,
        top: `${top}%`,
      }}
      whileTap={{ scale: 0.94 }}
      exit={getExitAnimation()}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 28,
        mass: 0.72,
        layout: { duration: 0.28 },
      }}
      onClick={onClick}
      className={clsx(
        'absolute z-10 flex items-center justify-center overflow-hidden rounded-[18%] border-0 bg-transparent p-0 transition-transform duration-200',
        isSelected && 'z-20',
      )}
      style={{
        width: `${tileSize}%`,
        height: `${tileSize}%`,
      }}
    >
      <img src={tileArt} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      <img src={tileGradient} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" draggable={false} />
      <img src={tileInnerDeco} alt="" className="absolute inset-0 h-full w-full object-fill opacity-90" draggable={false} />
      <img src={tileGlow} alt="" className="absolute inset-0 h-full w-full object-fill opacity-80" draggable={false} />

      {isSelected && (
        <>
          <img src={tileFocusGlow} alt="" className="absolute inset-[-4%] h-[108%] w-[108%] object-fill opacity-90" draggable={false} />
          <img src={tileFocusBorder} alt="" className="absolute inset-0 h-full w-full object-fill opacity-100" draggable={false} />
        </>
      )}

      <div className="absolute inset-[9%] rounded-[20%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.34),rgba(255,255,255,0.08)_36%,rgba(255,255,255,0)_60%)]" />
      <div className="absolute left-[16%] top-[10%] h-[18%] w-[44%] rounded-full bg-white/28 blur-[3px]" />

      <span
        className={clsx(
          'relative z-20 max-w-[78%] text-center font-black leading-[0.88] tracking-[-0.03em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]',
          labelSize,
          textColor,
        )}
      >
        {tile.display}
      </span>

      {tile.powerUp && (
        <div className="absolute right-[6%] top-[6%] z-30 flex h-[24%] w-[24%] items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,#f8fafc,#93c5fd)] shadow-[0_4px_10px_rgba(15,23,42,0.35)]">
          {getPowerUpIcon()}
        </div>
      )}
    </motion.button>
  );
};

export default Tile;
