import React, { useEffect, useState } from 'react';
import AssetIcon from './AssetIcon';
import {
  GAME_AUDIO_STORAGE_KEY,
  GAME_HUD_HELP_EVENT,
  GAME_HUD_MUTE_EVENT,
  GAME_HUD_MUTE_SYNC_EVENT,
} from '../gameHudEvents';
import { triggerHaptic } from '../haptics';

interface GameActionDockProps {
  onBack: () => void;
  onHelp?: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  accentClass?: string;
}

const GameActionDock: React.FC<GameActionDockProps> = ({
  onBack,
  onHelp,
  onToggleMute,
  isMuted,
  accentClass = 'text-slate-700',
}) => {
  const [mutedState, setMutedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof isMuted === 'boolean') {
      setMutedState(isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleMuteSync = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      if (typeof detail?.muted === 'boolean') {
        setMutedState(detail.muted);
      }
    };

    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
    return () => window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
  }, []);

  const openHelp = () => {
    triggerHaptic('tap');
    if (onHelp) {
      onHelp();
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(GAME_HUD_HELP_EVENT));
    }
  };

  const toggleMute = () => {
    triggerHaptic('light');
    if (onToggleMute) {
      onToggleMute();
      return;
    }

    const nextMuted = !mutedState;
    setMutedState(nextMuted);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(GAME_AUDIO_STORAGE_KEY, String(nextMuted));
      window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted: nextMuted } }));
    }
  };

  return (
    <div className="game-shell-zone game-shell-zone-actions mt-0.5 flex shrink-0 items-center justify-center md:mt-2">
      <div className="ui-panel-unified fantasy-dock-shell aaa-dock-shell flex items-center gap-2 px-2 py-1.5 md:gap-3 md:px-3 md:py-2">
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={`ui-icon-button game-dock-button aaa-dock-button ${accentClass}`}
          aria-label="Exit to map"
        >
          <AssetIcon name="home" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={toggleMute}
          className={`ui-icon-button game-dock-button aaa-dock-button ${accentClass} ${mutedState ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-transparent' : ''}`}
          aria-label={mutedState ? 'Unmute audio' : 'Mute audio'}
        >
          <AssetIcon name={mutedState ? 'soundMute' : 'sound'} className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={openHelp}
          className={`ui-icon-button game-dock-button aaa-dock-button ${accentClass}`}
          aria-label="Open rules"
        >
          <AssetIcon name="question" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>
    </div>
  );
};

export default GameActionDock;
