import React, { useRef, useState } from 'react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const leaves = [
  { id: 1, x: 23, y: 25, sense: 'SIGHT', prompt: 'Look around. What kind of detail can you see?', choices: ['A colour', 'A shape', 'Something moving'] },
  { id: 2, x: 51, y: 42, sense: 'SOUND', prompt: 'Pause for a moment. What can you hear?', choices: ['A nearby sound', 'A distant sound', 'A quiet moment'] },
  { id: 3, x: 76, y: 22, sense: 'TOUCH', prompt: 'Notice where your body is supported.', choices: ['Feet on the floor', 'Hands resting', 'The seat beneath me'] },
];

const LeafDrift: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [guided, setGuided] = useState<number[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);
  const [lastNotice, setLastNotice] = useState('Choose a leaf to begin.');
  const guidedRef = useRef(new Set<number>());
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const activeLeaf = leaves.find((leaf) => leaf.id === selectedLeaf);

  const guideLeaf = (id: number, choice: string) => {
    if (finished || guidedRef.current.has(id)) return;
    guidedRef.current.add(id);
    setGuided((current) => [...current, id]);
    setSelectedLeaf(null);
    setLastNotice(`Noticed: ${choice.toLowerCase()}. Choose another leaf when ready.`);
    if (guidedRef.current.size === leaves.length) finish(1100);
  };

  return (
    <WellbeingShell title="Leaf Drift" activityId="leaf_drift" type="Grounding"
      subtitle="Choose a leaf. Notice a sight, sound or touch, then guide it into the stream."
      purpose="Give one detail in the present your attention. There is no right answer."
      fact="Grounding uses senses such as sight, sound and touch to bring attention back to the present moment."
      affirmation="I can come back to this moment, one detail at a time."
      status={finished ? 'Three details noticed. Your leaves reached the stream.' : `${guided.length} of 3 leaves guided · ${lastNotice}`}
      progress={guided.length / leaves.length * 100} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-leaves-guided={guided.length} data-leaf-selection={selectedLeaf ?? 'none'}>
        <div className="leaf-stream-goal" aria-hidden="true">Stream glow</div>
        {leaves.map((leaf, index) => {
          const isGuided = guided.includes(leaf.id);
          return <button key={leaf.id} type="button" onClick={() => setSelectedLeaf(leaf.id)} disabled={isGuided || finished}
            className={'leaf-button' + (isGuided ? ' is-guided' : '') + (selectedLeaf === leaf.id ? ' is-selected' : '')}
            style={{ left: (isGuided ? 50 : leaf.x) + '%', top: (isGuided ? 82 : leaf.y) + '%' }}
            data-button-skin="none" data-leaf-guided={isGuided} aria-label={`Choose ${leaf.sense.toLowerCase()} leaf`} aria-pressed={selectedLeaf === leaf.id}>
            <svg viewBox="0 0 74 86" aria-hidden="true" style={{ animationDelay: index * -2.4 + 's' }}>
              <path d="M13 63Q5 17 62 8Q68 64 28 72Z" fill={index === 1 ? '#d9bc74' : '#a5ca77'} stroke="#365f4f" strokeWidth="3" />
              <path d="M20 79Q29 58 57 19M31 54 18 35M42 40 54 42M29 62 47 58" fill="none" stroke="#52704c" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 37Q18 22 40 16" fill="none" stroke="#f6ebbb80" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span>{leaf.sense}</span>
          </button>;
        })}
        {activeLeaf ? <div className="leaf-observation" data-leaf-prompt={activeLeaf.id}>
          <span className="wellbeing-step-label">NOTICE · {activeLeaf.sense}</span>
          <p>{activeLeaf.prompt}</p>
          <div className="leaf-observation-options" role="group" aria-label={`${activeLeaf.sense.toLowerCase()} details`}>
            {activeLeaf.choices.map((choice) => <button key={choice} type="button" data-button-skin="none" onClick={() => guideLeaf(activeLeaf.id, choice)}>{choice}</button>)}
          </div>
        </div> : null}
      </div>
    </WellbeingShell>
  );
};

export default LeafDrift;
