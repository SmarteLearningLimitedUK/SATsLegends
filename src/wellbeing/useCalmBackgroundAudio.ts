import { useEffect, useMemo } from 'react';
import bubblesRainbowSrc from '../assets/sounds/calmsounds/bubbles-rainbow.mp3.mpeg';
import kiteBalloonSilenceAltSrc from '../assets/sounds/calmsounds/kite-balloon-silence 2.mp3.mpeg';
import kiteBalloonSilenceSrc from '../assets/sounds/calmsounds/kite-balloon-silence.mp3.mpeg';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { addPageAudioFocusListeners, isPageAudioAllowed } from '../audio/audioFocus';
import { audioManager } from '../audio/audioManager';

const CALM_BACKGROUND_TRACKS = [
  bubblesRainbowSrc,
  kiteBalloonSilenceAltSrc,
  kiteBalloonSilenceSrc,
] as const;

const CALM_BACKGROUND_VOLUME = 0.28;

const isAudioMuted = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true'
);

const chooseRandomTrack = () => (
  CALM_BACKGROUND_TRACKS[Math.floor(Math.random() * CALM_BACKGROUND_TRACKS.length)]
  ?? CALM_BACKGROUND_TRACKS[0]
);

export const useCalmBackgroundAudio = () => {
  const track = useMemo(() => chooseRandomTrack(), []);

  useEffect(() => {
    let disposed = false;
    audioManager.setMuted(isAudioMuted());

    const tryPlay = () => {
      if (disposed || audioManager.getMuted() || !isPageAudioAllowed()) return;
      audioManager.playLoop('calm_music', track, {
        volume: CALM_BACKGROUND_VOLUME,
        kind: 'music',
        allowOverlap: false,
        source: 'useCalmBackgroundAudio',
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
        audioManager.stopSound('calm_music');
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
      audioManager.stopSound('calm_music');
    };
  }, [track]);
};
