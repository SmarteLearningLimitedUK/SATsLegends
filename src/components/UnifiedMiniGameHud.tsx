import React from 'react';
import { BookOpen, Flame, Heart } from 'lucide-react';
import { CHARACTER_AVATARS, DEFAULT_AVATAR_ID } from '../assets/characters';
import GameActionDock from './GameActionDock';
import { LEVEL_TIMERS_DISABLED } from '../app/testingFlags';

interface UnifiedMiniGameHudProps {
  avatarId?: string;
  timeLeft: number;
  totalTime: number;
  hidden?: boolean;
  hideTimer?: boolean;
  hideTopBar?: boolean;
  lives?: number;
  onBack?: () => void;
  onHelp?: () => void;
  title?: string;
  levelLabel?: string;
  streak?: number;
  isPractice?: boolean;
  variant?: 'gameplay' | 'hub';
  showActions?: boolean;
  bottomContent?: React.ReactNode;
}

const UnifiedMiniGameHud: React.FC<UnifiedMiniGameHudProps> = ({
  avatarId, timeLeft, totalTime, hidden = false, hideTimer = false,
  hideTopBar = false, lives = 3, onBack, onHelp, title = 'SATs Legends',
  levelLabel = 'Adventure', streak = 0, isPractice = false,
  variant = 'gameplay', showActions = true, bottomContent,
}) => {
  const avatar = CHARACTER_AVATARS.find((entry) => entry.id === avatarId)
    ?? CHARACTER_AVATARS.find((entry) => entry.id === DEFAULT_AVATAR_ID)
    ?? CHARACTER_AVATARS[0];
  const showTimer = !hideTimer && !LEVEL_TIMERS_DISABLED;
  const progress = Math.max(0, Math.min(1, totalTime > 0 ? timeLeft / totalTime : 0));
  if (hidden) return null;

  return (
    <div data-unified-minigame-hud="true" className="pointer-events-none absolute inset-0 z-[120]">
      {hideTopBar ? null : (
        <div className="absolute inset-x-0 top-0 flex justify-center" style={{
          paddingTop: 'calc((env(safe-area-inset-top) + 0.35rem) / var(--game-stage-scale, 1))',
          paddingLeft: '0.4rem', paddingRight: '0.4rem',
        }}>
          <div className="legend-hud-bar" data-testid="shared-top-hud">
            <div className="legend-hud-avatar"><img src={avatar?.portrait || avatar?.image} alt={avatar?.name || 'Your hero'} draggable={false} /></div>
            <div className="legend-hud-mission">
              <div className="legend-hud-label">{isPractice ? 'Warm-up mission' : levelLabel}</div>
              <div className="legend-hud-title">{title}</div>
              {showTimer ? (
                <div className={`legend-hud-timer ${progress <= .3 ? 'is-low' : ''}`} role="progressbar" aria-label="Time remaining" aria-valuemin={0} aria-valuemax={totalTime} aria-valuenow={timeLeft}>
                  <div style={{ width: `${progress * 100}%` }} />
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {variant === 'gameplay' ? (
                isPractice ? <span className="legend-hud-practice inline-flex items-center gap-1"><BookOpen size={17} aria-hidden="true" />Practice</span> : (
                  <div className="legend-hud-lives" role="img" aria-label={`${lives} of 3 lives remaining`}>
                    {[1, 2, 3].map((heart) => <Heart key={heart} fill="currentColor" className={heart > lives ? 'is-empty' : ''} aria-hidden="true" />)}
                  </div>
                )
              ) : null}
              <span className="legend-hud-streak" aria-live="polite" aria-atomic="true">
                {streak > 1 ? <><Flame size={13} aria-hidden="true" />{streak} in a row</> : showTimer ? `${Math.max(0, Math.floor(timeLeft))}s` : null}
              </span>
            </div>
          </div>
        </div>
      )}
      {(bottomContent || (showActions && onBack)) ? (
        <>
          <div className="legend-dock-base" aria-hidden="true" />
          <div data-testid="shared-bottom-hud" className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center" style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) / var(--game-stage-scale, 1))',
            paddingLeft: '0.35rem', paddingRight: '0.35rem',
          }}>
            <div className="pointer-events-auto max-w-[calc(100vw-0.7rem)] overflow-hidden">
              {bottomContent ?? (onBack ? <GameActionDock onBack={onBack} onHelp={onHelp} compact variant="global" /> : null)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
export default UnifiedMiniGameHud;
