import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import islandSelectPoster from '../assets/islandselect.png';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
}

type IslandHotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ISLAND_HOTSPOTS: Record<number, IslandHotspot> = {
  1: { x: 69, y: 82, width: 24, height: 15 },
  2: { x: 27, y: 37, width: 27, height: 17 },
  3: { x: 72, y: 16, width: 24, height: 16 },
  4: { x: 69, y: 59, width: 23, height: 15 },
  5: { x: 73, y: 36, width: 25, height: 16 },
  6: { x: 28, y: 59, width: 27, height: 16 },
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
      <div className="relative mx-auto flex h-full w-full max-w-[34rem] items-center justify-center px-3 py-3 md:max-w-[38rem] md:px-5 md:py-5">
        <div className="relative h-full w-full overflow-hidden rounded-[2.4rem] bg-slate-950 shadow-[0_28px_84px_rgba(2,6,23,0.52)] md:rounded-[3rem]">
          <img
            src={islandSelectPoster}
            alt="Island select map"
            className="h-full w-full object-contain"
            draggable={false}
          />

          <div className="absolute inset-0">
            {islandProgress.map(({ island, isUnlocked, completion }) => {
              const hotspot = ISLAND_HOTSPOTS[island.id];
              if (!hotspot) return null;

              return (
                <motion.button
                  key={island.id}
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
                    className={`pointer-events-none absolute inset-[10%] rounded-[2rem] transition-opacity duration-200 ${
                      isUnlocked
                        ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 bg-[radial-gradient(circle,rgba(255,255,255,0.08),rgba(34,211,238,0.14),rgba(2,6,23,0))]'
                        : 'opacity-0'
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
