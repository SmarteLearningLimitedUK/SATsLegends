import { useEffect, useMemo, useRef, useState } from 'react';

type PoseBeat = { pose: number; duration: number };

const WORKERS = new Set(['smith', 'outpost-miner', 'alchemist', 'forest-chef']);
const GUIDES = new Set(['desert-scholar', 'desert-detective', 'glacier-builder', 'glacier-guide', 'mountain-explorer', 'merchant', 'timekeeper', 'core-guide', 'forest-guardian', 'acropolis-pilot', 'acropolis-caster', 'owl']);

function performanceFor(identity: string, game: string): PoseBeat[] {
  const offset = [...identity].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 1300;
  const idle = [{ pose: 0, duration: 2800 + offset }, { pose: 1, duration: 125 }, { pose: 0, duration: 1900 + offset }];
  // Combat gestures are owned by the game's real hit/attack events. Workers
  // and guides have a quiet, purposeful action between their idle beats.
  if (WORKERS.has(identity)) return [...idle, { pose: 2, duration: 220 }, { pose: 3, duration: 650 }, { pose: 2, duration: 150 }];
  if (GUIDES.has(identity)) return [...idle, { pose: 2, duration: 220 }, { pose: 3, duration: 1100 }];
  if (identity === 'goblin' && game === 'number_line_ninja') return [...idle, { pose: 2, duration: 180 }, { pose: 3, duration: 750 }];
  return idle;
}

/** Timer-driven painted poses. A pause retains the current beat and its
 * remaining time, rather than restarting a blink or stroke on resume. */
export function useCharacterPerformance(identity: string, game: string, enabled: boolean, paused: boolean) {
  const beats = useMemo(() => performanceFor(identity, game), [identity, game]);
  const [index, setIndex] = useState(0);
  const clock = useRef({ index: 0, remaining: beats[0].duration });
  useEffect(() => {
    clock.current = { index: 0, remaining: beats[0].duration };
    setIndex(0);
  }, [beats]);
  useEffect(() => {
    if (!enabled || paused) return;
    const current = clock.current;
    const started = performance.now();
    const timer = setTimeout(() => {
      const next = (current.index + 1) % beats.length;
      clock.current = { index: next, remaining: beats[next].duration };
      setIndex(next);
    }, current.remaining);
    return () => {
      clearTimeout(timer);
      current.remaining = Math.max(0, current.remaining - (performance.now() - started));
    };
  }, [beats, enabled, index, paused]);
  return enabled ? beats[index]?.pose ?? 0 : 0;
}
