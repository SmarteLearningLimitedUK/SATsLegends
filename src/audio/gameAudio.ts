import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';

export type GameSoundEffect = 'tap' | 'correct' | 'incorrect' | 'complete' | 'fail';

type ToneStep = {
  frequency: number;
  durationMs: number;
  gain?: number;
  type?: OscillatorType;
  delayMs?: number;
};

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  if (audioContext && audioContext.state !== 'closed') {
    return audioContext;
  }

  const Ctor = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!Ctor) return null;

  audioContext = new Ctor();
  return audioContext;
};

const isMuted = (muted?: boolean) => {
  if (typeof muted === 'boolean') return muted;
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true';
};

const tonePatterns: Record<GameSoundEffect, ToneStep[]> = {
  tap: [
    { frequency: 680, durationMs: 55, gain: 0.06, type: 'triangle' },
  ],
  correct: [
    { frequency: 660, durationMs: 80, gain: 0.085, type: 'sine' },
    { frequency: 880, durationMs: 110, gain: 0.085, type: 'sine', delayMs: 78 },
  ],
  incorrect: [
    { frequency: 220, durationMs: 120, gain: 0.08, type: 'square' },
    { frequency: 164, durationMs: 150, gain: 0.07, type: 'square', delayMs: 105 },
  ],
  complete: [
    { frequency: 523.25, durationMs: 90, gain: 0.08, type: 'triangle' },
    { frequency: 659.25, durationMs: 100, gain: 0.09, type: 'triangle', delayMs: 86 },
    { frequency: 783.99, durationMs: 130, gain: 0.095, type: 'triangle', delayMs: 184 },
  ],
  fail: [
    { frequency: 180, durationMs: 120, gain: 0.085, type: 'square' },
    { frequency: 112, durationMs: 180, gain: 0.075, type: 'square', delayMs: 118 },
  ],
};

const scheduleTone = (ctx: AudioContext, step: ToneStep, startAt: number) => {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = step.type ?? 'sine';
  oscillator.frequency.setValueAtTime(step.frequency, startAt);

  const attack = Math.max(0.008, step.durationMs / 1000 * 0.15);
  const release = Math.max(0.02, step.durationMs / 1000 * 0.55);
  const peak = Math.max(0.0001, step.gain ?? 0.08);
  const endAt = startAt + step.durationMs / 1000;

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(peak, startAt + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, Math.max(startAt + attack + 0.001, endAt - release));
  gainNode.gain.setValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
};

export const playGameSound = (effect: GameSoundEffect, mutedOverride?: boolean) => {
  if (typeof window === 'undefined' || isMuted(mutedOverride)) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }

  const startAt = ctx.currentTime + 0.01;
  tonePatterns[effect].forEach((step) => {
    scheduleTone(ctx, step, startAt + (step.delayMs ?? 0) / 1000);
  });

  return true;
};
