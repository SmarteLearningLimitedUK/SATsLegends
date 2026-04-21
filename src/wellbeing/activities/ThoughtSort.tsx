import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';

const feelingWords = [
  'worried',
  'frustrated',
  'tired',
  'nervous',
  'sad',
  'calm',
  'steady',
  'brave',
];

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('Choose words that match how you feel');
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [released, setReleased] = useState(false);
  const [balloonRise, setBalloonRise] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stableBlowRef = useRef(0);

  const balloonText = useMemo(() => selected.join(' / ') || 'choose words', [selected]);
  const progress = Math.min(100, (selected.length / 4) * 70 + (released ? 30 : 0));

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (!released || selected.length < 2) return undefined;
    if (balloonRise) return undefined;
    const timeout = window.setTimeout(() => {
      setBalloonRise(true);
      window.setTimeout(() => onComplete(), 1200);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [balloonRise, onComplete, released, selected.length]);

  const handleSelectWord = (word: string) => {
    if (released) return;
    setSelected((current) => {
      if (current.includes(word)) {
        setMessage('Keep the balloon light');
        return current.filter((item) => item !== word);
      }
      const next = [...current, word];
      setMessage(next.length >= 3 ? 'The balloon is filling up nicely' : 'Add a few words to fill the balloon');
      return next.slice(0, 4);
    });
  };

  const stopMic = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicReady(false);
  };

  const startMic = async () => {
    if (released || micReady) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Microphone not available. Use the words, then tap release.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        setMessage('Microphone not available. Use the words, then tap release.');
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioCtx = new AudioContextCtor();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      streamRef.current = stream;
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setMicReady(true);
      setMessage('Blow to send the balloon away');

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteTimeDomainData(buffer);
        let total = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const centered = buffer[i] - 128;
          total += centered * centered;
        }
        const rms = Math.sqrt(total / buffer.length) / 128;
        setMicLevel(rms);
        if (rms > 0.12) {
          stableBlowRef.current += 1;
        } else {
          stableBlowRef.current = 0;
        }
        if (stableBlowRef.current >= 10 && !released) {
          setReleased(true);
          setMessage('Let it go');
          stopMic();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setMessage('Microphone blocked. Use the words, then tap release.');
      stopMic();
    }
  };

  const handleRelease = () => {
    if (released) return;
    if (!micReady) {
      setMessage('Tap the microphone first, then blow');
      return;
    }
    setReleased(true);
    setBalloonRise(true);
    setMessage('Let it float away');
    window.setTimeout(() => onComplete(), 1200);
  };

  return (
    <WellbeingShell title="Let It Go" subtitle={message} type="Thought Reset" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 flex-col items-center justify-between overflow-hidden px-5 py-4">
        <div className="relative flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
          {feelingWords.map((word) => {
            const active = selected.includes(word);
            return (
              <motion.button
                key={word}
                type="button"
                onClick={() => handleSelectWord(word)}
                whileTap={{ scale: 0.95 }}
                className={`rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition ${
                  active
                    ? 'border-emerald-100/60 bg-emerald-300/25 text-emerald-50'
                    : 'border-white/12 bg-white/8 text-white/82 hover:bg-white/14'
                }`}
              >
                {word}
              </motion.button>
            );
          })}
        </div>

        <div className="relative flex w-full flex-1 items-center justify-center">
          <motion.div
            animate={balloonRise ? { y: [-10, -250], opacity: [1, 0.1] } : { y: [0, -8, 0], scale: [1, 1.03, 1] }}
            transition={balloonRise ? { duration: 1.2, ease: 'easeOut' } : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex flex-col items-center"
          >
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.26),rgba(147,197,253,0.14)_28%,rgba(15,23,42,0.08)_70%)] shadow-[0_24px_50px_rgba(15,23,42,0.35)]">
              <div className="absolute inset-4 rounded-full border border-cyan-100/10" />
              <div className="absolute inset-8 rounded-full border border-emerald-100/10" />
              <div className="relative z-10 max-w-[9.5rem] text-center text-lg font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(2,6,23,0.35)]">
                {balloonText}
              </div>
            </div>
            <div className="h-16 w-1 rounded-full bg-white/24" />
            <div className="h-5 w-5 rounded-full bg-rose-200/70 shadow-[0_0_18px_rgba(253,164,175,0.25)]" />
          </motion.div>
        </div>

        <div className="flex w-full max-w-3xl flex-col items-center gap-3">
          <div className="w-full rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(13,33,65,0.75),rgba(8,20,42,0.85))] px-4 py-3 text-center text-sm font-semibold text-white/82">
            {selected.length === 0 ? 'Pick a few words to fill the balloon.' : 'Blow into the microphone or tap release to send it away.'}
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={startMic} className="ui-button-primary rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.14em]">
              {micReady ? 'Microphone ready' : 'Turn on microphone'}
            </button>
            <button type="button" onClick={handleRelease} className="ui-button-secondary rounded-full px-5 py-3 text-sm font-black uppercase tracking-[0.14em]">
              Release balloon
            </button>
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/65">
            Mic level {Math.round(micLevel * 100)}
          </div>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;

