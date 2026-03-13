import React from 'react';
import { motion } from 'motion/react';
import { AnimationState, AvatarData } from '../types';
import AssetIcon from './AssetIcon';
import AnimatedAvatar from './AnimatedAvatar';
import progressBarAsset from '../assets/casual_ui/hud/progress_bar_1__fg.png';
import progressBarBgAsset from '../assets/casual_ui/hud/progress_bar_1__bg.png';
import profileContainerAsset from '../assets/casual_ui/hud/hud__profile_container.png';
import scoreTimerBoardAsset from '../assets/casual_ui/hud/hud__score_timer_board.png';

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
  accentSoftBg,
  accentBorder,
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
    <div className="w-full flex shrink-0 flex-col gap-1 md:gap-2">
      <div className={`w-full ${compact ? 'rounded-[0.95rem]' : 'rounded-[1.15rem]'} border-2 md:rounded-[2rem] md:border-4 ${accentBorder} bg-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.16)] overflow-hidden relative`}>
        <div className="absolute inset-0 opacity-90 pointer-events-none bg-center bg-cover" style={{ backgroundImage: `url(${scoreTimerBoardAsset})` }} />
        <div className={`relative flex flex-col ${compact ? 'gap-0.5 p-1' : 'gap-1 p-1.5'} md:p-5 lg:flex-row lg:items-center lg:justify-between`}>
          <div className={`flex min-w-0 items-center ${compact ? 'gap-1' : 'gap-1.5'} md:gap-4`}>
            <motion.div
              whileHover={{ scale: 1.06, rotate: -4 }}
              className={`${avatar?.color || 'bg-slate-200'} ${compact ? 'h-8 w-8 rounded-[0.8rem]' : 'h-9 w-9 rounded-[0.9rem]'} md:h-20 md:w-20 md:rounded-[2rem] flex items-center justify-center border-2 border-white/70 relative overflow-hidden shrink-0 bg-center bg-cover`}
            >
              <div className="absolute inset-0 opacity-95" style={{ backgroundImage: `url(${profileContainerAsset})`, backgroundSize: '100% 100%' }} />
              <AnimatedAvatar
                avatar={avatar}
                pose={avatarPose}
                frameDurationMs={1020}
                className="relative z-10 h-full w-full"
                imageClassName="object-bottom scale-[1.18] translate-y-[6%]"
              />
            </motion.div>
            <div className="min-w-0">
              {!compact && <div className="text-[8px] md:text-xs font-black uppercase tracking-[0.22em] text-slate-300/82">Gameplay</div>}
              <h2 className={`${compact ? 'text-[0.95rem] leading-none' : 'text-[1.15rem]'} md:text-3xl font-black tracking-tight text-white truncate drop-shadow-[0_6px_16px_rgba(2,6,23,0.42)]`}>{title}</h2>
              <div className={`mt-0.5 inline-flex items-center gap-1 rounded-full border ${compact ? 'px-1 py-[2px] text-[6px]' : 'px-1.5 py-0.5 text-[7px]'} md:mt-1 md:gap-2 md:px-3 md:py-1 md:text-sm font-bold ${accentBorder} ${accentSoftBg} ${accentText}`}>
                <AssetIcon name="star" className="w-4 h-4" />
                <span>Target {targetScore}</span>
              </div>
            </div>
          </div>

          <div className={`grid w-full grid-cols-3 ${compact ? 'gap-0.5' : 'gap-1'} md:gap-3 lg:min-w-[360px]`}>
            {statLabel && (
              <div className={`rounded-[0.75rem] md:rounded-[1.5rem] border-2 ${accentBorder} ${accentSoftBg} ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center`}>
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-500`}>{statLabel}</div>
                <div className={`mt-0.5 md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[0.95rem]'} md:text-2xl font-black ${accentText}`}>{statValue}</div>
              </div>
            )}
            <div className={`rounded-[0.75rem] md:rounded-[1.5rem] border-2 ${accentBorder} bg-white/78 ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center`}>
              <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-500`}>Score</div>
              <motion.div
                key={score}
                initial={{ scale: 1.16 }}
                animate={{ scale: 1 }}
                className={`mt-0.5 md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[1rem]'} md:text-3xl font-black ${accentText}`}
              >
                {score}
              </motion.div>
            </div>
            <div className={`rounded-[0.75rem] md:rounded-[1.5rem] border-2 ${accentBorder} ${accentSoftBg} ${compact ? 'px-0.5 py-0.5' : 'px-1 py-0.75'} md:px-3 md:py-3 text-center`}>
              <div className={`flex items-center justify-center ${compact ? 'gap-0.5' : 'gap-1'} md:gap-2`}>
                <AssetIcon name="timer" className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} md:w-5 md:h-5 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
                <div className={`${compact ? 'text-[6px]' : 'text-[7px]'} md:text-xs font-black uppercase tracking-[0.16em] text-slate-500`}>Time</div>
              </div>
              <div className={`mt-0.5 md:mt-1 ${compact ? 'text-[0.82rem]' : 'text-[0.95rem]'} md:text-3xl font-black ${timeLeft < 10 ? 'text-red-500' : accentText}`}>{timeLeft}s</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full rounded-full border-2 ${accentBorder} bg-white/78 ${compact ? 'p-[2px]' : 'p-0.5'} md:p-1 shadow-[inset_0_2px_8px_rgba(15,23,42,0.08)]`}>
        <div className={`relative ${compact ? 'h-2' : 'h-2.5'} md:h-6 overflow-hidden rounded-full bg-slate-200/60`}>
          <img src={progressBarBgAsset} alt="progress bar background" className="absolute inset-0 h-full w-full object-fill opacity-95" />
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <img src={progressBarAsset} alt="progress" className="h-full w-full object-fill" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.15)_20%,rgba(255,255,255,0.5)_35%,rgba(255,255,255,0.15)_50%)] bg-[length:200%_100%] animate-[hud-shine_2.4s_linear_infinite]" />
          </motion.div>
          <div className={`absolute inset-0 flex items-center justify-center ${compact ? 'text-[7px]' : 'text-[8px]'} md:text-xs font-black uppercase tracking-[0.14em] text-slate-700`}>
            {Math.round(progress)}% complete
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameplayHUD;
