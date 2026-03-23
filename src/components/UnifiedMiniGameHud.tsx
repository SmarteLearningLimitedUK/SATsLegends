import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import shieldIcon from '../assets/casual_ui/icons/icon__shield.png';
import hudProfileBar from '../assets/fantasy_hero/ui/uiamend_slices/hud_profile_bar.png';
import hudTimerBar from '../assets/fantasy_hero/ui/uiamend_slices/hud_timer_bar.png';
import hudTimerTrack from '../assets/fantasy_hero/ui/uiamend_slices/hud_timer_track.png';

interface UnifiedMiniGameHudProps {
  avatarImage: string;
  avatarName: string;
  playerName: string;
  timeLeft: number;
  totalTime: number;
  hidden?: boolean;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  avatarImage,
  avatarName,
  playerName,
  timeLeft,
  totalTime,
  hidden = false,
}) => {
  const timerProgress = useMemo(
    () => Math.max(0, Math.min(1, totalTime > 0 ? timeLeft / totalTime : 0)),
    [timeLeft, totalTime],
  );

  const timerFillColor = useMemo(() => {
    const hue = Math.round(timerProgress * 120);
    return `hsl(${hue} 88% 50%)`;
  }, [timerProgress]);

  if (hidden) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[120]"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingLeft: 'max(0.55rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.55rem, env(safe-area-inset-right))',
      }}
    >
      <div className="flex w-full flex-row items-center justify-between gap-[clamp(0.3rem,1.8vw,0.85rem)] py-[clamp(0.15rem,0.7vh,0.45rem)]">
        <div className="pointer-events-none flex min-w-0 flex-row items-center">
          <div className="relative h-auto w-[clamp(9.5rem,50vw,13.8rem)] shrink-0">
            <img src={hudProfileBar} alt="" aria-hidden="true" draggable={false} className="h-auto w-full object-contain" />
            <div className="absolute left-[5%] top-1/2 h-[76%] w-[24%] -translate-y-1/2">
              <div className="relative h-full w-full">
                <div className="absolute inset-[10%] overflow-hidden rounded-[30%]">
                  <img src={avatarImage} alt={avatarName} draggable={false} className="h-full w-full object-cover" />
                </div>
                <img
                  src={shieldIcon}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none absolute -right-[14%] -top-[8%] h-[35%] w-[35%] object-contain drop-shadow-[0_2px_4px_rgba(2,6,23,0.65)]"
                />
              </div>
            </div>
            <div className="pointer-events-none absolute left-[32%] right-[7%] top-1/2 -translate-y-1/2 overflow-hidden text-left text-[clamp(0.76rem,2.35vw,1.06rem)] font-black uppercase tracking-[0.06em] text-cyan-50">
              <span
                className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ textShadow: '0 1px 2px rgba(2,6,23,0.6)' }}
              >
                {playerName}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex shrink-0 flex-row items-center">
          <div className="relative h-auto w-[clamp(8.6rem,41vw,12.4rem)]">
            <img src={hudTimerBar} alt="" aria-hidden="true" draggable={false} className="h-auto w-full object-contain" />
            <div className="pointer-events-none absolute left-[28.6%] right-[4.1%] top-[38.8%] h-[24.5%] overflow-hidden rounded-full">
              <div className="absolute inset-0 rounded-full bg-slate-900/46" />
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ boxShadow: '0 0 8px rgba(34,197,94,0.65)' }}
              />
              <img
                src={hudTimerTrack}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="absolute inset-0 h-full w-full object-fill"
              />
            </div>
            <div className="pointer-events-none absolute left-[28.6%] right-[4.1%] top-[33.5%] flex h-[35%] items-center justify-center">
              <span className="text-[clamp(0.62rem,1.9vw,0.92rem)] font-black uppercase tracking-[0.06em] text-white">
                {Math.max(0, Math.floor(timeLeft))}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedMiniGameHud;

