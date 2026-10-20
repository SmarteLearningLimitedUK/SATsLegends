import { createLevelMusicPlayer, getLevelMusicUrl } from './gameMusicLibrary';
import { GAME_AUDIO_STORAGE_KEY, GAME_HUD_MUTE_SYNC_EVENT } from '../gameHudEvents';
import { getGameSoundProfile, type SoundMaterial } from './gameSoundProfiles';
import { decodeGameSample, preloadGameSamples, sampleForEffect } from './gameSampleLibrary';

export type MonsterSoundEffect = 'monster_growl' | 'monster_laugh' | 'monster_hurt';
export type GameSoundEffect = 'tap' | 'place' | 'cast' | 'impact' | 'correct' | 'incorrect' | 'complete' | 'fail' | MonsterSoundEffect;
type Voice = { note: number; at: number; length: number; level: number; pan: number; wave: OscillatorType; endNote?: number };

let context: AudioContext | null = null;
let dry: AudioNode | null = null;
let echo: AudioNode | null = null;
let texture: AudioBuffer | null = null;
let musicBus: GainNode | null = null;
let musicTimer: number | null = null;
let musicNextTime = 0;
let musicStep = 0;
let musicWanted = false;
let musicUnlocked = false;
let musicScene: GameMusicScene = 'map';
let levelMusicKey: string | null = null;
let levelMusicPlayer: ReturnType<typeof createLevelMusicPlayer> | null = null;
let soundProfile = getGameSoundProfile(null);
let sampleEpoch = 0;
let lastMonsterAt = -Infinity;
const activeSamples = new Set<AudioBufferSourceNode>();
const activeSynthSources = new Set<AudioScheduledSourceNode>();
const activeEngines = new Set<() => void>();

/** Cancel pending and playing cues when leaving, pausing or muting. */
export function stopGameSoundEffects() {
  sampleEpoch += 1;
  for (const stop of [...activeEngines]) stop();
  for (const source of activeSamples) {
    try { source.stop(); } catch { /* Already ended. */ }
  }
  activeSamples.clear();
  for (const source of activeSynthSources) {
    try { source.stop(); } catch { /* Already ended. */ }
  }
  activeSynthSources.clear();
}

export type GameMusicScene = 'map' | 'gameplay';

/** Selects the sound palette for the current minigame without starting audio. */
export function configureGameSoundProfile(blueprintKey: string | null | undefined) {
  stopGameSoundEffects();
  lastMonsterAt = -Infinity;
  soundProfile = getGameSoundProfile(blueprintKey);
  if (blueprintKey) preloadGameSamples(soundProfile);
}

function getContext() {
  if (typeof window === 'undefined') return null;
  if (context && context.state !== 'closed') return context;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, () => {
    if (localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true') stopGameSoundEffects();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopGameSoundEffects();
  });
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  const master = context.createGain();
  master.gain.value = .72;
  master.connect(compressor);
  compressor.connect(context.destination);
  const delay = context.createDelay(.5);
  delay.delayTime.value = .115;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2600;
  const returnGain = context.createGain();
  returnGain.gain.value = .14;
  delay.connect(lowpass);
  lowpass.connect(returnGain);
  returnGain.connect(master);
  dry = master;
  echo = delay;
  musicBus = context.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  texture = null;
  return context;
}

