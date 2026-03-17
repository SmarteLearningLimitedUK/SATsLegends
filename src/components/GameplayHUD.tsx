import React from 'react';
import { motion } from 'motion/react';
import { AnimationState, AvatarData } from '../types';
import AssetIcon from './AssetIcon';
import AnimatedAvatar from './AnimatedAvatar';
import sliderBgAsset from '../assets/casual_ui/hud/progress_bar_3__bg.png';
import sliderBorderAsset from '../assets/licensed/slices/progress_bar.png';
import sliderFillAsset from '../assets/casual_ui/hud/progress_bar_3__fg.png';
import titleFlagAsset from '../assets/licensed/slices/label_blue.png';

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
  avatar,
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
  const avatarPose: AnimationState = progress >= 100
    ? 'victory'
    : timeLeft <= 12
      ? 'thinking'
      : score >= targetScore * 0.75
        ? 'victory'
        : 'idle';

  return (
    <div className="game-shell-zone game-shell-zone-hud w-full flex shrink-0 flex-col gap-1 md:gap-2">
      <div className={`fantasy-hud-shell relative w-full overflow-hidden ${compact ? 'rounded-[1rem]' : 'rounded-[1.25rem]'} shadow-[0_18px_50px_rgba(15,23,42,0.24)] md:rounded-[2rem]`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,rgba(43,60,103,0.96),rgba(14,21,40,0.98))]" />
        <div className="absolute inset-0 border border-white/12" />
        <div className={`relative flex flex-col ${compact ? 'gap-0.5 p-1' : 'gap-1 p-1.5'} md:p-5 lg:flex-row lg:items-center lg:justify-between`}>
          <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-1.5'} md:gap-4`}>
            <motion.div
              whileHover={{ scale: 1.06, rotate: -4 }}
              className={`${compact ? 'h-8 w-8 rounded-[0.8rem]' : 'h-9 w-9 rounded-[0.9rem]'} md:h-20 md:w-20 md:rounded-[2rem] flex items-center justify-center relative overflow-hidden shrink-0 bg-center bg-cover`}
            >
              <div className="absolute inset-0 rounded-[inherit] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(17,24,39,0.18))]" />
              <AnimatedAvatar
                avatar={avatar}
                pose={avatarPose}
                frameDurationMs={1020}
                className="relative z-10 h-full w-full"
                imageClassName="object-bottom scale-[1.18] translate-y-[6%]"
              />
            </motion.div>
            <div className="min-w-0">
              {!compact && <div className="text-[8px] md:text-xs font-black uppercase tracking-[0.22em] text-slate-100/82">Gameplay</div>}
              <h2 className={`${compact ? 'text-[0.95rem] leading-none' : 'text-[1.15rem]'} md:text-3xl font-black tracking-tight text-white truncate drop-shadow-[0_6px_16px_rgba(2,6,23,0.42)]`}>{title}</h2>
              <div className={`mt-0.5 inline-flex items-center gap-1 ${compact ? 'px-2 py-[2px] text-[6px]' : 'px-3 py-0.5 text-[7px]'} md:mt-1 md:gap-2 md:px-4 md:py-1.5 md:text-sm font-bold text-white drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`} style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}>
                <AssetIcon name="star" className="w-3 h-3 md:w-4 md:h-4" />
                <span>Target {targetScore}</span>
              </div>
            </div>
          </div>

          <div className={`grid w-full grid-cols-3 ${compact ? 'gap-0.5' : 'gap-1'} md:gap-3 lg:min-w-[360px]`}>
            {statLabel && (
              <div className={`relative rounded-[0.75rem] md:rounded-[1.5rem] ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center overflow-hidden`}>
                <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(226,232,240,0.92))]" />
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} relative md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>{statLabel}</div>
                <div className={`mt-0.5 md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[0.95rem]'} md:text-2xl font-black ${accentText}`}>{statValue}</div>
              </div>
            )}
            <div className={`relative rounded-[0.75rem] md:rounded-[1.5rem] ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center overflow-hidden`}>
              <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
              <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} relative md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>Score</div>
              <motion.div
                key={score}
                initial={{ scale: 1.16 }}
                animate={{ scale: 1 }}
                className={`mt-0.5 relative md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[1rem]'} md:text-3xl font-black ${accentText}`}
              >
                {score}
              </motion.div>
            </div>
            <div className={`relative rounded-[0.75rem] md:rounded-[1.5rem] ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center overflow-hidden`}>
              <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
              <div className={`relative flex items-center justify-center ${compact ? 'gap-0.5' : 'gap-1'} md:gap-2`}>
                <AssetIcon name="timer" className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} md:w-5 md:h-5 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-600`}>Time</div>
              </div>
              <div className={`mt-0.5 relative md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[0.95rem]'} md:text-3xl font-black ${timeLeft < 10 ? 'text-red-500' : accentText}`}>{timeLeft}s</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`relative w-full ${compact ? 'h-3' : 'h-4'} md:h-6 overflow-hidden rounded-full`}>
        <img src={sliderBgAsset} alt="progress bar background" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="progress bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
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
        <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-[7px]' : 'text-[8px]'} md:text-xs font-black uppercase tracking-[0.14em] text-slate-50 drop-shadow-[0_2px_8px_rgba(2,6,23,0.4)]`}>
          {Math.round(progress)}% complete
        </div>
      </div>
    </div>
  );
};

export default GameplayHUD;
