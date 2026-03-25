import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import heartIcon from '../assets/casual_ui/icons/icon__heart.png';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';

interface UnifiedMiniGameHudProps {
  playerName: string;
  avatarId?: string;
  timeLeft: number;
  totalTime: number;
  hidden?: boolean;
  hideTimer?: boolean;
  lives?: number;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  playerName,
  avatarId,
  timeLeft,
  totalTime,
  hidden = false,
  hideTimer = false,
  lives = 3,
}) => {
  const timerProgress = useMemo(
    () => Math.max(0, Math.min(1, totalTime > 0 ? timeLeft / totalTime : 0)),
    [timeLeft, totalTime],
  );

  const avatar = useMemo(() => (
    CHARACTER_AVATARS.find((entry) => entry.id === avatarId)
    || CHARACTER_AVATARS.find((entry) => entry.id === DEFAULT_AVATAR_ID)
    || CHARACTER_AVATARS[0]
  ), [avatarId]);
  const sharedHudHeightClass = 'h-[clamp(34px,8.8vw,44px)]';

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
      <div className="flex w-full items-center justify-between gap-2 px-[2px] py-[clamp(0.2rem,0.58vh,0.42rem)]">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`relative ${sharedHudHeightClass} w-[clamp(34px,8.8vw,44px)] shrink-0 rounded-[0.72rem] border-2 border-amber-300/95 bg-[linear-gradient(180deg,#274f92_0%,#1a356d_100%)] shadow-[0_8px_16px_rgba(2,6,23,0.42)]`}
            style={{
              visibility: hideTimer ? 'hidden' : 'visible',
            }}
          >
            <div className="absolute inset-[3px] overflow-hidden rounded-[0.52rem] border border-cyan-100/40">
              <img
                src={avatar?.portrait || avatar?.image}
                alt="Player avatar"
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div
            className={`flex ${sharedHudHeightClass} min-w-0 w-[clamp(84px,23vw,124px)] items-center rounded-[0.82rem] border-2 border-amber-300/95 bg-[linear-gradient(180deg,#2f5da8_0%,#1a3877_100%)] px-3 shadow-[0_8px_16px_rgba(2,6,23,0.42)]`}
          >
            <span
              className="block w-full truncate text-center text-[clamp(0.68rem,1.86vw,0.9rem)] font-black uppercase tracking-[0.045em] text-slate-100"
            >
              {playerName}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={`flex ${sharedHudHeightClass} w-[clamp(148px,39vw,184px)] items-center rounded-full border-2 border-cyan-100/55 bg-[linear-gradient(180deg,#2f5daa_0%,#1e3f88_100%)] px-1.5 shadow-[0_8px_16px_rgba(2,6,23,0.4)]`}
            style={{
              visibility: hideTimer ? 'hidden' : 'visible',
            }}
          >
            <div className="inline-flex h-[74%] w-[clamp(22px,6vw,28px)] shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f9cf5d_0%,#f59e0b_100%)] text-slate-900 shadow-[0_2px_6px_rgba(2,6,23,0.35)]">
              <img
                src={hourglassIcon}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="h-[68%] w-[68%] object-contain"
              />
            </div>
            <div className="relative ml-1.5 h-[40%] min-w-0 flex-1 overflow-hidden rounded-full border border-cyan-100/35 bg-slate-950/60">
              <motion.div
                className="absolute inset-y-[2px] left-[2px] rounded-full bg-[linear-gradient(90deg,#5cf44a_0%,#22d34e_58%,#11bfa8_100%)] shadow-[0_0_9px_rgba(74,222,128,0.55)]"
                animate={{ width: `max(0px, calc(${timerProgress * 100}% - 4px))` }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
              <div className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
            </div>
            <span className="ml-1.5 shrink-0 text-[clamp(0.62rem,1.72vw,0.84rem)] font-black uppercase text-slate-100">
              {Math.max(0, Math.floor(timeLeft))}s
            </span>
          </div>

          <div
            className={`inline-flex ${sharedHudHeightClass} w-[clamp(34px,8.8vw,44px)] shrink-0 items-center justify-center gap-1 rounded-full border border-cyan-100/65 bg-[linear-gradient(180deg,#1f5ab0_0%,#1e3f89_100%)] px-1.5 text-[0.88rem] font-black text-slate-100 shadow-[0_8px_16px_rgba(2,6,23,0.35)]`}
          >
            <img
              src={heartIcon}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-4 w-4 object-contain"
            />
            <span>{lives}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedMiniGameHud;
