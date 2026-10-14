import React, { useCallback, useEffect, useRef, useState } from 'react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const feelingWords = ['worried', 'frustrated', 'tired', 'nervous', 'sad', 'calm', 'steady', 'brave'];
const balancedThoughts = [
  'One question does not define what I know.',
  'I can try another method.',
  'Asking for help is a smart next step.',
];

const ThoughtSort: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [balancedThought, setBalancedThought] = useState<string | null>(null);
  const [message, setMessage] = useState('Choose how you feel, then pick a fairer thought.');
  const selectedRef = useRef(selected);
  const releasedRef = useRef(false);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);

  const releaseBalloon = useCallback(() => {
    if (releasedRef.current || selectedRef.current.length < 1 || !balancedThought) return;
    releasedRef.current = true;
    setMessage('You made room for a more balanced thought.');
    finish(1200);
  }, [balancedThought, finish]);

  const selectWord = (word: string) => {
    if (releasedRef.current) return;
    const current = selectedRef.current;
    const next = current.includes(word) ? current.filter((item) => item !== word) : current.length < 2 ? [...current, word] : current;
    selectedRef.current = next;
    setSelected(next);
    setMessage(next.length < 1 ? 'Choose one or two feeling words.' : balancedThought ? 'Release the balloon when you are ready.' : 'Now choose a more balanced thought.');
  };

  return (
    <WellbeingShell title="Thought Release" activityId="thought_sort" type="Thought Reset"
      subtitle="Name a feeling. Then challenge the thought that one hard question means you cannot do this."
      purpose="Choose a fairer thought. No explanation needed."
      fact="CBT links thoughts, feelings and actions. It helps us consider other possibilities."
      affirmation={balancedThought || 'I can feel this and choose my next step.'}
      status={message} progress={finished ? 100 : (selected.length ? 35 : 0) + (balancedThought ? 40 : 0)} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene balloon-scene" data-balloon-released={finished} data-thought-step={balancedThought ? 'ready' : 'choose'}>
        <div className="feeling-words" role="group" aria-label="Feeling words">
          {feelingWords.map((word) => <button key={word} type="button" onClick={() => selectWord(word)} disabled={finished} aria-pressed={selected.includes(word)} className="feeling-word" data-button-skin="none">{word}</button>)}
        </div>
        <div className="thought-reframe" aria-label="Choose a balanced thought">
          <p className="thought-challenge"><span>THOUGHT CHECK</span>“One hard question means I cannot do this.” <strong>What else could be true?</strong></p>
          <div className="thought-reframe-options" role="group" aria-label="Balanced thoughts">
            {balancedThoughts.map((thought) => <button key={thought} type="button" className="thought-reframe-option"
              data-button-skin="none" data-thought-option aria-pressed={balancedThought === thought}
              disabled={finished} onClick={() => { setBalancedThought(thought); setMessage(selectedRef.current.length ? 'Release the balloon when you are ready.' : 'Choose a feeling to go with your thought.'); }}>
              {thought}
            </button>)}
          </div>
        </div>
        <div className="balloon-space" aria-hidden="true">
          <div className={'balloon-actor' + (finished ? ' is-released' : '')}>
            <div className="balloon-shape"><span>{selected.length ? selected.join(' · ') : 'Your feelings'}</span></div>
            <div className="balloon-string" />
          </div>
        </div>
        <div className="balloon-actions">
          <button type="button" onClick={releaseBalloon} disabled={selected.length < 1 || !balancedThought || finished} className="wellbeing-action" data-button-skin="none">Release balloon</button>
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ThoughtSort;

