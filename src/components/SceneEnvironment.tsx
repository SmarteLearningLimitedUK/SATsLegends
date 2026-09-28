import React from 'react';
import { getWideEnvironment } from '../gameSceneMeta';

interface SceneEnvironmentProps {
  src: string;
  className?: string;
  alt?: string;
  position?: string;
}

/** Keep the complete scene in view; use a composed wide variant where available. */
const SceneEnvironment: React.FC<SceneEnvironmentProps> = ({ src, className = '', alt = '', position = 'center' }) => {
  const wide = getWideEnvironment(src);
  return (
    <picture className={`pointer-events-none absolute inset-0 block ${className}`.trim()}>
      {wide ? <source media="(min-width: 700px) and (min-height: 600px)" srcSet={wide} /> : null}
      <img src={src} alt={alt} draggable={false} data-game-scene-image data-background-fit="contain"
        className="h-full w-full object-contain" style={{ objectPosition: position }} />
    </picture>
  );
};

export default SceneEnvironment;
