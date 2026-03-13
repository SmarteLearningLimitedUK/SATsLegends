import React from 'react';
import AssetIcon from './AssetIcon';

interface GameActionDockProps {
  onBack: () => void;
  onHelp?: () => void;
  accentClass?: string;
}

const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, accentClass = 'text-slate-700' }) => {
  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-2 md:mt-2 md:gap-3">
      <button
        onClick={onBack}
        className={`game-dock-button ${accentClass}`}
        aria-label="Back to island"
      >
        <AssetIcon name="home" className="h-5 w-5 md:h-7 md:w-7" />
      </button>
      {onHelp && (
        <button
          onClick={onHelp}
          className={`game-dock-button ${accentClass}`}
          aria-label="Open help"
        >
          <AssetIcon name="question" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      )}
    </div>
  );
};

export default GameActionDock;
