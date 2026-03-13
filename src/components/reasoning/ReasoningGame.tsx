import React from 'react';
import SequenceSprint from './SequenceSprint';
import LogicSort from './LogicSort';
import ShapeShift from './ShapeShift';
import MatrixMatch from './MatrixMatch';
import AssetIcon from '../AssetIcon';

interface ReasoningGameProps {
  gameType: string;
  onVictory: (stars: number, score: number) => void;
  onGameOver: (score: number) => void;
  onBack: () => void;
}

const ReasoningGame: React.FC<ReasoningGameProps> = ({ gameType, onVictory, onGameOver, onBack }) => {
  const renderGame = () => {
    switch (gameType) {
      case 'sequence_sprint':
        return <SequenceSprint onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'logic_sort':
        return <LogicSort onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'shape_shift':
        return <ShapeShift onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'matrix_match':
        return <MatrixMatch onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      default:
        return (
          <div className="text-white text-center p-12 bg-white/10 rounded-3xl">
            Unknown reasoning game type: {gameType}
          </div>
        );
    }
  };

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      <button
        onClick={onBack}
        className="absolute left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/45 text-white shadow-[0_12px_24px_rgba(2,6,23,0.32)] backdrop-blur-md md:left-4 md:top-4"
        aria-label="Back to island"
      >
        <AssetIcon name="back" className="h-5 w-5" />
      </button>

      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden pt-0">
        {renderGame()}
      </div>
    </div>
  );
};

export default ReasoningGame;
