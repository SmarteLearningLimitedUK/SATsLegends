import React from 'react';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';

interface GameActionDockProps {
  onBack: () => void;
  accentClass?: string;
  compact?: boolean;
}

const GameActionDock: React.FC<GameActionDockProps> = ({ onBack }) => {
  // Standardize all minigames to the Place Value Panic dock style.
  const resolvedAccentClass = 'text-slate-100';
  const resolvedCompact = true;

  return (
    <div className="game-shell-zone game-shell-zone-actions mt-0.5 flex shrink-0 items-center justify-center md:mt-2">
      <div className={`ui-panel-unified fantasy-dock-shell aaa-dock-shell flex items-center ${resolvedCompact ? 'gap-1 px-1 py-1 md:gap-1.5 md:px-1.5 md:py-1.5' : 'gap-2 px-2 py-1.5 md:gap-3 md:px-3 md:py-2'}`}>
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={`ui-icon-button game-dock-button aaa-dock-button ${resolvedCompact ? 'aaa-dock-button-compact' : ''} ${resolvedAccentClass}`}
          aria-label="Back to map"
        >
          <AssetIcon name="home" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>
    </div>
  );
};

export default GameActionDock;
