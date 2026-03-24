import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';

interface UnifiedMiniGameHudProps {
  playerName: string;
  timeLeft: number;
  totalTime: number;
  hidden?: boolean;
  hideTimer?: boolean;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  playerName,
  timeLeft,
  totalTime,
  hidden = false,
  hideTimer = false,
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
      data-unified-minigame-hud="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[120]"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingLeft: 'max(0.55rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.55rem, env(safe-area-inset-right))',
      }}
    >
      <div className="flex w-full items-center justify-between gap-[clamp(0.28rem,1.5vw,0.85rem)] py-[clamp(0.15rem,0.65vh,0.42rem)]">
        <div className="flex min-w-0 items-center">
          <div
            className="flex h-[clamp(2.45rem,6.75vh,3.35rem)] w-[clamp(9.8rem,48vw,14.25rem)] min-w-0 items-center rounded-full px-[clamp(0.5rem,1.8vw,0.8rem)] shadow-[0_6px_16px_rgba(2,6,23,0.45)]"
            style={{
              border: '1px solid rgba(244, 208, 109, 0.55)',
              background: 'linear-gradient(180deg, rgba(43, 103, 185, 0.9) 0%, rgba(26, 71, 146, 0.92) 100%)',
            }}
          >
            <span
              className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[clamp(0.76rem,2.1vw,1rem)] font-black uppercase tracking-[0.055em] text-cyan-50"
              style={{ lineHeight: 1, textShadow: '0 1px 2px rgba(2,6,23,0.6)' }}
            >
              {playerName}
            </span>
          </div>
        </div>

        {!hideTimer && (
          <div className="flex shrink-0 items-center">
            <div
              className="flex h-[clamp(2.45rem,6.75vh,3.35rem)] w-[clamp(9.2rem,42vw,13.8rem)] items-center rounded-full px-[clamp(0.34rem,1.15vw,0.62rem)] shadow-[0_6px_16px_rgba(2,6,23,0.45)]"
              style={{
                border: '1px solid rgba(147, 211, 255, 0.52)',
                background: 'linear-gradient(180deg, rgba(41, 108, 191, 0.88) 0%, rgba(26, 78, 159, 0.9) 100%)',
              }}
            >
              <img
                src={hourglassIcon}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-[72%] w-auto shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(2,6,23,0.5)]"
              />
              <div className="relative ml-[clamp(0.3rem,1vw,0.5rem)] h-[44%] min-w-0 flex-1 overflow-hidden rounded-full border border-blue-200/35 bg-blue-950/55">
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
              <span className="ml-[clamp(0.28rem,0.95vw,0.56rem)] shrink-0 text-[clamp(0.62rem,1.9vw,0.92rem)] font-black uppercase tracking-[0.06em] text-white">
                {Math.max(0, Math.floor(timeLeft))}s
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMiniGameHud;
