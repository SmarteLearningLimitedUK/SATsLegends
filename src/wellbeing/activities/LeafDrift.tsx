import React, { useRef, useState } from 'react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const leaves = [
  { id: 1, x: 23, y: 25, sense: 'SIGHT', prompt: 'Let your eyes rest on one colour nearby.' },
  { id: 2, x: 51, y: 42, sense: 'SOUND', prompt: 'Listen for one sound, or spend a moment with the quiet.' },
  { id: 3, x: 76, y: 22, sense: 'SCENT', prompt: 'Notice a scent if there is one, or feel where your hands rest.' },
];

const LeafDrift: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [guided, setGuided] = useState<number[]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);
  const guidedRef = useRef(new Set<number>());
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const activeLeaf = leaves.find((leaf) => leaf.id === selectedLeaf);

  const guideLeaf = (id: number) => {
    if (finished || guidedRef.current.has(id)) return;
    guidedRef.current.add(id);
    setGuided((current) => [...current, id]);
    setSelectedLeaf(null);
    if (guidedRef.current.size === leaves.length) finish(1100);
  };

  return (
    <WellbeingShell title="Leaf Drift" activityId="leaf_drift" type="Grounding"
      subtitle="One small detail can bring you back to now. Choose a leaf."
      purpose="If a sense is hard to use, stay with one that feels comfortable. Take as much time as you like."
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
          <p role="status">{activeLeaf.prompt}</p>
          <div className="leaf-observation-options">
            <button type="button" data-button-skin="none" onClick={() => guideLeaf(activeLeaf.id)}>Let it drift</button>
          </div>
        </div> : null}
      </div>
    </WellbeingShell>
  );
};

export default LeafDrift;
