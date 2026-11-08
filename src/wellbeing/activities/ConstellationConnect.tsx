import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

type StarPoint = { x: number; y: number };
type ConstellationRound = {
  id: string;
  name: string;
  fact: string;
  stars: StarPoint[];
  edges: Array<[number, number]>;
};
type Stage = 'constellation' | 'between-rounds';

// Facts checked against NASA's constellation guides:
// https://science.nasa.gov/missions/hubble/hubble-captures-the-ghost-of-cassiopeia/
// https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/
// https://science.nasa.gov/resource/whats-up-august-2022/
const rounds: ConstellationRound[] = [
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    fact: 'The middle star of Cassiopeia’s W helps light a space cloud nicknamed the Ghost Nebula.',
    stars: [{ x: 17, y: 39 }, { x: 33, y: 64 }, { x: 49, y: 36 }, { x: 66, y: 64 }, { x: 83, y: 38 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: 'orion',
    name: 'Orion',
    fact: 'Orion’s three Belt stars look close together, but they are about 800, 1,300 and 900 light-years away.',
    stars: [{ x: 28, y: 29 }, { x: 72, y: 29 }, { x: 30, y: 47 }, { x: 50, y: 49 }, { x: 70, y: 51 }, { x: 30, y: 71 }, { x: 70, y: 71 }],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    fact: 'At one end of Cygnus, the double star Albireo looks blue and gold through a small telescope.',
    stars: [{ x: 50, y: 27 }, { x: 23, y: 51 }, { x: 50, y: 50 }, { x: 77, y: 51 }, { x: 50, y: 73 }],
    edges: [[0, 2], [1, 2], [2, 3], [2, 4]],
  },
];

const totalStarSteps = rounds.reduce((sum, round) => sum + round.stars.length, 0);

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('constellation');
  const activeRef = useRef(0);
  const advanceLockedRef = useRef(false);
  const focusNextRef = useRef(false);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const finishRef = useRef<HTMLButtonElement | null>(null);
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const round = rounds[roundIndex];
  const starsCompleted = rounds.slice(0, roundIndex).reduce((sum, item) => sum + item.stars.length, 0) + currentIndex;
  const progress = finished ? 100 : starsCompleted / totalStarSteps * 100;

  useEffect(() => {
    advanceLockedRef.current = false;
    if (!focusNextRef.current) return;
    if (stage === 'constellation') starRefs.current[currentIndex]?.focus();
    if (stage === 'between-rounds') finishRef.current?.focus();
    focusNextRef.current = false;
  }, [currentIndex, roundIndex, stage]);

  const selectStar = (index: number, keyboard: boolean) => {
    if (finished || stage !== 'constellation' || index !== activeRef.current) return;
    activeRef.current = index + 1;
    focusNextRef.current = keyboard;
    setCurrentIndex(index + 1);
    if (index === round.stars.length - 1) setStage('between-rounds');
  };

  const advanceRound = (keyboard: boolean) => {
    if (finished || stage !== 'between-rounds' || advanceLockedRef.current || roundIndex >= rounds.length - 1) return;
    advanceLockedRef.current = true;
    focusNextRef.current = keyboard;
    activeRef.current = 0;
    setCurrentIndex(0);
    setRoundIndex(roundIndex + 1);
    setStage('constellation');
  };

  return (
    <WellbeingShell
      title="Star Path"
      activityId="constellation_connect"
      type="Focus"
      subtitle="One star at a time gives your mind a place to rest."
      purpose="Follow the glow at your own pace. One constellation is enough if you are ready to finish."
      progress={progress}
      onExit={() => { cancel(); onExit(); }}
    >
      <div className="wellbeing-scene" data-focus-stage={stage}>
        <div className="stars-board" data-star-path-step={currentIndex} data-constellation-round={roundIndex + 1} data-constellation-id={round.id}>
          <div className="star-round-info">
            <h2 className="star-round-name">{round.name}</h2>
            {stage === 'constellation' && <span className="star-round-hint">Tap the glowing star.</span>}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {round.edges.map(([fromIndex, toIndex]) => {
              const from = round.stars[fromIndex];
              const to = round.stars[toIndex];
              return (
                <React.Fragment key={fromIndex + '-' + toIndex}>
                  <line className="star-path-guide" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                  {fromIndex < currentIndex && toIndex < currentIndex && (
                    <line className="star-path-line" x1={from.x} y1={from.y} x2={to.x} y2={to.y} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  )}
                </React.Fragment>
              );
            })}
          </svg>
          {round.stars.map((star, index) => (
            <button
              key={round.id + '-' + index}
              type="button"
              ref={(node) => { starRefs.current[index] = node; }}
              onClick={(event) => selectStar(index, event.detail === 0)}
              className={'star-point' + (index === currentIndex ? ' is-current' : index < currentIndex ? ' is-done' : ' is-future')}
              style={{ left: star.x + '%', top: star.y + '%' }}
              data-button-skin="none"
              data-star-point={index + 1}
              aria-label={'Connect ' + round.name + ' star ' + (index + 1)}
              aria-current={stage === 'constellation' && index === currentIndex ? 'step' : undefined}
              disabled={stage !== 'constellation' || index !== currentIndex || finished}
            >
              <Star fill="currentColor" stroke="#315263" strokeWidth={1.6} aria-hidden="true" />
              <span>{index + 1}</span>
            </button>
          ))}
          {stage === 'between-rounds' && (
            <div className="star-round-transition" key={round.id} role="group" aria-label="Pause between constellations">
              <details><summary>About {round.name}</summary><p data-constellation-fact>{round.fact}</p></details>
              <div className="star-round-actions">
                <button ref={finishRef} type="button" className="wellbeing-action" data-button-skin="none" disabled={finished} onClick={() => finish(1200)}>Finish</button>
                {roundIndex < rounds.length - 1 && <button type="button" className="wellbeing-quiet-action star-round-next" data-button-skin="none" disabled={finished}
                  onClick={(event) => advanceRound(event.detail === 0)}>Next constellation</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
