import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';
import angleArenaShootSrc from '../assets/sounds/angle arena shoot.mp3';
import bossDeathSrc from '../assets/sounds/boss death.mp3';
import changeCounterCorrectSrc from '../assets/sounds/change counter correct.mp3';
import correctShareSplitterSrc from '../assets/sounds/correct share splitter.mp3';
import monsterGrowl12Src from '../assets/sounds/floraphonic-scary-monster-growl-roar-12-202958.mp3';
import monsterGrowl13Src from '../assets/sounds/floraphonic-scary-monster-growl-roar-13-202959.mp3';
import monsterGrowl5Src from '../assets/sounds/floraphonic-scary-monster-growl-roar-5-199378.mp3';
import hudButtonPressSrc from '../assets/button click.ogg';
import incorrectAnswerShareSplitterSrc from '../assets/sounds/incorrect answer share splitter.mp3';
import incorrectAnswerSrc from '../assets/sounds/incorrect answer.mp3';
import levelFailSrc from '../assets/sounds/level fail.mp3';
import levelUpSrc from '../assets/sounds/level up.mp3';
import meanMachineCorrectSrc from '../assets/sounds/mean machine correct.mp3';
import numberLineNinjaCorrectSrc from '../assets/sounds/number line ninja correct.mp3';
import percentPowerSrc from '../assets/sounds/percentpower.mp3';
import placeValuePanicCorrectSrc from '../assets/sounds/place value panic correct.mp3';
import potionPourSrc from '../assets/sounds/potion pour.mp3';
import primePopSrc from '../assets/sounds/prime pop pop.mp3';
import rockBreakSrc from '../assets/sounds/rock break.mp3';
import takeOutRushSrc from '../assets/sounds/takeoutrush.mp3';
import timeUpSrc from '../assets/sounds/time up.mp3';
import wrongAnswerMeanMachineSrc from '../assets/sounds/wrong answer mean machine.mp3';

export type GameSoundEffect = 'tap' | 'click' | 'correct' | 'incorrect' | 'complete' | 'fail';
export type GameSoundContext = string | null | undefined;

type ToneStep = {
  frequency: number;
  durationMs: number;
  gain?: number;
  type?: OscillatorType;
  delayMs?: number;
};

let audioContext: AudioContext | null = null;
const audioElementCache = new Map<string, HTMLAudioElement>();

const MONSTER_GROWLS = [monsterGrowl12Src, monsterGrowl13Src, monsterGrowl5Src] as const;
const ENEMY_BATTLE_GAMES = new Set([
  'place_value_panic',
  'number_line_ninja',
  'prime_pop',
  'rounding_rocket',
  'maths_vs_zombies',
  'angle_arena',
  'factor_frenzy',
  'multiplication_mine',
  'mean_machine',
]);

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

const chooseRandom = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)] ?? items[0];

const normalizeGameKey = (value?: GameSoundContext) => (value || '')
  .toString()
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/-/g, '_');

const getAudioAsset = (effect: GameSoundEffect, context?: GameSoundContext) => {
  const gameKey = normalizeGameKey(context);

  if (effect === 'tap') {
    if (gameKey === 'angle_arena') return angleArenaShootSrc;
    return hudButtonPressSrc;
  }

  if (effect === 'click') {
    return hudButtonPressSrc;
  }

  if (effect === 'correct') {
    if (gameKey === 'place_value_panic') return placeValuePanicCorrectSrc;
    if (gameKey === 'number_line_ninja') return numberLineNinjaCorrectSrc;
    if (gameKey === 'share_splitter') return correctShareSplitterSrc;
    if (gameKey === 'change_counter') return changeCounterCorrectSrc;
    if (gameKey === 'mean_machine') return meanMachineCorrectSrc;
    if (gameKey === 'potion_panic') return potionPourSrc;
    if (gameKey === 'prime_pop') return primePopSrc;
    if (gameKey === 'percent_power') return percentPowerSrc;
    if (gameKey === 'take_out_rush') return takeOutRushSrc;
    if (gameKey === 'multiplication_mine') return rockBreakSrc;
    if (ENEMY_BATTLE_GAMES.has(gameKey)) return chooseRandom(MONSTER_GROWLS);
  }

  if (effect === 'incorrect') {
    if (gameKey === 'share_splitter') return incorrectAnswerShareSplitterSrc;
    if (gameKey === 'mean_machine') return wrongAnswerMeanMachineSrc;
    return incorrectAnswerSrc;
  }

  if (effect === 'complete') {
    if (gameKey === 'multiplication_mine') return rockBreakSrc;
    if (gameKey === 'crystal_core' || gameKey === 'mirror_gate' || gameKey === 'matrix_match') return bossDeathSrc;
    return levelUpSrc;
  }

  if (effect === 'fail') {
    if (gameKey === 'chrono_dash' || gameKey === 'time_keeper_cove') return timeUpSrc;
    return levelFailSrc;
  }

  return null;
};

const playAudioAsset = (src: string) => {
  if (typeof window === 'undefined') return false;

  let audio = audioElementCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    audioElementCache.set(src, audio);
  }

  try {
    const playback = audio.cloneNode(true) as HTMLAudioElement;
    playback.volume = 0.82;
    playback.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
};

const tonePatterns: Record<GameSoundEffect, ToneStep[]> = {
  tap: [
    { frequency: 680, durationMs: 55, gain: 0.06, type: 'triangle' },
  ],
  click: [
    { frequency: 610, durationMs: 42, gain: 0.05, type: 'triangle' },
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

export const playGameSound = (effect: GameSoundEffect, mutedOverride?: boolean, context?: GameSoundContext) => {
  if (typeof window === 'undefined' || isMuted(mutedOverride)) return false;

  const asset = getAudioAsset(effect, context);
  if (asset && playAudioAsset(asset)) {
    return true;
  }

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
