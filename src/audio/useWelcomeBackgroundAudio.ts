import { useEffect } from 'react';
import welcomeHeroSelectSrc from '../assets/sounds/calmsounds/silk-swordlight-char-start-select.mp3.mpeg';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { addPageAudioFocusListeners, isPageAudioAllowed } from './audioFocus';
import { audioManager } from './audioManager';

const WELCOME_BACKGROUND_VOLUME = 0.26;

const isAudioMuted = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true'
);

export const useWelcomeBackgroundAudio = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      audioManager.stopSound('welcome_music');
      return undefined;
    }

    let disposed = false;
    audioManager.setMuted(isAudioMuted());
    const tryPlay = () => {
      if (disposed || audioManager.getMuted() || !isPageAudioAllowed()) return;
      audioManager.playLoop('welcome_music', welcomeHeroSelectSrc, {
        volume: WELCOME_BACKGROUND_VOLUME,
        kind: 'music',
        allowOverlap: false,
        source: 'useWelcomeBackgroundAudio',
      });
    };

    const handleMuteSync = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      const nextMuted = typeof detail?.muted === 'boolean' ? detail.muted : isAudioMuted();
      audioManager.setMuted(nextMuted);
      if (!nextMuted) tryPlay();
    };

    const handleAudioFocusChange = () => {
      if (disposed) return;
      if (!isPageAudioAllowed()) {
        audioManager.stopSound('welcome_music');
        return;
      }
      tryPlay();
    };

    const handleUserGesture = () => {
      tryPlay();
    };

    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
    window.addEventListener('pointerdown', handleUserGesture, { capture: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true });
    const removePageAudioFocusListeners = addPageAudioFocusListeners(handleAudioFocusChange);

    tryPlay();

    return () => {
      disposed = true;
      window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
      window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
      removePageAudioFocusListeners();
      audioManager.stopSound('welcome_music');
    };
  }, [enabled]);
};
