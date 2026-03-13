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

const SpeakerOnIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-7 md:w-7" aria-hidden="true">
    <path d="M4 10h4l5-4v12l-5-4H4z" fill="currentColor" opacity="0.95" />
    <path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const SpeakerOffIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-7 md:w-7" aria-hidden="true">
    <path d="M4 10h4l5-4v12l-5-4H4z" fill="currentColor" opacity="0.95" />
    <path d="M16 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
    <path d="M17 8l4 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M21 8l-4 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

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
    <div className="mt-0.5 flex shrink-0 items-center justify-center md:mt-2">
      <div className="flex items-center gap-1.5 rounded-full border border-white/14 bg-black/24 px-1.5 py-1 shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-xl md:gap-3 md:px-3 md:py-2">
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={`game-dock-button ${accentClass}`}
          aria-label="Exit to map"
        >
          <AssetIcon name="home" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
        <button
          onClick={toggleMute}
          className={`game-dock-button ${accentClass} ${mutedState ? 'ring-2 ring-white/60 ring-offset-2 ring-offset-transparent' : ''}`}
          aria-label={mutedState ? 'Unmute audio' : 'Mute audio'}
        >
          {mutedState ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
        </button>
        <button
          onClick={openHelp}
          className={`game-dock-button ${accentClass}`}
          aria-label="Open rules"
        >
          <AssetIcon name="question" className="h-5 w-5 md:h-7 md:w-7" />
        </button>
      </div>
    </div>
  );
};

export default GameActionDock;
