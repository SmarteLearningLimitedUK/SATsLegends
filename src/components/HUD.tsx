import React from 'react';
import { motion } from 'motion/react';
import { AvatarData, CloudCollapseLevelConfig } from '../types';
import AssetIcon from './AssetIcon';
import sliderBgAsset from '../assets/casual_ui/hud/progress_bar_1__bg.png';
import sliderBorderAsset from '../assets/licensed/slices/progress_bar.png';
import sliderFillAsset from '../assets/casual_ui/hud/progress_bar_1__fg.png';
import titleFlagAsset from '../assets/licensed/slices/label_blue.png';
import { LEVEL_TIMERS_DISABLED } from '../app/testingFlags';

interface HUDProps {
  title?: string;
  XP: number;
  targetScore: number;
  timeLeft: number;
  level: CloudCollapseLevelConfig;
  avatar: AvatarData;
}

const HUD: React.FC<HUDProps> = ({ title, XP, targetScore, timeLeft, level, avatar: _avatar }) => {
  const progress = Math.min((XP / targetScore) * 100, 100);
  const shouldHideTimer = LEVEL_TIMERS_DISABLED || Boolean(level.isPractice);

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 px-1 py-0.5 md:gap-2 md:px-2">
      <div className="relative overflow-hidden rounded-[1rem] p-2 shadow-[0_14px_28px_rgba(0,0,0,0.26)] md:rounded-[1.35rem] md:p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.12),transparent_20%),linear-gradient(180deg,rgba(42,54,98,0.98),rgba(12,18,32,0.99))]" />
        <div className="absolute inset-0 border border-white/12" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]" />

        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-black tracking-[0.02em] text-white drop-shadow-md md:text-lg">
              {title || `Challenge ${level.id}`}
            </h2>
            <div
              className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-cyan-100/20 bg-[linear-gradient(180deg,rgba(63,120,255,0.86),rgba(28,59,135,0.9))] px-2 py-0.5 text-[8px] font-bold text-white/95 shadow-[0_6px_14px_rgba(2,6,23,0.22)] md:px-3 md:py-1 md:text-[10px]"
              style={{ backgroundImage: `url(${titleFlagAsset})`, backgroundSize: '100% 100%' }}
            >
              <AssetIcon name="trophy" className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span>Target {targetScore}</span>
            </div>
          </div>

          <div className={`grid ${shouldHideTimer ? 'grid-cols-1' : 'grid-cols-2'} gap-1 md:gap-1.5`}>
            {!shouldHideTimer ? (
              <div className="relative overflow-hidden rounded-[0.8rem] px-2 py-1 text-center md:rounded-[1rem] md:px-2.5 md:py-1.5">
                <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(226,232,240,0.92))]" />
                <div className="relative text-[7px] font-black uppercase tracking-[0.16em] text-slate-600 md:text-[9px]">Time</div>
                <div className={`relative mt-0.5 text-[11px] font-black md:text-sm ${timeLeft < 10 ? 'text-amber-500' : 'text-slate-900'}`}>
                  {timeLeft}s
                </div>
              </div>
            ) : null}

            <div className="relative overflow-hidden rounded-[0.8rem] px-2 py-1 text-center md:rounded-[1rem] md:px-2.5 md:py-1.5">
              <div className="absolute inset-0 rounded-[inherit] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(226,232,240,0.92))]" />
              <div className="relative text-[7px] font-black uppercase tracking-[0.16em] text-slate-600 md:text-[9px]">XP</div>
              <motion.div
                key={XP}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="relative mt-0.5 text-[11px] font-black text-slate-900 md:text-sm"
              >
                {XP}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full border border-cyan-100/18 p-0.5 shadow-[0_8px_18px_rgba(2,6,23,0.22)] md:h-4">
        <img src={sliderBgAsset} alt="bar" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <img src={sliderBorderAsset} alt="bar border" className="absolute inset-0 h-full w-full object-fill opacity-95" />
        <motion.div
          className="relative h-full overflow-hidden rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        >
          <img src={sliderFillAsset} alt="progress" className="absolute inset-0 h-full w-full object-fill" />
          <div className="shine rounded-full opacity-70" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase tracking-[0.12em] text-white drop-shadow-md md:text-[10px]">
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default HUD;
