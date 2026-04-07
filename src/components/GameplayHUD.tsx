import React from 'react';
import { motion } from 'motion/react';
import { AvatarData } from '../types';
import AssetIcon from './AssetIcon';
import sliderBgAsset from '../assets/casual_ui/hud/progress_bar_3__bg.png';
import sliderBorderAsset from '../assets/licensed/slices/progress_bar.png';
import sliderFillAsset from '../assets/casual_ui/hud/progress_bar_3__fg.png';
import { MAIN_PNG_SKIN } from '../assets/reskin/mainPng';

const titleFlagAsset = MAIN_PNG_SKIN.textBox;

interface GameplayHUDProps {
  title: string;
  avatar: AvatarData | undefined;
  XP: number;
  targetScore: number;
  timeLeft: number;
  progress: number;
  accentText: string;
  accentSoftBg: string;
  accentBorder: string;
  progressBar: string;
  statLabel?: string;
  statValue?: React.ReactNode;
  compact?: boolean;
  showTitleRow?: boolean;
  headerAction?: React.ReactNode;
}

const GameplayHUD: React.FC<GameplayHUDProps> = ({
  title,
  avatar: _avatar,
  XP: _score,
  targetScore,
  timeLeft,
  progress,
  accentText,
  accentSoftBg: _accentSoftBg,
  accentBorder: _accentBorder,
  progressBar,
  statLabel,
  statValue,
  compact = false,
  showTitleRow = true,
  headerAction,
}) => {
  const showExtraStat = Boolean(statLabel) && statValue !== undefined && statValue !== null;
  const progressTrackInsetClass = compact ? 'inset-[8%]' : 'inset-x-[4%] inset-y-[18%]';
  const sharedShellOwnsChrome = typeof document !== 'undefined'
    && Boolean(document.querySelector('.screen-gameplay .unified-minigame-hud-enabled'));

  if (sharedShellOwnsChrome) {
    return null;
  }

  return (
    <div
      data-local-top-hud="true"
      className={`game-shell-zone game-shell-zone-hud mission-hud-root w-full flex shrink-0 flex-col ${compact ? 'gap-1' : 'gap-1.5 md:gap-2'}`}
    >
      <div className={`fantasy-hud-shell aaa-hud-shell mission-hud-topbar relative w-full overflow-hidden ${compact ? 'rounded-[0.95rem]' : 'rounded-[1.1rem] md:rounded-[1.4rem]'} shadow-[0_14px_36px_rgba(15,23,42,0.22)]`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.16),transparent_36%),linear-gradient(180deg,rgba(18,40,92,0.96),rgba(7,18,40,0.98))]" />
        <div className="absolute inset-0 border border-white/12" />

        <div className={`relative flex flex-col ${compact ? 'gap-1 p-1.5' : 'gap-2.5 p-3 md:gap-3 md:p-4'} ${headerAction ? 'pr-12 md:pr-14' : ''}`}>
          {headerAction ? (
            <div className="absolute right-1.5 top-1.5 z-20 md:right-2 md:top-2">
              {headerAction}
            </div>
          ) : null}
          {showTitleRow && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                {!compact && <div className="mission-hud-overline text-[8px] font-black uppercase tracking-[0.2em] text-slate-100/80">Gameplay</div>}
                <h2 className={`mission-hud-title ${compact ? 'text-[0.92rem]' : 'text-[1.05rem]'} md:text-[1.35rem] font-black tracking-tight text-white truncate drop-shadow-[0_4px_12px_rgba(2,6,23,0.4)]`}>
                  {title}
                </h2>
              </div>

              <div
                className={`mission-target-pill inline-flex shrink-0 items-center gap-1 ${compact ? 'px-2 py-[2px] text-[7px]' : 'px-2.5 py-1 text-[8px]'} md:gap-1.5 md:px-3 md:py-1 md:text-[10px] font-bold text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`}
                style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
              >
                <AssetIcon name="star" className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span>Target {targetScore}</span>
              </div>
            </div>
          )}

          <div className={`grid w-full ${showExtraStat ? 'grid-cols-2' : 'grid-cols-1'} ${compact ? 'gap-1' : 'gap-2 md:gap-2.5'}`}>
            {showExtraStat && (
              <div className={`aaa-hud-stat mission-hud-stat-card relative rounded-[0.75rem] md:rounded-[1rem] ${compact ? 'px-1 py-0.5' : 'px-2 py-1.5'} md:px-2.5 md:py-2 text-center overflow-hidden`}>
                <div className="aaa-hud-stat-surface absolute inset-0 rounded-[inherit]" />
              <div className={`mission-hud-stat-label ${compact ? 'text-[6px]' : 'text-[8px]'} relative md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>{statLabel}</div>
              <div className={`mission-hud-stat-value mt-0.5 ${compact ? 'text-[0.82rem]' : 'text-[1rem]'} md:text-[1.2rem] font-black ${accentText}`}>{statValue}</div>
            </div>
            )}

            <div className={`aaa-hud-stat mission-hud-stat-card relative rounded-[0.75rem] md:rounded-[1rem] ${compact ? 'px-1 py-0.5' : 'px-2 py-1.5'} md:px-2.5 md:py-2 text-center overflow-hidden`}>
              <div className="aaa-hud-stat-surface absolute inset-0 rounded-[inherit]" />
              <div className={`relative flex items-center justify-center ${compact ? 'gap-0.5' : 'gap-1'} md:gap-2`}>
                <AssetIcon name="timer" className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} md:w-4 md:h-4 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
                <div className={`mission-hud-stat-label ${compact ? 'text-[6px]' : 'text-[8px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>Time</div>
              </div>
              <div className={`mission-hud-stat-value mt-0.5 relative ${compact ? 'text-[0.82rem]' : 'text-[1.02rem]'} md:text-[1.2rem] font-black ${timeLeft < 10 ? 'text-amber-500' : accentText}`}>{timeLeft}s</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`aaa-progress-shell mission-progress-shell mission-hud-progress relative w-full ${compact ? 'h-3.5 md:h-4' : 'h-7 md:h-8'} overflow-hidden rounded-full`}>
        <img src={sliderBgAsset} alt="progress bar background" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="progress bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={MAIN_PNG_SKIN.separator} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-80" />
        <div className={`hud-progress-track absolute ${progressTrackInsetClass} overflow-hidden rounded-full`}>
          <motion.div
            className="hud-progress-fill absolute inset-y-0 left-0 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <img src={sliderFillAsset} alt="progress" className="h-full w-full object-fill" />
            <div className={`absolute inset-0 ${progressBar}`} />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.15)_20%,rgba(255,255,255,0.5)_35%,rgba(255,255,255,0.15)_50%)] bg-[length:200%_100%] animate-[hud-shine_2.4s_linear_infinite]" />
          </motion.div>
        </div>
        <div className={`hud-progress-label absolute inset-0 flex items-center justify-center ${compact ? 'text-[6px]' : 'text-[10px]'} md:text-[11px] font-black uppercase tracking-[0.14em] text-slate-50 drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`}>
          {Math.round(progress)}% complete
        </div>
      </div>
    </div>
  );
};

export default GameplayHUD;
