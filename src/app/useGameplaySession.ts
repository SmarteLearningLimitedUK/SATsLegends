import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';
import { GameScreen, LevelData } from '../types';
import { LEVEL_TIMERS_DISABLED } from './testingFlags';

export const GLOBAL_MINIGAME_HUD_DURATION_SECONDS = 90;
export const GLOBAL_MINIGAME_LIVES = 3;

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
  const lifeLock = useRef(false);
  const timeLock = useRef(false);
  const lifeDepleted = useRef(onLifeDepleted);
  const timeDepleted = useRef(onTimeDepleted);
  lifeDepleted.current = onLifeDepleted;
  timeDepleted.current = onTimeDepleted;
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');
  const isUntimedGameplay =
    screen === 'gameplay'
    && (
      Boolean(selectedLevel?.isPractice)
      || selectedLevel?.gameType === 'mean_machine'
      || selectedLevel?.gameType === 'potion_pour'
    );
  const consumeLife = useCallback((amount = 1) => {
    if (amount <= 0 || selectedLevel?.isPractice) return;
    setGlobalMiniGameLives((previous) => Math.max(0, previous - amount));
  }, [selectedLevel?.isPractice]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return undefined;
    setGlobalMiniGameHudTimeLeft(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
    setGlobalMiniGameLives(GLOBAL_MINIGAME_LIVES);
    lifeLock.current = false;
    timeLock.current = false;
    return undefined;
  }, [screen, selectedLevel?.id, selectedLevel?.blueprintKey, selectedLevel?.isPractice, restartKey]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel || paused || isUntimedGameplay || LEVEL_TIMERS_DISABLED) return undefined;
    const timerId = window.setInterval(() => {
      if (document.hidden) return;
      setGlobalMiniGameHudTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [isUntimedGameplay, paused, screen, selectedLevel?.id]);

  useEffect(() => {
    if (screen !== 'gameplay' || globalMiniGameLives > 0 || lifeLock.current) return;
    lifeLock.current = true;
    const timeout = window.setTimeout(() => {
      lifeDepleted.current();
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [globalMiniGameLives, screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || isUntimedGameplay || LEVEL_TIMERS_DISABLED || globalMiniGameHudTimeLeft > 0 || timeLock.current) return;
    timeLock.current = true;
    const timeout = window.setTimeout(() => {
      timeDepleted.current();
    }, 140);
    return () => window.clearTimeout(timeout);
  }, [globalMiniGameHudTimeLeft, isUntimedGameplay, screen]);

  useEffect(() => {
    localStorage.setItem(GAME_AUDIO_STORAGE_KEY, String(isMuted));
    window.dispatchEvent(new CustomEvent(GAME_HUD_MUTE_SYNC_EVENT, { detail: { muted: isMuted } }));
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => {
      media.muted = isMuted;
    });
  }, [isMuted, screen]);

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

  return {
    globalMiniGameHudTimeLeft,
    globalMiniGameLives,
    isMuted,
    setIsMuted,
    consumeLife,
  };
};
