import React from 'react';
import { AvatarData, MiniGameType } from '../types';
import GameplayHUD from './GameplayHUD';
import GameActionDock from './GameActionDock';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';

interface GameContainerViewProps {
  gameType: MiniGameType;
  title: string;
  avatar?: AvatarData;
  score: number;
  targetScore: number;
  timeLeft: number;
  progress: number;
  statLabel?: string;
  statValue?: React.ReactNode;
  objectiveArea: React.ReactNode;
  playFieldArea: React.ReactNode;
  feedbackLayer?: React.ReactNode;
  onBack: () => void;
  dockAccentClass?: string;
  isPaused?: boolean;
  onResume?: () => void;
}

const GameContainerView: React.FC<GameContainerViewProps> = ({
  gameType,
  title,
  avatar,
  score,
  targetScore,
  timeLeft,
  progress,
  statLabel,
  statValue,
  objectiveArea,
  playFieldArea,
  feedbackLayer,
  onBack,
  dockAccentClass = 'text-slate-100',
  isPaused = false,
  onResume,
}) => {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#07122c_0%,#0c1d46_35%,#06101f_100%)]">
      <GameplaySceneBackdrop gameType={gameType} className="opacity-92" />
      <div className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col items-center gap-2 p-2 md:gap-3 md:p-4">
        <div className="w-full max-w-6xl">
          <GameplayHUD
            title={title}
            avatar={avatar}
            score={score}
            targetScore={targetScore}
            timeLeft={timeLeft}
            progress={progress}
            compact
            accentText="text-sky-950"
            accentSoftBg="bg-sky-100/80"
            accentBorder="border-sky-200/80"
            progressBar="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400"
            statLabel={statLabel}
            statValue={statValue}
          />
        </div>

        <div className="w-full max-w-6xl">
          {objectiveArea}
        </div>

        <div className="relative w-full max-w-6xl flex-1 min-h-0 overflow-hidden rounded-[1.6rem] border border-white/12 bg-slate-950/35 shadow-[0_20px_44px_rgba(2,6,23,0.42)] md:rounded-[2rem]">
          {playFieldArea}
          {feedbackLayer}

          {isPaused && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
              <div className="licensed-board-frame flex w-full max-w-sm flex-col items-center gap-3 p-5 text-center md:max-w-md">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Paused</div>
                <div className="text-lg font-black text-white md:text-2xl">Take a breather</div>
                <p className="text-sm font-semibold text-white/80">
                  Resume when you are ready to continue the queue run.
                </p>
                <button
                  type="button"
                  onClick={onResume}
                  className="ui-button-primary rounded-xl px-6 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-white md:px-7 md:py-3"
                >
                  Resume
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-6xl">
          <GameActionDock onBack={onBack} accentClass={dockAccentClass} />
        </div>
      </div>
    </div>
  );
};

export default GameContainerView;
