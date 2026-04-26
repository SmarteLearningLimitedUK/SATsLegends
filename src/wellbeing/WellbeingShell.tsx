import React from 'react';
import { useCalmBackgroundAudio } from './useCalmBackgroundAudio';
import CalmBackground from './ui/CalmBackground';
import AssetIcon from '../components/AssetIcon';

interface WellbeingShellProps {
  title: string;
  subtitle?: string;
  type?: string;
  progress?: number;
  onExit: () => void;
  children: React.ReactNode;
}

const WellbeingShell: React.FC<WellbeingShellProps> = ({ title, subtitle, type, progress, onExit, children }) => {
  useCalmBackgroundAudio();

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden text-white">
      <CalmBackground />

      <div className="relative z-10 min-h-0 flex-1 p-3 md:p-4">
        <div
          className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.9rem] border border-cyan-100/14 shadow-[0_20px_40px_rgba(2,6,23,0.32)] backdrop-blur-sm"
          style={{ background: 'var(--sat-calm-panel)' }}
        >
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4 md:px-5 md:pt-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {type ? (
                  <span className="game-chip border-white/10 bg-white/6 text-cyan-50/80">
                    {type}
                  </span>
                ) : null}
                {typeof progress === 'number' ? (
                  <span className="game-chip border-white/10 bg-white/6 text-cyan-50/80">
                    {Math.max(0, Math.min(100, Math.round(progress)))}%
                  </span>
                ) : null}
              </div>
              <div className="mt-2 truncate text-lg font-black text-cyan-50 md:text-xl">{title}</div>
              {subtitle ? (
                <div className="mt-1 line-clamp-2 text-sm font-semibold text-cyan-50/80 md:text-base">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onExit}
              className="ui-icon-button shrink-0"
              aria-label="Exit calm activity"
              title="Exit"
            >
              <AssetIcon name="back" className="h-5 w-5" alt="" />
            </button>
          </div>

          {typeof progress === 'number' ? (
            <div className="px-4 pb-3 md:px-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-200/85"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="pb-2" />
          )}

          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellbeingShell;
