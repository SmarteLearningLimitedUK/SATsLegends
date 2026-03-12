import React from 'react';
import SequenceSprint from './SequenceSprint';
import LogicSort from './LogicSort';
import ShapeShift from './ShapeShift';
import MatrixMatch from './MatrixMatch';
import { ArrowLeft } from '../GameIcons';

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
    <div className="h-full w-full flex flex-col items-center gap-6 overflow-y-auto overflow-x-hidden">
      <button 
        onClick={onBack}
        className="self-start flex items-center gap-2 px-6 py-3 text-white font-black rounded-2xl transition-all mb-4 licensed-answer-button"
      >
        <ArrowLeft size={20} />
        BACK TO LEVELS
      </button>
      
      {renderGame()}
    </div>
  );
};

export default ReasoningGame;
