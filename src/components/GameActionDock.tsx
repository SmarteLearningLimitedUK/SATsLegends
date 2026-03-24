import React, { useEffect, useState } from 'react';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';
import {
  GAME_AUDIO_STORAGE_KEY,
  GAME_HUD_HELP_EVENT,
  GAME_HUD_MUTE_EVENT,
  GAME_HUD_MUTE_SYNC_EVENT,
} from '../gameHudEvents';

interface GameActionDockProps {
  onBack: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
}

const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, variant = 'local' }) => {
  // Standardize all minigames to the Place Value Panic dock style.
  const resolvedAccentClass = 'text-slate-100';
  const resolvedCompact = true;
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

  const handleOpenHelp = () => {
    triggerHaptic('tap');
    window.dispatchEvent(new Event(GAME_HUD_HELP_EVENT));
  };

  const outerClass = variant === 'global'
    ? 'mt-0.5 flex shrink-0 items-center justify-center md:mt-2'
    : 'game-shell-zone game-shell-zone-actions mt-0.5 flex shrink-0 items-center justify-center md:mt-2';

  return (
    <div className={outerClass}>
      <div className={`ui-panel-unified fantasy-dock-shell aaa-dock-shell flex items-center ${resolvedCompact ? 'gap-1 px-1 py-1 md:gap-1.5 md:px-1.5 md:py-1.5' : 'gap-2 px-2 py-1.5 md:gap-3 md:px-3 md:py-2'}`}>
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={`ui-icon-button game-dock-button aaa-dock-button ${resolvedCompact ? 'aaa-dock-button-compact' : ''} ${resolvedAccentClass}`}
          aria-label="Back"
        >
          <AssetIcon name="back" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={handleToggleMute}
          className={`ui-icon-button game-dock-button aaa-dock-button ${resolvedCompact ? 'aaa-dock-button-compact' : ''} ${resolvedAccentClass}`}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          <AssetIcon name={isMuted ? 'soundMute' : 'sound'} className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={handleOpenHelp}
          className={`ui-icon-button game-dock-button aaa-dock-button ${resolvedCompact ? 'aaa-dock-button-compact' : ''} ${resolvedAccentClass}`}
          aria-label="Hint"
        >
          <AssetIcon name="question" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>
    </div>
  );
};

export default GameActionDock;
