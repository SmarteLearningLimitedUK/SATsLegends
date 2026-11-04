import React from 'react';
import TreasurePathGame from './TreasurePathGame';

export default function CoordinatesQuestGame(props: React.ComponentProps<typeof TreasurePathGame>) {
  return <TreasurePathGame {...props} multiStepRoutes />;
}
