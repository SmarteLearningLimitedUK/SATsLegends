import type { GameSoundEffect } from './gameAudio';
import type { GameSoundProfile } from './gameSoundProfiles';

const assets = import.meta.glob('../assets/audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
type Clip = 'ui-pop' | 'incorrect' | 'correct' | 'level-up' | 'reward' | 'fairy' | 'gem-place' | 'wood-place' | 'coin-place' | 'cash' | 'metal-impact' | 'boost' | 'liquid' | 'scanner' | 'slime' | 'explosion' | 'jump-hit' | 'monster-growl' | 'monster-laugh' | 'monster-hurt';
const defaults: Record<GameSoundEffect, Clip | null> = {
  tap: 'ui-pop', place: 'gem-place', cast: 'fairy', impact: 'jump-hit',
  correct: 'correct', incorrect: 'incorrect', complete: 'level-up', fail: null,
  monster_growl: 'monster-growl', monster_laugh: 'monster-laugh', monster_hurt: 'monster-hurt',
};
const overrides: Record<string, Partial<Record<GameSoundEffect, Clip>>> = {
  change_counter: { tap: 'coin-place', place: 'coin-place', correct: 'cash', complete: 'reward' },
  take_out_rush: { place: 'wood-place', correct: 'cash', complete: 'reward' },
  conversion_canyon: { impact: 'metal-impact' },
  calculation_crash: { impact: 'metal-impact' },
  potion_panic: { tap: 'liquid', place: 'liquid', cast: 'liquid', impact: 'slime' },
  prime_pop: { correct: 'ui-pop', impact: 'slime' },
  maths_vs_zombies: { cast: 'fairy', impact: 'slime', monster_growl: 'monster-growl', monster_laugh: 'monster-laugh', monster_hurt: 'monster-hurt' },
  angle_arena: { impact: 'explosion', monster_laugh: 'monster-laugh', monster_hurt: 'monster-hurt' },
  rounding_rocket: { place: 'metal-impact', cast: 'boost', complete: 'reward' },
  ratio_fractions: { cast: 'boost', correct: 'boost', impact: 'jump-hit' },
  remainder_run: { correct: 'boost', impact: 'jump-hit' },
  simplify_sprint: { correct: 'boost', impact: 'jump-hit' },
  fraction_forge: { place: 'metal-impact', impact: 'metal-impact' },
  mean_machine: { cast: 'scanner', impact: 'metal-impact' },
  factor_frenzy: { cast: 'scanner', impact: 'metal-impact', monster_growl: 'monster-growl', monster_hurt: 'monster-hurt' },
  multiplication_mine: { place: 'gem-place', impact: 'metal-impact', correct: 'gem-place' },
  share_splitter: { place: 'wood-place' }, area_architect: { place: 'wood-place' },
  graph_grabber: { place: 'wood-place' },
  match3_equivalence: { place: 'ui-pop', correct: 'fairy' },
};
const bytes = new Map<Clip, Promise<ArrayBuffer | null>>();
const decoded = new WeakMap<BaseAudioContext, Map<Clip, Promise<AudioBuffer | null>>>();
export const sampleForEffect = (profile: GameSoundProfile, effect: GameSoundEffect) =>
  profile.id === 'angle_arena' && effect === 'cast' ? null : overrides[profile.id]?.[effect] ?? defaults[effect];
const urlFor = (clip: Clip) => assets[`../assets/audio/sfx/${clip}.mp3`];
function load(clip: Clip) {
  let request = bytes.get(clip);
  if (!request) {
    request = fetch(urlFor(clip)).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    bytes.set(clip, request);
  }
  return request;
}
/** Fetch only this game's cues. This never opens an AudioContext or starts sound. */
export function preloadGameSamples(profile: GameSoundProfile) {
  if (typeof window === 'undefined') return;
  for (const effect of Object.keys(defaults) as GameSoundEffect[]) {
    const clip = sampleForEffect(profile, effect);
    if (clip) void load(clip);
  }
}
export function decodeGameSample(ctx: BaseAudioContext, profile: GameSoundProfile, effect: GameSoundEffect) {
  const clip = sampleForEffect(profile, effect);
  if (!clip) return Promise.resolve(null);
  let cache = decoded.get(ctx);
  if (!cache) { cache = new Map(); decoded.set(ctx, cache); }
  let buffer = cache.get(clip);
  if (!buffer) {
    buffer = load(clip).then(data => data ? ctx.decodeAudioData(data.slice(0)).catch(() => null) : null);
    cache.set(clip, buffer);
  }
  return buffer;
}
