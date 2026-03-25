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

const GameActionDock: React.FC<GameActionDockProps> = ({
  onBack,
  accentClass: _accentClass,
  compact: _compact,
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

  const handleOpenHelp = () => {
    triggerHaptic('tap');
    window.dispatchEvent(new Event(GAME_HUD_HELP_EVENT));
  };

  const outerClass = 'mt-0.5 flex shrink-0 items-center justify-center';

  const actionButtonClass = 'inline-flex h-16 w-16 items-center justify-center rounded-[1.2rem] border-2 border-cyan-100/70 bg-[linear-gradient(180deg,#4f95ff_0%,#2f6ee8_52%,#2457c4_100%)] text-white shadow-[0_10px_20px_rgba(2,6,23,0.36),inset_0_1px_0_rgba(255,255,255,0.45)] transition hover:brightness-110 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200';

  return (
    <div className={outerClass}>
      <div className="shrink-0 rounded-[1.5rem] border border-cyan-200/40 bg-[linear-gradient(180deg,#102868_0%,#0a1b4b_100%)] p-2 shadow-[0_12px_22px_rgba(2,6,23,0.5),inset_0_1px_0_rgba(255,255,255,0.14)]">
        <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={actionButtonClass}
          aria-label="Back"
        >
          <AssetIcon name="back" className="h-7 w-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]" />
        </button>
        <button
          onClick={handleToggleMute}
          className={actionButtonClass}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          <AssetIcon name={isMuted ? 'soundMute' : 'sound'} className="h-7 w-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]" />
        </button>
        <button
          onClick={handleOpenHelp}
          className={actionButtonClass}
          aria-label="Hint"
        >
          <AssetIcon name="question" className="h-7 w-7 drop-shadow-[0_2px_2px_rgba(0,0,0,0.28)]" />
        </button>
        </div>
      </div>
    </div>
  );
};

export default GameActionDock;
