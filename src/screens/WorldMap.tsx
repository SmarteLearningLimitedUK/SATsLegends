import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IslandData, PlayerData } from '../types';
import { ISLANDS } from '../constants';
import islandAtlas from '../assets/maps/island-atlas-rich.webp';
import mathariaLogo from '../assets/maps/matharia-logo.png';
import AssetIcon from '../components/AssetIcon';
import ParentGateOverlay from '../components/ParentGateOverlay';
import MapAtmosphere, { TERRAIN_ACCENTS } from '../components/world-map/MapAtmosphere';
import { useIslandCardPosition } from '../components/world-map/useIslandCardPosition';
import { islandPreviewCategory } from '../components/world-map/IslandPreviewScene';
import '../design/map-effects.css';
import '../design/map-exploration.css';
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

const MAP_WIDTH_PX = 768;
const MAP_HEIGHT_PX = 2500;
// Individual atlas bounds preserve the full peaks and waterfall tips.
const ISLAND_ATLAS_BOUNDS: Record<number, string> = {
  8:'0 0 444 454', 6:'444 0 444 474',
  5:'0 454 444 440', 3:'444 474 444 422',
  2:'0 894 444 428', 4:'444 896 444 428',
  7:'0 1322 444 454', 1:'444 1324 444 452',
};

