import React, { useMemo } from 'react';
import { BossThemeVariant } from './bossAtmospherePresets';

type BossAtmosphereLayerProps = {
  theme: BossThemeVariant;
  className?: string;
  density?: 'low' | 'medium' | 'high';
};

type Particle = {
  key: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  kind: 'mote' | 'spark';
};

const hashString = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickDensityCount = (density: BossAtmosphereLayerProps['density']) => {
  switch (density) {
    case 'low':
      return 14;
    case 'high':
      return 28;
    case 'medium':
    default:
      return 20;
  }
};

const makeParticles = (theme: BossThemeVariant, density: BossAtmosphereLayerProps['density']): Particle[] => {
  const rand = mulberry32(hashString(`boss-atmo-${theme}`));
  const count = pickDensityCount(density);
  const particles: Particle[] = [];

  // Bias towards filling vertical dead space: top corners + lower fog band + some mid glow motes.
  const bands: Array<{ y0: number; y1: number; weight: number }> = [
    { y0: 3, y1: 22, weight: 0.34 },
    { y0: 22, y1: 70, weight: 0.36 },
    { y0: 70, y1: 96, weight: 0.30 },
  ];
  const pickBand = () => {
    const r = rand();
    let acc = 0;
    for (const band of bands) {
      acc += band.weight;
      if (r <= acc) return band;
    }
    return bands[1];
  };

  for (let i = 0; i < count; i += 1) {
    const band = pickBand();
    const x = 4 + rand() * 92;
    const y = band.y0 + rand() * (band.y1 - band.y0);

    const sizeBase = theme === 'fire'
      ? 3.0
      : theme === 'electric'
        ? 3.5
        : theme === 'crystal'
          ? 3.0
          : 3.0;
    const size = Math.round((sizeBase + rand() * 6.5) * 10) / 10;
    const opacity = 0.22 + rand() * 0.38;
    const blur = theme === 'fire' ? 0.2 + rand() * 0.9 : 0.1 + rand() * 0.65;
    const dx = (-10 + rand() * 20) * (theme === 'electric' ? 1.1 : 1.0);
    const dy = (-14 + rand() * 24) * (theme === 'fire' ? -0.55 : 0.65);
    const duration = 10 + rand() * 16;
    const delay = -rand() * duration;
    const kind: Particle['kind'] = (theme === 'crystal' || theme === 'electric') && rand() > 0.62 ? 'spark' : 'mote';

    particles.push({
      key: `${theme}-${i}`,
      x,
      y,
      size,
      opacity,
      blur,
      dx,
      dy,
      duration,
      delay,
      kind,
    });
  }

  return particles;
};

const BossAtmosphereLayer: React.FC<BossAtmosphereLayerProps> = ({
  theme,
  className = '',
  density = 'medium',
}) => {
  const resolvedDensity = (density === 'low' || density === 'medium' || density === 'high') ? density : 'medium';
  const particles = useMemo(() => makeParticles(theme, resolvedDensity), [theme, resolvedDensity]);

  return (
    <div
      className={[
        'boss-atmosphere-layer boss-theme',
        `boss-theme-${theme}`,
        className,
      ].join(' ').trim()}
      aria-hidden="true"
    >
      <div className="boss-atmo-vignette" />
      <div className="boss-atmo-radial" />
      <div className="boss-atmo-fog boss-atmo-fog--low" />
      <div className="boss-atmo-fog boss-atmo-fog--mid" />

      <div className="boss-atmo-particles">
        {particles.map((p) => (
          <span
            key={p.key}
            className={`boss-atmo-particle boss-atmo-particle--${p.kind}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: p.opacity,
              filter: p.blur > 0.01 ? `blur(${p.blur}px)` : undefined,
              // Custom properties are used by keyframes; avoids per-frame JS.
              ['--boss-dx' as any]: `${p.dx}px`,
              ['--boss-dy' as any]: `${p.dy}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BossAtmosphereLayer;
