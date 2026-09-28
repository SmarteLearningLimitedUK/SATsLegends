import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

const stars = [
  { x: 20, y: 55 }, { x: 36, y: 35 }, { x: 56, y: 28 }, { x: 74, y: 44 }, { x: 64, y: 66 },
];

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeRef = useRef(0);
  const focusNextRef = useRef(false);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);

  useEffect(() => {
    if (focusNextRef.current && currentIndex < stars.length) starRefs.current[currentIndex]?.focus();
    focusNextRef.current = false;
  }, [currentIndex]);

  const selectStar = (index: number, keyboard: boolean) => {
    if (finished || index !== activeRef.current) return;
    activeRef.current = index + 1;
    focusNextRef.current = keyboard;
    setCurrentIndex(index + 1);
    if (index === stars.length - 1) finish(2200);
  };

  return (
    <WellbeingShell title="Star Path" activityId="constellation_connect" type="Focus"
      subtitle="Connect the glowing stars in order, from 1 to 5." purpose="Focus on one point, then the next."
      affirmation="Small steps can make a clear path."
      status={finished ? 'Your star path is complete' : 'Stars connected ' + currentIndex + ' of 5 · Next: ' + (currentIndex + 1)}
      progress={currentIndex / stars.length * 100} onExit={() => { cancel(); onExit(); }}>
      <div className="wellbeing-scene">
        <div className="stars-board" data-star-path-step={currentIndex}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {stars.slice(0, Math.max(0, currentIndex - 1)).map((from, index) => <line key={index} x1={from.x} y1={from.y} x2={stars[index + 1].x} y2={stars[index + 1].y} stroke="#d9f3c8" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
          </svg>
          {stars.map((star, index) => (
            <button key={index} type="button" ref={(node) => { starRefs.current[index] = node; }}
              onClick={(event) => selectStar(index, event.detail === 0)} className={'star-point' + (index === currentIndex ? ' is-current' : index < currentIndex ? ' is-done' : ' is-future')}
              style={{ left: star.x + '%', top: star.y + '%' }} data-button-skin="none" data-star-point={index + 1}
              aria-label={'Connect star ' + (index + 1)} aria-current={index === currentIndex ? 'step' : undefined} aria-disabled={index !== currentIndex || finished}>
              <Star fill="currentColor" stroke="#315263" strokeWidth={1.6} aria-hidden="true" /><span>{index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
