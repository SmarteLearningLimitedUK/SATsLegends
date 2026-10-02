import { GAME_AUDIO_STORAGE_KEY } from '../gameHudEvents';

export type GameSoundEffect = 'tap' | 'correct' | 'incorrect' | 'complete' | 'fail';
type Voice = { note: number; at: number; length: number; level: number; pan: number; wave: OscillatorType; endNote?: number };

let context: AudioContext | null = null;
let dry: AudioNode | null = null;
let echo: AudioNode | null = null;
let texture: AudioBuffer | null = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  if (context && context.state !== 'closed') return context;
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
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
  texture = null;
  return context;
}

const patterns: Record<GameSoundEffect, Voice[]> = {
  tap: [
    { note: 760, at: 0, length: .075, level: .055, pan: -.16, wave: 'triangle', endNote: 530 },
    { note: 1510, at: .009, length: .045, level: .02, pan: .16, wave: 'sine' },
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

function playVoice(ctx: AudioContext, voice: Voice, base: number) {
  const start = base + voice.at;
  const end = start + voice.length;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const pitch = 1 + (Math.random() - .5) * .018;
  oscillator.type = voice.wave;
  oscillator.frequency.setValueAtTime(voice.note * pitch, start);
  if (voice.endNote) oscillator.frequency.exponentialRampToValueAtTime(voice.endNote * pitch, end);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.linearRampToValueAtTime(voice.level, start + Math.min(.018, voice.length * .15));
  gain.gain.exponentialRampToValueAtTime(.0001, end);
  oscillator.connect(gain);
  route(ctx, gain, voice.pan, voice.length > .18);
  oscillator.start(start);
  oscillator.stop(end + .01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function playTexture(ctx: AudioContext, effect: GameSoundEffect, base: number) {
  if (!texture) {
    texture = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .45), ctx.sampleRate);
    const samples = texture.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = texture;
  const filter = ctx.createBiquadFilter();
  filter.type = effect === 'incorrect' || effect === 'fail' ? 'lowpass' : 'bandpass';
  filter.frequency.value = effect === 'incorrect' || effect === 'fail' ? 700 : 4400;
  filter.Q.value = .7;
  const gain = ctx.createGain();
  const length = effect === 'complete' ? .34 : effect === 'correct' ? .13 : .065;
  const level = effect === 'complete' ? .019 : effect === 'correct' ? .012 : .026;
  gain.gain.setValueAtTime(.0001, base);
  gain.gain.linearRampToValueAtTime(level, base + .01);
  gain.gain.exponentialRampToValueAtTime(.0001, base + length);
  source.connect(filter);
  filter.connect(gain);
  route(ctx, gain, effect === 'complete' ? .35 : -.25, effect === 'complete');
  source.start(base);
  source.stop(base + length + .01);
  source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
}

export function playGameSound(effect: GameSoundEffect, mutedOverride?: boolean) {
  if (typeof window === 'undefined' || (mutedOverride ?? localStorage.getItem(GAME_AUDIO_STORAGE_KEY) === 'true')) return false;
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  const base = ctx.currentTime + .015;
  patterns[effect].forEach(voice => playVoice(ctx, voice, base));
  playTexture(ctx, effect, base);
  return true;
}
