import React from 'react';
import AssetIcon from './AssetIcon';

interface GameActionDockProps {
  onBack: () => void;
  onHelp?: () => void;
  accentClass?: string;
}

const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, accentClass = 'text-slate-700' }) => {
  return (
    <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-4">
      <button
        onClick={onBack}
        className={`game-dock-button ${accentClass}`}
        aria-label="Back to island"
      >
        <AssetIcon name="home" className="w-6 h-6 md:w-7 md:h-7" />
      </button>
      <button
        onClick={onHelp}
        className={`game-dock-button ${accentClass}`}
        aria-label="Open help"
      >
        <AssetIcon name="question" className="w-6 h-6 md:w-7 md:h-7" />
      </button>
    </div>
  );
};

export default GameActionDock;
