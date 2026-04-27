import React from 'react';
import { BossThemeVariant } from './bossAtmospherePresets';

type BossParallaxLayerProps = {
  theme: BossThemeVariant;
  className?: string;
};

const BossParallaxLayer: React.FC<BossParallaxLayerProps> = ({ theme, className = '' }) => (
  <div
    className={[
      'boss-parallax-layer boss-theme',
      `boss-theme-${theme}`,
      className,
    ].join(' ').trim()}
    aria-hidden="true"
  >
    <div className="boss-parallax boss-parallax--far" />
    <div className="boss-parallax boss-parallax--mid" />
    <div className="boss-parallax boss-parallax--fore" />
  </div>
);

export default BossParallaxLayer;

