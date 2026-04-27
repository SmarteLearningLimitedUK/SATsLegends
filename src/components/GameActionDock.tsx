import React, { useEffect, useState } from 'react';
import AssetIcon from './AssetIcon';
import { triggerHaptic } from '../haptics';
import { emitUiAudio } from '../audio/uiAudioEvents';
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
    emitUiAudio('button_press', { action: 'toggle_mute' });
    setIsMuted(nextMuted);
    window.dispatchEvent(
      new CustomEvent(GAME_HUD_MUTE_EVENT, {
        detail: { muted: nextMuted },
      }),
    );
  };

  // Match the World Map dock look (blue capsule + tiled buttons).
  const dockButtonClass = [
    'relative inline-flex items-center justify-center border text-slate-100 overflow-hidden',
    'border-cyan-100/40 bg-[linear-gradient(180deg,rgba(75,137,232,0.9)_0%,rgba(45,102,194,0.9)_54%,rgba(29,75,153,0.92)_100%)]',
    'shadow-[0_12px_18px_rgba(2,6,23,0.45),0_0_0_1px_rgba(147,197,253,0.22),0_0_18px_rgba(125,211,252,0.18),inset_0_2px_0_rgba(255,255,255,0.32),inset_0_-14px_22px_rgba(2,6,23,0.26)]',
    'transition-[transform,filter,box-shadow,background] duration-150 ease-out',
    'before:content-[\"\"] before:absolute before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_24%_20%,rgba(255,255,255,0.36),rgba(255,255,255,0)_44%),linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0)_46%)] before:opacity-70 before:mix-blend-screen',
    'after:content-[\"\"] after:absolute after:inset-[1px] after:pointer-events-none after:rounded-[0.78rem] after:shadow-[inset_0_2px_0_rgba(255,255,255,0.20),inset_0_0_0_1px_rgba(255,255,255,0.10),inset_0_-14px_20px_rgba(2,6,23,0.30)]',
    'hover:brightness-110',
    'active:translate-y-[2px] active:scale-[0.98] active:brightness-95 active:shadow-[0_6px_12px_rgba(2,6,23,0.34),0_0_0_1px_rgba(147,197,253,0.16),0_0_14px_rgba(125,211,252,0.12),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-18px_26px_rgba(2,6,23,0.34)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1e4e]',
    'h-[42px] w-[42px] rounded-[0.85rem]',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ].join(' ');
  const dockIconClass = 'h-[18px] w-[18px] drop-shadow-[0_2px_2px_rgba(0,0,0,0.26)]';

  return (
    <div className="mt-0.5 flex w-full max-w-[calc(100vw-0.7rem)] shrink-0 items-center justify-center overflow-hidden">
      <div className="relative w-fit max-w-full shrink-0 rounded-[1.15rem] border border-cyan-100/26 bg-[linear-gradient(180deg,rgba(16,40,96,0.84)_0%,rgba(9,24,64,0.88)_100%)] px-2 py-1.5 shadow-[0_10px_18px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[2px]">
        <div className="pointer-events-none absolute inset-[1px] rounded-[1.05rem] border border-cyan-100/14" />
        <div className="pointer-events-none absolute inset-x-3 top-[3px] h-3 rounded-full bg-cyan-200/10 blur-[2px]" />

        <div className={`relative grid ${compact ? 'gap-1.5' : 'gap-2'} grid-cols-2`}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              emitUiAudio('button_press', { action: 'back' });
              onBack();
            }}
            className={dockButtonClass}
            aria-label="Back"
            title="Back to map"
          >
            <AssetIcon name="back" className={dockIconClass} />
          </button>
          <button
            type="button"
            onClick={handleToggleMute}
            className={dockButtonClass}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={isMuted}
            title={isMuted ? 'Sound off' : 'Sound on'}
          >
            <AssetIcon name={isMuted ? 'soundMute' : 'sound'} className={dockIconClass} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameActionDock;
