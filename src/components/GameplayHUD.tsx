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
  score: number;
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
}

const GameplayHUD: React.FC<GameplayHUDProps> = ({
  title,
  avatar: _avatar,
  score,
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
}) => {
  const showExtraStat = Boolean(statLabel) && statValue !== undefined && statValue !== null;

  return (
    <div className="game-shell-zone game-shell-zone-hud w-full flex shrink-0 flex-col gap-1">
      <div className={`fantasy-hud-shell aaa-hud-shell relative w-full overflow-hidden ${compact ? 'rounded-[0.95rem]' : 'rounded-[1.2rem]'} shadow-[0_14px_36px_rgba(15,23,42,0.22)] md:rounded-[1.6rem]`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.16),transparent_36%),linear-gradient(180deg,rgba(18,40,92,0.96),rgba(7,18,40,0.98))]" />
        <div className="absolute inset-0 border border-white/12" />

        <div className={`relative flex flex-col ${compact ? 'gap-1 p-1.5' : 'gap-1.5 p-2'} md:gap-2 md:p-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {!compact && <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-100/80">Gameplay</div>}
              <h2 className={`${compact ? 'text-[0.92rem]' : 'text-[1.05rem]'} md:text-[1.35rem] font-black tracking-tight text-white truncate drop-shadow-[0_4px_12px_rgba(2,6,23,0.4)]`}>
                {title}
              </h2>
            </div>

            <div
              className={`inline-flex shrink-0 items-center gap-1 ${compact ? 'px-2 py-[2px] text-[7px]' : 'px-2.5 py-1 text-[8px]'} md:gap-1.5 md:px-3 md:py-1 md:text-[10px] font-bold text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`}
              style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
            >
              <AssetIcon name="star" className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>Target {targetScore}</span>
            </div>
          </div>

          <div className={`grid w-full ${showExtraStat ? 'grid-cols-3' : 'grid-cols-2'} ${compact ? 'gap-1' : 'gap-1.5'} md:gap-2`}>
            {showExtraStat && (
              <div className={`aaa-hud-stat relative rounded-[0.75rem] md:rounded-[1rem] ${compact ? 'px-1 py-0.5' : 'px-1.5 py-1'} md:px-2 md:py-1.5 text-center overflow-hidden`}>
                <div className="aaa-hud-stat-surface absolute inset-0 rounded-[inherit]" />
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} relative md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>{statLabel}</div>
                <div className={`mt-0.5 ${compact ? 'text-[0.82rem]' : 'text-[0.92rem]'} md:text-xl font-black ${accentText}`}>{statValue}</div>
              </div>
            )}

            <div className={`aaa-hud-stat relative rounded-[0.75rem] md:rounded-[1rem] ${compact ? 'px-1 py-0.5' : 'px-1.5 py-1'} md:px-2 md:py-1.5 text-center overflow-hidden`}>
              <div className="aaa-hud-stat-surface absolute inset-0 rounded-[inherit]" />
              <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} relative md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>Score</div>
              <motion.div
                key={score}
                initial={{ scale: 1.12 }}
                animate={{ scale: 1 }}
                className={`mt-0.5 relative ${compact ? 'text-[0.82rem]' : 'text-[0.98rem]'} md:text-xl font-black ${accentText}`}
              >
                {score}
              </motion.div>
            </div>

            <div className={`aaa-hud-stat relative rounded-[0.75rem] md:rounded-[1rem] ${compact ? 'px-1 py-0.5' : 'px-1.5 py-1'} md:px-2 md:py-1.5 text-center overflow-hidden`}>
              <div className="aaa-hud-stat-surface absolute inset-0 rounded-[inherit]" />
              <div className={`relative flex items-center justify-center ${compact ? 'gap-0.5' : 'gap-1'} md:gap-2`}>
                <AssetIcon name="timer" className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} md:w-4 md:h-4 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>Time</div>
              </div>
              <div className={`mt-0.5 relative ${compact ? 'text-[0.82rem]' : 'text-[0.95rem]'} md:text-xl font-black ${timeLeft < 10 ? 'text-red-500' : accentText}`}>{timeLeft}s</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`aaa-progress-shell relative w-full ${compact ? 'h-2.5' : 'h-3'} md:h-4 overflow-hidden rounded-full`}>
        <img src={sliderBgAsset} alt="progress bar background" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="progress bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={MAIN_PNG_SKIN.separator} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-80" />
        <div className="absolute inset-[6%] overflow-hidden rounded-full">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <img src={sliderFillAsset} alt="progress" className="h-full w-full object-fill" />
            <div className={`absolute inset-0 ${progressBar}`} />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.15)_20%,rgba(255,255,255,0.5)_35%,rgba(255,255,255,0.15)_50%)] bg-[length:200%_100%] animate-[hud-shine_2.4s_linear_infinite]" />
          </motion.div>
        </div>
        <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-[6px]' : 'text-[7px]'} md:text-[10px] font-black uppercase tracking-[0.14em] text-slate-50 drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`}>
          {Math.round(progress)}% complete
        </div>
      </div>
    </div>
  );
};

export default GameplayHUD;
