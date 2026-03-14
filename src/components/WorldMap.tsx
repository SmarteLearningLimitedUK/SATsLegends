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
  labelX: number;
  labelY: number;
};

type AmbientRegion = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  effect:
    | 'butterflies'
    | 'sparkles'
    | 'birds'
    | 'light-beams'
    | 'stars'
    | 'dust-devils'
    | 'blizzard'
    | 'wind-wisps'
    | 'lava-spurts';
};

const ISLAND_HOTSPOTS: Record<number, IslandHotspot> = {
  1: { x: 24, y: 70, width: 22, height: 15, labelX: 25, labelY: 76 },
  2: { x: 28, y: 40, width: 24, height: 16, labelX: 29, labelY: 46 },
  3: { x: 71, y: 55, width: 24, height: 16, labelX: 71, labelY: 61 },
  4: { x: 68, y: 86, width: 23, height: 14, labelX: 68, labelY: 91 },
  5: { x: 73, y: 29, width: 25, height: 16, labelX: 73, labelY: 35 },
  6: { x: 50, y: 12, width: 26, height: 17, labelX: 50, labelY: 19 },
};

const MAP_AMBIENTS: AmbientRegion[] = [
  { id: 'lava-island', x: 50, y: 10, width: 24, height: 18, effect: 'lava-spurts' },
  { id: 'starlight-city', x: 73, y: 28, width: 24, height: 18, effect: 'stars' },
  { id: 'ice-island', x: 28, y: 39, width: 24, height: 18, effect: 'blizzard' },
  { id: 'crystal-refract', x: 28, y: 39, width: 18, height: 14, effect: 'light-beams' },
  { id: 'ruins-island', x: 71, y: 54, width: 24, height: 18, effect: 'dust-devils' },
  { id: 'lush-grove', x: 24, y: 69, width: 21, height: 16, effect: 'butterflies' },
  { id: 'desert-oasis', x: 68, y: 85, width: 22, height: 15, effect: 'birds' },
];

