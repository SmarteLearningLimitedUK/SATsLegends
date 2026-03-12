import React from 'react';
import { motion } from 'motion/react';
import { AvatarData } from '../types';
import AssetIcon from './AssetIcon';
import progressBarAsset from '../assets/licensed/slices/progress_bar.png';

interface GameplayHUDProps {
  title: string;
  avatar: AvatarData;
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
}) => {
  return (
    <div className="w-full flex flex-col gap-3 md:gap-4">
      <div className={`w-full rounded-[2rem] border-4 ${accentBorder} bg-white/70 backdrop-blur-2xl shadow-[0_18px_50px_rgba(15,23,42,0.16)] overflow-hidden`}>
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-r from-white/40 via-white/10 to-transparent pointer-events-none" />
        <div className="relative p-4 md:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <motion.div
              whileHover={{ scale: 1.06, rotate: -4 }}
              className={`${avatar.color} w-16 h-16 md:w-20 md:h-20 rounded-[1.6rem] md:rounded-[2rem] flex items-center justify-center text-3xl md:text-4xl shadow-[inset_0_2px_10px_rgba(255,255,255,0.35),0_12px_24px_rgba(15,23,42,0.18)] border-4 border-white/80 relative overflow-hidden shrink-0`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/35 to-transparent" />
              <span className="relative">{avatar.image}</span>
            </motion.div>
            <div className="min-w-0">
              <div className="text-[11px] md:text-xs font-black uppercase tracking-[0.28em] text-slate-500">Gameplay</div>
              <h2 className={`text-2xl md:text-3xl font-black tracking-tight ${accentText} truncate`}>{title}</h2>
              <div className={`mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${accentBorder} ${accentSoftBg} ${accentText}`}>
                <AssetIcon name="star" className="w-4 h-4" />
                <span>Target {targetScore}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 w-full lg:min-w-[420px]">
            {statLabel && (
              <div className={`rounded-xl md:rounded-[1.5rem] border-2 ${accentBorder} ${accentSoftBg} px-2 py-2 md:px-3 md:py-3 text-center`}>
                <div className="text-[9px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-500">{statLabel}</div>
                <div className={`mt-0.5 md:mt-1 text-lg md:text-2xl font-black ${accentText}`}>{statValue}</div>
              </div>
            )}
            <div className={`rounded-xl md:rounded-[1.5rem] border-2 ${accentBorder} bg-white/65 px-2 py-2 md:px-3 md:py-3 text-center`}>
              <div className="text-[9px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-500">Score</div>
              <motion.div
                key={score}
                initial={{ scale: 1.16 }}
                animate={{ scale: 1 }}
                className={`mt-1 text-2xl md:text-3xl font-black ${accentText}`}
              >
                {score}
              </motion.div>
            </div>
            <div className={`rounded-xl md:rounded-[1.5rem] border-2 ${accentBorder} ${accentSoftBg} px-2 py-2 md:px-3 md:py-3 text-center`}>
              <div className="flex items-center justify-center gap-1 md:gap-2">
                <AssetIcon name="timer" className={`w-3 h-3 md:w-5 md:h-5 ${timeLeft < 10 ? 'animate-pulse' : ''}`} />
                <div className="text-[9px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-500">Time</div>
              </div>
              <div className={`mt-0.5 md:mt-1 text-lg md:text-3xl font-black ${timeLeft < 10 ? 'text-red-500' : accentText}`}>{timeLeft}s</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full rounded-full border-2 ${accentBorder} bg-white/60 p-1.5 shadow-[inset_0_2px_8px_rgba(15,23,42,0.08)]`}>
        <div className="relative h-5 md:h-6 overflow-hidden rounded-full bg-slate-200/60">
          <img src={progressBarAsset} alt="progress bar" className="absolute inset-0 h-full w-full object-fill opacity-35" />
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <img src={progressBarAsset} alt="progress" className="h-full w-full object-fill" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.15)_20%,rgba(255,255,255,0.5)_35%,rgba(255,255,255,0.15)_50%)] bg-[length:200%_100%] animate-[hud-shine_2.4s_linear_infinite]" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-700">
            {Math.round(progress)}% complete
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameplayHUD;
