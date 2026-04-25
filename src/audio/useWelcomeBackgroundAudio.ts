import { useEffect } from 'react';
import welcomeHeroSelectSrc from '../assets/sounds/calmsounds/silk-swordlight-char-start-select.mp3.mpeg';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { addPageAudioFocusListeners, isPageAudioAllowed } from './audioFocus';

const WELCOME_BACKGROUND_VOLUME = 0.26;

const isAudioMuted = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true'
);

export const useWelcomeBackgroundAudio = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || typeof Audio === 'undefined') return undefined;

    const audio = new Audio(welcomeHeroSelectSrc);
    let disposed = false;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = WELCOME_BACKGROUND_VOLUME;
    audio.muted = isAudioMuted();

    const tryPlay = () => {
      if (disposed || audio.muted || !isPageAudioAllowed()) return;

      try {
        void audio.play().catch(() => {});
      } catch {
        // Welcome music should never block navigation.
      }
    };

    const handleMuteSync = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      const nextMuted = typeof detail?.muted === 'boolean' ? detail.muted : isAudioMuted();
      audio.muted = nextMuted;

      if (nextMuted) {
        audio.pause();
        return;
      }

      tryPlay();
    };

    const handleAudioFocusChange = () => {
      if (disposed) return;
      if (!isPageAudioAllowed()) {
        audio.pause();
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
      audio.pause();
      audio.src = '';
    };
  }, [enabled]);
};
