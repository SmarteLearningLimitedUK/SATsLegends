import React, { useContext } from 'react';
import { GameSceneArtworkContext } from '../games/gameSceneArtwork';
import { getWideEnvironment } from '../gameSceneMeta';
import { getVisionEnvironment, VisionSceneContext } from '../games/visionScene';

interface SceneEnvironmentProps {
  src: string;
  className?: string;
  alt?: string;
  position?: string;
  fit?: 'contain' | 'cover';
}

/** Contain scenery by default; a game may opt into a full-bleed cover treatment. */
const SceneEnvironment: React.FC<SceneEnvironmentProps> = ({ src, className = '', alt = '', position = 'center', fit = 'contain' }) => {
  const scene = useContext(GameSceneArtworkContext);
  const vision = useContext(VisionSceneContext);
  const production = getVisionEnvironment(vision.key);
  const wide = scene ?? getWideEnvironment(src);
  return (
    <picture className={`pointer-events-none absolute inset-0 block ${className}`.trim()}>
      {!production && wide ? <source media="(min-width: 700px) and (min-height: 600px)" srcSet={wide} /> : null}
      <img src={production??src} alt={alt} draggable={false} data-game-scene-image data-vision-environment={production?vision.key:undefined} data-background-fit={production?'cover':fit}
        className={`h-full w-full ${production || fit === 'cover' ? 'object-cover' : 'object-contain'}`} style={{ objectPosition: position }} />
    </picture>
  );
};

export default SceneEnvironment;
