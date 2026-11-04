import type {HeroArtPose} from '../../assets/characters/originalHeroActivities';
import React, { memo, useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { getVisionCharacter, getVisionFrameLayout, getVisionWalk, VisionSceneContext } from '../../games/visionScene';
import './vision-character.css';
import { playGameSound, playMonsterSound } from '../../audio/gameAudio';
import { useCharacterPerformance } from './useCharacterPerformance';
import OriginalHeroCharacter from './OriginalHeroCharacter';
import {cohesiveCharacterSource} from '../../assets/characters/cohesiveCast';

export interface VisionCharacterProps {
  artPose?: HeroArtPose;
  activity?: 'idle' | 'cook' | 'forge' | 'run' | 'cast' | 'load';
  identity: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  reaction?: 'idle' | 'hit' | 'taunt' | 'defeated';
  reactionKey?: string | number;
  decorative?: boolean;
  legacyIdentity?: string;
  soundMode?: 'all' | 'voice' | 'off';
  walking?: boolean;
  /** Keep painted NPCs on their resting pose with continuous breathing. */
  steady?: boolean;
}

/** Six independently painted poses; the feet remain on a fixed atlas baseline. */
const AtlasCharacter = memo(function AtlasCharacter({ identity, alt = '', className = '', style, reaction = 'idle', reactionKey, decorative = false, legacyIdentity, soundMode = 'off', walking = false, steady = false }: VisionCharacterProps) {
  const scene = useContext(VisionSceneContext);
  const reducedMotion = useReducedMotion();
  const [action, setAction] = useState(false);
  const [ready, setReady] = useState(false);
  const walk = walking && reaction === 'idle' && scene.cue === 'idle' && !reducedMotion ? getVisionWalk(identity) : undefined;
  const source = walk??getVisionCharacter(identity);
  const root = useRef<HTMLSpanElement>(null);
  const lastSound = useRef('');
  const reactionClock = useRef({ signature: '', remaining: 120 });
  const idlePose = useCharacterPerformance(identity, scene.key, !steady && ready && !walk && !reducedMotion && reaction === 'idle' && scene.cue === 'idle', scene.paused);
  useEffect(() => {
    setReady(false);
    if (!source) return;
    let active = true;
    // Preload both atlases together so starting/stopping a walk never blanks
    // the character for a network frame.
    const images = [getVisionCharacter(identity), getVisionWalk(identity)].filter(Boolean).map(url => {
      const image = new Image(); image.src = url; return image;
    });
    Promise.all(images.map(image => image.decode())).then(() => { if(active) setReady(true); }).catch(() => { if(active) setReady(false); });
    return () => { active = false; };
  }, [identity]);
  useEffect(() => {
    if (reducedMotion || reaction === 'idle') { setAction(false); return; }
    const signature = `${identity}:${reaction}:${reactionKey ?? ''}`;
    if (reactionClock.current.signature !== signature) {
      reactionClock.current = { signature, remaining: 120 };
      setAction(true);
    }
    if (scene.paused) return;
    const current = reactionClock.current;
    const started = performance.now();
    const timer = setTimeout(() => setAction(false), current.remaining);
    return () => { clearTimeout(timer); current.remaining = Math.max(0, current.remaining - (performance.now() - started)); };
  }, [identity, reaction, reactionKey, reducedMotion, scene.paused]);
  useEffect(() => {
    const node = root.current;
    if (!ready || soundMode === 'off' || scene.paused || document.hidden || !node || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    const signature = `${identity}:${reaction}:${reactionKey ?? ''}`;
    if (signature === lastSound.current) return;
    const first = !lastSound.current.startsWith(`${identity}:`);
    lastSound.current = signature;
    if (reaction === 'hit' || reaction === 'defeated') {
      if (soundMode === 'all') playGameSound('impact');
      playMonsterSound('monster_hurt');
    } else if (reaction === 'taunt') playMonsterSound('monster_laugh');
    else if (first) playMonsterSound('monster_growl');
  }, [identity, reaction, reactionKey, ready, scene.paused, soundMode]);
  if (!source) return null;
  const pose = steady ? 0 : reaction === 'defeated' || reaction === 'hit' || scene.cue === 'error' ? 5
    : reaction === 'taunt' ? (action ? 2 : 3) : scene.cue === 'reward' ? 4 : idlePose;
  const layout = getVisionFrameLayout(identity, Boolean(walk));
  const frame = layout?.[walk ? 0 : pose];
  const frameStyle = {
    backgroundImage: `url("${source}")`,
    backgroundPosition: `${pose % 3 * 50}% ${Math.floor(pose / 3) * 100}%`,
    '--vision-ground-offset': `${frame?.ground ?? 0}%`,
    clipPath: frame ? `inset(${frame.clip.map(value => `${value}%`).join(' ')})` : undefined,
    ...(walk ? Object.fromEntries((layout ?? []).flatMap((value, index) => [[`--vision-walk-y-${index}`, `${value.ground}%`], [`--vision-walk-clip-${index}`, `inset(${value.clip.map(part => `${part}%`).join(' ')})`]])) : {}),
  } as CSSProperties;
  return <span ref={root} className={`vision-character ${walk?'vision-character--walking':''} ${legacyIdentity ? 'monster-mind-actor' : ''} ${className}`} style={style} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : alt} aria-hidden={decorative || undefined}
    data-monster-actor={legacyIdentity?'true':undefined} data-monster-identity={legacyIdentity} data-monster-ready={legacyIdentity?ready:undefined} data-monster-reaction={legacyIdentity?reaction:undefined}
    data-vision-character={identity} data-vision-pose={pose} data-vision-ready={ready} data-vision-paused={scene.paused}>
    <span className="vision-character-contact" />
    <span key={steady ? 'steady' : scene.cue==='idle'?`${reaction}:${reactionKey??''}`:`${scene.cue}:${scene.sequence}`} className="vision-character-breath" style={{ '--vision-period': `${4 + identity.length % 4 * .25}s` } as CSSProperties}>
      <span className="vision-character-frame" style={frameStyle} />
    </span>
  </span>;
});

export default memo(function VisionCharacter(props:VisionCharacterProps){
  return cohesiveCharacterSource(props.identity)?<OriginalHeroCharacter key={`${props.identity}:${props.artPose??'rest'}`} {...props}/>:<AtlasCharacter {...props}/>;
});
