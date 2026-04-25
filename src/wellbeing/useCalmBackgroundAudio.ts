import { useEffect, useMemo } from 'react';
import bubblesRainbowSrc from '../assets/sounds/calmsounds/bubbles-rainbow.mp3.mpeg';
import kiteBalloonSilenceAltSrc from '../assets/sounds/calmsounds/kite-balloon-silence 2.mp3.mpeg';
import kiteBalloonSilenceSrc from '../assets/sounds/calmsounds/kite-balloon-silence.mp3.mpeg';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';

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
    if (typeof Audio === 'undefined') return undefined;

    const audio = new Audio(track);
    let disposed = false;
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = CALM_BACKGROUND_VOLUME;
    audio.muted = isAudioMuted();

    const tryPlay = () => {
      if (disposed || audio.muted) return;

      try {
        void audio.play().catch(() => {});
      } catch {
        // Background audio should never interrupt calm activities.
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

    const handleUserGesture = () => {
      tryPlay();
    };

    window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
    window.addEventListener('pointerdown', handleUserGesture, { capture: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true });

    tryPlay();

    return () => {
      disposed = true;
      window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, handleMuteSync as EventListener);
      window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
      audio.pause();
      audio.src = '';
    };
  }, [track]);
};
