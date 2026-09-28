import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const feelingWords = ['worried', 'frustrated', 'tired', 'nervous', 'sad', 'calm', 'steady', 'brave'];

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('Choose two to four feeling words');
  const [micReady, setMicReady] = useState(false);
  const [micPending, setMicPending] = useState(false);
  const selectedRef = useRef(selected);
  const releasedRef = useRef(false);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const soundFramesRef = useRef(0);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  const stopMic = useCallback(() => {
    requestRef.current += 1;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioRef.current?.close().catch(() => {});
    audioRef.current = null;
    analyserRef.current = null;
    soundFramesRef.current = 0;
    if (mountedRef.current) { setMicReady(false); setMicPending(false); }
  }, []);
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete, stopMic);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopMic(); };
  }, [stopMic]);

  const releaseBalloon = useCallback(() => {
    if (releasedRef.current || selectedRef.current.length < 2) return;
    releasedRef.current = true;
    setMessage('Your balloon is on its way');
    stopMic();
    finish(1200);
  }, [finish, stopMic]);

  const selectWord = (word: string) => {
    if (releasedRef.current) return;
    const current = selectedRef.current;
    const next = current.includes(word) ? current.filter((item) => item !== word) : current.length < 4 ? [...current, word] : current;
    selectedRef.current = next;
    setSelected(next);
    setMessage(next.length < 2 ? 'Choose two to four feeling words' : 'Release your balloon whenever you are ready');
  };

  const startMic = async () => {
    if (releasedRef.current || micReady || micPending || selectedRef.current.length < 2) return;
    if (!navigator.mediaDevices?.getUserMedia) { setMessage('Microphone unavailable. You can still tap Release balloon.'); return; }
    const request = ++requestRef.current;
    setMicPending(true);
    let acquired: MediaStream | null = null;
    try {
      acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || request !== requestRef.current || releasedRef.current) { acquired.getTracks().forEach((track) => track.stop()); return; }
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) { acquired.getTracks().forEach((track) => track.stop()); setMessage('Microphone unavailable. You can still tap Release balloon.'); return; }
      const audio = new AudioContextCtor();
      streamRef.current = acquired;
      audioRef.current = audio;
      const analyser = audio.createAnalyser();
      analyser.fftSize = 512;
      audio.createMediaStreamSource(acquired).connect(analyser);
      analyserRef.current = analyser;
      audio.resume().catch(() => {});
      setMicReady(true);
      setMessage('Make a gentle sound, or tap Release balloon');
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const sample = () => {
        const node = analyserRef.current;
        if (!node || !mountedRef.current || releasedRef.current) return;
        node.getByteTimeDomainData(buffer);
        let total = 0;
        for (const value of buffer) total += (value - 128) ** 2;
        const level = Math.sqrt(total / buffer.length) / 128;
        soundFramesRef.current = level > .12 ? soundFramesRef.current + 1 : 0;
        if (soundFramesRef.current >= 10 && selectedRef.current.length >= 2) { releaseBalloon(); return; }
        rafRef.current = requestAnimationFrame(sample);
      };
      rafRef.current = requestAnimationFrame(sample);
    } catch {
      acquired?.getTracks().forEach((track) => track.stop());
      if (mountedRef.current && request === requestRef.current) { setMessage('Microphone unavailable. You can still tap Release balloon.'); stopMic(); }
    } finally {
      if (mountedRef.current && request === requestRef.current) setMicPending(false);
    }
  };

  return (
    <WellbeingShell title="Worry Balloon" activityId="thought_sort" type="Thought Reset"
      subtitle="Choose two to four words for how you feel, then release the balloon."
      purpose="Name a feeling without having to explain it." affirmation="Every feeling is allowed. Take your next step when you are ready."
      status={message} progress={finished ? 100 : selected.length / 4 * 70} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene balloon-scene" data-balloon-released={finished}>
        <div className="feeling-words" role="group" aria-label="Feeling words">
          {feelingWords.map((word) => <button key={word} type="button" onClick={() => selectWord(word)} disabled={finished} aria-pressed={selected.includes(word)} className="feeling-word" data-button-skin="none">{word}</button>)}
        </div>
        <div className="balloon-space" aria-hidden="true">
          <div className={'balloon-actor' + (finished ? ' is-released' : '')}>
            <div className="balloon-shape"><span>{selected.length ? selected.join(' · ') : 'Your feelings'}</span></div>
            <div className="balloon-string" />
          </div>
        </div>
        <div className="balloon-actions">
          <button type="button" onClick={releaseBalloon} disabled={selected.length < 2 || finished} className="wellbeing-action" data-button-skin="none">Release balloon</button>
          <button type="button" onClick={micReady ? () => { stopMic(); setMessage('Release your balloon whenever you are ready'); } : startMic}
            disabled={selected.length < 2 || finished || micPending} className="balloon-mic" data-button-skin="none">
            {micReady ? <MicOff size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
            {micReady ? 'Turn microphone off' : micPending ? 'Waiting for microphone' : 'Use microphone (optional)'}
          </button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;

