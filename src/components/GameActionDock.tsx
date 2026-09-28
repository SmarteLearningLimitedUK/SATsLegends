import React, { useEffect, useState } from 'react';
import { ArrowLeft, CircleHelp, Volume2, VolumeX } from 'lucide-react';
import { triggerHaptic } from '../haptics';
import { playGameSound } from '../audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';

interface GameActionDockProps {
  onBack: () => void;
  onHelp?: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
}
const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, variant = 'local' }) => {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  useEffect(() => {
    const sync = (event: Event) => {
      const muted = (event as CustomEvent<{ muted?: boolean }>).detail?.muted;
      if (typeof muted === 'boolean') setIsMuted(muted);
    };
    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, sync);
    return () => window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, sync);
  }, []);
  if (variant !== 'global') return null;
  const tap = (action: () => void) => { playGameSound('tap', isMuted); triggerHaptic('tap'); action(); };
  return (
    <nav className="legend-dock-surface" aria-label="Game controls">
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Back" title="Back to islands" onClick={() => tap(onBack)}><ArrowLeft aria-hidden="true" /><span>Back</span></button>
      {onHelp ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="How to play" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); tap(onHelp); }}><CircleHelp aria-hidden="true" /><span>Help</span></button> : null}
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label={isMuted ? 'Unmute audio' : 'Mute audio'} aria-pressed={isMuted} onClick={() => tap(() => {
        const muted = !isMuted;
        setIsMuted(muted);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted } }));
      })}>
        {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}<span>Sound</span>
      </button>
    </nav>
  );
};
export default GameActionDock;
