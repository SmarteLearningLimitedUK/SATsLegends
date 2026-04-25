import React from 'react';
import { useCalmBackgroundAudio } from './useCalmBackgroundAudio';

interface WellbeingShellProps {
  title: string;
  subtitle?: string;
  type?: string;
  progress?: number;
  onExit: () => void;
  children: React.ReactNode;
}

const WellbeingShell: React.FC<WellbeingShellProps> = ({ children }) => {
  useCalmBackgroundAudio();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(167,243,208,0.22),transparent_34%),linear-gradient(180deg,#071c16_0%,#0b2d23_48%,#12382b_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[10%] h-24 w-24 rounded-full bg-emerald-300/12 blur-3xl" />
        <div className="absolute right-[8%] top-[22%] h-20 w-20 rounded-full bg-lime-300/10 blur-3xl" />
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={`wellbeing-particle-${index}`}
            className="absolute h-1.5 w-1.5 rounded-full bg-emerald-100/45"
            style={{ left: `${12 + index * 9}%`, top: `${18 + (index % 4) * 16}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1.15rem)]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-cyan-100/14 bg-[linear-gradient(180deg,rgba(13,33,65,0.68),rgba(8,20,42,0.76))] shadow-[0_20px_40px_rgba(2,6,23,0.32)] backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default WellbeingShell;
