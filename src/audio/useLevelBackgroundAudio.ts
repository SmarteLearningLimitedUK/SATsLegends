import { useEffect, useMemo } from 'react';
import bossLevelSrc from '../assets/sounds/level/boss level.mpeg';
import brassWatersparkSrc from '../assets/sounds/level/brass-waterspark.mp3.mpeg';
import citrusSteelSrc from '../assets/sounds/level/citrus-steel.mp3.mpeg';
import citrusSteelAltSrc from '../assets/sounds/level/citrus-steel2.mp3.mpeg';
import oarTireFireworksSrc from '../assets/sounds/level/oar-tire-fireworks.mp3.mpeg';
import saffronSirensSrc from '../assets/sounds/level/saffron-sirens load screen.mp3.mpeg';
import sunlitDuelSrc from '../assets/sounds/level/sunlit-duel.mp3.mpeg';
import velvetTruceSrc from '../assets/sounds/level/velvet-truce.mp3.mpeg';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { addPageAudioFocusListeners, isPageAudioAllowed } from './audioFocus';
import { audioManager } from './audioManager';

const LEVEL_BACKGROUND_TRACKS = [
  brassWatersparkSrc,
  citrusSteelSrc,
  citrusSteelAltSrc,
  oarTireFireworksSrc,
  saffronSirensSrc,
  sunlitDuelSrc,
  velvetTruceSrc,
] as const;

const LEVEL_BACKGROUND_VOLUME = 0.24;

const isAudioMuted = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true'
);

const chooseRandomTrack = () => (
  LEVEL_BACKGROUND_TRACKS[Math.floor(Math.random() * LEVEL_BACKGROUND_TRACKS.length)]
  ?? LEVEL_BACKGROUND_TRACKS[0]
);

export const useLevelBackgroundAudio = (
  enabled: boolean,
  sessionKey: string | number | null | undefined,
  isBossBattle = false,
) => {
  const track = useMemo(() => (
    isBossBattle ? bossLevelSrc : chooseRandomTrack()
  ), [isBossBattle, sessionKey]);

  useEffect(() => {
    if (!enabled) {
      audioManager.stopSound('level_music');
      return undefined;
    }

    let disposed = false;
    audioManager.setMuted(isAudioMuted());
    const tryPlay = () => {
      if (disposed || audioManager.getMuted() || !isPageAudioAllowed()) return;
      audioManager.playLoop('level_music', track, {
        volume: LEVEL_BACKGROUND_VOLUME,
        kind: 'music',
        allowOverlap: false,
        source: 'useLevelBackgroundAudio',
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
        audioManager.stopSound('level_music');
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
      audioManager.stopSound('level_music');
    };
  }, [enabled, track]);
};