const renderAmbientEffect = (effect: AmbientRegion['effect']) => {
  switch (effect) {
    case 'butterflies':
      return (
        <>
          {[
            { left: '18%', top: '28%', delay: '0s', duration: '5.4s' },
            { left: '44%', top: '16%', delay: '1.1s', duration: '6.1s' },
            { left: '68%', top: '24%', delay: '2s', duration: '5.8s' },
          ].map((item, index) => (
            <span
              key={`butterfly-${index}`}
              className="world-map-butterfly"
              style={{ left: item.left, top: item.top, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
        </>
      );

    case 'sparkles':
      return (
        <>
          {[
            { left: '28%', bottom: '10%', delay: '0s', duration: '4.8s' },
            { left: '50%', bottom: '8%', delay: '1s', duration: '5.6s' },
            { left: '68%', bottom: '14%', delay: '1.8s', duration: '5.2s' },
          ].map((item, index) => (
            <span
              key={`bubble-${index}`}
              className="world-map-bubble"
              style={{ left: item.left, bottom: item.bottom, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
          {[
            { left: '34%', bottom: '36%', delay: '0.8s', duration: '3.6s' },
            { left: '58%', bottom: '52%', delay: '1.6s', duration: '3.1s' },
            { left: '46%', bottom: '70%', delay: '2.2s', duration: '3.8s' },
          ].map((item, index) => (
            <span
              key={`sparkle-${index}`}
              className="world-map-sparkle"
              style={{ left: item.left, bottom: item.bottom, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
        </>
      );

    case 'birds':
      return (
        <>
          {[0, 1, 2].map(index => (
            <span
              key={`bird-${index}`}
              className="world-map-orbit world-map-orbit-birds"
              style={{ animationDelay: `${index * 1.2}s`, animationDuration: `${7.2 + index * 0.6}s` }}
            >
              <span className="world-map-bird" />
            </span>
          ))}
        </>
      );

    case 'light-beams':
      return (
        <>
          {[
            { left: '26%', top: '8%', delay: '0s', duration: '4.2s', rotate: '-14deg' },
            { left: '48%', top: '4%', delay: '1.3s', duration: '4.8s', rotate: '0deg' },
            { left: '64%', top: '10%', delay: '2.1s', duration: '4.5s', rotate: '16deg' },
          ].map((item, index) => (
            <span
              key={`beam-${index}`}
              className="world-map-light-beam"
              style={{
                left: item.left,
                top: item.top,
                transform: `rotate(${item.rotate})`,
                animationDelay: item.delay,
                animationDuration: item.duration,
              }}
            />
          ))}
        </>
      );

    case 'stars':
      return (
        <>
          {[0, 1, 2, 3].map(index => (
            <span
              key={`star-orbit-${index}`}
              className="world-map-orbit world-map-orbit-stars"
              style={{ animationDelay: `${index * 0.7}s`, animationDuration: `${6.4 + index * 0.5}s` }}
            >
              <span className="world-map-star" />
            </span>
          ))}
        </>
      );

    case 'dust-devils':
      return (
        <>
          {[
            { left: '26%', bottom: '12%', delay: '0s', duration: '4.6s' },
            { left: '52%', bottom: '16%', delay: '1.4s', duration: '5.1s' },
            { left: '68%', bottom: '20%', delay: '2.2s', duration: '4.8s' },
          ].map((item, index) => (
            <span
              key={`dust-${index}`}
              className="world-map-dust-devil"
              style={{ left: item.left, bottom: item.bottom, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
        </>
      );

    case 'blizzard':
      return (
        <>
          {[0, 1, 2, 3, 4, 5].map(index => (
            <span
              key={`snow-${index}`}
              className="world-map-snowflake"
              style={{
                left: `${14 + index * 12}%`,
                top: `${10 + (index % 3) * 18}%`,
                animationDelay: `${index * 0.55}s`,
                animationDuration: `${3.8 + (index % 3) * 0.5}s`,
              }}
            />
          ))}
          {[0, 1, 2].map(index => (
            <span
              key={`gust-${index}`}
              className="world-map-snow-gust"
              style={{
                left: `${18 + index * 18}%`,
                top: `${22 + index * 12}%`,
                animationDelay: `${index * 0.9}s`,
                animationDuration: `${3.4 + index * 0.4}s`,
              }}
            />
          ))}
        </>
      );

    case 'wind-wisps':
      return (
        <>
          {[
            { left: '22%', top: '24%', delay: '0s', duration: '4.6s' },
            { left: '48%', top: '16%', delay: '1.3s', duration: '5.1s' },
            { left: '58%', top: '38%', delay: '2.1s', duration: '4.4s' },
          ].map((item, index) => (
            <span
              key={`wisp-${index}`}
              className="world-map-wind-wisp"
              style={{ left: item.left, top: item.top, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
        </>
      );

    case 'lava-spurts':
      return (
        <>
          {[
            { left: '28%', bottom: '22%', delay: '0s', duration: '3.6s' },
            { left: '48%', bottom: '28%', delay: '1.1s', duration: '4.1s' },
            { left: '66%', bottom: '20%', delay: '2s', duration: '3.8s' },
          ].map((item, index) => (
            <span
              key={`lava-${index}`}
              className="world-map-lava-spurt"
              style={{ left: item.left, bottom: item.bottom, animationDelay: item.delay, animationDuration: item.duration }}
            />
          ))}
        </>
      );
  }
};

const WorldMap: React.FC<WorldMapProps> = ({ player, onSelectIsland }) => {
  const islandProgress = useMemo(() => {
    return ISLANDS.map(island => {
      const starredLevels = island.levels.filter(level => {
        const starKey = `${island.id}-${level.id}`;
        return (player.levelStars[starKey] || 0) >= 1;
      });
      const completion = Math.round((starredLevels.length / island.levels.length) * 100);

      return {
        island,
        isUnlocked: player.unlockedIslands.includes(island.id),
        completion,
      };
    });
  }, [player]);

  return (
    <div
      className="relative h-full w-full overflow-hidden md:overflow-y-auto md:overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      <div className="relative h-full w-full md:h-auto md:min-h-full md:aspect-[1024/1792] lg:mx-auto lg:max-w-[56rem]">
        <img
          src={islandSelectPoster}
          alt="Island select map"
          className="absolute inset-0 h-full w-full object-cover md:object-cover md:object-top lg:object-contain"
          draggable={false}
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          {MAP_AMBIENTS.map(region => (
            <div
              key={region.id}
              className={`world-map-ambient world-map-ambient-${region.effect}`}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
            >
              {renderAmbientEffect(region.effect)}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 z-20">
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

                <button
                  onClick={() => {
                    if (isUnlocked) onSelectIsland(island);
                  }}
                  disabled={!isUnlocked}
                  aria-label={`${island.themeName || island.name} label`}
                  className={`world-map-island-label absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center text-white outline-none transition-all ${
                    isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-70 grayscale-[0.15]'
                  } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                  style={{
                    left: `${hotspot.labelX}%`,
                    top: `${hotspot.labelY}%`,
                    textShadow: '0 1px 0 rgba(0,0,0,0.24)',
                  }}
                >
                  <span className={`world-map-island-label-face ${
                    !isUnlocked
                      ? 'world-map-island-label-face-locked'
                      : completion === 0
                        ? 'world-map-island-label-face-idle'
                        : 'world-map-island-label-face-progress'
                  }`}>
                    {isUnlocked && completion > 0 && (
                      <span
                        className="world-map-island-progress-fill"
                        style={{ width: `${completion}%` }}
                        aria-hidden="true"
                      >
                        <span className="world-map-island-progress-shimmer" />
                      </span>
                    )}
                    <span className="world-map-island-label-text block text-[9px] font-black uppercase leading-none tracking-[0.06em] md:text-[10px]">
                      {island.themeName || island.name}
                    </span>
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
