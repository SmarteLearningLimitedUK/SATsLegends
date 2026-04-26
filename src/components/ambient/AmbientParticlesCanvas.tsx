import React, { useEffect, useMemo, useRef } from 'react';

type Particle = {
  x: number;
  y: number;
  r: number;
  a: number;
  vx: number;
  vy: number;
};

type AmbientParticlesCanvasProps = {
  className?: string;
  /** Approx particles per 100k px^2 */
  density?: number;
  color?: string;
  maxRadius?: number;
  minRadius?: number;
  speed?: number;
  opacity?: number;
};

const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const AmbientParticlesCanvas: React.FC<AmbientParticlesCanvasProps> = ({
  className,
  density = 18,
  color = 'rgba(255,255,255,0.9)',
  maxRadius = 2.2,
  minRadius = 0.8,
  speed = 0.12,
  opacity = 0.22,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dimsRef = useRef({ w: 0, h: 0, dpr: 1 });

  const baseFill = useMemo(() => {
    // Allow tinting via CSS variable by passing "currentColor" etc.
    return color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return () => {};

    if (prefersReducedMotion()) {
      return () => {};
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const getParentRect = () => canvas.parentElement?.getBoundingClientRect();

    const resize = () => {
      const rect = getParentRect();
      if (!rect) return;

      const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      dimsRef.current = { w, h, dpr };

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = (w * h) / 100000;
      const targetCount = Math.max(14, Math.round(area * density));
      const next: Particle[] = [];

      for (let i = 0; i < targetCount; i += 1) {
        next.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: minRadius + Math.random() * Math.max(0.1, maxRadius - minRadius),
          a: 0.35 + Math.random() * 0.65,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
        });
      }

      particlesRef.current = next;
    };

    resize();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => resize())
      : null;

    if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

    const step = () => {
      const { w, h } = dimsRef.current;
      if (w <= 1 || h <= 1) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = baseFill;

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.globalAlpha = opacity * p.a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ro) ro.disconnect();
    };
  }, [baseFill, density, maxRadius, minRadius, opacity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none absolute inset-0', className)}
      aria-hidden="true"
    />
  );
};

export default AmbientParticlesCanvas;

