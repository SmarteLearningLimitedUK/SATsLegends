import React, { useEffect, useState } from 'react';
import iconBack from '../assets/matharia/hud/icon_back.png';
import iconHelp from '../assets/matharia/hud/icon_help.png';
import iconBoard from '../assets/matharia/hud/icon_board.png';
import iconSound from '../assets/matharia/hud/icon_sound.png';
import iconSoundOff from '../assets/matharia/hud/icon_sound_off.png';
import iconMusic from '../assets/matharia/hud/icon_music.png';
import iconMusicOff from '../assets/matharia/hud/icon_music_off.png';
import { triggerHaptic } from '../haptics';
import { playGameSound } from '../audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUSIC_EVENT, GAME_HUD_MUSIC_SYNC_EVENT, GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT, GAME_MUSIC_STORAGE_KEY } from '../gameHudEvents';

interface GameActionDockProps {
  onBack: () => void;
  onHelp?: () => void;
  onWork?: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
}
const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, onWork, variant = 'local' }) => {
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
    <nav className="legend-dock-surface" aria-label="Game controls">
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Back" title="Back to islands" onClick={() => tap(onBack)}><img src={iconBack} alt="" /><span>Back</span></button>
      {onHelp ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="How to play" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); tap(onHelp); }}><img src={iconHelp} alt="" /><span>Help</span></button> : null}
      {onWork ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Open on-screen working board" onClick={() => tap(onWork)}><img src={iconBoard} alt="" /><span>Board</span></button> : null}
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label={isMuted ? 'Unmute audio' : 'Mute audio'} aria-pressed={isMuted} onClick={() => tap(() => {
        const muted = !isMuted;
        setIsMuted(muted);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted } }));
      })}>
        <img src={isMuted ? iconSoundOff : iconSound} alt="" /><span>Sound</span>
      </button>
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label={isMusicEnabled ? 'Turn music off' : 'Turn music on'} aria-pressed={isMusicEnabled} onClick={() => tap(() => {
        const enabled = !isMusicEnabled;
        setIsMusicEnabled(enabled);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_EVENT, { detail: { enabled } }));
      })}>
        <img src={isMusicEnabled ? iconMusic : iconMusicOff} alt="" /><span>Music</span>
      </button>
    </nav>
  );
};
export default GameActionDock;
