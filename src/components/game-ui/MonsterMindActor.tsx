import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useStaticEnemyFrame } from '../../utils/staticEnemyFrame';
import './monster-mind-actor.css';

export type MonsterMindReaction = 'idle' | 'hit' | 'taunt' | 'defeated';

export interface MonsterMindActorProps {
  src: string;
  alt?: string;
  reaction?: MonsterMindReaction;
  reactionKey?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const EMPTY_FRAME = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E';
type Point = readonly [number, number];
type Part = 'leftArm' | 'rightArm' | 'head';
type Cut = { pivot: Point; shape: readonly Point[] };
type Rig = Partial<Record<Part, Cut>>;
type PreparedRig = { source: string; body: string; layers: Partial<Record<Part, string>> };
const PARTS: Part[] = ['leftArm', 'rightArm', 'head'];

// Cut lines follow the current enemy illustrations. All pieces are painted
// from the same prepared image, so an answer never swaps in a different frame.
const RIGS: Record<string, Rig> = {
  goblin: {
    rightArm: { pivot: [50, 57], shape: [[47, 55], [54, 54], [61, 55], [65, 67], [62, 71], [53, 71], [47, 67]] },
    head: { pivot: [41, 52], shape: [[16, 34], [24, 29], [29, 23], [39, 16], [49, 14], [58, 19], [60, 28], [63, 36], [63, 44], [57, 50], [49, 53], [32, 54], [25, 51], [19, 46]] },
  },
  zombie: {
    leftArm: { pivot: [27, 48], shape: [[17, 41], [35, 45], [36, 58], [27, 66], [5, 64], [3, 50]] },
    rightArm: { pivot: [47, 51], shape: [[43, 45], [55, 45], [65, 53], [66, 69], [53, 73], [46, 65]] },
    head: { pivot: [38, 49], shape: [[15, 22], [21, 12], [35, 9], [44, 12], [53, 19], [58, 30], [57, 41], [50, 50], [39, 55], [27, 53], [18, 45]] },
  },
};

const rigCache = new Map<string, PreparedRig>();
const rigPending = new Map<string, Promise<PreparedRig>>();
const scaledRigs = new Map<string, Rig>();
const rigFor = (source: string): Rig | undefined => {
  const filename = source.split('/').at(-1) ?? '';
  const match = Object.entries(RIGS).find(([name]) => filename.startsWith(name));
  if (!match) return undefined;
  const [name, rig] = match;
  const cached = scaledRigs.get(name);
  if (cached) return cached;
  // The outlines above are drawn against the 1024px-tall source paintings.
  // These portraits are 683px wide; only their horizontal coordinates change.
  const width = 683;
  const scaleX = 1024 / width;
  const scaled: Rig = {};
  for (const part of PARTS) {
    const cut = rig[part];
    if (cut) scaled[part] = { pivot: [cut.pivot[0] * scaleX, cut.pivot[1]], shape: cut.shape.map(([x, y]) => [x * scaleX, y]) };
  }
  scaledRigs.set(name, scaled);
  return scaled;
};
const pathFor = (context: CanvasRenderingContext2D, shape: readonly Point[], width: number, height: number) => {
  context.beginPath();
  shape.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x * width / 100, y * height / 100);
    else context.lineTo(x * width / 100, y * height / 100);
  });
  context.closePath();
};

// One preparation per asset. Gameplay frames only animate composited transforms.
const prepareRig = (source: string, frame: string, rig: Rig): Promise<PreparedRig> => {
  const cached = rigCache.get(source);
  if (cached) return Promise.resolve(cached);
  const pending = rigPending.get(source);
  if (pending) return pending;
  const preparation = new Promise<PreparedRig>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const longest = Math.max(image.naturalWidth, image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth / longest * 512));
        const height = Math.max(1, Math.round(image.naturalHeight / longest * 512));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to prepare character animation');
        const layers: Partial<Record<Part, string>> = {};
        for (const part of PARTS) {
          const cut = rig[part];
          if (!cut) continue;
          context.clearRect(0, 0, width, height);
          context.save();
          pathFor(context, cut.shape, width, height);
          context.clip();
          context.drawImage(image, 0, 0, width, height);
          context.restore();
          layers[part] = canvas.toDataURL('image/png');
        }
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        context.globalCompositeOperation = 'destination-out';
        for (const part of PARTS) {
          const cut = rig[part];
          if (cut) { pathFor(context, cut.shape, width, height); context.fill(); }
        }
        context.globalCompositeOperation = 'source-over';
        const prepared = { source, body: canvas.toDataURL('image/png'), layers };
        rigCache.set(source, prepared);
        resolve(prepared);
        canvas.width = 0;
        canvas.height = 0;
      } catch (error) { reject(error); }
      finally { image.onload = null; image.onerror = null; image.removeAttribute('src'); }
    };
    image.onerror = () => reject(new Error('Unable to load character animation frame'));
    image.src = frame;
  });
  rigPending.set(source, preparation);
  void preparation.finally(() => rigPending.delete(source)).catch(() => undefined);
  return preparation;
};
const REACTIONS: Record<Exclude<MonsterMindReaction, 'idle'>, Keyframe[]> = {
  hit: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 0, easing: 'ease-out' },
    { transform: 'translate(-5px, 1px) rotate(-2deg) scale(.985, 1.01)', offset: .2, easing: 'ease-in-out' },
    { transform: 'translate(2px, 0) rotate(.8deg) scale(1.006, .997)', offset: .56, easing: 'ease-out' },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 },
  ],
  taunt: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 0, easing: 'ease-in-out' },
    { transform: 'translate(7px, -2px) rotate(4deg) scale(1.05, .96)', offset: .4, easing: 'ease-in-out' },
    { transform: 'translate(-1px, 0) rotate(-1deg) scale(.99, 1.01)', offset: .72, easing: 'ease-out' },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 1 },
  ],
  defeated: [
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', offset: 0, easing: 'ease-out' },
    { transform: 'translate(-2px, -2px) rotate(-4deg) scale(1.03, .96)', offset: .3, easing: 'ease-in' },
    { transform: 'translate(0, 5px) rotate(8deg) scale(.94, .9)', offset: 1 },
  ],
};

