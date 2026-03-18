import React from 'react';
import { motion } from 'motion/react';
import { AvatarData, CloudCollapseLevelConfig } from '../types';
import AssetIcon from './AssetIcon';
import sliderBgAsset from '../assets/casual_ui/hud/progress_bar_1__bg.png';
import sliderBorderAsset from '../assets/licensed/slices/progress_bar.png';
import sliderFillAsset from '../assets/casual_ui/hud/progress_bar_1__fg.png';
import titleFlagAsset from '../assets/licensed/slices/label_blue.png';

interface HUDProps {
  title?: string;
  score: number;
  targetScore: number;
  timeLeft: number;
  level: CloudCollapseLevelConfig;
  avatar: AvatarData;
}

const HUD: React.FC<HUDProps> = ({ title, score, targetScore, timeLeft, level, avatar: _avatar }) => {
  const progress = Math.min((score / targetScore) * 100, 100);

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 px-1 py-0.5 md:gap-2 md:px-2">
      <div className="relative overflow-hidden rounded-[1rem] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.2)] md:rounded-[1.35rem] md:p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_24%),linear-gradient(180deg,rgba(42,54,98,0.96),rgba(12,18,32,0.98))]" />
        <div className="absolute inset-0 border border-white/12" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-black tracking-tight text-white drop-shadow-md md:text-lg">
              {title || `Challenge ${level.id}`}
            </h2>
            <div
              className="mt-0.5 inline-flex items-center gap-1 bg-center bg-no-repeat px-2 py-0.5 text-[8px] font-bold text-white/95 md:px-3 md:py-1 md:text-[10px]"
              style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%' }}
            >
              <AssetIcon name="trophy" className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>Target {targetScore}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 md:gap-1.5">
            <div className="relative overflow-hidden rounded-[0.8rem] px-2 py-1 text-center md:rounded-[1rem] md:px-2.5 md:py-1.5">
              <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
              <div className="relative text-[7px] font-black uppercase tracking-[0.16em] text-slate-600 md:text-[9px]">Time</div>
              <div className={`relative mt-0.5 text-[11px] font-black md:text-sm ${timeLeft < 10 ? 'text-red-500' : 'text-slate-900'}`}>
                {timeLeft}s
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[0.8rem] px-2 py-1 text-center md:rounded-[1rem] md:px-2.5 md:py-1.5">
              <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
              <div className="relative text-[7px] font-black uppercase tracking-[0.16em] text-slate-600 md:text-[9px]">Score</div>
              <motion.div
                key={score}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="relative mt-0.5 text-[11px] font-black text-slate-900 md:text-sm"
              >
                {score}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full p-0.5 shadow-inner md:h-4">
        <img src={sliderBgAsset} alt="bar" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <motion.div
          className="relative h-full overflow-hidden rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        >
          <img src={sliderFillAsset} alt="progress" className="absolute inset-0 h-full w-full object-fill" />
          <div className="shine rounded-full" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-[0.12em] text-white drop-shadow-md md:text-[10px]">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default HUD;
