import React, { memo, type CSSProperties } from 'react';

interface Props {
  id: string;
  cue: 'idle' | 'reward' | 'error';
  sequence: number;
}

// Deterministic positions avoid jumping particles on a question or timer update.
const MOTES = Array.from({ length: 12 }, (_, index) => ({
  '--mote-x': `${index % 2 ? 92 + index % 4 : 2 + index % 4}%`,
  '--mote-y': `${18 + (index * 17) % 65}%`,
  '--mote-delay': `${-index * 1.7}s`,
  '--mote-duration': `${7 + index % 5}s`,
  '--mote-size': `${3 + index % 4}px`,
} as CSSProperties));

const SPARKS = Array.from({ length: 10 }, (_, index) => ({
  '--spark-x': `${Math.cos(index * Math.PI / 5) * 18}vmin`,
  '--spark-y': `${Math.sin(index * Math.PI / 5) * 14}vmin`,
  '--spark-delay': `${index % 3 * 35}ms`,
} as CSSProperties));

/** Island atmosphere and answer feedback use no layout space or gameplay timers. */
const GameSceneEffects = memo(function GameSceneEffects({ id, cue, sequence }: Props) {
  return (
    <div className="scene-effects island-scene-effects" data-scene-effects={id} data-scene-cue={cue} aria-hidden="true">
      <div className="island-scene-light" />
      <div className="scene-depth-light"><i /><i /></div>
      <div className="scene-ground-haze"><i /><i /></div>
      <div className="scene-water-glints"><i /><i /><i /></div>
      <div className="island-scene-current"><i /><i /><i /></div>
      <div className="island-motes">
        {MOTES.map((style, index) => <i key={index} style={style} />)}
      </div>
      {cue !== 'idle' ? (
        <div key={sequence} className={`island-result island-result--${cue}`}>
          <div className="island-result-edge" />
          {cue === 'reward' ? <div className="island-result-sparks">
            {SPARKS.map((style, index) => <i key={index} style={style} />)}
          </div> : null}
        </div>
      ) : null}
    </div>
  );
});

export default GameSceneEffects;
