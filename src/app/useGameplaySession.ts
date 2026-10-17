import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { configureGameMusic, unlockGameAudioFromGesture } from '../audio/gameAudio';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_CINEMATIC_EVENT, GAME_HUD_MUSIC_EVENT, GAME_HUD_MUSIC_SYNC_EVENT, GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT, GAME_MUSIC_STORAGE_KEY } from '../gameHudEvents';
import { GameScreen, LevelData } from '../types';
import { LEVEL_TIMERS_DISABLED } from './testingFlags';
import { isBossEncounterGameType } from '../games/bossEncounterTypes';

export const GLOBAL_MINIGAME_HUD_DURATION_SECONDS = 90;
export const GLOBAL_MINIGAME_LIVES = 3;
export const getSessionDurationSeconds = (level: LevelData | null) => {
  if (isBossEncounterGameType(level?.gameType)) return level?.gameType === 'crystal_core' ? 1800 : 2400;
  if (level?.gameType === 'prime_pop' && !level.isPractice) return 60;
  if (level?.blueprintKey === 'maths_vs_zombies') return 60;
  // Multi-step rounds need enough time for each in-game decision.
  const tier = level?.difficultyTier ?? level?.miniGameLevel ?? 1;
  if (!level?.isPractice && level?.blueprintKey === 'order_ops_arena') return [120, 135, 150, 165, 180][Math.max(0, Math.min(4, tier - 1))];
  if (!level?.isPractice && level?.blueprintKey === 'multiplication_mine' && tier >= 4) return tier === 5 ? 180 : 135;
  if (!level?.isPractice && level?.blueprintKey === 'remainder_run' && tier === 5) return 180;
  return GLOBAL_MINIGAME_HUD_DURATION_SECONDS;
};

interface GameplaySessionArgs {
  screen: GameScreen;
  selectedLevel: LevelData | null;
  paused?: boolean;
  restartKey?: number;
  onLifeDepleted: () => void;
  onTimeDepleted: () => void;
}

export interface GameplaySessionController {
  globalMiniGameHudTimeLeft: number;
  globalMiniGameLives: number;
  isMuted: boolean;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  consumeLife: (amount?: number) => void;
}

