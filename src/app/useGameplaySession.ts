import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { GAME_HUD_MUTE_EVENT, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';
import { GameScreen, LevelData } from '../types';

export const GLOBAL_MINIGAME_HUD_DURATION_SECONDS = 90;
export const GLOBAL_MINIGAME_LIVES = 3;

interface GameplaySessionArgs {
  screen: GameScreen;
  selectedLevel: LevelData | null;
  onLifeDepleted: () => void;
}

export interface GameplaySessionController {
  globalMiniGameHudTimeLeft: number;
  globalMiniGameLives: number;
  isGameplayInstructionPending: boolean;
  setIsGameplayInstructionPending: Dispatch<SetStateAction<boolean>>;
  isMuted: boolean;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
}

export const useGameplaySession = ({
  screen,
  selectedLevel,
  onLifeDepleted,
}: GameplaySessionArgs): GameplaySessionController => {
  const [globalMiniGameHudTimeLeft, setGlobalMiniGameHudTimeLeft] = useState(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
  const [globalMiniGameLives, setGlobalMiniGameLives] = useState(GLOBAL_MINIGAME_LIVES);
  const [globalMiniGameLifeLock, setGlobalMiniGameLifeLock] = useState(false);
  const [isGameplayInstructionPending, setIsGameplayInstructionPending] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true');

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) return undefined;
    setGlobalMiniGameHudTimeLeft(GLOBAL_MINIGAME_HUD_DURATION_SECONDS);
    setGlobalMiniGameLives(GLOBAL_MINIGAME_LIVES);
    setGlobalMiniGameLifeLock(false);
    const timerId = window.setInterval(() => {
      setGlobalMiniGameHudTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [screen, selectedLevel?.id]);

  useEffect(() => {
    if (screen !== 'gameplay' || globalMiniGameLives > 0 || globalMiniGameLifeLock) return;
    setGlobalMiniGameLifeLock(true);
    window.setTimeout(() => {
      onLifeDepleted();
    }, 160);
  }, [globalMiniGameLifeLock, globalMiniGameLives, onLifeDepleted, screen]);

  useEffect(() => {
    const lastPenaltyRef = { value: 0 };

    const handleHapticIntent = (event: Event) => {
      if (screen !== 'gameplay') return;
      if (isGameplayInstructionPending) return;

      const detail = (event as CustomEvent<{ intent?: string }>).detail;
      const intent = detail?.intent;
      if (intent !== 'error' && intent !== 'warning') return;

      const now = Date.now();
      if (now - lastPenaltyRef.value < 450) return;
      lastPenaltyRef.value = now;

      setGlobalMiniGameLives((previous) => Math.max(0, previous - 1));
    };

    window.addEventListener('sats-mastery:haptic', handleHapticIntent as EventListener);
    return () => {
      window.removeEventListener('sats-mastery:haptic', handleHapticIntent as EventListener);
    };
  }, [isGameplayInstructionPending, screen]);

  useEffect(() => {
    if (screen !== 'gameplay' || !selectedLevel) {
      setIsGameplayInstructionPending(false);
      return;
    }

    setIsGameplayInstructionPending(true);
  }, [screen, selectedLevel?.id]);

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
    isGameplayInstructionPending,
    setIsGameplayInstructionPending,
    isMuted,
    setIsMuted,
  };
};
