import React, { useEffect, useState } from 'react';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { GameScreenShell, ScrollScreenShell } from '../layout/ScreenPrimitives';
import {
  GAME_AUDIO_STORAGE_KEY,
  GAME_HUD_MUSIC_EVENT,
  GAME_HUD_MUSIC_SYNC_EVENT,
  GAME_HUD_MUTE_EVENT,
  GAME_HUD_MUTE_SYNC_EVENT,
  GAME_MUSIC_STORAGE_KEY,
} from '../gameHudEvents';
import './adventure-settings.css';

interface AdventureSettingsProps {
  onBack: () => void;
}

const initialMusicEnabled = () => {
  const saved = localStorage.getItem(GAME_MUSIC_STORAGE_KEY);
  return saved === null ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : saved === 'true';
};

const AdventureSettings: React.FC<AdventureSettingsProps> = ({ onBack }) => {
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) !== 'true');
  const [musicEnabled, setMusicEnabled] = useState(initialMusicEnabled);

  useEffect(() => {
    const syncSound = (event: Event) => {
      const muted = (event as CustomEvent<{ muted?: boolean }>).detail?.muted;
      if (typeof muted === 'boolean') setSoundEnabled(!muted);
    };
    const syncMusic = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      if (typeof enabled === 'boolean') setMusicEnabled(enabled);
    };
    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, syncSound);
    window.addEventListener(GAME_HUD_MUSIC_SYNC_EVENT, syncMusic);
    return () => {
      window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, syncSound);
      window.removeEventListener(GAME_HUD_MUSIC_SYNC_EVENT, syncMusic);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_EVENT, { detail: { muted: !next } }));
  };

  const toggleMusic = () => {
    const next = !musicEnabled;
    setMusicEnabled(next);
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_EVENT, { detail: { enabled: next } }));
  };

  return (
    <GameScreenShell className="adventure-settings-root">
      <ScrollScreenShell className="adventure-settings-scroll">
        <main className="adventure-settings-panel">
          <div className="adventure-settings-kicker">Adventure menu</div>
          <h1>Settings</h1>
          <p className="adventure-settings-intro">Set the sound that feels right for you. Your choices save automatically.</p>
          <div className="adventure-settings-grid">
            <button type="button" data-button-skin="none" className="adventure-settings-option" aria-label="Sound effects" aria-pressed={soundEnabled} onClick={toggleSound}>
              <span className="adventure-settings-icon" aria-hidden="true">{soundEnabled ? <Volume2 /> : <VolumeX />}</span>
              <span className="adventure-settings-copy"><strong>Sound effects</strong><span>Action sounds and answer feedback</span></span>
              <span className={`adventure-settings-state ${soundEnabled ? 'is-on' : ''}`} aria-hidden="true">{soundEnabled ? 'On' : 'Off'}</span>
            </button>
            <button type="button" data-button-skin="none" className="adventure-settings-option" aria-label="Background music" aria-pressed={musicEnabled} onClick={toggleMusic}>
              <span className="adventure-settings-icon" aria-hidden="true"><Music2 /></span>
              <span className="adventure-settings-copy"><strong>Background music</strong><span>Music while exploring and playing</span></span>
              <span className={`adventure-settings-state ${musicEnabled ? 'is-on' : ''}`} aria-hidden="true">{musicEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
          <button type="button" className="ui-button-primary adventure-settings-return" onClick={onBack}>Return to map</button>
        </main>
      </ScrollScreenShell>
    </GameScreenShell>
  );
};

export default AdventureSettings;
