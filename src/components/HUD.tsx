import React from 'react';
import { motion } from 'motion/react';
import { AnimationState, AvatarData, CloudCollapseLevelConfig } from '../types';
import AssetIcon from './AssetIcon';
import AnimatedAvatar from './AnimatedAvatar';
import sliderBgAsset from '../assets/casual_ui/hud/progress_bar_1__bg.png';
import sliderBorderAsset from '../assets/licensed/slices/progress_bar.png';
import sliderFillAsset from '../assets/casual_ui/hud/progress_bar_1__fg.png';
import titleFlagAsset from '../assets/licensed/slices/label_purple_long.png';

interface HUDProps {
  title?: string;
  score: number;
  targetScore: number;
  timeLeft: number;
  level: CloudCollapseLevelConfig;
  avatar: AvatarData;
}

const HUD: React.FC<HUDProps> = ({ title, score, targetScore, timeLeft, level, avatar }) => {
  const progress = Math.min((score / targetScore) * 100, 100);
  const avatarPose: AnimationState = progress >= 100
    ? 'victory'
    : timeLeft <= 12
      ? 'thinking'
      : score >= targetScore * 0.7
        ? 'victory'
        : 'idle';

  return (
    <div className="flex w-full shrink-0 flex-col gap-1.5 px-1 py-0.5 md:gap-3 md:px-2">
      <div className="relative flex items-center justify-between overflow-hidden rounded-[1.1rem] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] md:rounded-[2rem] md:p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_24%),linear-gradient(180deg,rgba(42,54,98,0.96),rgba(12,18,32,0.98))]" />
        <div className="absolute inset-0 border border-white/12" />

        <div className="relative z-10 flex shrink-0 items-center gap-2 md:gap-4">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 4 }}
            className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-lg md:h-16 md:w-16 md:rounded-3xl"
          >
            <div className="absolute inset-0 rounded-[inherit] border border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(17,24,39,0.18))]" />
            <AnimatedAvatar
              avatar={avatar}
              pose={avatarPose}
              frameDurationMs={1040}
              className="relative z-10 h-full w-full"
              imageClassName="object-bottom scale-[1.18] translate-y-[6%]"
            />
          </motion.div>

          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-black tracking-tight text-white drop-shadow-md md:text-xl">
              {title || `Level ${level.id}`}
            </h2>
            <div
              className="mt-0.5 inline-flex items-center gap-1 bg-center bg-no-repeat px-2 py-0.5 text-[8px] font-bold text-white/95 md:px-3 md:py-1 md:text-sm"
              style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%' }}
            >
              <AssetIcon name="trophy" className="h-3 w-3 md:h-4 md:w-4" />
              <span>{title ? `Level ${level.id} - Target ${targetScore}` : `Target ${targetScore}`}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-end gap-0.5 md:gap-1">
          <div className="relative flex items-center gap-1 overflow-hidden rounded-xl px-1.5 py-1 md:gap-2 md:rounded-2xl md:px-4">
            <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
            <AssetIcon name="timer" className={`relative h-3 w-3 md:h-5 md:w-5 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
            <span className={`relative text-[11px] font-black md:text-xl ${timeLeft < 10 ? 'text-red-400' : 'text-slate-900'}`}>
              {timeLeft}s
            </span>
          </div>
          <motion.div
            key={score}
            initial={{ scale: 1.5, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="text-base font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] md:text-4xl"
          >
            {score}
          </motion.div>
        </div>
      </div>

      <div className="relative h-3.5 w-full overflow-hidden rounded-2xl p-1 shadow-inner md:h-10 md:rounded-3xl md:p-1.5">
        <img src={sliderBgAsset} alt="bar" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <motion.div
          className="relative h-full overflow-hidden rounded-xl md:rounded-2xl"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        >
          <img src={sliderFillAsset} alt="progress" className="absolute inset-0 h-full w-full object-fill" />
          <div className="shine rounded-xl md:rounded-2xl" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md md:text-sm">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default HUD;
