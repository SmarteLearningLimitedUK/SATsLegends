import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import WellbeingShell from '../WellbeingShell';
import { WellbeingActivityComponentProps } from '../types';
import HintChip from '../../components/mission/HintChip';

type Point = { x: number; y: number };
type Constellation = {
  name: string;
  fact: string;
  points: Point[];
};
type BackgroundStar = {
  id: number;
  x: number;
  y: number;
  size: number;
  sparkle: boolean;
};

const CONSTELLATIONS: Constellation[] = [
  {
    name: 'The Lantern Path',
    fact: 'Lantern-shaped star stories were used as gentle guides for travellers at night.',
    points: [
      { x: 16, y: 58 },
      { x: 30, y: 36 },
      { x: 48, y: 28 },
      { x: 64, y: 38 },
      { x: 72, y: 58 },
      { x: 54, y: 70 },
    ],
  },
  {
    name: 'The Grove Crown',
    fact: 'Some storytellers say this pattern appears when the night is ready to grow calm.',
    points: [
      { x: 18, y: 48 },
      { x: 28, y: 28 },
      { x: 42, y: 40 },
      { x: 56, y: 22 },
      { x: 70, y: 40 },
      { x: 82, y: 54 },
    ],
  },
  {
    name: 'The Wave Walker',
    fact: 'Patterns like this helped seafarers remember direction and distance.',
    points: [
      { x: 18, y: 60 },
      { x: 32, y: 52 },
      { x: 44, y: 62 },
      { x: 56, y: 48 },
      { x: 68, y: 58 },
      { x: 82, y: 44 },
    ],
  },
];

const buildBackgroundStars = (): BackgroundStar[] => {
  let seed = 73451;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: 70 }).map((_, index) => ({
    id: index,
    x: 6 + nextRand() * 88,
    y: 8 + nextRand() * 78,
    size: 0.9 + nextRand() * 1.8,
    sparkle: index % 7 === 0,
  }));
};

