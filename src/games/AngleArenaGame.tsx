import React from 'react';
import { MiniGameShellContractProps } from '../app/gameplaySessionContract';
import SlingShotGame from './SlingShotGame';

interface AngleArenaGameProps {
  levelId: number;
  avatarId: string;
  onVictory: (stars: number, XP: number) => void;
  onGameOver: (XP: number) => void;
  onBack: () => void;
}

type AngleArenaGameShellProps = AngleArenaGameProps & MiniGameShellContractProps;

const AngleArenaGame: React.FC<AngleArenaGameShellProps> = (props) => (
  <SlingShotGame
    {...props}
    questionType="angles"
    interactionMode="select"
  />
);

export default AngleArenaGame;
