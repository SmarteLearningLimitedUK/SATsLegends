import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import universalMapPoster from '../assets/maps/worlsmap.png';
import bluescrollmed from '../assets/bluedialoague/bluescrollmed.png';

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
  1: { x: 74, y: 75, width: 24, height: 15, labelX: 74, labelY: 84 },
  2: { x: 24, y: 38, width: 24, height: 15, labelX: 24, labelY: 48 },
  3: { x: 25, y: 56, width: 24, height: 15, labelX: 25, labelY: 65 },
  4: { x: 26, y: 75, width: 24, height: 15, labelX: 26, labelY: 84 },
  5: { x: 73, y: 40, width: 24, height: 15, labelX: 73, labelY: 49 },
  6: { x: 74, y: 20, width: 24, height: 15, labelX: 74, labelY: 30 },
};

const MAP_AMBIENTS: AmbientRegion[] = [
  { id: 'base-camp', x: 74, y: 75, width: 24, height: 16, effect: 'butterflies' },
  { id: 'fraction-forest', x: 24, y: 38, width: 24, height: 16, effect: 'light-beams' },
  { id: 'geometry-glacier', x: 25, y: 56, width: 24, height: 16, effect: 'blizzard' },
  { id: 'data-desert', x: 26, y: 75, width: 24, height: 16, effect: 'dust-devils' },
  { id: 'operations-outpost', x: 73, y: 40, width: 24, height: 16, effect: 'stars' },
  { id: 'mount-algebra', x: 74, y: 20, width: 24, height: 16, effect: 'lava-spurts' },
];

const ISLAND_LABELS: Record<number, string> = {
  1: 'Base Camp',
  2: 'Fraction Forest',
  3: 'Geometry Glacier',
  4: 'Data Desert',
  5: 'Operations Outpost',
  6: 'Mount Algebra',
};

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
      const isUnlocked = player.unlockedIslands.includes(island.id);
      const isCompleted = completion >= 100;
      const isInProgress = completion > 0 && completion < 100;

      return {
        island,
        isUnlocked,
        isCompleted,
        isInProgress,
        starredCount: starredLevels.length,
        totalLevels: island.levels.length,
        completion,
      };
    });
  }, [player]);

  const recommendedIslandId = useMemo(() => {
    const unlocked = islandProgress.filter(entry => entry.isUnlocked);
    if (!unlocked.length) return undefined;

    const inProgress = unlocked.find(entry => entry.isInProgress);
    if (inProgress) return inProgress.island.id;

    const freshUnlocked = unlocked.find(entry => entry.completion === 0);
    if (freshUnlocked) return freshUnlocked.island.id;

    const unfinished = unlocked.find(entry => !entry.isCompleted);
    if (unfinished) return unfinished.island.id;

    return unlocked[unlocked.length - 1]?.island.id;
  }, [islandProgress]);

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative overflow-visible"
        style={{
          width: '132%',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
          <img
            src={universalMapPoster}
            alt="Island select map"
            className="block h-auto w-full"
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
            {islandProgress.map(({ island, starredCount, totalLevels, completion, isUnlocked }) => {
              const hotspot = ISLAND_HOTSPOTS[island.id];
              if (!hotspot) return null;
              const isRecommended = isUnlocked && island.id === recommendedIslandId;

              return (
                <React.Fragment key={island.id}>
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${hotspot.x}%`,
                      top: `${hotspot.y}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                    }}
                  >
                    <motion.button
                      whileTap={isUnlocked ? { scale: 0.98 } : {}}
                      whileHover={isUnlocked ? { scale: 1.02 } : {}}
                      onClick={() => {
                        if (isUnlocked) onSelectIsland(island);
                      }}
                      disabled={!isUnlocked}
                      title={`${island.name} - ${island.themeName} - ${completion}% complete`}
                      aria-label={`${island.name}, ${island.themeName}, ${completion}% complete${isUnlocked ? '' : ', locked'}`}
                      className={`group relative h-full w-full rounded-[2rem] bg-transparent outline-none transition-all ${
                        isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                      } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                    >
                      <span className="sr-only">{`${island.name} in ${island.themeName}, ${completion}% complete`}</span>
                      <span
                        className={`pointer-events-none absolute inset-[8%] rounded-[2rem] transition-opacity duration-200 ${
                          isUnlocked
                            ? 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(34,211,238,0.25),rgba(2,6,23,0))]'
                            : 'opacity-100 bg-[linear-gradient(180deg,rgba(15,23,42,0.3),rgba(15,23,42,0.55))]'
                        }`}
                      />
                      {!isUnlocked ? (
                        <span className="pointer-events-none absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-slate-100/35 bg-slate-900/75 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-100">
                          <Lock className="h-3.5 w-3.5" />
                          Locked
                        </span>
                      ) : null}
                    </motion.button>
                  </div>

                  <button
                    onClick={() => {
                      if (isUnlocked) onSelectIsland(island);
                    }}
                    disabled={!isUnlocked}
                    aria-label={`${island.name} label, ${starredCount}/${totalLevels} cleared`}
                    className={`world-map-island-label absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center text-white outline-none transition-all ${
                      isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-70 grayscale-[0.15]'
                    } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                    style={{
                      left: `${hotspot.labelX}%`,
                      top: `${hotspot.labelY}%`,
                      textShadow: 'none',
                    }}
                  >
                    <span
                      className={`world-map-island-label-face ${
                        !isUnlocked
                          ? 'world-map-island-label-face-locked'
                          : completion === 0
                            ? 'world-map-island-label-face-idle'
                            : 'world-map-island-label-face-progress'
                      }`}
                      style={{
                        minWidth: '8.1rem',
                        padding: '0.28rem 0.82rem 0.34rem',
                        backgroundImage: `url(${bluescrollmed})`,
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    >
                      <span className="world-map-island-label-text block truncate whitespace-nowrap text-[7px] font-black uppercase leading-none tracking-[0.03em] opacity-90 md:text-[8px]">
                        {ISLAND_LABELS[island.id] || island.name}
                      </span>
                      <span className="relative z-[2] mt-0.5 block h-[4px] w-full overflow-hidden rounded-full border border-white/28 bg-slate-900/55 md:h-[5px]">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
                          style={{ width: `${completion}%` }}
                          aria-hidden="true"
                        />
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