const ConstellationConnect: React.FC<WellbeingActivityComponentProps> = ({ onComplete, onExit }) => {
  const [constellationIndex, setConstellationIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedNames, setCompletedNames] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [showFact, setShowFact] = useState(false);
  const backgroundStars = useMemo(() => buildBackgroundStars(), []);

  const currentConstellation = CONSTELLATIONS[constellationIndex];
  const lines = useMemo(() => currentConstellation.points.slice(0, currentIndex), [currentConstellation.points, currentIndex]);
  const progress = (((constellationIndex) + currentIndex / currentConstellation.points.length) / CONSTELLATIONS.length) * 100;
  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

  const handleSelect = (index: number) => {
    if (index !== currentIndex) return;
    if (index === currentConstellation.points.length - 1) {
      setCompletedNames((current) => [...current, currentConstellation.name]);
      if (constellationIndex === CONSTELLATIONS.length - 1) {
        setCurrentIndex(currentConstellation.points.length);
        setShowFact(true);
        return;
      }
      setConstellationIndex((value) => value + 1);
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((value) => value + 1);
  };

  const finalFact = CONSTELLATIONS[CONSTELLATIONS.length - 1].fact;
  const subtitle = completedNames.length >= CONSTELLATIONS.length
    ? 'Great tracing. You unlocked a constellation fact.'
    : `Trace constellation ${constellationIndex + 1} of ${CONSTELLATIONS.length}`;

  return (
    <WellbeingShell title="Star Path" subtitle={subtitle} type="Focus" progress={progress} onExit={onExit}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,230,140,0.08),transparent_18%),radial-gradient(circle_at_16%_78%,rgba(125,211,252,0.08),transparent_12%),radial-gradient(circle_at_82%_18%,rgba(253,224,71,0.08),transparent_14%),linear-gradient(180deg,#020617 0%,#0f172a 50%,#020617 100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-90 [background-image:radial-gradient(rgba(255,215,110,0.9)_0.7px,transparent_0.9px),radial-gradient(rgba(255,255,255,0.75)_0.6px,transparent_0.8px)] [background-position:0_0,8px_8px] [background-size:30px_30px,40px_40px]" />
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
          {backgroundStars.map((star) => (
            <motion.circle
              key={`bg-star-${star.id}`}
              cx={star.x}
              cy={star.y}
              r={star.size}
              fill={star.sparkle ? 'rgba(250, 245, 200, 0.95)' : 'rgba(220, 234, 255, 0.55)'}
              animate={star.sparkle ? { opacity: [0.4, 1, 0.45], scale: [1, 1.26, 1] } : { opacity: [0.34, 0.58, 0.34] }}
              transition={{
                duration: star.sparkle ? 1.8 + (star.id % 4) * 0.45 : 5.4 + (star.id % 5) * 0.55,
                repeat: Infinity,
                delay: (star.id % 10) * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-3">
          <div className="rounded-full border border-amber-100/18 bg-black/40 px-4 py-2 text-xs font-bold tracking-[0.14em] text-amber-50/90 backdrop-blur-sm">
            {currentConstellation.name}
          </div>
          <div className="rounded-full border border-cyan-100/18 bg-black/40 px-4 py-2 text-xs font-bold tracking-[0.14em] text-cyan-50/90 backdrop-blur-sm">
            {elapsedSeconds}s
          </div>
        </div>

        <svg viewBox="0 0 100 100" className="h-full w-full max-w-sm overflow-visible">
          {completedNames.map((_, completedIndex) => {
            const constellation = CONSTELLATIONS[completedIndex];
            return constellation.points.slice(0, -1).map((point, lineIndex) => {
              const next = constellation.points[lineIndex + 1];
              return (
                <line
                  key={`done-${completedIndex}-${lineIndex}`}
                  x1={point.x}
                  y1={point.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="rgba(253,224,71,0.6)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              );
            });
          })}

          {lines.map((_, index) => {
            const from = currentConstellation.points[index];
            const to = currentConstellation.points[index + 1];
            if (!to) return null;
            return (
              <line
                key={`line-${index}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(165,243,252,0.95)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            );
          })}

          {currentConstellation.points.map((star, index) => (
            <g key={`star-${constellationIndex}-${index}`}>
              <motion.circle
                cx={star.x}
                cy={star.y}
                r={currentIndex >= index ? 4.8 : 3.8}
                fill={currentIndex >= index ? '#fef3c7' : 'rgba(191,219,254,0.74)'}
                animate={{ scale: index === currentIndex ? [1, 1.14, 1] : [1, 1.04, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <circle
                cx={star.x}
                cy={star.y}
                r={9}
                fill="transparent"
                onPointerDown={() => handleSelect(index)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          ))}
        </svg>

        <div className="absolute bottom-4 left-1/2 w-[min(92%,30rem)] -translate-x-1/2 rounded-[1.5rem] border border-white/12 bg-black/35 px-4 py-4 text-center shadow-[0_18px_40px_rgba(2,6,23,0.35)] backdrop-blur-sm">
          {completedNames.length >= CONSTELLATIONS.length ? (
            <>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">Sky story complete</div>
              <div className="mt-1 text-lg font-black text-amber-50">Three constellations traced</div>
              <div className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50/84">
                You followed every path in the calm night sky.
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70">Sky Quest</div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <HintChip label="Tap stars" />
                <HintChip label="Follow order" />
                <HintChip label="Trace 3" />
              </div>
            </>
          )}
        </div>

        {showFact ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/58 p-4 backdrop-blur-[1px]">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-[min(92%,30rem)] rounded-[1.4rem] border border-amber-100/35 bg-[linear-gradient(180deg,rgba(13,33,65,0.95),rgba(8,20,42,0.95))] px-5 py-5 text-center shadow-[0_18px_46px_rgba(2,6,23,0.45)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/76">Star fact unlocked</div>
              <div className="mt-2 text-xl font-black text-amber-50">Constellation fact</div>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-cyan-50/88">
                {finalFact}
              </p>
              <button
                type="button"
                onClick={onExit}
                className="ui-button-primary mt-5 w-full rounded-xl px-4 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#0b1c38]"
              >
                Return To Calm Grove
              </button>
            </motion.div>
          </div>
        ) : null}
      </div>
    </WellbeingShell>
  );
};

export default ConstellationConnect;
