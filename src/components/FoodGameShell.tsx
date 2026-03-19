import React from 'react';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';

interface FoodGameShellProps {
  gameType: 'take_out_rush' | 'monster_market';
  backgroundImage?: string;
  children: React.ReactNode;
}

const FoodGameShell: React.FC<FoodGameShellProps> = ({
  gameType,
  backgroundImage,
  children,
}) => (
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#6e2f1f_0%,#3f170d_42%,#12070a_100%)] px-2 pb-2 pt-1 md:px-4 md:pb-4">
    {backgroundImage ? (
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.92]"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
    ) : null}
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(126,46,24,0.44),rgba(90,36,19,0.2)_28%,rgba(18,14,8,0.5)_100%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.22),rgba(255,243,199,0)_26%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.24),rgba(120,53,15,0)_38%)]" />
    <GameplaySceneBackdrop gameType={gameType} className="opacity-8" />
    <div className="relative z-10 flex h-full min-h-0 flex-col gap-2 md:gap-3">
      {children}
    </div>
  </div>
);

export default FoodGameShell;
