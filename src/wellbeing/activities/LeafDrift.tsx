import React, { useRef, useState } from 'react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const leaves = [{ id: 1, x: 23, y: 25 }, { id: 2, x: 51, y: 42 }, { id: 3, x: 76, y: 22 }];
const LeafDrift: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [guided, setGuided] = useState<number[]>([]);
  const guidedRef = useRef(new Set<number>());
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const guideLeaf = (id: number) => {
    if (finished || guidedRef.current.has(id)) return;
    guidedRef.current.add(id);
    setGuided((current) => [...current, id]);
    if (guidedRef.current.size === leaves.length) finish(800);
  };

  return (
    <WellbeingShell title="Leaf Drift" activityId="leaf_drift" type="Grounding"
      subtitle="Tap each leaf to send it along the stream into the glow." purpose="Watch one leaf travel, then choose the next."
      affirmation="You do not have to do everything at once." status={finished ? 'Three leaves, one quiet journey' : 'Leaves guided ' + guided.length + ' of 3'}
      progress={guided.length / leaves.length * 100} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene" data-leaves-guided={guided.length}>
        <div className="leaf-stream-goal" aria-hidden="true">Stream glow</div>
        {leaves.map((leaf, index) => {
          const isGuided = guided.includes(leaf.id);
          return <button key={leaf.id} type="button" onClick={() => guideLeaf(leaf.id)} disabled={isGuided}
            className={'leaf-button' + (isGuided ? ' is-guided' : '')} style={{ left: (isGuided ? 50 : leaf.x) + '%', top: (isGuided ? 82 : leaf.y) + '%' }}
            data-button-skin="none" data-leaf-guided={isGuided} aria-label={'Guide leaf ' + leaf.id}>
            <svg viewBox="0 0 74 86" aria-hidden="true" style={{ animationDelay: index * -2.4 + 's' }}>
              <path d="M13 63Q5 17 62 8Q68 64 28 72Z" fill={index === 1 ? '#d9bc74' : '#a5ca77'} stroke="#365f4f" strokeWidth="3" />
              <path d="M20 79Q29 58 57 19M31 54 18 35M42 40 54 42M29 62 47 58" fill="none" stroke="#52704c" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 37Q18 22 40 16" fill="none" stroke="#f6ebbb80" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>;
        })}
      </div>
    </WellbeingShell>
  );
};

export default LeafDrift;
