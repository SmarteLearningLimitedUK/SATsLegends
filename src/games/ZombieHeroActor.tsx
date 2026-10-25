import React, { useEffect, useState } from 'react';
import VisionCharacter from '../components/game-ui/VisionCharacter';
import { getVisionCharacter } from './visionScene';

type Frame = { body: string; head: string; ratio: number };
const cache = new Map<string, Promise<Frame>>();

/** Crop empty source margins once; articulate a head from the same hero painting. */
function prepare(source: string, avatarId: string) {
  const key = `${avatarId}:${source}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = new Promise<Frame>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Hero canvas unavailable');
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = width, right = 0, top = height, bottom = 0;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] > 12) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
        const croppedWidth = Math.max(1, right - left + 1);
        const croppedHeight = Math.max(1, bottom - top + 1);
        canvas.width = croppedWidth; canvas.height = croppedHeight;
        context.drawImage(image, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);
        const frame = new Image();
        frame.onload = () => {
          const points = avatarId === 'vex'
            ? [[28, 0], [100, 0], [100, 48], [78, 55], [38, 49], [25, 29]]
            : avatarId === 'mochi'
              ? [[0, 0], [100, 0], [100, 40], [85, 48], [38, 49], [0, 37]]
              : [[12, 0], [100, 0], [95, 44], [75, 51], [45, 48], [12, 36]];
          const path = () => {
            context.beginPath();
            points.forEach(([x, y], index) => index === 0 ? context.moveTo(x * croppedWidth / 100, y * croppedHeight / 100) : context.lineTo(x * croppedWidth / 100, y * croppedHeight / 100));
            context.closePath();
          };
          context.clearRect(0, 0, croppedWidth, croppedHeight);
          context.save(); path(); context.clip(); context.drawImage(frame, 0, 0); context.restore();
          const head = canvas.toDataURL('image/png');
          context.clearRect(0, 0, croppedWidth, croppedHeight); context.drawImage(frame, 0, 0);
          context.globalCompositeOperation = 'destination-out'; path(); context.fill();
          context.globalCompositeOperation = 'source-over';
          resolve({ body: canvas.toDataURL('image/png'), head, ratio: croppedWidth / croppedHeight });
        };
        frame.onerror = () => reject(new Error('Hero frame unavailable'));
        frame.src = canvas.toDataURL('image/png');
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('Hero artwork unavailable'));
    image.src = source;
  });
  cache.set(key, pending);
  return pending;
}

function LegacyZombieHeroActor({ source, avatarId }: { source: string; avatarId: string }) {
  const [prepared, setPrepared] = useState<{ source: string; frame: Frame } | null>(null);
  useEffect(() => {
    let active = true;
    prepare(source, avatarId).then(frame => { if (active) setPrepared({ source, frame }); }).catch(() => {});
    return () => { active = false; };
  }, [source, avatarId]);
  const frame = prepared?.source === source ? prepared.frame : null;
  return <div className="zombies-player-avatar zombies-hero-rig" data-hero-ready={Boolean(frame)} style={{ aspectRatio: frame?.ratio ?? 2 / 3 }}>
    <img src={frame?.body ?? source} alt="Your hero" draggable={false}/>
    {frame ? <span className="zombies-hero-head" aria-hidden="true" style={{ backgroundImage: `url(${frame.head})` }}/> : null}
  </div>;
}
export default function ZombieHeroActor(props: { source: string; avatarId: string; casting?: boolean }) {
  const identity = props.avatarId === 'barratt' ? 'deer' : props.avatarId;
  return getVisionCharacter(identity)
    ? <div className="zombies-player-avatar zombies-hero-rig" style={{aspectRatio:'1'}}><VisionCharacter identity={identity} reaction={props.casting?'taunt':'idle'} alt="Your hero" /></div>
    : <LegacyZombieHeroActor {...props} />;
}
