import React, { useLayoutEffect, useRef, useState } from 'react';
import { Gem, Leaf, BarChart3, Landmark, Waves, Snowflake, Star, Lock, Clock3, Settings, ChevronDown, ArrowRight } from 'lucide-react';
import type { IslandData } from '../../types';
import mapScene from '../../assets/reference-batch-two/map-continuous-v2.png';
import guide from '../../assets/reference-screens/island-guide.png';
import './reference-world-map.css';

type IslandState = {
  island: IslandData;
  isUnlocked: boolean;
  completion: number;
  earnedBrainpower: number;
  totalPossibleBrainpower: number;
};
interface Props {
  states: IslandState[];
  recommended?: IslandState;
  suggestedGame?: string;
  onSelect: (island: IslandData) => void;
}

// Labels share the artwork's coordinate system, independent of phone aspect ratio.
const sites = [
  { id: 8, x: 71, y: 16.8 },
  { id: 6, x: 28, y: 26.5 },
  { id: 5, x: 72, y: 37.2 },
  { id: 3, x: 28, y: 46.5 },
  { id: 2, x: 72, y: 56.3 },
  { id: 4, x: 28, y: 66.8 },
  { id: 7, x: 72, y: 77.2 },
  { id: 1, x: 30, y: 91.5 },
];
const icons: Record<number, React.ElementType> = {
  1: Landmark, 2: Leaf, 3: Snowflake, 4: BarChart3,
  5: Settings, 6: Clock3, 7: Waves, 8: Gem,
};

export default function ReferenceWorldMap({ states, recommended, suggestedGame, onSelect }: Props) {
  const scroll = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const current = recommended ?? states[0];
  const currentId = current?.island.id;

  useLayoutEffect(() => {
    const root = map.current, navigation = document.querySelector<HTMLElement>('.legend-map-dock');
    if (!root || !navigation) return;
    const reserve = () => root.style.setProperty('--map-navigation-height', `${Math.max(0,root.getBoundingClientRect().bottom-navigation.getBoundingClientRect().top)}px`);
    const observer = new ResizeObserver(reserve);
    observer.observe(root); observer.observe(navigation); reserve();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const viewport = scroll.current;
    if (!viewport || currentId === undefined) return;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(`matharia-map-camera:${currentId}`); } catch { /* A map remains usable when storage is unavailable. */ }
    const align = () => {
      const island = viewport.querySelector<HTMLElement>(`[data-map-island-id="${currentId}"]`);
      if (saved !== null && Number.isFinite(Number(saved))) viewport.scrollTop = Number(saved);
      else if (island) viewport.scrollTop = island.offsetTop - viewport.clientHeight * 0.55;
    };
    align();
    const resize = new ResizeObserver(() => { viewport.scrollTop = Math.min(viewport.scrollTop, viewport.scrollHeight - viewport.clientHeight); });
    resize.observe(viewport);
    return () => resize.disconnect();
  }, [currentId]);

  if (!current) return null;

  return (
    <div className="reference-world-map" ref={map} data-reference-world-map>
      <header className="reference-map-header">
        <div className="reference-map-brand"><span>YOUR ADVENTURE</span><h1>Matharia</h1></div>
        <div className="reference-map-tokens"><span>Brainpower tokens</span><strong><Gem aria-hidden="true" />{current.earnedBrainpower}/{current.totalPossibleBrainpower}</strong></div>
      </header>
      <div className="reference-map-scroll" ref={scroll} onScroll={event => { try { sessionStorage.setItem(`matharia-map-camera:${currentId}`, String(event.currentTarget.scrollTop)); } catch { /* Camera persistence is optional. */ } }} aria-label="Island map. Scroll to explore all eight islands" tabIndex={0}>
        <div className="reference-map-canvas" data-reference-map-scene>
          <img className="reference-map-art" src={mapScene} width={724} height={2172} alt="" draggable={false} />
          {sites.map(site => {
            const state = states.find(entry => entry.island.id === site.id);
            if (!state) return null;
            const Icon = icons[site.id];
            const stars = Math.round(state.completion / 20);
            return (
              <button
                key={site.id}
                type="button"
                className="reference-map-island"
                data-map-island-id={site.id}
                data-button-skin="none"
                disabled={!state.isUnlocked}
                aria-label={`${state.island.name}${!state.isUnlocked ? ', locked' : ''}`}
                onClick={() => onSelect(state.island)}
                style={{ left: `${site.x}%`, top: `${site.y}%` }}
              >
                <span className="reference-map-name">
                  <Icon aria-hidden="true" />
                  <span>{state.island.name}</span>
                  {!state.isUnlocked && <Lock aria-hidden="true" />}
                </span>
                <span className="reference-map-stars" role="img" aria-label={`${state.completion}% complete`}>
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} fill={i <= stars ? 'currentColor' : 'none'} data-earned={i <= stars} aria-hidden="true" />)}
                </span>
                {currentId === site.id && <span className="reference-map-pin" aria-hidden="true"><img src={guide} alt="" /></span>}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="reference-map-recommendation" aria-label="Suggested adventure">
        <button className="reference-map-recommendation-toggle" type="button" aria-expanded={recommendationOpen} aria-controls="map-recommendation-details" onClick={() => setRecommendationOpen(open => !open)}>
          <span>Suggested adventure</span><ChevronDown aria-hidden="true" />
        </button>
        <div className="reference-map-recommendation-row">
          <strong>{suggestedGame ?? current.island.name}</strong>
          <button type="button" className="reference-map-continue" onClick={() => onSelect(current.island)} aria-label={`Continue to ${current.island.name}`}>Continue <ArrowRight aria-hidden="true" /></button>
        </div>
        <div id="map-recommendation-details" hidden={!recommendationOpen} className="reference-map-current">
          <span className="reference-map-avatar"><img src={guide} alt="" /></span>
          <div>
            <span className="reference-map-category">{current.island.category} · Island {currentId}</span>
            <div className="reference-map-completion">
              <div role="progressbar" aria-label={`${current.island.name} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.completion}>
                <span style={{ width: `${current.completion}%` }} />
              </div>
              <strong>{current.completion}%</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