export const useGameplaySession = ({
  screen,
  selectedLevel,
  paused = false,
  restartKey = 0,
  onLifeDepleted,
  onTimeDepleted,
}: GameplaySessionArgs): GameplaySessionController => {
  const [globalMiniGameHudTimeLeft, setGlobalMiniGameHudTimeLeft] = useState(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
  const [globalMiniGameLives, setGlobalMiniGameLives] = useState(GLOBAL_MINIGAME_LIVES);
  const [cinematicPlaying, setCinematicPlaying] = useState(false);
  const cinematicRef = useRef(false);
  useEffect(() => {
    cinematicRef.current = false;
    setCinematicPlaying(false);
    if (screen !== 'gameplay' || selectedLevel?.blueprintKey !== 'rounding_rocket') return;
    const update = (event: Event) => {
      const playing = (event as CustomEvent<{ playing: boolean }>).detail?.playing === true;
      cinematicRef.current = playing;
      setCinematicPlaying(playing);
    };
    window.addEventListener(GAME_HUD_CINEMATIC_EVENT, update);
    return () => window.removeEventListener(GAME_HUD_CINEMATIC_EVENT, update);
  }, [screen, selectedLevel?.id, selectedLevel?.blueprintKey, restartKey]);
  const lifeLock = useRef(false);
  const timeLock = useRef(false);
  const lifeDepleted = useRef(onLifeDepleted);
  const timeDepleted = useRef(onTimeDepleted);
  lifeDepleted.current = onLifeDepleted;
  timeDepleted.current = onTimeDepleted;
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  const [isMusicEnabled, setIsMusicEnabled] = useState(() => {
    const saved = localStorage.getItem(GAME_MUSIC_STORAGE_KEY);
    return saved === null ? !window.matchMedia('(prefers-reduced-motion: reduce)').matches : saved === 'true';
  });
  const isUntimedGameplay =
    screen === 'gameplay'
    && (
      Boolean(selectedLevel?.isPractice)
      || isBossEncounterGameType(selectedLevel?.gameType)
      || selectedLevel?.gameType === 'mean_machine'
      || selectedLevel?.gameType === 'potion_pour'
    );
  const consumeLife = useCallback((amount = 1) => {
    if (amount <= 0 || selectedLevel?.isPractice || isBossEncounterGameType(selectedLevel?.gameType)) return;
    setGlobalMiniGameLives((previous) => Math.max(0, previous - amount));
  }, [selectedLevel?.isPractice, selectedLevel?.gameType]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return undefined;
    setGlobalMiniGameHudTimeLeft(getSessionDurationSeconds(selectedLevel));
    setGlobalMiniGameLives(GLOBAL_MINIGAME_LIVES);
    lifeLock.current = false;
    timeLock.current = false;
    return undefined;
  }, [screen, selectedLevel?.id, selectedLevel?.blueprintKey, selectedLevel?.isPractice, restartKey]);

  useEffect(() => {
    if (screen !== 'gameplay' || !isBossEncounterGameType(selectedLevel?.gameType)) return;
    const update = (event: Event) => {
      const clock = (event as CustomEvent<{ timeLeft: number }>).detail;
      if (Number.isFinite(clock?.timeLeft)) setGlobalMiniGameHudTimeLeft(clock.timeLeft);
    };
    window.addEventListener('sats-mock-clock', update);
    return () => window.removeEventListener('sats-mock-clock', update);
  }, [screen, selectedLevel?.gameType]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel || paused || cinematicPlaying || isUntimedGameplay || LEVEL_TIMERS_DISABLED) return undefined;
    const timerId = window.setInterval(() => {
      if (document.hidden || cinematicRef.current || !document.querySelector('[data-game-set] [data-game-question]')) return;
      setGlobalMiniGameHudTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isUntimedGameplay, paused, cinematicPlaying, screen, selectedLevel?.id]);

  useEffect(() => {
    if (screen !== 'gameplay' || globalMiniGameLives > 0 || lifeLock.current) return;
    lifeLock.current = true;
    const timeout = window.setTimeout(() => {
      lifeDepleted.current();
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [globalMiniGameLives, screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || isUntimedGameplay || cinematicPlaying || cinematicRef.current || LEVEL_TIMERS_DISABLED || selectedLevel?.blueprintKey === 'maths_vs_zombies' || globalMiniGameHudTimeLeft > 0 || timeLock.current) return;
    timeLock.current = true;
    const timeout = window.setTimeout(() => {
      timeDepleted.current();
    }, 140);
    return () => window.clearTimeout(timeout);
  }, [globalMiniGameHudTimeLeft, isUntimedGameplay, cinematicPlaying, screen, selectedLevel?.blueprintKey]);

  useEffect(() => {
    localStorage.setItem(GAME_AUDIO_STORAGE_KEY, String(isMuted));
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_SYNC_EVENT, { detail: { muted: isMuted } }));
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
      media.muted = isMuted;
    });
  }, [isMuted, screen]);

  useEffect(() => {
    const unlockOnPointer = () => unlockGameAudioFromGesture();
    const unlockOnKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') unlockGameAudioFromGesture();
    };
    document.addEventListener('pointerdown', unlockOnPointer, { capture: true });
    document.addEventListener('keydown', unlockOnKey, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', unlockOnPointer, { capture: true });
      document.removeEventListener('keydown', unlockOnKey, { capture: true });
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(GAME_MUSIC_STORAGE_KEY, String(isMusicEnabled));
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUSIC_SYNC_EVENT, { detail: { enabled: isMusicEnabled } }));
    const active = !isMuted && isMusicEnabled && (screen === 'world_map' || screen === 'island_levels' || (screen === 'gameplay' && !paused));
    const scene = screen === 'gameplay' ? 'gameplay' : 'map';
    const update = () => configureGameMusic(active && !document.hidden, scene, selectedLevel?.blueprintKey ?? selectedLevel?.gameType);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [isMuted, isMusicEnabled, paused, screen, selectedLevel?.blueprintKey, selectedLevel?.gameType]);

  useEffect(() => {
    const handleMuteChange = (event: Event) => {
      const detail = (event as CustomEvent<{ muted?: boolean }>).detail;
      setIsMuted((prev) => (typeof detail?.muted === 'boolean' ? detail.muted : !prev));
    };

    window.addEventListener(GAME_HUD_MUTE_EVENT, handleMuteChange as EventListener);
    return () => {
      window.removeEventListener(GAME_HUD_MUTE_EVENT, handleMuteChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleMusicChange = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled;
      setIsMusicEnabled((previous) => typeof enabled === 'boolean' ? enabled : !previous);
    };
    window.addEventListener(GAME_HUD_MUSIC_EVENT, handleMusicChange);
    return () => window.removeEventListener(GAME_HUD_MUSIC_EVENT, handleMusicChange);
  }, []);

  return {
    globalMiniGameHudTimeLeft,
    globalMiniGameLives,
    isMuted,
    setIsMuted,
    consumeLife,
  };
};
