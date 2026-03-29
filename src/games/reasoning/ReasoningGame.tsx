import React from 'react';
import SequenceSprint from './SequenceSprint';
import LogicSort from './LogicSort';
import ShapeShift from './ShapeShift';
import MatrixMatch from './MatrixMatch';
import GameActionDock from '../../components/GameActionDock';
import GameplaySceneBackdrop from '../../components/GameplaySceneBackdrop';

interface ReasoningGameProps {
  gameType: string;
  isBoss?: boolean;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

const ReasoningGame: React.FC<ReasoningGameProps> = ({ gameType, isBoss = false, onVictory, onGameOver, onBack }) => {
  const renderGame = () => {
    switch (gameType) {
      case 'sequence_sprint':
        return <SequenceSprint onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'logic_sort':
        return <LogicSort onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'shape_shift':
        return <ShapeShift onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} />;
      case 'matrix_match':
        return <MatrixMatch onVictory={onVictory} onGameOver={onGameOver} onBack={onBack} isBoss={isBoss} />;
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
      <GameplaySceneBackdrop gameType={gameType as any} />
      <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden px-2 pb-1 md:px-3">
        <div className="licensed-board-frame relative flex w-full max-w-6xl min-h-0 flex-1 overflow-hidden rounded-[2rem] p-2 md:rounded-[2.6rem] md:p-3">
          {renderGame()}
        </div>
      </div>
      <div className="relative z-20 shrink-0 pb-1">
        <GameActionDock onBack={onBack} accentClass="text-slate-100" />
      </div>
    </div>
  );
};

export default ReasoningGame;
