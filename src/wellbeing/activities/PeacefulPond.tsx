import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import fish22 from '../../assets/calm/fish/22.png';
import fish23 from '../../assets/calm/fish/23.png';
import fish24 from '../../assets/calm/fish/24.png';
import fish25 from '../../assets/calm/fish/25.png';
import fish26 from '../../assets/calm/fish/26.png';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

type FishSprite = {
  src: string;
  width: number;
  hue: number;
};

type Fish = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spriteIndex: number;
  size: number;
  flip: boolean;
  settledFrames: number;
};

const FISH_SPRITES: FishSprite[] = [
  { src: fish22, width: 56, hue: 0 },
  { src: fish23, width: 62, hue: 16 },
  { src: fish24, width: 54, hue: -10 },
  { src: fish25, width: 66, hue: 8 },
  { src: fish26, width: 58, hue: -18 },
];

const SANCTUARY = { x: 74, y: 52, rx: 18, ry: 24 };

const makeFish = (id: number): Fish => ({
  id,
  x: 14 + (id % 4) * 13 + ((id * 9) % 7),
  y: 14 + (id % 5) * 13 + ((id * 11) % 6),
  vx: 0.1 + (id % 3) * 0.018,
  vy: (id % 2 === 0 ? 0.06 : -0.06) + (id % 4) * 0.01,
  spriteIndex: id % FISH_SPRITES.length,
  size: 0.92 + (id % 4) * 0.08,
  flip: id % 2 === 0,
  settledFrames: 0,
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const PeacefulPond: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [message, setMessage] = useState('Draw gentle currents to herd the fish into the glowing blue cove');
  const [fish, setFish] = useState<Fish[]>(() => Array.from({ length: 12 }, (_, index) => makeFish(index)));
  const [current, setCurrent] = useState({ x: 24, y: 48, dx: 0, dy: 0, active: false });
  const [draggingWater, setDraggingWater] = useState(false);
  const pondRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);

  const getPoint = (clientX: number, clientY: number) => {
    const rect = pondRef.current?.getBoundingClientRect();
    if (!rect) {
      return { x: 50, y: 50 };
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  };

  const schoolCount = useMemo(
    () =>
      fish.filter((item) => {
        const dx = (item.x - SANCTUARY.x) / SANCTUARY.rx;
        const dy = (item.y - SANCTUARY.y) / SANCTUARY.ry;
        return dx * dx + dy * dy <= 1;
      }).length,
    [fish],
  );

  useEffect(() => {
    if (finishedRef.current) return undefined;

    const interval = window.setInterval(() => {
      setFish((currentFish) =>
        currentFish.map((item) => {
          const toSanctuaryX = SANCTUARY.x - item.x;
          const toSanctuaryY = SANCTUARY.y - item.y;
          const toSanctuaryDistance = Math.max(1, Math.hypot(toSanctuaryX, toSanctuaryY));

          let vx = item.vx + (toSanctuaryX / toSanctuaryDistance) * 0.012;
          let vy = item.vy + (toSanctuaryY / toSanctuaryDistance) * 0.01;

          if (current.active) {
            const dx = current.x - item.x;
            const dy = current.y - item.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const pull = Math.max(0, 26 - distance) / 26;
            vx += (dx / distance) * (0.12 + Math.abs(current.dx) * 0.03) * pull;
            vy += (dy / distance) * (0.11 + Math.abs(current.dy) * 0.03) * pull;
          }

          const orbitAngle = ((item.id * 41) % 360) * (Math.PI / 180);
          vx += Math.cos(orbitAngle) * 0.0028;
          vy += Math.sin(orbitAngle) * 0.0024;

          let nextX = item.x + vx;
          let nextY = item.y + vy;

          if (nextX < 6 || nextX > 94) {
            vx *= -0.78;
            nextX = clamp(nextX, 6, 94);
          }
          if (nextY < 8 || nextY > 92) {
            vy *= -0.78;
            nextY = clamp(nextY, 8, 92);
          }

          const inSanctuary =
            (((nextX - SANCTUARY.x) / SANCTUARY.rx) ** 2) + (((nextY - SANCTUARY.y) / SANCTUARY.ry) ** 2) <= 1;
          const settledFrames = inSanctuary ? item.settledFrames + 1 : 0;

          if (inSanctuary) {
            vx *= 0.88;
            vy *= 0.88;
          } else {
            vx *= 0.982;
            vy *= 0.982;
          }

          return {
            ...item,
            x: nextX,
            y: nextY,
            vx,
            vy,
            flip: vx >= 0,
            settledFrames,
          };
        }),
      );
    }, 34);

    return () => window.clearInterval(interval);
  }, [current.active, current.dx, current.dy, current.x, current.y]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (schoolCount >= 10) {
      finishedRef.current = true;
      setMessage('The school has gathered in the calm cove');
      window.setTimeout(() => onComplete(), 1200);
    } else if (schoolCount >= 7) {
      setMessage('Lovely. Keep guiding a few more fish into the glow');
    } else if (schoolCount >= 4) {
      setMessage('The fish are following your current now');
    }
  }, [onComplete, schoolCount]);

  useEffect(
    () => () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
    },
    [],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getPoint(event.clientX, event.clientY);
    setDraggingWater(true);
    setCurrent({ x: point.x, y: point.y, dx: 0, dy: 0, active: true });
    setMessage('Sweep the water gently so the fish drift together');
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingWater) return;
    const point = getPoint(event.clientX, event.clientY);
    setCurrent((previous) => ({
      x: point.x,
      y: point.y,
      dx: point.x - previous.x,
      dy: point.y - previous.y,
      active: true,
    }));
  };

  const releaseCurrent = () => {
    setDraggingWater(false);
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
    }
    releaseTimerRef.current = window.setTimeout(() => {
      setCurrent((previous) => ({ ...previous, active: false, dx: 0, dy: 0 }));
    }, 360);
  };

  const progress = Math.min(100, Math.round((schoolCount / fish.length) * 100));

  return (
    <WellbeingShell
      title="Peaceful Pond"
      subtitle={message}
      type="Grounding"
      progress={progress}
      onExit={onExit}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(255,255,255,0.24),transparent_28%),linear-gradient(180deg,#07294d_0%,#0e4d88_36%,#0a74c4_72%,#1188e5_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(147,197,253,0.18),transparent_16%),radial-gradient(circle_at_76%_22%,rgba(125,211,252,0.16),transparent_18%),radial-gradient(circle_at_18%_82%,rgba(191,219,254,0.12),transparent_15%),radial-gradient(circle_at_78%_78%,rgba(103,232,249,0.14),transparent_16%)]" />
        <div
          ref={pondRef}
          className="relative h-full w-full overflow-hidden rounded-[2rem] border border-sky-100/20 bg-[radial-gradient(circle_at_50%_28%,rgba(191,219,254,0.35),rgba(12,74,146,0.28)_16%,rgba(7,89,133,0.88)_46%,rgba(8,47,73,0.98)_100%)] shadow-[0_24px_48px_rgba(3,7,18,0.4)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releaseCurrent}
          onPointerLeave={releaseCurrent}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_18%,transparent_72%,rgba(2,132,199,0.15)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.14)_36%,transparent_72%)] [background-size:250px_180px]" />

          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={`ripple-${index}`}
                className="absolute rounded-full border border-sky-100/18"
                style={{
                  left: `${18 + index * 13}%`,
                  top: `${22 + ((index * 17) % 44)}%`,
                  width: `${120 + index * 18}px`,
                  height: `${42 + index * 8}px`,
                }}
                animate={{ opacity: [0.12, 0.32, 0.1], scaleX: [0.96, 1.04, 0.98], scaleY: [0.94, 1.08, 0.96] }}
                transition={{ duration: 4 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.span
                key={`bubble-${index}`}
                className="absolute rounded-full bg-white/70"
                style={{
                  left: `${8 + ((index * 13) % 82)}%`,
                  bottom: `${-6 - (index % 4) * 12}%`,
                  width: `${4 + (index % 3)}px`,
                  height: `${4 + (index % 3)}px`,
                }}
                animate={{ y: [-10, -220 - (index % 5) * 26], opacity: [0, 0.55, 0], scale: [0.9, 1.2, 0.8] }}
                transition={{ duration: 4.2 + (index % 5) * 0.55, repeat: Infinity, delay: index * 0.18, ease: 'easeOut' }}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute right-[7%] top-[22%] h-[38%] w-[32%] rounded-[50%] border border-cyan-100/25 bg-[radial-gradient(circle_at_42%_45%,rgba(186,230,253,0.32),rgba(34,211,238,0.15)_38%,rgba(8,145,178,0.16)_62%,rgba(8,47,73,0.02)_100%)] shadow-[0_0_40px_rgba(103,232,249,0.24)]" />

          <div className="pointer-events-none absolute left-[2%] top-[16%] h-[70%] w-[15%] rounded-r-[3rem] bg-[linear-gradient(180deg,rgba(2,132,199,0.25),rgba(14,165,233,0.08),transparent)] blur-[1px]" />
          <div className="pointer-events-none absolute left-[4%] top-[58%] h-[26%] w-[13%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(254,240,138,0.18),rgba(14,165,233,0.02)_72%)]" />

          <div className="pointer-events-none absolute inset-0">
            {fish.map((item) => {
              const sprite = FISH_SPRITES[item.spriteIndex];
              const sanctuaryGlow = item.settledFrames > 18 ? 'drop-shadow(0 0 10px rgba(186,230,253,0.8))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.28))';
              return (
                <motion.div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${sprite.width * item.size}px`,
                    filter: `${sanctuaryGlow} hue-rotate(${sprite.hue}deg) saturate(1.05)`,
                  }}
                  animate={{
                    rotate: [item.flip ? -3 : 3, item.flip ? 4 : -4, item.flip ? -2 : 2],
                    y: [0, -3, 0],
                    scale: [1, 1.04, 1],
                  }}
                  transition={{ duration: 1.8 + (item.id % 4) * 0.22, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <img
                    src={sprite.src}
                    alt=""
                    className="pointer-events-none block w-full select-none"
                    draggable={false}
                    style={{ transform: item.flip ? 'scaleX(1)' : 'scaleX(-1)' }}
                  />
                </motion.div>
              );
            })}
          </div>

          {current.active ? (
            <motion.div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/75 bg-cyan-100/12 shadow-[0_0_28px_rgba(103,232,249,0.35)]"
              style={{ left: `${current.x}%`, top: `${current.y}%` }}
              initial={{ width: 20, height: 20, opacity: 0.85 }}
              animate={{ width: 220, height: 220, opacity: 0 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
            />
          ) : null}

          <div className="absolute left-4 top-4 rounded-full border border-white/14 bg-slate-950/28 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/84">
            Fish gathered {schoolCount}/{fish.length}
          </div>

          <div className="absolute right-4 top-4 rounded-full border border-cyan-100/18 bg-cyan-100/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50">
            Calm cove
          </div>

          <div className="absolute bottom-4 left-1/2 w-[min(92%,34rem)] -translate-x-1/2 rounded-[1.4rem] border border-white/12 bg-slate-950/30 px-4 py-3 text-center text-sm font-semibold text-white/90 backdrop-blur-md">
            {schoolCount < 10
              ? 'Stroke the water with your finger and guide the school into the glowing blue sanctuary.'
              : 'Beautiful. The fish are calm, close together, and safely resting in the cove.'}
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default PeacefulPond;