const PART_REACTIONS: Record<Exclude<MonsterMindReaction, 'idle'>, Partial<Record<Part, Keyframe[]>>> = {
  hit: {
    head: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)', offset: .25 }, { transform: 'rotate(2deg)', offset: .7 }, { transform: 'rotate(0deg)' }],
    leftArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)', offset: .28 }, { transform: 'rotate(3deg)', offset: .75 }, { transform: 'rotate(0deg)' }],
    rightArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(7deg)', offset: .28 }, { transform: 'rotate(-2deg)', offset: .75 }, { transform: 'rotate(0deg)' }],
  },
  taunt: {
    head: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(3deg)', offset: .42 }, { transform: 'rotate(-1deg)', offset: .75 }, { transform: 'rotate(0deg)' }],
    leftArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)', offset: .35 }, { transform: 'rotate(-2deg)', offset: .72 }, { transform: 'rotate(0deg)' }],
    rightArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg)', offset: .35 }, { transform: 'rotate(2deg)', offset: .72 }, { transform: 'rotate(0deg)' }],
  },
  defeated: {
    head: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-4deg)', offset: .3 }, { transform: 'rotate(7deg)', offset: 1 }],
    leftArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-8deg)', offset: .4 }, { transform: 'rotate(6deg)', offset: 1 }],
    rightArm: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(9deg)', offset: .4 }, { transform: 'rotate(-6deg)', offset: 1 }],
  },
};

const MonsterMindActor: React.FC<MonsterMindActorProps> = ({
  src,
  alt = 'Monster Mind',
  reaction = 'idle',
  reactionKey,
  className = '',
  style,
}) => {
  const { frame, failed } = useStaticEnemyFrame(src);
  const reducedMotion = useReducedMotion();
  const recoilRef = useRef<HTMLDivElement | null>(null);
  const [preparedRig, setPreparedRig] = useState<PreparedRig | null>(null);
  const [rigFailure, setRigFailure] = useState<string | null>(null);
  const rig = useMemo(() => rigFor(src), [src]);
  const animatedRig = Boolean(rig) && !reducedMotion && rigFailure !== src;
  const currentRig = animatedRig && preparedRig?.source === src ? preparedRig : null;
  const ready = Boolean(frame) && (!animatedRig || Boolean(currentRig));
  const timing = useMemo(() => {
    let seed = 0;
    for (let index = 0; index < src.length; index += 1) {
      seed = (seed * 31 + src.charCodeAt(index)) >>> 0;
    }
    return {
      '--monster-breath-duration': `${3.2 + (seed % 7) * .1}s`,
      '--monster-sway-duration': `${3.4 + (seed % 11) * .12}s`,
      '--monster-breath-delay': `${-(seed % 19) * .13}s`,
      '--monster-sway-delay': `${-(seed % 23) * .17}s`,
    } as React.CSSProperties;
  }, [src]);

  useEffect(() => {
    if (!frame || !rig || !animatedRig || preparedRig?.source === src) return undefined;
    let active = true;
    void prepareRig(src, frame, rig).then(
      (next) => { if (active) setPreparedRig(next); },
      () => { if (active) setRigFailure(src); },
    );
    return () => { active = false; };
  }, [animatedRig, frame, preparedRig?.source, rig, src]);

  useEffect(() => {
    const node = recoilRef.current;
    if (!node || !ready || reaction === 'idle' || reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const options: KeyframeAnimationOptions = {
      duration: reaction === 'hit' ? 440 : reaction === 'taunt' ? 660 : 560,
      easing: 'linear', fill: reaction === 'defeated' ? 'forwards' : 'none',
    };
    const animations = [node.animate(REACTIONS[reaction], options)];
    if (currentRig) for (const part of PARTS) {
      const keyframes = PART_REACTIONS[reaction][part];
      const layer = node.querySelector<HTMLElement>(`[data-monster-part="${part}"]`);
      if (layer && keyframes) animations.push(layer.animate(keyframes, options));
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [currentRig, ready, reaction, reactionKey, reducedMotion, src]);

  return (
    <div
      className={`monster-mind-actor ${className}`}
      style={{ ...timing, ...style }}
      data-monster-actor="true"
      data-monster-identity={src}
      data-monster-reaction={reaction}
      data-monster-ready={ready}
      data-monster-rigged={Boolean(currentRig)}
      data-monster-status={failed ? 'failed' : ready ? 'ready' : 'preparing'}
    >
      <div ref={recoilRef} className="monster-mind-recoil">
        <div className="monster-mind-sway">
          <div className="monster-mind-breath">
            <img src={currentRig?.body ?? frame ?? EMPTY_FRAME} alt={alt} draggable={false} data-monster-image="true" />
            {currentRig && rig && PARTS.filter((part) => rig[part] && currentRig.layers[part]).map((part) => (
              <div
                key={part}
                className={`monster-mind-part monster-mind-part--${part}`}
                data-monster-part={part}
                aria-hidden="true"
                style={{ backgroundImage: `url("${currentRig.layers[part]}")`, transformOrigin: `${rig[part]!.pivot[0]}% ${rig[part]!.pivot[1]}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MonsterMindActor);
