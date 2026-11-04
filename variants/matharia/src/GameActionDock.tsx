import React, { useEffect, useState } from 'react';
import ArtworkFrame from './ArtworkFrame';
import {asset} from './assets';
import {ArrowLeft,CircleHelp,Grid2X2,Volume2,VolumeX,Music2} from 'lucide-react';
import { triggerHaptic } from '../../../src/haptics';
import { playGameSound } from '../../../src/audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUSIC_EVENT, GAME_HUD_MUSIC_SYNC_EVENT, GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT, GAME_MUSIC_STORAGE_KEY } from '../../../src/gameHudEvents';

interface GameActionDockProps {
  onBack: () => void;
  paper?:number;
  onHelp?: () => void;
  onWork?: () => void;
  accentClass?: string;
  compact?: boolean;
  variant?: 'local' | 'global';
  helpLabel?: string;
}
// Include the full rounded rim in each corner slice before resizing a wide source to a tile.
function DockTile(){return <span className="legend-dock-tile-art" aria-hidden="true"><ArtworkFrame name="buttons/scale_key_v4" corner={.105} fit="height"/></span>}
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
    <nav className="legend-dock-surface" aria-label="Game controls" data-game-dock="sapphire-gold">
      <span className="legend-dock-art" aria-hidden="true"><ArtworkFrame name="frames/concept_hud_wide_v4" corner={.45} horizontalCorner={.14}/><img className="legend-dock-jewel" src={asset('frames','sapphire_crest_v3')} alt=""/></span>
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Back" title="Back to islands" onClick={() => tap(onBack)}><DockTile/><ArrowLeft viewBox="4 4 16 16" strokeWidth={1.25} aria-hidden="true"/><span>Back</span></button>
      {onHelp ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Tips: how to play" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); tap(onHelp); }}><DockTile/><CircleHelp strokeWidth={1.5} aria-hidden="true"/><span>Tips</span></button> : null}
      {onWork ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Open on-screen working board" onClick={() => tap(onWork)}><DockTile/><Grid2X2 strokeWidth={1.5} aria-hidden="true"/><span>Board</span></button> : null}
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" data-audio-disabled={isMuted} aria-label={isMuted ? 'Unmute audio' : 'Mute audio'} title={isMuted?'Unmute all audio':'Mute all audio'} aria-pressed={isMuted} onClick={() => tap(() => {
        const muted = !isMuted;
        setIsMuted(muted);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted } }));
      })}>
        <DockTile/>{isMuted?<VolumeX strokeWidth={1.5} aria-hidden="true"/>:<Volume2 strokeWidth={1.5} aria-hidden="true"/>}<span>Sound</span>
      </button>
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" data-audio-disabled={!isMusicEnabled||isMuted} aria-label={isMusicEnabled ? 'Turn music off' : 'Turn music on'} aria-description={isMuted?'All audio is muted. Unmute Sound to hear music.':undefined} title={isMuted?'All audio is muted':isMusicEnabled?'Turn music off':'Turn music on'} aria-pressed={isMusicEnabled} onClick={() => tap(() => {
        const enabled = !isMusicEnabled;
        setIsMusicEnabled(enabled);
        window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_EVENT, { detail: { enabled } }));
      })}>
        <DockTile/><Music2 strokeWidth={1.5} aria-hidden="true">{(!isMusicEnabled||isMuted)&&<path d="M3 3l18 18"/>}</Music2><span>Music</span>
      </button>
    </nav>
  );
};
export default GameActionDock;
