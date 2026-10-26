import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lightbulb, LayoutGrid, Music2, Volume2, VolumeX, Pause } from 'lucide-react';
import GamePauseMenu from './game-ui/GamePauseMenu';
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
  production?: boolean;
  onPauseChange?: (open:boolean)=>void;
}
const GameActionDock: React.FC<GameActionDockProps> = ({ onBack, onHelp, onWork, variant = 'local', referenceSkin = false, production=false,onPauseChange }) => {
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>()=>onPauseChange?.(false),[onPauseChange]);
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
  const menu=(open:boolean)=>{setMenuOpen(open);onPauseChange?.(open);};
  const sound=()=>{const muted=!isMuted;setIsMuted(muted);window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT,{detail:{muted}}));};
  const music=()=>{const enabled=!isMusicEnabled;setIsMusicEnabled(enabled);window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_EVENT,{detail:{enabled}}));};
  if(production)return <>
    <nav className="production-game-controls" aria-label="Game controls">
      <button type="button" aria-label="Pause game" aria-haspopup="dialog" onClick={()=>tap(()=>menu(true))}><Pause aria-hidden="true"/><span>Pause</span></button>
      {onHelp&&<button type="button" aria-label="How to play" aria-haspopup="dialog" data-game-tips-control onClick={event=>{event.currentTarget.focus({preventScroll:true});tap(onHelp);}}><Lightbulb aria-hidden="true"/><span>Help</span></button>}
      {onWork&&<button type="button" aria-label="Open on-screen working board" onClick={()=>tap(onWork)}><LayoutGrid aria-hidden="true"/><span>Work</span></button>}
    </nav>
    {menuOpen&&<GamePauseMenu onClose={()=>menu(false)} onBack={onBack} onHelp={onHelp} onWork={onWork} muted={isMuted} music={isMusicEnabled} onSound={()=>tap(sound)} onMusic={()=>tap(music)}/>}
  </>;
  return (
    <nav className={`legend-dock-surface${referenceSkin ? ' reference-controls' : ''}`} aria-label="Game controls">
      <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" aria-label="Back" title="Back to islands" onClick={() => tap(onBack)}>{referenceSkin && <ReferenceArt part="dock-button" />}<ArrowLeft aria-hidden="true" /><span>Back</span></button>
      {onHelp ? <button type="button" className="legend-dock-button" data-button-skin="none" data-ui-sound="handled" data-game-tips-control aria-label="How to play" aria-haspopup="dialog" title="Rules and tips" onClick={(event) => { event.currentTarget.focus({ preventScroll: true }); tap(onHelp); }}>{referenceSkin && <ReferenceArt part="dock-button" />}<Lightbulb aria-hidden="true" /><span>{referenceSkin ? 'Help' : 'Tips'}</span></button> : null}
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
