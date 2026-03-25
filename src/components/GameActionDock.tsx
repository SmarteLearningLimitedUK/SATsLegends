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
    ? 'mt-0.5 flex shrink-0 items-center justify-center'
    : 'game-shell-zone game-shell-zone-actions mt-0.5 flex shrink-0 items-center justify-center';

  const actionButtonClass = 'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-amber-300/90 bg-[linear-gradient(180deg,#315db4_0%,#1f428e_100%)] px-2.5 text-sm font-black text-white shadow-[0_7px_12px_rgba(2,6,23,0.34)] transition hover:brightness-110 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200';
  const iconBadgeClass = 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(180deg,#f9cf5d_0%,#f59e0b_100%)] text-slate-900 shadow-[0_2px_4px_rgba(2,6,23,0.28)]';

  return (
    <div className={outerClass}>
      <div className="shrink-0 rounded-2xl border-2 border-amber-300/90 bg-[linear-gradient(180deg,rgba(30,64,175,0.62),rgba(30,58,138,0.72))] p-2 shadow-[0_10px_20px_rgba(2,6,23,0.42)]">
        <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            triggerHaptic('tap');
            onBack();
          }}
          className={actionButtonClass}
          aria-label="Back"
        >
          <span className={iconBadgeClass}>
            <AssetIcon name="back" className="h-3.5 w-3.5" />
          </span>
          Back
        </button>
        <button
          onClick={handleToggleMute}
          className={actionButtonClass}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          <span className={iconBadgeClass}>
            <AssetIcon name={isMuted ? 'soundMute' : 'sound'} className="h-3.5 w-3.5" />
          </span>
          Sound
        </button>
        <button
          onClick={handleOpenHelp}
          className={actionButtonClass}
          aria-label="Hint"
        >
          <span className={iconBadgeClass}>
            <AssetIcon name="question" className="h-3.5 w-3.5" />
          </span>
          Help
        </button>
        </div>
      </div>
    </div>
  );
};

export default GameActionDock;
