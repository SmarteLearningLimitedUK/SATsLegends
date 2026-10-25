import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lightbulb, HelpCircle, LayoutGrid, Music2, Volume2, VolumeX } from 'lucide-react';
import { ReferenceArt } from './game-ui/ReferenceScreenArt';
import { triggerHaptic } from '../haptics';
import { playGameSound } from '../audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUSIC_EVENT, GAME_HUD_MUSIC_SYNC_EVENT, GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT, GAME_MUSIC_STORAGE_KEY } from '../gameHudEvents';

interface GameActionDockProps {
  referenceSkin?: boolean;
  onBack: () => void;
  onHelp?: () => void;
  onWork?: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
}
const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, onWork, variant = 'local', referenceSkin = false }) => {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(GAME_MUSIC_STORAGE_KEY);
    return saved === null ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : saved === 'true';
  });
  useEffect(() => {
    const sync = (event: Event) => {
      const muted = (event as CustomEvent<{ muted?: boolean }>).detail?.muted;
      if (typeof muted === 'boolean') setIsMuted(muted);
    };
    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, sync);
    return () => window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, sync);
  }, []);
  useEffect(() => {
    const sync = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof enabled === 'boolean') setIsMusicEnabled(enabled);
    };
    window.addEventListener(GAME_HUD_MUSIC_SYNC_EVENT, sync);
    return () => window.removeEventListener(GAME_HUD_MUSIC_SYNC_EVENT, sync);
  }, []);
  if (variant !== 'global') return null;
  const tap = (action: () => void) => { playGameSound('tap', isMuted); triggerHaptic('tap'); action(); };
  return (
    <nav className={`legend-dock-surface${referenceSkin ? ' reference-controls' : ''}`} aria-label="Game controls">
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Back" title="Back to islands" onClick={() => tap(onBack)}>{referenceSkin && <ReferenceArt part="dock-button" />}<ArrowLeft aria-hidden="true" /><span>Back</span></button>
      {onHelp ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" data-game-tips-control aria-label="How to play" aria-haspopup="dialog" title="Rules and tips" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); tap(onHelp); }}>{referenceSkin && <ReferenceArt part="dock-button" />}{referenceSkin ? <HelpCircle aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}<span>{referenceSkin ? 'Help' : 'Tips'}</span></button> : null}
      {onWork ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Open on-screen working board" onClick={() => tap(onWork)}>{referenceSkin && <ReferenceArt part="dock-button" />}<LayoutGrid aria-hidden="true" /><span>Board</span></button> : null}
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label={isMuted ? 'Unmute audio' : 'Mute audio'} aria-pressed={isMuted} onClick={() => tap(() => {
        const muted = !isMuted;
        setIsMuted(muted);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted } }));
      })}>
        {referenceSkin && <ReferenceArt part="dock-button" />}{isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}<span>Sound</span>
      </button>
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label={isMusicEnabled ? 'Turn music off' : 'Turn music on'} aria-pressed={isMusicEnabled} onClick={() => tap(() => {
        const enabled = !isMusicEnabled;
        setIsMusicEnabled(enabled);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_EVENT, { detail: { enabled } }));
      })}>
        {referenceSkin && <ReferenceArt part="dock-button" />}<Music2 aria-hidden="true" opacity={isMusicEnabled ? 1 : .45} /><span>Music</span>
      </button>
    </nav>
  );
};
export default GameActionDock;