const patterns: Record<Exclude<GameSoundEffect, MonsterSoundEffect>, Voice[]> = {
  tap: [
    { note: 760, at: 0, length: .075, level: .055, pan: -.16, wave: 'triangle', endNote: 530 },
    { note: 1510, at: .009, length: .045, level: .02, pan: .16, wave: 'sine' },
  ],
  place: [
    { note: 520, at: 0, length: .085, level: .052, pan: -.17, wave: 'triangle', endNote: 340 },
    { note: 1040, at: .012, length: .055, level: .025, pan: .14, wave: 'sine', endNote: 790 },
    { note: 260, at: .018, length: .095, level: .028, pan: 0, wave: 'sine' },
  ],
  cast: [
    { note: 360, at: 0, length: .18, level: .038, pan: -.3, wave: 'sine', endNote: 740 },
    { note: 570, at: .055, length: .21, level: .052, pan: .22, wave: 'triangle', endNote: 1140 },
    { note: 1420, at: .14, length: .13, level: .018, pan: .35, wave: 'sine', endNote: 1910 },
  ],
  impact: [
    { note: 310, at: 0, length: .12, level: .078, pan: -.12, wave: 'triangle', endNote: 135 },
    { note: 94, at: .018, length: .17, level: .063, pan: .08, wave: 'sine', endNote: 71 },
    { note: 810, at: .008, length: .052, level: .025, pan: .27, wave: 'sine', endNote: 410 },
  ],
  correct: [
    { note: 659.25, at: 0, length: .19, level: .065, pan: -.23, wave: 'triangle' },
    { note: 1318.5, at: .01, length: .15, level: .018, pan: .2, wave: 'sine' },
    { note: 987.77, at: .095, length: .25, level: .072, pan: .28, wave: 'triangle' },
    { note: 1975.54, at: .107, length: .17, level: .018, pan: -.1, wave: 'sine' },
  ],
  incorrect: [
    { note: 235, at: 0, length: .16, level: .072, pan: -.12, wave: 'triangle', endNote: 170 },
    { note: 148, at: .065, length: .2, level: .053, pan: .1, wave: 'sine', endNote: 116 },
  ],
  complete: [
    { note: 523.25, at: 0, length: .24, level: .057, pan: -.36, wave: 'triangle' },
    { note: 659.25, at: .09, length: .26, level: .06, pan: .26, wave: 'triangle' },
    { note: 783.99, at: .18, length: .3, level: .064, pan: -.18, wave: 'triangle' },
    { note: 1046.5, at: .3, length: .48, level: .078, pan: .3, wave: 'triangle' },
    { note: 1567.98, at: .31, length: .34, level: .018, pan: -.28, wave: 'sine' },
  ],
  fail: [
    { note: 246.94, at: 0, length: .22, level: .07, pan: -.15, wave: 'triangle', endNote: 220 },
    { note: 185, at: .13, length: .3, level: .064, pan: .14, wave: 'sine', endNote: 145 },
  ],
};

function route(ctx: AudioContext, source: AudioNode, pan: number, sendEcho: boolean) {
  const stereo = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (stereo) {
    stereo.pan.value = pan;
    source.connect(stereo);
    stereo.connect(dry!);
    if (sendEcho) stereo.connect(echo!);
  } else {
    source.connect(dry!);
    if (sendEcho) source.connect(echo!);
  }
}

