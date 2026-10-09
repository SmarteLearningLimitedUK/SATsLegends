import React from 'react';
import { getWideEnvironment } from '../gameSceneMeta';

interface SceneEnvironmentProps {
  src: string;
  className?: string;
  alt?: string;
  position?: string;
  fit?: 'contain' | 'cover';
}

/** Contain scenery by default; a game may opt into a full-bleed cover treatment. */
const SceneEnvironment: React.FC<SceneEnvironmentProps> = ({ src, className = '', alt = '', position = 'center', fit = 'contain' }) => {
  const wide = getWideEnvironment(src);
  return (
    <picture className={`pointer-events-none absolute inset-0 block ${className}`.trim()}>
      {wide ? <source media="(min-width: 700px) and (min-height: 600px)" srcSet={wide} /> : null}
      <img src={src} alt={alt} draggable={false} data-game-scene-image data-background-fit={fit}
        className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`} style={{ objectPosition: position }} />
    </picture>
  );
};

export default SceneEnvironment;
