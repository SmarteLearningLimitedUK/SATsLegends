import React from 'react';

interface MiniGameTopBarProps {
  onBack: () => void;
  score: number;
  scoreLabel?: string;
  metaLabel?: string;
  metaValue?: React.ReactNode;
  className?: string;
}

const MiniGameTopBar: React.FC<MiniGameTopBarProps> = ({
  onBack,
  score,
  scoreLabel = 'Score',
  metaLabel,
  metaValue,
  className = '',
}) => (
  <div className={`mini-game-top-bar pointer-events-none absolute inset-x-0 top-0 z-40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] ${className}`.trim()}>
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onBack}
        className="pvp-hud-chip pointer-events-auto"
      >
        Back
      </button>

      <div className="pointer-events-auto flex items-center gap-2">
        {metaLabel && metaValue !== undefined && metaValue !== null ? (
          <div className="pvp-hud-chip pvp-hud-chip-alt">
            {metaLabel} {metaValue}
          </div>
        ) : null}
        <div className="pvp-hud-chip">
          {scoreLabel} {score.toLocaleString()}
        </div>
      </div>
    </div>
  </div>
);

export default MiniGameTopBar;
