import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import hudProfileBar from '../assets/fantasy_hero/ui/uiamend_slices/hud_profile_bar.png';

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
          <div className="relative h-auto w-[clamp(10.6rem,52vw,14.9rem)] shrink-0">
            <img src={hudProfileBar} alt="" aria-hidden="true" draggable={false} className="h-auto w-full object-contain" />
            <div className="absolute left-[4.1%] top-1/2 h-[79%] w-[25.6%] -translate-y-1/2">
              <div className="absolute inset-[9%] overflow-hidden rounded-[30%]">
                <img
                  src={avatarImage}
                  alt={avatarName}
                  draggable={false}
                  className="h-full w-full object-contain object-center drop-shadow-[0_3px_6px_rgba(2,6,23,0.45)]"
                />
              </div>
            </div>
            <div className="pointer-events-none absolute left-[31.8%] right-[6.2%] top-1/2 -translate-y-1/2 overflow-hidden text-left text-[clamp(0.78rem,2.3vw,1.02rem)] font-black uppercase tracking-[0.055em] text-cyan-50">
              <span
                className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ lineHeight: 1.08, textShadow: '0 1px 2px rgba(2,6,23,0.6)' }}
              >
                {playerName}
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex shrink-0 flex-row items-center">
          <div className="relative h-[clamp(2.35rem,7.1vh,3.35rem)] w-[clamp(8.8rem,42vw,13rem)]">
            <div className="pointer-events-none absolute inset-0 flex items-center">
              <div className="flex h-[84%] w-full items-center rounded-full border border-cyan-200/35 bg-slate-900/62 px-[clamp(0.32rem,1.2vw,0.58rem)] shadow-[0_6px_16px_rgba(2,6,23,0.45)]">
                <img
                  src={hourglassIcon}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-[72%] w-auto shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(2,6,23,0.5)]"
                />
                <div className="relative ml-[clamp(0.3rem,1vw,0.5rem)] h-[44%] flex-1 overflow-hidden rounded-full border border-cyan-100/25 bg-slate-950/58">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    animate={{ width: `${timerProgress * 100}%`, backgroundColor: timerFillColor }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    style={{
                      boxShadow: '0 0 10px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                      backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 100%)',
                    }}
                  />
                  <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                </div>
                <span className="ml-[clamp(0.3rem,1vw,0.56rem)] shrink-0 text-[clamp(0.62rem,1.9vw,0.92rem)] font-black uppercase tracking-[0.06em] text-white">
                  {Math.max(0, Math.floor(timeLeft))}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedMiniGameHud;