function playVoice(ctx: AudioContext, voice: Voice, base: number, pitchScale = 1, levelScale = 1) {
  const start = base + voice.at;
  const end = start + voice.length;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const pitch = pitchScale * (1 + (Math.random() - .5) * .028);
  oscillator.type = voice.wave;
  oscillator.frequency.setValueAtTime(voice.note * pitch, start);
  if (voice.endNote) oscillator.frequency.exponentialRampToValueAtTime(voice.endNote * pitch, end);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.linearRampToValueAtTime(voice.level * levelScale, start + Math.min(.018, voice.length * .15));
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(gain);
  route(ctx, gain, voice.pan, voice.length > .18);
  oscillator.start(start);
  activeSynthSources.add(oscillator);
  oscillator.stop(end + .01);
  oscillator.onended = () => { activeSynthSources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
}

const materialTexture: Record<SoundMaterial, { cutoff: number; q: number; level: number; length: number; type: BiquadFilterType }> = {
  arcane: { cutoff: 1.3, q: 1.2, level: .55, length: 1.3, type: 'bandpass' },
  metal: { cutoff: 1.65, q: 2.5, level: .7, length: .72, type: 'highpass' },
  stone: { cutoff: .38, q: .7, level: 1.15, length: 1.25, type: 'lowpass' },
  water: { cutoff: .66, q: 2.1, level: .85, length: 1.5, type: 'bandpass' },
  wood: { cutoff: .55, q: 1.1, level: .8, length: .8, type: 'lowpass' },
  engine: { cutoff: .48, q: .8, level: 1.2, length: 1.35, type: 'lowpass' },
  digital: { cutoff: 1.55, q: 1.7, level: .5, length: .55, type: 'highpass' },
  organic: { cutoff: .76, q: 1.3, level: .9, length: 1.35, type: 'bandpass' },
  paper: { cutoff: 1.1, q: .55, level: 1.1, length: 1.5, type: 'bandpass' },
};

function playTexture(ctx: AudioContext, effect: GameSoundEffect, base: number, material: SoundMaterial, accent: number) {
  if (!texture) {
    texture = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .45), ctx.sampleRate);
    const samples = texture.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = texture;
  const filter = ctx.createBiquadFilter();
  const timbre = materialTexture[material];
  filter.type = timbre.type;
  const effectCutoff = effect === 'incorrect' || effect === 'fail' ? 700 : effect === 'impact' ? 1600 : effect === 'place' ? 2700 : effect === 'cast' ? 3500 : 4400;
  filter.frequency.value = Math.min(7000, Math.max(180, effectCutoff * timbre.cutoff));
  filter.Q.value = timbre.q;
  const gain = ctx.createGain();
  const baseLength = effect === 'complete' ? .34 : effect === 'cast' ? .23 : effect === 'correct' ? .13 : effect === 'impact' ? .12 : .065;
  const length = Math.min(.42, baseLength * timbre.length);
  const baseLevel = effect === 'complete' ? .019 : effect === 'cast' ? .012 : effect === 'correct' ? .012 : effect === 'impact' ? .036 : effect === 'place' ? .018 : .026;
  const level = baseLevel * timbre.level * (.55 + accent * .45);
  gain.gain.setValueAtTime(.0001, base);
  gain.gain.linearRampToValueAtTime(level, base + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, base + length);
  source.connect(filter);
  filter.connect(gain);
  route(ctx, gain, effect === 'complete' || effect === 'cast' ? .35 : -.25, effect === 'complete' || effect === 'cast');
  source.start(base);
  activeSynthSources.add(source);
  source.stop(base + length + .01);
  source.onended = () => { activeSynthSources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
}

function playMaterialAccent(ctx: AudioContext, effect: GameSoundEffect, base: number, material: SoundMaterial, pitch: number, accent: number) {
  const positive = effect === 'correct' || effect === 'complete' || effect === 'cast';
  const negative = effect === 'incorrect' || effect === 'fail' || effect === 'impact';
  const strong = effect === 'complete' || effect === 'impact' || effect === 'cast';
  const strength = (effect === 'tap' ? .45 : effect === 'place' ? .65 : .9) * (.55 + accent * .45);
  const root = (positive ? 440 : negative ? 260 : 360) * pitch;
  const tail = strong ? 1.25 : 1;
  const tone = (ratio: number, at: number, length: number, level: number, wave: OscillatorType, endRatio?: number, pan = 0) => {
    playVoice(ctx, {
      note: root * ratio, at, length: length * tail, level: level * strength, wave, pan,
      endNote: endRatio === undefined ? undefined : root * endRatio,
    }, base);
  };

  switch (material) {
    case 'arcane':
      tone(1.5, .025, .18, .026, 'sine', positive ? 2.0 : 1.25, -.28);
      tone(2.01, .09, .22, .016, 'triangle', positive ? 2.52 : 1.5, .3);
      break;
    case 'metal':
      tone(1.72, 0, .11, .022, 'triangle', 1.64, -.12);
      tone(2.71, .012, .16, .015, 'sine', 2.62, .18);
      break;
    case 'stone':
      tone(.47, 0, .16, .03, 'triangle', .3, -.12);
      if (strong) tone(.72, .055, .13, .014, 'sine', .47, .16);
      break;
    case 'water':
      tone(.75, .015, .15, .022, 'sine', 1.13, -.25);
      tone(.93, .075, .14, .018, 'sine', 1.4, .23);
      break;
    case 'wood':
      tone(.72, 0, .065, .027, 'triangle', .48, -.2);
      tone(1.43, .026, .06, .012, 'sine', 1.12, .16);
      break;
    case 'engine':
      tone(.42, 0, .2, .022, 'sawtooth', positive ? .76 : .3, -.18);
      if (strong) tone(.58, .075, .12, .012, 'triangle', positive ? .86 : .38, .2);
      break;
    case 'digital':
      tone(1.3, 0, .055, .015, 'square', positive ? 1.68 : 1.05, -.18);
      tone(1.93, .055, .075, .012, 'sine', positive ? 2.22 : 1.52, .18);
      break;
    case 'organic':
      tone(.63, 0, .14, .022, 'sine', positive ? .92 : .48, -.25);
      tone(1.03, .065, .12, .014, 'triangle', positive ? 1.27 : .79, .2);
      break;
    case 'paper':
      tone(1.28, .015, .085, .013, 'triangle', positive ? 1.55 : .95, -.18);
      if (strong) tone(.9, .095, .1, .01, 'sine', positive ? 1.16 : .68, .2);
      break;
  }
}

export function playGameSound(effect: GameSoundEffect, mutedOverride?: boolean) {
  if (typeof window === 'undefined' || document.hidden || (mutedOverride ?? localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true')) return false;
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  const profile = soundProfile;
  const epoch = sampleEpoch;
  if (sampleForEffect(profile, effect)) {
    void decodeGameSample(ctx, profile, effect).then(buffer => {
      if (epoch !== sampleEpoch || document.hidden || localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true' || ctx.state === 'closed') return;
      if (!buffer) { playSynthSound(ctx, effect, profile); return; }
      // Repeated clicks and fast answers must not stack the same long recording.
      const group = effect.startsWith('monster_') ? 'monster' : effect === 'correct' || effect === 'incorrect' ? 'feedback' : effect;
      for (const playing of activeSamples) {
        if (sampleGroups.get(playing) === group) { try { playing.stop(); } catch { /* Ended. */ } }
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = effect.startsWith('monster_') ? .65 : effect === 'tap' ? .55 : .8;
      source.connect(gain);
      gain.connect(dry!);
      activeSamples.add(source);
      sampleGroups.set(source, group);
      source.onended = () => { activeSamples.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(ctx.currentTime + .005);
    });
    return true;
  }
  playSynthSound(ctx, effect, profile);
  return true;
}

const sampleGroups = new WeakMap<AudioBufferSourceNode, string>();
/** Creature ambience waits for the player's first audio gesture, never autoplaying. */
export function playMonsterSound(effect: MonsterSoundEffect) {
  if (!context || context.state !== 'running') return false;
  if (effect !== 'monster_hurt' && context.currentTime - lastMonsterAt < 1.2) return false;
  const played = playGameSound(effect);
  if (played) lastMonsterAt = context.currentTime;
  return played;
}
/** A dry muzzle crack and short low thump, rather than a rising boost cue. */
function playCannonShot(ctx: AudioContext) {
  const start = ctx.currentTime + .005;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .24), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(6200, start);
  filter.frequency.exponentialRampToValueAtTime(420, start + .2);
  const crack = ctx.createGain();
  crack.gain.setValueAtTime(.0001, start);
  crack.gain.linearRampToValueAtTime(.32, start + .002);
  crack.gain.exponentialRampToValueAtTime(.0001, start + .18);
  noise.connect(filter); filter.connect(crack); crack.connect(dry!);
  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(155, start);
  body.frequency.exponentialRampToValueAtTime(42, start + .2);
  const thump = ctx.createGain();
  thump.gain.setValueAtTime(.0001, start);
  thump.gain.linearRampToValueAtTime(.25, start + .004);
  thump.gain.exponentialRampToValueAtTime(.0001, start + .22);
  body.connect(thump); thump.connect(dry!);
  const stop = () => { try { noise.stop(); } catch { /* Already ended. */ } try { body.stop(); } catch { /* Already ended. */ } };
  activeEngines.add(stop);
  noise.onended = () => {
    activeEngines.delete(stop);
    noise.disconnect(); filter.disconnect(); crack.disconnect(); body.disconnect(); thump.disconnect();
  };
  noise.start(start); noise.stop(start + .24);
  body.start(start); body.stop(start + .23);
}

function playSynthSound(ctx: AudioContext, effect: GameSoundEffect, profile: typeof soundProfile) {
  if (profile.id === 'angle_arena' && effect === 'cast') { playCannonShot(ctx); return; }
  const base = ctx.currentTime + .015;
  const pitch = Math.min(1.4, Math.max(.7, profile.pitch));
  const accent = Math.min(1, Math.max(0, profile.accent));
  const pattern = effect.startsWith('monster_') ? patterns.impact : patterns[effect as Exclude<GameSoundEffect, MonsterSoundEffect>];
  pattern.forEach(voice => playVoice(ctx, voice, base, pitch, .82));
  playMaterialAccent(ctx, effect, base, profile.material, pitch, accent);
  playTexture(ctx, effect, base, profile.material, accent);
}

/** Original launch-control beep, sharing the game's master volume and mute setting. */
export function playRocketCountdownSound() {
  if (typeof window === 'undefined' || document.hidden || localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true') return;
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  playVoice(ctx, { note: 880, at: 0, length: .16, level: .08, pan: 0, wave: 'sine' }, ctx.currentTime + .01);
}

/** Layered engine rumble and exhaust rush. The caller stops it on pause/unmount. */
export function playRocketLaunchSound(durationSeconds: number): () => void {
  return playEngineRoar(durationSeconds, 'rocket');
}

/** Finite acceleration or stall cue; caller cancels it on pause/unmount. */
export function playRaceEngineSound(durationSeconds: number, stalled = false): () => void {
  return playEngineRoar(durationSeconds, stalled ? 'stall' : 'race');
}

function playEngineRoar(durationSeconds: number, kind: 'rocket' | 'race' | 'stall'): () => void {
  if (typeof window === 'undefined' || document.hidden || localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true') return () => {};
  const ctx = getContext();
  if (!ctx) return () => {};
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  const duration = Math.max(.2, durationSeconds);
  const start = ctx.currentTime + .01;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  let brown = 0;
  for (let index = 0; index < samples.length; index++) {
    brown = (brown + (Math.random() * 2 - 1) * .025) / 1.025;
    samples[index] = brown * 3 + (Math.random() * 2 - 1) * .18;
  }
  const exhaust = ctx.createBufferSource();
  exhaust.buffer = buffer;
  exhaust.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(kind === 'stall' ? 850 : 180, start);
  filter.frequency.exponentialRampToValueAtTime(kind === 'stall' ? 260 : 1800, start + duration * .45);
  filter.frequency.exponentialRampToValueAtTime(kind === 'stall' ? 100 : 350, start + duration);
  const rumble = ctx.createOscillator();
  rumble.type = 'triangle';
  rumble.frequency.setValueAtTime(kind === 'rocket' ? 42 : kind === 'stall' ? 105 : 65, start);
  rumble.frequency.linearRampToValueAtTime(kind === 'rocket' ? 80 : kind === 'stall' ? 32 : 150, start + duration * .55);
  const engine = ctx.createGain();
  engine.gain.setValueAtTime(.0001, start);
  const volume = kind === 'rocket' ? .18 : .065;
  engine.gain.linearRampToValueAtTime(volume, start + Math.min(.65, duration / 3));
  if (kind === 'stall') {
    for (let i = 1; i <= 4; i++) {
      engine.gain.setValueAtTime(volume * .2, start + duration * (.3 + i * .09));
      engine.gain.linearRampToValueAtTime(volume, start + duration * (.34 + i * .09));
    }
  } else engine.gain.setValueAtTime(volume, start + duration * .65);
  engine.gain.exponentialRampToValueAtTime(.0001, start + duration);
  exhaust.connect(filter);
  filter.connect(engine);
  const bass = ctx.createGain();
  bass.gain.value = .25;
  rumble.connect(bass);
  bass.connect(engine);
  route(ctx, engine, 0, false);
  exhaust.start(start);
  rumble.start(start);
  exhaust.stop(start + duration);
  rumble.stop(start + duration);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    activeEngines.delete(stop);
    exhaust.stop(); rumble.stop();
    exhaust.disconnect(); filter.disconnect(); rumble.disconnect(); bass.disconnect(); engine.disconnect();
    window.removeEventListener(GAME_HUD_MUTE_SYNC_EVENT, muted);
  };
  const muted = (event: Event) => { if ((event as CustomEvent<{ muted: boolean }>).detail?.muted) stop(); };
  window.addEventListener(GAME_HUD_MUTE_SYNC_EVENT, muted);
  activeEngines.add(stop);
  exhaust.onended = stop;
  return stop;
}

// Quiet generated score for the map. Gameplay uses the supplied recordings.
const musicScores = {
  map: {
    bpm: 82,
    chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],
    bass: [45, 41, 43, 40],
    melody: [69, null, 72, null, 76, null, 72, null, 69, null, 67, null, 64, null, 67, null,
      69, null, 72, null, 74, null, 72, null, 67, null, 64, null, 67, null, 69, null],
  },
  gameplay: {
    bpm: 106,
    chords: [[62, 65, 69], [58, 62, 65], [60, 64, 69], [60, 64, 67]],
    bass: [38, 34, 41, 36],
    melody: [74, null, 77, null, 81, null, 77, null, 74, null, 72, null, 69, null, 72, null,
      74, null, 77, null, 79, null, 77, null, 72, null, 69, null, 72, null, 74, null],
  },
} as const;

function musicNote(ctx: AudioContext, midi: number, start: number, length: number, level: number, wave: OscillatorType) {
  if (!musicBus) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.linearRampToValueAtTime(level, start + Math.min(.035, length * .2));
  gain.gain.exponentialRampToValueAtTime(.0001, start + length);
  oscillator.connect(gain);
  gain.connect(musicBus);
  oscillator.start(start);
  oscillator.stop(start + length + .01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function scheduleMusic() {
  const ctx = context;
  if (!ctx || ctx.state !== 'running' || !musicWanted || !musicBus || document.hidden) return;
  const score = musicScores[musicScene];
  const eighth = 30 / score.bpm;
  let scheduled = 0;
  while (musicNextTime < ctx.currentTime + .22 && scheduled++ < 4) {
    const step = musicStep % 32;
    const bar = Math.floor(step / 8);
    if (step % 8 === 0) {
      score.chords[bar].forEach((note, index) => {
        musicNote(ctx, note, musicNextTime + index * .012, eighth * 7.5, .017, 'sine');
      });
      musicNote(ctx, score.bass[bar], musicNextTime, eighth * 3.2, .052, 'triangle');
    } else if (musicScene === 'gameplay' && step % 8 === 4) {
      musicNote(ctx, score.bass[bar] + 7, musicNextTime, eighth * 1.7, .026, 'triangle');
    }
    const melody = score.melody[step];
    if (melody !== null) musicNote(ctx, melody, musicNextTime, eighth * (musicScene === 'map' ? 1.65 : 1.25), .026, 'triangle');
    musicNextTime += eighth;
    musicStep++;
  }
}

function stopMusic() {
  levelMusicPlayer?.pause();
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
  if (context && musicBus) musicBus.gain.setTargetAtTime(0, context.currentTime, .045);
}

function startMusic() {
  if (!musicWanted || !musicUnlocked || document.hidden || musicTimer !== null) return;
  const ctx = getContext();
  if (!ctx || !musicBus) return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  if (musicScene === 'gameplay') {
    levelMusicPlayer ??= createLevelMusicPlayer(ctx, musicBus);
    musicBus.gain.setTargetAtTime(.3, ctx.currentTime, .15);
    levelMusicPlayer.play(getLevelMusicUrl(levelMusicKey));
    return;
  }
  musicNextTime = ctx.currentTime + .07;
  musicStep = 0;
  musicBus.gain.setTargetAtTime(.42, ctx.currentTime, .15);
  musicTimer = window.setInterval(scheduleMusic, 80);
  scheduleMusic();
}

/** Call only in response to an actual pointer or keyboard gesture. */
export function unlockGameAudioFromGesture() {
  musicUnlocked = true;
  // Arm the context during the gesture even if the next route is the first
  // musical screen; route-change effects may run after activation expires.
  const ctx = getContext();
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
  if (!musicWanted) return;
  startMusic();
}

export function configureGameMusic(enabled: boolean, scene: GameMusicScene, blueprintKey?: string | null) {
  const nextKey = blueprintKey ?? null;
  const changedScene = scene !== musicScene || nextKey !== levelMusicKey;
  levelMusicKey = nextKey;
  musicWanted = enabled;
  musicScene = scene;
  if (!enabled || document.hidden) {
    stopMusic();
    return;
  }
  if (changedScene) stopMusic();
  startMusic();
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  musicWanted = false;
  if (typeof window !== 'undefined') stopMusic();
  levelMusicPlayer?.dispose();
  levelMusicPlayer = null;
  if (context && context.state !== 'closed') void context.close();
});
