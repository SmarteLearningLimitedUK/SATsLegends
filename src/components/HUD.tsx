import React from 'react';
import { motion } from 'motion/react';
import { AnimationState, AvatarData, CloudCollapseLevelConfig } from '../types';
import AssetIcon from './AssetIcon';
import AnimatedAvatar from './AnimatedAvatar';
import progressBarAsset from '../assets/licensed/slices/progress_bar.png';

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
    <div className="w-full shrink-0 px-1 py-0.5 md:px-2 flex flex-col gap-1.5 md:gap-3">
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl p-2 md:p-4 rounded-[1.1rem] md:rounded-[2rem] border-2 md:border-4 border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.1)] gap-1.5 md:gap-2">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`${avatar.color} w-8 h-8 md:w-16 md:h-16 shrink-0 rounded-xl md:rounded-3xl flex items-center justify-center shadow-lg border-2 md:border-4 border-white relative overflow-hidden`}
          >
            <div className="shine" />
            <AnimatedAvatar
              avatar={avatar}
              pose={avatarPose}
              frameDurationMs={1040}
              className="relative z-10 h-full w-full"
              imageClassName="object-bottom scale-[1.18] translate-y-[6%]"
            />
          </motion.div>
          <div className="min-w-0">
            <h2 className="text-[11px] md:text-xl font-black text-white drop-shadow-md tracking-tight truncate">{title || `Level ${level.id}`}</h2>
            <div className="flex items-center gap-1 text-white/90 font-bold text-[9px] md:text-sm">
              <AssetIcon name="trophy" className="w-3 h-3 md:w-4 md:h-4" />
              <span>{title ? `Level ${level.id} • Target ${targetScore}` : `Target: ${targetScore}`}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5 md:gap-1">
          <div className="flex items-center gap-1 md:gap-2 bg-black/10 px-1.5 md:px-4 py-1 rounded-xl md:rounded-2xl border border-white/20">
            <AssetIcon name="timer" className={`w-3 h-3 md:w-5 md:h-5 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
            <span className={`text-[11px] md:text-xl font-black ${timeLeft < 10 ? "text-red-400" : "text-white"}`}>
              {timeLeft}s
            </span>
          </div>
          <motion.div
            key={score}
            initial={{ scale: 1.5, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="text-base md:text-4xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]"
          >
            {score}
          </motion.div>
        </div>
      </div>

      <div className="relative w-full h-3.5 md:h-10 bg-black/10 rounded-2xl md:rounded-3xl p-1 md:p-1.5 border-2 md:border-4 border-white/40 shadow-inner overflow-hidden">
        <img src={progressBarAsset} alt="bar" className="absolute inset-0 h-full w-full object-fill opacity-40" />
        <motion.div
          className="h-full rounded-xl md:rounded-2xl relative overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        >
          <img src={progressBarAsset} alt="progress" className="absolute inset-0 h-full w-full object-fill" />
          <div className="shine rounded-xl md:rounded-2xl" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-sm font-black text-white drop-shadow-md uppercase tracking-widest">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default HUD;
