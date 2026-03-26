import React from 'react';
import { AvatarData, MiniGameType } from '../types';
import GameplaySceneBackdrop from './GameplaySceneBackdrop';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';

interface GameContainerViewProps {
  gameType: MiniGameType;
  sceneBackgroundOverride?: string;
  sceneMinimalDecor?: boolean;
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
  interactionArea?: React.ReactNode;
  feedbackLayer?: React.ReactNode;
  onBack: () => void;
  dockAccentClass?: string;
  isPaused?: boolean;
  onResume?: () => void;
  roundLabel?: string;
  roundValue?: React.ReactNode;
  hideDefaultDock?: boolean;
  showHeaderTitleRow?: boolean;
  headerAction?: React.ReactNode;
  bottomControlsArea?: React.ReactNode;
  hudCompact?: boolean;
  dockCompact?: boolean;
  stageClassName?: string;
  hudProgressBarClass?: string;
  flattenObjectiveShell?: boolean;
  flattenPlayfieldShell?: boolean;
  interactionShell?: 'default' | 'none';
}

const GameContainerView: React.FC<GameContainerViewProps> = (props) => {
  const {
    gameType,
    sceneBackgroundOverride,
    sceneMinimalDecor = false,
    objectiveArea,
    playFieldArea,
    interactionArea,
    feedbackLayer,
    isPaused = false,
    onResume,
    bottomControlsArea,
    stageClassName = '',
    flattenObjectiveShell = false,
    flattenPlayfieldShell = false,
    interactionShell = 'default',
  } = props;

  const objectiveShellStyle: React.CSSProperties = {
    backgroundImage: `url(${MAIN_PNG_SKIN.mission})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  };

  const playfieldShellStyle: React.CSSProperties = {
    backgroundImage: `url(${MAIN_PNG_SKIN.textBox})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  };

  return (
    <div className="aaa-game-root mission-game-root gameplay-content-surface relative flex h-full w-full min-h-0 flex-col overflow-hidden">
      <GameplaySceneBackdrop
        gameType={gameType}
        backgroundOverride={sceneBackgroundOverride}
        minimalDecor={sceneMinimalDecor}
        className="aaa-game-backdrop"
      />
      <div className={`aaa-game-stage shared-game-container mission-game-stage relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[min(100%,1100px)] flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-[0.2rem] md:gap-3 md:px-4 md:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${stageClassName}`}>
        <div className="aaa-zone aaa-zone-objective w-full">
          <div
            className={`aaa-objective-shell mission-objective-shell relative w-full ${
              flattenObjectiveShell
                ? 'overflow-visible border-0 bg-transparent px-0 py-0 shadow-none'
                : 'overflow-hidden rounded-[1.1rem] border border-white/18 px-2 py-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.28)] md:rounded-[1.35rem] md:px-3 md:py-2'
            }`}
            style={flattenObjectiveShell ? undefined : objectiveShellStyle}
          >
            {!flattenObjectiveShell ? (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,15,33,0.08),rgba(7,15,33,0.32))]" />
            ) : null}
            <div className="relative z-10">{objectiveArea}</div>
          </div>
        </div>

        <div className="aaa-zone aaa-zone-playfield relative w-full min-h-0 flex-1">
          <div
            className={`aaa-playfield-shell mission-playfield-shell relative h-full w-full min-h-0 ${
              flattenPlayfieldShell
                ? 'overflow-visible border-0 bg-transparent shadow-none rounded-none'
                : 'overflow-hidden rounded-[1.6rem] border border-white/15 shadow-[0_22px_44px_rgba(2,6,23,0.42)] md:rounded-[2rem]'
            }`}
            style={flattenPlayfieldShell ? undefined : playfieldShellStyle}
          >
            {!flattenPlayfieldShell ? (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,28,0.3),rgba(3,10,28,0.58))]" />
            ) : null}
            <div className="relative z-10 h-full w-full min-h-0">
              {playFieldArea}
            </div>
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
        </div>

        <div className="aaa-zone aaa-zone-actions shared-game-actions w-full">
          {interactionArea ? (
            interactionShell === 'none'
              ? <div className="min-h-0">{interactionArea}</div>
              : (
                <div className="shared-game-interaction-panel">
                  {interactionArea}
                </div>
              )
          ) : null}
          {bottomControlsArea}
        </div>
      </div>
    </div>
  );
};

export default GameContainerView;
