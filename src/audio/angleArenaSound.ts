/** Cannon discharge and timber/ice contact for Angle Arena.
 * All layers share the caller's bus and cancellation lifecycle. No downloads or
 * delayed decode: the audible contact begins with the collision event.
 */
export type AngleArenaSound = 'fire' | 'impact';

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext) {
  let buffer = noiseBuffers.get(ctx);
  if (buffer) return buffer;
  buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .8), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 94721;
  for (let index = 0; index < data.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[index] = seed / 2147483648 - 1;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

export function scheduleAngleArenaSound(
  ctx: BaseAudioContext,
  output: AudioNode,
  kind: AngleArenaSound,
  start = ctx.currentTime + .005,
  onEnded?: () => void,
): () => void {
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [];
  let ended = false;
  let lastSource: AudioScheduledSourceNode | null = null;
  let lastEnd = -Infinity;
  const finish = () => {
    if (ended) return;
    ended = true;
    for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } }
    for (const node of nodes) node.disconnect();
    onEnded?.();
  };
  const track = (source: AudioScheduledSourceNode, end: number) => {
    sources.push(source);
    if (end > lastEnd) { lastEnd = end; lastSource = source; }
    source.stop(end);
  };
  const envelope = (level: number, at: number, length: number, attack = .002) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, at + length);
    gain.connect(output);
    nodes.push(gain);
    return gain;
  };
  const tone = (frequency: number, endFrequency: number, level: number, delay: number, length: number, wave: OscillatorType = 'sine') => {
    const at = start + delay;
    const voice = ctx.createOscillator();
    voice.type = wave;
    voice.frequency.setValueAtTime(frequency, at);
    voice.frequency.exponentialRampToValueAtTime(endFrequency, at + length);
    voice.connect(envelope(level, at, length));
    nodes.push(voice);
    voice.start(at);
    track(voice, at + length + .004);
  };
  const noise = (cutoff: number, endCutoff: number, level: number, delay: number, length: number, type: BiquadFilterType = 'lowpass', offset = 0) => {
    const at = start + delay;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = .65;
    filter.frequency.setValueAtTime(cutoff, at);
    filter.frequency.exponentialRampToValueAtTime(endCutoff, at + length);
    source.connect(filter);
    filter.connect(envelope(level, at, length, .001));
    nodes.push(source, filter);
    source.start(at, offset);
    track(source, at + length + .004);
  };

  if (kind === 'fire') {
    // Sharp air release, descending cannon body and a brief exhaust tail.
    // Mid-bass remains audible on phone speakers without relying on sub-bass.
    noise(6500, 560, .34, 0, .18);
    tone(185, 58, .25, 0, .25);
    tone(370, 165, .075, .002, .11, 'triangle');
    noise(1900, 650, .055, .025, .24, 'highpass', .3);
  } else {
    // A weighty contact, wood fracture, then unequal ice-shard resonances.
    tone(220, 76, .26, 0, .19, 'triangle');
    tone(118, 62, .15, .012, .27);
    noise(2450, 580, .29, 0, .15, 'bandpass');
    noise(6200, 2100, .11, .002, .095, 'highpass', .1);
    tone(1480, 1405, .10, .008, .22);
    tone(2570, 2380, .065, .01, .18);
    tone(3870, 3650, .035, .013, .13);
    // Small descending contacts read as falling fragments, not a reward chord.
    for (let index = 0; index < 5; index++) {
      const delay = .065 + index * .079;
      const level = .10 * (1 - index * .15);
      noise(1700 - index * 175, 520, level, delay, .105, 'bandpass', .26 + index * .045);
      tone(390 - index * 39, 145, level * .65, delay, .095, 'triangle');
    }
  }
  // The longest source owns completion so short cracks cannot cut off the tail.
  (lastSource as AudioScheduledSourceNode | null)!.onended = finish;
  return finish;
}
