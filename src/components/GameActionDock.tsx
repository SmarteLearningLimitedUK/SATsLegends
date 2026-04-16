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
    'game-dock-button ui-icon-button inline-flex items-center justify-center border-0 bg-transparent p-0 text-white',
    'disabled:cursor-not-allowed disabled:opacity-60',
    buttonSizeClass,
  ].join(' ');

  return (
    <div className={outerClass}>
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
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
          <AssetIcon name="back" className={iconSizeClass} />
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
            className={iconSizeClass}
          />
        </button>
      </div>
    </div>
  );
};

export default GameActionDock;
