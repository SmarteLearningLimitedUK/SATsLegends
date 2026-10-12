import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Star } from 'lucide-react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import { useWellbeingCompletion } from '../useWellbeingCompletion';

type StarPoint = { x: number; y: number };
type ConstellationRound = {
  id: string;
  name: string;
  hint: string;
  fact: string;
  stars: StarPoint[];
  edges: Array<[number, number]>;
};
type Stage = 'constellation' | 'between-rounds' | 'side-to-side';
type Side = 'left' | 'right';

// Facts checked against NASA's constellation guides:
// https://science.nasa.gov/missions/hubble/hubble-captures-the-ghost-of-cassiopeia/
// https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/
// https://science.nasa.gov/resource/whats-up-august-2022/
const rounds: ConstellationRound[] = [
  {
    id: 'cassiopeia',
    name: 'Cassiopeia',
    hint: 'Trace the five-star W, one point at a time.',
    fact: 'The middle star of Cassiopeia’s W helps light a space cloud nicknamed the Ghost Nebula.',
    stars: [{ x: 17, y: 39 }, { x: 33, y: 64 }, { x: 49, y: 36 }, { x: 66, y: 64 }, { x: 83, y: 38 }],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  {
    id: 'orion',
    name: 'Orion',
    hint: 'Find the shoulders, Belt and feet.',
    fact: 'Orion’s three Belt stars look close together, but they are about 800, 1,300 and 900 light-years away.',
    stars: [{ x: 28, y: 29 }, { x: 72, y: 29 }, { x: 30, y: 47 }, { x: 50, y: 49 }, { x: 70, y: 51 }, { x: 30, y: 71 }, { x: 70, y: 71 }],
    edges: [[0, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]],
  },
  {
    id: 'cygnus',
    name: 'Cygnus',
    hint: 'Trace the Northern Cross.',
    fact: 'At one end of Cygnus, the double star Albireo looks blue and gold through a small telescope.',
    stars: [{ x: 50, y: 27 }, { x: 23, y: 51 }, { x: 50, y: 50 }, { x: 77, y: 51 }, { x: 50, y: 73 }],
    edges: [[0, 2], [1, 2], [2, 3], [2, 4]],
  },
];

const focusMoves = 6;
const totalStarSteps = rounds.reduce((sum, round) => sum + round.stars.length, 0);

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [roundIndex, setRoundIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('constellation');
  const [focusStep, setFocusStep] = useState(0);
  const activeRef = useRef(0);
  const advanceLockedRef = useRef(false);
  const focusNextRef = useRef(false);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const nextRoundRef = useRef<HTMLButtonElement | null>(null);
  const sideRefs = useRef<Record<Side, HTMLButtonElement | null>>({ left: null, right: null });
  const reducedMotion = useReducedMotion();
  const { finished, finish, cancel } = useWellbeingCompletion(onComplete);
  const round = rounds[roundIndex];
  const activeSide: Side = focusStep % 2 === 0 ? 'left' : 'right';
  const starsCompleted = rounds.slice(0, roundIndex).reduce((sum, item) => sum + item.stars.length, 0) + currentIndex;
  const progress = (starsCompleted + focusStep) / (totalStarSteps + focusMoves) * 100;

  useEffect(() => {
    advanceLockedRef.current = false;
    if (!focusNextRef.current) return;
    if (stage === 'constellation') starRefs.current[currentIndex]?.focus();
    if (stage === 'between-rounds') nextRoundRef.current?.focus();
    if (stage === 'side-to-side') sideRefs.current[activeSide]?.focus();
    focusNextRef.current = false;
  }, [activeSide, currentIndex, roundIndex, stage]);

  const selectStar = (index: number, keyboard: boolean) => {
    if (finished || stage !== 'constellation' || index !== activeRef.current) return;
    activeRef.current = index + 1;
    focusNextRef.current = keyboard;
    setCurrentIndex(index + 1);
    if (index === round.stars.length - 1) setStage('between-rounds');
  };

  const advanceRound = (keyboard: boolean) => {
    if (finished || stage !== 'between-rounds' || advanceLockedRef.current) return;
    advanceLockedRef.current = true;
    focusNextRef.current = keyboard;
    if (roundIndex < rounds.length - 1) {
      activeRef.current = 0;
      setCurrentIndex(0);
      setRoundIndex(roundIndex + 1);
      setStage('constellation');
    } else {
      setStage('side-to-side');
    }
  };

  const selectSide = (side: Side, keyboard: boolean) => {
    if (finished || stage !== 'side-to-side' || side !== activeSide) return;
    const nextStep = focusStep + 1;
    focusNextRef.current = keyboard && nextStep < focusMoves;
    setFocusStep(nextStep);
    if (nextStep === focusMoves) finish(1600);
  };

  const status = finished
    ? 'Your Star Path is complete'
    : stage === 'side-to-side'
      ? 'Focus shifts ' + focusStep + ' of ' + focusMoves + ' · Follow the ' + activeSide + ' light'
      : stage === 'between-rounds'
        ? round.name + ' complete · Sky fact unlocked'
        : 'Round ' + (roundIndex + 1) + ' of 3 · ' + round.name + ' · Star ' + (currentIndex + 1) + ' of ' + round.stars.length;

  const fact = stage === 'side-to-side'
    ? 'You can pause or stop this focus exercise whenever you like.'
    : stage === 'between-rounds'
      ? round.fact
      : roundIndex === 0
        ? 'A constellation is a named pattern of stars. Its stars can be far apart in space.'
        : rounds[roundIndex - 1].fact;

  return (
    <WellbeingShell
      title="Star Path"
      activityId="constellation_connect"
      type="Focus"
      subtitle="Trace three constellations, uncover a sky fact after each, then follow the focus light at your own pace."
      purpose="Take each pattern one star at a time. Look away or stop whenever you like."
      fact={fact}
      affirmation="Small steps can make a clear path."
      status={status}
      progress={progress}
      onExit={() => { cancel(); onExit(); }}
    >
      <div className="wellbeing-scene" data-focus-stage={stage}>
        <div className="stars-board" data-star-path-step={currentIndex} data-constellation-round={roundIndex + 1} data-constellation-id={round.id}>
          {stage !== 'side-to-side' && (
            <div className="star-round-info">
              <span className="star-round-kicker">Round {roundIndex + 1} / 3</span>
              <h2 className="star-round-name">{round.name}</h2>
              <span className="star-round-hint">{round.hint}</span>
            </div>
          )}
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
            <div className="star-round-transition" role="group" aria-label={round.name + ' sky fact'}>
              <strong>Sky fact · {round.name}</strong>
              <p data-constellation-fact aria-live="polite">{round.fact}</p>
              <button
                ref={nextRoundRef}
                type="button"
                className="wellbeing-action star-round-next"
                data-button-skin="none"
                onClick={(event) => advanceRound(event.detail === 0)}
              >
                {roundIndex < rounds.length - 1 ? 'Next constellation' : 'Begin focus finish'}
              </button>
            </div>
          )}
          {stage === 'side-to-side' && (
            <div className="star-focus-field" data-focus-step={focusStep}>
              <span className="star-focus-axis" aria-hidden="true" />
              <motion.div
                className="star-focus-light"
                initial={false}
                animate={{ left: activeSide === 'left' ? '20%' : '80%' }}
                transition={{ duration: reducedMotion ? 0 : 0.7, ease: 'easeInOut' }}
                aria-hidden="true"
              />
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  ref={(node) => { sideRefs.current[side] = node; }}
                  type="button"
                  className="star-focus-point"
                  style={{ left: side === 'left' ? '20%' : '80%' }}
                  data-button-skin="none"
                  data-active={activeSide === side}
                  aria-label={'Focus on the ' + side + ' light'}
                  disabled={finished || activeSide !== side}
                  onClick={(event) => selectSide(side, event.detail === 0)}
                >
                  <span>{side.toUpperCase()}</span>
                </button>
              ))}
              <p className="star-focus-caption">Let your gaze move gently from side to side. Tap the lit point when ready.</p>
            </div>
          )}
        </div>
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
