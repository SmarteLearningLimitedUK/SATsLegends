import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import islandReskinPoster from '../assets/maps/finalislandreskin.png';
import welcomeMathLogo from '../assets/maps/welcomemathlogo.png';
import AssetIcon from '../components/AssetIcon';

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
  1: { x: 24, y: 20, width: 24, height: 15, labelX: 24, labelY: 28 },
  2: { x: 24, y: 38, width: 24, height: 15, labelX: 24, labelY: 46 },
  3: { x: 73, y: 40, width: 24, height: 15, labelX: 73, labelY: 47 },
  4: { x: 74, y: 57, width: 25, height: 15, labelX: 74, labelY: 64 },
  5: { x: 25, y: 56, width: 24, height: 15, labelX: 25, labelY: 63 },
  6: { x: 74, y: 20, width: 24, height: 15, labelX: 74, labelY: 28 },
  7: { x: 26, y: 75, width: 24, height: 15, labelX: 26, labelY: 81 },
  8: { x: 74, y: 75, width: 24, height: 15, labelX: 74, labelY: 83 },
};

const MAP_AMBIENTS: AmbientRegion[] = [
  { id: 'base-camp', x: 24, y: 20, width: 24, height: 16, effect: 'butterflies' },
  { id: 'measure-mountain', x: 74, y: 20, width: 24, height: 16, effect: 'lava-spurts' },
  { id: 'fraction-lagoon', x: 24, y: 38, width: 24, height: 16, effect: 'blizzard' },
  { id: 'fraction-crystals', x: 24, y: 37, width: 20, height: 13, effect: 'light-beams' },
  { id: 'operations-outpost', x: 73, y: 40, width: 24, height: 16, effect: 'stars' },
  { id: 'geometry-gorge', x: 25, y: 56, width: 24, height: 16, effect: 'sparkles' },
  { id: 'ratio-reef', x: 74, y: 57, width: 24, height: 16, effect: 'birds' },
  { id: 'data-desert', x: 26, y: 75, width: 24, height: 16, effect: 'dust-devils' },
  { id: 'sats-summit', x: 74, y: 75, width: 24, height: 16, effect: 'wind-wisps' },
];

const ISLAND_LABELS: Record<number, string> = {
  1: 'Base Camp',
  2: 'Fraction Lagoon',
  3: 'Ops Outpost',
  4: 'Ratio Reef',
  5: 'Geometry Gorge',
  6: 'Measure Mountain',
  7: 'Data Desert',
  8: 'SATs Summit',
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
  const formatResetCountdown = () => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const [resetCountdown, setResetCountdown] = useState<string>(() => formatResetCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => setResetCountdown(formatResetCountdown()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const totalStars = player.stats?.totalStars ?? 0;
  const pendingTasks = (player.dailyQuests || []).filter(quest => !quest.isClaimed).length;

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
      className="premium-page-root premium-hub-map relative h-full w-full overflow-y-auto overflow-x-hidden"
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehaviorY: 'contain',
      }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="world-map-top-hud pointer-events-auto">
          <div className="world-map-stat-pill">
            <span className="world-map-stat-icon world-map-stat-icon-coin">
              <AssetIcon name="coin" className="h-5 w-5" />
            </span>
            <span className="world-map-stat-value">{player.coins.toLocaleString()}</span>
            <span className="world-map-plus-pill">+</span>
          </div>
          <div className="world-map-stat-pill">
            <span className="world-map-stat-icon world-map-stat-icon-heart">
              <AssetIcon name="heart" className="h-5 w-5" />
              <span className="world-map-heart-count">{player.dailyStreak}</span>
            </span>
            <span className="world-map-stat-value">{resetCountdown}</span>
            <span className="world-map-plus-pill">+</span>
          </div>
          <div className="world-map-stat-pill">
            <span className="world-map-stat-icon world-map-stat-icon-star">
              <AssetIcon name="star" className="h-5 w-5" />
            </span>
            <span className="world-map-stat-value">{totalStars}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+3.2rem)]">
        <img
          src={welcomeMathLogo}
          alt="Welcome to Matharia"
          className="h-auto w-[min(88vw,36rem)] select-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          draggable={false}
        />
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom)+6.8rem)] md:bottom-[calc(env(safe-area-inset-bottom)+6.6rem)]">
        <div className="world-map-cta-row pointer-events-auto">
          <button type="button" className="world-map-cta world-map-cta-tasks">
            Tasks{pendingTasks > 0 ? ` (${pendingTasks})` : ''}
          </button>
        </div>
      </div>

      <div
        className="premium-map-stage premium-map-stage-fullscreen relative w-full"
        style={{ minHeight: 'max(132dvh, calc(100vw * 2))' }}
      >
        <img
          src={islandReskinPoster}
          alt="Island select map"
          className="absolute inset-0 block h-full w-full max-w-none object-cover object-top"
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
                  title={`${island.name} - ${island.themeName} - ${completion}% complete`}
                  aria-label={`${island.name}, ${island.themeName}, ${completion}% complete${isUnlocked ? '' : ', locked'}`}
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
                  <span className="sr-only">{`${island.name} in ${island.themeName}, ${completion}% complete`}</span>
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
                  aria-label={`${island.name} label`}
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
                      {ISLAND_LABELS[island.id] || island.name}
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
