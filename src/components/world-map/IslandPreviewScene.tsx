import React from 'react';
import { IslandData } from '../../types';
import numberScene from '../../assets/maps/premium/place-value-panic.webp';
import fractionScene from '../../assets/maps/forect.jpg';
import geometryScene from '../../assets/maps/premium/coordinates-quest.webp';
import dataScene from '../../assets/maps/premium/graph-grabber.webp';
import operationsScene from '../../assets/maps/premium/multiplication-mine.webp';
import measurementScene from '../../assets/maps/premium/chrono-dash.webp';
import ratioScene from '../../assets/maps/premium/potion-panic.webp';
import coreScene from '../../assets/maps/premium/crystal-core.webp';

const PREVIEWS: Record<number, { image: string; description: string; theme: string }> = {
  1: { image: numberScene, theme: 'number', description: 'Unlock place value, primes, rounding and number lines.' },
  2: { image: fractionScene, theme: 'fractions', description: 'Forge fractions, serve exact orders and power up percentages.' },
  3: { image: geometryScene, theme: 'geometry', description: 'Explore angles, shapes, coordinates and measurement.' },
  4: { image: dataScene, theme: 'data', description: 'Decode graphs, restore averages and solve data mysteries.' },
  5: { image: operationsScene, theme: 'operations', description: 'Mine multiplication, master operations and discover factors.' },
  6: { image: measurementScene, theme: 'measurement', description: 'Race the clock, cross Lava Path and master units and money.' },
  7: { image: ratioScene, theme: 'ratio', description: 'Mix potions, share fairly and race with ratios.' },
  8: { image: coreScene, theme: 'papers', description: 'Take on the arithmetic paper and two reasoning adventures.' },
};

/** Curriculum motifs drawn as scene props, shared with the map terrain. */
export function IslandContentGlyph({ islandId }: { islandId: number }) {
  switch (islandId) {
    case 1: return <g><rect x="16" y="46" width="48" height="56" rx="9" fill="#215885" /><rect x="60" y="22" width="48" height="56" rx="9" fill="#16876d" /><text x="40" y="82">10</text><text x="84" y="58">1</text></g>;
    case 2: return <g><circle cx="64" cy="64" r="45" fill="#173c59" /><path className="island-glyph-fraction" d="M64 64 L64 19 A45 45 0 0 1 109 64 Z" fill="#ffd779" /><path d="M19 64 H109 M64 19 V109" fill="none" /><circle cx="64" cy="64" r="45" fill="none" /></g>;
    case 3: return <g><path className="island-glyph-shape" d="M64 12 L112 42 L100 98 L64 119 L28 98 L16 42 Z M64 12 V68 M16 42 L64 68 L112 42 M64 68 V119" fill="#1b6486" /><path d="M25 98 L64 77 L103 98" fill="none" /></g>;
    case 4: return <g><path d="M15 15 V108 H118" fill="none" /><rect className="island-glyph-bar island-glyph-bar-1" x="29" y="62" width="20" height="39" rx="4" fill="#76d6f1" /><rect className="island-glyph-bar island-glyph-bar-2" x="58" y="39" width="20" height="62" rx="4" fill="#ffd779" /><rect className="island-glyph-bar island-glyph-bar-3" x="87" y="19" width="20" height="82" rx="4" fill="#81e6b4" /></g>;
    case 5: return <g><circle cx="64" cy="64" r="45" fill="#3d3f72" /><g className="island-glyph-operations"><path d="M42 42 L86 86 M86 42 L42 86" fill="none" strokeWidth="10" /></g><circle cx="64" cy="64" r="55" fill="none" strokeDasharray="8 9" /></g>;
    case 6: return <g><circle cx="64" cy="64" r="49" fill="#123f68" /><path d="M64 19 V27 M109 64 H101 M64 109 V101 M19 64 H27" fill="none" /><path className="island-glyph-clock" d="M64 64 V31" fill="none" strokeWidth="7" /><path d="M64 64 L84 76" fill="none" strokeWidth="7" /><circle cx="64" cy="64" r="5" fill="#ffd779" /></g>;
    case 7: return <g><path d="M37 17 H90 M44 17 V47 L20 98 Q18 111 34 111 H94 Q110 111 108 98 L83 47 V17" fill="#16486e" /><path className="island-glyph-potion" d="M33 77 Q48 69 64 77 T96 77 L107 99 Q107 107 94 107 H34 Q23 107 24 99 Z" fill="#84eed0" /><circle className="island-glyph-bubble" cx="64" cy="53" r="7" fill="#84eed0" /></g>;
    default: return <g><path d="M28 15 H85 L106 37 V114 H28 Z" fill="#263c6f" /><path d="M85 15 V37 H106 M43 54 H85 M43 70 H85" fill="none" /><path className="island-glyph-check" d="M44 92 L57 102 L83 82" fill="none" stroke="#89f0bf" strokeWidth="8" /></g>;
  }
}

export const islandPreviewCategory = (island: IslandData) => island.id === 6 ? 'Time, units & money' : island.id === 8 ? 'SATs papers' : island.category;

export const islandPreviewDescription = (islandId: number) => PREVIEWS[islandId]?.description ?? '';

export default function IslandPreviewScene({ island }: { island: IslandData }) {
  const preview = PREVIEWS[island.id];
  return (
    <div className="legend-island-preview" data-island-preview={island.id} data-preview-theme={preview?.theme}
      role="img" aria-label={`${island.name}: ${preview?.description ?? island.category}`}>
      <div className="legend-island-preview-camera">
        <img src={preview?.image ?? island.mapImage} alt="" draggable={false} />
      </div>
      <div className="legend-island-preview-shade" />
      <svg viewBox="0 0 128 128" className="legend-island-preview-emblem island-content-glyph" aria-hidden="true">
        <IslandContentGlyph islandId={island.id} />
      </svg>
      <div className="legend-island-preview-particles" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
  );
}
