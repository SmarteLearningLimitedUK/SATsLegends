import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import universalMapPoster from '../assets/maps/mapselect.png';
import AssetIcon from '../components/AssetIcon';
import ParentGateOverlay from '../components/ParentGateOverlay';

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
  starredCount: number;
  totalLevels: number;
};

type IslandHotspot = {
  islandId: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
  const useUnifiedHud = typeof document !== 'undefined'
    && Boolean(document.querySelector('[data-unified-minigame-hud="true"]'));
  const actionDock = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-50 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-[1.2rem] border border-cyan-100/30 bg-slate-950/70 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.4)]">
        <button
          type="button"
          onClick={onOpenShop}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
          aria-label="Open shop"
        >
          <AssetIcon name="coin" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onOpenAchievements}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
          aria-label="Open achievements"
        >
          <AssetIcon name="trophy" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setShowParentGate(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"
          aria-label="Open parent report"
        >
          <AssetIcon name="people" className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative mx-auto w-full overflow-hidden"
        style={{ aspectRatio: `${MAP_WIDTH_PX} / ${MAP_HEIGHT_PX}` }}
      >
        <img
          src={universalMapPoster}
          alt="Island select map"
          className="absolute inset-0 h-full w-full object-cover"
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
                {hotspot.islandId === 8 ? (
                  <div className="world-map-core-smoke pointer-events-none absolute inset-0 z-10">
                    <div className="world-map-core-smoke-puff world-map-core-smoke-puff-a" />
                    <div className="world-map-core-smoke-puff world-map-core-smoke-puff-b" />
                    <div className="world-map-core-smoke-puff world-map-core-smoke-puff-c" />
                  </div>
                ) : hotspot.islandId === 6 ? (
                  <div className="world-map-volcano-accent pointer-events-none absolute inset-0 z-10">
                    <div className="world-map-volcano-flame world-map-volcano-flame-primary" />
                    <div className="world-map-volcano-flame world-map-volcano-flame-secondary" />
                    <div className="world-map-volcano-smoke" />
                  </div>
                ) : (
                  <div
                    className="world-map-island-breathe pointer-events-none absolute inset-0 z-10"
                    style={{
                      animationDuration: `${6.2 + (hotspot.islandId % 4) * 0.6}s`,
                      animationDelay: `${(hotspot.islandId % 5) * 0.18}s`,
                    }}
                  >
                    <div
                      className="world-map-island-halo"
                      style={{
                        animationDuration: `${7.4 + (hotspot.islandId % 3) * 0.45}s`,
                        animationDelay: `${(hotspot.islandId % 7) * 0.12}s`,
                      }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIslandId(island.id)}
                  aria-label={`${island.name}${isUnlocked ? '' : ', locked'}`}
                  className="absolute inset-0 z-20 border border-transparent bg-transparent transition-all focus:outline-none"
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
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-slate-950/28 text-white/90 transition hover:bg-slate-900/44"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center text-aaa-h2 text-cyan-50">
              {selectedIslandState.island.name}
            </div>
            <div className="mt-1 text-center text-aaa-micro text-cyan-100/82 opacity-90 font-bold">
              {selectedIslandState.starredCount}/{selectedIslandState.totalLevels} levels cleared
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
                  ? 'ui-button-primary shadow-[0_6px_0_rgba(146,87,8,0.8),0_14px_22px_rgba(2,6,23,0.28)]'
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