const WorldMap: React.FC<WorldMapProps> = ({
  player,
  onSelectIsland,
  onOpenShop,
  onOpenAchievements,
  onOpenParentReport,
}) => {
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  const [activeIslandId, setActiveIslandId] = useState<number | null>(null);
  const [hoveredIslandId, setHoveredIslandId] = useState<number | null>(null);
  const hoverDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHoverDismiss = () => { if (hoverDismissRef.current) clearTimeout(hoverDismissRef.current); };
  const dismissHoverSoon = () => {
    cancelHoverDismiss();
    hoverDismissRef.current = setTimeout(() => setHoveredIslandId(null), 400);
  };
  const closeDetails = () => { cancelHoverDismiss(); setHoveredIslandId(null); setSelectedIslandId(null); };
  useEffect(() => () => { if (hoverDismissRef.current) clearTimeout(hoverDismissRef.current); }, []);
  const detailRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const islandButtons = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => {
    if (selectedIslandId === null) return;
    const previous = islandButtons.current.get(selectedIslandId) ?? document.activeElement as HTMLElement | null;
    detailRef.current?.querySelector<HTMLButtonElement>('[data-map-detail-close]')?.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, [selectedIslandId]);
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

  const displayedIslandId = selectedIslandId ?? hoveredIslandId;
  const isHoverPreview = selectedIslandId === null;
  const cardPosition = useIslandCardPosition(displayedIslandId, selectedIslandId, mapRef, detailRef, islandButtons);
  const selectedIslandState = islandStates.find(entry => entry.island.id === displayedIslandId) ?? null;
  const recommendedIsland = islandStates.find(({ island, isUnlocked }) => isUnlocked && island.levels.some(
    (level) => !(player.completedLevels[island.id] || []).includes(level.id),
  )) ?? islandStates.find(({ isUnlocked }) => isUnlocked);
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
    <div ref={mapRef} className="legend-world-map relative w-full overflow-visible">
      <div className="legend-map-brand-header">
        <img className="legend-map-brand" src={mathariaLogo} alt="Welcome to Matharia" draggable={false} />
      </div>
      <div
        className="legend-map-ocean relative mx-auto w-full overflow-hidden"
        style={{ aspectRatio: `${MAP_WIDTH_PX} / ${MAP_HEIGHT_PX}` }}
        data-map-poster-frame
      >
        <MapAtmosphere activeIslandId={selectedIslandId ?? activeIslandId} recommendedIslandId={recommendedIsland?.island.id} />

        <div className="absolute inset-0 z-20" data-map-island-layer>
          {TERRAIN_ACCENTS.map((hotspot) => {
            const islandState = islandStates.find(({ island }) => island.id === hotspot.islandId);
            if (!islandState) return null;
            const { island, isUnlocked } = islandState;
            const [cropX, cropY, cropWidth, cropHeight] = ISLAND_ATLAS_BOUNDS[island.id].split(' ').map(Number);

            return (
              <div
                key={`hotspot-${island.id}`}
                className="absolute"
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.width}%`,
                  height: `${hotspot.height}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  ref={(button) => { if (button) islandButtons.current.set(island.id, button); else islandButtons.current.delete(island.id); }}
                  type="button"
                  onClick={(event) => {
                    event.currentTarget.focus({ preventScroll: true });
                    cancelHoverDismiss();
                    setHoveredIslandId(null);
                    setSelectedIslandId(island.id);
                  }}
                  onPointerEnter={(event) => {
                    setActiveIslandId(island.id);
                    if (event.pointerType === 'mouse' && selectedIslandId === null) { cancelHoverDismiss(); setHoveredIslandId(island.id); }
                  }}
                  onPointerLeave={() => { setActiveIslandId(null); dismissHoverSoon(); }}
                  onFocus={() => setActiveIslandId(island.id)}
                  onBlur={() => setActiveIslandId(null)}
                  aria-label={`${island.name}${isUnlocked ? '' : ', locked'}`}
                  aria-expanded={displayedIslandId === island.id}
                  aria-controls={displayedIslandId === island.id ? "legend-map-island-details" : undefined}
                  data-island-selected={selectedIslandId === island.id}
                  className="legend-map-hotspot absolute inset-0 z-20 border border-transparent bg-transparent transition-all focus:outline-none"
                  data-button-skin="none"
                  data-map-island-id={island.id}
                  data-island-locked={!isUnlocked}
                  data-island-active={selectedIslandId === island.id || activeIslandId === island.id}
                  style={{ opacity: 1 }}
                >
                  <span className="legend-map-island-sprite" aria-hidden="true" data-island-sprite={island.id}>
                    <svg className="legend-map-island-cell" viewBox={ISLAND_ATLAS_BOUNDS[island.id]} preserveAspectRatio="xMidYMid meet" focusable="false">
                      <defs><clipPath id={`map-island-crop-${island.id}`}><rect x={cropX} y={cropY} width={cropWidth} height={cropHeight} /></clipPath></defs>
                      <image href={islandAtlas} width="888" height="1776" clipPath={`url(#map-island-crop-${island.id})`} />
                    </svg>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedIslandState ? (
          <div ref={detailRef} id="legend-map-island-details" onPointerEnter={cancelHoverDismiss} onPointerLeave={dismissHoverSoon} onKeyDown={(event) => { if (event.key === 'Escape') closeDetails(); }} style={cardPosition.style} data-card-placement={cardPosition.side} className="legend-map-details legend-map-anchored-card pointer-events-auto px-4 py-4 text-white backdrop-blur-sm licensed-overlay-card" role="region" aria-label={`${selectedIslandState.island.name} details`} data-map-detail-island={selectedIslandState.island.id} data-preview-only={isHoverPreview}>
            {!isHoverPreview && <button
              type="button"
              onClick={closeDetails}
              aria-label="Close island details"
              data-map-detail-close
              className="ui-close-button absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-white/90"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>}
            <div className="legend-map-category text-center">{islandPreviewCategory(selectedIslandState.island)}</div>
            <h2 className="text-center text-aaa-h2 text-cyan-50">
              {selectedIslandState.island.name}
            </h2>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-white/20 bg-slate-950/60" role="progressbar" aria-label="Island completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={selectedIslandState.completion}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 transition-all duration-300"
                style={{ width: `${selectedIslandState.completion}%` }}
              />
            </div>
            <div className="legend-map-progress mt-1 text-center text-aaa-sm text-amber-100">
              {selectedIslandState.completion}% progress
            </div>
            {!isHoverPreview && <button
              type="button"
              onClick={() => {
                if (selectedIslandState.isUnlocked) onSelectIsland(selectedIslandState.island);
              }}
              disabled={!selectedIslandState.isUnlocked}
              data-map-explore-island={selectedIslandState.island.id}
              className={`mt-3 w-full rounded-full px-4 py-3 text-aaa-sm transition-all ${
                selectedIslandState.isUnlocked
                  ? 'ui-button-primary'
                  : 'cursor-not-allowed bg-slate-700/80 text-slate-200 opacity-75'
              }`}
            >
              {selectedIslandState.isUnlocked ? 'Explore Island' : 'Island Locked'}
            </button>}
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
