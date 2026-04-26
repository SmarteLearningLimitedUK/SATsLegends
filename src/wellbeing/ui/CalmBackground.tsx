import React from 'react';

type CalmBackgroundProps = {
  className?: string;
};

/**
 * Shared calm background layer.
 * - Uses global calm design tokens (CSS vars) so calm screens stay consistent.
 * - Low-motion: subtle drift/breathe animations, disabled under prefers-reduced-motion.
 */
const CalmBackground: React.FC<CalmBackgroundProps> = ({ className }) => {
  return (
    <div className={['pointer-events-none absolute inset-0 overflow-hidden', className].filter(Boolean).join(' ')}>
      <div className="absolute inset-0" style={{ background: 'var(--sat-calm-bg)' }} />

      <div
        className="sat-calm-breathe absolute inset-0"
        style={{
          background: 'var(--sat-calm-glow)',
          animation: 'sat-calm-breathe 5200ms ease-in-out infinite',
        }}
      />

      <div className="absolute inset-0">
        <div
          className="sat-calm-drift absolute left-[10%] top-[16%] h-28 w-28 rounded-full blur-3xl"
          style={{
            background: 'rgba(167, 243, 208, 0.14)',
            animation: 'sat-calm-drift 6400ms ease-in-out infinite',
          }}
        />
        <div
          className="sat-calm-drift absolute right-[10%] top-[22%] h-24 w-24 rounded-full blur-3xl"
          style={{
            background: 'rgba(56, 189, 248, 0.12)',
            animation: 'sat-calm-drift 7200ms ease-in-out infinite',
          }}
        />
        <div
          className="sat-calm-drift absolute left-[22%] bottom-[18%] h-32 w-32 rounded-full blur-3xl"
          style={{
            background: 'rgba(250, 204, 21, 0.08)',
            animation: 'sat-calm-drift 8600ms ease-in-out infinite',
          }}
        />
      </div>

      {Array.from({ length: 14 }).map((_, index) => (
        <span
          key={`calm-particle-${index}`}
          className="sat-calm-drift absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${10 + (index * 6) % 82}%`,
            top: `${14 + (index * 11) % 72}%`,
            background: 'rgba(236, 254, 255, 0.42)',
            animation: `sat-calm-drift ${5600 + (index % 6) * 420}ms ease-in-out infinite`,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
};

export default CalmBackground;

