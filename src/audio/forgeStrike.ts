/** Hammer contact: a dry crack and body, followed by inharmonic anvil resonance.
 * Uses the caller's audio bus so mute, pause and scene teardown can stop it.
 */
export function scheduleForgeStrike(
  ctx: BaseAudioContext,
  output: AudioNode,
  start = ctx.currentTime + .005,
  onEnded?: () => void,
): () => void {
  const sources: AudioScheduledSourceNode[] = [];
  const nodes: AudioNode[] = [];
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } }
    for (const node of nodes) node.disconnect();
    onEnded?.();
  };
  const tone = (frequency: number, level: number, length: number, endFrequency?: number) => {
    const voice = ctx.createOscillator(), envelope = ctx.createGain();
    voice.type = 'sine';
    voice.frequency.setValueAtTime(frequency, start);
    if (endFrequency) voice.frequency.exponentialRampToValueAtTime(endFrequency, start + length * .65);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.linearRampToValueAtTime(level, start + .0015);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + length);
    voice.connect(envelope); envelope.connect(output);
    sources.push(voice); nodes.push(voice, envelope);
    voice.start(start); voice.stop(start + length + .002);
    return voice;
  };

  // The lower contact body adds weight without depending on phone sub-bass.
  tone(235, .28, .12, 115);
  // A metal plate rings at unequal modal frequencies, rather than a musical chord.
  const tail = tone(525, .21, .56);
  tone(1139, .15, .39);
  tone(1906, .105, .27);
  tone(2840, .065, .18);
  tone(4058, .04, .11);

  const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), crack = ctx.createGain();
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .045), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 73129;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed / 2147483648 - 1;
  }
  noise.buffer = buffer;
  filter.type = 'bandpass'; filter.frequency.value = 3300; filter.Q.value = .65;
  crack.gain.setValueAtTime(.0001, start);
  crack.gain.linearRampToValueAtTime(.34, start + .0008);
  crack.gain.exponentialRampToValueAtTime(.0001, start + .043);
  noise.connect(filter); filter.connect(crack); crack.connect(output);
  sources.push(noise); nodes.push(noise, filter, crack);
  noise.start(start); noise.stop(start + .046);
  tail.onended = finish;
  return finish;
}
