import { useId } from 'react';
import MapSeaLife from './MapSeaLife';

type TerrainAccent = {
  islandId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: 'ember' | 'sunlight' | 'ice' | 'mint';
};

// Effects and hit targets share the illustrated island bounds. The cleaned
// poster preserves the original terrain positions.
export const TERRAIN_ACCENTS: TerrainAccent[] = [
  { islandId: 8, x: 59.5, y: 18.5, width: 26, height: 10.5, tone: 'ember' },
  { islandId: 6, x: 25, y: 25.2, width: 39, height: 11.7, tone: 'ember' },
  { islandId: 5, x: 76.5, y: 33.2, width: 40, height: 10, tone: 'sunlight' },
  { islandId: 3, x: 35, y: 44.9, width: 44, height: 10.6, tone: 'ice' },
  { islandId: 2, x: 74, y: 55.5, width: 39, height: 10.2, tone: 'mint' },
  { islandId: 4, x: 35, y: 67, width: 40, height: 10.8, tone: 'sunlight' },
  { islandId: 7, x: 75, y: 79.6, width: 40, height: 10.5, tone: 'mint' },
  { islandId: 1, x: 50, y: 89.5, width: 39, height: 11.7, tone: 'sunlight' },
];

const TONES = {
  ember: '#ffac50',
  sunlight: '#ffe0a0',
  ice: '#c1eaff',
  mint: '#b1ffcf',
} as const;

const MapAtmosphere = ({ recommendedIslandId, activeIslandId }: {
  recommendedIslandId?: number;
  activeIslandId?: number | null;
}) => {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      className="legend-map-atmosphere"
      viewBox="0 0 768 2500"
      aria-hidden="true"
      focusable="false"
      data-map-atmosphere
    >
      <defs>
        <pattern id={`${id}-waves`} width="190" height="130" patternUnits="userSpaceOnUse">
          <path d="M10 30Q45 13 80 30T150 30M90 88Q120 75 155 88" fill="none" stroke="#d3fff3" strokeWidth="3" strokeLinecap="round" opacity=".2" />
          <path d="M30 110Q55 99 80 110" fill="none" stroke="#126d89" strokeWidth="2" strokeLinecap="round" opacity=".12" />
        </pattern>
        {Object.entries(TONES).map(([tone, color]) => (
          <radialGradient key={tone} id={`${id}-${tone}`}>
            <stop offset="0" stopColor={color} stopOpacity="0.34" />
            <stop offset="0.44" stopColor={color} stopOpacity="0.12" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <rect className="legend-map-water-flow" x="-30" y="-20" width="828" height="2540" fill={`url(#${id}-waves)`} />
      <path className="legend-map-voyage-route" d="M457 300L457 425Q115 440 192 630T588 830Q680 950 269 1123T568 1388Q680 1530 269 1675T576 1990Q680 2150 384 2290" fill="none" stroke="#d9fff2" strokeWidth="3" strokeDasharray="4 15" strokeLinecap="round" opacity=".35" />
      <MapSeaLife />
      <g data-map-island-effects>
        {TERRAIN_ACCENTS.map((site, index) => {
          const x = site.x * 7.68;
          const y = site.y * 25;
          const width = site.width * 7.68;
          const height = site.height * 25;
          return (
            <g key={site.islandId} data-map-terrain-accent={site.islandId} data-active={site.islandId === activeIslandId}>
              <ellipse
                className="legend-map-terrain-light"
                cx={x}
                cy={y - height * 0.12}
                rx={width * 0.36}
                ry={height * 0.35}
                fill={`url(#${id}-${site.tone})`}
                style={{ animationDelay: `${index * -1.3}s` }}
              />
              <ellipse
                className="legend-map-shoreline"
                cx={x}
                cy={y + height * 0.37}
                rx={width * 0.48}
                ry={height * 0.055}
                stroke={site.islandId === recommendedIslandId ? '#ffe3a1' : '#d4f9ff'}
                strokeWidth={site.islandId === recommendedIslandId ? 2 : 1.3}
                fill="none"
                style={{ animationDelay: `${index * -0.7}s` }}
              />
              {[0, 1, 2].map((mote) => (
                <circle
                  key={mote}
                  className={`legend-map-mote legend-map-mote-${site.tone}`}
                  cx={x + (mote - 1) * width * 0.17}
                  cy={y - height * (0.15 + (mote % 2) * 0.13)}
                  r={mote === 1 ? 2 : 1.4}
                  fill={TONES[site.tone]}
                  style={{ animationDelay: `${(index + mote) * -1.7}s`, animationDuration: `${7 + mote}s` }}
                />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default MapAtmosphere;
