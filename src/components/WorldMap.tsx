import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import islandSelectPoster from '../assets/islandselect.png';
import smallButtonBase from '../assets/fantasy_hero/buttons/small_purple.png';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
}

type IslandHotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
};

const ISLAND_HOTSPOTS: Record<number, IslandHotspot> = {
  1: { x: 69, y: 82, width: 24, height: 15, labelX: 69, labelY: 91 },
  2: { x: 27, y: 37, width: 27, height: 17, labelX: 27, labelY: 46 },
  3: { x: 72, y: 16, width: 24, height: 16, labelX: 72, labelY: 25 },
  4: { x: 69, y: 59, width: 23, height: 15, labelX: 69, labelY: 68 },
  5: { x: 73, y: 36, width: 25, height: 16, labelX: 73, labelY: 45 },
  6: { x: 28, y: 59, width: 27, height: 16, labelX: 28, labelY: 68 },
};

const WorldMap: React.FC<WorldMapProps> = ({ player, onSelectIsland }) => {
  const islandProgress = useMemo(() => {
    return ISLANDS.map(island => {
      const completed = player.completedLevels[island.id] || [];
      const completion = Math.round((completed.length / island.levels.length) * 100);

      return {
        island,
        isUnlocked: player.unlockedIslands.includes(island.id),
        completion,
      };
    });
  }, [player]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={islandSelectPoster}
        alt="Island select map"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0">
        {islandProgress.map(({ island, isUnlocked, completion }) => {
          const hotspot = ISLAND_HOTSPOTS[island.id];
          if (!hotspot) return null;

          return (
            <React.Fragment key={island.id}>
              <motion.button
                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (isUnlocked) onSelectIsland(island);
                }}
                disabled={!isUnlocked}
                title={`${island.themeName || island.name} - ${completion}% complete`}
                aria-label={`${island.themeName || island.name}, ${completion}% complete${isUnlocked ? '' : ', locked'}`}
                className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-transparent outline-none transition-all ${
                  isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                }}
              >
                <span className="sr-only">{`${island.themeName || island.name} ${completion}% complete`}</span>
                <span
                  className={`pointer-events-none absolute inset-[8%] rounded-[2rem] transition-opacity duration-200 ${
                    isUnlocked
                      ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 bg-[radial-gradient(circle,rgba(255,255,255,0.08),rgba(34,211,238,0.2),rgba(2,6,23,0))]'
                      : 'opacity-0'
                  }`}
                />
              </motion.button>

              <motion.button
                whileHover={isUnlocked ? { scale: 1.03, y: -2 } : {}}
                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (isUnlocked) onSelectIsland(island);
                }}
                disabled={!isUnlocked}
                aria-label={`${island.themeName || island.name} label`}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 px-4 pb-2 pt-1.5 text-center text-white outline-none transition-all ${
                  isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-70 grayscale-[0.15]'
                } focus-visible:ring-4 focus-visible:ring-cyan-300/70 rounded-[1.25rem]`}
                style={{
                  left: `${hotspot.labelX}%`,
                  top: `${hotspot.labelY}%`,
                  minWidth: '9.5rem',
                  backgroundImage: `url(${smallButtonBase})`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '100% 100%',
                  filter: 'drop-shadow(0 10px 18px rgba(15,23,42,0.22))',
                  textShadow: '0 1px 0 rgba(0,0,0,0.24)',
                }}
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.08em] md:text-[11px]">
                  {island.themeName || island.name}
                </span>
                <span className="block text-[10px] font-black text-white/85 md:text-[11px]">
                  {completion}%
                </span>
              </motion.button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorldMap;
