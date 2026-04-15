import React, { useEffect, useState } from 'react';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';
import {
  GAME_AUDIO_STORAGE_KEY,
  GAME_HUD_MUTE_EVENT,
  GAME_HUD_MUTE_SYNC_EVENT,
} from '../gameHudEvents';

interface GameActionDockProps {
  onBack: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
}

const GameActionDock: React.FC<GameActionDockProps> = ({
  onBack,
  accentClass: _accentClass,
  compact = false,
  variant = 'local',
}) => {
  if (variant !== 'global') {
    return null;
  }

  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');

  useEffect(() => {
    const handleMuteSync = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      if (typeof detail?.muted === 'boolean') {
        setIsMuted(detail.muted);
      }
    };

    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
    };
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    triggerHaptic('tap');
    setIsMuted(nextMuted);
    window.dispatchEvent(
      new CustomEvent(GAME_HUD_MUTE_EVENT, {
        detail: { muted: nextMuted },
      }),
    );
  };

  const buttonSizeClass = compact
    ? 'h-[42px] w-[42px] rounded-[0.85rem]'
    : 'h-[46px] w-[46px] rounded-[0.95rem]';

  const iconSizeClass = compact ? 'h-[18px] w-[18px]' : 'h-[20px] w-[20px]';

  const outerClass = 'mt-0.5 flex shrink-0 items-center justify-center';

  const actionButtonClass = [
    'inline-flex items-center justify-center border text-slate-100',
    'border-cyan-100/40 bg-[linear-gradient(180deg,rgba(75,137,232,0.9)_0%,rgba(45,102,194,0.9)_54%,rgba(29,75,153,0.92)_100%)]',
    'shadow-[0_6px_12px_rgba(2,6,23,0.33),inset_0_1px_0_rgba(255,255,255,0.26)]',
    'transition-[transform,filter,box-shadow,background] duration-150 ease-out',
    'hover:brightness-105 active:translate-y-[1px] active:brightness-95',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1e4e]',
    buttonSizeClass,
  ].join(' ');

  return (
    <div className={outerClass}>
      <div className="relative shrink-0 rounded-[1.15rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(16,40,96,0.84)_0%,rgba(9,24,64,0.88)_100%)] px-2 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
        <div className="pointer-events-none absolute inset-[1px] rounded-[1.05rem] border border-cyan-100/14" />
        <div className="pointer-events-none absolute inset-x-3 top-[3px] h-3 rounded-full bg-cyan-200/10 blur-[2px]" />

        <div className={`relative grid grid-cols-2 ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={actionButtonClass}
          aria-label="Back"
          title="Back to map"
        >
          <AssetIcon name="back" className={`${iconSizeClass} drop-shadow-[0_2px_2px_rgba(0,0,0,0.26)]`} />
        </button>
        <button
          type="button"
          onClick={handleToggleMute}
          className={actionButtonClass}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          aria-pressed={isMuted}
          title={isMuted ? 'Sound off' : 'Sound on'}
          >
          <AssetIcon
            name={isMuted ? 'soundMute' : 'sound'}
            className={`${iconSizeClass} drop-shadow-[0_2px_2px_rgba(0,0,0,0.26)]`}
          />
        </button>
        </div>
      </div>
    </div>
  );
};

export default GameActionDock;
