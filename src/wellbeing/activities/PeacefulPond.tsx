import React, { useEffect, useRef, useState } from 'react';
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
};

type CurrentState = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
};

type PulseState = {
  key: number;
  x: number;
  y: number;
};

const ACTIVITY_DURATION_SECONDS = 60;

const FISH_SPRITES: FishSprite[] = [
  { src: fish22, width: 56, hue: 0 },
  { src: fish23, width: 62, hue: 16 },
  { src: fish24, width: 54, hue: -10 },
  { src: fish25, width: 66, hue: 8 },
  { src: fish26, width: 58, hue: -18 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const makeFish = (id: number): Fish => ({
  id,
  x: 12 + (id % 5) * 15 + ((id * 7) % 5),
  y: 16 + (id % 4) * 17 + ((id * 11) % 7),
  vx: (id % 2 === 0 ? 0.16 : -0.16) + (id % 3) * 0.03,
  vy: (id % 3 === 0 ? 0.1 : -0.08) + (id % 4) * 0.02,
  spriteIndex: id % FISH_SPRITES.length,
  size: 0.9 + (id % 4) * 0.08,
  flip: id % 2 === 0,
});

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
};

const PeacefulPond: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [fish, setFish] = useState<Fish[]>(() => Array.from({ length: 14 }, (_, index) => makeFish(index)));
  const [current, setCurrent] = useState<CurrentState>({ x: 30, y: 50, dx: 0, dy: 0, active: false });
  const [draggingWater, setDraggingWater] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(ACTIVITY_DURATION_SECONDS);
  const [pulse, setPulse] = useState<PulseState | null>(null);
  const pondRef = useRef<HTMLDivElement | null>(null);
  const finishedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const pulseKeyRef = useRef(0);

  const getPoint = (clientX: number, clientY: number) => {
    const rect = pondRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
  };

  const scatterFromPoint = (point: { x: number; y: number }) => {
    pulseKeyRef.current += 1;
    setPulse({ key: pulseKeyRef.current, x: point.x, y: point.y });

    setFish((currentFish) =>
      currentFish.map((item) => {
        const dx = item.x - point.x;
        const dy = item.y - point.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        const scatterStrength = Math.max(0, 22 - distance) / 22;
        const impulse = 0.2 + scatterStrength * 0.8;
        return {
          ...item,
          vx: item.vx + normalizedX * impulse + ((Math.random() - 0.5) * 0.08),
          vy: item.vy + normalizedY * impulse + ((Math.random() - 0.5) * 0.08),
        };
      }),
    );
  };

  useEffect(() => {
    if (finishedRef.current) return undefined;
    const timerId = window.setInterval(() => {
      setRemainingSeconds((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(timerId);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onComplete();
          }
          return 0;
        }
        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [onComplete]);

  useEffect(() => {
    if (finishedRef.current) return undefined;

    const movementInterval = window.setInterval(() => {
      const now = Date.now();
      setFish((currentFish) =>
        currentFish.map((item) => {
          let vx = item.vx + Math.cos((now / 820) + item.id * 0.75) * 0.005;
          let vy = item.vy + Math.sin((now / 760) + item.id * 0.65) * 0.004;

          if (current.active) {
            const dx = current.x - item.x;
            const dy = current.y - item.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            const pull = Math.max(0, 30 - distance) / 30;
            const sweepSpeed = Math.min(1.4, Math.hypot(current.dx, current.dy));
            const herdForce = (0.08 + sweepSpeed * 0.05) * pull;

            vx += (dx / distance) * herdForce;
            vy += (dy / distance) * herdForce;
            vx += current.dx * 0.017 * pull;
            vy += current.dy * 0.017 * pull;
          }

          vx *= 0.976;
          vy *= 0.976;

          let nextX = item.x + vx;
          let nextY = item.y + vy;

          if (nextX < 5 || nextX > 95) {
            vx *= -0.86;
            nextX = clamp(nextX, 5, 95);
          }
          if (nextY < 7 || nextY > 93) {
            vy *= -0.86;
            nextY = clamp(nextY, 7, 93);
          }

          return {
            ...item,
            x: nextX,
            y: nextY,
            vx,
            vy,
            flip: vx >= 0,
          };
        }),
      );
    }, 34);

    return () => window.clearInterval(movementInterval);
  }, [current.active, current.dx, current.dy, current.x, current.y]);

  useEffect(
    () => () => {
      if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    },
    [],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getPoint(event.clientX, event.clientY);
    setDraggingWater(true);
    setCurrent({ x: point.x, y: point.y, dx: 0, dy: 0, active: true });
    scatterFromPoint(point);
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
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      setCurrent((previous) => ({ ...previous, active: false, dx: 0, dy: 0 }));
    }, 220);
  };

  const message = remainingSeconds <= 10
    ? 'Final calm seconds. Keep the fish moving gently.'
    : draggingWater
      ? 'Smooth sweeps herd the fish through the pond.'
      : 'Tap to scatter the fish, then sweep slowly to herd them.';

  const progress = Math.round(((ACTIVITY_DURATION_SECONDS - remainingSeconds) / ACTIVITY_DURATION_SECONDS) * 100);

  return (
    <WellbeingShell
      title="Peaceful Pond"
      subtitle={message}
      type="Grounding"
      progress={progress}
      onExit={onExit}
    >
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#0a3f73_0%,#0a5a99_36%,#0b74bf_72%,#1190de_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(147,197,253,0.2),transparent_18%),radial-gradient(circle_at_76%_22%,rgba(125,211,252,0.18),transparent_20%),radial-gradient(circle_at_18%_82%,rgba(191,219,254,0.14),transparent_16%),radial-gradient(circle_at_78%_78%,rgba(103,232,249,0.16),transparent_18%)]" />
        <div
          ref={pondRef}
          className="relative h-full w-full overflow-hidden rounded-[2rem] border border-sky-100/20 bg-[radial-gradient(circle_at_50%_24%,rgba(191,219,254,0.28),rgba(14,116,195,0.36)_28%,rgba(8,85,138,0.9)_100%)] shadow-[0_24px_48px_rgba(3,7,18,0.4)]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releaseCurrent}
          onPointerCancel={releaseCurrent}
          onPointerLeave={releaseCurrent}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_20%,transparent_78%,rgba(2,132,199,0.15)_100%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:30px_30px]" />

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
                animate={{ opacity: [0.12, 0.3, 0.12], scaleX: [0.96, 1.04, 0.98], scaleY: [0.94, 1.08, 0.96] }}
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

          <div className="pointer-events-none absolute inset-0">
            {fish.map((item) => {
              const sprite = FISH_SPRITES[item.spriteIndex];
              return (
                <motion.div
                  key={item.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${sprite.width * item.size}px`,
                    filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.28)) hue-rotate(${sprite.hue}deg) saturate(1.05)`,
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

          {pulse ? (
            <motion.div
              key={`scatter-${pulse.key}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/75 bg-cyan-100/12 shadow-[0_0_28px_rgba(103,232,249,0.35)]"
              style={{ left: `${pulse.x}%`, top: `${pulse.y}%` }}
              initial={{ width: 24, height: 24, opacity: 0.9 }}
              animate={{ width: 260, height: 260, opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          ) : null}

          <div className="absolute left-4 top-4 rounded-full border border-white/14 bg-slate-950/28 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/88">
            {formatTime(remainingSeconds)}
          </div>

          <div className="absolute bottom-4 left-1/2 w-[min(92%,34rem)] -translate-x-1/2 rounded-[1.4rem] border border-white/12 bg-slate-950/30 px-4 py-3 text-center text-sm font-semibold text-white/92 backdrop-blur-md">
            Tap anywhere to scatter the fish. Sweep your finger to herd them gently through the pond.
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default PeacefulPond;
