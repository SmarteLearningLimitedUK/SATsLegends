import type {SoundMaterial} from './gameSoundProfiles';

const noise = new WeakMap<BaseAudioContext, AudioBuffer>();
/** Short, dry material contact: body, transient and fragments, never a reward melody. */
export function scheduleMaterialContact(ctx: AudioContext, output: AudioNode, material: SoundMaterial, at: number, level = 1, onFinish?:()=>void) {
  let buffer = noise.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .3), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 419;
    for (let i = 0; i < samples.length; i++) { seed = (seed * 16807) % 2147483647; samples[i] = seed / 1073741823.5 - 1; }
    noise.set(ctx, buffer);
  }
  const sound = {
    stone: [1650, 120, .17, .13], metal: [3400, 780, .23, .095], wood: [1100, 190, .13, .12],
    water: [1900, 940, .19, .055], engine: [650, 95, .18, .08], digital: [4200, 620, .11, .055],
    arcane: [2500, 880, .18, .045], organic: [900, 160, .1, .07], paper: [4800, 260, .07, .035],
  }[material];
  const [cutoff, pitch, duration, volume] = sound;
  const nodes: AudioNode[] = [], sources: AudioScheduledSourceNode[] = [];
  const gain = ctx.createGain(); nodes.push(gain); gain.connect(output);
  gain.gain.setValueAtTime(.0001, at);
  gain.gain.linearRampToValueAtTime(volume * level, at + .002);
  gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
  source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = cutoff; filter.Q.value = material === 'metal' ? 2.5 : .7;
  source.connect(filter); filter.connect(gain); nodes.push(filter, source); sources.push(source);
  source.start(at); source.stop(at + duration);
  const body = ctx.createOscillator(), bodyGain = ctx.createGain();
  body.type = material === 'wood' ? 'triangle' : 'sine';
  body.frequency.setValueAtTime(pitch, at); body.frequency.exponentialRampToValueAtTime(pitch * (material === 'water' ? .45 : .72), at + duration);
  bodyGain.gain.value = material === 'stone' ? .65 : .3;
  body.connect(bodyGain); bodyGain.connect(gain); nodes.push(body, bodyGain); sources.push(body);
  body.start(at); body.stop(at + duration);
  let stopped = false;
  const stop = () => { if (stopped) return; stopped = true; for (const s of sources) { try { s.stop(); } catch {} } for (const n of nodes) n.disconnect(); onFinish?.(); };
  body.onended = stop;
  return stop;
}
