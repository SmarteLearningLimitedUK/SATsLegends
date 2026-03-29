import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import universalMapPoster from '../assets/maps/worlsmap.png';
import mapHeading1 from '../assets/maps/mapheadings/1.png';
import mapHeading2 from '../assets/maps/mapheadings/2.png';
import mapHeading3 from '../assets/maps/mapheadings/3.png';
import mapHeading4 from '../assets/maps/mapheadings/4.png';
import mapHeading5 from '../assets/maps/mapheadings/5.png';
import mapHeading6 from '../assets/maps/mapheadings/6.png';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
}

type IslandBannerAnchor = {
  x: number;
  y: number;
  width: number;
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

const ISLAND_BANNER_ANCHORS: Record<number, IslandBannerAnchor> = {
  1: { x: 74, y: 84.5, width: 26 },
  2: { x: 24, y: 47.5, width: 30 },
  3: { x: 25, y: 65.5, width: 30 },
  4: { x: 26, y: 84.5, width: 26 },
  5: { x: 73, y: 49, width: 31 },
  6: { x: 74, y: 29, width: 27 },
};

const ISLAND_NAME_BANNERS: Record<number, string> = {
  1: mapHeading1,
  2: mapHeading2,
  3: mapHeading3,
  4: mapHeading4,
  5: mapHeading5,
  6: mapHeading6,
};

const MAP_AMBIENTS: AmbientRegion[] = [
  { id: 'base-camp', x: 74, y: 75, width: 24, height: 16, effect: 'butterflies' },
  { id: 'fraction-forest', x: 24, y: 38, width: 24, height: 16, effect: 'light-beams' },
  { id: 'geometry-glacier', x: 25, y: 56, width: 24, height: 16, effect: 'blizzard' },
  { id: 'data-desert', x: 26, y: 75, width: 24, height: 16, effect: 'dust-devils' },
  { id: 'operations-outpost', x: 73, y: 40, width: 24, height: 16, effect: 'stars' },
  { id: 'mount-algebra', x: 74, y: 20, width: 24, height: 16, effect: 'lava-spurts' },
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
  const islandProgress = useMemo(() => (
    ISLANDS.map(island => {
      const starredLevels = island.levels.filter(level => {
        const starKey = `${island.id}-${level.id}`;
        return (player.levelStars[starKey] || 0) >= 1;
      });
      const completion = Math.round((starredLevels.length / island.levels.length) * 100);
      const isUnlocked = player.unlockedIslands.includes(island.id);

      return {
        island,
        isUnlocked,
        completion,
      };
    })
  ), [player]);

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
          {islandProgress.map(({ island, isUnlocked }) => {
            const bannerAnchor = ISLAND_BANNER_ANCHORS[island.id];
            const bannerAsset = ISLAND_NAME_BANNERS[island.id];
            if (!bannerAnchor || !bannerAsset) return null;

            return (
              <motion.button
                key={island.id}
                whileTap={isUnlocked ? { scale: 0.98 } : {}}
                whileHover={isUnlocked ? { scale: 1.02 } : {}}
                type="button"
                onClick={() => {
                  if (isUnlocked) onSelectIsland(island);
                }}
                disabled={!isUnlocked}
                title={`${island.name}${isUnlocked ? '' : ' - locked'}`}
                aria-label={`${island.name}${isUnlocked ? '' : ', locked'}`}
                className={`absolute z-20 -translate-x-1/2 text-center outline-none transition-all ${
                  isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                style={{
                  left: `${bannerAnchor.x}%`,
                  top: `${bannerAnchor.y}%`,
                  width: `${bannerAnchor.width}%`,
                }}
              >
                <img
                  src={bannerAsset}
                  alt={island.name}
                  className={`block h-auto w-full select-none drop-shadow-[0_10px_18px_rgba(2,6,23,0.42)] ${
                    isUnlocked ? '' : 'grayscale-[0.35] brightness-[0.88]'
                  }`}
                  draggable={false}
                />
                {!isUnlocked ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-100/35 bg-slate-900/78 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-100">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
