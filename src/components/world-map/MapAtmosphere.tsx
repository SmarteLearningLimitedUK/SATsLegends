import { useId } from 'react';

type TerrainAccent = {
  islandId: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: 'ember' | 'sunlight' | 'ice' | 'mint';
};

// Coordinates follow the illustrated terrain in mapselect.png, independently
// of the much larger interactive hotspots used by the map.
const TERRAIN_ACCENTS: TerrainAccent[] = [
  { islandId: 8, x: 59.5, y: 17, width: 26, height: 10.5, tone: 'ember' },
  { islandId: 6, x: 25, y: 25.2, width: 39, height: 11.7, tone: 'ember' },
  { islandId: 5, x: 76.5, y: 33.2, width: 40, height: 10, tone: 'sunlight' },
  { islandId: 3, x: 35, y: 44.9, width: 44, height: 10.6, tone: 'ice' },
  { islandId: 2, x: 74, y: 55.5, width: 39, height: 10.2, tone: 'mint' },
  { islandId: 4, x: 35, y: 67, width: 40, height: 10.8, tone: 'sunlight' },
  { islandId: 7, x: 75, y: 79.6, width: 40, height: 10.5, tone: 'mint' },
  { islandId: 1, x: 50, y: 91.6, width: 39, height: 11.7, tone: 'sunlight' },
];

// The name plates are part of the poster. Exclude the complete plates, with
// extra breathing room, from every decorative pixel rather than relying on
// z-index or a particular frame of an animation.
const LABEL_PLATES = [
  { x: 514.5, y: 417.5, width: 235, height: 51 },
  { x: 273.5, y: 600, width: 236, height: 51 },
  { x: 250.5, y: 808.5, width: 235.5, height: 51 },
  { x: 344, y: 1108.5, width: 236, height: 51 },
  { x: 244.5, y: 1322.5, width: 236.5, height: 51 },
  { x: 362.5, y: 1652, width: 235, height: 51 },
  { x: 238, y: 1962, width: 235, height: 51 },
  { x: 110.5, y: 2289, width: 220.5, height: 48 },
];

const TONES = {
  ember: '#ffac50',
  sunlight: '#ffe0a0',
  ice: '#c1eaff',
  mint: '#b1ffcf',
} as const;

const MapAtmosphere = ({ recommendedIslandId }: { recommendedIslandId?: number }) => {
  const id = useId().replace(/:/g, '');
  const maskId = `${id}-map-labels`;

  return (
    <svg
      className="legend-map-atmosphere"
      viewBox="0 0 768 2500"
      aria-hidden="true"
      focusable="false"
      data-map-atmosphere
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="768" height="2500">
          <rect width="768" height="2500" fill="white" />
          {LABEL_PLATES.map((plate, index) => (
            <rect
              key={index}
              data-map-label-exclusion
              x={plate.x - 8}
              y={plate.y - 8}
              width={plate.width + 16}
              height={plate.height + 16}
              rx="8"
              fill="black"
            />
          ))}
        </mask>
        {Object.entries(TONES).map(([tone, color]) => (
          <radialGradient key={tone} id={`${id}-${tone}`}>
            <stop offset="0" stopColor={color} stopOpacity="0.34" />
            <stop offset="0.44" stopColor={color} stopOpacity="0.12" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <g mask={`url(#${maskId})`} data-map-effects-masked>
        {TERRAIN_ACCENTS.map((site, index) => {
          const x = site.x * 7.68;
          const y = site.y * 25;
          const width = site.width * 7.68;
          const height = site.height * 25;
          return (
            <g key={site.islandId} data-map-terrain-accent={site.islandId}>
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
