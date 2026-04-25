import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import universalMapPoster from '../assets/maps/mapselect.png';
import AssetIcon from '../components/AssetIcon';
import ParentGateOverlay from '../components/ParentGateOverlay';
import { UNLOCK_ALL_LEVELS } from '../app/testingFlags';

interface WorldMapProps {
  player: PlayerData;
  onSelectIsland: (island: IslandData) => void;
  onOpenShop: () => void;
  onOpenAchievements: () => void;
  onOpenParentReport: () => void;
}

type IslandState = {
  island: IslandData;
  isUnlocked: boolean;
  completion: number;
  earnedBrainpower: number;
  totalPossibleBrainpower: number;
};

type IslandHotspot = {
  islandId: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type IslandAccentFrame = {
  width: string;
  height: string;
  top: string;
  left: string;
};

const MAP_WIDTH_PX = 768;
const MAP_HEIGHT_PX = 2500;

const ISLAND_HOTSPOTS: IslandHotspot[] = [
  {
    islandId: 8,
    x: 52.47,
    y: 17.38,
    width: 93.49,
    height: 5.56,
  },
  {
    islandId: 6,
    x: 37.5,
    y: 25.72,
    width: 63.02,
    height: 5.52,
  },
  {
    islandId: 5,
    x: 63.67,
    y: 34.32,
    width: 62.76,
    height: 5.52,
  },
  {
    islandId: 3,
    x: 45.44,
    y: 45.16,
    width: 62.76,
    height: 5.52,
  },
  {
    islandId: 2,
    x: 52.73,
    y: 54.98,
    width: 82.55,
    height: 5.72,
  },
  {
    islandId: 4,
    x: 50,
    y: 66.74,
    width: 63.02,
    height: 5.56,
  },
  {
    islandId: 7,
    x: 54.17,
    y: 79.5,
    width: 75,
    height: 5.56,
  },
  {
    islandId: 1,
    x: 35.94,
    y: 91.62,
    width: 63.02,
    height: 5.56,
  },
];

const ISLAND_ACCENT_FRAMES: Partial<Record<number, IslandAccentFrame>> = {
  1: { left: '50%', top: '18%', width: '58%', height: '42%' },
  2: { left: '54%', top: '57%', width: '64%', height: '64%' },
  3: { left: '50%', top: '52%', width: '62%', height: '66%' },
  4: { left: '50%', top: '56%', width: '62%', height: '64%' },
  5: { left: '50%', top: '49%', width: '70%', height: '60%' },
  6: { left: '50%', top: '45%', width: '56%', height: '70%' },
  7: { left: '52%', top: '52%', width: '66%', height: '62%' },
  8: { left: '50%', top: '46%', width: '58%', height: '74%' },
};

const getIslandAccentFrame = (islandId: number): IslandAccentFrame => (
  ISLAND_ACCENT_FRAMES[islandId] ?? {
    left: '50%',
    top: '50%',
    width: '68%',
    height: '68%',
  }
);

const renderIslandAccent = (islandId: number) => {
  switch (islandId) {
    case 8:
      return (
        <div className="world-map-core-smoke pointer-events-none absolute inset-0 z-10">
          <div className="world-map-core-smoke-ring world-map-core-smoke-ring-a" />
          <div className="world-map-core-smoke-ring world-map-core-smoke-ring-b" />
          <div className="world-map-core-smoke-puff world-map-core-smoke-puff-a" />
          <div className="world-map-core-smoke-puff world-map-core-smoke-puff-b" />
          <div className="world-map-core-smoke-puff world-map-core-smoke-puff-c" />
        </div>
      );
    case 6:
      return (
        <div className="world-map-volcano-accent pointer-events-none absolute inset-0 z-10">
          {[0, 1, 2, 3, 4].map(index => (
            <span
              key={`measurement-lava-rock-${index}`}
              className={`world-map-lava-rock world-map-lava-rock-${index + 1}`}
              style={{
                animationDelay: `${index * 0.32}s`,
                animationDuration: `${2.2 + (index % 3) * 0.22}s`,
              }}
            />
          ))}
        </div>
      );
    case 5:
      return (
        <>
          {[0, 1, 2].map(index => (
            <span
              key={`operations-beam-${index}`}
              className="world-map-light-beam"
              style={{
                left: `${24 + index * 16}%`,
                top: `${14 + index * 3}%`,
                transform: `rotate(${index * 7 - 8}deg)`,
                animationDelay: `${index * 0.8}s`,
                animationDuration: `${4.6 + index * 0.4}s`,
              }}
            />
          ))}
          {[0, 1].map(index => (
            <span
              key={`operations-bird-${index}`}
              className="world-map-orbit world-map-orbit-birds"
              style={{ animationDelay: `${index * 1.15}s`, animationDuration: `${7.1 + index * 0.5}s` }}
            >
              <span className="world-map-bird" />
            </span>
          ))}
        </>
      );
    case 3:
      return (
        <>
          {[0, 1, 2, 3].map(index => (
            <span
              key={`geometry-snow-${index}`}
              className="world-map-snowflake"
              style={{
                left: `${16 + index * 12}%`,
                top: `${8 + (index % 2) * 12}%`,
                animationDelay: `${index * 0.42}s`,
                animationDuration: `${3.6 + (index % 3) * 0.4}s`,
              }}
            />
          ))}
          {[0, 1].map(index => (
            <span
              key={`geometry-wisp-${index}`}
              className="world-map-wind-wisp"
              style={{
                left: `${22 + index * 24}%`,
                top: `${28 + index * 7}%`,
                animationDelay: `${index * 0.95}s`,
                animationDuration: `${5.6 + index * 0.5}s`,
              }}
            />
          ))}
        </>
      );
    case 2:
      return (
        <>
          {[0, 1, 2].map(index => (
            <span
              key={`fraction-butterfly-${index}`}
              className="world-map-butterfly"
              style={{
                left: `${22 + index * 19}%`,
                top: `${22 - index * 2}%`,
                animationDelay: `${index * 0.85}s`,
                animationDuration: `${5.2 + index * 0.4}s`,
              }}
            />
          ))}
          {[0, 1, 2].map(index => (
            <span
              key={`fraction-bubble-${index}`}
              className="world-map-bubble"
              style={{
                left: `${28 + index * 18}%`,
                bottom: `${8 + index * 2}%`,
                animationDelay: `${index * 0.7}s`,
                animationDuration: `${4.4 + index * 0.4}s`,
              }}
            />
          ))}
        </>
      );
    case 4:
      return (
        <>
          {[0, 1, 2].map(index => (
            <span
              key={`data-dust-${index}`}
              className="world-map-dust-devil"
              style={{
                left: `${22 + index * 18}%`,
                bottom: `${12 + (index % 2) * 8}%`,
                animationDelay: `${index * 1.1}s`,
                animationDuration: `${4.5 + index * 0.4}s`,
              }}
            />
          ))}
          {[0, 1].map(index => (
            <span
              key={`data-wisp-${index}`}
              className="world-map-wind-wisp"
              style={{
                left: `${26 + index * 26}%`,
                top: `${18 + index * 10}%`,
                animationDelay: `${index * 1.2}s`,
                animationDuration: `${5.8 + index * 0.4}s`,
              }}
            />
          ))}
        </>
      );
    case 7:
      return (
        <>
          {[0, 1, 2].map(index => (
            <span
              key={`ratio-steam-puff-${index}`}
              className="world-map-volcano-smoke"
              style={{
                left: `${20 + index * 18}%`,
                top: `${2 + index * 2}%`,
                width: `${12 + index * 2}%`,
                height: `${12 + index * 2}%`,
                animationDuration: `${3.6 + index * 0.35}s`,
              }}
            />
          ))}
          {[0, 1, 2].map(index => (
            <span
              key={`ratio-bubble-${index}`}
              className="world-map-bubble"
              style={{
                left: `${18 + index * 22}%`,
                bottom: `${6 + index * 2}%`,
                animationDelay: `${index * 0.6}s`,
                animationDuration: `${4.5 + index * 0.35}s`,
              }}
            />
          ))}
        </>
      );
    case 1:
      return (
        <div className="world-map-acropolis-swirl pointer-events-none absolute inset-0 z-10">
          <span className="world-map-acropolis-swirl-ring world-map-acropolis-swirl-ring-a" />
          <span className="world-map-acropolis-swirl-ring world-map-acropolis-swirl-ring-b" />
          <span className="world-map-acropolis-swirl-spark world-map-acropolis-swirl-spark-a">+</span>
          <span className="world-map-acropolis-swirl-spark world-map-acropolis-swirl-spark-b">&divide;</span>
          <span className="world-map-acropolis-swirl-spark world-map-acropolis-swirl-spark-c">%</span>
        </div>
      );
    default:
      return (
        <div
          className="world-map-island-breathe pointer-events-none absolute inset-0 z-10"
          style={{
            animationDuration: `${6.2 + (islandId % 4) * 0.6}s`,
            animationDelay: `${(islandId % 5) * 0.18}s`,
          }}
        >
          <div
            className="world-map-island-halo"
            style={{
              animationDuration: `${7.4 + (islandId % 3) * 0.45}s`,
              animationDelay: `${(islandId % 7) * 0.12}s`,
            }}
          />
        </div>
      );
  }
};

const WorldMap: React.FC<WorldMapProps> = ({
  player,
  onSelectIsland,
  onOpenShop,
  onOpenAchievements,
  onOpenParentReport,
}) => {
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  const [showParentGate, setShowParentGate] = useState(false);
  const islandStates = useMemo<IslandState[]>(() => (
    ISLANDS.map(island => {
      // Brainpower is the sum of earned stars (0-3) across all eligible levels.
      // Practice levels do not contribute to the total possible Brainpower.
      const nonPracticeLevels = island.levels.filter(level => level.isPractice !== true);
      const brainpowerLevels = nonPracticeLevels.length > 0 ? nonPracticeLevels : island.levels;

      const earnedBrainpower = brainpowerLevels.reduce((sum, level) => {
        const starKey = `${island.id}-${level.id}`;
        const stars = player.levelStars[starKey] || 0;
        return sum + Math.max(0, Math.min(3, stars));
      }, 0);

      const totalPossibleBrainpower = brainpowerLevels.length * 3;
      const completion = totalPossibleBrainpower > 0
        ? Math.round((Math.min(earnedBrainpower, totalPossibleBrainpower) / totalPossibleBrainpower) * 100)
        : 0;

      return {
        island,
        isUnlocked: UNLOCK_ALL_LEVELS || player.unlockedIslands.includes(island.id),
        completion,
        earnedBrainpower,
        totalPossibleBrainpower,
      };
    })
  ), [player]);

  const selectedIslandState = islandStates.find(entry => entry.island.id === selectedIslandId) ?? null;
  const useUnifiedHud = typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-unified-minigame-hud="true"]'));
  const actionDock = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-50 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-[1.2rem] border border-cyan-100/30 bg-slate-950/70 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.4)]">
        <button
          type="button"
          onClick={onOpenShop}
          className="ui-icon-button flex h-12 w-12 items-center justify-center text-white"
          aria-label="Open player profile"
        >
          <AssetIcon name="user" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onOpenAchievements}
          className="ui-icon-button flex h-12 w-12 items-center justify-center text-white"
          aria-label="Open achievements"
        >
          <AssetIcon name="trophy" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowParentGate(true)}
          className="ui-icon-button flex h-12 w-12 items-center justify-center text-white"
          aria-label="Open parent portal"
        >
          <AssetIcon name="doc" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-full w-full overflow-visible pb-4">
      <div
        className="relative mx-auto w-full overflow-hidden"
        style={{
          aspectRatio: `${MAP_WIDTH_PX} / ${MAP_HEIGHT_PX}`,
          maxWidth: `${MAP_WIDTH_PX}px`,
        }}
      >
        <img
          src={universalMapPoster}
          alt="Island select map"
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />

        <div className="absolute inset-0 z-20">
          {ISLAND_HOTSPOTS.map((hotspot) => {
            const islandState = islandStates.find(({ island }) => island.id === hotspot.islandId);
            if (!islandState) return null;
            const { island, isUnlocked } = islandState;

            return (
              <div
                key={`hotspot-${island.id}`}
                className="absolute"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width * 1.5}%`,
                  height: `${hotspot.height}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className={`pointer-events-none absolute inset-0 ${hotspot.islandId === 6 ? 'overflow-visible' : 'overflow-hidden'}`}>
                  {(() => {
                    const accentFrame = getIslandAccentFrame(hotspot.islandId);
                    return (
                  <div
                    className={`absolute ${hotspot.islandId === 6 ? 'overflow-visible' : 'overflow-hidden'}`}
                    style={{
                      ...accentFrame,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {renderIslandAccent(hotspot.islandId)}
                  </div>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIslandId(island.id)}
                  aria-label={`${island.name}${isUnlocked ? '' : ', locked'}`}
                  className="absolute inset-0 z-20 border border-transparent bg-transparent transition-all focus:outline-none"
                  data-button-skin="none"
                  style={{ opacity: 1 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {selectedIslandState ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.8rem)] z-40 flex justify-center px-4">
          <div className="pointer-events-auto relative w-full max-w-[20rem] px-4 py-4 text-white backdrop-blur-sm licensed-overlay-card">
            <button
              type="button"
              onClick={() => setSelectedIslandId(null)}
              aria-label="Close island details"
              className="ui-close-button absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-white/90"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center text-aaa-h2 text-cyan-50">
              {selectedIslandState.island.name}
            </div>
            <div className="mt-1 text-center text-aaa-micro text-cyan-100/82 opacity-90 font-bold">
              {selectedIslandState.earnedBrainpower}/{selectedIslandState.totalPossibleBrainpower} brainpower collected
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
                style={{ width: `${selectedIslandState.completion}%` }}
              />
            </div>
            <div className="mt-1 text-center text-aaa-sm text-amber-100">
              {selectedIslandState.completion}% progress
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedIslandState.isUnlocked) onSelectIsland(selectedIslandState.island);
              }}
              disabled={!selectedIslandState.isUnlocked}
              className={`mt-3 w-full rounded-full px-4 py-3 text-aaa-sm transition-all ${
                selectedIslandState.isUnlocked
                  ? 'ui-button-primary'
                  : 'cursor-not-allowed bg-slate-700/80 text-slate-200 opacity-75'
              }`}
            >
              {selectedIslandState.isUnlocked ? 'Explore Island' : 'Island Locked'}
            </button>
          </div>
        </div>
      ) : null}

      {useUnifiedHud ? null : actionDock}

      <ParentGateOverlay
        isOpen={showParentGate}
        onClose={() => setShowParentGate(false)}
        onUnlock={() => {
          setShowParentGate(false);
          onOpenParentReport();
        }}
      />
    </div>
  );
};

export default WorldMap;









