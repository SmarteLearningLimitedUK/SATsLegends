import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import hourglassIcon from '../assets/casual_ui/icons/hourglass.png';
import heartIcon from '../assets/casual_ui/icons/icon__heart.png';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import GameActionDock from './GameActionDock';
import { LEVEL_TIMERS_DISABLED } from '../app/testingFlags';

interface UnifiedMiniGameHudProps {
  avatarId?: string;
  timeLeft: number;
  totalTime: number;
  gameTitle?: string;
  hidden?: boolean;
  hideTimer?: boolean;
  forceTimer?: boolean;
  hideAvatar?: boolean;
  hideLives?: boolean;
  hideTopBar?: boolean;
  hideTimerBar?: boolean;
  lives?: number;
  onBack?: () => void;
  variant?: 'gameplay' | 'hub';
  showActions?: boolean;
  bottomContent?: React.ReactNode;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  avatarId,
  timeLeft,
  totalTime,
  gameTitle,
  hidden = false,
  hideTimer = false,
  forceTimer = false,
  hideAvatar = false,
  hideLives = false,
  hideTopBar = false,
  hideTimerBar = false,
  lives = 3,
  onBack,
  variant = 'gameplay',
  showActions = true,
  bottomContent,
}) => {
  const shouldHideTimer = hideTimer || (LEVEL_TIMERS_DISABLED && !forceTimer);
  const timerProgress = useMemo(
    () => Math.max(0, Math.min(1, totalTime > 0 ? timeLeft / totalTime : 0)),
    [timeLeft, totalTime],
  );
  const timeValue = Math.max(0, Math.floor(timeLeft));
  const timeLabel = totalTime >= 600
    ? `${Math.floor(timeValue / 60)}:${String(timeValue % 60).padStart(2, '0')}`
    : `${timeValue}s`;
  const isLowTime = timerProgress <= 0.3;

  const avatar = useMemo(() => (
    CHARACTER_AVATARS.find((entry) => entry.id === avatarId)
    || CHARACTER_AVATARS.find((entry) => entry.id === DEFAULT_AVATAR_ID)
    || CHARACTER_AVATARS[0]
  ), [avatarId]);

  const sharedHudHeightClass = variant === 'hub'
    ? 'h-[clamp(34px,7.8vw,44px)]'
    : 'h-[clamp(40px,10vw,54px)]';
  const rootPaddingClass = variant === 'hub'
    ? 'px-[6px] py-[clamp(0.22rem,0.5vh,0.4rem)]'
    : 'px-[8px] py-[clamp(0.28rem,0.7vh,0.55rem)]';
  const compactBossTimer = forceTimer && hideTimerBar;
  const timerHeightClass = compactBossTimer
    ? 'h-[clamp(32px,8vw,40px)]'
    : sharedHudHeightClass;
  const timerWidthClass = hideTimerBar
    ? compactBossTimer
      ? 'w-[clamp(88px,20vw,112px)]'
      : 'w-[clamp(108px,24vw,142px)]'
    : variant === 'hub'
      ? 'w-[clamp(160px,38vw,220px)]'
      : 'w-[clamp(190px,44vw,240px)]';
  const avatarSizeClass = variant === 'hub'
    ? 'w-[clamp(34px,7.8vw,44px)]'
    : 'w-[clamp(40px,10vw,54px)]';
  const shellRadiusClass = variant === 'hub' ? 'rounded-[1.1rem]' : 'rounded-[1.25rem]';
  const topBarWidthClass = variant === 'hub'
    ? 'w-[min(92vw,480px)]'
    : 'w-[min(94vw,520px)]';

  if (hidden) return null;

  return (
    <div
      data-unified-minigame-hud="true"
      className="pointer-events-none absolute inset-x-0 inset-y-0 z-[120]"
    >
      {hideTopBar ? null : (
        <div
          className="absolute inset-x-0 top-0 flex justify-center"
          style={{
            // The whole app is rendered inside a scaled "phone stage". Compensate safe-area padding
            // so it remains correct after stage scaling.
            paddingTop: 'calc((env(safe-area-inset-top) + 0.35rem) / var(--game-stage-scale, 1))',
            paddingLeft: '0.4rem',
            paddingRight: '0.4rem',
          }}
        >
          <div
            className={`relative ${topBarWidthClass} grid items-center gap-2 ${rootPaddingClass} ${
              hideAvatar && shouldHideTimer && hideLives
                ? 'grid-cols-[auto] justify-start'
                : (hideAvatar && hideLives) || shouldHideTimer || hideLives
                  ? 'grid-cols-[auto_auto] justify-between'
                  : 'grid-cols-[auto_1fr_auto]'
            }`}
          >
            <div className={`pointer-events-none absolute inset-0 ${shellRadiusClass} ${variant === 'hub' ? 'bg-[linear-gradient(180deg,rgba(20,46,96,0.55)_0%,rgba(7,21,58,0.5)_100%)]' : 'bg-[linear-gradient(180deg,rgba(20,46,96,0.75)_0%,rgba(7,21,58,0.68)_100%)]'} shadow-[0_12px_24px_rgba(2,6,23,0.45)]`} />
            <div className={`pointer-events-none absolute inset-[1px] ${variant === 'hub' ? 'rounded-[0.92rem]' : 'rounded-[1.08rem]'} border border-cyan-200/25`} />
            {gameTitle ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-3">
                <div
                  className="relative flex h-[clamp(1.5rem,3.8vw,2rem)] w-[clamp(10rem,32vw,14.5rem)] items-center justify-center overflow-hidden rounded-full border border-amber-200/45 bg-[linear-gradient(180deg,rgba(244,197,70,0.18),rgba(8,18,43,0.78))] px-[clamp(0.75rem,2vw,1.1rem)] py-[0.1rem] text-center shadow-[0_4px_10px_rgba(2,6,23,0.24)] backdrop-blur-[2px]"
                >
                  <span className="truncate text-[clamp(0.58rem,1.4vw,0.78rem)] font-black uppercase tracking-[0.2em] text-amber-50 drop-shadow-[0_1px_0_rgba(0,0,0,0.45)]">
                    {gameTitle}
                  </span>
                </div>
              </div>
            ) : null}

            {hideAvatar ? null : (
            <div className="relative flex min-w-0 items-center gap-2.5 pl-1">
              <div
                className={`relative ${sharedHudHeightClass} ${avatarSizeClass} shrink-0 ${variant === 'hub' ? 'rounded-[0.8rem]' : 'rounded-[0.95rem]'} border-2 border-amber-300/95 bg-[linear-gradient(180deg,#2d63b7_0%,#1b3f86_100%)] shadow-[0_9px_18px_rgba(2,6,23,0.46)]`}
              >
                <div className={`pointer-events-none absolute -inset-[2px] ${variant === 'hub' ? 'rounded-[0.85rem]' : 'rounded-[1rem]'} bg-[radial-gradient(circle,rgba(125,211,252,0.34)_0%,rgba(125,211,252,0)_72%)]`} />
                <div className={`absolute inset-[3px] overflow-hidden ${variant === 'hub' ? 'rounded-[0.6rem]' : 'rounded-[0.72rem]'} border border-cyan-100/45`}>
                  <img
                    src={avatar?.portrait || avatar?.image}
                    alt="Player avatar"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className={`pointer-events-none absolute inset-0 ${variant === 'hub' ? 'rounded-[0.75rem]' : 'rounded-[0.9rem]'} bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0)_45%)]`} />
              </div>
            </div>
            )}

            <div className={`relative min-w-0 items-center justify-center px-1 ${shouldHideTimer ? 'hidden' : 'flex'}`}>
              <div
                className={`relative flex ${timerHeightClass} ${timerWidthClass} items-center rounded-full ${compactBossTimer ? 'backdrop-blur-[2px]' : ''} ${timerShellClass} ${compactBossTimer ? 'px-1' : 'px-1.5'}`}
              >
                <div className="flex min-w-0 flex-1 items-center">
                  <div className={`inline-flex h-[76%] ${compactBossTimer ? 'w-[clamp(20px,5.2vw,26px)]' : 'w-[clamp(24px,6.2vw,32px)]'} shrink-0 items-center justify-center rounded-full ${timerIconShellClass} text-slate-900 shadow-[0_3px_8px_rgba(2,6,23,0.38)]`}>
                    <img
                      src={hourglassIcon}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-[70%] w-[70%] object-contain"
                    />
                  </div>
                  {hideTimerBar ? null : (
                    <div className="relative ml-1.5 h-[44%] min-w-0 flex-1 overflow-hidden rounded-full border border-cyan-100/35 bg-slate-950/60">
                      <div className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
                      <motion.div
                        className={`absolute inset-y-[2px] left-[2px] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.58)] ${
                          isLowTime
                            ? 'bg-[linear-gradient(90deg,#f59e0b_0%,#ef4444_100%)]'
                            : 'bg-[linear-gradient(90deg,#5cf44a_0%,#22d34e_58%,#11bfa8_100%)]'
                        }`}
                        animate={{ width: `max(0px, calc(${timerProgress * 100}% - 4px))` }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      />
                      <motion.div
                        className="pointer-events-none absolute inset-y-[2px] w-10 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.42)_50%,rgba(255,255,255,0)_100%)]"
                        animate={{ x: ['-35%', '115%'] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                      />
                      <div className="pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:12%_100%]" />
                    </div>
                  )}
                </div>
                <span className={`${hideTimerBar ? (compactBossTimer ? 'ml-0.5' : 'ml-1') : 'ml-1.5'} shrink-0 font-black uppercase ${timerTextClass} [text-shadow:0_1px_0_rgba(0,0,0,0.35)] ${hideTimerBar ? (compactBossTimer ? 'text-[clamp(0.62rem,1.55vw,0.8rem)]' : 'text-[clamp(0.72rem,1.85vw,0.94rem)]') : variant === 'hub' ? 'text-[clamp(0.6rem,1.6vw,0.8rem)]' : 'text-[clamp(0.68rem,1.8vw,0.9rem)]'}`}>
                  {timeLabel}
                </span>
              </div>
            </div>

            {hideLives ? null : (
            <div className="relative flex shrink-0 items-center justify-end pr-1">
              <div
                className={`relative inline-flex ${sharedHudHeightClass} ${variant === 'hub' ? 'w-[clamp(52px,12vw,66px)]' : 'w-[clamp(58px,13vw,74px)]'} shrink-0 items-center justify-center gap-1 rounded-full border-2 border-cyan-100/65 bg-[linear-gradient(180deg,#245db3_0%,#1e3f89_100%)] px-2 font-black text-slate-100 shadow-[0_9px_18px_rgba(2,6,23,0.4)] ${variant === 'hub' ? 'text-[clamp(0.7rem,1.8vw,0.85rem)]' : 'text-[clamp(0.8rem,2vw,0.96rem)]'}`}
              >
                <div className={`pointer-events-none absolute inset-[2px] ${variant === 'hub' ? 'rounded-[0.9rem]' : 'rounded-full'} bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0)_45%)]`} />
                <img
                  src={heartIcon}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-[clamp(14px,3.8vw,18px)] w-[clamp(14px,3.8vw,18px)] object-contain"
                />
                <span className="relative [text-shadow:0_1px_0_rgba(0,0,0,0.35)]">{lives}</span>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {bottomContent ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
          style={{
            // Match map dock placement: sit on the safe-area inset (no extra float gap).
            paddingBottom: 'calc(env(safe-area-inset-bottom) / var(--game-stage-scale, 1))',
            paddingLeft: '0.35rem',
            paddingRight: '0.35rem',
          }}
        >
          <div className="pointer-events-auto max-w-[calc(100vw-0.7rem)] overflow-hidden">
            {bottomContent}
          </div>
        </div>
      ) : showActions && onBack ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) / var(--game-stage-scale, 1))',
            paddingLeft: '0.35rem',
            paddingRight: '0.35rem',
          }}
        >
          <div className="pointer-events-auto max-w-[calc(100vw-0.7rem)] overflow-hidden">
            <GameActionDock onBack={onBack} compact variant="global" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UnifiedMiniGameHud;
  const timerShellClass = compactBossTimer
    ? 'border border-amber-200/45 bg-[linear-gradient(180deg,rgba(244,197,70,0.18),rgba(8,18,43,0.78))] shadow-[0_4px_10px_rgba(2,6,23,0.24)]'
    : 'border-2 border-cyan-100/60 bg-[linear-gradient(180deg,#2f67ba_0%,#1f458f_100%)] shadow-[0_9px_18px_rgba(2,6,23,0.42)]';

  const timerIconShellClass = compactBossTimer
    ? 'border border-amber-100/60 bg-[linear-gradient(180deg,#f8d86d_0%,#f59e0b_100%)]'
    : 'border border-amber-100/70 bg-[linear-gradient(180deg,#f8d86d_0%,#f59e0b_100%)]';

  const timerTextClass = compactBossTimer
    ? 'text-amber-50'
    : 'text-slate-100';
