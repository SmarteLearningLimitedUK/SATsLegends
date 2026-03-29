import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import universalMapPoster from '../assets/maps/finalamendedworldmap.png';

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

type IslandState = {
  island: IslandData;
  isUnlocked: boolean;
  completion: number;
  starredCount: number;
  totalLevels: number;
};

const ISLAND_HOTSPOTS: Record<number, IslandHotspot> = {
  1: { x: 74, y: 75, width: 24, height: 15 },
  2: { x: 24, y: 38, width: 24, height: 15 },
  3: { x: 25, y: 56, width: 24, height: 15 },
  4: { x: 26, y: 75, width: 24, height: 15 },
  5: { x: 73, y: 40, width: 24, height: 15 },
  6: { x: 74, y: 20, width: 24, height: 15 },
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
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);

  const islandStates = useMemo<IslandState[]>(() => (
    ISLANDS.map(island => {
      const starredLevels = island.levels.filter(level => {
        const starKey = `${island.id}-${level.id}`;
        return (player.levelStars[starKey] || 0) >= 1;
      });
      const completion = Math.round((starredLevels.length / Math.max(1, island.levels.length)) * 100);

      return {
        island,
        isUnlocked: player.unlockedIslands.includes(island.id),
        completion,
        starredCount: starredLevels.length,
        totalLevels: island.levels.length,
      };
    })
  ), [player]);

  const selectedIslandState = islandStates.find(entry => entry.island.id === selectedIslandId) ?? null;

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative overflow-visible"
        style={{
          width: '116%',
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
          {islandStates.map(({ island, isUnlocked }) => {
            const hotspot = ISLAND_HOTSPOTS[island.id];
            if (!hotspot) return null;

            const isSelected = selectedIslandId === island.id;
            const pillTop = hotspot.y + hotspot.height / 2 + 1.8;
            const pillWidth = island.name.length > 15 ? '8.4rem' : island.name.length > 12 ? '7.6rem' : '6.8rem';

            return (
              <React.Fragment key={island.id}>
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                    width: `${hotspot.width}%`,
                    height: `${hotspot.height}%`,
                  }}
                >
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-[8%] rounded-[2rem]"
                    animate={{
                      opacity: isSelected ? 0.98 : 0.78,
                      scale: isSelected ? 1.08 : 1,
                      boxShadow: isSelected
                        ? '0 0 0 2px rgba(253,224,71,0.58), 0 0 32px rgba(34,211,238,0.58), 0 0 64px rgba(59,130,246,0.34)'
                        : '0 0 0 1px rgba(255,255,255,0.12), 0 0 18px rgba(34,211,238,0.38), 0 0 36px rgba(59,130,246,0.22)',
                    }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{
                      background: isUnlocked
                        ? 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(34,211,238,0.24) 34%, rgba(37,99,235,0.16) 56%, rgba(2,6,23,0) 78%)'
                        : 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(148,163,184,0.12) 34%, rgba(15,23,42,0.1) 56%, rgba(2,6,23,0) 78%)',
                    }}
                  />
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedIslandId(island.id)}
                  aria-label={`${island.name}${isUnlocked ? '' : ', locked'}`}
                  className={`absolute z-30 -translate-x-1/2 rounded-full border px-3 py-[0.42rem] text-center text-[8px] font-black uppercase tracking-[0.06em] text-white shadow-[0_6px_14px_rgba(2,6,23,0.28)] outline-none transition-all ${
                    isUnlocked
                      ? 'border-cyan-100/45 bg-[linear-gradient(180deg,rgba(73,144,255,0.98),rgba(38,92,210,0.98))]'
                      : 'border-slate-200/28 bg-[linear-gradient(180deg,rgba(71,85,105,0.94),rgba(30,41,59,0.96))] opacity-85'
                  } focus-visible:ring-4 focus-visible:ring-cyan-300/70`}
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${pillTop}%`,
                    minWidth: pillWidth,
                  }}
                >
                  <span className="block truncate whitespace-nowrap">{island.name}</span>
                </motion.button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedIslandState ? (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.8rem)] z-40 flex justify-center px-4"
          >
            <div className="pointer-events-auto relative w-full max-w-[20rem] rounded-[1.35rem] border border-cyan-100/28 bg-[linear-gradient(180deg,rgba(22,56,122,0.96),rgba(9,25,63,0.98))] px-4 py-3 text-white shadow-[0_18px_32px_rgba(2,6,23,0.42)] backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setSelectedIslandId(null)}
                aria-label="Close island details"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-slate-950/28 text-white/90 transition hover:bg-slate-900/44"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-center text-sm font-black uppercase tracking-[0.08em] text-cyan-50">
                {selectedIslandState.island.name}
              </div>
              <div className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-100/82">
                {selectedIslandState.starredCount}/{selectedIslandState.totalLevels} levels cleared
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
                  style={{ width: `${selectedIslandState.completion}%` }}
                />
              </div>
              <div className="mt-1 text-center text-[11px] font-black uppercase tracking-[0.12em] text-amber-100">
                {selectedIslandState.completion}% progress
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedIslandState.isUnlocked) onSelectIsland(selectedIslandState.island);
                }}
                disabled={!selectedIslandState.isUnlocked}
                className={`mt-3 w-full rounded-full px-4 py-3 text-sm font-black uppercase tracking-[0.12em] transition-all ${
                  selectedIslandState.isUnlocked
                    ? 'bg-[linear-gradient(180deg,#f8d66b_0%,#f2a82c_100%)] text-slate-950 shadow-[0_6px_0_rgba(146,87,8,0.8),0_14px_22px_rgba(2,6,23,0.28)]'
                    : 'cursor-not-allowed bg-slate-700/80 text-slate-200 opacity-75'
                }`}
              >
                {selectedIslandState.isUnlocked ? 'Explore Island' : 'Island Locked'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default WorldMap;
